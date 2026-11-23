import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HubBatchRequest } from '@contract/types'
import {
  addTargetRole, captureActiveTabProfile, draftMessage, getOutreachSettings, getTemplates,
  profileUrl, readProfileDocument, recordSent, saveLead, setOutreachSettings, tightenMessage,
  withTargetRole, TARGET_ROLES_MAX, type LinkedInProfile,
  OUTREACH_DRAFTS_KEY, OUTREACH_DRAFTS_MAX, OUTREACH_DRAFT_MAX_AGE_MS,
  clearOutreachDraft, draftIsFor, loadDraftForActiveProfile, loadOutreachDraft, loadOutreachDrafts,
  saveOutreachDraft, withOutreachDraft, type OutreachDraftInput, type StoredOutreachDraft,
} from '@/lib/outreach'
import { getHubOutbox } from '@/lib/hub'
import { setTailorConfig } from '@/lib/tailor'
import { resetChromeMock } from './setup'

// Stage 8 — the outreach model layer. The human reads a profile on a button press, types the
// stand-out skill, drafts against the hub's bank, presses Send in LinkedIn himself, and then presses
// "I sent it". That last press writes a messages row WITH sent_at, and the hub — not this file —
// looks the email up. Nothing here watches a page and nothing here calls an enrichment route.

const LEAD = 'a1b2c3d4-0000-4000-8000-00000000000a'
const PROFILE_URL = 'https://www.linkedin.com/in/candidate-r'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** The hub double: /db/batch accepts every op and echoes a stored row with an id. */
function hubUp(fetchMock: ReturnType<typeof vi.fn>, routes: Record<string, unknown> = {}) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const path = String(url).replace('http://127.0.0.1:8765', '')
    if (path === '/db/batch') {
      const req = JSON.parse(String(init?.body)) as HubBatchRequest
      return jsonResponse(200, {
        ok: true,
        results: req.ops.map((op) => ({
          clientRef: op.clientRef, ok: true, status: 200, error: null,
          row: { id: `row-${op.clientRef}`, ...(op.body ?? {}) },
        })),
      })
    }
    if (path in routes) return jsonResponse(200, routes[path])
    return jsonResponse(404, { error: `no route ${path}` })
  })
}

function paths(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((c) => String(c[0]).replace('http://127.0.0.1:8765', ''))
}

function lastBatch(fetchMock: ReturnType<typeof vi.fn>): HubBatchRequest {
  const call = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/db/batch')).at(-1)
  expect(call).toBeDefined()
  return JSON.parse(String((call as [string, RequestInit])[1].body)) as HubBatchRequest
}

/** The active tab, which only exists when the test says so — no tab is a refusal, not a crash. */
function stubTab(url: string | null, page?: { html: string; url?: string; title?: string }) {
  const c = globalThis.chrome as unknown as Record<string, unknown>
  c.tabs = { query: async () => (url === null ? [] : [{ id: 7, url }]) }
  c.scripting = { executeScript: async () => [{ frameId: 0, result: page ? { top: true, url: url ?? '', title: '', ...page } : null }] }
}

function clearTab() {
  const c = globalThis.chrome as unknown as Record<string, unknown>
  delete c.tabs
  delete c.scripting
}

const PROFILE: LinkedInProfile = {
  linkedinUrl: PROFILE_URL, slug: 'candidate-r', fullName: 'Priya Menon', firstName: 'Priya', lastName: 'Menon',
  headline: 'Reliability Engineering Manager', company: 'Baxter', companyDomain: null, roleTitle: null,
  location: 'Houston, Texas', background: null, suggestedBracket: null, suggestedGender: null,
  bracketWhy: null, genderWhy: null, layers: {},
}

