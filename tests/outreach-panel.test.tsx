import { describe, expect, it, vi } from 'vitest'
import {
  MAX_NOTE_CHARS,
  OUTREACH_TONES,
  ageChipLabel,
  charCount,
  chipClassFor,
  chipTitleFor,
  companyAfterRead,
  generateState,
  genderChipLabel,
  missingBeforeDraft,
  readGate,
  readLeadId,
  readProfile,
  readSettings,
  readSuggestion,
  readTemplates,
  sendBlockers,
  tightenState,
  type DraftValues,
} from '@/ui/components/OutreachPanel'
import { LEAD_AGE_BRACKET, LEAD_GENDER, type LeadAgeBracket, type LeadGender } from '@contract/entities'

// Stage 8 — the outreach panel's rules, tested as plain functions.
//
// No test in apps/extension/tests renders React (the suite is jsdom + pure modules; the dashboard
// suite in apps/app is the one that uses renderToStaticMarkup), so the panel's decisions live in
// exported pure helpers and those are what is checked here: what the character count says and when
// it turns red, what the two guess-chips claim, what is still missing before a note can be filled,
// when Tighten is allowed to spend, and every reason "I sent it" stays dead.
//
// The two modules the panel talks to are stubbed. Nothing here touches the hub, chrome.* or a page.

vi.mock('@/lib/outreach', () => ({
  captureActiveTabProfile: vi.fn(),
  getTemplates: vi.fn(),
  draftMessage: vi.fn(),
  tightenMessage: vi.fn(),
  saveLead: vi.fn(),
  recordSent: vi.fn(),
  getOutreachSettings: vi.fn(),
  setOutreachSettings: vi.fn(),
  addTargetRole: vi.fn(),
  // The panel imports these for its restore path. A factory omits nothing it imports, or the
  // symbol is `undefined` at call time and the failure names the wrong thing.
  loadDraftForActiveProfile: vi.fn(async () => null),
  saveOutreachDraft: vi.fn(async () => undefined),
  clearOutreachDraft: vi.fn(async () => undefined),
  loadOutreachDraft: vi.fn(async () => null),
  loadOutreachDrafts: vi.fn(async () => []),
  activeProfileUrl: vi.fn(async () => null),
}))

vi.mock('@/content/adapters/linkedin/profile', () => ({
  suggestAgeBracket: vi.fn(),
  suggestGender: vi.fn(),
}))

function values(patch: Partial<DraftValues> = {}): DraftValues {
  return {
    name: 'Priya',
    standoutSkill: 'the way you scoped the migration',
    company: 'Acme',
    skillset: 'industrial engineering',
    targetRole: 'Process Engineer',
    ...patch,
  }
}

describe('the limit', () => {
  it('is LinkedIn\'s 300, the same number service/outreach.py refuses at', () => {
    expect(MAX_NOTE_CHARS).toBe(300)
  })

  it('offers exactly the two tones the template bank has files for', () => {
    expect([...OUTREACH_TONES]).toEqual(['casual', 'professional'])
  })
})

describe('readProfile', () => {
  it('reads the camelCase shape the page reader returns', () => {
    const person = readProfile({
      linkedinUrl: 'https://www.linkedin.com/in/priya/',
      fullName: 'Priya Raman', headline: 'Ops lead at Acme', company: 'Acme', location: 'Houston',
    })
    expect(person?.linkedinUrl).toBe('https://www.linkedin.com/in/priya/')
    expect(person?.fullName).toBe('Priya Raman')
    expect(person?.firstName).toBe('Priya')     // derived, because the note says [Name] to one person
    expect(person?.lastName).toBe('Raman')
    expect(person?.company).toBe('Acme')
  })

  it('reads the contract\'s snake_case just as well, and unwraps a { profile } envelope', () => {
    const person = readProfile({ profile: { linkedin_url: 'https://x/in/a', full_name: 'Ada Lovelace', company_domain: 'acme.com' } })
    expect(person?.linkedinUrl).toBe('https://x/in/a')
    expect(person?.firstName).toBe('Ada')
    expect(person?.companyDomain).toBe('acme.com')
  })

  it('returns null when nothing person-shaped came back, rather than an empty card that looks like a read', () => {
    expect(readProfile(null)).toBeNull()
    expect(readProfile({})).toBeNull()
    expect(readProfile({ headline: 'just a headline' })).toBeNull()
  })
})

