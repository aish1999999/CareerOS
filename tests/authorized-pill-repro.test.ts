// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://egay.fa.us6.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_4001/job/40909/apply/section/2"}
import { beforeEach, describe, expect, it } from 'vitest'
import { detectFields } from '@/content/detector'
import { matchField } from '@/content/matcher'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import type { QAEntry, SeedQuestion } from '@/types'

// ---------------------------------------------------------------------------
// Live NOV round-3 matcher gaps (2026-07-17):
// 1. judge-routing over-reach: `clearing.some(judgeOnly)` disabled lexical
//    option placement on ANY question the judge-mode Field of Study entry
//    weakly cleared against — "authorized to work for NOV?" had a placeable
//    tier-1 "Yes" but suggested placement-less, twice, live.
// 2. stored seed entries freeze their aliases at import time — catalog
//    alias improvements never reached them (drug screen stuck at 0.44).
// 3. "Do you have a bachelor's degree in engineering…?" — derivable Yes
//    from the education entries, was matching the degree-NAME template.
// ---------------------------------------------------------------------------

function pillGroup(question: string, options: string[]): void {
  document.body.innerHTML = `
    <div data-qa="q">
      <ul role="list" aria-label="${question}" class="cx-select-pills-container">
        ${options.map((o) => `<li role="listitem"><button type="button" aria-disabled="false" aria-pressed="false" class="cx-select-pill-section"><span class="cx-select-pill-name"> ${o}</span></button></li>`).join('')}
      </ul>
    </div>`
}

function qaEntry(over: Partial<QAEntry>): QAEntry {
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
    fieldType: 'radio',
    options: [],
    status: 'active',
    source: 'import',
    captureContext: null,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  }
}

const judgeFieldOfStudy = qaEntry({
  id: 'seed-field-of-study',
  question: 'Field of study',
  aliases: ['Major', 'Area of study', 'Discipline'],
  answer: 'Industrial and Systems Engineering',
  answerMode: 'judge',
})

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('judge routing stays on ITS question (live NOV authorized-to-work repro)', () => {
  it('authorized-to-work autofills Yes even with a judge-mode entry in the store', async () => {
    pillGroup('Are you legally authorized to work for National Oilwell Varco in the United States?', ['Yes', 'No'])
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: { ...defaultProfile(), authorizedToWork: true },
      qa: [judgeFieldOfStudy],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
      pageContext: { company: 'NOV', role: null, location: null, source: 'meta' },
      hostname: 'egay.fa.us6.oraclecloud.com',
    })
    expect(match?.rawAnswerTemplate).toBe('Yes')
    expect(match?.chosenOptionValue).toBe('Yes')
    expect(match?.action).toBe('autofill')
    expect(match?.judgeOnly).toBeFalsy()
  })

  it('an exact Field of Study match still routes to the judge alone', async () => {
    pillGroup('Field of Study', ['Mechanical Engineering', 'Industrial Engineering', 'Computer Science'])
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: defaultProfile(),
      qa: [judgeFieldOfStudy],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.judgeOnly).toBe(true)
    // lexical placement disabled — no chosen option without the judge
    expect(match?.chosenOptionValue).toBeUndefined()
  })
})

describe('employer-scope authorization options (live NOV wording)', () => {
  it('places "all United States employers" via the getter fallbacks — never guesses between affirmatives with a bare Yes', async () => {
    pillGroup('Are you legally authorized to work for National Oilwell Varco in the United States?', [
      'Authorized to work for all United States employers',
      'Authorized to work for only my current United States employer',
      'Not Authorized to work in the United States',
    ])
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: { ...defaultProfile(), authorizedToWork: true },
      qa: [],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
      pageContext: { company: 'NOV', role: null, location: null, source: 'meta' },
      hostname: 'egay.fa.us6.oraclecloud.com',
    })
    expect(match?.action).toBe('autofill')
    expect(match?.chosenOptionValue).toBe('Authorized to work for all United States employers')
  })
})