describe('outreach settings', () => {
  beforeEach(() => resetChromeMock())

  it('round-trips what Bob types, and defaults to an empty panel rather than a broken one', async () => {
    expect(await getOutreachSettings()).toEqual({ skillset: '', targetRoles: [], lastTargetRole: '', tone: 'casual' })
    const saved = await setOutreachSettings({ skillset: 'reliability engineering', tone: 'professional' })
    expect(saved.status).toBe('sent')
    expect(await getOutreachSettings()).toMatchObject({ skillset: 'reliability engineering', tone: 'professional' })
    // a patch merges, it does not replace
    await setOutreachSettings({ lastTargetRole: 'Reliability Engineer' })
    expect(await getOutreachSettings()).toMatchObject({ skillset: 'reliability engineering', lastTargetRole: 'Reliability Engineer', tone: 'professional' })
  })

  it('remembers target roles newest-first, one per role whatever its casing, capped', () => {
    expect(withTargetRole([], 'Reliability Engineer')).toEqual(['Reliability Engineer'])
    expect(withTargetRole(['Maintenance Lead', 'Reliability Engineer'], 'reliability ENGINEER'))
      .toEqual(['reliability ENGINEER', 'Maintenance Lead'])          // one entry, and the newest spelling wins
    expect(withTargetRole(['A', 'B'], '  ')).toEqual(['A', 'B'])       // nothing typed, nothing remembered
    expect(withTargetRole(['A', 'B'], '  Project Manager  ')).toEqual(['Project Manager', 'A', 'B'])
    const many = Array.from({ length: 25 }, (_, i) => `Role ${i}`)
    const capped = withTargetRole(many, 'Newest')
    expect(capped).toHaveLength(TARGET_ROLES_MAX)
    expect(capped[0]).toBe('Newest')
    expect(capped).not.toContain(`Role ${TARGET_ROLES_MAX}`)           // the oldest fell off the end
  })

  it('addTargetRole stores the list and opens on the role he just typed', async () => {
    await addTargetRole('Reliability Engineer')
    await addTargetRole('Project Manager')
    const again = await addTargetRole('reliability engineer')
    expect(again.settings.targetRoles).toEqual(['reliability engineer', 'Project Manager'])
    expect(again.settings.lastTargetRole).toBe('reliability engineer')
    expect((await getOutreachSettings()).targetRoles).toHaveLength(2)
    for (let i = 0; i < 30; i++) await addTargetRole(`Role ${i}`)
    expect((await getOutreachSettings()).targetRoles).toHaveLength(TARGET_ROLES_MAX)
  })
})

