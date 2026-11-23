import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The live report (2026-09-07): "the drafting occurs but the message is not getting embedded
// inside the textbox", and then, after that stayed true through a rebuild: "remove the textbox
// completely, draft the message in the outreach tab itself."
//
// So there is no <textarea> any more, and the first assertion here is that there is not one — a
// box that cannot show the message cannot be the thing standing between him and it. This mounts
// the REAL container inside the real AppProvider under jsdom, with only the hub client mocked,
// walks his exact sequence, and reads the rendered note off the page.

const DRAFT_TEXT = 'Dear Steve, your distinguished career and lasting impact involving Digital design '
  + 'Engineer at Apple set a standard I deeply respect. With my background in Semiconductors '
  + 'focused on a Industrial Engineer role, I would be honored to connect with you.'

const loadDraft = vi.fn(async (): Promise<unknown> => null)
const saveDraft = vi.fn(async () => undefined)
const clearDraft = vi.fn(async () => undefined)

// The two database writers, at module level so the tests can read what each button called. The
// split they pin (Bob, 2026-09-09): Generate writes the LEAD, "I sent it" writes the MESSAGE.
type LeadArgs = [profile: Record<string, unknown>, fields: Record<string, unknown>]
type SentArgs = [leadId: string, message: Record<string, unknown>]
const saveLead = vi.fn(async (..._a: LeadArgs): Promise<unknown> => ({ status: 'sent', note: 'Lead saved (Steve Wozniak).', leadId: 'lead-1', row: { id: 'lead-1' } }))
const recordSent = vi.fn(async (..._a: SentArgs): Promise<unknown> => ({ status: 'sent', note: 'recorded', messageId: 'msg-1', row: {} }))

const draftMessage = vi.fn(async () => ({
  status: 'sent' as const,
  note: `Ready — ${DRAFT_TEXT.length} of 300 characters.`,
  draft: { ok: true, templateKey: '60s_male_professional', text: DRAFT_TEXT, chars: DRAFT_TEXT.length, max: 300, reasons: [] },
}))

vi.mock('@/lib/outreach', () => ({
  captureActiveTabProfile: vi.fn(async () => ({
    status: 'sent',
    note: 'Read Steve Wozniak.',
    url: 'https://www.linkedin.com/in/wozniaksteve',
    pageTitle: 'Steve Wozniak | LinkedIn',
    profile: {
      linkedinUrl: 'https://www.linkedin.com/in/wozniaksteve',
      fullName: 'Steve Wozniak', firstName: 'Steve', lastName: 'Wozniak',
      headline: 'Co-founder', company: 'Apple', companyDomain: null, roleTitle: null,
      location: 'Los Gatos', background: null,
      suggestedBracket: '60s', bracketWhy: 'earliest year 1971',
      suggestedGender: 'm', genderWhy: 'pronouns he/him',
    },
  })),
  getTemplates: vi.fn(async () => ({
    status: 'sent', note: '1 templates.', max: 300, tokens: [], banned: [],
    templates: [{ key: '60s_male_professional', bracket: '60s', gender: 'm', tone: 'professional',
      body: 'Dear [Name], … [Stand out skill] at [Company] … [Your Skillset] … [Your Target Role] …', skeletonChars: 182 }],
  })),
  getOutreachSettings: vi.fn(async () => ({
    skillset: 'Semiconductors', targetRoles: ['Industrial Engineer'], lastTargetRole: 'Industrial Engineer', tone: 'professional',
  })),
  setOutreachSettings: vi.fn(async (patch: Record<string, unknown>) => ({ status: 'sent', note: 'saved', settings: patch })),
  addTargetRole: vi.fn(async () => ({ status: 'sent', note: 'added', settings: {} })),
  draftMessage: (...args: unknown[]) => draftMessage(...(args as [])),
  tightenMessage: vi.fn(async () => ({ status: 'error', note: 'not in this test', result: null })),
  saveLead: (...a: unknown[]) => saveLead(...(a as LeadArgs)),
  recordSent: (...a: unknown[]) => recordSent(...(a as SentArgs)),
  loadDraftForActiveProfile: (...a: unknown[]) => loadDraft(...(a as [])),
  saveOutreachDraft: (...a: unknown[]) => saveDraft(...(a as [])),
  clearOutreachDraft: (...a: unknown[]) => clearDraft(...(a as [])),
  loadOutreachDraft: vi.fn(async () => null),
  loadOutreachDrafts: vi.fn(async () => []),
  activeProfileUrl: vi.fn(async () => 'https://www.linkedin.com/in/wozniaksteve'),
}))

