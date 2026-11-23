import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fillCustomDropdown } from '@/content/autofill'
import { semanticCascadePath, setSemanticCascader } from '@/content/matcher'
import { parseJudgePath } from '@/lib/judge-text'
import type { CascadeCategory } from '@/types'

// ---------------------------------------------------------------------------
// Hierarchical "How did you hear about us?" cascade (2026-07-16): when the
// stored answer matches no sub-option lexically (or there is no stored answer
// at all), the full category → sub-option tree is harvested and ONE judge
// call picks the primary + sub-option combination. Per-level matching had to
// commit to a category blind; the cascade judge weighs both levels together.
// ---------------------------------------------------------------------------

const TREE: Record<string, string[]> = {
  'Social Media': ['LinkedIn', 'X (Twitter)'],
  'Job Boards': ['Indeed', 'Monster'],
}

/** Workday-style prompt: top level shows expandable categories; clicking one
 *  replaces the list with its children. Reopening restarts at the top. */
function renderPrompt(chosen: { value: string }, tree: Record<string, string[]> = TREE): HTMLElement {
  const combo = document.createElement('div')
  combo.setAttribute('role', 'combobox')
  document.body.appendChild(combo)
  let list: HTMLElement | null = null
  const renderList = (items: string[], expandable: boolean) => {
    list?.remove()
    list = document.createElement('ul')
    list.setAttribute('role', 'listbox')
    for (const text of items) {
      const li = document.createElement('li')
      li.setAttribute('role', 'option')
      if (expandable) li.setAttribute('aria-haspopup', 'true')
      li.textContent = text
      li.addEventListener('click', () => {
        if (expandable) {
          setTimeout(() => renderList(tree[text], false), 50)
        } else {
          chosen.value = text
          list?.remove()
          list = null
        }
      })
      list!.appendChild(li)
    }
    document.body.appendChild(list!)
  }
  combo.addEventListener('click', () => {
    setTimeout(() => renderList(Object.keys(tree), true), 50)
  })
  combo.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') {
      list?.remove()
      list = null
    }
  })
  return combo
}

describe('hierarchical cascade judge (primary + sub-option in one call)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    setSemanticCascader(null)
  })

  it('harvests the full tree and clicks the judged (category, sub-option) pair', async () => {
    const chosen = { value: '' }
    const combo = renderPrompt(chosen)
    const cascader = vi.fn(
      async (_q: string, _a: string, _f: string, categories: CascadeCategory[]) => {
        const category = categories.findIndex((c) => c.label === 'Social Media')
        return { category, option: categories[category].options.indexOf('LinkedIn') }
      },
    )
    setSemanticCascader(cascader)
    // "Professional networking site" matches NO category or leaf lexically —
    // only the cascade judge can bridge it to Social Media → LinkedIn.
    const result = await fillCustomDropdown(combo, 'Professional networking site', [], null, [], {
      question: 'How did you hear about us?',
      factSheet: '',
    })
    expect(result.outcome).toBe('filled')
    expect(result.filledText).toBe('LinkedIn')
    expect(chosen.value).toBe('LinkedIn')
    // ONE call, carrying the whole harvested hierarchy + the anchors
    expect(cascader).toHaveBeenCalledTimes(1)
    const [question, answer, , categories] = cascader.mock.calls[0]
    expect(question).toBe('How did you hear about us?')
    expect(answer).toBe('Professional networking site')
    expect(categories).toEqual([
      { label: 'Social Media', options: ['LinkedIn', 'X (Twitter)'] },
      { label: 'Job Boards', options: ['Indeed', 'Monster'] },
    ])
  }, 20_000)

  it('inference (no stored answer) now explores and fills via the cascade', async () => {
    const chosen = { value: '' }
    const combo = renderPrompt(chosen)
    setSemanticCascader(async () => ({ category: 1, option: 0 })) // Job Boards → Indeed
    const result = await fillCustomDropdown(combo, '', [], null, [], {
      question: 'How did you hear about us?',
      factSheet: 'Q: How did you hear about us? → A: found the posting on Indeed',
    })
    expect(result.outcome).toBe('filled')
    expect(result.filledText).toBe('Indeed')
    expect(chosen.value).toBe('Indeed')
  }, 20_000)

  it('judge declines → honest failed, nothing clicked', async () => {
    const chosen = { value: '' }
    const combo = renderPrompt(chosen)
    setSemanticCascader(async () => null)
    const result = await fillCustomDropdown(combo, 'Professional networking site', [], null, [], {
      question: 'How did you hear about us?',
      factSheet: '',
    })
    expect(result.outcome).toBe('failed')
    expect(result.filledText).toBeNull()
    expect(chosen.value).toBe('')
  }, 20_000)

  it('lexical sub-option match still wins without consulting the judge', async () => {
    const chosen = { value: '' }
    const combo = renderPrompt(chosen)
    const cascader = vi.fn(async () => ({ category: 0, option: 0 }))
    setSemanticCascader(cascader)
    const result = await fillCustomDropdown(combo, 'Indeed', [], null, [], {
      question: 'How did you hear about us?',
      factSheet: '',
    })
    expect(result.outcome).toBe('filled')
    expect(chosen.value).toBe('Indeed')
    expect(cascader).not.toHaveBeenCalled()
  }, 20_000)

  it('without a cascade judge, pure inference never probes categories', async () => {
    const chosen = { value: '' }
    const combo = renderPrompt(chosen)
    let subLevelOpened = false
    combo.addEventListener('click', () => {
      setTimeout(() => {
        subLevelOpened ||= [...document.querySelectorAll('[role="option"]')].some(
          (o) => o.textContent === 'LinkedIn',
        )
      }, 200)
    })
    const result = await fillCustomDropdown(combo, '', [], null, [], {
      question: 'How did you hear about us?',
      factSheet: 'facts',
    })
    expect(result.outcome).toBe('failed')
    expect(chosen.value).toBe('')
    expect(subLevelOpened).toBe(false)
  }, 20_000)
})

