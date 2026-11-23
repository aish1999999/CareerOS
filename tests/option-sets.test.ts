import { beforeEach, describe, expect, it } from 'vitest'
import { chooseOption } from '@/content/matcher'
import { buildCaptureDraft, mergeOptions } from '@/content/capture'
import { validateImport } from '@/lib/schema'
import { getStore, importData, upsertOptionSet, deleteOptionSet } from '@/lib/storage'
import type { OptionSet, PageContext, SignalBundle } from '@/types'
import { resetChromeMock } from './setup'

// ---------------------------------------------------------------------------
// Option capture + user-classified option sets (Options tab): captured
// entries record the field's full option list, and texts grouped into a set
// are interchangeable when placing an answer onto a form's options.
// ---------------------------------------------------------------------------

const context: PageContext = { company: null, role: null, location: null, source: 'none' }

function signal(overrides: Partial<SignalBundle> = {}): SignalBundle {
  return {
    fieldId: 'f1',
    kind: 'select',
    label: 'Are you authorized to work in the US?',
    placeholder: '',
    autocomplete: '',
    name: '',
    id: '',
    dataAttrs: [],
    required: false,
    options: [
      { value: '', text: 'Select…' },
      { value: '1', text: 'Yes, I am authorized to work in the United States' },
      { value: '2', text: 'No, I am not authorized' },
    ],
    sectionContext: '',
    multiplicityCue: false,
    normalizedQuestion: 'authorized work us',
    rawText: '',
    filled: false,
    consentLike: false,
    eeoLike: false,
    ...overrides,
  }
}

const authSet: OptionSet = {
  id: 'set-auth-yes',
  label: 'Authorized — yes',
  options: ['Yes', 'Yes, I am authorized to work in the United States', 'Authorized'],
}

describe('mergeOptions', () => {
  it('dedupes case-insensitively, first casing wins, trims blanks', () => {
    expect(mergeOptions(['Yes', 'No '], ['yes', '', 'Maybe'])).toEqual(['Yes', 'No', 'Maybe'])
  })
})

describe('buildCaptureDraft records options', () => {
  it('stores every option text the field offered', () => {
    const draft = buildCaptureDraft(signal(), 'Yes, I am authorized to work in the United States', context, 42)
    expect(draft.options).toEqual([
      'Select…',
      'Yes, I am authorized to work in the United States',
      'No, I am not authorized',
    ])
    expect(draft.fieldType).toBe('select')
    expect(draft.status).toBe('needs_review') // review gate (2026-07-16)
  })

  it('records nothing for plain text fields', () => {
    const draft = buildCaptureDraft(signal({ kind: 'text', options: [] }), 'Berlin', context, 42)
    expect(draft.options).toEqual([])
  })
})

describe('chooseOption with option sets', () => {
  const options = [
    { value: '1', text: 'Yes, I am authorized to work in the United States' },
    { value: '2', text: 'No, I am not authorized' },
  ]

  it('places a set member onto its equivalent wording at high confidence', () => {
    const choice = chooseOption(options, 'Authorized', [authSet])
    expect(choice?.value).toBe('1')
    expect(choice?.score).toBeGreaterThanOrEqual(0.95)
  })

  it('still resolves via intent/lexical without sets', () => {
    // "Authorized" alone has no polarity and little lexical overlap with the
    // long wording — the set is what makes this a confident placement.
    const withSets = chooseOption(options, 'Authorized', [authSet])
    const withoutSets = chooseOption(options, 'Authorized', [])
    expect(withSets?.score ?? 0).toBeGreaterThan(withoutSets?.score ?? 0)
  })

  it('exact matches still score 1 (sets never downgrade)', () => {
    const choice = chooseOption(
      [{ value: '1', text: 'Yes' }, { value: '2', text: 'No' }],
      'Yes',
      [authSet],
    )
    expect(choice).toMatchObject({ value: '1', score: 1 })
  })

  it('an explicit user grouping overrides the polarity veto', () => {
    // Pathological but explicit: the user grouped a negative wording with the
    // answer — their classification wins over the heuristic classifier.
    const veto: OptionSet = { id: 's2', label: '', options: ['Yes', 'No, contact my employer'] }
    const choice = chooseOption(
      [{ value: 'x', text: 'No, contact my employer' }],
      'Yes',
      [veto],
    )
    expect(choice?.value).toBe('x')
  })

  it('ignores sets that do not contain the answer', () => {
    const unrelated: OptionSet = { id: 's3', label: '', options: ['Remote', 'Hybrid'] }
    const choice = chooseOption(options, 'Authorized', [unrelated])
    const baseline = chooseOption(options, 'Authorized', [])
    expect(choice?.score ?? 0).toEqual(baseline?.score ?? 0)
  })
})

describe('optionSets storage + import', () => {
  beforeEach(() => resetChromeMock())

  it('upserts and deletes option sets', async () => {
    await upsertOptionSet(authSet)
    await upsertOptionSet({ ...authSet, label: 'renamed' })
    let store = await getStore()
    expect(store.optionSets).toHaveLength(1)
    expect(store.optionSets[0].label).toBe('renamed')
    await deleteOptionSet(authSet.id)
    store = await getStore()
    expect(store.optionSets).toEqual([])
  })

  it('validateImport accepts an optionSets section', () => {
    const result = validateImport({ optionSets: [authSet] })
    expect(result.ok).toBe(true)
    expect(result.data?.optionSets).toHaveLength(1)
  })

  it('merge import upserts option sets by id', async () => {
    await upsertOptionSet(authSet)
    await importData(
      { optionSets: [{ ...authSet, options: ['Yes'] }, { id: 'new', label: 'n', options: [] }] },
      'merge',
    )
    const store = await getStore()
    expect(store.optionSets).toHaveLength(2)
    expect(store.optionSets.find((s) => s.id === authSet.id)?.options).toEqual(['Yes'])
  })
})