describe('readSuggestion', () => {
  it('keeps the reader\'s value and the reason it gave', () => {
    const s = readSuggestion<LeadAgeBracket>(
      { value: '30s', why: 'graduated 2014 by the education dates' }, LEAD_AGE_BRACKET, 'unknown')
    expect(s.value).toBe('30s')
    expect(s.why).toBe('graduated 2014 by the education dates')
  })

  it('accepts the words a reader might use for a gender and normalises them to the contract', () => {
    const male = readSuggestion<LeadGender>({ gender: 'Male', why: 'first name + pronouns in the about' },
      LEAD_GENDER, 'unknown', { male: 'm', female: 'f' })
    expect(male.value).toBe('m')
  })

  it('leaves an unreadable answer UNKNOWN and says so — it never flips a coin', () => {
    const s = readSuggestion<LeadGender>({ value: 'probably female?' }, LEAD_GENDER, 'unknown')
    expect(s.value).toBe('unknown')
    expect(s.why).toMatch(/nothing is guessed for you/i)
  })

  it('treats a value outside the contract as unknown, whatever confidence came with it', () => {
    const s = readSuggestion<LeadAgeBracket>({ value: '70s', why: 'a long career' }, LEAD_AGE_BRACKET, 'unknown')
    expect(s.value).toBe('unknown')
  })
})

describe('readTemplates / readSettings / readLeadId / readGate', () => {
  it('drops a malformed template rather than repairing it', () => {
    const list = readTemplates([
      { key: '30s_f_casual', bracket: '30s', gender: 'f', tone: 'casual', body: 'Hi [Name]', skeletonChars: 9 },
      { key: 'broken', bracket: '30s' },
    ])
    expect(list).toHaveLength(1)
    expect(list[0].key).toBe('30s_f_casual')
  })

  it('reads settings, defaults the tone, and keeps the chosen role in the list', () => {
    const s = readSettings({ tone: 'shouty', targetRole: 'Process Engineer', targetRoles: ['Reliability Engineer'], skillset: 'IE' })
    expect(s.tone).toBe('casual')
    expect(s.targetRoles).toContain('Process Engineer')
    expect(s.skillset).toBe('IE')
  })

  it('finds the lead id however the hub wrapped it', () => {
    expect(readLeadId('lead-1')).toBe('lead-1')
    expect(readLeadId({ id: 'lead-2' })).toBe('lead-2')
    expect(readLeadId({ lead: { id: 'lead-3' } })).toBe('lead-3')
    expect(readLeadId({})).toBeNull()
  })

  it('is only ok when the hub said ok AND listed no reasons', () => {
    expect(readGate({ ok: true, text: 'hi', chars: 2, reasons: [] }).ok).toBe(true)
    expect(readGate({ ok: true, text: 'hi', reasons: [{ code: 'too_long', detail: 'd', fix: 'f' }] }).ok).toBe(false)
    expect(readGate({}, 'my own words').text).toBe('my own words')
  })

  it('finds the gate inside the envelope the lib answers with, refusals and all', () => {
    // This is the one that matters. draftMessage answers `{status, note, draft}` and tightenMessage
    // `{status, note, result}`; reading the envelope as the gate drops every reason the hub sent,
    // and a note the 300-character rule refused would reach the "I sent it" button looking clean.
    const refusal = {
      status: 'sent',
      note: 'Checked.',
      draft: {
        ok: false,
        text: 'Hi Priya, ' + 'x'.repeat(400),
        chars: 410,
        templateKey: '30s_female_casual',
        reasons: [{ code: 'too_long', detail: '410 characters, 110 over the 300 LinkedIn allows', fix: 'cut 110 characters' }],
      },
    }
    const gate = readGate(refusal, 'the original')
    expect(gate.ok).toBe(false)
    expect(gate.chars).toBe(410)
    expect(gate.templateKey).toBe('30s_female_casual')
    expect(gate.reasons.map((r) => r.code)).toEqual(['too_long'])
    expect(gate.text).not.toBe('the original')

    // tighten's envelope, whose spend must not be reported against the unshortened draft
    const tightened = readGate(
      { status: 'sent', note: 'Shortened.', result: { ok: true, text: 'short', chars: 5, reasons: [], costUsd: 0.0004 } },
      'the long one')
    expect(tightened.text).toBe('short')
    expect(tightened.chars).toBe(5)
    expect(tightened.ok).toBe(true)
    expect(tightened.costUsd).toBe(0.0004)
  })
})

describe('the character count', () => {
  it('is quiet at the limit and red one character past it', () => {
    expect(charCount('x'.repeat(299)).overLimit).toBe(false)
    const at = charCount('x'.repeat(300))
    expect(at.overLimit).toBe(false)
    expect(at.color).toBe('var(--muted)')
    expect(at.label).toBe('300 / 300')

    const over = charCount('x'.repeat(312))
    expect(over.overLimit).toBe(true)
    expect(over.over).toBe(12)
    expect(over.color).toBe('var(--danger)')
    expect(over.label).toBe('312 / 300 — 12 over')
  })
})