describe('stored seed entries inherit LIVE catalog aliases', () => {
  it('unions across the seed- id prefix (stored "seed-relatives" vs catalog "relatives")', async () => {
    pillGroup('Are you related to or associated with anyone that works for NOV?', ['Yes', 'No'])
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: defaultProfile(),
      qa: [
        qaEntry({
          id: 'seed-relatives', // stored with prefix
          question: 'Do you have any relatives currently employed by this company?',
          aliases: ['Any relatives who work here?'],
          answer: 'No',
          source: 'training',
        }),
      ],
      seeds: [
        {
          id: 'relatives', // catalog without prefix
          category: 'screening',
          question: 'Do you have any relatives currently employed by this company?',
          aliases: [
            'Any relatives who work here?',
            'Are you related to or associated with anyone that works for this company?',
          ],
          fieldType: 'select',
          answerType: 'freeText',
          mapsTo: null,
          answerTemplate: null,
          variables: [],
          autofillByDefault: true,
        },
      ],
      settings: defaultSettings(),
      activePersona: null,
      pageContext: { company: 'NOV', role: null, location: null, source: 'meta' },
      hostname: 'egay.fa.us6.oraclecloud.com',
    })
    expect(match?.source).toBe('qa:seed-relatives')
    expect(match?.chosenOptionValue).toBe('No')
    expect(match?.action).toBe('autofill')
  })

  it('the NOV drug-screen wording matches through the catalog alias', async () => {
    pillGroup('Are you willing to take a drug screen at company expense?', ['Yes', 'No'])
    const [field] = detectFields(document)
    const storedSeedCopy = qaEntry({
      id: 'seed-drug-screen',
      question: 'Are you willing to undergo a pre-employment drug screening?',
      aliases: ['Are you willing to take a drug test?'], // frozen, pre-catalog-update
      answer: 'Yes',
      source: 'training',
    })
    const catalogSeed: SeedQuestion = {
      id: 'seed-drug-screen',
      category: 'screening',
      question: 'Are you willing to undergo a pre-employment drug screening?',
      aliases: [
        'Are you willing to take a drug test?',
        'Are you willing to take a drug screen at company expense?',
      ],
      fieldType: 'select',
      answerType: 'freeText',
      mapsTo: null,
      answerTemplate: null,
      variables: [],
      autofillByDefault: true,
    }
    const match = await matchField(field.signal, {
      profile: defaultProfile(),
      qa: [storedSeedCopy],
      seeds: [catalogSeed],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.source).toBe('qa:seed-drug-screen')
    expect(match?.chosenOptionValue).toBe('Yes')
    expect(match?.action).toBe('autofill')
  })
})

describe('"Do you have a bachelor\'s degree in …?" screening questions', () => {
  const profile = {
    ...defaultProfile(),
    education: [
      { institution: 'UH', degree: 'Master of Science', field: 'Industrial Engineering', startDate: '2023-08', endDate: '2025-05' },
      { institution: 'PSG', degree: 'Bachelor of Engineering', field: 'Mechanical Engineering', startDate: '2018-08', endDate: '2022-05' },
    ],
  }

  it('answers Yes when the level exists and a named discipline overlaps', async () => {
    pillGroup('Do you have a bachelor’s degree in engineering or supply chain management or a related field.', ['Yes', 'No'])
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile,
      qa: [],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.rawAnswerTemplate).toBe('Yes')
    expect(match?.action).toBe('autofill')
  })

  it('skips (never answers No) when the discipline does not overlap', async () => {
    pillGroup('Do you have a bachelor’s degree in nursing or pharmacology?', ['Yes', 'No'])
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile,
      qa: [],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.action ?? 'ignore').not.toBe('autofill')
  })

  it('skips when the asked level is absent (Yes-only getter)', async () => {
    pillGroup('Do you have a doctoral degree?', ['Yes', 'No'])
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile,
      qa: [],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.action ?? 'ignore').not.toBe('autofill')
  })
})
