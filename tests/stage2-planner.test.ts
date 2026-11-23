import { beforeEach, describe, expect, it } from 'vitest'
import type {
  CensusEntry,
  PlanEntry,
  PlannerBrief,
  Profile,
  QAEntry,
  SignalBundle,
} from '@/types'
import type { FieldValidation } from '@/content/validate'
import {
  PLAN_CONFIDENCE_FLOOR,
  PLANNER_SYSTEM_PROMPT,
  STANCES,
  buildEeoStored,
  buildProfileFacts,
  buildRepairItems,
  censusEntry,
  classifyStanceTopic,
  deriveLifeState,
  eeoStoredAnswerFor,
  eeoValueMatches,
  extractPlanJson,
  isCurrentEmployerQuestion,
  looseValueMatch,
  neighborLabels,
  planEntryToMatch,
  plannerUserPrompt,
  selectPlanTargets,
  selectRelevantQA,
  validatePlan,
  valueContainsWord,
} from '@/lib/planner'
import { defaultProfile, defaultSettings, defaultStore } from '@/lib/schema'
import {
  getStore,
  importData,
  redactForExport,
  runMigrations,
  setStore,
} from '@/lib/storage'
import { resetChromeMock } from './setup'

// ---------------------------------------------------------------------------
// Stage 2 (LLM-first filling): the pure planner layer — census, brief,
// plan parsing, and the §5 guardrails. The model proposes; THESE tests pin
// that code decides.
// ---------------------------------------------------------------------------

const mkValidation = (over: Partial<FieldValidation> = {}): FieldValidation => ({
  fieldId: 'ff-1',
  label: 'Question',
  kind: 'text',
  verdict: 'missing-unanswered',
  required: false,
  normalizedQuestion: 'question',
  options: [],
  sectionContext: '',
  eeoLike: false,
  consentLike: false,
  ...over,
})

const mkSignal = (over: Partial<SignalBundle> = {}): SignalBundle => ({
  fieldId: 'ff-1',
  kind: 'text',
  label: 'Question',
  placeholder: '',
  autocomplete: '',
  name: '',
  id: '',
  dataAttrs: [],
  required: false,
  options: [],
  sectionContext: '',
  multiplicityCue: false,
  normalizedQuestion: 'question',
  rawText: '',
  filled: false,
  consentLike: false,
  eeoLike: false,
  ...over,
})

