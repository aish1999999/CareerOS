import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildFactSheet,
  chooseOption,
  matchField,
  parseNumericRange,
  semanticAnswerOption,
  setSemanticAnswerer,
  setSemanticTextAnswerer,
  type MatcherContext,
} from '@/content/matcher'
import { buildInferredEntry, shouldSilentMerge } from '@/content/capture'
import { parseJudgeText } from '@/lib/judge-text'
import { QAEntrySchema, SeedCatalogSchema, defaultProfile, defaultSettings, validateImport } from '@/lib/schema'
import type { PageContext, QAEntry, SignalBundle } from '@/types'

// ---------------------------------------------------------------------------
// Cross-site answering: curated catalog + deterministic portal fixes + the
// AI-judge backup tier (all seams injected — no network anywhere).
// ---------------------------------------------------------------------------

function signal(overrides: Partial<SignalBundle>): SignalBundle {
  return {
    fieldId: 'f1',
    kind: 'text',
    label: '',
    placeholder: '',
    autocomplete: '',
    name: '',
    id: '',
    dataAttrs: [],
    required: false,
    options: [],
    sectionContext: '',
    multiplicityCue: false,
    normalizedQuestion: '',
    rawText: '',
    filled: false,
    consentLike: false,
    eeoLike: false,
    ...overrides,
  }
}

function qa(overrides: Partial<QAEntry>): QAEntry {
  return {
    id: 'q1',
    question: 'placeholder',
    aliases: [],
    answer: '',
    answerType: 'text',
    answerTemplate: null,
    mapsTo: null,
    variables: [],
    personas: [],
    tags: [],
    fieldType: 'text',
    options: [],
    status: 'active',
    source: 'training',
    captureContext: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function ctx(overrides: Partial<MatcherContext> = {}): MatcherContext {
  return {
    profile: defaultProfile(),
    qa: [],
    seeds: [],
    settings: defaultSettings(),
    activePersona: null,
    ...overrides,
  }
}

const pageCtx = (company: string | null): PageContext => ({
  company,
  role: null,
  location: null,
  source: 'jsonld',
})

const yesNoOptions = [
  { value: 'y', text: 'Yes' },
  { value: 'n', text: 'No' },
]

// ---- B2: numeric-range option matching ---------------------------------------

describe('numeric-range option matching', () => {
  it('parses range shapes', () => {
    expect(parseNumericRange('25-50%')).toEqual({ lo: 25, hi: 50 })
    expect(parseNumericRange('Up to 25%')).toEqual({ lo: 0, hi: 25 })
    expect(parseNumericRange('75%+')).toEqual({ lo: 75, hi: Infinity })
    expect(parseNumericRange('50')).toEqual({ lo: 50, hi: 50 })
    expect(parseNumericRange('18 – 24')).toEqual({ lo: 18, hi: 24 })
    expect(parseNumericRange('None of these')).toBeNull()
  })

  it('places a % target on bracketed ranges (travel)', () => {
    const options = ['Up to 25%', '25-50%', '50-75%', '75%+'].map((t) => ({ value: t, text: t }))
    expect(chooseOption(options, '50%')?.text).toBe('25-50%')
  })

  it('places the same target on bare integers', () => {
    const options = ['0', '25', '50', '75'].map((t) => ({ value: t, text: t }))
    expect(chooseOption(options, '50%')?.text).toBe('50')
  })

  it('picks the age bracket containing the age', () => {
    const options = ['18-24', '25-34', '35-44'].map((t) => ({ value: t, text: t }))
    expect(chooseOption(options, '24')?.text).toBe('18-24')
  })

  it('never hijacks non-numeric answers', () => {
    const options = ['1', '2', '3'].map((t) => ({ value: t, text: t }))
    // "Yes" carries no digits — range logic must stay out of the way
    expect(chooseOption(options, 'Yes')).toBeNull()
  })
})

// ---- B3: ordered fallback answers ---------------------------------------------

describe('fallback answers', () => {
  it('places the fallback when the primary answer is not offered (F-1 ↔ OPT)', async () => {
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Current visa status',
        normalizedQuestion: 'current visa status',
        options: [
          { value: 'opt', text: 'OPT' },
          { value: 'h1b', text: 'H-1B' },
          { value: 'gc', text: 'Green Card' },
        ],
      }),
      ctx({
        qa: [
          qa({
            question: 'What is your current work visa status?',
            aliases: ['Current visa status'],
            answer: 'F-1',
            fallbacks: ['OPT'],
          }),
        ],
      }),
    )
    expect(m?.chosenOptionValue).toBe('opt')
    expect(m?.rawAnswerTemplate).toBe('OPT') // the placed alternate
    expect(m?.action).toBe('autofill')
  })

  it('still prefers the primary when it IS offered', async () => {
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Field of study',
        normalizedQuestion: 'field of study',
        options: [
          { value: 'ie', text: 'Industrial Engineering' },
          { value: 'e', text: 'Engineering' },
        ],
      }),
      ctx({
        qa: [
          qa({
            question: 'Field of study',
            answer: 'Industrial Engineering',
            fallbacks: ['Engineering'],
          }),
        ],
      }),
    )
    expect(m?.chosenOptionValue).toBe('ie')
  })
})