// The provider and the panel import lazily so the mock above is in place first.
const { AppProvider } = await import('@/ui/store')
const { OutreachPanel } = await import('@/ui/components/OutreachPanel')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root

/** Let every pending promise and state update settle. A few turns, because the panel chains them. */
async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  }
}

function buttonWithText(text: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)
  if (!match) throw new Error(`no button "${text}" — buttons: ${Array.from(host.querySelectorAll('button')).map((b) => b.textContent?.trim()).join(' | ')}`)
  return match as HTMLButtonElement
}

function inputAfterLabel(labelStartsWith: string): HTMLInputElement {
  const label = Array.from(host.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(labelStartsWith))
  const input = label?.parentElement?.querySelector('input') ?? label?.querySelector('input')
  if (!input) throw new Error(`no input under label "${labelStartsWith}"`)
  return input as HTMLInputElement
}

function setInput(input: HTMLInputElement, value: string): void {
  // React listens on the native value setter; assign through it so the synthetic onChange fires.
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Mount the real container. Separate from beforeEach because the restore tests must arrange what
 *  storage returns BEFORE the panel comes up. */
async function mount(): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => { root.render(<AppProvider><OutreachPanel /></AppProvider>) })
  await settle()
}

beforeEach(async () => {
  draftMessage.mockClear()
  // Reset the store doubles or one test's restored fixture leaks into the next mount.
  loadDraft.mockClear(); loadDraft.mockResolvedValue(null)
  saveDraft.mockClear(); clearDraft.mockClear()
  saveLead.mockClear()
  saveLead.mockResolvedValue({ status: 'sent', note: 'Lead saved (Steve Wozniak).', leadId: 'lead-1', row: { id: 'lead-1' } })
  recordSent.mockClear()
})

afterEach(async () => {
  await act(async () => { root.unmount() })
  host.remove()
})

describe('Generate message, end to end through the real container', () => {
  it('renders the drafted message on the page, with no textbox at all', async () => {
    await mount()
    // 1. Read the profile — name, company and both suggestions arrive.
    await act(async () => { buttonWithText('Read this profile').click() })
    await settle()
    expect(host.textContent).toContain('Steve Wozniak')

    // 2. Confirm both chips by pressing the suggested ones.
    await act(async () => { buttonWithText('in their 60s').click() })
    await act(async () => { buttonWithText('male').click() })
    await settle()

    // 3. Company was prefilled from the profile; the stand-out skill is typed.
    expect(inputAfterLabel('Their company').value).toBe('Apple')
    await act(async () => { setInput(inputAfterLabel('Stand-out skill'), 'Digital design Engineer') })
    await settle()

    // 4. The button is live now, and nothing has been drafted yet.
    const generate = host.querySelector('[data-testid="outreach-generate"]') as HTMLButtonElement
    expect(generate, 'generate button rendered').toBeTruthy()
    expect(generate.disabled, `generate disabled: ${generate.title}`).toBe(false)
    expect(draftMessage).not.toHaveBeenCalled()

    // There is no editable box on this panel, by instruction. Nothing can swallow the note.
    expect(host.querySelector('textarea'), 'no textarea anywhere on the panel').toBeNull()
    expect(host.querySelector('[data-testid="outreach-note-empty"]')?.textContent)
      .toMatch(/No message yet/)

    // 5. Press it.
    await act(async () => { generate.click() })
    await settle()

    expect(draftMessage).toHaveBeenCalledTimes(1)
    // THE claim under test: the message is ON THE PAGE, as text he can read and select.
    const shown = host.querySelector('[data-testid="outreach-note"]')
    expect(shown, 'the note is rendered').toBeTruthy()
    expect(shown!.textContent).toBe(DRAFT_TEXT)
    expect(host.querySelector('textarea'), 'still no textarea after generating').toBeNull()
    expect(host.textContent).toContain('Ready —')
    // and the counter and the send gate follow the note
    expect(host.querySelector('[data-testid="outreach-count"]')?.textContent).toContain(`${DRAFT_TEXT.length}`)
    expect(host.textContent).not.toContain('there is no message yet')
    expect(host.textContent).not.toContain('No message yet')

    // And the on-page wire line reports what actually came back, so a live failure never has to be
    // diagnosed from the console.
    const wire = host.querySelector('[data-testid="outreach-wire"]')?.textContent ?? ''
    expect(wire).toContain('status=sent')
    expect(wire).toContain(`textLength=${DRAFT_TEXT.length}`)
    expect(wire).toContain('templateKey=60s_male_professional')
  })

  it('shows on the page what the hub returned when the draft FAILS, and writes no note', async () => {
    draftMessage.mockResolvedValueOnce({
      status: 'error' as const,
      note: 'The hub rejected the token — set it in the Tailor tab.',
      draft: null,
    } as never)
    await mount()

    await act(async () => { buttonWithText('Read this profile').click() })
    await settle()
    await act(async () => { buttonWithText('in their 60s').click() })
    await act(async () => { buttonWithText('male').click() })
    await settle()
    await act(async () => { setInput(inputAfterLabel('Stand-out skill'), 'Digital design Engineer') })
    await settle()
    await act(async () => { (host.querySelector('[data-testid="outreach-generate"]') as HTMLButtonElement).click() })
    await settle()

    // The failure is named, the note stays empty, and the wire line says textLength=0 — which is
    // what distinguishes "the hub sent nothing" from "the panel lost it".
    expect(host.querySelector('[data-testid="outreach-note"]')).toBeNull()
    expect(host.textContent).toContain('rejected the token')
    const wire = host.querySelector('[data-testid="outreach-wire"]')?.textContent ?? ''
    expect(wire).toContain('status=error')
    expect(wire).toContain('textLength=0')
  })
})

