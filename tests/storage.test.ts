import { beforeEach, describe, expect, it } from 'vitest'
import { resetChromeMock, seedChromeStorage } from './setup'
import {
  clearAll,
  deleteQA,
  exportData,
  getStore,
  importData,
  pendingReviewCount,
  updateSettings,
  upsertQA,
} from '@/lib/storage'
import { defaultStore, validateImport, SCHEMA_VERSION } from '@/lib/schema'
import type { QAEntry } from '@/types'

const entry: QAEntry = {
  id: 'e1',
  question: 'Why here?',
  aliases: [],
  answer: 'Because.',
  answerType: 'text',
  answerTemplate: null,
  mapsTo: null,
  variables: [],
  personas: [],
  tags: [],
  fieldType: 'text',
  options: [],
  status: 'active',
  source: 'training',
  captureContext: null,
  createdAt: 1,
  updatedAt: 1,
}

beforeEach(() => resetChromeMock())

describe('getStore', () => {
  it('returns complete defaults for an empty storage', async () => {
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    expect(store.settings.autoFillThreshold).toBe(0.85)
    expect(store.settings.suggestThreshold).toBe(0.6)
    expect(store.qa).toEqual([])
    expect(store.profile.firstName).toBe('')
  })

  it('migrates v1 data to the current version without losing entries', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 1,
      profile: { firstName: 'Ada' },
      qa: [{ id: 'old', question: 'Q?', answer: 'A' }],
      settings: {},
    })
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    expect(store.profile.firstName).toBe('Ada')
    expect(store.qa[0]).toMatchObject({ id: 'old', status: 'active', source: 'import', personas: [] })
  })

  it('migrates v2 data to v3: entries gain options, store gains optionSets', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 2,
      profile: { firstName: 'Ada' },
      qa: [{ id: 'old', question: 'Q?', answer: 'A', status: 'active', source: 'training' }],
      settings: {},
    })
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    expect(store.qa[0].options).toEqual([])
    expect(store.optionSets).toEqual([])
  })

  it('migrates v3 data to v4: enabledDomains gains new ATS defaults, keeps user entries, no dupes', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 3,
      profile: {},
      qa: [],
      settings: { enabledDomains: ['jobs.lever.co', 'careers.example.com'] },
    })
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    expect(store.settings.enabledDomains).toContain('careers.example.com') // user entry kept
    expect(store.settings.enabledDomains).toContain('successfactors.eu') // new default added
    expect(store.settings.enabledDomains).toContain('jobs.ashbyhq.com')
    expect(
      store.settings.enabledDomains.filter((d) => d === 'jobs.lever.co'),
    ).toHaveLength(1) // union, not duplication
  })

  it('v3→v4 tolerates a store with no settings object', async () => {
    seedChromeStorage('flashfiller', { schemaVersion: 3, profile: {}, qa: [] })
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    expect(store.settings.enabledDomains).toContain('successfactors.eu')
  })

  it('migrates v4 data to v5: free-text dates become YYYY-MM, "Present" becomes empty', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 4,
      profile: {
        workHistory: [
          { company: 'McWane', title: 'IE', startDate: 'January 2026', endDate: 'Present', location: '', description: '' },
          { company: 'IIT', title: 'RA', startDate: '01/2023', endDate: 'December 2023', location: '', description: '' },
        ],
        education: [
          { institution: 'UH', degree: 'MS', field: 'IE', startDate: '', endDate: 'May 2026' },
        ],
      },
      qa: [],
      settings: {},
    })
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    expect(store.profile.workHistory[0].startDate).toBe('2026-01')
    expect(store.profile.workHistory[0].endDate).toBe('') // Present → current
    expect(store.profile.workHistory[1].startDate).toBe('2023-01')
    expect(store.profile.workHistory[1].endDate).toBe('2023-12')
    expect(store.profile.education[0].endDate).toBe('2026-05')
  })
})

describe('qa CRUD', () => {
  it('upserts and deletes entries', async () => {
    await upsertQA(entry)
    await upsertQA({ ...entry, answer: 'Updated.' })
    let store = await getStore()
    expect(store.qa).toHaveLength(1)
    expect(store.qa[0].answer).toBe('Updated.')
    await deleteQA('e1')
    store = await getStore()
    expect(store.qa).toHaveLength(0)
  })

  it('counts pending review entries', async () => {
    await upsertQA(entry)
    await upsertQA({ ...entry, id: 'e2', status: 'needs_review' })
    expect(pendingReviewCount(await getStore())).toBe(1)
  })
})

describe('settings', () => {
  it('patches without clobbering the rest', async () => {
    await updateSettings({ autoFillThreshold: 0.9 })
    const store = await getStore()
    expect(store.settings.autoFillThreshold).toBe(0.9)
    expect(store.settings.suggestThreshold).toBe(0.6)
  })
})

describe('import/export (Section 9)', () => {
  it('round-trips losslessly', async () => {
    await upsertQA(entry)
    await updateSettings({ personas: ['backend'] })
    const exported = await exportData()
    await clearAll()
    const validated = validateImport(JSON.parse(JSON.stringify(exported)))
    expect(validated.ok).toBe(true)
    await importData(validated.data!, 'replace')
    const store = await getStore()
    expect(store.qa).toEqual(exported.qa)
    expect(store.settings).toEqual(exported.settings)
    expect(store.profile).toEqual(exported.profile)
  })

  it('merge updates matching ids and appends new', async () => {
    await upsertQA(entry)
    await importData({ qa: [{ ...entry, answer: 'new' }, { ...entry, id: 'e2' }] }, 'merge')
    const store = await getStore()
    expect(store.qa).toHaveLength(2)
    expect(store.qa.find((e) => e.id === 'e1')!.answer).toBe('new')
  })

  it('rejects malformed entries individually with reasons', () => {
    const result = validateImport({
      qa: [entry, { question: '' }, 'not-an-object'],
    })
    expect(result.ok).toBe(true)
    expect(result.data!.qa).toHaveLength(1)
    expect(result.rejected).toHaveLength(2)
    expect(result.rejected[0].reason).toBeTruthy()
  })

  it('rejects non-object payloads with a clear message', () => {
    const result = validateImport([1, 2, 3])
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('JSON object')
  })
})

describe('clearAll (Section 13)', () => {
  it('deletes everything', async () => {
    await upsertQA(entry)
    await clearAll()
    const store = await getStore()
    expect(store).toEqual(defaultStore())
  })
})
