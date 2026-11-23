import { afterEach, describe, expect, it } from 'vitest'
import {
  CAPTURED_AUTOFILL_MIN,
  TRUSTED_OK_COUNT,
  chooseOption,
  conflictingQualifiers,
  matchField,
  recordOptionEquivalence,
  semanticChooseOption,
  setSemanticSimilarity,
  type MatcherContext,
} from '@/content/matcher'
import {
  buildCaptureDraft,
  canonicalizeDateCapture,
  isSkippedCapture,
  prepareCaptureValue,
  wrongVerdictAction,
} from '@/content/capture'
import { crossesEeoTopic } from '@/lib/eeo'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import type { PageContext, QAEntry, SignalBundle } from '@/types'

// ---------------------------------------------------------------------------
// 2026-07-16 learned-answer rebuild: capture hygiene (prepareCaptureValue),
// two-strike demotion, the source-aware autofill bar with graduation, the
// qualifier guard, site scoping, and the semantic layer's offline hooks.
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
    questionSource: 'label',
    ...overrides,
  }
}

function qa(overrides: Partial<QAEntry>): QAEntry {
  return {
    id: 'q1',
    question: 'notice period',
    aliases: [],
    answer: 'Two weeks',
    answerType: 'text',
    answerTemplate: null,
    mapsTo: null,
    variables: [],
    personas: [],
    tags: [],
    fieldType: 'text',
    options: [],
    status: 'active',
    source: 'captured',
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

const pageCtx: PageContext = { company: 'McWane', role: null, location: null, source: 'jsonld' }

afterEach(() => setSemanticSimilarity(null))

// ---- prepareCaptureValue ---------------------------------------------------

describe('prepareCaptureValue (capture hygiene)', () => {
  it('skips when the question key came from a name/id identifier', () => {
    const p = prepareCaptureValue(
      signal({ questionSource: 'identifier', normalizedQuestion: 'q 00123' }),
      'some answer',
      null,
      'jobs.example.com',
    )
    expect(isSkippedCapture(p)).toBe(true)
  })

  it('skips section-heading question keys', () => {
    const p = prepareCaptureValue(
      signal({ questionSource: 'section' }),
      'some answer',
      null,
      'jobs.example.com',
    )
    expect(isSkippedCapture(p)).toBe(true)
  })

  it('skips dropdown-placeholder values and multi-select counters', () => {
    for (const noise of ['Select One', 'Please select…', '2 selected', '3 items selected', '---']) {
      const p = prepareCaptureValue(signal({ label: 'Country' }), noise, null, 'x.com')
      expect(isSkippedCapture(p)).toBe(true)
    }
  })

  it('skips opaque widget ids (Workday internal hex/uuid leaking as display text)', () => {
    for (const junk of [
      'fc77e3a1ab36487f9646d14f7242dd77',
      'CF171B111BA11007448A148D4E9F0000',
      '123e4567-e89b-12d3-a456-426614174000',
    ]) {
      const p = prepareCaptureValue(signal({ label: 'State' }), junk, null, 'x.com')
      expect(isSkippedCapture(p)).toBe(true)
    }
    // real answers that merely LOOK code-ish still capture
    const ok = prepareCaptureValue(signal({ label: 'Postal code' }), '77054', null, 'x.com')
    expect(isSkippedCapture(ok)).toBe(false)
  })

  it('canonicalizes MM/DD/YYYY on date fields to ISO', () => {
    const p = prepareCaptureValue(
      signal({ kind: 'date', label: 'Start date' }),
      '07/15/2026',
      null,
      'x.com',
    )
    expect(p).toMatchObject({ value: '2026-07-15' })
  })

  it('recognizes DD/MM typed dates (first component > 12) and swaps', () => {
    const p = prepareCaptureValue(
      signal({ kind: 'text', label: 'Available start date' }),
      '15/07/2026',
      null,
      'x.com',
    )
    expect(p).toMatchObject({ value: '2026-07-15' })
  })

  it('skips truly ambiguous DD/MM dates rather than guessing', () => {
    const p = prepareCaptureValue(
      signal({ kind: 'date', label: 'Start date' }),
      '05/12/2025',
      null,
      'x.com',
    )
    expect(isSkippedCapture(p)).toBe(true)
  })

  it('disambiguates DD/MM against dates the profile already knows', () => {
    const profile = {
      ...defaultProfile(),
      workHistory: [
        {
          company: 'Acme',
          title: 'Dev',
          startDate: '2025-12', // known month 12 in 2025
          endDate: '',
          location: '',
          description: '',
        },
      ],
    }
    // "05/12/2025": month 5 unknown, month 12 known → read as DD/MM
    const p = prepareCaptureValue(
      signal({ kind: 'date', label: 'Start date' }),
      '05/12/2025',
      null,
      'x.com',
      profile,
    )
    expect(p).toMatchObject({ value: '2025-12-05' })
  })

  it('canonicalizes month/year to YYYY-MM', () => {
    const p = prepareCaptureValue(signal({ kind: 'date', label: 'From' }), '07/2026', null, 'x.com')
    expect(p).toMatchObject({ value: '2026-07' })
  })

  it('lets non-date text through verbatim on date-cue labels', () => {
    const p = prepareCaptureValue(
      signal({ kind: 'text', label: 'Start date flexibility' }),
      'Flexible',
      null,
      'x.com',
    )
    expect(p).toMatchObject({ value: 'Flexible', siteScope: null })
  })

  it('site-scopes page-branded answers instead of blocking them', () => {
    const p = prepareCaptureValue(
      signal({ label: 'How did you hear about us?' }),
      'mcwane.com',
      pageCtx,
      'mcwane.wd5.myworkdayjobs.com',
    )
    expect(p).toMatchObject({ value: 'mcwane.com', siteScope: 'mcwane.wd5.myworkdayjobs.com' })
  })
})

describe('crossesEeoTopic (poisoned-alias asymmetry)', () => {
  it('flags EEO ↔ non-EEO pairs in both directions', () => {
    expect(crossesEeoTopic('School or University*', 'Disability ')).toBe(true)
    expect(crossesEeoTopic('Do you identify as a protected veteran?', 'Degree*')).toBe(true)
    expect(crossesEeoTopic('Hispanic or Latino?*', 'State')).toBe(true)
  })
  it('passes same-topic pairs on either side of the line', () => {
    expect(crossesEeoTopic('Disability status', 'Do you have a disability?')).toBe(false)
    expect(crossesEeoTopic('Preferred Language for Communication*', 'State')).toBe(false)
    expect(crossesEeoTopic('Which school did you attend?', 'School or University*')).toBe(false)
  })
})

describe('canonicalizeDateCapture', () => {
  it('handles unambiguous same-component dates', () => {
    expect(canonicalizeDateCapture('05/05/2025')).toEqual({ value: '2025-05-05' })
  })
  it('returns null for non-dates', () => {
    expect(canonicalizeDateCapture('15/2026')).toBeNull()
    expect(canonicalizeDateCapture('two weeks')).toBeNull()
  })
})

// ---- two-strike demotion ----------------------------------------------------

describe('wrongVerdictAction (two-strike demotion)', () => {
  it('first wrong on a learned entry is a recorded strike', () => {
    expect(wrongVerdictAction(qa({ source: 'captured', wrongCount: 0 }))).toBe('strike')
  })
  it('second wrong demotes', () => {
    expect(wrongVerdictAction(qa({ source: 'inferred', wrongCount: 1 }))).toBe('demote')
  })
  it('curated entries never auto-demote', () => {
    expect(wrongVerdictAction(qa({ source: 'import', wrongCount: 5 }))).toBe('none')
    expect(wrongVerdictAction(qa({ source: 'training', wrongCount: 5 }))).toBe('none')
  })
  it('already-pending entries take no further action', () => {
    expect(wrongVerdictAction(qa({ source: 'captured', status: 'needs_review' }))).toBe('none')
  })
})

// ---- source-aware bar + graduation -------------------------------------------

describe('source-aware autofill bar (learned entries)', () => {
  // "how did you hear about us" has no tier-1 profile mapping — everything
  // below exercises the qa path. Fuzzy field wording scores ~0.82 vs the
  // stored question; the settings override (autoFillThreshold 0.8) makes
  // that autofill-able for curated sources while the fixed 0.95 learned bar
  // still caps captured/inferred entries.
  const stored = qa({ question: 'how did you hear about us', answer: 'LinkedIn', fieldType: 'text' })
  const exactField = signal({ normalizedQuestion: 'how did you hear about us' })
  const fuzzyField = signal({ normalizedQuestion: 'how did you hear about this position' })
  const settings = { ...defaultSettings(), autoFillThreshold: 0.8 }

  it('exact question wording autofills an approved captured entry', async () => {
    const m = await matchField(exactField, ctx({ qa: [stored] }))
    expect(m!.source).toBe('qa:q1')
    expect(m!.action).toBe('autofill')
    expect(m!.confidence).toBeGreaterThanOrEqual(CAPTURED_AUTOFILL_MIN)
  })

  it('near-neighbor wording drops a captured entry to suggest', async () => {
    const m = await matchField(fuzzyField, ctx({ qa: [stored], settings }))
    expect(m).not.toBeNull()
    expect(m!.action).toBe('suggest')
  })

  it('the same fuzzy score autofills a curated import entry', async () => {
    const m = await matchField(fuzzyField, ctx({ qa: [qa({ ...stored, source: 'import' })], settings }))
    // sanity: identical wording/scoring, only the source differs
    expect(m).not.toBeNull()
    expect(m!.action).toBe('autofill')
  })

  it('a graduated (trusted) captured entry earns normal thresholds back', async () => {
    const m = await matchField(
      fuzzyField,
      ctx({ qa: [qa({ ...stored, okCount: TRUSTED_OK_COUNT, wrongCount: 0 })], settings }),
    )
    expect(m!.action).toBe('autofill')
  })

  it('wrongCount cancels graduation', async () => {
    const m = await matchField(
      fuzzyField,
      ctx({ qa: [qa({ ...stored, okCount: TRUSTED_OK_COUNT, wrongCount: 1 })], settings }),
    )
    expect(m!.action).toBe('suggest')
  })
})

// ---- site scoping -------------------------------------------------------------

describe('siteScope', () => {
  it('scoped entries match on their own host', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'notice period' }),
      ctx({ qa: [qa({ siteScope: 'mcwane.wd5.myworkdayjobs.com' })], hostname: 'mcwane.wd5.myworkdayjobs.com' }),
    )
    expect(m).not.toBeNull()
  })

  it('scoped entries never even suggest on foreign hosts', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'notice period' }),
      ctx({ qa: [qa({ siteScope: 'mcwane.wd5.myworkdayjobs.com' })], hostname: 'jobs.lever.co' }),
    )
    expect(m).toBeNull()
  })
})

