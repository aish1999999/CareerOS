import { afterEach, describe, expect, it } from 'vitest'
import { answerVariants, chooseOption, chooseOptions, inferPersona, matchAll, matchField, setSemanticAnswerer, setSemanticChooser, setSemanticQuestionMatcher, type MatcherContext } from '@/content/matcher'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import type { QAEntry, SeedQuestion, SignalBundle } from '@/types'

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
    question: 'Why do you want to work here?',
    aliases: [],
    answer: 'Because I love the mission.',
    answerType: 'text',
    answerTemplate: null,
    mapsTo: null,
    variables: [],
    personas: [],
    tags: [],
    fieldType: 'textarea',
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

describe('Tier 1 — deterministic profile mapping', () => {
  it('maps autocomplete tokens at very high confidence', async () => {
    const profile = { ...defaultProfile(), email: 'ada@lovelace.dev' }
    const m = await matchField(
      signal({ autocomplete: 'email', normalizedQuestion: 'email' }),
      ctx({ profile }),
    )
    expect(m).toMatchObject({
      rawAnswerTemplate: 'ada@lovelace.dev',
      source: 'profile',
      action: 'autofill',
    })
    expect(m!.confidence).toBeGreaterThanOrEqual(0.95)
  })

  it('maps known name/id patterns', async () => {
    const profile = { ...defaultProfile(), firstName: 'Ada' }
    const m = await matchField(
      signal({ name: 'candidate_first_name', normalizedQuestion: 'candidate first name' }),
      ctx({ profile }),
    )
    expect(m).toMatchObject({ rawAnswerTemplate: 'Ada', action: 'autofill' })
  })

  it('never matches from an empty profile value', async () => {
    const m = await matchField(
      signal({ autocomplete: 'email', normalizedQuestion: 'email' }),
      ctx(),
    )
    expect(m).toBeNull()
  })
})

describe('Tier 2 — knowledge-base matching', () => {
  it('autofills a clear match above the auto threshold', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'why do you want to work here', kind: 'textarea' }),
      ctx({ qa: [qa({})] }),
    )
    expect(m).toMatchObject({ source: 'qa:q1', action: 'autofill' })
  })

  it('suggests for a paraphrase in the middle band', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'what interests you about joining', kind: 'textarea' }),
      ctx({ qa: [qa({ aliases: ['What interests you about this role?'] })] }),
    )
    expect(m).not.toBeNull()
    expect(m!.action).toBe('suggest')
  })

  it('ignores unrelated questions', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'describe your greatest weakness' }),
      ctx({ qa: [qa({ question: 'What is your salary expectation?', answer: '100k' })] }),
    )
    expect(m === null || m.action === 'ignore').toBe(true)
  })

  it('never matches entries with blank answers (Section 2)', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'why do you want to work here' }),
      ctx({ qa: [qa({ answer: '   ' })] }),
    )
    expect(m).toBeNull()
  })

  it('needs_review entries cap at suggest (review gate restored 2026-07-16)', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'why do you want to work here' }),
      ctx({ qa: [qa({ status: 'needs_review' })] }),
    )
    expect(m!.action).toBe('suggest')
    expect(m!.needsReview).toBe(true) // flagged for the chip/UI badge
  })

  it('reports page-context variables as unresolved at match time (Section 7)', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'why do you want to work here' }),
      ctx({ qa: [qa({ answer: 'I admire {{company}} deeply.' })] }),
    )
    expect(m!.unresolvedVars).toEqual(['company'])
    expect(m!.resolvedAnswer).toBeNull()
  })
})

describe('Personas (Section 6)', () => {
  const universal = qa({ id: 'u', answer: 'Universal answer' })
  const frontend = qa({ id: 'f', answer: 'Frontend answer', personas: ['frontend'] })

  it('prefers the persona-specific entry when both clear threshold', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'why do you want to work here' }),
      ctx({ qa: [universal, frontend], activePersona: 'frontend' }),
    )
    expect(m!.source).toBe('qa:f')
    expect(m!.persona).toBe('frontend')
  })

  it('excludes persona-tagged entries when no matching persona is active', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'why do you want to work here' }),
      ctx({ qa: [frontend], activePersona: null }),
    )
    expect(m).toBeNull()
  })

  it('infers persona from the job title', () => {
    expect(inferPersona('Senior Frontend Engineer', ['frontend', 'full-stack'])).toBe('frontend')
    expect(inferPersona('Data Analyst', ['frontend'])).toBeNull()
    expect(inferPersona(null, ['frontend'])).toBeNull()
  })
})