describe('the note comes back after the panel is destroyed', () => {
  // The whole point: App.tsx renders this panel conditionally, so a tab switch unmounts it, and the
  // popup closes the moment he clicks the profile he is reading.
  const RECORD = {
    profileUrl: 'https://www.linkedin.com/in/wozniaksteve',
    profile: {
      linkedinUrl: 'https://www.linkedin.com/in/wozniaksteve', slug: 'wozniaksteve',
      fullName: 'Steve Wozniak', firstName: 'Steve', lastName: 'Wozniak',
      headline: 'Co-founder', company: 'Apple', companyDomain: null, roleTitle: null,
      location: 'Los Gatos', background: null,
      suggestedBracket: '60s', suggestedGender: 'm',
      bracketWhy: 'earliest year 1971', genderWhy: 'pronouns he/him', layers: {},
    },
    bracket: '60s', gender: 'm', ageConfirmed: true, genderConfirmed: true,
    company: 'Apple', standoutSkill: 'Digital design Engineer',
    templateKey: '60s_male_professional', tone: 'professional',
    values: { name: 'Steve', company: 'Apple' },
    text: DRAFT_TEXT, sentAt: null, savedAt: 1_000_000,
  }

  it('is on the page again, and dead until the hub has judged it a second time', async () => {
    loadDraft.mockResolvedValue(RECORD)
    await mount()

    expect(host.querySelector('[data-testid="outreach-note"]')?.textContent).toBe(DRAFT_TEXT)
    // It gates THE STORED WORDS — not a fresh template fill, which would destroy a paid tighten.
    expect(draftMessage).toHaveBeenCalledTimes(1)
    expect((draftMessage.mock.calls[0] as unknown as [{ text: string }])[0].text).toBe(DRAFT_TEXT)
    // and the re-check succeeded here, so the button is live again
    const send = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('I sent it'))
    expect((send as HTMLButtonElement).disabled).toBe(false)
  })

  it('KEEPS the note when the hub cannot check it, and says the button is dead rather than hiding it', async () => {
    loadDraft.mockResolvedValue(RECORD)
    draftMessage.mockResolvedValueOnce({
      status: 'error' as const,
      note: 'No draft — The hub is not running — start it with `make serve` and try again.',
      draft: null,
    } as never)
    await mount()

    // The note is the crux: a failed re-check must never take it away.
    expect(host.querySelector('[data-testid="outreach-note"]')?.textContent).toBe(DRAFT_TEXT)
    const copy = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Copy')
    expect((copy as HTMLButtonElement).disabled).toBe(false)          // he can still get it out
    const send = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('I sent it'))
    expect((send as HTMLButtonElement).disabled).toBe(true)
    expect(host.textContent).toMatch(/back exactly as you left it/i)
    expect(host.querySelector('[data-testid="outreach-wire"]')?.textContent).toContain('recheck status=error')
  })

  it('does not re-check, or re-offer, a note already logged as sent', async () => {
    loadDraft.mockResolvedValue({ ...RECORD, sentAt: '2026-09-07T10:00:00.000Z' })
    await mount()

    expect(draftMessage).not.toHaveBeenCalled()      // nothing to gate: it is already logged
    expect(host.querySelector('[data-testid="outreach-note"]')?.textContent).toBe(DRAFT_TEXT)
    expect(host.textContent).toMatch(/already logged as sent/i)
    const send = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('sent'))
    expect((send as HTMLButtonElement).disabled).toBe(true)
  })

  it('writes the note down the moment the hub answers, with the person it belongs to', async () => {
    await mount()
    await act(async () => { buttonWithText('Read this profile').click() })
    await settle()
    await act(async () => { buttonWithText('in their 60s').click() })
    await act(async () => { buttonWithText('male').click() })
    await settle()
    await act(async () => { setInput(inputAfterLabel('Stand-out skill'), 'Digital design Engineer') })
    await settle()
    await act(async () => { (host.querySelector('[data-testid="outreach-generate"]') as HTMLButtonElement).click() })
    await settle()

    expect(saveDraft).toHaveBeenCalledTimes(1)
    const saved = (saveDraft.mock.calls[0] as unknown as [Record<string, unknown>])[0]
    expect(saved.text).toBe(DRAFT_TEXT)
    expect(saved.templateKey).toBe('60s_male_professional')
    expect(saved.company).toBe('Apple')
    expect(saved.standoutSkill).toBe('Digital design Engineer')
    expect(saved.ageConfirmed).toBe(true)
    expect(saved.sentAt).toBeNull()
    expect((saved.profile as { linkedinUrl: string }).linkedinUrl).toBe('https://www.linkedin.com/in/wozniaksteve')
  })

  it('writes nothing down when the draft failed', async () => {
    draftMessage.mockResolvedValueOnce({ status: 'error' as const, note: 'The hub rejected the token.', draft: null } as never)
    await mount()
    await act(async () => { buttonWithText('Read this profile').click() })
    await settle()
    await act(async () => { buttonWithText('in their 60s').click() })
    await act(async () => { buttonWithText('male').click() })
    await settle()
    await act(async () => { setInput(inputAfterLabel('Stand-out skill'), 'Digital design Engineer') })
    await settle()
    await act(async () => { (host.querySelector('[data-testid="outreach-generate"]') as HTMLButtonElement).click() })
    await settle()

    expect(saveDraft).not.toHaveBeenCalled()
  })

  it('forgets this person\'s note when their profile is read again', async () => {
    await mount()
    await act(async () => { buttonWithText('Read this profile').click() })
    await settle()
    expect(clearDraft).toHaveBeenCalledWith('https://www.linkedin.com/in/wozniaksteve')
  })
})

