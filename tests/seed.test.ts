import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SeedCatalogSchema, defaultProfile, defaultSettings } from '@/lib/schema'
import { seedEntryId, seedStatuses, trainingQueue } from '@/lib/seed'
import { buildTrainingEntry } from '@/ui/components/TrainingTab'
import type { SeedCatalog } from '@/types'

const catalogPath = resolve(process.cwd(), 'public/seed-questions.json')
const catalog = SeedCatalogSchema.parse(JSON.parse(readFileSync(catalogPath, 'utf-8'))) as SeedCatalog

describe('bundled seed catalog (Section 9)', () => {
  it('validates against the schema', () => {
    expect(catalog.questions.length).toBeGreaterThanOrEqual(50)
    expect(catalog.categories.length).toBeGreaterThan(0)
  })

  it('every profile seed maps to a real profile path', () => {
    const profileSeeds = catalog.questions.filter((q) => q.answerType === 'profile')
    expect(profileSeeds.length).toBeGreaterThan(0)
    for (const seed of profileSeeds) expect(seed.mapsTo).toMatch(/^profile\./)
  })

  it('yes/no eligibility seeds map to profile booleans', () => {
    const workAuth = catalog.questions.find((q) => q.id === 'work-auth')!
    expect(workAuth.mapsTo).toBe('profile.authorizedToWork')
    const prevEmployed = catalog.questions.find((q) => q.id === 'prev-employed')!
    expect(prevEmployed.answerType).toBe('profile')
    expect(prevEmployed.mapsTo).toBe('profile.previouslyEmployedHere')
  })

  it('EEO seeds auto-fill from the profile EEO answers', () => {
    const eeoSeeds = catalog.questions.filter((q) => q.category === 'voluntary_eeo')
    // 4 core profile-mapped seeds + extended demographics (freeText, answered
    // via the import file — pronouns/orientation/first-gen/age-range)
    const profileMapped = eeoSeeds.filter((q) => q.answerType === 'profile')
    expect(profileMapped.length).toBe(4)
    for (const seed of profileMapped) {
      expect(seed.autofillByDefault).toBe(true)
      expect(seed.mapsTo).toMatch(/^profile\.eeo\./)
    }
    for (const seed of eeoSeeds) expect(['profile', 'freeText']).toContain(seed.answerType)
  })
})

describe('seedStatuses (Sections 2/10)', () => {
  it('marks profile seeds covered once the profile is filled', () => {
    const profile = { ...defaultProfile(), firstName: 'Ada' }
    const statuses = seedStatuses(catalog, [], profile, defaultSettings(), null)
    const firstName = statuses.find((s) => s.seed.id === 'first-name')!
    expect(firstName.coverage).toBe('covered')
    const email = statuses.find((s) => s.seed.id === 'email')
    if (email) expect(email.coverage).toBe('unanswered')
  })

  it('marks answered seeds via training entries and suppressed via settings', () => {
    const seed = catalog.questions.find((q) => q.answerType === 'freeText')!
    const entry = buildTrainingEntry(seed, 'My answer', null, 1)
    expect(entry.id).toBe(seedEntryId(seed.id, null))
    expect(entry.status).toBe('active')
    expect(entry.source).toBe('training')
    expect(entry.tags).toContain(`seed:${seed.id}`)

    const settings = { ...defaultSettings(), suppressedSeedIds: [catalog.questions[1].id] }
    const statuses = seedStatuses(catalog, [entry], defaultProfile(), settings, null)
    expect(statuses.find((s) => s.seed.id === seed.id)!.coverage).toBe('answered')
    expect(statuses.find((s) => s.seed.id === catalog.questions[1].id)!.coverage).toBe('suppressed')
  })

  it('training queue contains only unanswered freeText seeds', () => {
    const statuses = seedStatuses(catalog, [], defaultProfile(), defaultSettings(), null)
    const queue = trainingQueue(statuses)
    expect(queue.length).toBeGreaterThan(0)
    for (const seed of queue) expect(seed.answerType).toBe('freeText')
  })

  it('persona-specific training answers produce persona-tagged entries', () => {
    const seed = catalog.questions.find((q) => q.answerType === 'freeText')!
    const entry = buildTrainingEntry(seed, 'Frontend take', 'frontend', 1)
    expect(entry.personas).toEqual(['frontend'])
    expect(entry.id).toBe(seedEntryId(seed.id, 'frontend'))
  })
})