const mkQA = (over: Partial<QAEntry> = {}): QAEntry => ({
  id: 'q1',
  question: 'Notice period',
  aliases: [],
  answer: '2 weeks',
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
  siteScope: null,
  reviewNote: '',
  lastWrongAt: null,
  okCount: 0,
  wrongCount: 0,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

/** Unemployed graduate profile — all employments ended (MPI most recent). */
function unemployedProfile(): Profile {
  const p = defaultProfile()
  p.firstName = 'Ada'
  p.lastName = 'Candidate'
  p.email = 'ada@example.com'
  p.accountPassword = 'hunter2-secret'
  p.desiredSalary = '85000'
  p.eeo = { gender: 'Male', ethnicity: 'Asian', veteranStatus: '', disabilityStatus: 'No' }
  p.workHistory = [
    { company: 'MPI — McWane Plant & Industrial', title: 'Operations Engineer', startDate: '2025-03', endDate: '2026-05', location: 'Houston, TX', description: 'ops' },
    { company: 'Anugraha Valve Castings', title: 'Operations Engineer', startDate: '2021-01', endDate: '2023-01', location: 'Coimbatore', description: 'foundry' },
  ]
  return p
}

const mkCensus = (
  vOver: Partial<FieldValidation>,
  sOver?: Partial<SignalBundle> | null,
  neighbors: string[] = [],
  currentValue = '',
): CensusEntry =>
  censusEntry(
    mkValidation(vOver),
    // The signal mirrors the validation identity unless a test overrides it —
    // censusEntry prefers signal fields, so a default 'Question' label here
    // would silently mask the label the test cares about.
    sOver === null
      ? undefined
      : mkSignal({
          fieldId: vOver.fieldId ?? 'ff-1',
          label: vOver.label ?? 'Question',
          kind: vOver.kind ?? 'text',
          eeoLike: vOver.eeoLike ?? false,
          sectionIndex: vOver.sectionIndex,
          ...sOver,
        }),
    neighbors,
    currentValue,
  )

const mkBrief = (fields: CensusEntry[], over: Partial<PlannerBrief> = {}): PlannerBrief => {
  const profile = unemployedProfile()
  return {
    page: { company: 'Acme', role: 'Operations Engineer', hostname: 'jobs.acme.com' },
    fields,
    profileFacts: buildProfileFacts(profile),
    lifeState: deriveLifeState(profile),
    stances: STANCES,
    eeoStored: {},
    candidates: [],
    overflow: 0,
    ...over,
  }
}

const fill = (over: Partial<PlanEntry> = {}): PlanEntry => ({
  fieldId: 'ff-1',
  action: 'fill',
  value: 'x',
  source: 'profile:firstName',
  confidence: 0.95,
  ...over,
})

// ---- Life state & policies ---------------------------------------------------

describe('deriveLifeState', () => {
  it('all employments ended → unemployed, last employer = most recent end date', () => {
    const state = deriveLifeState(unemployedProfile())
    expect(state.currentlyEmployed).toBe(false)
    expect(state.currentEmployer).toBeNull()
    expect(state.lastEmployer).toBe('MPI — McWane Plant & Industrial')
    expect(state.lastEndDate).toBe('2026-05')
  })

  it('an empty or "Present" end date means currently employed there', () => {
    const p = unemployedProfile()
    p.workHistory[0].endDate = ''
    expect(deriveLifeState(p)).toMatchObject({
      currentlyEmployed: true,
      currentEmployer: 'MPI — McWane Plant & Industrial',
    })
    p.workHistory[0].endDate = 'Present'
    expect(deriveLifeState(p).currentlyEmployed).toBe(true)
  })
})

describe('isCurrentEmployerQuestion', () => {
  it('matches current/present employer wordings only', () => {
    expect(isCurrentEmployerQuestion('Current Employer')).toBe(true)
    expect(isCurrentEmployerQuestion('Who is your present company?')).toBe(true)
    expect(isCurrentEmployerQuestion('Most Recent Employer')).toBe(false)
    expect(isCurrentEmployerQuestion('Employer')).toBe(false)
    expect(isCurrentEmployerQuestion('Current location')).toBe(false)
  })
})

describe('classifyStanceTopic', () => {
  it('classifies the stance-table topics', () => {
    expect(classifyStanceTopic('Have you ever served in the U.S. military?')).toBe('military-service')
    expect(classifyStanceTopic('Are you a veteran?')).toBe('military-service')
    expect(classifyStanceTopic('Are you now or have you ever been a government employee?')).toBe('government-employment')
    expect(classifyStanceTopic('Do you receive social security benefits?')).toBe('social-security-income')
    expect(classifyStanceTopic('Are you subject to a non-compete agreement?')).toBe('non-compete')
    expect(classifyStanceTopic('Are you bondable?')).toBe('bondable')
  })

  it('an SSN *number* field is data entry, not a stance', () => {
    expect(classifyStanceTopic('Social Security Number')).toBeNull()
    expect(classifyStanceTopic('What is your SSN?')).toBeNull()
  })
})

// ---- Target selection --------------------------------------------------------

describe('selectPlanTargets', () => {
  const eeoGate = (v: FieldValidation) => (v.label.includes('Gender') ? 'Male' : null)

  it('takes missing fields, keeps EEO only when a stored value exists, never consent/file/password', () => {
    const report: FieldValidation[] = [
      mkValidation({ fieldId: 'a', verdict: 'missing-answerable' }),
      mkValidation({ fieldId: 'b', verdict: 'missing-unanswered', kind: 'select' }),
      mkValidation({ fieldId: 'c', verdict: 'ok' }),
      mkValidation({ fieldId: 'd', consentLike: true }),
      mkValidation({ fieldId: 'e', kind: 'file' }),
      mkValidation({ fieldId: 'f', kind: 'password' }),
      mkValidation({ fieldId: 'g', eeoLike: true, label: 'Gender' }),
      mkValidation({ fieldId: 'h', eeoLike: true, label: 'Sexual orientation' }),
    ]
    const { targets, skipped, overflow } = selectPlanTargets(report, eeoGate)
    expect(targets.map((t) => t.fieldId)).toEqual(['a', 'b', 'g'])
    expect(skipped.map((s) => `${s.entry.fieldId}:${s.why}`)).toEqual([
      'd:consent',
      'e:file',
      'f:password',
      'h:eeo-unstored',
    ])
    expect(overflow).toBe(0)
  })

  it('caps at max and reports the overflow honestly', () => {
    const report = ['a', 'b', 'c'].map((fieldId) => mkValidation({ fieldId }))
    const { targets, overflow } = selectPlanTargets(report, () => null, 2)
    expect(targets).toHaveLength(2)
    expect(overflow).toBe(1)
  })
})

// ---- Census -----------------------------------------------------------------

describe('censusEntry / neighborLabels', () => {
  it('marks option lists complete for selects but never for custom dropdowns', () => {
    const select = mkCensus(
      { fieldId: 's', kind: 'select' },
      { kind: 'select', options: [{ value: '1', text: 'Mr.' }] },
    )
    expect(select.optionsVisible).toEqual(['Mr.'])
    expect(select.optionsComplete).toBe(true)
    const dropdown = mkCensus(
      { fieldId: 'd', kind: 'custom-dropdown' },
      { kind: 'custom-dropdown', options: [{ value: '', text: 'Stale' }] },
    )
    expect(dropdown.optionsComplete).toBe(false)
    const text = mkCensus({ fieldId: 't' }, {})
    expect(text.optionsComplete).toBe(false)
  })

  it('collects neighbor labels from the same section only, capped, without self', () => {
    const me = mkSignal({ fieldId: 'me', sectionContext: 'Personal', label: 'Title' })
    const all = [
      me,
      mkSignal({ fieldId: 'n1', sectionContext: 'Personal', label: 'First Name' }),
      mkSignal({ fieldId: 'n2', sectionContext: 'Personal', label: 'Last Name' }),
      mkSignal({ fieldId: 'x', sectionContext: 'Experience', label: 'Company' }),
      mkSignal({ fieldId: 'n3', sectionContext: 'Personal', sectionIndex: 1, label: 'Other block' }),
    ]
    expect(neighborLabels(me, all)).toEqual(['First Name', 'Last Name'])
    expect(neighborLabels(me, all, 1)).toEqual(['First Name'])
  })
})

// ---- Brief safety ------------------------------------------------------------

describe('buildProfileFacts', () => {
  it('never carries the account password, EEO answers, or pronouns', () => {
    const p = unemployedProfile()
    p.pronouns = 'he/him'
    const facts = JSON.stringify(buildProfileFacts(p))
    expect(facts).not.toContain('hunter2-secret')
    expect(facts).not.toContain('accountPassword')
    expect(facts).not.toContain('"eeo"')
    expect(facts).not.toContain('he/him')
    expect(facts).toContain('MPI — McWane Plant & Industrial')
  })

  it('renders booleans as Yes/No so profile:<path> sources trace textually', () => {
    const facts = buildProfileFacts(unemployedProfile())
    expect(facts.authorizedToWork).toBe('Yes')
    expect(facts.requiresSponsorship).toBe('No')
  })
})

describe('buildEeoStored / eeoStoredAnswerFor', () => {
  const profile = unemployedProfile()

  it('collects profile EEO values plus active EEO-topic qa entries', () => {
    const qa = [
      mkQA({ id: 'e1', question: 'disability', answer: 'No' }),
      mkQA({ id: 'e2', question: 'disability status detail', answer: 'No', status: 'needs_review' }),
      mkQA({ id: 'e3', question: 'Website', answer: 'example.com' }),
    ]
    const stored = buildEeoStored(profile, qa)
    expect(stored).toMatchObject({ gender: 'Male', ethnicity: 'Asian', disabilityStatus: 'No', disability: 'No' })
    expect(stored).not.toHaveProperty('veteranStatus')
    expect(stored).not.toHaveProperty('website')
  })

  it('answers EEO questions from the right stored key', () => {
    const stored = buildEeoStored(profile, [])
    expect(eeoStoredAnswerFor('What is your gender?', stored)).toBe('Male')
    expect(eeoStoredAnswerFor('Race/Ethnicity', stored)).toBe('Asian')
    expect(eeoStoredAnswerFor('Please select your race', stored)).toBe('Asian')
    expect(eeoStoredAnswerFor('Do you have a disability?', stored)).toBe('No')
  })

  it('never bridges topics: an orientation question cannot take the gender value', () => {
    const stored = buildEeoStored(profile, [])
    expect(eeoStoredAnswerFor('What is your sexual orientation?', stored)).toBeNull()
  })

  it('falls back to a qa-keyed stored answer when the profile key is empty', () => {
    const p = unemployedProfile()
    p.eeo.disabilityStatus = ''
    const stored = buildEeoStored(p, [mkQA({ id: 'e1', question: 'disability', answer: 'No' })])
    expect(eeoStoredAnswerFor('Do you have a disability? Form CC-305', stored)).toBe('No')
  })
})

// ---- Candidates --------------------------------------------------------------

describe('selectRelevantQA', () => {
  it('ranks by relevance and excludes notify, EEO-topic, and foreign-scoped entries', () => {
    const qa = [
      mkQA({ id: 'n', question: 'Notice period', answer: '2 weeks' }),
      mkQA({ id: 'h', question: 'How did you hear about us', answer: 'LinkedIn' }),
      mkQA({ id: 'g', question: 'Gender identity', answer: 'Male' }),
      mkQA({ id: 'notify', question: 'Notice period guidance', answerType: 'notify' }),
      mkQA({ id: 'scoped', question: 'Notice period at mcwane', siteScope: 'mcwane.com' }),
    ]
    const picked = selectRelevantQA(qa, ['What is your notice period?'], 'jobs.acme.com')
    expect(picked[0]?.id).toBe('n')
    const ids = picked.map((e) => e.id)
    expect(ids).not.toContain('g')
    expect(ids).not.toContain('notify')
    expect(ids).not.toContain('scoped')
  })

  it('site-scoped entries surface on their own site', () => {
    const qa = [mkQA({ id: 'scoped', question: 'Employee ID', answer: '42', siteScope: 'mcwane.com' })]
    expect(selectRelevantQA(qa, ['Employee ID'], 'careers.mcwane.com').map((e) => e.id)).toEqual(['scoped'])
  })
})

// ---- Value tracing -----------------------------------------------------------

describe('value tracing', () => {
  it('word-boundary containment: "Female" never contains "Male"', () => {
    expect(valueContainsWord('Female', 'Male')).toBe(false)
    expect(valueContainsWord('Asian (Not Hispanic or Latino)', 'Asian')).toBe(true)
  })

  it('eeoValueMatches: composites and long-form polarity yes; cross-values no', () => {
    expect(eeoValueMatches('Asian', 'Asian (Not Hispanic or Latino)')).toBe(true)
    expect(eeoValueMatches('No', 'No, I do not have a disability and have not had one in the past')).toBe(true)
    expect(eeoValueMatches('Male', 'Male')).toBe(true)
    expect(eeoValueMatches('Male', 'Female')).toBe(false)
    expect(eeoValueMatches('Asian', 'White (Not Hispanic or Latino)')).toBe(false)
    // 2026-09-16 audit: a NEGATED composite is the opposite of the stored value, not a match
    expect(eeoValueMatches('Hispanic or Latino', 'White (Not Hispanic or Latino)')).toBe(false)
    expect(eeoValueMatches('Hispanic or Latino', 'Two or More Races (Not Hispanic or Latino)')).toBe(false)
    expect(eeoValueMatches('Hispanic or Latino', 'Hispanic or Latino')).toBe(true)
  })

  it('looseValueMatch: equality/containment/polarity pass, unrelated values fail', () => {
    expect(looseValueMatch('2 weeks', '2 Weeks')).toBe(true)
    expect(looseValueMatch('MPI — McWane Plant & Industrial', 'MPI')).toBe(true)
    expect(looseValueMatch('No', 'No, never')).toBe(true)
    expect(looseValueMatch('Ada', 'Alice')).toBe(false)
    expect(looseValueMatch('Male', 'Female')).toBe(false)
  })
})

// ---- Plan parsing ------------------------------------------------------------

describe('extractPlanJson', () => {
  it('parses clean, fenced, and bare-array replies with action aliases', () => {
    const clean = extractPlanJson('{"fills":[{"fieldId":"a","action":"fill","value":"x"}]}')
    expect(clean).toHaveLength(1)
    const fenced = extractPlanJson('Here you go:\n```json\n{"fills":[{"fieldId":"a","action":"select","value":"x"}]}\n```')
    expect(fenced?.[0]).toMatchObject({ fieldId: 'a', action: 'fill' })
    const bare = extractPlanJson('[{"field_id":"b","action":"human","reason":"unclear"}]')
    expect(bare?.[0]).toMatchObject({ fieldId: 'b', action: 'needs_human' })
  })

  it('normalizes values and clamps confidence', () => {
    const plan = extractPlanJson(
      '{"fills":[{"fieldId":"a","action":"type","value":85000,"confidence":"0.9"},{"fieldId":"b","action":"fill","value":"x","confidence":7}]}',
    )
    expect(plan?.[0]).toMatchObject({ value: '85000', confidence: 0.9 })
    expect(plan?.[1]?.confidence).toBe(1)
  })

  it('returns null on garbage, empty lists, and entries without ids/actions', () => {
    expect(extractPlanJson('Sorry, I cannot help with that.')).toBeNull()
    expect(extractPlanJson('{"fills":[]}')).toBeNull()
    expect(extractPlanJson('{"fills":[{"action":"fill","value":"x"}]}')).toBeNull()
    expect(extractPlanJson(null)).toBeNull()
  })
})

// ---- §5 guardrails -----------------------------------------------------------

describe('validatePlan — guardrails', () => {
  it('rejects unknown fieldIds, missing values/sources, and duplicates', () => {
    const brief = mkBrief([
      mkCensus({ fieldId: 'ff-1', label: 'First Name' }),
      mkCensus({ fieldId: 'f2', label: 'Middle Name' }),
      mkCensus({ fieldId: 'f3', label: 'Preferred Name' }),
    ])
    const { accepted, rejected } = validatePlan(
      [
        fill({ fieldId: 'ghost' }),
        fill({ fieldId: 'f2', value: '' }),
        fill({ fieldId: 'f3', value: 'Ada', source: undefined }),
        fill({ fieldId: 'ff-1', value: 'Ada', source: 'profile:firstName' }),
        fill({ fieldId: 'ff-1', value: 'Ada', source: 'profile:firstName' }),
      ],
      brief,
    )
    expect(rejected.map((r) => r.why)).toEqual([
      'unknown fieldId',
      'no value',
      'no source cited',
      'duplicate fieldId',
    ])
    expect(accepted).toHaveLength(1)
  })

  it('a fill must trace to its cited source — invented values die', () => {
    const brief = mkBrief([mkCensus({ fieldId: 'ff-1', label: 'First Name' })])
    const bad = validatePlan([fill({ value: 'Alice', source: 'profile:firstName' })], brief)
    expect(bad.rejected[0]?.why).toContain('does not trace')
    const good = validatePlan([fill({ value: 'Ada', source: 'profile:firstName' })], brief)
    expect(good.accepted).toHaveLength(1)
    const ghostPath = validatePlan([fill({ value: 'x', source: 'profile:accountPassword' })], brief)
    expect(ghostPath.rejected[0]?.why).toContain('resolves to nothing')
  })

  it('qa sources trace against answer and fallbacks', () => {
    const brief = mkBrief([mkCensus({ fieldId: 'ff-1', label: 'Field of study' })], {
      candidates: [{ id: 'q9', question: 'Field of study', answer: 'Industrial Engineering', fallbacks: ['Engineering'] }],
    })
    expect(validatePlan([fill({ value: 'Engineering', source: 'qa:q9' })], brief).accepted).toHaveLength(1)
    expect(validatePlan([fill({ value: 'Physics', source: 'qa:q9' })], brief).rejected).toHaveLength(1)
  })

  it('places a verbatim value on its exact option, never on the first loose sibling (2026-09-16 audit)', () => {
    // graded lists share tokens ('years', 'Degree'): a loose first hit put '3-5 years' on '1-3 years'
    const opts = (texts: string[]) => texts.map((text, i) => ({ value: String(i), text }))
    const years = mkBrief(
      [mkCensus({ fieldId: 'y', kind: 'select', label: 'Years of experience' }, { kind: 'select', options: opts(['0-1 years', '1-3 years', '3-5 years', '5+ years']) })],
      { candidates: [{ id: 'q1', question: 'Years of experience', answer: '3-5 years', fallbacks: [] }] },
    )
    const y = validatePlan([fill({ fieldId: 'y', value: '3-5 years', source: 'qa:q1' })], years)
    expect(y.rejected).toHaveLength(0)
    expect(y.accepted[0]?.matchedOption).toBe('3-5 years')
    const degrees = mkBrief(
      [mkCensus({ fieldId: 'd', kind: 'select', label: 'Highest degree' }, { kind: 'select', options: opts(['High School', "Associate's Degree", "Bachelor's Degree", "Master's Degree", 'Doctorate']) })],
      { candidates: [{ id: 'q2', question: 'Highest degree', answer: "Master's Degree", fallbacks: [] }] },
    )
    expect(validatePlan([fill({ fieldId: 'd', value: "Master's Degree", source: 'qa:q2' })], degrees).accepted[0]?.matchedOption).toBe("Master's Degree")
  })

  it('EEO fields take stored values only — wrong value, wrong source, or leak direction all die', () => {
    const gender = mkCensus(
      { fieldId: 'g', label: 'Gender', eeoLike: true, kind: 'select' },
      { kind: 'select', eeoLike: true, options: [{ value: '1', text: 'Male' }, { value: '2', text: 'Female' }] },
    )
    const brief = mkBrief([gender, mkCensus({ fieldId: 'ff-1', label: 'Nickname' })], {
      eeoStored: { gender: 'Male' },
      candidates: [{ id: 'q1', question: 'Gender', answer: 'Female' }],
    })
    const ok = validatePlan([fill({ fieldId: 'g', value: 'Male', source: 'eeo:gender' })], brief)
    expect(ok.accepted[0]?.matchedOption).toBe('Male')
    expect(validatePlan([fill({ fieldId: 'g', value: 'Female', source: 'eeo:gender' })], brief).rejected[0]?.why).toContain('does not match stored')
    expect(validatePlan([fill({ fieldId: 'g', value: 'Female', source: 'qa:q1' })], brief).rejected[0]?.why).toContain('eeo:<key> source')
    expect(validatePlan([fill({ fieldId: 'ff-1', value: 'Male', source: 'eeo:gender' })], brief).rejected[0]?.why).toContain('non-EEO field')
  })

  it('maps a stored disability "No" onto the CC-305 long-form option', () => {
    const longForm = 'No, I do not have a disability and have not had one in the past'
    const disability = mkCensus(
      { fieldId: 'd', label: 'Disability Status', eeoLike: true, kind: 'radio' },
      { kind: 'radio', eeoLike: true, options: [
        { value: '', text: 'Yes, I have a disability, or have had one in the past' },
        { value: '', text: longForm },
        { value: '', text: 'I do not want to answer' },
      ] },
    )
    const brief = mkBrief([disability], { eeoStored: { disabilityStatus: 'No' } })
    const { accepted } = validatePlan(
      [fill({ fieldId: 'd', value: longForm, source: 'eeo:disabilityStatus' })],
      brief,
    )
    expect(accepted[0]?.matchedOption).toBe(longForm)
  })

  it('stances bind whatever source is cited — a military Yes dies even when it traces', () => {
    const brief = mkBrief([mkCensus({ fieldId: 'm', label: 'Have you ever served in the military?' })], {
      candidates: [{ id: 'qm', question: 'Military service', answer: 'Yes' }],
    })
    expect(validatePlan([fill({ fieldId: 'm', value: 'Yes', source: 'qa:qm' })], brief).rejected[0]?.why).toContain('stance')
    const viaStance = validatePlan([fill({ fieldId: 'm', value: 'No', source: 'stance:military-service' })], brief)
    expect(viaStance.accepted).toHaveLength(1)
    expect(
      validatePlan([fill({ fieldId: 'm', value: 'Yes', source: 'stance:military-service' })], brief).rejected[0]?.why,
    ).toContain('does not express')
  })

  it('current employer while unemployed must be N/A — a past employer dies even when it traces', () => {
    const brief = mkBrief([mkCensus({ fieldId: 'ce', label: 'Current Employer' })])
    expect(
      validatePlan(
        [fill({ fieldId: 'ce', value: 'MPI — McWane Plant & Industrial', source: 'profile:workHistory.0.company' })],
        brief,
      ).rejected[0]?.why,
    ).toContain('N/A')
    const ok = validatePlan([fill({ fieldId: 'ce', value: 'N/A', source: 'policy:current-employer' })], brief)
    expect(ok.accepted).toHaveLength(1)
  })

  it('work-history Company fields keep real history (sectionKind exempts the policy)', () => {
    const historyCompany = mkCensus(
      { fieldId: 'wh', label: 'Company', sectionIndex: 0 },
      { sectionKind: 'work', sectionIndex: 0 },
    )
    const brief = mkBrief([historyCompany])
    const { accepted } = validatePlan(
      [fill({ fieldId: 'wh', value: 'MPI — McWane Plant & Industrial', source: 'profile:workHistory.0.company' })],
      brief,
    )
    expect(accepted).toHaveLength(1)
  })

  it('complete option lists are membership-checked; placeholders never win', () => {
    const select = mkCensus(
      { fieldId: 's', label: 'Title', kind: 'select' },
      { kind: 'select', options: [
        { value: '', text: 'Select One' },
        { value: 'mr', text: 'Mr.' },
        { value: 'ms', text: 'Ms.' },
      ] },
    )
    const brief = mkBrief([select], { candidates: [{ id: 'qt', question: 'Title', answer: 'Mr.' }] })
    const ok = validatePlan([fill({ fieldId: 's', value: 'Mr.', source: 'qa:qt' })], brief)
    expect(ok.accepted[0]?.matchedOption).toBe('Mr.')
    expect(
      validatePlan([fill({ fieldId: 's', value: 'Mr.', source: 'qa:qt', confidence: 0.9 })], {
        ...brief,
        fields: [{ ...select, optionsVisible: ['Select One', 'Dr.'], optionsComplete: true }],
      }).rejected[0]?.why,
    ).toContain('no visible option')
  })

  it('demotes to suggestion: draft sources, low confidence, and non-stored essays', () => {
    const essay = mkCensus({ fieldId: 'e', label: 'Why do you want to work here?', kind: 'textarea' }, { kind: 'textarea' })
    const text = mkCensus({ fieldId: 'ff-1', label: 'First Name' })
    const brief = mkBrief([essay, text], {
      candidates: [{ id: 'qe', question: 'Why this company', answer: 'Because of the ops culture.' }],
    })
    const drafted = validatePlan(
      [{ fieldId: 'e', action: 'fill', value: 'I admire the ops culture.', source: 'draft', confidence: 0.95 }],
      brief,
    )
    expect(drafted.accepted[0]?.demoted).toBe(true)
    const lowConf = validatePlan(
      [fill({ value: 'Ada', source: 'profile:firstName', confidence: PLAN_CONFIDENCE_FLOOR - 0.05 })],
      brief,
    )
    expect(lowConf.accepted[0]?.demoted).toBe(true)
    const storedEssay = validatePlan(
      [{ fieldId: 'e', action: 'fill', value: 'Because of the ops culture.', source: 'qa:qe', confidence: 0.9 }],
      brief,
    )
    expect(storedEssay.accepted[0]?.demoted).toBe(false)
  })

  it('passes skip and needs_human through untouched', () => {
    const brief = mkBrief([mkCensus({ fieldId: 'ff-1' })])
    const { accepted, rejected } = validatePlan(
      [{ fieldId: 'ff-1', action: 'needs_human', reason: 'asks for felony detail' }],
      brief,
    )
    expect(rejected).toHaveLength(0)
    expect(accepted[0]?.entry.action).toBe('needs_human')
  })
})

// ---- Plan → MatchResult ------------------------------------------------------

describe('planEntryToMatch', () => {
  const decisionFor = (brief: PlannerBrief, entry: PlanEntry) => {
    const { accepted } = validatePlan([entry], brief)
    expect(accepted).toHaveLength(1)
    return accepted[0]
  }

  it('selects pin the matched option value; radios place by text walk', () => {
    const selectSignal = mkSignal({
      fieldId: 's',
      kind: 'select',
      options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }],
    })
    const select = censusEntry(mkValidation({ fieldId: 's', kind: 'select', label: 'Title' }), selectSignal, [], '')
    const brief = mkBrief([select], { candidates: [{ id: 'qt', question: 'Title', answer: 'Mr.' }] })
    const match = planEntryToMatch(decisionFor(brief, fill({ fieldId: 's', value: 'Mr.', source: 'qa:qt' })), selectSignal)
    expect(match).toMatchObject({ rawAnswerTemplate: 'Mr.', chosenOptionValue: 'mr', source: 'qa:qt', action: 'autofill' })
    expect(match.provenance).toBeUndefined() // stored answer — okCount credit flows, no re-learning

    const radioSignal = mkSignal({ fieldId: 'r', kind: 'radio', options: [{ value: 'on', text: 'Yes' }, { value: 'on', text: 'No' }] })
    const radio = censusEntry(mkValidation({ fieldId: 'r', kind: 'radio', label: 'Willing to relocate?' }), radioSignal, [], '')
    const rMatch = planEntryToMatch(
      decisionFor(mkBrief([radio]), fill({ fieldId: 'r', value: 'Yes', source: 'profile:willingToRelocate' })),
      radioSignal,
    )
    expect(rMatch.rawAnswerTemplate).toBe('Yes')
    expect(rMatch.chosenOptionValue).toBeUndefined()
    expect(rMatch.provenance).toBe('inferred') // planner answer with no stored entry → learns
  })

  it('demoted decisions become suggestion matches; eeo-sourced fills never learn', () => {
    const gender = censusEntry(
      mkValidation({ fieldId: 'g', label: 'Gender', eeoLike: true, kind: 'select' }),
      mkSignal({ fieldId: 'g', kind: 'select', eeoLike: true, options: [{ value: '1', text: 'Male' }] }),
      [],
      '',
    )
    const brief = mkBrief([gender], { eeoStored: { gender: 'Male' } })
    const decision = decisionFor(brief, fill({ fieldId: 'g', value: 'Male', source: 'eeo:gender', confidence: 0.7 }))
    const match = planEntryToMatch(decision, mkSignal({ fieldId: 'g', kind: 'select', eeoLike: true, options: [{ value: '1', text: 'Male' }] }))
    expect(match.action).toBe('suggest') // 0.7 < floor → chip, Accept fills
    expect(match.provenance).toBeUndefined()
  })
})