describe('reading the profile page', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    resetChromeMock()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    await setTailorConfig({ token: 'tok' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTab()
  })

  it('canonicalises the profile URL, so one person is one row however he got to the page', () => {
    expect(profileUrl('https://www.linkedin.com/in/candidate-r/')).toEqual({ canonical: PROFILE_URL, slug: 'candidate-r' })
    expect(profileUrl('https://in.linkedin.com/in/Candidate-R?originalSubdomain=in')?.canonical).toBe(PROFILE_URL)
    expect(profileUrl('https://www.linkedin.com/in/candidate-r/details/experience/')?.canonical).toBe(PROFILE_URL)
    expect(profileUrl('https://www.linkedin.com/jobs/view/4420761539/')).toBeNull()
    expect(profileUrl('https://linkedin.com.evil.example/in/candidate-r')).toBeNull()
    expect(profileUrl('https://www.google.com/in/candidate-r')).toBeNull()
    expect(profileUrl(null)).toBeNull()
  })

  it('refuses a tab that is not a LinkedIn profile, and names the page it wanted', async () => {
    stubTab('https://www.google.com/search?q=priya')
    const off = await captureActiveTabProfile()
    expect(off.status).toBe('error')
    expect(off.note).toMatch(/linkedin\.com\/in\//)
    expect(off.note).toContain('www.google.com')                       // what it found, not just what it wanted
    expect(off.profile).toBeNull()
    expect(off.url).toBe('https://www.google.com/search?q=priya')

    // LinkedIn, but not a person: a job posting is the job capture's page, not this one
    stubTab('https://www.linkedin.com/jobs/view/4420761539/')
    const job = await captureActiveTabProfile()
    expect(job.status).toBe('error')
    expect(job.note).toMatch(/linkedin\.com\/in\//)

    stubTab(null)
    const none = await captureActiveTabProfile()
    expect(none.status).toBe('error')
    expect(none.note).toMatch(/linkedin\.com\/in\//)

    clearTab()                                                          // no tabs API at all
    const broken = await captureActiveTabProfile()
    expect(broken.status).toBe('error')
    expect(broken.profile).toBeNull()

    expect(paths(fetchMock)).toEqual([])                                // a refusal costs no request
  })

  it('reads the page once, on the press, and returns the profile plus the raw page title', async () => {
    const html = `<html><head><title>(3) Priya Menon - Reliability Engineering Manager | LinkedIn</title>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org', '@graph': [{
          '@type': 'Person', name: 'Priya Menon', jobTitle: 'Reliability Engineering Manager',
          description: 'Fifteen years keeping rotating equipment running.',
          worksFor: { '@type': 'Organization', name: 'Baxter', url: 'https://www.baxter.com' },
          address: { '@type': 'PostalAddress', addressLocality: 'Houston, Texas' },
        }],
      })}</script></head><body><h1>Priya Menon</h1></body></html>`
    stubTab('https://www.linkedin.com/in/priya-menon/', { html, url: 'https://www.linkedin.com/in/priya-menon/', title: '(3) Priya Menon - Reliability Engineering Manager | LinkedIn' })

    const read = await captureActiveTabProfile()
    expect(read.status).toBe('sent')
    expect(read.pageTitle).toBe('(3) Priya Menon - Reliability Engineering Manager | LinkedIn')
    expect(read.profile).toMatchObject({
      linkedinUrl: 'https://www.linkedin.com/in/priya-menon', slug: 'priya-menon',
      fullName: 'Priya Menon', firstName: 'Priya', lastName: 'Menon',
      headline: 'Reliability Engineering Manager', company: 'Baxter', companyDomain: 'baxter.com',
      location: 'Houston, Texas', background: 'Fifteen years keeping rotating equipment running.',
    })
    // this page states no pronouns and no education years, so both suggestions are honestly absent —
    // and the reasoning rides along either way, because the human confirms or flips them
    expect(read.profile?.suggestedBracket).toBeNull()
    expect(read.profile?.suggestedGender).toBeNull()
    expect(read.profile).toHaveProperty('bracketWhy')
    expect(read.profile).toHaveProperty('genderWhy')
    // the stand-out skill is typed by hand and lives nowhere on a profile read
    expect(read.profile).not.toHaveProperty('standoutSkill')

    // the adapter, when it lands, is handed in — and one that throws never loses the read
    const angry = await captureActiveTabProfile(() => { throw new Error('adapter blew up') })
    expect(angry.status).toBe('error')
    expect(angry.note).toMatch(/adapter blew up/)
    expect(angry.profile?.fullName).toBe('Priya Menon')

    // a page with no name on it is refused rather than saved as a nameless lead
    stubTab('https://www.linkedin.com/in/ghost/', { html: '<html><head><title>LinkedIn</title></head><body></body></html>' })
    const nameless = await captureActiveTabProfile()
    expect(nameless.status).toBe('error')
    expect(nameless.note).toMatch(/no name/i)
  })

  it('the structural reader falls back to the page title when there is no JSON-LD', () => {
    const doc = new DOMParser().parseFromString(
      '<html><head><title>Priya Menon - Reliability Engineering Manager | LinkedIn</title></head><body></body></html>', 'text/html')
    const read = readProfileDocument(doc, 'https://www.linkedin.com/in/priya-menon/')
    expect(read.fullName).toBe('Priya Menon')
    expect(read.headline).toBe('Reliability Engineering Manager')
    expect(read.layers).toMatchObject({ fullName: 'title', headline: 'title' })
  })
})

describe('the hub routes', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    resetChromeMock()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    await setTailorConfig({ token: 'tok' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('reads the bank, drafts free, and reports a refusal with what to cut', async () => {
    hubUp(fetchMock, {
      '/outreach/templates': { templates: [{ key: '30s_f_casual', bracket: '30s', gender: 'f', tone: 'casual', body: 'Hi [Name]', skeletonChars: 3, tokens: ['[Name]'] }], max: 300, tokens: ['[Name]'], banned: ['really impressed by your work'] },
      '/outreach/draft': { ok: false, templateKey: '30s_f_casual', text: 'x'.repeat(312), chars: 312, max: 300, reasons: [{ code: 'too_long', over: 12, detail: '312 characters', fix: 'cut 12 characters' }] },
    })
    const bank = await getTemplates()
    expect(bank.status).toBe('sent')
    expect(bank.templates).toHaveLength(1)
    expect(bank.banned).toContain('really impressed by your work')

    const draft = await draftMessage({ bracket: '30s', gender: 'f', tone: 'casual', values: { name: 'Priya', standoutSkill: 'turnaround planning' } })
    expect(draft.status).toBe('sent')                                   // the call worked …
    expect(draft.draft?.ok).toBe(false)                                 // … and the message is refused
    expect(draft.note).toMatch(/cut 12 characters/)
    const body = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))
    expect(body).toMatchObject({ bracket: '30s', gender: 'f', tone: 'casual', values: { standoutSkill: 'turnaround planning' } })
    expect(fetchMock.mock.calls.at(-1)?.[1]?.headers).toMatchObject({ 'X-Tailor-Token': 'tok' })
  })

  it('tighten spends only on the press, and an unhappy hub leaves the draft alone', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(503, { error: 'no ANTHROPIC_API_KEY in apps/mapper/.env — the draft is unchanged.' }))
    const refused = await tightenMessage('x'.repeat(312), { name: 'Priya' })
    expect(refused.status).toBe('error')
    expect(refused.result).toBeNull()
    expect(refused.note).toMatch(/unchanged/)

    expect((await tightenMessage('   ')).status).toBe('error')
    expect(paths(fetchMock)).toEqual(['/outreach/tighten'])             // an empty box never spends

    fetchMock.mockImplementation(async () => jsonResponse(200, { text: 'Short now.', chars: 10, max: 300, ok: true, reasons: [], model: 'claude-haiku-4-5-20251001', usage: { input: 200, output: 40 }, costUsd: 0.0004 }))
    const done = await tightenMessage('x'.repeat(312))
    expect(done.status).toBe('sent')
    expect(done.result?.text).toBe('Short now.')
    expect(done.note).toMatch(/\$0\.0004/)                              // a spend is never invisible

    fetchMock.mockRejectedValue(new TypeError('connect ECONNREFUSED'))
    const offline = await tightenMessage('x'.repeat(312))
    expect(offline.status).toBe('error')
    expect(offline.note).toMatch(/hub is not running/)
    expect(offline.result).toBeNull()
  })
})