// ---- qualifier guard -----------------------------------------------------------

describe('qualifier guard', () => {
  it('detects conflicting qualifiers', () => {
    expect(conflictingQualifiers('Current salary', 'Desired salary')).toBe(true)
    expect(conflictingQualifiers('What is your expected base salary?', 'current base salary')).toBe(true)
    expect(conflictingQualifiers('Employment start date', 'Employment end date')).toBe(true)
  })

  it('same or absent qualifiers do not conflict', () => {
    expect(conflictingQualifiers('Desired salary', 'Expected salary')).toBe(false)
    expect(conflictingQualifiers('Notice period', 'Notice period')).toBe(false)
  })

  it('caps a near-neighbor trap to suggest even for curated entries', async () => {
    const m = await matchField(
      signal({
        label: 'Current base salary',
        normalizedQuestion: 'current base salary',
      }),
      ctx({ qa: [qa({ source: 'import', question: 'desire base salary', aliases: ['Desired base salary'], answer: '$120,000' })] }),
    )
    expect(m).not.toBeNull()
    expect(m!.action).toBe('suggest')
  })
})

// ---- semantic layer (offline fakes) ---------------------------------------------

/** Fake similarity: exact table lookups, else 0.1. */
function fakeSim(table: Record<string, number>) {
  return async (a: string, b: string) => {
    const key = `${a.toLowerCase()}|${b.toLowerCase()}`
    const rev = `${b.toLowerCase()}|${a.toLowerCase()}`
    return table[key] ?? table[rev] ?? 0.1
  }
}

