import { beforeEach, describe, expect, it } from 'vitest'
import { resetChromeMock, seedChromeStorage } from './setup'
import { getStore } from '@/lib/storage'
import { SCHEMA_VERSION } from '@/lib/schema'

// ---------------------------------------------------------------------------
// v6 → v7 (2026-07-16 poisoned-capture cleanup): entries replicate the real
// corrupted live store — misattributed captures had glued neighboring
// widgets' labels onto unrelated entries as aliases, saved opaque Workday
// option ids as answers, and kept brand-strip fragments active.
// ---------------------------------------------------------------------------

const entry = (over: Record<string, unknown>) => ({
  id: 'x',
  question: 'q',
  aliases: [],
  answer: 'a',
  answerType: 'text',
  answerTemplate: null,
  mapsTo: null,
  variables: [],
  personas: [],
  tags: [],
  fieldType: 'text',
  options: [],
  status: 'active',
  source: 'captured',
  captureContext: null,
  createdAt: 1,
  updatedAt: 1,
  ...over,
})

beforeEach(() => resetChromeMock())

describe('v6 → v7 migration (poisoned-capture cleanup)', () => {
  it('cleans the four live corruption shapes, leaves healthy entries alone', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 6,
      qa: [
        // 1. the school→disability poison: cross-EEO alias stripped
        entry({
          id: 'disability',
          question: 'Disability ',
          aliases: ['School or University*'],
          answer: 'No, I do not have a disability and have not had one in the past',
        }),
        // …reverse direction too: EEO alias on a non-EEO question
        entry({
          id: 'veteran',
          question:
            'Do you identify as one of the following protected veterans (Disabled Veteran…)?',
          aliases: ['Degree*'],
          answer: 'I AM NOT A VETERAN',
        }),
        // 2. opaque Workday option id as an answer: entry dropped
        entry({ id: 'hex', question: 'state', aliases: ['State*'], answer: 'fc77e3a1ab36487f9646d14f7242dd77' }),
        entry({ id: 'uuid', question: 'device', answer: '123e4567-e89b-12d3-a456-426614174000' }),
        // 3. placeholder-text alias stripped
        entry({ id: 'placeholder', question: 'minimum educational requirement', aliases: ['Yes Required'], answer: 'Yes' }),
        // 4. brand-strip fragment answer: re-gated for review
        entry({
          id: 'fragment',
          question: 'Are you currently or have you previously worked with ',
          aliases: ['How Did You Hear About Us?*'],
          answer: 'I have never worked for ',
        }),
        // healthy learned entry: untouched
        entry({
          id: 'healthy',
          question: 'How Did You Hear About Us?',
          aliases: ['How Did You Hear About Us?*', 'Source*'],
          answer: 'Company Website',
        }),
        // healthy same-topic EEO aliases: untouched
        entry({
          id: 'eeo-ok',
          question: 'Disability status',
          aliases: ['Do you have a disability?'],
          answer: 'No',
        }),
        // curated entry with a hex-looking answer: NOT dropped (learned-only rule)
        entry({ id: 'curated-hex', source: 'import', question: 'license key', answer: 'abcdefabcdefabcdefabcdef' }),
      ],
      settings: {},
    })
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    const byId = new Map(store.qa.map((e) => [e.id, e]))

    expect(byId.get('disability')!.aliases).toEqual([])
    expect(byId.get('disability')!.answer).toContain('do not have a disability')
    expect(byId.get('veteran')!.aliases).toEqual([])

    expect(byId.has('hex')).toBe(false)
    expect(byId.has('uuid')).toBe(false)

    expect(byId.get('placeholder')!.aliases).toEqual([])

    expect(byId.get('fragment')!.status).toBe('needs_review')
    expect(byId.get('fragment')!.reviewNote).toContain('truncated fragment')

    expect(byId.get('healthy')!.aliases).toEqual(['How Did You Hear About Us?*', 'Source*'])
    expect(byId.get('healthy')!.status).toBe('active')
    expect(byId.get('eeo-ok')!.aliases).toEqual(['Do you have a disability?'])

    expect(byId.has('curated-hex')).toBe(true)
  })
})