describe('the two guess-chips', () => {
  it('labels unknown as unknown on both axes, never as a value', () => {
    expect(ageChipLabel('unknown')).toMatch(/unknown/)
    expect(genderChipLabel('unknown')).toMatch(/unknown/)
    expect(genderChipLabel('m')).toBe('male')
    expect(genderChipLabel('f')).toBe('female')
    expect(ageChipLabel('40s')).toBe('in their 40s')
  })

  it('only styles the chosen chip as chosen, and warns when the chosen one is unknown', () => {
    expect(chipClassFor('30s', '30s')).toBe('chip')
    expect(chipClassFor('30s', '40s')).toBe('chip gray')
    expect(chipClassFor('unknown', 'unknown')).toBe('chip warn-chip')
  })

  it('puts the reader\'s WHY on the suggested chip, and marks it a guess until it is pressed', () => {
    const suggestion = { value: 'f', why: 'pronouns in the about section' }
    const guess = chipTitleFor('f', suggestion, false)
    expect(guess).toContain('pronouns in the about section')
    expect(guess).toMatch(/guess until you press it/i)

    const confirmed = chipTitleFor('f', suggestion, true)
    expect(confirmed).toMatch(/you confirmed/i)

    expect(chipTitleFor('m', suggestion, false)).toMatch(/your call/i)
  })
})

describe('what is still missing before a note can be filled', () => {
  it('is empty once every slot and both axes are settled', () => {
    expect(missingBeforeDraft(values(), '30s', 'f')).toEqual([])
  })

  it('says the stand-out skill is typed, not inferred', () => {
    const missing = missingBeforeDraft(values({ standoutSkill: '  ' }), '30s', 'f')
    expect(missing.join(' ')).toMatch(/you type this one; nothing infers it/i)
  })

  it('sends you to the box for the company rather than back to a reader that cannot find it', () => {
    // The adapter frequently reads no employer off a LinkedIn profile, so "read the profile again"
    // was a dead end. It is a typed field now, and the sentence has to say so.
    const missing = missingBeforeDraft(values({ company: '   ' }), '30s', 'f')
    expect(missing.join(' ')).toMatch(/you type this one/i)
    expect(missing.join(' ')).not.toMatch(/read the profile again/i)
  })
})

describe('the company box, which a read only prefills', () => {
  const person = (linkedinUrl: string, company: string | null) => ({ linkedinUrl, company })

  it('takes what the page named, over anything already typed', () => {
    expect(companyAfterRead(null, 'Typed Co', person('https://x/in/priya', 'Acme'))).toBe('Acme')
    expect(companyAfterRead({ linkedinUrl: 'https://x/in/priya' }, 'Typed Co',
      person('https://x/in/priya', 'Acme'))).toBe('Acme')
  })

  it('keeps what you typed when the same profile is read again and still names no employer', () => {
    // This is the whole point: the reader could not find it, you filled it in, and pressing
    // "Read this profile again" must not throw that away.
    expect(companyAfterRead({ linkedinUrl: 'https://x/in/priya' }, 'Baxter',
      person('https://x/in/priya', null))).toBe('Baxter')
  })

  it('never carries one person’s employer onto another', () => {
    expect(companyAfterRead({ linkedinUrl: 'https://x/in/priya' }, 'Baxter',
      person('https://x/in/sam', null))).toBe('')
  })

  it('treats a profile with no URL as someone else, having nothing to match on', () => {
    expect(companyAfterRead({ linkedinUrl: '' }, 'Baxter', person('', null))).toBe('')
  })

  it('starts empty on the first read of a profile that names no employer', () => {
    expect(companyAfterRead(null, '', person('https://x/in/priya', null))).toBe('')
  })

  it('refuses to fill anything while the register is unknown on either axis', () => {
    expect(missingBeforeDraft(values(), 'unknown', 'f').join(' ')).toMatch(/age bracket/i)
    expect(missingBeforeDraft(values(), '30s', 'unknown').join(' ')).toMatch(/unknown has no note/i)
  })

  it('names each empty slot separately so the human knows what to do', () => {
    const missing = missingBeforeDraft(
      { name: '', standoutSkill: '', company: '', skillset: '', targetRole: '' }, 'unknown', 'unknown')
    expect(missing).toHaveLength(7)
  })
})

