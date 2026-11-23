import { describe, expect, it } from 'vitest'
import { diceBigrams, lexicalAnswerScore, lexicalScore, tokenCosine } from '@/lib/scorers/lexical'

describe('lexicalScore', () => {
  it('scores identical strings 1', () => {
    expect(lexicalScore('Why do you want to work here?', 'Why do you want to work here?')).toBe(1)
  })

  it('scores synonym phrasings very high', () => {
    expect(lexicalScore('E-mail address', 'Email address')).toBeGreaterThan(0.95)
  })

  it('scores paraphrases above the suggest threshold', () => {
    const s = lexicalScore('Why do you want to work here?', 'Why are you interested in working here?')
    expect(s).toBeGreaterThan(0.6)
  })

  it('scores unrelated questions low', () => {
    const s = lexicalScore('What is your salary expectation?', 'Describe your greatest weakness')
    expect(s).toBeLessThan(0.3)
  })

  it('is symmetric and clamped to [0,1]', () => {
    const a = 'notice period'
    const b = 'when can you start'
    expect(lexicalScore(a, b)).toBeCloseTo(lexicalScore(b, a), 10)
    expect(lexicalScore(a, b)).toBeGreaterThanOrEqual(0)
    expect(lexicalScore(a, b)).toBeLessThanOrEqual(1)
  })

  it('handles empty input', () => {
    expect(lexicalScore('', 'anything')).toBe(0)
    expect(tokenCosine('', '')).toBe(0)
    expect(diceBigrams('', 'x')).toBe(0)
  })

  it('keeps question-mode "no" → "number" mapping ("reference no." matches "reference number")', () => {
    expect(lexicalScore('reference no', 'reference number')).toBeCloseTo(1, 10)
  })
})

describe('lexicalAnswerScore', () => {
  it('scores identical answers 1', () => {
    expect(lexicalAnswerScore('No', 'No')).toBe(1)
  })

  it('does not equate "No" with "number"', () => {
    expect(lexicalAnswerScore('No', 'number')).toBeLessThan(1)
    expect(lexicalAnswerScore('reference no', 'reference number')).toBeLessThan(1)
  })

  it('scores "No" vs "Norway" low', () => {
    expect(lexicalAnswerScore('No', 'Norway')).toBeLessThan(0.55)
  })
})
