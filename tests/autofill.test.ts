import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  setTrustedClick,
  fillCheckbox,
  fillCheckboxGroup,
  fillCustomDropdown,
  fillField,
  fillRadioGroup,
  fillSelect,
  fillTextInput,
  setNativeValue,
} from '@/content/autofill'
import type { MatchResult } from '@/types'
import { detectFields } from '@/content/detector'
import { matchAll } from '@/content/matcher'
import { defaultProfile, defaultSettings } from '@/lib/schema'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('setNativeValue (React-safe path, Section 8)', () => {
  it('uses the native prototype setter and dispatches bubbling input+change', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const protoSetter = vi.spyOn(HTMLInputElement.prototype, 'value', 'set')
    const seen: string[] = []
    document.body.addEventListener('input', (e) => seen.push(`input:${(e.target as HTMLInputElement).value}`))
    document.body.addEventListener('change', () => seen.push('change'))

    setNativeValue(input, 'hello')

    expect(protoSetter).toHaveBeenCalledWith('hello')
    expect(input.value).toBe('hello')
    expect(seen).toEqual(['input:hello', 'change'])
    protoSetter.mockRestore()
  })

  it('works for textareas', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    setNativeValue(ta, 'long answer')
    expect(ta.value).toBe('long answer')
  })
})

describe('fillTextInput', () => {
  it('focuses, fills, blurs', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    expect(fillTextInput(input, 'Ada')).toBe('filled')
    expect(input.value).toBe('Ada')
  })
})

describe('fillSelect', () => {
  function makeSelect(): HTMLSelectElement {
    const select = document.createElement('select')
    select.innerHTML = `
      <option value="">Choose…</option>
      <option value="de">Germany</option>
      <option value="us">United States</option>
    `
    document.body.appendChild(select)
    return select
  }

  it('sets by option value and dispatches change', async () => {
    const select = makeSelect()
    const change = vi.fn()
    select.addEventListener('change', change)
    expect(await fillSelect(select, 'de', 'Germany')).toBe('filled')
    expect(select.value).toBe('de')
    expect(change).toHaveBeenCalled()
  })

  it('falls back to matching by option text', async () => {
    const select = makeSelect()
    expect(await fillSelect(select, undefined, 'United States')).toBe('filled')
    expect(select.value).toBe('us')
  })

  it('fails cleanly when nothing matches', async () => {
    const select = makeSelect()
    expect(await fillSelect(select, undefined, 'Wakanda')).toBe('failed')
  })

  it('fills the long-form negative veteran option from "No" (intent match)', async () => {
    const select = document.createElement('select')
    select.innerHTML = `
      <option value="">Select one</option>
      <option value="v1">I identify as one or more of the classifications of a protected veteran</option>
      <option value="v2">I am not a protected veteran</option>
      <option value="v3">I don't wish to answer.</option>
    `
    document.body.appendChild(select)
    expect(await fillSelect(select, undefined, 'No')).toBe('filled')
    expect(select.value).toBe('v2')
  })

  it('fails instead of filling a wrong-polarity option', async () => {
    const select = document.createElement('select')
    select.innerHTML = `
      <option value="n">No, I am not a protected veteran</option>
      <option value="d">I don't wish to answer.</option>
    `
    document.body.appendChild(select)
    expect(await fillSelect(select, undefined, 'Yes')).toBe('failed')
  })

  it('selects text-only options whose value attribute is empty', async () => {
    const select = document.createElement('select')
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.text = ''
    const opt = document.createElement('option')
    opt.setAttribute('value', '')
    opt.text = 'Germany'
    select.append(placeholder, opt)
    document.body.appendChild(select)
    expect(await fillSelect(select, undefined, 'Germany')).toBe('filled')
    expect(select.selectedIndex).toBe(1)
  })
})

describe('fillRadioGroup', () => {
  it('clicks the radio whose value matches', async () => {
    document.body.innerHTML = `
      <input type="radio" name="a" value="yes">
      <input type="radio" name="a" value="no">
    `
    const radios = [...document.querySelectorAll<HTMLInputElement>('input')]
    expect(await fillRadioGroup(radios, 'no', 'No')).toBe('filled')
    expect(radios[1].checked).toBe(true)
  })

  it('matches by label text when no value is chosen', async () => {
    document.body.innerHTML = `
      <label><input type="radio" name="b" value="1">Yes, immediately</label>
      <label><input type="radio" name="b" value="2">No</label>
    `
    const radios = [...document.querySelectorAll<HTMLInputElement>('input')]
    expect(await fillRadioGroup(radios, undefined, 'Yes immediately')).toBe('filled')
    expect(radios[0].checked).toBe(true)
  })

  it('clicks the long-form negative disability radio from "No" (intent match)', async () => {
    document.body.innerHTML = `
      <label><input type="radio" name="c" value="">Yes, I have a disability, or have had one in the past</label>
      <label><input type="radio" name="c" value="">No, I do not have a disability and have not had one in the past</label>
      <label><input type="radio" name="c" value="">I do not want to answer</label>
    `
    const radios = [...document.querySelectorAll<HTMLInputElement>('input')]
    expect(await fillRadioGroup(radios, undefined, 'No')).toBe('filled')
    expect(radios[1].checked).toBe(true)
  })
})

describe('fillCheckbox', () => {
  it('REFUSES consent-like checkboxes (Section 8/13)', () => {
    const box = document.createElement('input')
    box.type = 'checkbox'
    document.body.appendChild(box)
    expect(fillCheckbox(box, true, true)).toBe('refused')
    expect(box.checked).toBe(false)
  })

  it('clicks (not sets) ordinary checkboxes', () => {
    const box = document.createElement('input')
    box.type = 'checkbox'
    document.body.appendChild(box)
    const click = vi.fn()
    box.addEventListener('click', click)
    expect(fillCheckbox(box, true, false)).toBe('filled')
    expect(box.checked).toBe(true)
    expect(click).toHaveBeenCalled()
  })
})

