import { describe, expect, it } from 'vitest'
import {
  applyGeneralizations,
  buildCaptureDraft,
  findGeneralizations,
  findSimilar,
  isContextBranded,
  mergeAsAlias,
} from '@/content/capture'
import type { PageContext, QAEntry, SignalBundle } from '@/types'

const context: PageContext = {
  company: 'Acme Corp',
  role: 'Frontend Engineer',
  location: 'Berlin',
  source: 'jsonld',
}

function signal(overrides: Partial<SignalBundle> = {}): SignalBundle {
  return {
    fieldId: 'f1',
    kind: 'textarea',
    label: 'Why do you want to join us?',
    placeholder: '',
    autocomplete: '',
    name: '',
    id: '',
    dataAttrs: [],
    required: false,
    options: [],
    sectionContext: '',
    multiplicityCue: false,
    normalizedQuestion: 'why want join',
    rawText: '',
    filled: false,
    consentLike: false,
    eeoLike: false,
    ...overrides,
  }
}

const existing: QAEntry = {
  id: 'q1',
  question: 'Why do you want to work here?',
  aliases: [],
  answer: 'Because.',
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
}

describe('buildCaptureDraft (Section 11)', () => {
  it('saves captured answers as needs_review with context snapshot (review gate, 2026-07-16)', () => {
    const draft = buildCaptureDraft(signal(), 'I love Acme Corp!', context, 42)
    expect(draft).toMatchObject({
      status: 'needs_review',
      source: 'captured',
      answer: 'I love Acme Corp!',
      question: 'why want join',
      aliases: ['Why do you want to join us?'],
      captureContext: context,
      siteScope: null,
      okCount: 0,
      wrongCount: 0,
      createdAt: 42,
    })
    expect(draft.reviewNote).toBeTruthy()
  })

  it('carries siteScope and reviewNote extras', () => {
    const draft = buildCaptureDraft(signal(), 'mcwane.com', context, 42, {
      siteScope: 'mcwane.wd5.myworkdayjobs.com',
      reviewNote: 'Mentions this company',
    })
    expect(draft.siteScope).toBe('mcwane.wd5.myworkdayjobs.com')
    expect(draft.reviewNote).toBe('Mentions this company')
  })
})

describe('findSimilar / mergeAsAlias', () => {
  it('detects near-duplicate questions', () => {
    const similar = findSimilar([existing], 'why do you want to work here')
    expect(similar?.entry.id).toBe('q1')
  })

  it('returns null for unrelated questions', () => {
    expect(findSimilar([existing], 'what is your salary expectation')).toBeNull()
  })

  it('adds the new phrasing as an alias, no duplicates', () => {
    const merged = mergeAsAlias(existing, 'Why join our team?', [], 5)
    expect(merged.aliases).toEqual(['Why join our team?'])
    const again = mergeAsAlias(merged, 'why join our team?', [], 6)
    expect(again.aliases).toEqual(['Why join our team?'])
  })

  it('folds newly seen option wordings into the entry, case-insensitively', () => {
    const merged = mergeAsAlias(existing, 'Why join our team?', ['Yes', 'No'], 5)
    expect(merged.options).toEqual(['Yes', 'No'])
    const again = mergeAsAlias(merged, 'Why join our team?', ['yes', 'Maybe'], 6)
    expect(again.options).toEqual(['Yes', 'No', 'Maybe'])
  })
})

describe('generalization (Section 11 + NOTE.MD)', () => {
  it('finds company/role/location literals as spans for diff preview', () => {
    const answer = 'I want to join Acme Corp as a Frontend Engineer in Berlin because Acme Corp ships.'
    const spans = findGeneralizations(answer, context)
    expect(spans.map((s) => s.variable)).toEqual(['company', 'role', 'location', 'company'])
    expect(spans[0]).toMatchObject({ literal: 'Acme Corp', variable: 'company' })
  })

  it('matches case-insensitively but respects word boundaries', () => {
    const spans = findGeneralizations('ACME CORP is not Acmecorporation', context)
    expect(spans).toHaveLength(1)
    expect(spans[0].literal).toBe('ACME CORP')
  })

  it('skips dangerous short literals', () => {
    const shortCtx: PageContext = { company: 'So', role: null, location: null, source: 'none' }
    expect(findGeneralizations('So I think so', shortCtx)).toEqual([])
  })

  it('drops overlapping spans', () => {
    const overlapping: PageContext = {
      company: 'Acme',
      role: 'Acme Engineer',
      location: null,
      source: 'none',
    }
    const spans = findGeneralizations('I am an Acme Engineer', overlapping)
    expect(spans).toHaveLength(1)
  })

  it('applies only user-confirmed spans (diff-confirmed, per NOTE.MD)', () => {
    const answer = 'Acme Corp in Berlin'
    const spans = findGeneralizations(answer, context)
    // user unchecks the location replacement
    const chosen = spans.filter((s) => s.variable === 'company')
    expect(applyGeneralizations(answer, chosen)).toBe('{{company}} in Berlin')
    // …or confirms everything
    expect(applyGeneralizations(answer, spans)).toBe('{{company}} in {{location}}')
  })
})

describe('page branding (isContextBranded)', () => {
  const context = { company: 'McWane Industrial', role: null, location: null, source: 'adapter' as const }

  it('recognizes company-branded values from the page context', () => {
    expect(isContextBranded('mcwane.com', context)).toBe(true)
    expect(isContextBranded('McWane Careers Site', context)).toBe(true)
  })

  it('recognizes branding from the ATS hostname label', () => {
    expect(isContextBranded('mcwane.com', null, 'mcwane.wd5.myworkdayjobs.com')).toBe(true)
  })

  it('does not flag genuinely different answers', () => {
    expect(isContextBranded('Indeed', context)).toBe(false)
    expect(isContextBranded('LinkedIn', context, 'mcwane.wd5.myworkdayjobs.com')).toBe(false)
  })

  it('never flags when there is no context at all', () => {
    expect(isContextBranded('mcwane.com', null, '')).toBe(false)
  })
})