// ---- B4: notify entries → guidance chips ---------------------------------------

describe('notify answers', () => {
  it('surfaces guidance as suggest-only and never places an option', async () => {
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Which office location do you prefer?',
        normalizedQuestion: 'which office location do you prefer',
        options: [
          { value: 'nc', text: 'Raleigh, NC' },
          { value: 'tx', text: 'Austin, TX' },
        ],
      }),
      ctx({
        qa: [
          qa({
            question: 'Which office location do you prefer?',
            answerType: 'notify',
            answer: 'Preferred locations: NC, NY, TX, NJ, CA, WI — pick what matches this posting.',
          }),
        ],
      }),
    )
    expect(m?.notify).toBe(true)
    expect(m?.action).toBe('suggest')
    expect(m?.chosenOptionValue).toBeUndefined()
  })
})

// ---- B5: years-of-experience getter ---------------------------------------------

describe('years-of-experience screening', () => {
  it('answers Yes to do-you-have phrasing', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Do you have 3+ years of experience in a manufacturing environment?',
        normalizedQuestion: 'do you have 3 years of experience in a manufacturing environment',
        options: yesNoOptions,
      }),
      ctx(),
    )
    expect(m?.rawAnswerTemplate).toBe('Yes')
    expect(m?.chosenOptionValue).toBe('y')
    expect(m?.action).toBe('autofill')
  })

  it('never blind-answers how-many phrasing', async () => {
    const m = await matchField(
      signal({
        kind: 'text',
        label: 'How many years of experience do you have with CAD?',
        normalizedQuestion: 'how many years of experience do you have with cad',
      }),
      ctx(),
    )
    expect(m).toBeNull()
  })
})

// ---- B6: field-kind-aware start date ---------------------------------------------