describe('fillCustomDropdown', () => {
  it('opens, waits for options, clicks the best match', async () => {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    document.body.appendChild(combo)
    let chosen = ''
    combo.addEventListener('click', () => {
      // options appear asynchronously, like a real ATS widget
      setTimeout(() => {
        const list = document.createElement('ul')
        list.setAttribute('role', 'listbox')
        for (const country of ['Germany', 'United States']) {
          const li = document.createElement('li')
          li.setAttribute('role', 'option')
          li.textContent = country
          li.addEventListener('click', () => { chosen = country })
          list.appendChild(li)
        }
        document.body.appendChild(list)
      }, 120)
    })

    expect((await fillCustomDropdown(combo, 'Germany')).outcome).toBe('filled')
    expect(chosen).toBe('Germany')
  })

  it('fails (→ suggestion chip) if the list never appears', async () => {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    document.body.appendChild(combo)
    expect((await fillCustomDropdown(combo, 'Germany')).outcome).toBe('failed')
  }, 10_000)

  it('clicks the intent-matched veteran option in a Workday-style listbox', async () => {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    document.body.appendChild(combo)
    let chosen = ''
    combo.addEventListener('click', () => {
      setTimeout(() => {
        const list = document.createElement('ul')
        list.setAttribute('role', 'listbox')
        for (const text of [
          'I identify as one or more of the classifications of a protected veteran',
          'I am not a protected veteran',
          "I don't wish to answer.",
        ]) {
          const li = document.createElement('li')
          li.setAttribute('role', 'option')
          li.textContent = text
          li.addEventListener('click', () => { chosen = text })
          list.appendChild(li)
        }
        document.body.appendChild(list)
      }, 120)
    })

    expect((await fillCustomDropdown(combo, 'No')).outcome).toBe('filled')
    expect(chosen).toBe('I am not a protected veteran')
  })
})

describe('fillField dispatcher', () => {
  const baseMatch: MatchResult = {
    fieldId: 'x',
    resolvedAnswer: 'value',
    rawAnswerTemplate: 'value',
    confidence: 0.9,
    source: 'profile',
    unresolvedVars: [],
    action: 'autofill',
    needsReview: false,
    composite: false,
  }

  it('never writes unresolved {{braces}} to the page (Section 7)', async () => {
    document.body.innerHTML = `<input type="text" aria-label="Why us">`
    const [field] = detectFields(document)
    const { outcome } = await fillField(field, {
      ...baseMatch,
      resolvedAnswer: 'I admire {{company}}',
    })
    expect(outcome).toBe('refused')
    expect((field.el as HTMLInputElement).value).toBe('')
  })

  it('refuses file inputs (Section 8)', async () => {
    document.body.innerHTML = `<label for="r">Resume</label><input type="file" id="r">`
    const [field] = detectFields(document)
    expect((await fillField(field, baseMatch)).outcome).toBe('refused')
  })

  it('fills contenteditable via events + textContent, never HTML', async () => {
    document.body.innerHTML = `<div contenteditable="true" aria-label="Cover letter"></div>`
    const [field] = detectFields(document)
    const { outcome } = await fillField(field, {
      ...baseMatch,
      resolvedAnswer: '<b>plain</b> text',
    })
    expect(outcome).toBe('filled')
    expect(field.el.textContent).toBe('<b>plain</b> text')
    expect(field.el.querySelector('b')).toBeNull() // written as text, not markup
  })
})

describe('parseDateParts', () => {
  it('parses the formats profiles and pages use', async () => {
    const { parseDateParts } = await import('@/content/autofill')
    expect(parseDateParts('2002-02')).toEqual({ year: '2002', month: '02', day: '01' })
    expect(parseDateParts('2/2002')).toEqual({ year: '2002', month: '02', day: '01' })
    expect(parseDateParts('02/15/2002')).toEqual({ year: '2002', month: '02', day: '15' })
    expect(parseDateParts('2002-02-15')).toEqual({ year: '2002', month: '02', day: '15' })
    expect(parseDateParts('2002')).toEqual({ year: '2002', month: '01', day: '01' })
    expect(parseDateParts('')).toBeNull()
    expect(parseDateParts('n/a')).toBeNull()
  })
})

describe('segmented date fill (Workday, date.md DOM)', () => {
  const dateMatch: MatchResult = {
    fieldId: 'd',
    resolvedAnswer: '2002-02',
    rawAnswerTemplate: '2002-02',
    confidence: 0.9,
    source: 'profile',
    unresolvedVars: [],
    action: 'autofill',
    needsReview: false,
    composite: false,
  }

  function renderWidget(): void {
    document.body.innerHTML = `
      <label>From*</label>
      <div id="workExperience-6--startDate" data-automation-id="dateInputWrapper" role="group">
        <input id="workExperience-6--startDate-dateSectionMonth-input" data-automation-id="dateSectionMonth-input"
               role="spinbutton" type="text" aria-label="Month" aria-valuemin="1" aria-valuemax="12">
        <input id="workExperience-6--startDate-dateSectionYear-input" data-automation-id="dateSectionYear-input"
               role="spinbutton" type="text" aria-label="Year" aria-valuemin="1" aria-valuemax="9999">
      </div>
    `
  }

  it('types each segment separately, never a combined string', async () => {
    renderWidget()
    const [field] = detectFields(document)
    const month = field.dateSegmentEls!.month!
    const year = field.dateSegmentEls!.year!
    const monthEvents: string[] = []
    month.addEventListener('input', () => monthEvents.push(`input:${month.value}`))
    month.addEventListener('change', () => monthEvents.push('change'))

    expect((await fillField(field, dateMatch)).outcome).toBe('filled')
    // Typed padded, like a user — a complete "02" triggers the widget's own
    // month→year auto-advance; Workday re-normalizes display itself.
    expect(month.value).toBe('02')
    expect(year.value).toBe('2002')
    expect(monthEvents).toEqual(['input:0', 'input:02', 'change'])
  })

  it('fills from MM/YYYY-style answers too', async () => {
    renderWidget()
    const [field] = detectFields(document)
    await fillField(field, { ...dateMatch, resolvedAnswer: '02/2007' })
    expect(field.dateSegmentEls!.month!.value).toBe('02')
    expect(field.dateSegmentEls!.year!.value).toBe('2007')
  })

  it('fails cleanly (→ suggestion chip) on an unparseable answer', async () => {
    renderWidget()
    const [field] = detectFields(document)
    expect((await fillField(field, { ...dateMatch, resolvedAnswer: 'Present' })).outcome).toBe('failed')
    expect(field.dateSegmentEls!.month!.value).toBe('')
  })
})

