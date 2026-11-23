import { beforeEach, describe, expect, it } from 'vitest'
import { RECENTS_MAX, loadTailorEntries, rememberTailorEntry, withEntry, type TailorEntry } from '@/lib/recents'
import { resetChromeMock, seedChromeStorage } from './setup'

const entry = (over: Partial<TailorEntry> = {}): TailorEntry => ({
  company: 'Acme', role: 'Quality Engineer', jdText: 'Own the CAPA process end to end.',
  url: 'https://boards.greenhouse.io/acme/jobs/7712345', engine: 'v7', domain: '', savedAt: 1,
  ...over,
})

describe('the last-three list', () => {
  it('puts the newest first and never grows past three', () => {
    let list: TailorEntry[] = []
    for (const company of ['One', 'Two', 'Three', 'Four']) {
      list = withEntry(list, entry({ company, savedAt: company.length }))
    }
    expect(list).toHaveLength(RECENTS_MAX)
    expect(list.map((e) => e.company)).toEqual(['Four', 'Three', 'Two'])
  })

  /** A preflight then a real run is ONE posting, and must not spend two of the three slots. */
  it('folds a re-run of the same posting into the entry it already has', () => {
    const first = withEntry([], entry({ savedAt: 1 }))
    const again = withEntry(first, entry({ savedAt: 2 }))
    expect(again).toHaveLength(1)
    expect(again[0].savedAt).toBe(2)
  })

  it('treats a different job description at the same company as a different posting', () => {
    const list = withEntry(withEntry([], entry()), entry({ jdText: 'Run the supplier audits.' }))
    expect(list).toHaveLength(2)
  })

  it('matches a posting whatever the case and spacing of the company and title', () => {
    const list = withEntry(withEntry([], entry()), entry({ company: '  acme ', role: 'quality engineer' }))
    expect(list).toHaveLength(1)
  })
})

describe('the store behind it', () => {
  beforeEach(() => resetChromeMock())

  it('round-trips through chrome.storage, the posting URL with the rest', async () => {
    await rememberTailorEntry({ company: 'Acme', role: 'QE', jdText: 'JD',
      url: 'https://www.linkedin.com/jobs/view/4012345678', engine: 'v7', domain: '' }, 10)
    const saved = await loadTailorEntries()
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ company: 'Acme', role: 'QE', savedAt: 10,
      url: 'https://www.linkedin.com/jobs/view/4012345678' })
  })

  /** Entries stored before the Posting URL box existed still fill the other three in. */
  it('reads an entry saved without a URL as one with no URL, not as junk', async () => {
    seedChromeStorage('flashfiller_tailor_recents_v1', [
      { company: 'Acme', role: 'QE', jdText: 'JD', engine: 'v7', domain: '', savedAt: 3 },
    ])
    const saved = await loadTailorEntries()
    expect(saved).toHaveLength(1)
    expect(saved[0].url).toBe('')
  })

  it('drops junk rather than rendering it, and never throws on a broken store', async () => {
    seedChromeStorage('flashfiller_tailor_recents_v1', [
      { company: 'Acme', role: 'QE', jdText: 'JD', engine: 'v7', domain: '', savedAt: 3 },
      { company: '', role: '', jdText: '', savedAt: 2 },      // nothing to put back in any box
      'not an entry at all',
      { company: 'Beta' },                                     // no savedAt
    ])
    expect(await loadTailorEntries()).toHaveLength(1)
  })

  it('answers with an empty list when there is nothing stored', async () => {
    expect(await loadTailorEntries()).toEqual([])
  })
})
