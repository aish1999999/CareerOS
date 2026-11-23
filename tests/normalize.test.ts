import { describe, expect, it } from 'vitest'
import {
  canonical,
  canonicalAnswer,
  humanizeIdentifier,
  normalize,
  tokenize,
  tokenizeAnswer,
} from '@/lib/normalize'

describe('normalize', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalize('  First   Name: *')).toBe('first name')
  })

  it('expands phrase synonyms', () => {
    expect(normalize('E-mail address')).toBe('email address')
    expect(normalize('Cell phone')).toBe('phone')
    expect(normalize('Mobile number')).toBe('phone')
    expect(normalize('Zip code')).toBe('postal code')
    expect(normalize('Surname')).toBe('last name')
  })

  it('unifies spelling variants', () => {
    expect(normalize('Work authorisation')).toBe('work authorization')
    expect(normalize('LinkedIn profile')).toContain('linkedin')
  })
})

describe('tokenize', () => {
  it('drops stopwords, canonicalizes and stems tokens', () => {
    expect(tokenize('Do you have any experience?')).toEqual(['experience'])
    expect(tokenize('years of exp')).toEqual(['year', 'experience'])
    expect(tokenize('working')).toEqual(tokenize('work'))
  })

  it('maps employer to company', () => {
    expect(tokenize('previous employers')).toContain('company')
  })
})

describe('canonical', () => {
  it('produces identical strings for synonym phrasings', () => {
    expect(canonical('E-mail address')).toBe(canonical('Email address'))
    expect(canonical('Cell phone')).toBe(canonical('Mobile'))
  })
})

describe('canonicalAnswer', () => {
  it('keeps "no" a polarity word while canonical maps it to "number"', () => {
    expect(canonicalAnswer('No')).toBe('no')
    expect(canonical('No')).toBe('number')
  })

  it('still applies the rest of TOKEN_MAP', () => {
    expect(tokenizeAnswer('previous employers')).toContain('company')
    expect(canonicalAnswer('E-mail address')).toBe(canonicalAnswer('Email address'))
  })
})

describe('humanizeIdentifier', () => {
  it('splits snake_case, kebab-case and camelCase', () => {
    expect(humanizeIdentifier('candidate_first_name')).toBe('candidate first name')
    expect(humanizeIdentifier('firstName')).toBe('first Name')
    expect(humanizeIdentifier('job-application[email]')).toBe('job application email')
  })
})