describe('segmented date typing simulation', () => {
  const dateMatch: MatchResult = {
    fieldId: 'd',
    resolvedAnswer: '2002-02',
    rawAnswerTemplate: '2002-02',
    confidence: 0.9,
    source: 'profile',
    unresolvedVars: [],
    action: 'autofill',
    needsReview: false,
    composite: false,
  }

  function renderWidget(): void {
    document.body.innerHTML = `
      <label>From*</label>
      <div id="workExperience-6--startDate" data-automation-id="dateInputWrapper" role="group">
        <input id="workExperience-6--startDate-dateSectionMonth-input" data-automation-id="dateSectionMonth-input"
               role="spinbutton" type="text" aria-label="Month">
        <input id="workExperience-6--startDate-dateSectionYear-input" data-automation-id="dateSectionYear-input"
               role="spinbutton" type="text" aria-label="Year">
      </div>
    `
  }

  it('dispatches per-character key events with legacy keyCode for keystroke-tracking widgets', async () => {
    renderWidget()
    const [field] = detectFields(document)
    const year = field.dateSegmentEls!.year!
    const keys: string[] = []
    year.addEventListener('keydown', (e) => keys.push(`${e.key}:${(e as KeyboardEvent).keyCode}`))

    await fillField(field, dateMatch)
    expect(keys).toEqual(['2:50', '0:48', '0:48', '2:50'])
    expect(year.value).toBe('2002')
  })

  it('hard-sets the value when a widget swallows synthetic keystrokes', async () => {
    renderWidget()
    const [field] = detectFields(document)
    const month = field.dateSegmentEls!.month!
    month.addEventListener('keydown', (e) => e.preventDefault()) // widget "handles" keys, inserts nothing

    expect((await fillField(field, dateMatch)).outcome).toBe('filled')
    expect(month.value).toBe('02') // fallback setNativeValue still landed it
  })

  it('follows the widget’s own focus flow — auto-advance never clobbers the month', async () => {
    // Regression: Workday auto-advances a complete month to the year and can
    // bounce a programmatic year-focus back to an incomplete first segment —
    // which used to land the year's leading "2" in the month ("02" everywhere).
    renderWidget()
    const [field] = detectFields(document)
    const month = field.dateSegmentEls!.month!
    const year = field.dateSegmentEls!.year!
    const monthComplete = () => month.value.length >= 2
    month.addEventListener('input', () => {
      if (monthComplete()) year.focus() // widget's own auto-advance
    })
    year.addEventListener('focus', () => {
      if (!monthComplete()) {
        month.focus() // widget restarts at the first incomplete segment
        month.select()
      }
    })

    expect((await fillField(field, { ...dateMatch, resolvedAnswer: '2026-01' })).outcome).toBe('filled')
    expect(month.value).toBe('01') // NOT "02"
    expect(year.value).toBe('2026')
  })

  it('replaces residue from an earlier failed fill instead of appending', async () => {
    renderWidget()
    const [field] = detectFields(document)
    const year = field.dateSegmentEls!.year!
    year.setAttribute('value', '2007') // stale value from a previous attempt

    await fillField(field, dateMatch)
    expect(year.value).toBe('2002') // not "20072002"
  })
})

describe('fillCheckboxGroup (multi-select)', () => {
  function renderShifts(): HTMLInputElement[] {
    document.body.innerHTML = `
      <fieldset>
        <legend>Which shifts are you available for?</legend>
        <label><input type="checkbox" value="am">Morning</label>
        <label><input type="checkbox" value="pm">Evening</label>
        <label><input type="checkbox" value="night">Night</label>
      </fieldset>
    `
    return [...document.querySelectorAll<HTMLInputElement>('input')]
  }

  it('checks every box the compound answer places', () => {
    const boxes = renderShifts()
    expect(fillCheckboxGroup(boxes, 'Morning, Night')).toBe('filled')
    expect(boxes.map((b) => b.checked)).toEqual([true, false, true])
  })

  it('never unchecks boxes the user already ticked', () => {
    const boxes = renderShifts()
    boxes[1].checked = true // user pre-selected Evening
    expect(fillCheckboxGroup(boxes, 'Morning')).toBe('filled')
    expect(boxes.map((b) => b.checked)).toEqual([true, true, false])
  })

  it('refuses consent-like groups and fails cleanly on no placement', () => {
    const boxes = renderShifts()
    expect(fillCheckboxGroup(boxes, 'Morning', [], true)).toBe('refused')
    expect(boxes.every((b) => !b.checked)).toBe(true)
    expect(fillCheckboxGroup(boxes, 'Whatever works')).toBe('failed')
  })

  it('dispatches through fillField for detected groups', async () => {
    renderShifts()
    const [field] = detectFields(document)
    const { outcome } = await fillField(field, {
      fieldId: 'g',
      resolvedAnswer: 'Evening and Night',
      rawAnswerTemplate: 'Evening and Night',
      confidence: 0.9,
      source: 'profile',
      unresolvedVars: [],
      action: 'autofill',
      needsReview: false,
      composite: false,
    })
    expect(outcome).toBe('filled')
    const boxes = field.groupEls!
    expect(boxes.map((b) => b.checked)).toEqual([false, true, true])
  })
})