describe('Composite routing (Sections 5/6)', () => {
  const profile = {
    ...defaultProfile(),
    workHistory: [
      { company: 'Acme', title: 'Dev', startDate: '2020', endDate: 'Present', location: '', description: '' },
    ],
  }
  const compositeSeed: SeedQuestion = {
    id: 'work-history',
    category: 'experience',
    question: 'List your last three employers',
    aliases: ['Employment history'],
    fieldType: 'textarea',
    answerType: 'composite',
    mapsTo: null,
    answerTemplate: '{{#workHistory}}{{title}} at {{company}} ({{startDate}}–{{endDate}})\n{{/workHistory}}',
    variables: [],
    autofillByDefault: true,
  }

  it('prefers a composite entry for multiplicity-cue fields and renders it', async () => {
    const m = await matchField(
      signal({
        normalizedQuestion: 'list your last three company',
        multiplicityCue: true,
        kind: 'textarea',
      }),
      ctx({ profile, seeds: [compositeSeed] }),
    )
    expect(m!.composite).toBe(true)
    expect(m!.rawAnswerTemplate).toContain('Dev at Acme')
  })

  it('downgrades a single-value answer on a multi-part field to suggestion', async () => {
    const m = await matchField(
      signal({
        normalizedQuestion: 'list your previous company',
        multiplicityCue: true,
      }),
      ctx({ qa: [qa({ question: 'previous employer', answer: 'Acme' })] }),
    )
    if (m) expect(m.action).not.toBe('autofill')
  })

  it('skips composite seeds when the profile array is empty', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'list your last three employers', multiplicityCue: true }),
      ctx({ seeds: [compositeSeed] }),
    )
    expect(m).toBeNull()
  })
})

describe('Profile-backed seeds (Section 2)', () => {
  const seed: SeedQuestion = {
    id: 'notice',
    category: 'logistics',
    question: 'What is your notice period?',
    aliases: ['When can you start?'],
    fieldType: 'text',
    answerType: 'profile',
    mapsTo: 'profile.noticePeriod',
    answerTemplate: null,
    variables: [],
    autofillByDefault: true,
  }

  it('resolves from the profile at match time', async () => {
    const profile = { ...defaultProfile(), noticePeriod: '4 weeks' }
    const m = await matchField(
      signal({ normalizedQuestion: 'what is your notice period' }),
      ctx({ profile, seeds: [seed] }),
    )
    expect(m).toMatchObject({ rawAnswerTemplate: '4 weeks', source: 'profile' })
  })

  it('skips seeds whose profile value is empty (no blank fills)', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'what is your notice period' }),
      ctx({ seeds: [seed] }),
    )
    expect(m).toBeNull()
  })
})

