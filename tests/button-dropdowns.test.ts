import { beforeEach, describe, expect, it } from 'vitest'
import { detectFields } from '@/content/detector'
import { fillCustomDropdown } from '@/content/autofill'
import { matchField } from '@/content/matcher'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import type { QAEntry } from '@/types'

// ---------------------------------------------------------------------------
// Live report 2026-07-15 (button+hidden-textbox and search-combobox ATS):
// - button "State Select One Required" + hidden textbox + presentation caret
//   → was never DETECTED (placeholder gate only accepted text STARTING with
//   "Select"), so State/Prefix/Suffix/Phone-Device-Type never filled.
// - search-combobox ("0 items selected") keeps its listbox permanently in
//   the DOM → document-wide option queries CONTAMINATED other widgets.
// ---------------------------------------------------------------------------

function qaEntry(overrides: Partial<QAEntry>): QAEntry {
  return {
    id: 'q1',
    question: 'placeholder',
    aliases: [],
    answer: '',
    answerType: 'text',
    answerTemplate: null,
    mapsTo: null,
    variables: [],
    personas: [],
    tags: [],
    fieldType: 'select',
    options: [],
    status: 'active',
    source: 'import',
    captureContext: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

/** A foreign widget's listbox that NEVER leaves the DOM (the contamination
 *  source): visible, full of options that belong to another field. */
function plantForeignListbox(texts: string[]): HTMLElement {
  const list = document.createElement('ul')
  list.setAttribute('role', 'listbox')
  list.id = 'foreign-phone-codes'
  for (const text of texts) {
    const li = document.createElement('li')
    li.setAttribute('role', 'option')
    li.textContent = text
    list.appendChild(li)
  }
  document.body.appendChild(list)
  return list
}

/** The reported button pattern: composed text label + hidden textbox +
 *  presentation caret; clicking appends the widget's own listbox. */
function buttonDropdown(
  composedText: string,
  optionTexts: string[],
  onPick: (t: string) => void,
): HTMLElement {
  const wrap = document.createElement('div')
  const button = document.createElement('button')
  button.setAttribute('aria-haspopup', 'true')
  button.textContent = composedText
  const hidden = document.createElement('input')
  hidden.type = 'text'
  hidden.style.display = 'none'
  const caret = document.createElement('span')
  caret.setAttribute('role', 'presentation')
  caret.textContent = '▾'
  wrap.append(button, hidden, caret)
  document.body.appendChild(wrap)
  let list: HTMLElement | null = null
  button.addEventListener('click', () => {
    if (list) return
    setTimeout(() => {
      list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      for (const text of optionTexts) {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.textContent = text
        li.addEventListener('click', () => {
          onPick(text)
          button.textContent = text
          list?.remove()
          list = null
        })
        list.appendChild(li)
      }
      document.body.appendChild(list)
    }, 60)
  })
  return button
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('composed-text button dropdowns ("State Select One Required")', () => {
  it('detects the button, strips the placeholder tail into the label, skips the hidden textbox', () => {
    buttonDropdown('State Select One Required', ['Texas'], () => {})
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.kind).toBe('custom-dropdown')
    expect(fields[0].signal.label).toBe('State')
    expect(fields[0].signal.filled).toBe(false)
  })

  it('treats an ANSWERED trigger as filled (never re-fills a committed choice)', () => {
    const button = document.createElement('button')
    button.setAttribute('aria-haspopup', 'listbox')
    button.setAttribute('aria-label', 'Country')
    button.textContent = 'United States of America'
    document.body.appendChild(button)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.filled).toBe(true)
  })

  it('fills State=Texas end-to-end DESPITE a foreign listbox living in the DOM', async () => {
    plantForeignListbox(['United States of America (+1)', 'Algeria (+213)', 'India (+91)'])
    let picked = ''
    buttonDropdown('State Select One Required', ['Alabama', 'Texas', 'Wyoming'], (t) => {
      picked = t
    })
    const [field] = detectFields(document).filter((f) => f.signal.kind === 'custom-dropdown')
    const profile = {
      ...defaultProfile(),
      address: { line1: '', line2: '', city: 'Houston', state: 'TX', postalCode: '', country: 'United States' },
    }
    const match = await matchField(field.signal, {
      profile,
      qa: [],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.rawAnswerTemplate).toBe('TX')
    expect(match?.action).toBe('autofill')
    const result = await fillCustomDropdown(field.el, 'TX')
    expect(result.outcome).toBe('filled')
    expect(picked).toBe('Texas') // never a phone code
  }, 20_000)

  it('fills Prefix=Mr. from the imported answer (composed-text label, no external <label>)', async () => {
    let picked = ''
    buttonDropdown('Prefix Select One', ['Dr.', 'Mr.', 'Ms.'], (t) => {
      picked = t
    })
    const [field] = detectFields(document)
    expect(field.signal.label).toBe('Prefix')
    const match = await matchField(field.signal, {
      profile: defaultProfile(),
      qa: [qaEntry({ question: 'Prefix', answer: 'Mr.', fallbacks: ['Mr', 'Mister'] })],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.action).toBe('autofill')
    const result = await fillCustomDropdown(field.el, 'Mr.', [], null, match?.answerFallbacks ?? [])
    expect(result.outcome).toBe('filled')
    expect(picked).toBe('Mr.')
  }, 20_000)
})

describe('search-combobox ("0 items selected") with an always-present listbox', () => {
  function searchCombobox(all: string[]): { container: HTMLElement; input: HTMLInputElement; picked: () => string } {
    const container = document.createElement('div')
    container.setAttribute('role', 'combobox')
    container.setAttribute('aria-label', 'How Did You Hear About Us?')
    const input = document.createElement('input')
    input.type = 'search'
    const counter = document.createElement('span')
    counter.textContent = '0 items selected'
    container.append(input, counter)
    document.body.appendChild(container)
    let chosen = ''
    let list: HTMLElement | null = null
    input.addEventListener('input', () => {
      list?.remove()
      list = null
      const q = input.value.trim().toLowerCase()
      if (!q) return
      const hits = all.filter((t) => t.toLowerCase().includes(q))
      if (hits.length === 0) return
      list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      for (const text of hits) {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.textContent = text
        li.addEventListener('click', () => {
          chosen = text
          input.value = text
          counter.textContent = '1 item selected'
          list?.remove()
          list = null
        })
        list.appendChild(li)
      }
      document.body.appendChild(list)
    })
    return { container, input, picked: () => chosen }
  }

  it('detects the CONTAINER as the field and skips its inner search input', () => {
    searchCombobox(['Website', 'Referral'])
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.kind).toBe('custom-dropdown')
    expect(fields[0].signal.label).toBe('How Did You Hear About Us?')
    expect(fields[0].signal.filled).toBe(false) // "0 items selected" is empty
  })

  it('fills via type-to-filter, ignoring the foreign listbox', async () => {
    plantForeignListbox(['United States of America (+1)', 'Algeria (+213)'])
    const { container, picked } = searchCombobox(['Company Website', 'Referral', 'Job Board'])
    const result = await fillCustomDropdown(container, 'Website')
    expect(result.outcome).toBe('filled')
    expect(picked()).toBe('Company Website')
  }, 30_000)
})

describe('PLAIN buttons with no popup attributes (live report round 2)', () => {
  it('detects a bare <button>State Select One Required</button> and fills it', async () => {
    let picked = ''
    const wrap = document.createElement('div')
    const button = document.createElement('button') // NO aria-haspopup, NO aria-expanded
    button.textContent = 'State Select One Required'
    wrap.appendChild(button)
    document.body.appendChild(wrap)
    button.addEventListener('click', () => {
      if (document.querySelector('[role="listbox"]')) return
      setTimeout(() => {
        const list = document.createElement('ul')
        list.setAttribute('role', 'listbox')
        for (const text of ['Alabama', 'Texas', 'Wyoming']) {
          const li = document.createElement('li')
          li.setAttribute('role', 'option')
          li.textContent = text
          li.addEventListener('click', () => {
            picked = text
            button.textContent = text
            list.remove()
          })
          list.appendChild(li)
        }
        document.body.appendChild(list)
      }, 60)
    })
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.kind).toBe('custom-dropdown')
    expect(fields[0].signal.label).toBe('State')
    const result = await fillCustomDropdown(fields[0].el, 'TX')
    expect(result.outcome).toBe('filled')
    expect(picked).toBe('Texas')
  }, 20_000)

  it('ordinary action buttons are never mistaken for dropdowns', () => {
    document.body.innerHTML = `
      <button>Submit Application</button>
      <button>Save and Continue</button>
      <button type="submit">Select One</button>
      <label for="n">Name</label><input id="n">
    `
    const fields = detectFields(document)
    expect(fields).toHaveLength(1) // just the Name input
    expect(fields[0].signal.kind).toBe('text')
  })
})

describe('Workday Novonesis pattern: id-less options, click-swallowing, typeahead commit', () => {
  /** Real capture 2026-07-15: <li role="option" data-value="GUID"><div>Texas</div></li>
   *  — most options carry NO id, aria-activedescendant starts at the disabled
   *  "select-one" placeholder, synthetic option clicks are swallowed, and
   *  the widget navigates via its own keydown handling (typeahead buffer). */
  function novonesisDropdown(optionTexts: string[]): { button: HTMLElement; committed: () => string } {
    const button = document.createElement('button')
    button.setAttribute('aria-haspopup', 'listbox')
    button.setAttribute('aria-label', 'State Select One Required')
    button.setAttribute('type', 'button')
    button.textContent = 'Select One'
    document.body.appendChild(button)
    let list: HTMLElement | null = null
    let items: HTMLElement[] = []
    let index = -1
    let buffer = ''
    const open = () => {
      if (list) return
      list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      list.setAttribute('aria-activedescendant', 'select-one')
      const placeholder = document.createElement('li')
      placeholder.setAttribute('role', 'option')
      placeholder.setAttribute('aria-disabled', 'true')
      placeholder.setAttribute('aria-selected', 'true')
      placeholder.id = 'select-one'
      placeholder.innerHTML = '<div>Select One</div>'
      list.appendChild(placeholder)
      items = optionTexts.map((text) => {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.setAttribute('data-value', `guid-${text}`)
        const div = document.createElement('div')
        div.textContent = text
        li.appendChild(div) // NOTE: no id, no click handler — clicks swallowed
        list!.appendChild(li)
        return li
      })
      document.body.appendChild(list)
    }
    button.addEventListener('click', open)
    button.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key
      open()
      if (key === 'ArrowDown') {
        index = Math.min(index + 1, items.length - 1)
        list!.setAttribute('aria-activedescendant', `virtual-${index}`) // unresolvable
      } else if (key.length === 1) {
        buffer += key.toLowerCase()
        const hit = optionTexts.findIndex((t) => t.toLowerCase().startsWith(buffer))
        if (hit >= 0) {
          index = hit
          list!.setAttribute('aria-activedescendant', `virtual-${index}`)
        }
      } else if (key === 'Enter' && index >= 0) {
        button.textContent = optionTexts[index]
        list?.remove()
        list = null
      } else if (key === 'Escape') {
        list?.remove()
        list = null
        buffer = ''
      }
    })
    return { button, committed: () => button.textContent ?? '' }
  }

  it('fills Texas via full-text typeahead when the highlight never resolves', async () => {
    const { button, committed } = novonesisDropdown(['Alabama', 'Alaska', 'Texas', 'Utah'])
    const [field] = detectFields(document)
    expect(field.signal.kind).toBe('custom-dropdown')
    expect(field.signal.label).toBe('State')
    const result = await fillCustomDropdown(button, 'TX')
    expect(result.outcome).toBe('filled')
    expect(committed()).toBe('Texas')
  }, 20_000)

  it('ambiguous prefixes cannot commit the wrong state (full text disambiguates)', async () => {
    const { committed } = novonesisDropdown(['New Hampshire', 'New Jersey', 'New Mexico', 'New York'])
    const [field] = detectFields(document)
    const result = await fillCustomDropdown(field.el, 'New Jersey')
    expect(result.outcome).toBe('filled')
    expect(committed()).toBe('New Jersey')
  }, 20_000)
})