// ---- Repair evidence ---------------------------------------------------------

describe('buildRepairItems', () => {
  it('collects only attempted fields that failed, with live options', () => {
    const report = [
      mkValidation({ fieldId: 'a', verdict: 'wrong', actual: 'Algeria', label: 'Country' }),
      mkValidation({ fieldId: 'b', verdict: 'missing-answerable' }),
      mkValidation({ fieldId: 'c', verdict: 'wrong' }),
      mkValidation({ fieldId: 'd', verdict: 'ok' }),
    ]
    const attempted = new Map([
      ['a', 'United States'],
      ['b', 'X'],
      ['d', 'fine'],
    ])
    const items = buildRepairItems(report, attempted, (id) => (id === 'a' ? ['Algeria', 'United States'] : []))
    expect(items.map((i) => i.fieldId)).toEqual(['a', 'b'])
    expect(items[0]).toMatchObject({ attempted: 'United States', observed: 'Algeria', optionsVisible: ['Algeria', 'United States'] })
  })
})

// ---- Prompts -----------------------------------------------------------------

describe('prompts', () => {
  it('system prompt pins the non-negotiables', () => {
    expect(PLANNER_SYSTEM_PROMPT).toMatch(/never submits/i)
    expect(PLANNER_SYSTEM_PROMPT).toMatch(/policy:current-employer/)
    expect(PLANNER_SYSTEM_PROMPT).toMatch(/needs_human/)
  })

  it('user prompt carries the brief; repair adds evidence and scope instruction', () => {
    const brief = mkBrief([mkCensus({ fieldId: 'ff-1' })])
    expect(plannerUserPrompt(brief)).toContain('BRIEF:')
    expect(plannerUserPrompt(brief)).not.toContain('hunter2-secret')
    const repaired = plannerUserPrompt(brief, {
      items: [{ fieldId: 'ff-1', label: 'Country', attempted: 'United States', observed: '', optionsVisible: [] }],
      previous: [fill()],
    })
    expect(repaired).toContain('REPAIR_EVIDENCE')
    expect(repaired).toContain('ONLY the fieldIds')
  })
})