describe('hierarchical custom dropdowns (sub-options)', () => {
  /** Workday-style prompt: top level shows categories (expandable), clicking
   *  one replaces the list with its children. Reopening restarts at the top. */
  function renderPrompt(chosen: { value: string }): HTMLElement {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    document.body.appendChild(combo)
    const tree: Record<string, string[]> = {
      'Social Media': ['LinkedIn', 'X (Twitter)'],
      'Job Boards': ['Indeed', 'Monster'],
    }
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

  it('drills into a category to find the sub-option', async () => {
    const chosen = { value: '' }
    const combo = renderPrompt(chosen)
    expect((await fillCustomDropdown(combo, 'LinkedIn')).outcome).toBe('filled')
    expect(chosen.value).toBe('LinkedIn')
  }, 15_000)

  it('explores later categories when the first branch misses', async () => {
    const chosen = { value: '' }
    const combo = renderPrompt(chosen)
    expect((await fillCustomDropdown(combo, 'Indeed')).outcome).toBe('filled')
    expect(chosen.value).toBe('Indeed')
  }, 15_000)

  it('never blind-clicks a flat list without expandable hints', async () => {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    document.body.appendChild(combo)
    let clicked = ''
    combo.addEventListener('click', () => {
      const list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      for (const text of ['Germany', 'United States']) {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.textContent = text
        li.addEventListener('click', () => { clicked = text })
        list.appendChild(li)
      }
      document.body.appendChild(list)
    })
    expect((await fillCustomDropdown(combo, 'Wakanda')).outcome).toBe('failed')
    expect(clicked).toBe('') // no probing clicks on selectable leaves
  }, 15_000)
})

describe('page-branded sub-options ("Website" → companyname.com)', () => {
  /** Two-level prompt whose leaf list is company-branded. */
  function renderWebsitePrompt(chosen: { value: string }, leaves: string[]): HTMLElement {
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
          if (expandable) setTimeout(() => renderList(leaves, false), 50)
          else {
            chosen.value = text
            list?.remove()
            list = null
          }
        })
        list!.appendChild(li)
      }
      document.body.appendChild(list!)
    }
    combo.addEventListener('click', () => setTimeout(() => renderList(['Company Website', 'Job Boards'], true), 50))
    return combo
  }

  const context = { company: 'McWane Industrial', role: null, location: null, source: 'adapter' as const }

  it('picks the company-branded leaf from the page context', async () => {
    const chosen = { value: '' }
    const combo = renderWebsitePrompt(chosen, ['mcwane.com', 'agency-partners.com'])
    expect((await fillCustomDropdown(combo, 'Website', [], context)).outcome).toBe('filled')
    expect(chosen.value).toBe('mcwane.com')
  }, 15_000)

  it('takes a lone sub-option even without any context', async () => {
    const chosen = { value: '' }
    const combo = renderWebsitePrompt(chosen, ['acme.com'])
    expect((await fillCustomDropdown(combo, 'Website')).outcome).toBe('filled')
    expect(chosen.value).toBe('acme.com')
  }, 15_000)

  it('does not guess among several unbranded leaves', async () => {
    const chosen = { value: '' }
    const combo = renderWebsitePrompt(chosen, ['globex.com', 'initech.com'])
    expect((await fillCustomDropdown(combo, 'Website', [], context)).outcome).toBe('failed')
    expect(chosen.value).toBe('')
  }, 15_000)
})

describe('click-resistant dropdowns (keyboard protocol fallback)', () => {
  /** Trigger with real display text whose options IGNORE synthetic clicks —
   *  selection only works through the ARIA keyboard protocol. */
  function keyboardOnlyDropdown(withKeyboard: boolean): HTMLElement {
    const combo = document.createElement('button')
    combo.setAttribute('aria-haspopup', 'listbox')
    combo.textContent = 'Select One'
    document.body.appendChild(combo)
    let list: HTMLElement | null = null
    let items: HTMLElement[] = []
    let highlight = -1
    const open = () => {
      if (list) return
      list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      items = ['Yes', 'No'].map((text, i) => {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.id = `kb-opt-${i}`
        li.textContent = text
        list!.appendChild(li)
        return li // NOTE: no click handler — synthetic clicks do nothing
      })
      document.body.appendChild(list)
    }
    combo.addEventListener('click', open)
    if (withKeyboard) {
      combo.addEventListener('keydown', (e) => {
        const key = (e as KeyboardEvent).key
        if (key === 'ArrowDown') {
          open()
          highlight = Math.min(highlight + 1, items.length - 1)
          list!.setAttribute('aria-activedescendant', items[highlight].id)
        } else if (key === 'Enter' && highlight >= 0) {
          combo.textContent = items[highlight].textContent
          list?.remove()
          list = null
        } else if (key === 'Escape') {
          list?.remove()
          list = null
        }
      })
    }
    return combo
  }

  it('selects through the widget’s own keyboard handling when clicks are swallowed', async () => {
    const combo = keyboardOnlyDropdown(true)
    expect((await fillCustomDropdown(combo, 'Yes')).outcome).toBe('filled')
    expect(combo.textContent).toBe('Yes')
  }, 20_000)

  it('reports failed honestly (→ chip) when neither clicks nor keys register', async () => {
    const combo = keyboardOnlyDropdown(false)
    expect((await fillCustomDropdown(combo, 'Yes')).outcome).toBe('failed')
    expect(combo.textContent).toBe('Select One') // untouched, visibly unfilled
  }, 20_000)

  it('does not second-guess widgets whose click DID land (no double-select)', async () => {
    const combo = document.createElement('button')
    combo.setAttribute('aria-haspopup', 'listbox')
    combo.textContent = 'Select One'
    document.body.appendChild(combo)
    let selections = 0
    combo.addEventListener('click', () => {
      if (document.querySelector('[role="listbox"]')) return
      const list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      for (const text of ['Yes', 'No']) {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.textContent = text
        li.addEventListener('click', () => {
          selections++
          combo.textContent = text
          list.remove()
        })
        list.appendChild(li)
      }
      document.body.appendChild(list)
    })
    expect((await fillCustomDropdown(combo, 'Yes')).outcome).toBe('filled')
    expect(combo.textContent).toBe('Yes')
    expect(selections).toBe(1)
  }, 20_000)
})

