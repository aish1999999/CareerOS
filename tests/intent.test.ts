import { describe, expect, it } from 'vitest'
import { classifyIntent, stripParentheticals } from '@/lib/intent'

describe('stripParentheticals', () => {
  it('strips a trailing country qualifier', () => {
    expect(stripParentheticals('Decline to State (United States of America)')).toBe(
      'Decline to State',
    )
  })

  it('strips stacked trailing groups', () => {
    expect(stripParentheticals('Asian (Not Hispanic or Latino) (United States of America)')).toBe(
      'Asian',
    )
  })

  it('strips interior parentheticals, rejoining the surrounding words', () => {
    expect(stripParentheticals('Veteran (protected) status question')).toBe(
      'Veteran status question',
    )
    expect(stripParentheticals("Bachelor's Degree (BS/BA) or equivalent")).toBe(
      "Bachelor's Degree or equivalent",
    )
  })

  it('never strips down to nothing', () => {
    expect(stripParentheticals('(only parens)')).toBe('(only parens)')
  })

  it('returns the original when stripping would leave nothing', () => {
    expect(stripParentheticals('(select one)')).toBe('(select one)')
  })
})

describe('classifyIntent', () => {
  const cases: [string, ReturnType<typeof classifyIntent>][] = [
    // negate
    ['No', 'negate'],
    ['no', 'negate'],
    ['N', 'negate'],
    ['false', 'negate'],
    ['None', 'negate'],
    ['None of the above', 'negate'],
    ['Never', 'negate'],
    ['No, I am not a protected veteran', 'negate'],
    ['I AM NOT A PROTECTED VETERAN', 'negate'],
    ['I am not a protected veteran', 'negate'],
    ['No, I do not have a disability and have not had one in the past', 'negate'],
    ['I do not have a disability', 'negate'],
    ['I have no disability', 'negate'],
    ['Not a protected veteran', 'negate'],
    // "never" anywhere — company work-history option sets phrase their No
    // this way, and "I have …" must not drag them into affirm
    ['I have never worked for Novo Nordisk, its affiliates or subsidiaries', 'negate'],
    ['I have never been employed by Acme Corp', 'negate'],
    ['Never worked here', 'negate'],
    // affirm
    ['Yes', 'affirm'],
    ['yes', 'affirm'],
    ['Y', 'affirm'],
    ['true', 'affirm'],
    ['Yes, I have a disability, or have had one in the past', 'affirm'],
    ['I am a protected veteran', 'affirm'],
    ['I identify as one or more of the classifications of a protected veteran', 'affirm'],
    ['I have a disability', 'affirm'],
    // decline
    ['Decline', 'decline'],
    ['I decline', 'decline'],
    ['Decline to self-identify', 'decline'],
    ['Decline to State (United States of America)', 'decline'],
    ['Prefer not to say', 'decline'],
    ['I prefer to not answer', 'decline'],
    ["I don't wish to answer.", 'decline'],
    ['I don’t wish to answer.', 'decline'], // curly apostrophe (Workday)
    ['I do not want to answer', 'decline'],
    ['Choose not to identify', 'decline'],
    ['I would rather not say', 'decline'],
    ['Opt out', 'decline'],
    ['No answer', 'decline'],
    // unknown — intent layer must stay inert
    ['', 'unknown'],
    ['0', 'unknown'],
    ['3', 'unknown'],
    ['1-2', 'unknown'],
    ['Not applicable', 'unknown'],
    ['N/A', 'unknown'],
    ['n/a', 'unknown'],
    ['Norway', 'unknown'],
    ['Nigeria', 'unknown'],
    ['Male', 'unknown'],
    ['White (United States of America)', 'unknown'],
    ['Two or More Races', 'unknown'],
    ['US Citizen', 'unknown'],
    ['Germany', 'unknown'],
  ]

  it.each(cases)('%s → %s', (text, expected) => {
    expect(classifyIntent(text)).toBe(expected)
  })
})
