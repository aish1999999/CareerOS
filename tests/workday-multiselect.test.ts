import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectFields } from '@/content/detector'
import { fillCustomDropdown } from '@/content/autofill'
import { matchField, setSemanticChooser } from '@/content/matcher'
import { defaultProfile, defaultSettings } from '@/lib/schema'

// ---------------------------------------------------------------------------
// Live report 2026-07-16 (Workday education page): "Field of Study" is a
// multiselect search-combobox — a bare text input inside a
// [data-automation-id="multiselectInputContainer"] plus an adjacent ☰
// list-icon button. Typing alone renders NOTHING (Workday searches on
// Enter); the popup can also be browsed via the ☰ button; a committed
// choice renders as a PILL in the container while the input clears.
// ---------------------------------------------------------------------------

interface MultiselectWidget {
  input: HTMLInputElement
  container: HTMLElement
  listButton: HTMLElement
  selections: () => string[]
  enterPresses: () => number
}

function workdayMultiselect(
  allOptions: string[],
  { searchWorks = true }: { searchWorks?: boolean } = {},
): MultiselectWidget {
  const wrap = document.createElement('div')
  wrap.setAttribute('data-automation-id', 'formField-fieldOfStudy')
  const label = document.createElement('label')
  label.htmlFor = 'fos-input'
  label.textContent = 'Field of Study'
  const row = document.createElement('div')
  const container = document.createElement('div')
  container.setAttribute('data-automation-id', 'multiselectInputContainer')
  const pillList = document.createElement('div')
  pillList.setAttribute('data-automation-id', 'selectedItemList')
  const input = document.createElement('input')
  input.type = 'text'
  input.id = 'fos-input'
  container.append(pillList, input)
  const listButton = document.createElement('button')
  listButton.setAttribute('aria-haspopup', 'dialog') // icon-only ☰, no text
  const help = document.createElement('button')
  help.setAttribute('aria-label', 'Help')
  row.append(container, listButton, help)
  wrap.append(label, row)
  document.body.appendChild(wrap)

  const chosen: string[] = []
  let enterCount = 0
  let popup: HTMLElement | null = null
  const closePopup = () => {
    popup?.remove()
    popup = null
  }
  const renderPopup = (texts: string[]) => {
    closePopup()
    if (texts.length === 0) return
    popup = document.createElement('ul')
    popup.setAttribute('role', 'listbox')
    for (const text of texts) {
      const li = document.createElement('li')
      li.setAttribute('role', 'option')
      const inner = document.createElement('div')
      inner.textContent = text
      li.appendChild(inner)
      li.addEventListener('click', () => {
        chosen.push(text)
        const pill = document.createElement('span')
        pill.textContent = `${text} ×`
        pillList.appendChild(pill)
        input.value = '' // Workday clears the search box on selection
        // popup STAYS OPEN — multiselects accept further picks
      })
      popup.appendChild(li)
    }
    document.body.appendChild(popup)
  }
  // Typing alone renders nothing; ENTER runs the search (async, like the XHR)
  input.addEventListener('keydown', (e) => {
    const key = (e as KeyboardEvent).key
    if (key === 'Enter') {
      enterCount++
      const q = input.value.trim().toLowerCase()
      if (!searchWorks || !q) return
      setTimeout(() => renderPopup(allOptions.filter((t) => t.toLowerCase().includes(q))), 40)
    } else if (key === 'Escape') {
      closePopup()
    }
  })
  container.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') closePopup()
  })
  listButton.addEventListener('click', () => {
    setTimeout(() => renderPopup(allOptions), 40)
  })
  return {
    input,
    container,
    listButton,
    selections: () => [...chosen],
    enterPresses: () => enterCount,
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => setSemanticChooser(null))