describe('trusted-input escalation (chrome.debugger tier)', () => {
  afterEach(() => setTrustedClick(null))

  it('escalates to trusted clicks when synthetic clicks AND keys are ignored', async () => {
    const combo = document.createElement('button')
    combo.setAttribute('aria-haspopup', 'listbox')
    combo.textContent = 'Select One'
    document.body.appendChild(combo)
    let list: HTMLElement | null = null
    const openReal = () => {
      if (list) return
      list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      for (const text of ['Yes', 'No']) {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.textContent = text
        list.appendChild(li)
      }
      document.body.appendChild(list)
    }
    // The widget ignores every synthetic event; only the trusted tier works
    const trusted: string[] = []
    setTrustedClick(async (el) => {
      trusted.push(el.textContent?.trim() ?? '')
      if (el === combo) {
        openReal()
      } else {
        combo.textContent = el.textContent // trusted option click commits
        list?.remove()
        list = null
      }
      return true
    })

    expect((await fillCustomDropdown(combo, 'Yes')).outcome).toBe('filled')
    expect(combo.textContent).toBe('Yes')
    expect(trusted).toEqual(['Select One', 'Yes']) // trigger first, then option
  }, 30_000)

  it('stays failed (→ chip) when even trusted clicks are unavailable', async () => {
    const combo = document.createElement('button')
    combo.setAttribute('aria-haspopup', 'listbox')
    combo.textContent = 'Select One'
    document.body.appendChild(combo)
    setTrustedClick(async () => false) // e.g. DevTools holds the debugger

    expect((await fillCustomDropdown(combo, 'Yes')).outcome).toBe('failed')
    expect(combo.textContent).toBe('Select One')
  }, 30_000)
})

describe('react-datepicker (month/year grid, custom header — user-captured DOM)', () => {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  /** Controlled widget: programmatic input writes revert ~30ms later; only a
   *  cell click commits through the "library" state. */
  function renderPicker(opts: { years: number[]; initialYear: number; withSelect?: boolean }) {
    document.body.innerHTML = `
      <label for="from">From</label>
      <div class="react-datepicker-wrapper"><div class="react-datepicker__input-container">
        <input id="from" type="text" placeholder="MM/YYYY">
      </div></div>`
    const input = document.getElementById('from') as HTMLInputElement
    const state = { value: '', viewYear: opts.initialYear, popup: null as HTMLElement | null }
    input.addEventListener('input', () => {
      setTimeout(() => { input.value = state.value }, 30) // controlled revert
    })
    const maxYear = Math.max(...opts.years)
    const minYear = Math.min(...opts.years)
    input.addEventListener('click', () => {
      if (state.popup) return
      const popup = document.createElement('div')
      popup.className = 'react-datepicker'
      const header = document.createElement('div')
      header.className = 'range-div'
      const prev = document.createElement('button')
      prev.textContent = 'Previous Month'
      const next = document.createElement('button')
      next.textContent = 'Next Month'
      const sel = document.createElement('select')
      sel.className = 'range-select'
      for (const y of opts.years) {
        const o = document.createElement('option')
        o.value = String(y)
        o.text = String(y)
        sel.appendChild(o)
      }
      const grid = document.createElement('div')
      const syncNav = () => {
        next.disabled = state.viewYear >= maxYear
        prev.disabled = state.viewYear <= minYear
      }
      const renderGrid = () => {
        sel.value = String(state.viewYear)
        grid.setAttribute('aria-label', `month ${state.viewYear}-01`)
        grid.innerHTML = ''
        MONTHS.forEach((name, i) => {
          const cell = document.createElement('div')
          cell.className = 'react-datepicker__month-text'
          cell.setAttribute('aria-label', `Choose ${name} ${state.viewYear}`)
          cell.textContent = name.slice(0, 3)
          cell.addEventListener('click', () => {
            state.value = `${String(i + 1).padStart(2, '0')}/${state.viewYear}`
            input.value = state.value
            state.popup?.remove()
            state.popup = null
          })
          grid.appendChild(cell)
        })
        syncNav()
      }
      sel.addEventListener('change', () => { state.viewYear = parseInt(sel.value, 10); renderGrid() })
      prev.addEventListener('click', () => { if (!prev.disabled) { state.viewYear--; renderGrid() } })
      next.addEventListener('click', () => { if (!next.disabled) { state.viewYear++; renderGrid() } })
      if (opts.withSelect !== false) header.append(prev, sel, next)
      else header.append(prev, next)
      popup.append(header, grid)
      document.body.appendChild(popup)
      state.popup = popup
      renderGrid()
    })
    return { input, state }
  }

  async function fillVia(field: ReturnType<typeof detectFields>[0], answer: string) {
    const result = await fillField(field, {
      fieldId: 'd', resolvedAnswer: answer, rawAnswerTemplate: answer, confidence: 0.9,
      source: 'profile', unresolvedVars: [], action: 'autofill', needsReview: false, composite: false,
    })
    return result.outcome
  }

  it('detects the wrapped input as a react-datepicker date field', () => {
    renderPicker({ years: [2020, 2026], initialYear: 2026 })
    const [field] = detectFields(document)
    expect(field.signal.kind).toBe('date')
    expect(field.signal.dateWidget).toBe('react-datepicker')
    expect(field.signal.label).toBe('From')
  })

  it('jumps years via the native select, then clicks the month cell', async () => {
    const { input } = renderPicker({ years: [2020, 2021, 2022, 2023, 2024, 2025, 2026], initialYear: 2026 })
    const [field] = detectFields(document)
    expect(await fillVia(field, '2024-08')).toBe('filled')
    expect(input.value).toBe('08/2024')
    // survives the controlled revert window
    await new Promise((r) => setTimeout(r, 80))
    expect(input.value).toBe('08/2024')
  }, 15_000)

  it('steps with Previous/Next when there is no year select', async () => {
    const { input } = renderPicker({ years: [2020, 2021, 2022, 2023, 2024, 2025, 2026], initialYear: 2025, withSelect: false })
    const [field] = detectFields(document)
    expect(await fillVia(field, '2024-08')).toBe('filled')
    expect(input.value).toBe('08/2024')
  }, 15_000)

  it('treats a disabled nav boundary as a hard stop and fails honestly', async () => {
    const { input } = renderPicker({ years: [2020, 2026], initialYear: 2026 })
    const [field] = detectFields(document)
    expect(await fillVia(field, '2027-03')).toBe('failed') // beyond the range cap
    expect(input.value).toBe('')
  }, 15_000)

  it('reports failed (not filled) when a plain date input reverts asynchronously', async () => {
    document.body.innerHTML = `<label for="m">Start month</label><input id="m" type="month">`
    const input = document.getElementById('m') as HTMLInputElement
    input.addEventListener('input', () => setTimeout(() => { input.value = '' }, 50))
    const [field] = detectFields(document)
    expect(await fillVia(field, '2024-08')).toBe('failed')
  })
})