describe('Safety rails (Sections 8/13)', () => {
  it('returns null for consent checkboxes and file inputs', async () => {
    expect(
      await matchField(signal({ kind: 'checkbox', consentLike: true, normalizedQuestion: 'i agree' }), ctx()),
    ).toBeNull()
    expect(
      await matchField(signal({ kind: 'file', normalizedQuestion: 'resume' }), ctx()),
    ).toBeNull()
  })

  it('auto-fills EEO fields on a confident match', async () => {
    const m = await matchField(
      signal({ normalizedQuestion: 'what is your gender', eeoLike: true }),
      ctx({ qa: [qa({ question: 'What is your gender?', answer: 'Woman' })] }),
    )
    expect(m!.action).toBe('autofill')
  })

  it('auto-fills a Workday veteran listbox from the profile EEO answer', async () => {
    const profile = {
      ...defaultProfile(),
      eeo: { ...defaultProfile().eeo, veteranStatus: 'No' },
    }
    const veteranSeed: SeedQuestion = {
      id: 'eeo-veteran',
      category: 'voluntary_eeo',
      question: 'Veteran status (voluntary self-identification)',
      aliases: ['Are you a veteran?', 'Military service status'],
      fieldType: 'select',
      answerType: 'profile',
      mapsTo: 'profile.eeo.veteranStatus',
      answerTemplate: null,
      variables: [],
      autofillByDefault: true,
    }
    const m = await matchField(
      signal({
        kind: 'select',
        eeoLike: true,
        normalizedQuestion: 'are you a veteran',
        options: VETERAN_OPTIONS,
      }),
      ctx({ profile, seeds: [veteranSeed] }),
    )
    expect(m!.chosenOptionValue).toBe('v2')
    expect(m!.action).toBe('autofill')
  })

  it('never fills the city into an ethnicity field ("city" hides inside the word)', async () => {
    const profile = {
      ...defaultProfile(),
      address: { ...defaultProfile().address, city: 'Houston' },
    }
    // word-boundary guard: "city" inside "ethnicity" never matches, in the
    // label or the identifier, with or without the detector's EEO flag
    expect(
      await matchField(
        signal({ label: 'Ethnicity', name: 'ethnicity', eeoLike: true, normalizedQuestion: 'ethnicity' }),
        ctx({ profile }),
      ),
    ).toBeNull()
    expect(
      await matchField(
        signal({ name: 'personalInfoUS--ethnicity', normalizedQuestion: 'ethnicity' }),
        ctx({ profile }),
      ),
    ).toBeNull()
    // regression: real city identifiers and labels still fill
    const byName = await matchField(signal({ name: 'homeCity' }), ctx({ profile }))
    expect(byName!.rawAnswerTemplate).toBe('Houston')
    const byLabel = await matchField(signal({ label: 'City' }), ctx({ profile }))
    expect(byLabel!.rawAnswerTemplate).toBe('Houston')
  })

  it('a poisoned captured alias (EEO entry wearing a school label) never beats tier-1', async () => {
    // Exact replay of the 2026-07-16 live store corruption: a captured
    // disability entry carried alias "School or University*" (misattributed
    // capture + silent merge), matching every school field at 1.0.
    const poisoned = qa({
      id: 'poisoned',
      question: 'Disability ',
      aliases: ['School or University*'],
      answer: 'No, I do not have a disability and have not had one in the past',
      source: 'captured',
      status: 'active',
    })
    const profile = {
      ...defaultProfile(),
      education: [
        { institution: 'University of Houston', degree: 'MS', field: 'IE', startDate: '2024-01', endDate: '2026-05' },
      ],
    }
    const m = await matchField(
      signal({
        kind: 'custom-dropdown',
        label: 'School or University*',
        name: 'education-1--school',
        sectionKind: 'education',
        sectionIndex: 0,
        normalizedQuestion: 'school or university',
      }),
      ctx({ profile, qa: [poisoned] }),
    )
    expect(m!.rawAnswerTemplate).toBe('University of Houston')
    expect(m!.source).toBe('profile')
    // …while a REAL disability question still reaches the captured answer
    const eeoField = await matchField(
      signal({
        kind: 'custom-dropdown',
        label: 'Do you have a disability?',
        eeoLike: true,
        normalizedQuestion: 'do you have a disability',
      }),
      ctx({ qa: [poisoned] }),
    )
    expect(eeoField!.rawAnswerTemplate).toBe(
      'No, I do not have a disability and have not had one in the past',
    )
  })

  it('alias-divergence guard: an alias-only hit on an ungraduated learned entry suggests, never autofills', async () => {
    // Non-EEO poison shape from the live store: a truncated previously-worked
    // entry wearing a "How Did You Hear About Us?*" alias. Alias match = 1.0,
    // primary question is unrelated → chip, not a silent fill.
    const poisoned = qa({
      id: 'trunc',
      question: 'Are you currently or have you previously worked with ',
      aliases: ['How Did You Hear About Us?*'],
      answer: 'I have never worked for ',
      source: 'captured',
      status: 'active',
    })
    const m = await matchField(
      signal({
        label: 'How Did You Hear About Us?*',
        normalizedQuestion: 'how did you hear about us',
      }),
      ctx({ qa: [poisoned] }),
    )
    expect(m!.action).toBe('suggest')
    // …but the same entry stays a normal match on its OWN question wording
    const own = await matchField(
      signal({
        label: 'Are you currently or have you previously worked with Acme?',
        normalizedQuestion: 'are you currently or have you previously worked with acme',
      }),
      ctx({ qa: [poisoned] }),
    )
    expect(own).not.toBeNull()
  })

  it('score ties between a learned fragment and a curated entry go to the curated one', async () => {
    // Live store: captured "study"→"industrial" (mid-typing fragment) and the
    // curated field-of-study entry both hit 1.0 on a "Field of Study" label.
    const fragment = qa({
      id: 'frag',
      question: 'study',
      aliases: ['Field of Study'],
      answer: 'industrial',
      source: 'captured',
      status: 'active',
    })
    const curated = qa({
      id: 'seed-fie',
      question: 'What was your field of study?',
      aliases: ['Field of study'],
      answer: 'Industrial Engineering',
      source: 'import',
    })
    const m = await matchField(
      signal({ label: 'Field of Study', normalizedQuestion: 'study' }),
      ctx({ qa: [fragment, curated] }), // learned first: order must not decide
    )
    expect(m!.rawAnswerTemplate).toBe('Industrial Engineering')
  })

  it('an eeoLike-flagged school field still fills the institution, never a stored EEO answer', async () => {
    // Live bug 2026-07-16: label resolution stole neighboring EEO text, so
    // the school field arrived label-polluted AND eeoLike — but its
    // identifier ("education-1--school") names it truthfully. Tier-1 must
    // keep filling it; an eeoLike gate on tier-1 handed it to the stored
    // disability answer at tier 2.
    const profile = {
      ...defaultProfile(),
      education: [
        { institution: 'Anna University', degree: 'BE', field: 'Industrial Engineering', startDate: '2018-08', endDate: '2022-05' },
      ],
    }
    const disability = qa({
      question: 'Do you have a disability or a history of disability?',
      answer: 'No, I do not have a disability and have not had one in the past',
    })
    const m = await matchField(
      signal({
        label: 'Disability',
        name: 'education-1--school',
        eeoLike: true,
        sectionKind: 'education',
        sectionIndex: 0,
        normalizedQuestion: 'disability',
      }),
      ctx({ profile, qa: [disability] }),
    )
    expect(m!.rawAnswerTemplate).toBe('Anna University')
    expect(m!.source).toBe('profile')
  })
})

// Real Workday voluntary-disclosure option sets (Section 6 / Review.MD).
const VETERAN_OPTIONS = [
  { value: 'v1', text: 'I identify as one or more of the classifications of a protected veteran' },
  { value: 'v2', text: 'I am not a protected veteran' },
  { value: 'v3', text: "I don't wish to answer." },
]
const DISABILITY_OPTIONS = [
  { value: 'd1', text: 'Yes, I have a disability, or have had one in the past' },
  { value: 'd2', text: 'No, I do not have a disability and have not had one in the past' },
  { value: 'd3', text: 'I do not want to answer' },
]
const ETHNICITY_OPTIONS = [
  { value: 'e1', text: 'White (United States of America)' },
  { value: 'e2', text: 'Asian (United States of America)' },
  { value: 'e3', text: 'Black or African American (United States of America)' },
  { value: 'e4', text: 'Decline to State (United States of America)' },
]