describe('Workday multiselect search-combobox (Field of Study)', () => {
  it('detects the search input as a custom dropdown with the right label', () => {
    workdayMultiselect(['Industrial Engineering'])
    const fields = detectFields(document)
    expect(fields).toHaveLength(1) // never the container, ☰ or Help buttons too
    expect(fields[0].signal.kind).toBe('custom-dropdown')
    expect(fields[0].signal.label).toBe('Field of Study')
    expect(fields[0].signal.filled).toBe(false)
  })

  it('reads a committed pill as FILLED even though the input stays empty', () => {
    const { container } = workdayMultiselect(['Industrial Engineering'])
    const pill = document.createElement('span')
    pill.textContent = 'Industrial Engineering ×'
    container.querySelector('[data-automation-id="selectedItemList"]')!.appendChild(pill)
    const [field] = detectFields(document)
    expect(field.signal.filled).toBe(true)
  })

  it('matches tier-1 education.field from the profile', async () => {
    workdayMultiselect(['Industrial Engineering'])
    const [field] = detectFields(document)
    const profile = defaultProfile()
    profile.education = [
      {
        institution: 'Test University',
        degree: 'Masters',
        field: 'Industrial Engineering',
        startDate: '2024-08',
        endDate: '2026-05',
      },
    ]
    const match = await matchField(field.signal, {
      profile,
      qa: [],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.action).toBe('autofill')
    expect(match?.rawAnswerTemplate).toBe('Industrial Engineering')
  })

  it('fills via Enter-search: type, Enter, click the exact option, verify the pill', async () => {
    const widget = workdayMultiselect([
      'Industrial Design',
      'Industrial Engineering',
      'Industrial and Systems Engineering',
    ])
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'Industrial Engineering')
    expect(result.outcome).toBe('filled')
    expect(widget.selections()).toEqual(['Industrial Engineering'])
    expect(widget.input.value).toBe('') // no search residue
    expect(document.querySelector('[role="listbox"]')).toBeNull() // popup closed
  }, 30_000)

  it('falls back to the adjacent ☰ button when Enter-search yields nothing', async () => {
    const widget = workdayMultiselect(['Chemistry', 'Industrial Engineering', 'Physics'], {
      searchWorks: false,
    })
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'Industrial Engineering')
    expect(result.outcome).toBe('filled')
    expect(widget.selections()).toEqual(['Industrial Engineering'])
  }, 30_000)

  it('broadens the search when the full phrase finds nothing in the catalog', async () => {
    // Catalog says "Industrial and Systems Engineering" — searching the full
    // stored phrase returns zero hits; the word "Industrial" reveals it.
    const widget = workdayMultiselect(['Industrial and Systems Engineering', 'Chemistry'])
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'Industrial Engineering')
    expect(result.outcome).toBe('filled')
    expect(widget.selections()).toEqual(['Industrial and Systems Engineering'])
  }, 30_000)

  it('the judge picks the CLOSEST option when lexical matching rejects everything', async () => {
    const widget = workdayMultiselect(['Industrial Technology', 'Chemistry'])
    let judgeAsked = false
    setSemanticChooser(async (answer, optionTexts) => {
      judgeAsked = true
      expect(answer).toBe('Industrial Engineering')
      return optionTexts.indexOf('Industrial Technology')
    })
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'Industrial Engineering')
    expect(result.outcome).toBe('filled')
    expect(judgeAsked).toBe(true) // lexical alone must NOT have accepted it
    expect(widget.selections()).toEqual(['Industrial Technology'])
  }, 30_000)

  it('judge declines → honest failed, nothing clicked', async () => {
    const widget = workdayMultiselect(['Chemistry', 'Physics'])
    setSemanticChooser(async () => null)
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'Industrial Engineering')
    expect(result.outcome).toBe('failed')
    expect(widget.selections()).toEqual([])
  }, 30_000)

  it('never guesses when the answer is not among the options', async () => {
    const widget = workdayMultiselect(['Chemistry', 'Physics'], { searchWorks: false })
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'Industrial Engineering')
    expect(result.outcome).toBe('failed')
    expect(widget.selections()).toEqual([])
  }, 30_000)
})

describe('answerMode "judge": OpenAI alone places this question', () => {
  const judgeEntry = {
    id: 'seed-field-of-study',
    question: 'What was your field of study?',
    aliases: ['Field of study'],
    answer: 'Industrial Engineering',
    answerType: 'text' as const,
    answerMode: 'judge' as const,
    answerTemplate: null,
    mapsTo: null,
    variables: [],
    personas: [],
    tags: [],
    fieldType: 'select',
    options: [],
    status: 'active' as const,
    source: 'import' as const,
    captureContext: null,
    createdAt: 0,
    updatedAt: 0,
  }

  it('the match carries judgeOnly even when tier-1 wins the answer', async () => {
    workdayMultiselect(['Industrial Engineering'])
    const [field] = detectFields(document)
    const profile = defaultProfile()
    profile.education = [
      {
        institution: 'Test University',
        degree: 'Masters',
        field: 'Industrial Engineering',
        startDate: '2024-08',
        endDate: '2026-05',
      },
    ]
    const match = await matchField(field.signal, {
      profile,
      qa: [judgeEntry],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.rawAnswerTemplate).toBe('Industrial Engineering')
    expect(match?.judgeOnly).toBe(true)
  })

  it('fills ONLY via the judge — even an exact option is not placed lexically', async () => {
    const widget = workdayMultiselect(['Industrial Engineering', 'Chemistry'])
    let judgeAsked = false
    setSemanticChooser(async (_answer, optionTexts) => {
      judgeAsked = true
      return optionTexts.indexOf('Industrial Engineering')
    })
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'Industrial Engineering', [], null, [], null, true)
    expect(result.outcome).toBe('filled')
    expect(judgeAsked).toBe(true)
    expect(widget.selections()).toEqual(['Industrial Engineering'])
  }, 30_000)

  it('judge unavailable → honest failed, never a lexical fallback', async () => {
    // No semantic chooser configured (= no API key): the exact option is on
    // the page, but a judge-routed question must NOT fall back to lexical.
    const widget = workdayMultiselect(['Industrial Engineering', 'Chemistry'])
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'Industrial Engineering', [], null, [], null, true)
    expect(result.outcome).toBe('failed')
    expect(widget.selections()).toEqual([])
  }, 30_000)
})

describe('Enter-search safety on non-multiselect widgets', () => {
  it('never presses Enter in a type-to-filter input that sits inside a <form>', async () => {
    // A search-combobox INSIDE a form, no multiselect container: pressing
    // Enter there is the auto-submit hazard the gate exists for.
    const form = document.createElement('form')
    const container = document.createElement('div')
    container.setAttribute('role', 'combobox')
    container.setAttribute('aria-label', 'State')
    const input = document.createElement('input')
    input.type = 'text'
    container.appendChild(input)
    form.appendChild(container)
    document.body.appendChild(form)
    // The hazard is Enter WHILE a typed query sits in the input (a page-level
    // handler could submit it). keyboardSelect's ARIA open-protocol Enter on
    // an EMPTY input is long-standing and harmless — synthetic events can
    // never natively submit a form.
    let entersWithText = 0
    input.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter' && input.value.trim() !== '') entersWithText++
    })
    const result = await fillCustomDropdown(container, 'Texas')
    expect(result.outcome).toBe('failed') // widget renders no options at all
    expect(entersWithText).toBe(0)
  }, 30_000)
})
