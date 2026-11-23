import { describe, expect, it } from 'vitest'
import { answerVariants, chooseOption, matchField, type MatcherContext } from '@/content/matcher'
import { resolveVariables } from '@/content/variables'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import type { PageContext, QAEntry, SeedQuestion, SignalBundle } from '@/types'
import { readFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Live bug 2026-07-16: the Degree field in education section 2 (PSG College,
// the BACHELORS entry) selected "Masters". The seed catalog's exact "Degree"
// alias (question score 1.0) beat the section-aware tier-1 getter (0.9), and
// every tier-2 degree answer is a section-agnostic "highest degree" answer —
// i.e. the Masters. Inside an indexed section, only THAT entry's answer is
// correct; tier-2 must not win or even ride as an option-walk fallback.
// ---------------------------------------------------------------------------

const seedCatalog = JSON.parse(readFileSync('public/seed-questions.json', 'utf8'))

function signal(overrides: Partial<SignalBundle>): SignalBundle {
  return {
    fieldId: 'f1', kind: 'text', label: '', placeholder: '', autocomplete: '',
    name: '', id: '', dataAttrs: [], required: false, options: [],
    sectionContext: '', multiplicityCue: false, normalizedQuestion: '',
    rawText: '', filled: false, consentLike: false, eeoLike: false,
    ...overrides,
  }
}

const profile = {
  ...defaultProfile(),
  education: [
    { institution: 'University of Houston', degree: 'Master of Science', field: 'Industrial Engineering', startDate: '2024-01', endDate: '2026-05' },
    { institution: 'PSG College of Technology', degree: 'Bachelor of Engineering', field: 'Metallurgical Engineering', startDate: '', endDate: '2023-07' },
  ],
}

/** The user's real imported entry that carried "Masters" onto the PSG field. */
const highestEdu: QAEntry = {
  id: 'seed-highest-education',
  question: 'What is your highest level of education?',
  aliases: ['Highest degree', 'Education level', 'Highest qualification'],
  answer: "Master's",
  answerType: 'text', answerTemplate: null, mapsTo: null, variables: [],
  personas: [], tags: ['seed:highest-education', 'education'],
  fieldType: 'select', options: [], status: 'active', source: 'import',
  captureContext: null, createdAt: 0, updatedAt: 0,
  fallbacks: ["Master's degree", 'Masters', 'Master of Science', 'Graduate degree'],
}

function ctx(overrides: Partial<MatcherContext> = {}): MatcherContext {
  return {
    profile,
    qa: [highestEdu],
    seeds: seedCatalog.questions as SeedQuestion[],
    settings: defaultSettings(),
    activePersona: null,
    ...overrides,
  }
}

const DEGREE_OPTIONS = [
  { value: '1', text: 'Associates' },
  { value: '2', text: 'Bachelors' },
  { value: '3', text: 'Masters' },
  { value: '4', text: 'PhD' },
]

describe('degree inside an indexed education section', () => {
  it('SELECT in section 1 (PSG) picks Bachelors, never the "highest degree" Masters', async () => {
    const m = await matchField(
      signal({
        kind: 'select', label: 'Degree', normalizedQuestion: 'degree',
        sectionKind: 'education', sectionIndex: 1, options: DEGREE_OPTIONS,
      }),
      ctx(),
    )
    expect(m?.rawAnswerTemplate).toBe('Bachelor of Engineering')
    expect(m?.chosenOptionValue).toBe('2')
  })

  it('SELECT in section 0 (UH) still picks Masters', async () => {
    const m = await matchField(
      signal({
        kind: 'select', label: 'Degree', normalizedQuestion: 'degree',
        sectionKind: 'education', sectionIndex: 0, options: DEGREE_OPTIONS,
      }),
      ctx(),
    )
    expect(m?.chosenOptionValue).toBe('3')
  })

  it('CUSTOM-DROPDOWN in section 1 (PSG) carries the entry answer, not the index-0 seed template', async () => {
    const m = await matchField(
      signal({
        kind: 'custom-dropdown', label: 'Degree', normalizedQuestion: 'degree',
        sectionKind: 'education', sectionIndex: 1,
      }),
      ctx(),
    )
    expect(m?.rawAnswerTemplate).toBe('Bachelor of Engineering')
    expect(m?.unresolvedVars).toEqual([])
  })

  it('a global "Masters" answer never rides as an option-walk fallback when the entry answer cannot place', async () => {
    const m = await matchField(
      signal({
        kind: 'select', label: 'Degree', normalizedQuestion: 'degree',
        sectionKind: 'education', sectionIndex: 1,
        // No option matches "Bachelor of Engineering" — the walk must NOT
        // fall through to the stored "Masters" answer.
        options: [{ value: 'm', text: 'Masters' }, { value: 'p', text: 'PhD' }],
      }),
      ctx(),
    )
    expect(m?.chosenOptionValue).not.toBe('m')
  })
})

describe('degree seed template on a flat (non-section) form', () => {
  const pageContext = { company: '', role: '', location: '' } as PageContext

  it('{{education.0.degree}} resolves against the profile (prefix-less path)', () => {
    const r = resolveVariables('{{education.0.degree}} in {{education.0.field}}', {
      context: pageContext,
      profile,
    })
    expect(r.unresolved).toEqual([])
    expect(r.text).toBe('Master of Science in Industrial Engineering')
  })

  it('unknown dotted paths still report as unresolved, never fill literally', () => {
    const r = resolveVariables('{{education.9.degree}}', { context: pageContext, profile })
    expect(r.unresolved).toEqual(['education.9.degree'])
  })
})

// ---------------------------------------------------------------------------
// Live gap 2026-07-17 (Oracle CX education): the profile stores the diploma
// NAME ("Master of Science") but degree dropdowns list the LEVEL ("Master's
// Degree") — lexically ~0.48, under the 0.55 placement floor. answerVariants
// now expands degree levels the way it does states (TX ↔ Texas).
// ---------------------------------------------------------------------------

describe('degree-level answer variants', () => {
  const ORACLE_DEGREE_OPTIONS = [
    { value: 'hs', text: 'High School Diploma' },
    { value: 'as', text: "Associate's Degree" },
    { value: 'bs', text: "Bachelor's Degree" },
    { value: 'ms', text: "Master's Degree" },
    { value: 'phd', text: 'Doctorate' },
  ]

  it('"Master of Science" places on "Master\'s Degree", never the Bachelor\'s', () => {
    const choice = chooseOption(ORACLE_DEGREE_OPTIONS, 'Master of Science')
    expect(choice?.value).toBe('ms')
  })

  it('"Bachelor of Engineering" places on "Bachelor\'s Degree", never the Master\'s', () => {
    const choice = chooseOption(ORACLE_DEGREE_OPTIONS, 'Bachelor of Engineering')
    expect(choice?.value).toBe('bs')
  })

  it('level wording variants land too ("Masters" catalog, "Graduate degree" catalog)', () => {
    expect(
      chooseOption([{ value: 'b', text: 'Bachelors' }, { value: 'm', text: 'Masters' }], 'Master of Science')?.value,
    ).toBe('m')
    expect(
      chooseOption(
        [{ value: 'u', text: 'Undergraduate degree' }, { value: 'g', text: 'Graduate degree' }],
        'Master of Science',
      )?.value,
    ).toBe('g')
  })

  it('bare abbreviations trigger as the WHOLE answer only, and are never emitted', () => {
    expect(answerVariants('MS')).toContain("Master's Degree")
    expect(answerVariants('BSc')).toContain("Bachelor's Degree")
    // "MS" the state code still expands to Mississippi alongside
    expect(answerVariants('MS')).toContain('Mississippi')
    // no variant list ever emits a bare two-letter abbreviation
    expect(answerVariants('Master of Science').every((v) => v.length > 2)).toBe(true)
    // an answer merely CONTAINING "ms" never degree-expands
    expect(answerVariants('Systems Analyst')).toEqual(['Systems Analyst'])
  })

  it('geographic variants are untouched (TX ↔ Texas, dedupe keeps primary first)', () => {
    const v = answerVariants('TX')
    expect(v[0]).toBe('TX')
    expect(v).toContain('Texas')
  })
})