describe('earliest start date', () => {
  const profile = { ...defaultProfile(), earliestStartDate: '2026-09-01' }

  it('gives date inputs the ISO value', async () => {
    const m = await matchField(
      signal({
        kind: 'date',
        label: 'What is your earliest available start date?',
        normalizedQuestion: 'what is your earliest available start date',
      }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('2026-09-01')
    expect(m?.action).toBe('autofill')
  })

  it('gives text inputs the long form', async () => {
    const m = await matchField(
      signal({
        kind: 'text',
        label: 'When can you start?',
        normalizedQuestion: 'when can you start',
      }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('September 1, 2026')
  })

  it('leaves work-history Start Date labels to the work getter (regression)', async () => {
    const withJob = {
      ...profile,
      workHistory: [
        {
          company: 'McWane',
          title: 'Engineer',
          startDate: '2026-01',
          endDate: '2026-05',
          location: '',
          description: '',
        },
      ],
    }
    const m = await matchField(
      signal({
        kind: 'text',
        label: 'Start Date',
        normalizedQuestion: 'start date',
        sectionKind: 'work',
      }),
      ctx({ profile: withJob }),
    )
    expect(m?.rawAnswerTemplate).toBe('2026-01')
  })
})

// ---- B7: consent split ------------------------------------------------------------

describe('consent split (certification auto-ticks, the rest chips)', () => {
  const consentQa = [
    qa({
      id: 'c1',
      question: 'I certify that the information provided is true and accurate',
      answer: 'Yes',
      fieldType: 'checkbox',
    }),
    qa({
      id: 'c2',
      question: 'Do you consent to sharing your data with third parties?',
      answer: 'No',
      fieldType: 'checkbox',
    }),
  ]

  it('certification-of-truth boxes may autofill', async () => {
    const m = await matchField(
      signal({
        kind: 'checkbox',
        label: 'I certify that the information provided is true and accurate',
        normalizedQuestion: 'i certify that the information provided is true and accurate',
        consentLike: true,
        certificationLike: true,
      }),
      ctx({ qa: consentQa }),
    )
    expect(m?.chosenOptionValue).toBe('checked')
    expect(m?.action).toBe('autofill')
  })

  it('other consent boxes fill from their stored curated answers too', async () => {
    const m = await matchField(
      signal({
        kind: 'checkbox',
        label: 'Do you consent to sharing your data with third parties?',
        normalizedQuestion: 'do you consent to sharing your data with third parties',
        consentLike: true,
        certificationLike: false,
      }),
      ctx({ qa: consentQa }),
    )
    expect(m?.chosenOptionValue).toBe('unchecked') // the stored "No"
    expect(m?.action).toBe('autofill') // no review step (user decision)
  })
})

// ---- B8: "have you worked at ‹this company›?" -------------------------------------

describe('brand-agnostic prior-employment matching', () => {
  const profile = { ...defaultProfile(), previouslyEmployedHere: false }

  it('answers No when the question names the page company (pageContext)', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Have you ever worked for Amgen or any of its subsidiaries?',
        normalizedQuestion: 'have you ever worked for amgen or any of its subsidiaries',
        options: yesNoOptions,
      }),
      ctx({ profile, pageContext: pageCtx('Amgen') }),
    )
    expect(m?.rawAnswerTemplate).toBe('No')
    expect(m?.chosenOptionValue).toBe('n')
    expect(m?.action).toBe('autofill')
  })

  it('recognizes the company from the hostname alone', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Have you previously been employed by Catalent?',
        normalizedQuestion: 'have you previously been employed by catalent',
        options: yesNoOptions,
      }),
      ctx({ profile, hostname: 'catalent.wd1.myworkdayjobs.com' }),
    )
    expect(m?.rawAnswerTemplate).toBe('No')
  })

  it('answers generic this-company phrasing without any brand', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Have you previously worked for this company?',
        normalizedQuestion: 'have you previously worked for this company',
        options: yesNoOptions,
      }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('No')
  })

  it('never catches "Are you currently employed?" (different question)', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Are you currently employed?',
        normalizedQuestion: 'are you currently employed',
        options: yesNoOptions,
      }),
      ctx({ profile }),
    )
    expect(m).toBeNull()
  })

  it('bridges a stored generalized question to a new company via hostname tokens', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Would you accept a role at Catalent requiring weekend coverage?',
        normalizedQuestion: 'would you accept a role at catalent requiring weekend coverage',
        options: yesNoOptions,
      }),
      ctx({
        hostname: 'careers.catalent.com',
        qa: [
          qa({
            question: 'Would you accept a role at company requiring weekend coverage?',
            answer: 'Yes',
          }),
        ],
      }),
    )
    expect(m?.rawAnswerTemplate).toBe('Yes')
    expect(m?.chosenOptionValue).toBe('y')
  })
})

// ---- B8b: per-company option WORDINGS for the same question -----------------------

describe('prior-employment option sets vary per company (Fix 3)', () => {
  const noProfile = { ...defaultProfile(), previouslyEmployedHere: false }
  const yesProfile = { ...defaultProfile(), previouslyEmployedHere: true }
  // Workday's usual trio — no literal "No" anywhere
  const workdayTrio = [
    { value: 'cur', text: 'I am a current employee of Novonesis' },
    { value: 'past', text: 'I have previously worked for Novonesis' },
    { value: 'never', text: 'I have never worked for Novonesis, its affiliates or subsidiaries' },
  ]

  it('chooseOption places a bare "No" on the never-worked wording', () => {
    const c = chooseOption(workdayTrio, 'No')
    expect(c?.value).toBe('never')
  })

  it('autofills the never-worked option end-to-end (radio, brand cue)', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Have you ever worked for Novonesis or any of its subsidiaries?',
        normalizedQuestion: 'have you ever worked for novonesis or any of its subsidiaries',
        options: workdayTrio,
      }),
      ctx({ profile: noProfile, hostname: 'novonesis.wd3.myworkdayjobs.com' }),
    )
    expect(m?.chosenOptionValue).toBe('never')
    expect(m?.action).toBe('autofill')
  })

  it('places "No" on a "No experience" wording', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Have you previously worked for this company?',
        normalizedQuestion: 'have you previously worked for this company',
        options: [
          { value: 'y', text: 'Yes' },
          { value: 'ne', text: 'No experience' },
        ],
      }),
      ctx({ profile: noProfile }),
    )
    expect(m?.chosenOptionValue).toBe('ne')
  })

  it('falls back to "Not applicable" when nothing negative is offered', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Have you previously worked for this company?',
        normalizedQuestion: 'have you previously worked for this company',
        options: [
          { value: 'y', text: 'Yes, I have' },
          { value: 'na', text: 'Not applicable' },
        ],
      }),
      ctx({ profile: noProfile }),
    )
    expect(m?.chosenOptionValue).toBe('na')
  })

  it('a Yes profile lands on the previously-worked option, never the negation', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Have you ever worked for Novonesis or any of its subsidiaries?',
        normalizedQuestion: 'have you ever worked for novonesis or any of its subsidiaries',
        options: workdayTrio,
      }),
      ctx({ profile: yesProfile, hostname: 'novonesis.wd3.myworkdayjobs.com' }),
    )
    expect(m?.chosenOptionValue).toBe('past')
  })

  it('fallback wordings flow to the fill layer for live dropdown lists', async () => {
    const m = await matchField(
      signal({
        kind: 'custom-dropdown',
        label: 'Have you ever worked for Novonesis or any of its subsidiaries?',
        normalizedQuestion: 'have you ever worked for novonesis or any of its subsidiaries',
      }),
      ctx({ profile: noProfile, hostname: 'novonesis.wd3.myworkdayjobs.com' }),
    )
    expect(m?.rawAnswerTemplate).toBe('No')
    expect(m?.answerFallbacks).toContain('I have never worked for this company')
    expect(m?.answerFallbacks).toContain('Not applicable')
  })
})