describe('the outreach log', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    resetChromeMock()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    await setTailorConfig({ token: 'tok' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('upserts the lead on the hub key with only the columns it knows — no nulls, and no status it was not asked for', async () => {
    hubUp(fetchMock)
    const out = await saveLead(PROFILE, { standoutSkill: 'turnaround planning', reachOutReason: 'job_lead', ageGenderConfirmed: false })
    expect(out.status).toBe('sent')
    expect(out.leadId).toMatch(/^row-/)

    const op = lastBatch(fetchMock).ops[0]
    expect(op).toMatchObject({ op: 'upsert', table: 'leads', onConflict: null })   // null = the hub's own (user_id, linkedin_url)
    expect(op.body).toEqual({
      linkedin_url: PROFILE_URL, full_name: 'Priya Menon', first_name: 'Priya', last_name: 'Menon',
      headline: 'Reliability Engineering Manager', company: 'Baxter', location: 'Houston, Texas',
      standout_skill: 'turnaround planning', reach_out_reason: 'job_lead',
    })
    // what it does NOT send: the nulls on the profile, an unconfirmed confirmation flag, and above
    // all a status — re-saving a lead must never walk a `messaged` person back to `captured`
    for (const absent of ['company_domain', 'role_title', 'background', 'age_bracket', 'gender', 'age_gender_confirmed', 'job_id', 'status', 'email', 'user_id']) {
      expect(op.body).not.toHaveProperty(absent)
    }

    // a person with no profile URL is refused rather than filed under nothing
    const nameless = await saveLead({ ...PROFILE, linkedinUrl: 'https://www.google.com/' })
    expect(nameless.status).toBe('error')
    expect(nameless.note).toMatch(/profile page first/)
  })

  it('"I sent it" writes sent_at and sent_detected_by button, moves the lead, and calls NO enrichment route', async () => {
    hubUp(fetchMock)
    const when = new Date('2026-09-07T15:04:05Z')
    const out = await recordSent(LEAD, { body: 'Hi Priya — impressed by your work on turnaround planning.', templateKey: '30s_f_casual', sentAt: when })
    expect(out.status).toBe('sent')
    expect(out.messageId).toMatch(/^row-/)
    expect(out.note).toMatch(/collecting the email/)

    const batch = lastBatch(fetchMock)
    expect(batch.ops).toHaveLength(2)
    expect(batch.ops[0]).toMatchObject({ op: 'insert', table: 'messages' })
    expect(batch.ops[0].body).toEqual({
      lead_id: LEAD, kind: 'connection_note', template_key: '30s_f_casual',
      body: 'Hi Priya — impressed by your work on turnaround planning.', char_count: 57,
      sent_at: '2026-09-07T15:04:05.000Z', sent_detected_by: 'button',
    })
    // the message row first, then the lead — the lookup fires on the row the hub writes first
    expect(batch.ops[1]).toMatchObject({ op: 'update', table: 'leads', id: LEAD, body: { status: 'messaged' } })

    // THE POINT: the email is collected because sent_at was written, by hub.py's _after_write.
    // This module must never fire a second lookup of its own — that is a second SalesQL credit.
    expect(paths(fetchMock)).toEqual(['/db/batch'])
    for (const path of paths(fetchMock)) expect(path).not.toMatch(/enrich/)

    // sent_at defaults to the moment of the press, not to some page's idea of when
    const now = await recordSent(LEAD, { body: 'Second note.' })
    expect(now.status).toBe('sent')
    const at = (lastBatch(fetchMock).ops[0].body as Record<string, unknown>).sent_at as string
    expect(Date.now() - Date.parse(at)).toBeLessThan(5000)
    expect((lastBatch(fetchMock).ops[0].body as Record<string, unknown>).sent_detected_by).toBe('button')

    // nothing to point at, and nothing to log: refused, and no request made
    const before = fetchMock.mock.calls.length
    expect((await recordSent('', { body: 'x' })).status).toBe('error')
    expect((await recordSent(LEAD, { body: '   ' })).note).toMatch(/empty/)
    expect(fetchMock.mock.calls.length).toBe(before)
  })

  it('hub down: the writes wait in the outbox and say so, with no enrich call and nothing pretended', async () => {
    fetchMock.mockRejectedValue(new TypeError('connect ECONNREFUSED'))
    const lead = await saveLead(PROFILE, { standoutSkill: 'turnaround planning' })
    expect(lead.status).toBe('queued')
    expect(lead.note).toMatch(/queued for the hub/)
    expect(lead.leadId).toBeNull()
    expect(await getHubOutbox()).toHaveLength(1)

    const sent = await recordSent(LEAD, { body: 'Hi Priya.' })
    expect(sent.status).toBe('queued')
    expect(sent.note).toMatch(/email lookup happens when it lands/)
    expect(sent.messageId).toBeNull()
    expect((await getHubOutbox()).map((e) => e.op.table)).toEqual(['leads', 'messages', 'leads'])
    for (const path of paths(fetchMock)) expect(path).not.toMatch(/enrich/)
  })

  it('a row the hub refuses is a dead letter, said plainly — never a silent success', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (!String(url).endsWith('/db/batch')) return jsonResponse(404, { error: 'no' })
      const req = JSON.parse(String(init?.body)) as HubBatchRequest
      return jsonResponse(207, {
        ok: false,
        results: req.ops.map((op) => ({ clientRef: op.clientRef, ok: false, status: 400, row: null, error: 'leads: reach_out_reason is not one of job_lead, referral, learn, new_company, other' })),
      })
    })
    const out = await saveLead(PROFILE, { reachOutReason: 'nonsense' as never })
    expect(out.status).toBe('dead')
    expect(out.note).toMatch(/refused by the hub/)
    expect(out.note).toMatch(/reach_out_reason/)
    expect(out.leadId).toBeNull()
  })
})


