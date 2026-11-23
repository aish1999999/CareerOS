import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_STORED_REPORTS,
  VALIDATION_KEY,
  loadValidationReport,
  loadValidationReports,
  saveValidationReport,
  type StoredValidationReport,
} from '@/lib/validation-report'
import { resetChromeMock, seedChromeStorage } from './setup'

// ---------------------------------------------------------------------------
// Validation report store: the Validate button's durable "somewhere safe" —
// own storage key, tolerant reads, newest-first with same-URL replacement.
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetChromeMock()
})

function report(overrides: Partial<StoredValidationReport> = {}): StoredValidationReport {
  return {
    url: 'https://jobs.example.com/apply/1',
    at: 1000,
    summary: { ok: 3, wrong: 0, missingAnswerable: 1, missingUnanswered: 2, skipped: 0 },
    entries: [
      {
        fieldId: 'ff-1',
        label: 'How did you hear about us?',
        kind: 'select',
        verdict: 'missing-answerable',
        required: false,
        normalizedQuestion: 'how did you hear about us',
        options: ['LinkedIn', 'Referral'],
        sectionContext: '',
        eeoLike: false,
        consentLike: false,
      },
    ],
    ...overrides,
  }
}

describe('validation report store', () => {
  it('round-trips a saved report', async () => {
    await saveValidationReport(report())
    const loaded = await loadValidationReport('https://jobs.example.com/apply/1')
    expect(loaded?.entries[0].label).toBe('How did you hear about us?')
    expect(loaded?.summary.missingAnswerable).toBe(1)
    expect(await loadValidationReport('https://elsewhere.example.com')).toBeNull()
  })

  it('re-validating the same page replaces its report instead of stacking', async () => {
    await saveValidationReport(report({ at: 1000 }))
    await saveValidationReport(report({ at: 2000 }))
    const all = await loadValidationReports()
    expect(all).toHaveLength(1)
    expect(all[0].at).toBe(2000)
  })

  it('keeps only the newest reports, newest first', async () => {
    for (let i = 0; i < MAX_STORED_REPORTS + 3; i++) {
      await saveValidationReport(report({ url: `https://jobs.example.com/apply/${i}`, at: i }))
    }
    const all = await loadValidationReports()
    expect(all).toHaveLength(MAX_STORED_REPORTS)
    expect(all[0].url).toBe(`https://jobs.example.com/apply/${MAX_STORED_REPORTS + 2}`)
  })

  it('tolerates corrupt payloads — a report is always regenerable', async () => {
    seedChromeStorage(VALIDATION_KEY, { reports: 'not-an-array' })
    expect(await loadValidationReports()).toEqual([])
    seedChromeStorage(VALIDATION_KEY, { reports: [{ nonsense: true }, report()] })
    expect(await loadValidationReports()).toHaveLength(1)
  })
})