// ---------------------------------------------------------------------------
// Where each write happens. Bob, 2026-09-09: "the details of the leads must be logged into the
// database when the generate message button is pressed itself". So Generate files the PERSON, and
// "I sent it" keeps the MESSAGE — including its sent_at, which is the only thing on this screen
// that makes the hub spend a SalesQL credit on an email. A test that let the message write drift
// onto Generate would let a note be recorded as sent before it was, and pay for the privilege.
// ---------------------------------------------------------------------------

/** Read the profile, confirm both chips, type the skill, press Generate. His exact sequence. */
async function generateFor(skill = 'Digital design Engineer'): Promise<void> {
  await act(async () => { buttonWithText('Read this profile').click() })
  await settle()
  await act(async () => { buttonWithText('in their 60s').click() })
  await act(async () => { buttonWithText('male').click() })
  await settle()
  await act(async () => { setInput(inputAfterLabel('Stand-out skill'), skill) })
  await settle()
  await act(async () => { (host.querySelector('[data-testid="outreach-generate"]') as HTMLButtonElement).click() })
  await settle()
}

describe('Generate message logs the lead', () => {
  it('writes the person to the database on the Generate press, and no message with them', async () => {
    await mount()
    await generateFor()

    expect(saveLead).toHaveBeenCalledTimes(1)
    const [person, fields] = saveLead.mock.calls[0]
    // The row's key, and the person as read.
    expect(person.linkedinUrl).toBe('https://www.linkedin.com/in/wozniaksteve')
    expect(person.fullName).toBe('Steve Wozniak')
    // The boxes and the chips, not the suggestions: what is on screen is what is filed.
    expect(person.company).toBe('Apple')
    expect(fields.ageBracket).toBe('60s')
    expect(fields.gender).toBe('m')
    expect(fields.ageGenderConfirmed).toBe(true)
    expect(fields.standoutSkill).toBe('Digital design Engineer')

    // AND NOT the message. Nothing is sent, so nothing says it was, and no email is looked up.
    expect(recordSent).not.toHaveBeenCalled()
    // The button that does that is still there, still offered, still un-pressed.
    expect(host.querySelector('[data-testid="outreach-sent"]')?.textContent).toContain('I sent it')
  })

  it('says the lead was saved without burying what the hub said about the note', async () => {
    await mount()
    await generateFor()
    expect(host.textContent).toContain('Ready —')                      // the draft's own verdict
    expect(host.textContent).toContain('Lead saved (Steve Wozniak).')   // and the lead's
  })

  it('keeps the note on screen and says so when the lead write is refused', async () => {
    saveLead.mockResolvedValue({ status: 'dead', note: 'Lead refused by the hub — HTTP 400.', leadId: null, row: {} })
    await mount()
    await generateFor()

    expect(host.querySelector('[data-testid="outreach-note"]')?.textContent).toBe(DRAFT_TEXT)
    expect(host.textContent).toContain('Lead refused by the hub')
    expect(host.textContent).toContain('The note above is unaffected.')
  })

  it('cannot write a lead for a person whose profile was never read', async () => {
    await mount()
    // `leads.linkedin_url` is the row's key and only a read produces one — so the two chips that
    // arm Generate are not even on screen until a profile has been read. Pressing Generate is
    // therefore never a way to file a hand-typed person; there is nothing to key them on.
    await act(async () => { setInput(inputAfterLabel('Their name'), 'Steve') })
    await settle()
    const generate = host.querySelector('[data-testid="outreach-generate"]') as HTMLButtonElement
    expect(generate.disabled, `generate should be dead with no profile: ${generate.title}`).toBe(true)
    await act(async () => { generate.click() })
    await settle()

    expect(draftMessage).not.toHaveBeenCalled()
    expect(saveLead).not.toHaveBeenCalled()
    expect(recordSent).not.toHaveBeenCalled()
  })
})