// ---- Stage 2.5: the inference lane ------------------------------------------

describe('validatePlan — inference lane (Stage 2.5)', () => {
  const years = mkCensus({
    fieldId: 'y',
    label: 'How many years of experience do you have with industrial valves?',
  })
  const reasoned = (over: Partial<PlanEntry> = {}): PlanEntry => ({
    fieldId: 'y',
    action: 'fill',
    value: '4',
    source: 'inference',
    reason: 'Anugraha (valve castings, 2021–2023) + ARCI + MPI operations work',
    confidence: 0.9,
    ...over,
  })

  it('a reasoned, confident inference FILLS (that is the whole point)', () => {
    const { accepted, rejected } = validatePlan([reasoned()], mkBrief([years]))
    expect(rejected).toHaveLength(0)
    expect(accepted[0]?.demoted).toBe(false)
    expect(accepted[0]?.sourceKind).toBe('inference')
  })

  it('below the 0.85 inference floor — or with NO stated confidence — it demotes to a chip', () => {
    expect(validatePlan([reasoned({ confidence: 0.8 })], mkBrief([years])).accepted[0]?.demoted).toBe(true)
    expect(validatePlan([reasoned({ confidence: undefined })], mkBrief([years])).accepted[0]?.demoted).toBe(true)
  })

  it('inference without its reasoning is rejected — the reason is the audit trail', () => {
    expect(validatePlan([reasoned({ reason: undefined })], mkBrief([years])).rejected[0]?.why).toContain(
      'reasoning',
    )
  })

  it('inference can never touch EEO fields', () => {
    const gender = mkCensus({ fieldId: 'g', label: 'Gender', eeoLike: true })
    const { rejected } = validatePlan(
      [reasoned({ fieldId: 'g', value: 'Male' })],
      mkBrief([gender], { eeoStored: { gender: 'Male' } }),
    )
    expect(rejected[0]?.why).toContain('eeo:<key> source')
  })

  it('stances and the current-employer policy still bind inferred values', () => {
    const military = mkCensus({ fieldId: 'm', label: 'Have you served in the military?' })
    expect(
      validatePlan([reasoned({ fieldId: 'm', value: 'Yes' })], mkBrief([military])).rejected[0]?.why,
    ).toContain('stance')
    expect(
      validatePlan([reasoned({ fieldId: 'm', value: 'No' })], mkBrief([military])).accepted,
    ).toHaveLength(1)
    const employer = mkCensus({ fieldId: 'ce', label: 'Current Employer' })
    expect(
      validatePlan([reasoned({ fieldId: 'ce', value: 'MPI' })], mkBrief([employer])).rejected[0]?.why,
    ).toContain('N/A')
    expect(
      validatePlan([reasoned({ fieldId: 'ce', value: 'N/A' })], mkBrief([employer])).accepted,
    ).toHaveLength(1)
  })

  it('option membership still binds: an inferred value must land on a real option', () => {
    const select = mkCensus(
      { fieldId: 's', label: 'Are you willing to work onsite?', kind: 'select' },
      { kind: 'select', options: [{ value: '', text: 'Yes' }, { value: '', text: 'No' }] },
    )
    expect(
      validatePlan([reasoned({ fieldId: 's', value: 'Maybe' })], mkBrief([select])).rejected[0]?.why,
    ).toContain('no visible option')
    expect(
      validatePlan([reasoned({ fieldId: 's', value: 'Yes' })], mkBrief([select])).accepted[0]?.matchedOption,
    ).toBe('Yes')
  })

  it('inferred essays stay suggest-only; inferred fills learn (provenance inferred)', () => {
    const essay = mkCensus({ fieldId: 'e', label: 'Describe your interest', kind: 'textarea' }, { kind: 'textarea' })
    expect(
      validatePlan([reasoned({ fieldId: 'e', value: 'Because…', confidence: 0.95 })], mkBrief([essay]))
        .accepted[0]?.demoted,
    ).toBe(true)
    const { accepted } = validatePlan([reasoned()], mkBrief([years]))
    const match = planEntryToMatch(accepted[0], mkSignal({ fieldId: 'y' }))
    expect(match.provenance).toBe('inferred')
    expect(match.source).toBe('profile')
  })
})

