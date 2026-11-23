import type { Profile, QAEntry, SeedCatalog, SeedQuestion, Settings } from '@/types'
import { SeedCatalogSchema } from '@/lib/schema'

// ---------------------------------------------------------------------------
// Bundled read-only seed catalog (Sections 2, 9, 10). The training flow reads
// this and writes only ANSWERED questions into the user's qa store. Blank
// seed entries never land in qa.
// ---------------------------------------------------------------------------

let cache: SeedCatalog | null = null

export async function loadSeedCatalog(): Promise<SeedCatalog> {
  if (cache) return cache
  const url = chrome.runtime.getURL('seed-questions.json')
  const response = await fetch(url)
  const raw = await response.json()
  cache = SeedCatalogSchema.parse(raw) as SeedCatalog
  return cache
}

/** Deterministic qa id for a training answer to a seed question, so
 *  re-answering updates the same entry instead of duplicating it. */
export function seedEntryId(seedId: string, persona: string | null): string {
  return persona ? `seed-${seedId}--${persona}` : `seed-${seedId}`
}

/** Read a dotted path like "profile.address.city" against { profile }. */
export function readProfilePath(profile: Profile, path: string): string {
  const parts = path.replace(/^profile\./, '').split('.')
  let value: unknown = profile
  for (const part of parts) {
    if (typeof value !== 'object' || value === null) return ''
    value = (value as Record<string, unknown>)[part]
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined) return ''
  return String(value)
}

export type SeedCoverage =
  | 'answered' // user wrote an answer during training (qa entry exists)
  | 'covered' // profile/composite seed resolvable from a filled profile
  | 'unanswered'
  | 'suppressed' // user marked "Not applicable"

export interface SeedStatus {
  seed: SeedQuestion
  coverage: SeedCoverage
}

/** Does a composite seed's template have the profile data it iterates over? */
export function compositeSeedCovered(seed: SeedQuestion, profile: Profile): boolean {
  const template = seed.answerTemplate ?? ''
  const section = template.match(/\{\{#(\w+)\}\}/)
  if (section) {
    const arr = (profile as unknown as Record<string, unknown>)[section[1]]
    return Array.isArray(arr) && arr.length > 0
  }
  // Pure interpolation template (e.g. "{{profile.firstName}} {{profile.lastName}}")
  const refs = [...template.matchAll(/\{\{\s*(profile\.[\w.]+)\s*\}\}/g)].map((m) => m[1])
  return refs.length > 0 && refs.every((ref) => readProfilePath(profile, ref) !== '')
}

/**
 * Compute coverage for every seed question given the user's store. Training
 * UI and onboarding progress are both driven by this.
 */
export function seedStatuses(
  catalog: SeedCatalog,
  qa: QAEntry[],
  profile: Profile,
  settings: Settings,
  persona: string | null,
): SeedStatus[] {
  const answeredIds = new Set<string>()
  for (const entry of qa) {
    for (const tag of entry.tags) {
      if (tag.startsWith('seed:')) answeredIds.add(tag.slice(5))
    }
  }
  return catalog.questions.map((seed) => {
    let coverage: SeedCoverage = 'unanswered'
    if (settings.suppressedSeedIds.includes(seed.id)) {
      coverage = 'suppressed'
    } else if (
      answeredIds.has(seed.id) ||
      qa.some((e) => e.id === seedEntryId(seed.id, persona) || e.id === seedEntryId(seed.id, null))
    ) {
      coverage = 'answered'
    } else if (seed.answerType === 'profile') {
      coverage = seed.mapsTo && readProfilePath(profile, seed.mapsTo) !== '' ? 'covered' : 'unanswered'
    } else if (seed.answerType === 'composite') {
      coverage = compositeSeedCovered(seed, profile) ? 'covered' : 'unanswered'
    }
    return { seed, coverage }
  })
}

/** The free-text seeds still needing an answer — the training queue. */
export function trainingQueue(statuses: SeedStatus[], category?: string): SeedQuestion[] {
  return statuses
    .filter(
      (s) =>
        s.coverage === 'unanswered' &&
        s.seed.answerType === 'freeText' &&
        (!category || s.seed.category === category),
    )
    .map((s) => s.seed)
}
