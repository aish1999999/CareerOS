import { beforeEach, describe, expect, it } from 'vitest'
import { resetChromeMock, seedChromeStorage } from './setup'
import { getStore, patchQA, upsertQA } from '@/lib/storage'
import { SCHEMA_VERSION } from '@/lib/schema'

// ---------------------------------------------------------------------------
// v5 → v6 (2026-07-16 learned-answer rebuild): capture loop force-enabled
// once, legacy LEARNED entries re-quarantined through the review gate,
// curated entries untouched; plus patchQA read-modify-write.
// ---------------------------------------------------------------------------

const legacyEntry = (id: string, source: string, status = 'active') => ({
  id,
  question: `question ${id}`,
  aliases: [],
  answer: 'answer',
  answerType: 'text',
  answerTemplate: null,
  mapsTo: null,
  variables: [],
  personas: [],
  tags: [],
  fieldType: 'text',
  options: [],
  status,
  source,
  captureContext: null,
  createdAt: 1,
  updatedAt: 1,
})

beforeEach(() => resetChromeMock())

describe('v5 → v6 migration', () => {
  it('re-quarantines active learned entries, leaves curated ones alone', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 5,
      qa: [
        legacyEntry('cap', 'captured'),
        legacyEntry('inf', 'inferred'),
        legacyEntry('imp', 'import'),
        legacyEntry('trn', 'training'),
        legacyEntry('rev', 'captured', 'needs_review'),
      ],
      settings: { captureLoopEnabled: false },
    })
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    const byId = new Map(store.qa.map((e) => [e.id, e]))
    expect(byId.get('cap')!.status).toBe('needs_review')
    expect(byId.get('cap')!.reviewNote).toContain('before the review gate')
    expect(byId.get('inf')!.status).toBe('needs_review')
    expect(byId.get('imp')!.status).toBe('active')
    expect(byId.get('trn')!.status).toBe('active')
    expect(byId.get('rev')!.status).toBe('needs_review')
  })

  it('force-enables the capture loop once', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 5,
      qa: [],
      settings: { captureLoopEnabled: false },
    })
    const store = await getStore()
    expect(store.settings.captureLoopEnabled).toBe(true)
  })

  it('new-schema fields get zod defaults on parse', async () => {
    seedChromeStorage('flashfiller', { schemaVersion: 5, qa: [legacyEntry('imp', 'import')] })
    const store = await getStore()
    const e = store.qa[0]
    expect(e.siteScope).toBeNull()
    expect(e.reviewNote).toBe('')
    expect(e.lastWrongAt).toBeNull()
    expect(e.okCount).toBe(0)
    expect(e.wrongCount).toBe(0)
  })
})

describe('patchQA', () => {
  it('patches one entry in place without clobbering others', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: SCHEMA_VERSION,
      qa: [legacyEntry('a', 'captured', 'needs_review'), legacyEntry('b', 'import')],
    })
    await patchQA('a', { status: 'active', reviewNote: '', okCount: 2 })
    const store = await getStore()
    const a = store.qa.find((e) => e.id === 'a')!
    expect(a.status).toBe('active')
    expect(a.okCount).toBe(2)
    expect(a.answer).toBe('answer') // untouched fields survive
    expect(store.qa.find((e) => e.id === 'b')!.status).toBe('active')
  })

  it('no-ops on a missing id', async () => {
    seedChromeStorage('flashfiller', { schemaVersion: SCHEMA_VERSION, qa: [legacyEntry('a', 'import')] })
    await patchQA('ghost', { status: 'needs_review' })
    const store = await getStore()
    expect(store.qa).toHaveLength(1)
    expect(store.qa[0].status).toBe('active')
  })

  it('closes the merge/approve write race (last patch wins per field)', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: SCHEMA_VERSION,
      qa: [legacyEntry('a', 'captured', 'needs_review')],
    })
    // Simulate the alias upsert then the approval patch, as fired around one
    // accepted fill — the patch must see the merged entry, not a stale copy.
    const store = await getStore()
    await upsertQA({ ...store.qa[0], aliases: ['new wording'] })
    await patchQA('a', { status: 'active' })
    const after = await getStore()
    expect(after.qa[0].aliases).toEqual(['new wording'])
    expect(after.qa[0].status).toBe('active')
  })
})