// ---- C4: inference paths -----------------------------------------------------------

describe('AI inference paths (seam-injected)', () => {
  afterEach(() => {
    setSemanticAnswerer(null)
    setSemanticTextAnswerer(null)
  })

  it('generated free text fills directly (no review step)', async () => {
    setSemanticTextAnswerer(async () => 'I am drawn to process improvement work.')
    const m = await matchField(
      signal({
        kind: 'textarea',
        label: 'What interests you about this industry?',
        normalizedQuestion: 'what interests you about this industry',
      }),
      ctx(),
    )
    expect(m?.rawAnswerTemplate).toBe('I am drawn to process improvement work.')
    expect(m?.action).toBe('autofill')
    expect(m?.provenance).toBe('inferred')
  })

  it('declining generator (null) leaves the field unmatched', async () => {
    setSemanticTextAnswerer(async () => null)
    const m = await matchField(
      signal({
        kind: 'text',
        label: 'Describe a challenge you overcame recently at work',
        normalizedQuestion: 'describe a challenge you overcame recently at work',
      }),
      ctx(),
    )
    expect(m).toBeNull()
  })

  it('never generates for eeoLike or identity-style labels', async () => {
    const spy = vi.fn(async () => 'never')
    setSemanticTextAnswerer(spy)
    expect(
      await matchField(
        signal({
          kind: 'text',
          label: 'What is your gender identity story?',
          normalizedQuestion: 'what is your gender identity story',
          eeoLike: true,
        }),
        ctx(),
      ),
    ).toBeNull()
    expect(
      await matchField(
        signal({ kind: 'text', label: 'Middle name', normalizedQuestion: 'middle name' }),
        ctx(),
      ),
    ).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('unknown custom dropdowns defer inference to fill time', async () => {
    setSemanticAnswerer(async () => null)
    const m = await matchField(
      signal({
        kind: 'custom-dropdown',
        label: 'Primary device type',
        normalizedQuestion: 'primary device type',
      }),
      ctx(),
    )
    expect(m?.inferAtFill).toBe(true)
    expect(m?.provenance).toBe('inferred')
    expect(m?.action).toBe('autofill')
    expect(m?.rawAnswerTemplate).toBe('')
  })

  it('no judge configured → no deferred match (graceful degradation)', async () => {
    const m = await matchField(
      signal({
        kind: 'custom-dropdown',
        label: 'Primary device type',
        normalizedQuestion: 'primary device type',
      }),
      ctx(),
    )
    expect(m).toBeNull()
  })

  it('drift promotion marks qa-backed provenance for the learning loop', async () => {
    const { setSemanticQuestionMatcher } = await import('@/content/matcher')
    setSemanticQuestionMatcher(async (question, candidates) =>
      question.includes('get in touch')
        ? candidates.findIndex((c) => c.includes('contact method'))
        : null,
    )
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'How should our recruiters get in touch with you?',
        normalizedQuestion: 'how should our recruiters get in touch with you',
        options: [
          { value: 'e', text: 'Email' },
          { value: 'p', text: 'Phone' },
        ],
      }),
      ctx({ qa: [qa({ id: 'pcm', question: 'Preferred contact method', answer: 'Email' })] }),
    )
    setSemanticQuestionMatcher(null)
    expect(m?.provenance).toBe('drift')
    expect(m?.source).toBe('qa:pcm')
  })

  it('semanticAnswerOption bounds-checks and scores the judge pick', async () => {
    setSemanticAnswerer(async (_q, options) => options.indexOf('Laptop'))
    const pick = await semanticAnswerOption(
      'Primary device type',
      [
        { value: 'd', text: 'Desktop' },
        { value: 'l', text: 'Laptop' },
      ],
      'facts',
    )
    expect(pick).toMatchObject({ index: 1, text: 'Laptop', score: 0.86 })
  })
})

