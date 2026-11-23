import { describe, expect, it } from 'vitest'
import {
  AI_FILL_MAX_TARGETS,
  inferDropdownMatch,
  inferOptionMatch,
  inferTextMatch,
  judgeRetryMatch,
  selectAiFillTargets,
} from '@/content/ai-fill'
import type { FieldValidation } from '@/content/validate'
import type { MatchResult } from '@/types'

// ---------------------------------------------------------------------------
// AI Fill (pill button): pure target selection from a validation report and
// the judge-forcing match builders. The rules under test are policy:
// only EMPTY fields, never EEO/consent/file/password, inference only for
// kinds with a judge pipeline.
// ---------------------------------------------------------------------------

let seq = 0
function entry(overrides: Partial<FieldValidation> = {}): FieldValidation {
  return {
    fieldId: `f${++seq}`,
    label: 'How did you hear about us?',
    kind: 'select',
    verdict: 'missing-answerable',
    required: false,
    normalizedQuestion: 'how did you hear about us',
    options: ['LinkedIn', 'Referral'],
    sectionContext: '',
    eeoLike: false,
    consentLike: false,
    ...overrides,
  }
}

function storedMatch(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    fieldId: 'f1',
    resolvedAnswer: null,
    rawAnswerTemplate: 'LinkedIn',
    confidence: 0.9,
    source: 'profile',
    unresolvedVars: [],
    action: 'autofill',
    needsReview: false,
    composite: false,
    ...overrides,
  }
}

describe('selectAiFillTargets', () => {
  it('targets only the empty verdicts — ok/wrong/skipped are never touched', () => {
    const report = [
      entry({ verdict: 'ok' }),
      entry({ verdict: 'wrong' }), // user decision: AI never overwrites
      entry({ verdict: 'skipped' }),
      entry({ verdict: 'missing-answerable' }),
      entry({ verdict: 'missing-unanswered' }),
    ]
    const { targets, skipped } = selectAiFillTargets(report)
    expect(targets.map((t) => t.reason)).toEqual(['missing-answerable', 'missing-unanswered'])
    expect(skipped).toEqual([])
  })

  it('orders stored-answer retries before inference', () => {
    const report = [
      entry({ verdict: 'missing-unanswered' }),
      entry({ verdict: 'missing-answerable' }),
      entry({ verdict: 'missing-unanswered' }),
    ]
    const { targets } = selectAiFillTargets(report)
    expect(targets.map((t) => t.reason)).toEqual([
      'missing-answerable',
      'missing-unanswered',
      'missing-unanswered',
    ])
  })

  it('hard-excludes EEO, consent, file, and password whatever the verdict', () => {
    const report = [
      entry({ verdict: 'missing-unanswered', eeoLike: true }),
      entry({ verdict: 'missing-answerable', consentLike: true, kind: 'checkbox' }),
      entry({ verdict: 'missing-answerable', kind: 'file' }),
      entry({ verdict: 'missing-answerable', kind: 'password' }),
    ]
    const { targets, skipped } = selectAiFillTargets(report)
    expect(targets).toEqual([])
    expect(skipped.map((s) => s.why)).toEqual(['eeo', 'consent', 'file', 'password'])
  })

  it('inference is limited to judge-pipeline kinds; stored-answer retries are not', () => {
    const report = [
      entry({ verdict: 'missing-unanswered', kind: 'checkbox' }), // no pipeline
      entry({ verdict: 'missing-unanswered', kind: 'date' }), // no pipeline
      entry({ verdict: 'missing-unanswered', kind: 'textarea' }),
      entry({ verdict: 'missing-answerable', kind: 'date' }), // retry of a stored answer is fine
    ]
    const { targets, skipped } = selectAiFillTargets(report)
    expect(skipped.map((s) => s.why)).toEqual(['unsupported-kind', 'unsupported-kind'])
    expect(targets.map((t) => [t.reason, t.entry.kind])).toEqual([
      ['missing-answerable', 'date'],
      ['missing-unanswered', 'textarea'],
    ])
  })

  it('caps a pass and reports the overflow honestly', () => {
    const report = Array.from({ length: 20 }, () => entry({ verdict: 'missing-unanswered' }))
    const capped = selectAiFillTargets(report)
    expect(capped.targets).toHaveLength(AI_FILL_MAX_TARGETS)
    expect(capped.overflow).toBe(20 - AI_FILL_MAX_TARGETS)
    const tiny = selectAiFillTargets(report, 3)
    expect(tiny.targets).toHaveLength(3)
    expect(tiny.overflow).toBe(17)
  })
})

describe('judge match builders', () => {
  it('judgeRetryMatch forces judge-only placement and drops the failed pick', () => {
    const retry = judgeRetryMatch(
      storedMatch({ action: 'suggest', needsReview: true, chosenOptionValue: 'stale' }),
    )
    expect(retry.judgeOnly).toBe(true)
    expect(retry.action).toBe('autofill') // explicit button press — never suggest-capped
    expect(retry.needsReview).toBe(false)
    expect(retry.chosenOptionValue).toBeUndefined()
    expect(retry.rawAnswerTemplate).toBe('LinkedIn') // the stored answer survives
  })

  it('inferDropdownMatch defers the pick to fill time', () => {
    const m = inferDropdownMatch('f9')
    expect(m).toMatchObject({
      fieldId: 'f9',
      inferAtFill: true,
      provenance: 'inferred',
      action: 'autofill',
      rawAnswerTemplate: '',
    })
  })

  it('inferOptionMatch pins the judge-picked option for selects', () => {
    expect(inferOptionMatch('f9', { value: 'us', text: 'United States' }, 'select')).toMatchObject({
      chosenOptionValue: 'us',
      rawAnswerTemplate: 'United States',
      provenance: 'inferred',
    })
    // value-less options (text-only markup) fall back to the text
    expect(inferOptionMatch('f9', { value: '', text: 'Referral' }, 'select').chosenOptionValue).toBe(
      'Referral',
    )
  })

  it('inferOptionMatch never pins radios by value — duplicate "on" values flip polarity', () => {
    // valueless Yes/No radios both report value "on"; a pinned value resolves
    // first-match-wins and clicks the WRONG option — the text walk places it
    const m = inferOptionMatch('f9', { value: 'on', text: 'No' }, 'radio')
    expect(m.chosenOptionValue).toBeUndefined()
    expect(m.rawAnswerTemplate).toBe('No')
  })

  it('inferTextMatch carries the drafted text verbatim', () => {
    const m = inferTextMatch('f9', 'I led the migration of a data pipeline.')
    expect(m.rawAnswerTemplate).toBe('I led the migration of a data pipeline.')
    expect(m.provenance).toBe('inferred')
    expect(m.action).toBe('autofill')
  })
})