describe('"I sent it" still owns the message', () => {
  it('hangs the message on the lead Generate already filed', async () => {
    const asked = vi.fn(() => true)
    vi.stubGlobal('confirm', asked)
    try {
      await mount()
      await generateFor()
      await act(async () => { (host.querySelector('[data-testid="outreach-sent"]') as HTMLButtonElement).click() })
      await settle()

      expect(asked).toHaveBeenCalledTimes(1)
      expect(recordSent).toHaveBeenCalledTimes(1)
      const [leadId, message] = recordSent.mock.calls[0]
      expect(leadId).toBe('lead-1')
      expect(message.body).toBe(DRAFT_TEXT)
      expect(message.templateKey).toBe('60s_male_professional')
      // The same upsert ran again, so an edit made between the two presses still reaches the row.
      expect(saveLead).toHaveBeenCalledTimes(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('still finds the lead when the hub loses the id on the second press', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    try {
      await mount()
      await generateFor()                                   // this one lands lead-1
      // The hub went out between the presses: the re-save queues and reports no id back.
      saveLead.mockResolvedValue({ status: 'queued', note: 'Lead queued for the hub — offline.', leadId: null, row: {} })
      await act(async () => { (host.querySelector('[data-testid="outreach-sent"]') as HTMLButtonElement).click() })
      await settle()

      // The id from the Generate press is still the right person, so the message is written rather
      // than stranded with "no lead id yet".
      expect(recordSent).toHaveBeenCalledTimes(1)
      expect(recordSent.mock.calls[0][0]).toBe('lead-1')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