describe('network-fetched sub-levels (live bug: primary fills, sub-option never seen)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  /** Workday panel swap: the category click removes the list IMMEDIATELY and
   *  the sub-options render only after a network fetch (~1s here — past the
   *  old 600ms watch, which read the empty gap as "selection committed"). */
  function renderSlowPrompt(chosen: { value: string }, leaves: string[], fetchMs: number): HTMLElement {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    document.body.appendChild(combo)
    let list: HTMLElement | null = null
    const renderList = (items: string[], expandable: boolean) => {
      list?.remove()
      list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      for (const text of items) {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        if (expandable) li.setAttribute('aria-haspopup', 'true')
        li.textContent = text
        li.addEventListener('click', () => {
          if (expandable) {
            list?.remove() // panel swap: old options vanish NOW…
            list = null
            setTimeout(() => renderList(leaves, false), fetchMs) // …children arrive later
          } else {
            chosen.value = text
            list?.remove()
            list = null
          }
        })
        list!.appendChild(li)
      }
      document.body.appendChild(list!)
    }
    combo.addEventListener('click', () => setTimeout(() => renderList(['Company Website'], true), 50))
    combo.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        list?.remove()
        list = null
      }
    })
    return combo
  }

  const context = { company: 'Novonesis', role: null, location: null, source: 'adapter' as const }

  it('waits through the panel swap and clicks the company-domain leaf', async () => {
    const chosen = { value: '' }
    const combo = renderSlowPrompt(chosen, ['novonesis.com', 'agency-partners.com'], 1000)
    const result = await fillCustomDropdown(combo, 'Website', [], context)
    expect(result.outcome).toBe('filled')
    expect(result.filledText).toBe('novonesis.com')
    expect(chosen.value).toBe('novonesis.com')
  }, 20_000)

  it('never reports filled on the primary alone when the sub-level yields no pick', async () => {
    const chosen = { value: '' }
    const combo = renderSlowPrompt(chosen, ['globex.com', 'initech.com'], 1000)
    const result = await fillCustomDropdown(combo, 'Website', [], context)
    expect(result.outcome).toBe('failed') // two unbranded leaves — no guessing
    expect(chosen.value).toBe('')
  }, 20_000)
})

describe('semanticCascadePath validation', () => {
  afterEach(() => setSemanticCascader(null))

  const categories: CascadeCategory[] = [
    { label: 'Social Media', options: ['LinkedIn', 'X (Twitter)'] },
    { label: 'Job Boards', options: ['Select One', 'Indeed'] },
  ]

  it('returns navigable texts for a valid pick', async () => {
    setSemanticCascader(async () => ({ category: 1, option: 1 }))
    await expect(semanticCascadePath('How did you hear?', 'Indeed', '', categories)).resolves.toEqual({
      categoryText: 'Job Boards',
      optionText: 'Indeed',
    })
  })

  it('rejects out-of-range replies', async () => {
    setSemanticCascader(async () => ({ category: 5, option: 0 }))
    expect(await semanticCascadePath('q', 'a', '', categories)).toBeNull()
    setSemanticCascader(async () => ({ category: 0, option: 9 }))
    expect(await semanticCascadePath('q', 'a', '', categories)).toBeNull()
  })

  it('rejects placeholder leaves and refuses to run unanchored', async () => {
    setSemanticCascader(async () => ({ category: 1, option: 0 })) // "Select One"
    expect(await semanticCascadePath('q', 'a', '', categories)).toBeNull()
    setSemanticCascader(async () => ({ category: 0, option: 0 }))
    expect(await semanticCascadePath('q', '', '', categories)).toBeNull() // no answer, no facts
    expect(await semanticCascadePath('', 'a', '', categories)).toBeNull() // no question
  })

  it('declines quietly when the seam is unset or throws', async () => {
    expect(await semanticCascadePath('q', 'a', '', categories)).toBeNull()
    setSemanticCascader(async () => {
      throw new Error('network')
    })
    expect(await semanticCascadePath('q', 'a', '', categories)).toBeNull()
  })
})

describe('parseJudgePath', () => {
  it('parses "category.sub" into 0-based indices', () => {
    expect(parseJudgePath('2.3')).toEqual({ category: 1, option: 2 })
    expect(parseJudgePath('Answer: 2.3.')).toEqual({ category: 1, option: 2 })
    expect(parseJudgePath('1,2')).toEqual({ category: 0, option: 1 })
  })

  it('rejects declines, lone numbers, and junk', () => {
    expect(parseJudgePath('0')).toBeNull()
    expect(parseJudgePath('2')).toBeNull()
    expect(parseJudgePath('none')).toBeNull()
    expect(parseJudgePath(null)).toBeNull()
    expect(parseJudgePath('0.0')).toBeNull() // 0 is the decline sentinel, not an index
  })
})