describe('semantic bar assist (embeddings)', () => {
  const field = signal({
    label: 'Where did you first learn about this opening?',
    normalizedQuestion: 'where did you first learn about this opening',
  })
  const entry = qa({
    question: 'how did you hear about us',
    answer: 'LinkedIn',
    source: 'captured',
    fieldType: 'text',
  })

  it('paraphrase with high cosine + margin lifts the bar to autofill', async () => {
    setSemanticSimilarity(
      fakeSim({
        'where did you first learn about this opening?|how did you hear about us': 0.94,
      }),
    )
    const m = await matchField(field, ctx({ qa: [entry] }))
    expect(m).not.toBeNull()
    expect(m!.source).toBe('qa:q1')
    expect(m!.action).toBe('autofill')
  })

  it('ambiguous semantic neighborhood (no margin) stays suggest', async () => {
    const rival = qa({
      id: 'q2',
      question: 'how did you hear about our products',
      answer: 'A friend',
    })
    setSemanticSimilarity(
      fakeSim({
        'where did you first learn about this opening?|how did you hear about us': 0.94,
        'where did you first learn about this opening?|how did you hear about our products': 0.9,
      }),
    )
    const m = await matchField(field, ctx({ qa: [entry, rival] }))
    expect(m).not.toBeNull()
    expect(m!.action).toBe('suggest')
  })

  it('qualifier conflict beats a high cosine (the near-neighbor trap)', async () => {
    setSemanticSimilarity(fakeSim({ 'current base salary|desire base salary': 0.97 }))
    const m = await matchField(
      signal({ label: 'Current base salary', normalizedQuestion: 'current base salary' }),
      ctx({ qa: [qa({ question: 'desire base salary', aliases: ['Desired base salary'], answer: '$120,000' })] }),
    )
    expect(m).not.toBeNull()
    expect(m!.action).toBe('suggest')
  })
})

