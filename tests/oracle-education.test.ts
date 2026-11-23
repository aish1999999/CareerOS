import { beforeEach, describe, expect, it } from 'vitest'
import { detectFields } from '@/content/detector'
import { matchAll, type MatcherContext } from '@/content/matcher'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import type { QAEntry, SeedQuestion, SignalBundle } from '@/types'
import { readFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Live bug 2026-07-17 (NOV, Oracle CX): BOTH education blocks' School fields
// filled "University of Houston". Oracle CX carries no Workday-style numbered
// ids and no numbered headings, so no sectionIndex exists — the school seed's
// global {{education.0.institution}} template (question score 1.0) beat the
// rotating tier-1 educationGetter (0.9) on every block. Two fixes under test:
// matcher — ≥2 tier-1 hits on one education key = repeated entry blocks, the
// rotating getter outranks global tier-2 answers; detector — structural
// indexes that put the same question at the same index from different items
// (rows, not blocks) are stripped so rotation can take over.
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

/** A curated stored answer that exact-hits the school question at 1.0 — the
 *  literal-answer flavor of the same trap the school seed springs. */
const storedSchool: QAEntry = {
  id: 'stored-school',
  question: 'School or University',
  aliases: [],
  answer: 'University of Houston',
  answerType: 'text', answerTemplate: null, mapsTo: null, variables: [],
  personas: [], tags: [], fieldType: 'text', options: [], status: 'active',
  source: 'import', captureContext: null, createdAt: 0, updatedAt: 0,
}

function ctx(overrides: Partial<MatcherContext> = {}): MatcherContext {
  return {
    profile,
    qa: [],
    seeds: seedCatalog.questions as SeedQuestion[],
    settings: defaultSettings(),
    activePersona: null,
    ...overrides,
  }
}

const schoolSignal = (fieldId: string) =>
  signal({
    fieldId,
    label: 'School or University',
    normalizedQuestion: 'school or university',
    rawText: 'school or university',
  })

describe('un-indexed repeated education blocks (Oracle CX shape)', () => {
  it('two School fields rotate through the education entries instead of both taking the seed\'s entry #1', async () => {
    const matches = await matchAll([schoolSignal('s1'), schoolSignal('s2')], ctx())
    expect(matches.get('s1')?.rawAnswerTemplate).toBe('University of Houston')
    expect(matches.get('s2')?.rawAnswerTemplate).toBe('PSG College of Technology')
  })

  it('a stored literal school answer cannot stamp entry #1 onto both blocks either', async () => {
    const matches = await matchAll(
      [schoolSignal('s1'), schoolSignal('s2')],
      ctx({ qa: [storedSchool] }),
    )
    expect(matches.get('s1')?.rawAnswerTemplate).toBe('University of Houston')
    expect(matches.get('s2')?.rawAnswerTemplate).toBe('PSG College of Technology')
  })

  it('two Degree selects pick each entry\'s own degree', async () => {
    const options = [
      { value: '1', text: 'Associates' },
      { value: '2', text: 'Bachelors' },
      { value: '3', text: 'Masters' },
    ]
    const degree = (fieldId: string) =>
      signal({ fieldId, kind: 'select' as const, label: 'Degree', normalizedQuestion: 'degree', options })
    const matches = await matchAll([degree('d1'), degree('d2')], ctx())
    expect(matches.get('d1')?.chosenOptionValue).toBe('3')
    expect(matches.get('d2')?.chosenOptionValue).toBe('2')
  })

  it('a LONE school question keeps today\'s behavior — stored curated answers still compete', async () => {
    const matches = await matchAll([schoolSignal('s1')], ctx({ qa: [storedSchool] }))
    const m = matches.get('s1')
    expect(m?.rawAnswerTemplate).toBe('University of Houston')
    // Tier-2 won (score 1.0 vs tier-1 0.9): the repeat preference must not
    // fire off a single field.
    expect(m?.source).toBe('qa:stored-school')
  })
})

describe('detector: structural rows-not-blocks strip (Oracle JET shape)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  // JET combobox rows hide a second (hidden) input, so an intra-block ROW
  // passes structuralRepeatItem's ≥2-inputs block test — every block's
  // School row then reads index 0.
  function eduBlock(n: number): string {
    return `
      <div class="edu-block">
        <div class="input-row">
          <label for="sch${n}">School or University</label>
          <input id="sch${n}" type="text">
          <input type="hidden">
        </div>
        <div class="input-row">
          <label for="deg${n}">Degree</label>
          <input id="deg${n}" type="text">
          <input type="hidden">
        </div>
      </div>`
  }

  it('same question at the same index from different items strips the indexes, keeps the kind', () => {
    document.body.innerHTML = `<div class="edu-list">${eduBlock(1)}${eduBlock(2)}</div>`
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => f.el.id === id)!.signal
    for (const id of ['sch1', 'sch2', 'deg1', 'deg2']) {
      expect(byId(id).sectionIndex).toBeUndefined()
      expect(byId(id).sectionKind).toBe('education')
    }
  })

  it('end to end: detected fields fill entry 1 then entry 2', async () => {
    document.body.innerHTML = `<div class="edu-list">${eduBlock(1)}${eduBlock(2)}</div>`
    const fields = detectFields(document)
    const matches = await matchAll(fields.map((f) => f.signal), ctx())
    const byId = (id: string) =>
      matches.get(fields.find((f) => f.el.id === id)!.signal.fieldId)
    expect(byId('sch1')?.rawAnswerTemplate).toBe('University of Houston')
    expect(byId('sch2')?.rawAnswerTemplate).toBe('PSG College of Technology')
    expect(byId('deg1')?.rawAnswerTemplate).toBe('Master of Science')
    expect(byId('deg2')?.rawAnswerTemplate).toBe('Bachelor of Engineering')
  })

  it('true sibling blocks (distinct indexes) keep their structural identity', () => {
    // Phenom-style: the block IS the innermost same-class sibling group.
    const block = (n: number) => `
      <div class="edu-item">
        <label for="s${n}">School or University</label><input id="s${n}" type="text">
        <label for="d${n}">Degree</label><input id="d${n}" type="text">
      </div>`
    document.body.innerHTML = `<div>${block(1)}${block(2)}</div>`
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => f.el.id === id)!.signal
    expect(byId('s1').sectionIndex).toBe(0)
    expect(byId('s2').sectionIndex).toBe(1)
    expect(byId('s1').sectionKind).toBe('education')
  })
})
