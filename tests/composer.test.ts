import { describe, expect, it } from 'vitest'
import { renderComposite } from '@/content/composer'
import { defaultProfile } from '@/lib/schema'

const profile = {
  ...defaultProfile(),
  firstName: 'Ada',
  lastName: 'Lovelace',
  workHistory: [
    { company: 'Acme', title: 'Senior Dev', startDate: '2022', endDate: 'Present', location: 'Berlin', description: '' },
    { company: 'Globex', title: 'Dev', startDate: '2019', endDate: '2022', location: 'Munich', description: '' },
  ],
}

describe('renderComposite', () => {
  it('iterates a profile array (employment history, Section 18)', () => {
    const template = '{{#workHistory}}{{title}} — {{company}} ({{startDate}}–{{endDate}})\n{{/workHistory}}'
    const r = renderComposite(template, profile)
    expect(r.text).toBe('Senior Dev — Acme (2022–Present)\nDev — Globex (2019–2022)')
    expect(r.empty).toBe(false)
  })

  it('reports empty when the iterated array has no items', () => {
    const r = renderComposite('{{#education}}{{degree}}{{/education}}', profile)
    expect(r.empty).toBe(true)
    expect(r.text).toBe('')
  })

  it('interpolates direct profile refs', () => {
    const r = renderComposite('{{profile.firstName}} {{profile.lastName}}', profile)
    expect(r.text).toBe('Ada Lovelace')
    expect(r.empty).toBe(false)
  })

  it('flags pure-interpolation templates with missing data as empty', () => {
    const r = renderComposite('{{profile.pronouns}}', profile)
    expect(r.empty).toBe(true)
  })

  it('leaves page-context variables for the resolver', () => {
    const r = renderComposite('At {{company}}: {{profile.firstName}}', profile)
    expect(r.text).toBe('At {{company}}: Ada')
  })
})