describe('semanticChooseOption embedding tier', () => {
  it('places a reworded degree on its option without a judge', async () => {
    setSemanticSimilarity(
      fakeSim({ "bachelor's degree|bs — bachelor of science": 0.81 }),
    )
    const choice = await semanticChooseOption(
      [
        { value: '1', text: 'High School Diploma' },
        { value: '2', text: 'BS — Bachelor of Science' },
        { value: '3', text: 'Select One' },
      ],
      "Bachelor's Degree",
    )
    expect(choice).not.toBeNull()
    expect(choice!.index).toBe(1)
    expect(choice!.score).toBeGreaterThanOrEqual(0.7)
  })

  it('respects the polarity veto in the embedding tier', async () => {
    setSemanticSimilarity(fakeSim({ 'yes|no, i am not authorized': 0.99 }))
    const choice = await semanticChooseOption(
      [
        { value: 'n', text: 'No, I am not authorized' },
        { value: 'y', text: 'Yes, I am authorized' },
      ],
      'Yes',
    )
    // the veto skips the negate option however similar; the affirm option
    // scores 0.1 (< EMBED_OPTION_MIN) so the embedding tier declines
    expect(choice).toBeNull()
  })

  it('declines without margin between two close options', async () => {
    setSemanticSimilarity(
      fakeSim({
        'texas|texas region': 0.8,
        'texas|texas city': 0.78,
      }),
    )
    const choice = await semanticChooseOption(
      [
        { value: '1', text: 'Texas region' },
        { value: '2', text: 'Texas city' },
      ],
      'Texas',
    )
    expect(choice).toBeNull()
  })
})

// ---- option-equivalence distillation ---------------------------------------------

describe('recordOptionEquivalence (distillation)', () => {
  let n = 0
  const nextId = () => `set-${++n}`

  it('creates a new auto set for a novel pair', () => {
    const set = recordOptionEquivalence([], "Bachelor's Degree", 'BS — Bachelor of Science', nextId)
    expect(set).not.toBeNull()
    expect(set!.options).toEqual(["Bachelor's Degree", 'BS — Bachelor of Science'])
  })

  it('grows an existing set containing one side', () => {
    const existing = { id: 's1', label: 'degrees', options: ["Bachelor's Degree", 'BA'] }
    const set = recordOptionEquivalence([existing], "Bachelor's Degree", 'BS', nextId)
    expect(set!.id).toBe('s1')
    expect(set!.options).toContain('BS')
  })

  it('returns null when the pair is already covered or identical', () => {
    const existing = { id: 's1', label: 'degrees', options: ["Bachelor's Degree", 'BS'] }
    expect(recordOptionEquivalence([existing], "Bachelor's Degree", 'BS', nextId)).toBeNull()
    expect(recordOptionEquivalence([], 'Yes', 'yes', nextId)).toBeNull()
  })

  it('the distilled set then places the answer at equivalence score', () => {
    const set = recordOptionEquivalence([], "Bachelor's Degree", 'BS — Bachelor of Science', nextId)!
    const choice = chooseOption(
      [
        { value: '1', text: 'High School Diploma' },
        { value: '2', text: 'BS — Bachelor of Science' },
      ],
      "Bachelor's Degree",
      [set],
    )
    expect(choice).not.toBeNull()
    expect(choice!.index).toBe(1)
    expect(choice!.score).toBeGreaterThanOrEqual(0.9)
  })
})

// ---- review-gate factories -------------------------------------------------------

describe('capture factories (review gate)', () => {
  it('drafts carry the label cascade runner-ups as aliases', () => {
    const draft = buildCaptureDraft(
      signal({
        label: 'Years of experience',
        normalizedQuestion: 'years experience',
        labelAliases: ['Python', 'Skill'],
      }),
      '5',
      { company: null, role: null, location: null, source: 'none' },
      1,
    )
    expect(draft.aliases).toEqual(['Years of experience', 'Python', 'Skill'])
    expect(draft.status).toBe('needs_review')
  })
})