describe('the drafted note, across an unmount', () => {
  // The panel is rendered conditionally in BOTH surfaces, so switching tabs destroys it, and the
  // popup closes the moment he clicks the profile he is reading. The note used to live only in
  // React state, so the ordinary act of doing the task threw it away.

  const NOTE = 'Dear Priya, your work on reliability at Baxter is the standard I am aiming at.'

  function input(patch: Partial<OutreachDraftInput> = {}): OutreachDraftInput {
    return {
      profile: PROFILE,
      bracket: '30s', gender: 'f', ageConfirmed: true, genderConfirmed: true,
      company: 'Baxter', standoutSkill: 'reliability programme design',
      templateKey: '30s_female_professional', tone: 'professional',
      values: { name: 'Priya', company: 'Baxter' },
      text: NOTE, sentAt: null,
      ...patch,
    }
  }

  function stored(patch: Partial<StoredOutreachDraft> = {}): StoredOutreachDraft {
    return { ...input(), profileUrl: PROFILE_URL, savedAt: 1_000_000, ...patch } as StoredOutreachDraft
  }

  beforeEach(() => { resetChromeMock() })
  afterEach(() => { clearTab() })

  describe('the pure rules', () => {
    it('puts the newest first and keeps ONE entry per person — a redraft replaces, never stacks', () => {
      const first = stored({ text: 'first' })
      const again = stored({ text: 'second', savedAt: 2_000_000 })
      const list = withOutreachDraft(withOutreachDraft([], first, 1_000_000), again, 2_000_000)
      expect(list).toHaveLength(1)
      expect(list[0].text).toBe('second')
    })

    it('caps the working set, dropping the oldest', () => {
      let list: StoredOutreachDraft[] = []
      for (let i = 0; i < OUTREACH_DRAFTS_MAX + 3; i += 1) {
        list = withOutreachDraft(list, stored({
          profileUrl: `https://www.linkedin.com/in/person-${i}`,
          profile: { ...PROFILE, linkedinUrl: `https://www.linkedin.com/in/person-${i}` },
          savedAt: 1_000_000 + i,
        }), 1_000_100)
      }
      expect(list).toHaveLength(OUTREACH_DRAFTS_MAX)
      expect(list.some((d) => d.profileUrl.endsWith('person-0'))).toBe(false)
      expect(list[0].profileUrl).toMatch(/person-12$/)
    })

    it('drops what is past the week on the way in', () => {
      const old = stored({ profileUrl: 'https://www.linkedin.com/in/older', savedAt: 0 })
      const list = withOutreachDraft([old], stored({ savedAt: OUTREACH_DRAFT_MAX_AGE_MS + 10 }), OUTREACH_DRAFT_MAX_AGE_MS + 10)
      expect(list).toHaveLength(1)
      expect(list[0].profileUrl).toBe(PROFILE_URL)
    })

    it('answers for the same person however he reached the page', () => {
      expect(draftIsFor(stored(), 'https://in.linkedin.com/in/Candidate-R?originalSubdomain=in', 1_000_001)).toBe(true)
      expect(draftIsFor(stored(), 'https://www.linkedin.com/in/candidate-r/details/experience/', 1_000_001)).toBe(true)
    })

    it("never lets another person's note ride onto this panel", () => {
      expect(draftIsFor(stored(), 'https://www.linkedin.com/in/someone-else', 1_000_001)).toBe(false)
      expect(draftIsFor(stored(), null, 1_000_001)).toBe(false)
    })

    it('expires to the millisecond, and an empty note is never restorable', () => {
      expect(draftIsFor(stored(), PROFILE_URL, 1_000_000 + OUTREACH_DRAFT_MAX_AGE_MS)).toBe(true)
      expect(draftIsFor(stored(), PROFILE_URL, 1_000_001 + OUTREACH_DRAFT_MAX_AGE_MS)).toBe(false)
      expect(draftIsFor(stored({ text: '   ' }), PROFILE_URL, 1_000_001)).toBe(false)
    })
  })

  describe('the store', () => {
    it('round-trips everything `send` needs to write the lead and the message', async () => {
      await saveOutreachDraft(input(), 1_000_000)
      const back = await loadOutreachDraft(PROFILE_URL, 1_000_001)
      expect(back?.text).toBe(NOTE)
      expect(back?.templateKey).toBe('30s_female_professional')
      expect(back?.bracket).toBe('30s')
      expect(back?.gender).toBe('f')
      expect(back?.ageConfirmed).toBe(true)
      expect(back?.genderConfirmed).toBe(true)
      expect(back?.company).toBe('Baxter')
      expect(back?.standoutSkill).toBe('reliability programme design')
      expect(back?.tone).toBe('professional')
      expect(back?.sentAt).toBeNull()
      // the whole person, not the panel's reduced view
      expect(back?.profile.fullName).toBe('Priya Menon')
      expect(back?.profile.headline).toBe('Reliability Engineering Manager')
      expect(back?.profile.location).toBe('Houston, Texas')
      expect(back?.profile.linkedinUrl).toBe(PROFILE_URL)
    })

    it('THE VERDICT IS NOT STORABLE — an ungated send cannot be resurrected from disk', async () => {
      // The load-bearing decision. `sendBlockers` kills the button on an unchecked note; if a pass
      // could be stored, a restore could hand back a verdict nobody re-earned.
      await saveOutreachDraft({ ...input(), checked: true, ok: true, reasons: [] } as unknown as OutreachDraftInput, 1_000_000)
      const raw = (await chrome.storage.local.get(OUTREACH_DRAFTS_KEY))[OUTREACH_DRAFTS_KEY] as { drafts: unknown[] }
      const keys = Object.keys(raw.drafts[0] as Record<string, unknown>)
      for (const forbidden of ['checked', 'ok', 'reasons', 'gate', 'costUsd']) {
        expect(keys, `${forbidden} must never reach the store`).not.toContain(forbidden)
      }
    })

    it('refuses a subject it cannot key, rather than filing a note under nothing', async () => {
      await saveOutreachDraft(input({ profile: { ...PROFILE, linkedinUrl: '' } }), 1_000_000)
      await saveOutreachDraft(input({ profile: { ...PROFILE, linkedinUrl: 'https://news.ycombinator.com' } }), 1_000_000)
      await saveOutreachDraft(input({ text: '   ' }), 1_000_000)
      expect((await chrome.storage.local.get(OUTREACH_DRAFTS_KEY))[OUTREACH_DRAFTS_KEY]).toBeUndefined()
    })

    it('keeps two people apart', async () => {
      const other = 'https://www.linkedin.com/in/sam-taylor'
      await saveOutreachDraft(input(), 1_000_000)
      await saveOutreachDraft(input({ profile: { ...PROFILE, linkedinUrl: other }, text: 'a different note' }), 1_000_001)
      expect((await loadOutreachDraft(PROFILE_URL, 1_000_002))?.text).toBe(NOTE)
      expect((await loadOutreachDraft(other, 1_000_002))?.text).toBe('a different note')
      expect(await loadOutreachDrafts(1_000_002)).toHaveLength(2)
    })

    it('returns null on any doubt, and never throws', async () => {
      await chrome.storage.local.set({ [OUTREACH_DRAFTS_KEY]: { drafts: 'not a list' } })
      expect(await loadOutreachDraft(PROFILE_URL)).toBeNull()
      await chrome.storage.local.set({ [OUTREACH_DRAFTS_KEY]: { drafts: [{ profileUrl: PROFILE_URL, text: 'x' }] } })
      expect(await loadOutreachDraft(PROFILE_URL)).toBeNull()          // no savedAt
      await saveOutreachDraft(input(), 1_000_000)
      expect(await loadOutreachDraft(PROFILE_URL, 1_000_001 + OUTREACH_DRAFT_MAX_AGE_MS)).toBeNull()
      expect(await loadOutreachDraft('https://news.ycombinator.com')).toBeNull()
    })

    it('forgets one person without touching the others', async () => {
      const other = 'https://www.linkedin.com/in/sam-taylor'
      await saveOutreachDraft(input(), 1_000_000)
      await saveOutreachDraft(input({ profile: { ...PROFILE, linkedinUrl: other }, text: 'keep me' }), 1_000_001)
      await clearOutreachDraft(PROFILE_URL)
      expect(await loadOutreachDraft(PROFILE_URL, 1_000_002)).toBeNull()
      expect((await loadOutreachDraft(other, 1_000_002))?.text).toBe('keep me')
    })

    it('stays silent when the store refuses the write — the note is still on screen', async () => {
      const area = (globalThis.chrome as unknown as { storage: { local: { set: unknown } } }).storage.local
      const original = area.set
      area.set = async () => { throw new Error('QuotaExceeded') }
      await expect(saveOutreachDraft(input(), 1_000_000)).resolves.toBeUndefined()
      area.set = original
    })
  })

  describe('finding the draft for the tab he is looking at', () => {
    it('matches the open profile however that tab spells it', async () => {
      await saveOutreachDraft(input(), 1_000_000)
      stubTab('https://in.linkedin.com/in/Candidate-R?originalSubdomain=in')
      expect((await loadDraftForActiveProfile(1_000_001))?.text).toBe(NOTE)
    })

    it('answers null on a tab that is not a profile — the note is filed, not lost', async () => {
      await saveOutreachDraft(input(), 1_000_000)
      stubTab('https://news.ycombinator.com')
      expect(await loadDraftForActiveProfile(1_000_001)).toBeNull()
    })

    it('never throws when there is no tabs API at all', async () => {
      clearTab()
      expect(await loadDraftForActiveProfile()).toBeNull()
    })
  })
})
