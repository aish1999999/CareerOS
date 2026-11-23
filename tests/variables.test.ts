import { describe, expect, it } from 'vitest'
import { detectVariables, resolveVariables } from '@/content/variables'
import { defaultProfile } from '@/lib/schema'
import type { PageContext } from '@/types'

const context: PageContext = {
  company: 'Acme Corp',
  role: 'Frontend Engineer',
  location: 'Berlin',
  source: 'jsonld',
}

describe('detectVariables', () => {
  it('finds unique variables', () => {
    expect(detectVariables('I love {{company}} and {{ role }} at {{company}}')).toEqual([
      'company',
      'role',
    ])
  })
  it('finds profile refs', () => {
    expect(detectVariables('{{profile.firstName}}')).toEqual(['profile.firstName'])
  })
  it('returns empty for plain text', () => {
    expect(detectVariables('no variables here')).toEqual([])
  })
})

describe('resolveVariables', () => {
  const profile = { ...defaultProfile(), firstName: 'Ada' }

  it('substitutes page context', () => {
    const r = resolveVariables('Why {{company}} for the {{role}} role in {{location}}?', {
      context,
      profile,
    })
    expect(r.text).toBe('Why Acme Corp for the Frontend Engineer role in Berlin?')
    expect(r.unresolved).toEqual([])
  })

  it('supports jobTitle as an alias of role', () => {
    const r = resolveVariables('{{jobTitle}}', { context, profile })
    expect(r.text).toBe('Frontend Engineer')
  })

  it('resolves profile refs and today', () => {
    const r = resolveVariables('{{profile.firstName}} on {{today}}', {
      context,
      profile,
      today: () => '01/02/2026',
    })
    expect(r.text).toBe('Ada on 01/02/2026')
  })

  it('reports unresolved variables and leaves braces intact', () => {
    const empty: PageContext = { company: null, role: null, location: null, source: 'none' }
    const r = resolveVariables('I admire {{company}}', { context: empty, profile })
    expect(r.unresolved).toEqual(['company'])
    expect(r.text).toBe('I admire {{company}}')
  })

  it('prefers session overrides (per-application answers)', () => {
    const session = new Map([['company', 'Globex']])
    const r = resolveVariables('{{company}}', { context, profile, session })
    expect(r.text).toBe('Globex')
  })

  it('treats empty profile values as unresolved', () => {
    const r = resolveVariables('{{profile.noticePeriod}}', { context, profile })
    expect(r.unresolved).toEqual(['profile.noticePeriod'])
  })
})