describe('From + To react-datepicker pair (full pipeline integration)', () => {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  /** One controlled month/year picker with its own popup, like the live site. */
  function addPicker(label: string, id: string): HTMLInputElement {
    const holder = document.createElement('div')
    holder.innerHTML = `
      <label for="${id}">${label}</label>
      <div class="react-datepicker-wrapper"><div class="react-datepicker__input-container">
        <input id="${id}" type="text" placeholder="MM/YYYY">
      </div></div>`
    document.body.appendChild(holder)
    const input = holder.querySelector('input')!
    const state = { value: '', viewYear: 2026, popup: null as HTMLElement | null }
    input.addEventListener('input', () => setTimeout(() => { input.value = state.value }, 30))
    input.addEventListener('click', () => {
      if (state.popup) return
      const popup = document.createElement('div')
      popup.className = 'react-datepicker'
      const sel = document.createElement('select')
      for (let y = 2020; y <= 2026; y++) {
        const o = document.createElement('option')
        o.value = String(y)
        o.text = String(y)
        sel.appendChild(o)
      }
      const grid = document.createElement('div')
      const renderGrid = () => {
        sel.value = String(state.viewYear)
        grid.setAttribute('aria-label', `month ${state.viewYear}-01`)
        grid.innerHTML = ''
        MONTH_NAMES.forEach((name, i) => {
          const cell = document.createElement('div')
          cell.className = 'react-datepicker__month-text'
          cell.setAttribute('aria-label', `Choose ${name} ${state.viewYear}`)
          cell.textContent = name.slice(0, 3)
          cell.addEventListener('click', () => {
            state.value = `${String(i + 1).padStart(2, '0')}/${state.viewYear}`
            input.value = state.value
            state.popup?.remove()
            state.popup = null
          })
          grid.appendChild(cell)
        })
      }
      sel.addEventListener('change', () => { state.viewYear = parseInt(sel.value, 10); renderGrid() })
      popup.append(sel, grid)
      document.body.appendChild(popup)
      state.popup = popup
      renderGrid()
    })
    return input
  }

  it('fills To through the exact same detect→match→fill path as From', async () => {
    const from = addPicker('From', 'exp-from')
    const to = addPicker('To', 'exp-to')

    const fields = detectFields(document)
    expect(fields).toHaveLength(2) // To must survive detection (stopword label)

    const profile = {
      ...defaultProfile(),
      workHistory: [
        { company: 'McWane', title: 'IE', startDate: '2026-01', endDate: '2026-05', location: '', description: '' },
      ],
    }
    const matches = await matchAll(fields.map((f) => f.signal), {
      profile, qa: [], seeds: [], settings: defaultSettings(), activePersona: null,
    })
    expect(matches.size).toBe(2) // both matched, both autofill-tier

    for (const field of fields) {
      const match = matches.get(field.signal.fieldId)!
      expect(match.action).toBe('autofill')
      expect(
        (await fillField(field, { ...match, resolvedAnswer: match.rawAnswerTemplate })).outcome,
      ).toBe('filled')
    }
    expect(from.value).toBe('01/2026')
    expect(to.value).toBe('05/2026')
    // both survive the controlled-revert window
    await new Promise((r) => setTimeout(r, 80))
    expect(from.value).toBe('01/2026')
    expect(to.value).toBe('05/2026')
  }, 20_000)
})

describe('react-datepicker popup that RE-MOUNTS on year change (live failure mode)', () => {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  /** Real React sites replace the entire popup subtree when the year select
   *  changes — element references captured before the change go stale. */
  function renderRemountingPicker(): HTMLInputElement {
    document.body.innerHTML = `
      <label for="to">To</label>
      <div class="react-datepicker-wrapper"><div class="react-datepicker__input-container">
        <input id="to" type="text" placeholder="MM/YYYY">
      </div></div>`
    const input = document.getElementById('to') as HTMLInputElement
    const state = { value: '', viewYear: 2026, popup: null as HTMLElement | null }
    input.addEventListener('input', () => setTimeout(() => { input.value = state.value }, 30))
    const buildPopup = () => {
      state.popup?.remove() // full re-mount: brand-new subtree every render
      const popup = document.createElement('div')
      popup.className = 'react-datepicker'
      const sel = document.createElement('select')
      for (let y = 2020; y <= 2026; y++) {
        const o = document.createElement('option')
        o.value = String(y)
        o.text = String(y)
        sel.appendChild(o)
      }
      sel.value = String(state.viewYear)
      sel.addEventListener('change', () => {
        state.viewYear = parseInt(sel.value, 10)
        setTimeout(buildPopup, 40) // async re-render, like React
      })
      const grid = document.createElement('div')
      grid.setAttribute('aria-label', `month ${state.viewYear}-01`)
      MONTH_NAMES.forEach((name, i) => {
        const cell = document.createElement('div')
        cell.className = 'react-datepicker__month-text'
        cell.setAttribute('aria-label', `Choose ${name} ${state.viewYear}`)
        cell.textContent = name.slice(0, 3)
        cell.addEventListener('click', () => {
          state.value = `${String(i + 1).padStart(2, '0')}/${state.viewYear}`
          input.value = state.value
          state.popup?.remove()
          state.popup = null
        })
        grid.appendChild(cell)
      })
      popup.append(sel, grid)
      document.body.appendChild(popup)
      state.popup = popup
    }
    input.addEventListener('click', () => { if (!state.popup) buildPopup() })
    return input
  }

  it('survives the re-mount and fills a non-initial year (2025-02)', async () => {
    const input = renderRemountingPicker()
    const [field] = detectFields(document)
    const { outcome } = await fillField(field, {
      fieldId: 'd', resolvedAnswer: '2025-02', rawAnswerTemplate: '2025-02', confidence: 0.9,
      source: 'profile', unresolvedVars: [], action: 'autofill', needsReview: false, composite: false,
    })
    expect(outcome).toBe('filled')
    expect(input.value).toBe('02/2025')
    await new Promise((r) => setTimeout(r, 80))
    expect(input.value).toBe('02/2025') // survives the controlled revert
  }, 20_000)
})