describe('Generate message — the only thing that writes the note', () => {
  const ready = {
    missing: [] as string[],
    ageConfirmed: true,
    genderConfirmed: true,
    hasTemplate: true,
    busy: false,
    edited: false,
    text: '',
  }

  it('is live once every field is filled and both chips are confirmed', () => {
    const state = generateState(ready)
    expect(state.enabled).toBe(true)
    expect(state.overwrites).toBe(false)
    expect(state.why).toMatch(/costs nothing/i)
  })

  it('is dead while a field is empty, and names the field rather than just greying out', () => {
    const state = generateState({ ...ready, missing: ['their company — you type this one'] })
    expect(state.enabled).toBe(false)
    expect(state.why).toMatch(/their company/i)
  })

  it('is dead until the bracket and the gender are confirmed, not merely guessed', () => {
    // The bank is 20 notes written per reader. A guess must not pick one on his behalf.
    expect(generateState({ ...ready, ageConfirmed: false }).enabled).toBe(false)
    expect(generateState({ ...ready, ageConfirmed: false }).why).toMatch(/age bracket chip/i)
    expect(generateState({ ...ready, genderConfirmed: false }).why).toMatch(/gender chip/i)
    expect(generateState({ ...ready, ageConfirmed: false, genderConfirmed: false }).why)
      .toMatch(/age bracket and gender chips/i)
  })

  it('is dead when the bank has no note for this combination, and says to change the tone', () => {
    const state = generateState({ ...ready, hasTemplate: false })
    expect(state.enabled).toBe(false)
    expect(state.why).toMatch(/change the tone/i)
  })

  it('is dead while something else is running', () => {
    expect(generateState({ ...ready, busy: true }).enabled).toBe(false)
    expect(generateState({ ...ready, busy: true }).why).toMatch(/wait for the current step/i)
  })

  it('flags that it would overwrite once the note has been hand-edited', () => {
    // Bob's call (2026-09-07): warn, then overwrite — never block, and never silently discard.
    const state = generateState({ ...ready, edited: true, text: 'my own words' })
    expect(state.enabled).toBe(true)
    expect(state.overwrites).toBe(true)
    expect(state.why).toMatch(/asks first/i)
  })

  it('does not call an empty box an overwrite, however edited it is marked', () => {
    expect(generateState({ ...ready, edited: true, text: '   ' }).overwrites).toBe(false)
  })
})

describe('Tighten — the only spend on the screen', () => {
  it('is dead while the note fits, because there is nothing to pay for', () => {
    const state = tightenState(300, false)
    expect(state.enabled).toBe(false)
    expect(state.why).toMatch(/nothing to pay for/i)
  })

  it('wakes up past the limit and says on its face that it spends', () => {
    const state = tightenState(301, false)
    expect(state.enabled).toBe(true)
    expect(state.why).toMatch(/spends money/i)
    expect(state.why).toMatch(/asks before it spends/i)
  })

  it('stays dead while something else is running', () => {
    expect(tightenState(400, true).enabled).toBe(false)
  })
})

describe('"I sent it"', () => {
  const ready = {
    text: 'Hi Priya — the way you scoped the migration stuck with me. I am moving into process engineering.',
    checked: true,
    reasons: [],
    linkedinUrl: 'https://www.linkedin.com/in/priya/',
    busy: false,
    sentAt: null,
  }

  it('is alive only when the message passed every check', () => {
    expect(sendBlockers(ready)).toEqual([])
  })

  it('is dead while the hub has not checked the message — an ungated send is never allowed', () => {
    expect(sendBlockers({ ...ready, checked: false })).toContain('the hub has not checked this message yet')
  })

  it('is dead on every refusal the hub listed, and repeats the fix', () => {
    const blockers = sendBlockers({
      ...ready,
      reasons: [{ code: 'too_long', detail: '312 characters, 12 over the 300 LinkedIn allows', fix: 'cut 12 characters' }],
    })
    expect(blockers).toHaveLength(1)
    expect(blockers[0]).toBe('312 characters, 12 over the 300 LinkedIn allows — cut 12 characters')
  })

  it('is dead with no message, no profile URL, while busy, and once already logged', () => {
    expect(sendBlockers({ ...ready, text: '   ' })).toContain('there is no message yet')
    expect(sendBlockers({ ...ready, linkedinUrl: '' }).join(' ')).toMatch(/press Read this profile/i)
    expect(sendBlockers({ ...ready, busy: true })).toContain('working…')
    expect(sendBlockers({ ...ready, sentAt: '2026-09-07T10:00:00Z' })).toContain('this note is already logged as sent')
  })
})