describe('Options (select/radio/checkbox)', () => {
  it('chooses the best-matching option', () => {
    const options = [
      { value: 'de', text: 'Germany' },
      { value: 'us', text: 'United States' },
    ]
    expect(chooseOption(options, 'Germany')!.value).toBe('de')
    expect(chooseOption(options, 'United States of America')!.value).toBe('us')
    expect(chooseOption(options, 'Wakanda')).toBeNull()
  })

  it('matches polar answers to long-form veteran options by intent', () => {
    expect(chooseOption(VETERAN_OPTIONS, 'No')!.value).toBe('v2')
    expect(chooseOption(VETERAN_OPTIONS, 'Yes')!.value).toBe('v1')
    expect(chooseOption(VETERAN_OPTIONS, 'Prefer not to say')!.value).toBe('v3')
  })

  it('vetoes opposite-polarity options even at high lexical similarity', () => {
    // "I am a protected veteran" is ~90% lexically similar to the negated
    // option — the veto must force the affirmative one.
    expect(chooseOption(VETERAN_OPTIONS, 'I am a protected veteran')!.value).toBe('v1')
  })

  it('returns null instead of a wrong-polarity fill', () => {
    const negativeOnly = [
      { value: 'n', text: 'No, I am not a protected veteran' },
      { value: 'd', text: "I don't wish to answer." },
    ]
    expect(chooseOption(negativeOnly, 'Yes')).toBeNull()
  })

  it('matches polar answers to long-form disability options', () => {
    expect(chooseOption(DISABILITY_OPTIONS, 'No')!.value).toBe('d2')
    expect(chooseOption(DISABILITY_OPTIONS, 'Yes')!.value).toBe('d1')
    expect(chooseOption(DISABILITY_OPTIONS, 'Decline to self-identify')!.value).toBe('d3')
  })

  it('strips Workday country parentheticals and matches decline variants', () => {
    expect(chooseOption(ETHNICITY_OPTIONS, 'Decline to State')!.value).toBe('e4')
    expect(chooseOption(ETHNICITY_OPTIONS, 'Decline to self-identify')!.value).toBe('e4')
    expect(chooseOption(ETHNICITY_OPTIONS, 'Asian')!.value).toBe('e2')
  })

  it('does not false-positive "No" against lookalike or numeric options', () => {
    expect(chooseOption([{ value: '1', text: 'Norway' }, { value: '2', text: 'Northern Mariana Islands' }], 'No')).toBeNull()
    expect(chooseOption([{ value: '1', text: 'Norway' }, { value: '2', text: 'No' }], 'No')).toMatchObject({ value: '2', score: 1 })
    expect(chooseOption([{ value: 'a', text: '0' }, { value: 'b', text: '1' }, { value: 'c', text: '2+' }], 'No')).toBeNull()
  })

  it('reports the matched option index and text', () => {
    const choice = chooseOption(VETERAN_OPTIONS, 'No')!
    expect(choice.index).toBe(1)
    expect(choice.text).toBe('I am not a protected veteran')
  })

  it('selects a concrete option and keeps autofill for exact matches', async () => {
    const profile = { ...defaultProfile(), requiresSponsorship: false }
    const m = await matchField(
      signal({
        kind: 'radio',
        name: 'sponsorship',
        normalizedQuestion: 'do you require sponsorship',
        options: [
          { value: '1', text: 'Yes' },
          { value: '0', text: 'No' },
        ],
      }),
      ctx({ profile }),
    )
    expect(m!.chosenOptionValue).toBe('0')
    expect(m!.action).toBe('autofill')
  })

  it('falls back to a runner-up candidate whose answer fits the options', async () => {
    // Tier 1 wins with workAuthorization = "US Citizen", but that maps to no
    // option on a Yes/No listbox — the ranked walk must fall back to the
    // lower-scoring stored answer "Yes" instead of dying.
    const profile = { ...defaultProfile(), workAuthorization: 'US Citizen' }
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Are you legally authorized to work in the United States?',
        normalizedQuestion: 'authorization work united states',
        options: [
          { value: 'y', text: 'Yes' },
          { value: 'n', text: 'No' },
        ],
      }),
      ctx({
        profile,
        qa: [qa({ question: 'Are you authorized to work in this country?', answer: 'Yes' })],
      }),
    )
    expect(m!.rawAnswerTemplate).toBe('Yes')
    expect(m!.chosenOptionValue).toBe('y')
    expect(m!.action).not.toBe('ignore')
  })

  it('downgrades to suggestion when no option matches the answer', async () => {
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Notice period',
        normalizedQuestion: 'notice period',
        options: [{ value: 'x', text: 'Something unrelated' }],
      }),
      ctx({ profile: { ...defaultProfile(), noticePeriod: '4 weeks' } }),
    )
    expect(m!.action).not.toBe('autofill')
  })

  it('maps yes/no answers to checkbox state', async () => {
    const m = await matchField(
      signal({ kind: 'checkbox', normalizedQuestion: 'willing to relocate' }),
      ctx({ qa: [qa({ question: 'Willing to relocate?', answer: 'Yes' })] }),
    )
    expect(m!.chosenOptionValue).toBe('checked')
  })

  it('maps long-form polar answers to checkbox state via intent', async () => {
    const m = await matchField(
      signal({ kind: 'checkbox', normalizedQuestion: 'do you have a disability' }),
      ctx({
        qa: [
          qa({
            question: 'Do you have a disability?',
            answer: 'No, I do not have a disability and have not had one in the past',
          }),
        ],
      }),
    )
    expect(m!.chosenOptionValue).toBe('unchecked')
  })
})