describe('Stage 2.5 brief upgrades', () => {
  it('profile facts now carry trimmed work-history descriptions', () => {
    const p = unemployedProfile()
    p.workHistory[0].description = `Led daily ops. ${'x'.repeat(500)}`
    const facts = buildProfileFacts(p) as { workHistory: Array<{ description: string }> }
    expect(facts.workHistory[0].description.startsWith('Led daily ops.')).toBe(true)
    expect(facts.workHistory[0].description.length).toBeLessThanOrEqual(321) // 320 + ellipsis
    expect(facts.workHistory[0].description.endsWith('…')).toBe(true)
  })

  it('the JD excerpt rides the brief into the prompt; system prompt teaches the lane', () => {
    const brief = mkBrief([mkCensus({ fieldId: 'ff-1' })], { jd: 'Eaton seeks an operations engineer for valve assembly.' })
    expect(plannerUserPrompt(brief)).toContain('valve assembly')
    expect(PLANNER_SYSTEM_PROMPT).toContain('"inference"')
    expect(PLANNER_SYSTEM_PROMPT).toMatch(/INFERENCE LANE/i)
  })
})

// ---- Migration v10 + key hygiene --------------------------------------------

describe('migration v9 → v10 and key handling', () => {
  beforeEach(() => resetChromeMock())

  it('adds fillMode + planner defaults to a v9 store (chain runs on to v11)', () => {
    const migrated = runMigrations({ schemaVersion: 9, qa: [], settings: { autoFillThreshold: 0.85 } })
    expect(migrated.schemaVersion).toBe(11)
    const settings = migrated.settings as Record<string, unknown>
    expect(settings.fillMode).toBe('assisted')
    expect(settings.planner).toEqual({ apiKeyRef: null, model: 'claude-haiku-4-5' })
  })

  it('preserves an existing planner config through the migration', () => {
    const migrated = runMigrations({
      schemaVersion: 9,
      settings: { fillMode: 'llm-first', planner: { apiKeyRef: 'sk-ant-live', model: 'custom-model' } },
    })
    const settings = migrated.settings as Record<string, unknown>
    expect(settings.fillMode).toBe('llm-first')
    expect(settings.planner).toEqual({ apiKeyRef: 'sk-ant-live', model: 'custom-model' })
  })

  it('v10 → v11 unions eightfold.ai into enabledDomains without duplicating', () => {
    const migrated = runMigrations({
      schemaVersion: 10,
      settings: { enabledDomains: ['boards.greenhouse.io'] },
    })
    expect(migrated.schemaVersion).toBe(11)
    expect((migrated.settings as { enabledDomains: string[] }).enabledDomains).toEqual([
      'boards.greenhouse.io',
      'eightfold.ai',
    ])
    const already = runMigrations({
      schemaVersion: 10,
      settings: { enabledDomains: ['eightfold.ai'] },
    })
    expect((already.settings as { enabledDomains: string[] }).enabledDomains).toEqual(['eightfold.ai'])
    const noList = runMigrations({ schemaVersion: 10, settings: {} })
    expect(noList.schemaVersion).toBe(11)
    expect((noList.settings as Record<string, unknown>).enabledDomains).toBeUndefined()
  })

  it('fresh defaults auto-activate on eightfold tenant subdomains', () => {
    expect(defaultSettings().enabledDomains).toContain('eightfold.ai')
  })

  it('redactForExport blanks BOTH api keys and the account password, nothing else', () => {
    const store = defaultStore()
    store.settings.semanticMatching.apiKeyRef = 'sk-openai-live'
    store.settings.planner.apiKeyRef = 'sk-ant-live'
    store.settings.fillMode = 'llm-first'
    store.profile.accountPassword = 'hunter2'                  // 2026-09-16 audit: it rode in the export verbatim
    store.profile.email = 'a@example.com'
    const redacted = redactForExport(store)
    expect(redacted.settings.semanticMatching.apiKeyRef).toBe('')
    expect(redacted.settings.planner.apiKeyRef).toBe('')
    expect(redacted.settings.fillMode).toBe('llm-first')
    expect(redacted.profile.accountPassword).toBe('')
    expect(redacted.profile.email).toBe('a@example.com')
    expect(store.settings.planner.apiKeyRef).toBe('sk-ant-live') // pure — input untouched
    expect(store.profile.accountPassword).toBe('hunter2')
  })

  it('importing a redacted export keeps the live account password', async () => {
    const store = defaultStore()
    store.profile.accountPassword = 'hunter2'
    await setStore(store)
    const incoming = { ...defaultStore().profile, accountPassword: '', email: 'new@example.com' }
    await importData({ profile: incoming }, 'merge')
    const after = (await getStore()).profile
    expect(after.accountPassword).toBe('hunter2')
    expect(after.email).toBe('new@example.com')
  })

  it('importing a redacted export keeps the live Anthropic key', async () => {
    const store = defaultStore()
    store.settings.planner.apiKeyRef = 'sk-ant-live'
    await setStore(store)
    const incoming = defaultSettings()
    incoming.planner = { apiKeyRef: '', model: 'claude-haiku-4-5' }
    await importData({ settings: incoming }, 'merge')
    expect((await getStore()).settings.planner.apiKeyRef).toBe('sk-ant-live')
  })

  it('with no live key, an empty incoming ref passes through losslessly', async () => {
    await setStore(defaultStore())
    const incoming = defaultSettings()
    incoming.planner = { apiKeyRef: '', model: 'claude-haiku-4-5' }
    await importData({ settings: incoming }, 'merge')
    expect((await getStore()).settings.planner.apiKeyRef).toBe('')
  })
})