// ---- C2: fact sheet ------------------------------------------------------------------

describe('buildFactSheet relevance', () => {
  it('ranks relevant Q→As first and always keeps profile lines', () => {
    const entries = [
      qa({ id: 'a', question: 'Favorite color', answer: 'Blue' }),
      qa({ id: 'b', question: 'Are you willing to travel for work?', answer: 'Yes, up to 50%' }),
    ]
    const sheet = buildFactSheet(
      ctx({ profile: { ...defaultProfile(), firstName: 'A', lastName: 'M' }, qa: entries }),
      'What percentage of time are you willing to travel?',
    )
    expect(sheet.startsWith('Name: A M')).toBe(true)
    expect(sheet.indexOf('willing to travel')).toBeGreaterThan(-1)
    expect(sheet.indexOf('willing to travel')).toBeLessThan(sheet.indexOf('Favorite color'))
  })

  it('clamps single runaway answers', () => {
    const sheet = buildFactSheet(
      ctx({ qa: [qa({ question: 'Essay', answer: 'x'.repeat(1000) })] }),
      'Essay',
    )
    const line = sheet.split('\n').find((l) => l.startsWith('Q: Essay'))!
    expect(line.length).toBeLessThanOrEqual(320)
  })
})

// ---- parseJudgeText ---------------------------------------------------------------------

describe('parseJudgeText', () => {
  it('passes ordinary answers through', () => {
    expect(parseJudgeText('Two weeks')).toBe('Two weeks')
  })
  it('strips surrounding quotes', () => {
    expect(parseJudgeText('"Two weeks"')).toBe('Two weeks')
  })
  it('treats UNKNOWN (any case/punctuation) as decline', () => {
    expect(parseJudgeText('UNKNOWN')).toBeNull()
    expect(parseJudgeText('unknown.')).toBeNull()
    expect(parseJudgeText(' Unknown ')).toBeNull()
  })
  it('returns null on empty/undefined', () => {
    expect(parseJudgeText('')).toBeNull()
    expect(parseJudgeText(undefined)).toBeNull()
  })
  it('caps runaway replies', () => {
    expect(parseJudgeText('y'.repeat(2000))!.length).toBeLessThanOrEqual(601)
  })
})

// ---- learning-loop factories ---------------------------------------------------------

describe('inferred-entry persistence factories', () => {
  it('buildInferredEntry is pending (review gate), tagged, and source inferred', () => {
    const entry = buildInferredEntry(
      signal({
        kind: 'select',
        label: 'Device type',
        normalizedQuestion: 'device type',
        options: [{ value: 'l', text: 'Laptop' }],
      }),
      'Laptop',
      pageCtx('Hooli'),
      123,
    )
    expect(entry).toMatchObject({
      question: 'device type',
      aliases: ['Device type'],
      answer: 'Laptop',
      status: 'needs_review', // reuse waits for approval (2026-07-16)
      source: 'inferred',
      tags: ['ai-inferred'],
      options: ['Laptop'],
      createdAt: 123,
    })
  })

  it('shouldSilentMerge: same answer or branded-only difference', () => {
    const entry = qa({ question: 'How did you hear about us?', answer: 'Website' })
    expect(shouldSilentMerge('website', entry, pageCtx('Hooli'))).toBe(true)
    expect(shouldSilentMerge('hooli.com', entry, pageCtx('Hooli'), 'hooli.wd5.myworkdayjobs.com')).toBe(true)
    expect(shouldSilentMerge('A friend told me', entry, pageCtx('Hooli'))).toBe(false)
  })
})

// ---- schema round-trips + shipped data --------------------------------------------------