// ---- Fill-time inference + consent split + fallbacks (cross-site work) ---------

describe('fill-time dropdown inference (match.inferAtFill)', () => {
  afterEach(async () => {
    const { setSemanticAnswerer } = await import('@/content/matcher')
    setSemanticAnswerer(null)
  })

  function asyncDropdown(optionTexts: string[], onPick: (t: string) => void): HTMLElement {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    document.body.appendChild(combo)
    combo.addEventListener('click', () => {
      setTimeout(() => {
        if (document.querySelector('[role="listbox"]')) return
        const list = document.createElement('ul')
        list.setAttribute('role', 'listbox')
        for (const text of optionTexts) {
          const li = document.createElement('li')
          li.setAttribute('role', 'option')
          li.textContent = text
          li.addEventListener('click', () => onPick(text))
          list.appendChild(li)
        }
        document.body.appendChild(list)
      }, 80)
    })
    return combo
  }

  it('asks the judge once the popup reveals the options, clicks its pick', async () => {
    const { setSemanticAnswerer } = await import('@/content/matcher')
    setSemanticAnswerer(async (_q, options) => options.indexOf('Laptop'))
    let picked = ''
    const combo = asyncDropdown(['Desktop', 'Laptop', 'Tablet'], (t) => { picked = t })
    const result = await fillCustomDropdown(combo, '', [], null, [], {
      question: 'Primary device type',
      factSheet: 'Role: Industrial Engineer',
    })
    expect(result.outcome).toBe('filled')
    expect(result.filledText).toBe('Laptop')
    expect(picked).toBe('Laptop')
  })

  it('judge declines → honest failed (chip), nothing clicked', async () => {
    const { setSemanticAnswerer } = await import('@/content/matcher')
    setSemanticAnswerer(async () => null)
    let picked = ''
    const combo = asyncDropdown(['Desktop', 'Laptop'], (t) => { picked = t })
    const result = await fillCustomDropdown(combo, '', [], null, [], {
      question: 'Primary device type',
      factSheet: '',
    })
    expect(result.outcome).toBe('failed')
    expect(result.filledText).toBeNull()
    expect(picked).toBe('')
  })

  it('stored answer with fallbacks places the alternate on the live list', async () => {
    let picked = ''
    const combo = asyncDropdown(['Engineering', 'Business'], (t) => { picked = t })
    const result = await fillCustomDropdown(combo, 'Industrial Engineering', [], null, ['Engineering'])
    expect(result.outcome).toBe('filled')
    expect(picked).toBe('Engineering')
  })
})

describe('consent split at fill time', () => {
  const consentMatch = (over: Partial<MatchResult> = {}): MatchResult => ({
    fieldId: 'x',
    resolvedAnswer: 'Yes',
    rawAnswerTemplate: 'Yes',
    confidence: 0.9,
    source: 'profile',
    unresolvedVars: [],
    chosenOptionValue: 'checked',
    action: 'autofill',
    needsReview: false,
    composite: false,
    ...over,
  })

  it('certification boxes auto-tick', async () => {
    document.body.innerHTML =
      '<label><input type="checkbox">I certify that the information provided is true and accurate</label>'
    const [field] = detectFields(document)
    expect(field.signal.consentLike).toBe(true)
    expect(field.signal.certificationLike).toBe(true)
    const { outcome } = await fillField(field, consentMatch())
    expect(outcome).toBe('filled')
    expect((field.el as HTMLInputElement).checked).toBe(true)
  })

  it('other consent boxes with a stored answer fill automatically too', async () => {
    document.body.innerHTML =
      '<label><input type="checkbox">I consent to receive SMS updates and accept the privacy policy</label>'
    const [field] = detectFields(document)
    expect(field.signal.consentLike).toBe(true)
    expect(field.signal.certificationLike).toBeFalsy()
    const { outcome } = await fillField(field, consentMatch())
    expect(outcome).toBe('filled')
    expect((field.el as HTMLInputElement).checked).toBe(true)
  })
})

describe('fillSelect fallbacks', () => {
  it('tries alternates in order when the primary is not offered', async () => {
    document.body.innerHTML = `
      <select aria-label="Field of study">
        <option value="">Select one</option>
        <option value="eng">Engineering</option>
        <option value="bus">Business</option>
      </select>`
    const select = document.querySelector('select')!
    const outcome = await fillSelect(select, undefined, 'Industrial Engineering', [], ['Engineering'])
    expect(outcome).toBe('filled')
    expect(select.value).toBe('eng')
  })
})

describe('keyboard commit verification (Algeria bug, 2026-07-15)', () => {
  /** Widget that swallows clicks AND hides its highlight: Enter always
   *  commits the FIRST option (like a country list committing "Algeria"
   *  when the target was "United States"). */
  function blindCommitDropdown(optionTexts: string[]): HTMLElement {
    const combo = document.createElement('button')
    combo.setAttribute('aria-haspopup', 'listbox')
    combo.textContent = 'Select One'
    document.body.appendChild(combo)
    let list: HTMLElement | null = null
    const open = () => {
      if (list) return
      list = document.createElement('ul')
      list.setAttribute('role', 'listbox')
      for (const text of optionTexts) {
        const li = document.createElement('li')
        li.setAttribute('role', 'option')
        li.textContent = text
        list.appendChild(li) // no click handlers, no aria-activedescendant
      }
      document.body.appendChild(list)
    }
    combo.addEventListener('click', open)
    combo.addEventListener('keydown', (e) => {
      const key = (e as KeyboardEvent).key
      if (key === 'ArrowDown') open()
      else if (key === 'Enter' && list) {
        combo.textContent = optionTexts[0] // blind commit — wrong option
        list.remove()
        list = null
      } else if (key === 'Escape') {
        list?.remove()
        list = null
      }
    })
    return combo
  }

  it('a blind widget never even gets Enter: no wrong COMMIT, honest failed', async () => {
    const combo = blindCommitDropdown(['Algeria', 'Australia', 'United States'])
    const result = await fillCustomDropdown(combo, 'United States')
    expect(result.outcome).toBe('failed')
    // The old code committed Algeria and THEN noticed — the field kept the
    // wrong value. Enter is now gated on a verified highlight.
    expect(combo.textContent).toBe('Select One')
  }, 20_000)
})