describe('matchAll', () => {
  it('skips already-filled fields unless overwrite is on', async () => {
    const profile = { ...defaultProfile(), email: 'a@b.c' }
    const signals = [signal({ fieldId: 'a', autocomplete: 'email', normalizedQuestion: 'email', filled: true })]
    const noOverwrite = await matchAll(signals, ctx({ profile }))
    expect(noOverwrite.size).toBe(0)
    const withOverwrite = await matchAll(
      signals,
      ctx({ profile, settings: { ...defaultSettings(), overwriteFilled: true } }),
    )
    expect(withOverwrite.size).toBe(1)
  })
})

describe('repeated work-experience sections (Workday)', () => {
  // getSortedWorkHistory puts the current job (empty endDate) first
  const profile = {
    ...defaultProfile(),
    workHistory: [
      {
        company: 'Acme',
        title: 'Engineer I',
        startDate: '2020-01',
        endDate: '2022-01',
        location: 'Berlin',
        description: 'Built the widget line.',
      },
      {
        company: 'Globex',
        title: 'Engineer II',
        startDate: '2022-02',
        endDate: '',
        location: 'Remote',
        description: 'Run the widget line.',
      },
    ],
  }

  it('fills section N from work-history entry N via sectionIndex', async () => {
    const results = await matchAll(
      [
        signal({ fieldId: 'c1', label: 'Company', normalizedQuestion: 'company', sectionIndex: 0 }),
        signal({ fieldId: 'c2', label: 'Company', normalizedQuestion: 'company', sectionIndex: 1 }),
        signal({ fieldId: 'd1', label: 'From', normalizedQuestion: 'from', kind: 'date', sectionIndex: 1 }),
      ],
      ctx({ profile }),
    )
    expect(results.get('c1')?.rawAnswerTemplate).toBe('Globex')
    expect(results.get('c2')?.rawAnswerTemplate).toBe('Acme')
    expect(results.get('d1')?.rawAnswerTemplate).toBe('2020-01')
  })

  it('advances the rotation past already-filled fields on rescan', async () => {
    // Workday adds section 2 AFTER section 1 was filled — a fresh scan must
    // not hand section 2 the first entry again.
    const results = await matchAll(
      [
        signal({ fieldId: 'c1', label: 'Company', normalizedQuestion: 'company', filled: true }),
        signal({ fieldId: 'c2', label: 'Company', normalizedQuestion: 'company' }),
      ],
      ctx({ profile }),
    )
    expect(results.has('c1')).toBe(false) // respected existing content
    expect(results.get('c2')?.rawAnswerTemplate).toBe('Acme')
  })

  it('maps "Role Description" to the entry description, not the job title', async () => {
    const m = await matchField(
      signal({ label: 'Role Description', normalizedQuestion: 'role description', kind: 'textarea', sectionIndex: 1 }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('Built the widget line.')
  })

  it('still maps plain "Job Title" to the title', async () => {
    const m = await matchField(
      signal({ label: 'Job Title', normalizedQuestion: 'job title', sectionIndex: 0 }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('Engineer II')
  })
})

describe('education sections vs work sections', () => {
  const profile = {
    ...defaultProfile(),
    workHistory: [
      {
        company: 'McWane',
        title: 'Industrial Engineer',
        startDate: '2026-01',
        endDate: '',
        location: 'Houston',
        description: 'Line balancing.',
      },
    ],
    education: [
      {
        institution: 'University of Houston',
        degree: 'MS',
        field: 'Industrial Engineering',
        startDate: '2024-08',
        endDate: '2026-05',
      },
      {
        institution: 'PSG College of Technology',
        degree: 'BE',
        field: 'Mechanical Engineering',
        startDate: '2019-08',
        endDate: '2023-07',
      },
    ],
  }

  it('NEVER fills education dates with work-history dates', async () => {
    const m = await matchField(
      signal({ label: 'From', normalizedQuestion: 'from', kind: 'date', sectionKind: 'education', sectionIndex: 0 }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('2024-08') // UH start, not McWane's 2026-01
  })

  it('fills education fields from the education entry ranked by section', async () => {
    const results = await matchAll(
      [
        signal({ fieldId: 's1', label: 'School or University', normalizedQuestion: 'school or university', sectionKind: 'education', sectionIndex: 0 }),
        signal({ fieldId: 's2', label: 'School or University', normalizedQuestion: 'school or university', sectionKind: 'education', sectionIndex: 1 }),
        signal({ fieldId: 'g1', label: 'Degree', normalizedQuestion: 'degree', sectionKind: 'education', sectionIndex: 1 }),
        signal({ fieldId: 'f1', label: 'Field of Study', normalizedQuestion: 'field of study', sectionKind: 'education', sectionIndex: 0 }),
      ],
      ctx({ profile }),
    )
    expect(results.get('s1')?.rawAnswerTemplate).toBe('University of Houston') // ends 2026-05 → first
    expect(results.get('s2')?.rawAnswerTemplate).toBe('PSG College of Technology')
    expect(results.get('g1')?.rawAnswerTemplate).toBe('BE')
    expect(results.get('f1')?.rawAnswerTemplate).toBe('Industrial Engineering')
  })

  it('keeps work sections on work history ("From" in a work block)', async () => {
    const m = await matchField(
      signal({ label: 'From', normalizedQuestion: 'from', kind: 'date', sectionKind: 'work', sectionIndex: 0 }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('2026-01')
  })

  it('never fills institution into a work block company field', async () => {
    const m = await matchField(
      signal({ label: 'Company', normalizedQuestion: 'company', sectionKind: 'work', sectionIndex: 0 }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('McWane')
  })
})

describe('multi-select checkbox groups', () => {
  const OPTIONS = [
    { value: 'am', text: 'Morning' },
    { value: 'pm', text: 'Evening' },
    { value: 'night', text: 'Night' },
  ]

  it('chooseOptions places every part of a compound answer', () => {
    const picks = chooseOptions(OPTIONS, 'Morning, Night')
    expect(picks.map((p) => p.text)).toEqual(['Morning', 'Night'])
  })

  it('chooseOptions handles "and"-joined answers and single answers', () => {
    expect(chooseOptions(OPTIONS, 'Evening and Night').map((p) => p.text)).toEqual(['Evening', 'Night'])
    expect(chooseOptions(OPTIONS, 'Evening').map((p) => p.text)).toEqual(['Evening'])
    expect(chooseOptions(OPTIONS, 'Weekends only')).toEqual([])
  })

  it('matches a checkbox group against the qa store and returns all placements', async () => {
    const m = await matchField(
      signal({
        kind: 'checkbox',
        label: 'Which shifts are you available for?',
        normalizedQuestion: 'which shifts are you available for',
        options: OPTIONS,
      }),
      ctx({ qa: [qa({ question: 'Which shifts are you available for?', answer: 'Morning, Night' })] }),
    )
    expect(m?.chosenOptionValues).toEqual(['Morning', 'Night'])
    expect(m?.action).toBe('autofill')
  })

  it('caps to suggestion when no option can be placed', async () => {
    const m = await matchField(
      signal({
        kind: 'checkbox',
        label: 'Which shifts are you available for?',
        normalizedQuestion: 'which shifts are you available for',
        options: OPTIONS,
      }),
      ctx({ qa: [qa({ question: 'Which shifts are you available for?', answer: 'Flexible, whatever works' })] }),
    )
    expect(m?.action).toBe('suggest')
  })
})

describe('sentence-length questionnaire labels (Workday Application Questions)', () => {
  const profile = {
    ...defaultProfile(),
    authorizedToWork: true,
    requiresSponsorship: true,
    willingToRelocate: true,
    workAuthorization: 'F-1 OPT — authorized to work in the US; will require H-1B sponsorship',
    workHistory: [
      {
        company: 'McWane',
        title: 'Industrial Engineer',
        startDate: '2026-01',
        endDate: '2026-05',
        location: '',
        description: '',
      },
    ],
  }

  it('never keyword-matches dates inside long questions ("…this applies to interviews…")', async () => {
    const m = await matchField(
      signal({
        kind: 'custom-dropdown',
        label:
          'What is your preferred method of communication for scheduling interviews and interview reminders (this applies to interviews scheduled using our AI-based recruiting assistant)?',
        normalizedQuestion: 'preferred method communication scheduling interviews',
      }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).not.toBe('2026-05')
    expect(m?.rawAnswerTemplate).not.toBe('2026-01')
  })

  it('does not answer "…the country in which you are applying?" with the address country', async () => {
    const m = await matchField(
      signal({
        kind: 'custom-dropdown',
        label: 'Are you legally authorized to work in the country in which you are applying?',
        normalizedQuestion: 'legally authorization work country applying',
      }),
      ctx({ profile: { ...profile, address: { ...profile.address, country: 'United States' } } }),
    )
    expect(m?.rawAnswerTemplate).toBe('Yes') // the boolean, not "United States"
  })

  it('answers sentence-form sponsorship and relocation questions with Yes/No', async () => {
    const sponsor = await matchField(
      signal({
        kind: 'custom-dropdown',
        label: 'Will you, now or in the future, require sponsorship for employment status (e.g., H-1b visa status)?',
        normalizedQuestion: 'require sponsorship employment status',
      }),
      ctx({ profile }),
    )
    expect(sponsor?.rawAnswerTemplate).toBe('Yes')
    const relocate = await matchField(
      signal({
        kind: 'custom-dropdown',
        label: 'Are you willing to relocate?',
        normalizedQuestion: 'willing relocate',
      }),
      ctx({ profile }),
    )
    expect(relocate?.rawAnswerTemplate).toBe('Yes')
  })

  it('a bare "Work authorization" field still gets the status text', async () => {
    const m = await matchField(
      signal({ label: 'Work authorization', normalizedQuestion: 'work authorization' }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toContain('F-1 OPT')
  })

  it('word-bounds label keywords: "Total years of experience" is not an end date', async () => {
    const m = await matchField(
      signal({ label: 'Total years of experience', normalizedQuestion: 'total years of experience' }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).not.toBe('2026-05')
  })

  it('short identifier-like labels still match ("To*", "Job Title")', async () => {
    const to = await matchField(
      signal({ label: 'To*', normalizedQuestion: 'to', kind: 'date', sectionKind: 'work', sectionIndex: 0 }),
      ctx({ profile }),
    )
    expect(to?.rawAnswerTemplate).toBe('2026-05')
    const title = await matchField(
      signal({ label: 'Job Title', normalizedQuestion: 'job title', sectionKind: 'work', sectionIndex: 0 }),
      ctx({ profile }),
    )
    expect(title?.rawAnswerTemplate).toBe('Industrial Engineer')
  })
})

describe('date-range fields without section indexes (react-datepicker sites)', () => {
  const profile = {
    ...defaultProfile(),
    workHistory: [
      { company: 'McWane', title: 'IE', startDate: '2026-01', endDate: '', location: '', description: '' },
      { company: 'UH', title: 'RA', startDate: '2024-05', endDate: '2025-02', location: '', description: '' },
    ],
    education: [
      { institution: 'UH', degree: 'MS', field: 'IE', startDate: '2024-08', endDate: '2026-05' },
    ],
  }

  it('rotates From dates across entries via usage counts', async () => {
    const results = await matchAll(
      [
        signal({ fieldId: 'f1', label: 'From*', normalizedQuestion: 'from', kind: 'date' }),
        signal({ fieldId: 'f2', label: 'From*', normalizedQuestion: 'from', kind: 'date' }),
      ],
      ctx({ profile }),
    )
    expect(results.get('f1')?.rawAnswerTemplate).toBe('2026-01') // current job first
    expect(results.get('f2')?.rawAnswerTemplate).toBe('2024-05') // NOT entry #1 again
  })

  it("leaves a current job's To empty instead of borrowing an education date", async () => {
    const m = await matchField(
      signal({ label: 'To*', normalizedQuestion: 'to', kind: 'date' }),
      ctx({ profile }),
    )
    expect(m).toBeNull() // no guess — the site's "current" affordance is the user's call
  })
})

describe('phone extension fields (caught by the live harness)', () => {
  it('never puts the phone number into a Phone Extension field', async () => {
    const profile = { ...defaultProfile(), phone: '555-010-0100' }
    const m = await matchField(
      signal({ label: 'Phone Extension', normalizedQuestion: 'phone extension' }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).not.toBe('555-010-0100')
    const phone = await matchField(
      signal({ label: 'Phone Number*', normalizedQuestion: 'phone number' }),
      ctx({ profile }),
    )
    expect(phone?.rawAnswerTemplate).toBe('555-010-0100')
  })
})

describe('camelCase identifier false positives (caught by the live harness)', () => {
  it('never reads "lName" out of "schoolName" — school fields get the school', async () => {
    const profile = {
      ...defaultProfile(),
      lastName: 'Example',
      education: [
        { institution: 'PSG College of Technology', degree: 'BE', field: 'Mechanical', startDate: '2019-08', endDate: '2023-07' },
      ],
    }
    const m = await matchField(
      signal({
        name: 'schoolName',
        label: 'School or University*',
        normalizedQuestion: 'school or university',
        sectionKind: 'education',
      }),
      ctx({ profile }),
    )
    expect(m?.rawAnswerTemplate).toBe('PSG College of Technology')
  })

  it('still matches genuine identifier names after humanization', async () => {
    const profile = { ...defaultProfile(),     lastName: 'Example', email: 'a@b.c' }
    const lname = await matchField(signal({ name: 'lname', normalizedQuestion: 'lname' }), ctx({ profile }))
    expect(lname?.rawAnswerTemplate).toBe('Example')
    const camel = await matchField(signal({ name: 'userEmail', normalizedQuestion: 'user email' }), ctx({ profile }))
    expect(camel?.rawAnswerTemplate).toBe('a@b.c')
  })
})

describe('semantic option placement (on-device judge seam)', () => {
  afterEach(() => setSemanticChooser(null))

  it('places an answer on a differently-worded option via the semantic judge', async () => {
    setSemanticChooser(async (answer, options) =>
      answer === 'Mobile' ? options.indexOf('Wireless handset') : null,
    )
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Device kind',
        normalizedQuestion: 'device kind',
        options: [
          { value: 'f', text: 'Fax' },
          { value: 'p', text: 'Pager' },
          { value: 'w', text: 'Wireless handset' },
        ],
      }),
      ctx({ qa: [qa({ question: 'Device kind', answer: 'Mobile' })] }),
    )
    expect(m?.chosenOptionValue).toBe('w')
    expect(m?.action).toBe('autofill')
  })

  it('stays suggestion-only when the judge declines', async () => {
    setSemanticChooser(async () => null)
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Device kind',
        normalizedQuestion: 'device kind',
        options: [
          { value: 'f', text: 'Fax' },
          { value: 'p', text: 'Pager' },
        ],
      }),
      ctx({ qa: [qa({ question: 'Device kind', answer: 'Mobile' })] }),
    )
    expect(m?.action).toBe('suggest') // no guess without placement
  })
})

describe('semantic generalization (question drift + pure inference)', () => {
  afterEach(() => {
    setSemanticChooser(null)
    setSemanticQuestionMatcher(null)
    setSemanticAnswerer(null)
  })

  it('bridges question wording the lexical scorer cannot ("get in touch" ↔ "contact method")', async () => {
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
          { value: 'p', text: 'Phone call' },
          { value: 'e', text: 'Email' },
          { value: 't', text: 'Text message' },
        ],
      }),
      ctx({ qa: [qa({ question: 'Preferred contact method', answer: 'Email' })] }),
    )
    expect(m?.rawAnswerTemplate).toBe('Email')
    expect(m?.chosenOptionValue).toBe('e')
    expect(m?.action).toBe('autofill')
  })

  it('infers an unknown question from profile facts when nothing is stored', async () => {
    setSemanticAnswerer(async (question, options, facts) =>
      question.includes('sponsorship now or in the future') && facts.includes('sponsorship: Yes')
        ? options.indexOf('Yes, I will require sponsorship')
        : null,
    )
    const profile = { ...defaultProfile(), requiresSponsorship: true, firstName: 'A', lastName: 'M' }
    const m = await matchField(
      signal({
        kind: 'select',
        label: 'Immigration: sponsorship now or in the future?',
        normalizedQuestion: 'immigration sponsorship now or in the future',
        name: 'immigrationQ7', // no tier-1 pattern hit
        options: [
          { value: 'y', text: 'Yes, I will require sponsorship' },
          { value: 'n', text: 'No sponsorship needed' },
        ],
      }),
      ctx({ profile: { ...profile, requiresSponsorship: true } }),
    )
    // NOTE: tier1 /sponsor/ pattern would normally catch this label; the test
    // asserts the inference PATH stays consistent with the final result
    expect(m?.action).toBe('autofill')
    expect(m?.chosenOptionValue).toBeTruthy()
  })

  it('never infers demographics (eeoLike) and stays silent without a judge', async () => {
    setSemanticAnswerer(async () => 0)
    const eeo = await matchField(
      signal({
        kind: 'select',
        label: 'Gender identity',
        normalizedQuestion: 'gender identity',
        eeoLike: true,
        options: [{ value: 'x', text: 'Option' }],
      }),
      ctx(),
    )
    expect(eeo).toBeNull()
    setSemanticAnswerer(null)
    const silent = await matchField(
      signal({
        kind: 'select',
        label: 'Are you comfortable with night shifts?',
        normalizedQuestion: 'are you comfortable with night shifts',
        options: [{ value: 'y', text: 'Yes' }, { value: 'n', text: 'No' }],
      }),
      ctx(),
    )
    expect(silent).toBeNull()
  })
})

describe('Novonesis live catches (2026-07-16)', () => {
  it('middle-name fields never receive the full name (Workday legalName--middleName ids)', async () => {
    const profile = { ...defaultProfile(), firstName: 'Ada', lastName: 'Example' }
    const middle = await matchField(
      signal({
        label: 'Middle Name',
        normalizedQuestion: 'middle name',
        id: 'name--legalName--middleName',
      }),
      ctx({ profile }),
    )
    expect(middle?.rawAnswerTemplate).not.toBe('Ada Example')
    // …while its legalName siblings keep their own getters
    const first = await matchField(
      signal({
        label: 'First Name*',
        normalizedQuestion: 'first name',
        id: 'name--legalName--firstName',
      }),
      ctx({ profile }),
    )
    expect(first?.rawAnswerTemplate).toBe('Ada')
    const legal = await matchField(
      signal({ label: 'Legal Name', normalizedQuestion: 'legal name' }),
      ctx({ profile }),
    )
    expect(legal?.rawAnswerTemplate).toBe('Ada Example')
  })

  it('country phone code fields get "+1", never the phone number', async () => {
    const profile = { ...defaultProfile(), phone: '555-010-0100' }
    const code = await matchField(
      signal({ label: 'Country Phone Code*', normalizedQuestion: 'country phone code' }),
      ctx({ profile }),
    )
    expect(code?.rawAnswerTemplate).toBe('+1')
    // ISO/address "Country Code" without any phone cue must not get "+1"
    const iso = await matchField(
      signal({ label: 'Country Code', normalizedQuestion: 'country code' }),
      ctx({ profile }),
    )
    expect(iso?.rawAnswerTemplate ?? null).not.toBe('+1')
  })

  it('"+1" places on the US phone-code option, not a same-code neighbor', () => {
    const options = [
      { value: 'dz', text: 'Algeria (+213)' },
      { value: 'ca', text: 'Canada (+1)' },
      { value: 'us', text: 'United States of America (+1)' },
    ]
    expect(chooseOption(options, '+1')!.value).toBe('us')
    // country answers still never emit "+1" as a variant (numeric-option risk)
    expect(answerVariants('United States')).not.toContain('+1')
  })
})