describe('schema and shipped data', () => {
  it('round-trips inferred/notify/fallbacks entries', () => {
    const parsed = QAEntrySchema.parse({
      id: 'x',
      question: 'Q',
      answer: 'A',
      source: 'inferred',
      answerType: 'notify',
      fallbacks: ['B'],
    })
    expect(parsed.source).toBe('inferred')
    expect(parsed.answerType).toBe('notify')
    expect(parsed.fallbacks).toEqual(['B'])
  })

  it('the expanded seed catalog parses and keeps unique ids', () => {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'public/seed-questions.json'), 'utf8'))
    const catalog = SeedCatalogSchema.parse(raw)
    expect(catalog.questions.length).toBeGreaterThanOrEqual(114)
    const ids = catalog.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    const notify = catalog.questions.filter((q) => q.answerType === 'notify')
    expect(notify.length).toBeGreaterThanOrEqual(5)
    for (const seed of notify) expect(seed.guidance).toBeTruthy()
  })

  it('the pre-answered import file validates with zero rejections', () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), 'flashfiller-profile-import.local.json'), 'utf8'),
    )
    const result = validateImport(raw)
    expect(result.ok).toBe(true)
    expect(result.rejected).toEqual([])
    expect(result.data?.qa?.length).toBeGreaterThanOrEqual(58)
    expect(result.data?.profile?.earliestStartDate).toBe('2026-09-01')
    // The user-confirmed ADA reversal must never regress silently
    const byTag = (tag: string) => result.data!.qa!.find((e) => e.tags.includes(tag))
    expect(byTag('seed:essential-functions')?.answer).toBe('Yes')
    expect(byTag('seed:need-accommodation')?.answer).toBe('No')
    expect(byTag('seed:data-sharing-consent')?.answer).toBe('No')
  })
})

// ---- Account creation (sign-up / sign-in forms) -----------------------------------

describe('account creation', () => {
  const creds = {
    ...defaultProfile(),
    email: 'contact@example.com',
    accountEmail: 'account@example.com',
    accountPassword: 'S3cret!pw',
  }

  it('detector: password inputs get kind password + authContext, and mark form siblings', async () => {
    const { detectFields } = await import('@/content/detector')
    document.body.innerHTML = `
      <form>
        <label for="e">Email address</label><input id="e" type="email">
        <label for="p">Create password</label><input id="p" type="password">
        <label for="v">Verify password</label><input id="v" type="password">
      </form>`
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => (f.el as HTMLInputElement).id === id)!
    expect(byId('p').signal.kind).toBe('password')
    expect(byId('v').signal.kind).toBe('password')
    expect(byId('e').signal.authContext).toBe(true)
    document.body.innerHTML = ''
  })

  it('password fields fill the account password whatever the label', async () => {
    for (const label of ['Password', 'Create password', 'Verify New Password']) {
      const m = await matchField(
        signal({
          kind: 'password',
          label,
          normalizedQuestion: label.toLowerCase(),
          authContext: true,
        }),
        ctx({ profile: creds }),
      )
      expect(m?.rawAnswerTemplate).toBe('S3cret!pw')
      expect(m?.action).toBe('autofill')
    }
  })

  it('no stored password → password fields stay untouched', async () => {
    const m = await matchField(
      signal({ kind: 'password', label: 'Password', normalizedQuestion: 'password', authContext: true }),
      ctx(),
    )
    expect(m).toBeNull()
  })

  it('auth-form email gets the ACCOUNT email; application email stays contact', async () => {
    const auth = await matchField(
      signal({ kind: 'email', label: 'Email address', normalizedQuestion: 'email address', authContext: true }),
      ctx({ profile: creds }),
    )
    expect(auth?.rawAnswerTemplate).toBe('account@example.com')
    const application = await matchField(
      signal({ kind: 'email', label: 'Email address', normalizedQuestion: 'email address' }),
      ctx({ profile: creds }),
    )
    expect(application?.rawAnswerTemplate).toBe('contact@example.com')
  })

  it('username on an auth form = account email; outside auth forms it never fires', async () => {
    const auth = await matchField(
      signal({ kind: 'text', label: 'Username', normalizedQuestion: 'username', authContext: true }),
      ctx({ profile: creds }),
    )
    expect(auth?.rawAnswerTemplate).toBe('account@example.com')
    const plain = await matchField(
      signal({ kind: 'text', label: 'Username', normalizedQuestion: 'username' }),
      ctx({ profile: creds }),
    )
    expect(plain).toBeNull()
  })

  it('a valid import can include account email and password', () => {
    const result = validateImport({
      profile: { accountEmail: 'account@example.com', accountPassword: 'example-password' },
    })
    expect(result.data?.profile?.accountEmail).toBe('account@example.com')
    expect(result.data?.profile?.accountPassword).toBe('example-password')
  })
})