describe('state dropdowns: open → analyze options → fill (abbrev ↔ full name)', () => {
  function stateDropdown(optionTexts: string[], onPick: (t: string) => void): HTMLElement {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    combo.setAttribute('aria-label', 'State')
    document.body.appendChild(combo)
    combo.addEventListener('click', () => {
      if (document.querySelector('[role="listbox"]')) return
      setTimeout(() => {
        const list = document.createElement('ul')
        list.setAttribute('role', 'listbox')
        for (const text of optionTexts) {
          const li = document.createElement('li')
          li.setAttribute('role', 'option')
          li.textContent = text
          li.addEventListener('click', () => {
            onPick(text)
            list.remove()
          })
          list.appendChild(li)
        }
        document.body.appendChild(list)
      }, 60)
    })
    return combo
  }

  it('stored "TX" clicks "Texas" when the opened list spells states out', async () => {
    let picked = ''
    const combo = stateDropdown(['Alabama', 'Texas', 'Wyoming'], (t) => { picked = t })
    const result = await fillCustomDropdown(combo, 'TX')
    expect(result.outcome).toBe('filled')
    expect(picked).toBe('Texas')
  })

  it('stored "TX" clicks "TX" when the opened list abbreviates', async () => {
    let picked = ''
    const combo = stateDropdown(['AL', 'TX', 'WY'], (t) => { picked = t })
    const result = await fillCustomDropdown(combo, 'TX')
    expect(result.outcome).toBe('filled')
    expect(picked).toBe('TX')
  })

  it('stored "Texas" clicks "TX" on an abbreviated list (reverse direction)', async () => {
    let picked = ''
    const combo = stateDropdown(['AL', 'TX', 'WY'], (t) => { picked = t })
    const result = await fillCustomDropdown(combo, 'Texas')
    expect(result.outcome).toBe('filled')
    expect(picked).toBe('TX')
  })

  it('combined wordings ("TX - Texas") also place', async () => {
    let picked = ''
    const combo = stateDropdown(['AL - Alabama', 'TX - Texas'], (t) => { picked = t })
    const result = await fillCustomDropdown(combo, 'TX')
    expect(result.outcome).toBe('filled')
    expect(picked).toBe('TX - Texas')
  })

  it('never guesses a DIFFERENT state', async () => {
    let picked = ''
    // Texas absent — must fail honestly (chip), not click a neighbor
    const combo = stateDropdown(['Alabama', 'Georgia', 'Ohio'], (t) => { picked = t })
    const result = await fillCustomDropdown(combo, 'TX')
    expect(result.outcome).toBe('failed')
    expect(picked).toBe('')
  }, 20_000)
})

describe('dependent selects: options arrive after the parent field commits', () => {
  it('fillSelect waits for the XHR-loaded options, then places via variants', async () => {
    document.body.innerHTML = `
      <label for="st">State</label>
      <select id="st"><option value="">- Select -</option></select>`
    const select = document.querySelector('select')!
    // Country commits → site loads states 300ms later
    setTimeout(() => {
      for (const name of ['Alabama', 'Texas', 'Wyoming']) {
        const opt = document.createElement('option')
        opt.value = name
        opt.textContent = name
        select.appendChild(opt)
      }
    }, 300)
    const outcome = await fillSelect(select, undefined, 'TX')
    expect(outcome).toBe('filled')
    expect(select.value).toBe('Texas')
  })

  it('options that never arrive → honest failed', async () => {
    document.body.innerHTML = `
      <label for="st">State</label>
      <select id="st"><option value="">- Select -</option></select>`
    const select = document.querySelector('select')!
    expect(await fillSelect(select, undefined, 'TX')).toBe('failed')
  }, 10_000)
})

describe('type-to-filter comboboxes (state pickers that render nothing until typed)', () => {
  function filterCombobox(all: string[]): { combo: HTMLElement; input: HTMLInputElement; picked: () => string } {
    const combo = document.createElement('div')
    combo.setAttribute('role', 'combobox')
    combo.setAttribute('aria-label', 'State')
    const input = document.createElement('input')
    combo.appendChild(input)
    document.body.appendChild(combo)
    let chosen = ''
    let list: HTMLElement | null = null
    input.addEventListener('input', () => {
      list?.remove()
      list = null
      const q = input.value.trim().toLowerCase()
      if (!q) return
      const hits = all.filter((t) => t.toLowerCase().startsWith(q))
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
          list?.remove()
          list = null
        })
        list.appendChild(li)
      }
      document.body.appendChild(list)
    })
    return { combo, input, picked: () => chosen }
  }

  it('types the answer (via variants) to reveal the list, then clicks the match', async () => {
    const { combo, picked } = filterCombobox(['Tennessee', 'Texas', 'Utah'])
    // Stored "TX": typing "TX" filters to nothing, the "Texas" variant hits
    const result = await fillCustomDropdown(combo, 'TX')
    expect(result.outcome).toBe('filled')
    expect(picked()).toBe('Texas')
  }, 20_000)

  it('leaves no filter residue when nothing matches', async () => {
    const { combo, input, picked } = filterCombobox(['Ontario', 'Quebec'])
    const result = await fillCustomDropdown(combo, 'TX')
    expect(result.outcome).toBe('failed')
    expect(picked()).toBe('')
    expect(input.value).toBe('')
  }, 25_000)
})

describe('displayTextOf: Workday WID hidden values (Novonesis catch 2026-07-16)', () => {
  it('skips 32-hex GUID input values and falls through to visible text', async () => {
    const { displayTextOf } = await import('@/content/autofill')
    const input = document.createElement('input')
    input.value = 'cf171b111ba1100744892c1282270000'
    expect(displayTextOf(input)).toBe('')
    input.setAttribute('aria-valuetext', 'Mr.')
    expect(displayTextOf(input)).toBe('Mr.')
    const button = document.createElement('button')
    button.textContent = 'Mr.'
    expect(displayTextOf(button)).toBe('Mr.')
    // real values still read normally
    const plain = document.createElement('input')
    plain.value = 'Texas'
    expect(displayTextOf(plain)).toBe('Texas')
  })
})