// ---- Bug fix: address field filled with work "From" date (2026-07-15) --------------

describe('bare From/To date-context gate', () => {
  const withJob = {
    ...defaultProfile(),
    workHistory: [
      {
        company: 'McWane',
        title: 'Engineer',
        startDate: '2026-01',
        endDate: '2026-05',
        location: '',
        description: '',
      },
    ],
  }

  it('an address input that inherited a "From" caption as its label stays empty', async () => {
    // labelFromPrecedingText leak: kind text, no date hint anywhere
    const m = await matchField(
      signal({ kind: 'text', label: 'From', normalizedQuestion: 'from', name: 'addr1' }),
      ctx({ profile: withJob }),
    )
    expect(m).toBeNull()
  })

  it('identifiers merely containing "from" never pull a date (addressFrom, validFrom)', async () => {
    for (const name of ['addressFrom', 'validFrom', 'from_address']) {
      const m = await matchField(
        signal({ kind: 'text', label: '', name, normalizedQuestion: name.toLowerCase() }),
        ctx({ profile: withJob }),
      )
      expect(m?.rawAnswerTemplate).not.toBe('2026-01')
    }
  })

  it('address-flavored fields inside a work block are vetoed despite sectionKind', async () => {
    const m = await matchField(
      signal({
        kind: 'text',
        label: 'From',
        name: 'workAddressLine',
        normalizedQuestion: 'from',
        sectionKind: 'work',
      }),
      ctx({ profile: withJob }),
    )
    expect(m).toBeNull()
  })

  it('REAL date fields still fill: date kind, MM/YYYY placeholder, work block, dateFrom name', async () => {
    const cases: Array<Partial<SignalBundle>> = [
      { kind: 'date', label: 'From', normalizedQuestion: 'from' },
      { kind: 'text', label: 'From', placeholder: 'MM/YYYY', normalizedQuestion: 'from' },
      { kind: 'text', label: 'From', sectionKind: 'work', normalizedQuestion: 'from' },
      { kind: 'text', label: '', name: 'dateFrom', normalizedQuestion: 'date from' },
    ]
    for (const overrides of cases) {
      const m = await matchField(signal(overrides), ctx({ profile: withJob }))
      expect(m?.rawAnswerTemplate).toBe('2026-01')
    }
  })

  it('education "From" in an education block still gets the education date', async () => {
    const profile = {
      ...withJob,
      education: [
        { institution: 'UH', degree: 'MS', field: 'IE', startDate: '2024-01', endDate: '2026-05' },
      ],
    }
    const m = await matchField(
      signal({ kind: 'date', label: 'From', normalizedQuestion: 'from', sectionKind: 'education' }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('2024-01')
  })
})

// ---- Kellanova live-report fixes (2026-07-15) ---------------------------------------

describe('Kellanova report fixes', () => {
  it('sentence questions quoting "job description" never get a work description', async () => {
    const profile = {
      ...defaultProfile(),
      workHistory: [
        { company: 'X', title: 'T', startDate: '2026-01', endDate: '', location: '', description: 'Automated the line' },
      ],
    }
    const m = await matchField(
      signal({
        kind: 'radio',
        label:
          'After reviewing this job description, are you able to perform the essential functions of this job with or without reasonable accommodation?',
        normalizedQuestion:
          'after reviewing this job description are you able to perform the essential functions of this job with or without reasonable accommodation',
        options: yesNoOptions,
      }),
      ctx({
        profile,
        qa: [
          qa({
            question:
              'Can you perform the essential functions of this job with or without reasonable accommodation?',
            answer: 'Yes',
          }),
        ],
      }),
    )
    expect(m?.rawAnswerTemplate).toBe('Yes')
    expect(m?.chosenOptionValue).toBe('y')
  })

  it('short "Role Description" labels still get the work description', async () => {
    const profile = {
      ...defaultProfile(),
      workHistory: [
        { company: 'X', title: 'T', startDate: '2026-01', endDate: '', location: '', description: 'Automated the line' },
      ],
    }
    const m = await matchField(
      signal({ kind: 'textarea', label: 'Role Description', normalizedQuestion: 'role description' }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('Automated the line')
  })

  it('state code places on full state names and vice versa', async () => {
    const options = ['Alabama', 'Texas', 'Wyoming'].map((t) => ({ value: t, text: t }))
    expect(chooseOption(options, 'TX')?.text).toBe('Texas')
    const codeOptions = ['AL', 'TX', 'WY'].map((t) => ({ value: t, text: t }))
    expect(chooseOption(codeOptions, 'Texas')?.text).toBe('TX')
  })

  it('country variants place across wordings', async () => {
    const options = ['Algeria', 'United States of America', 'Zimbabwe'].map((t) => ({ value: t, text: t }))
    expect(chooseOption(options, 'United States')?.text).toBe('United States of America')
    expect(chooseOption([{ value: 'us', text: 'USA' }, { value: 'ca', text: 'Canada' }], 'United States')?.text).toBe('USA')
  })

  it('"legally eligible to work" phrasing answers from authorizedToWork', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Are you legally eligible to work in the country where this role is based?',
        normalizedQuestion: 'are you legally eligible to work in the country where this role is based',
        options: yesNoOptions,
      }),
      ctx({ profile: { ...defaultProfile(), authorizedToWork: true } }),
    )
    expect(m?.rawAnswerTemplate).toBe('Yes')
    expect(m?.chosenOptionValue).toBe('y')
  })

  it('"Are you at least 18 years of age?" answers Yes', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Are you at least 18 years of age or older?',
        normalizedQuestion: 'are you at least 18 years of age or older',
        options: yesNoOptions,
      }),
      ctx(),
    )
    expect(m?.rawAnswerTemplate).toBe('Yes')
  })

  it('"What date are you available?" gets the earliest start date', async () => {
    const m = await matchField(
      signal({
        kind: 'date',
        label: 'What date are you available?',
        normalizedQuestion: 'what date are you available',
      }),
      ctx({ profile: { ...defaultProfile(), earliestStartDate: '2026-09-01' } }),
    )
    expect(m?.rawAnswerTemplate).toBe('2026-09-01')
  })

  it('"previously partnered as a contractor" is the prior-employment question', async () => {
    const m = await matchField(
      signal({
        kind: 'radio',
        label: 'Have you previously partnered with Kellanova/Kellogg as a contractor?',
        normalizedQuestion: 'have you previously partnered with kellanova kellogg as a contractor',
        options: yesNoOptions,
      }),
      ctx({ profile: defaultProfile(), pageContext: pageCtx('Kellanova') }),
    )
    expect(m?.rawAnswerTemplate).toBe('No')
  })

})

// ---- Dependent State dropdowns (Country → State) --------------------------------

describe('dependent selects: placeholder-only at match time', () => {
  it('a State select with only "- Select -" stays autofill-able (placement deferred)', async () => {
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'State',
        normalizedQuestion: 'state',
        options: [{ value: '', text: '- Select -' }],
      }),
      ctx({
        profile: {
          ...defaultProfile(),
          address: { line1: '', line2: '', city: 'Houston', state: 'TX', postalCode: '', country: 'United States' },
        },
      }),
    )
    expect(m?.rawAnswerTemplate).toBe('TX')
    expect(m?.action).toBe('autofill') // NOT capped to suggest — fill time decides
    expect(m?.chosenOptionValue).toBeUndefined()
  })

  it('a select with REAL options that cannot place is still suggest-capped', async () => {
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'State',
        normalizedQuestion: 'state',
        options: [
          { value: '', text: '- Select -' },
          { value: 'on', text: 'Ontario' },
          { value: 'qc', text: 'Quebec' },
        ],
      }),
      ctx({
        profile: {
          ...defaultProfile(),
          address: { line1: '', line2: '', city: 'Houston', state: 'TX', postalCode: '', country: 'United States' },
        },
      }),
    )
    expect(m?.action).toBe('suggest') // TX isn't offered — never guess Ontario
  })
})

// ---- Phone Device Type: instant deterministic Mobile ------------------------------

describe('phone device type', () => {
  it('answers Mobile instantly from tier 1 (no judge, no import needed)', async () => {
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Phone Device Type',
        normalizedQuestion: 'phone device type',
        options: [
          { value: 'l', text: 'Landline' },
          { value: 'm', text: 'Mobile' },
          { value: 'f', text: 'Fax' },
        ],
      }),
      ctx(),
    )
    expect(m?.rawAnswerTemplate).toBe('Mobile')
    expect(m?.chosenOptionValue).toBe('m')
    expect(m?.action).toBe('autofill')
  })

  it('never hits IT-style "Primary device type" (no phone cue)', async () => {
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Primary device type',
        normalizedQuestion: 'primary device type',
        options: [
          { value: 'd', text: 'Desktop' },
          { value: 'l', text: 'Laptop' },
        ],
      }),
      ctx(),
    )
    expect(m?.rawAnswerTemplate).not.toBe('Mobile')
  })
})
