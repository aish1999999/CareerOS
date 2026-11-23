// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://fa-espx-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs/preview/2429480/apply/section/1"}
import { beforeEach, describe, expect, it } from 'vitest'
import { detectFields } from '@/content/detector'
import { fillCustomDropdown, fillField, fillPillGroup } from '@/content/autofill'
import { readActualValue } from '@/content/validate'
import { matchField } from '@/content/matcher'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import { EEO_TOPIC_RE, crossesEeoTopic } from '@/lib/eeo'
import type { QAEntry } from '@/types'

// ---------------------------------------------------------------------------
// Oracle Recruiting Cloud Candidate Experience (Cummins, live capture +
// oj-hcm-ce bundle source, 2026-07-16). The apply flow uses CX's own
// Knockout/Preact widgets, NOT Oracle JET:
// - cx-select: <input role="combobox" aria-haspopup="grid"> + companion
//   toggle <button aria-controls="<id>-listbox">; the popup renders
//   div[role="grid"] > div[role="row"] > div[role="gridcell"].cx-select__
//   list-item — no option/listbox role anywhere (the live kill: every
//   dropdown fill died with "0 scoped options").
// - radio groups: each radio is aria-labelled with its OPTION text ("Yes");
//   the question hangs off <div role="radiogroup" aria-labelledby=…>.
// - diversity questionnaire: "Select the RACES you identify with" — plural,
//   which the singular-only EEO vocabulary missed.
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = ''
})

/** The City cx-select exactly as Cummins renders it (closed). */
function buildCxSelect(doc: Document): { input: HTMLInputElement; toggle: HTMLButtonElement } {
  const row = doc.createElement('div')
  row.className = 'input-row'
  row.innerHTML = `
    <label class="input-row__label cx-select__label input-row__label--required" for="city-30">City
      <span class="cx-select__label--required">*</span>
    </label>
    <div class="cx-select-container">
      <div class="input-field-container">
        <div class="input-field-container__left">
          <input autocomplete="none" name="city" id="city-30" type="text" role="combobox"
                 aria-autocomplete="list" aria-haspopup="grid" aria-controls="city-30-listbox"
                 aria-expanded="false" aria-invalid="false" aria-required="true"
                 class="cx-select-input  " />
        </div>
        <div class="input-field-container__right">
          <button type="button" class="icon-dropdown-arrow" id="city-30-toggle-button" tabindex="-1"
                  aria-label="Open the drop-down list for City." title="Open the drop-down list for City."
                  aria-expanded="false" aria-controls="city-30-listbox"></button>
        </div>
      </div>
    </div>`
  doc.body.appendChild(row)
  const input = doc.getElementById('city-30') as HTMLInputElement
  const toggle = doc.getElementById('city-30-toggle-button') as HTMLButtonElement

  // Widget behavior (from the bundle source): clicking the input or toggle
  // opens a PORTALED grid; clicking a gridcell commits its text as the
  // input's value and closes the popup.
  const open = () => {
    if (doc.getElementById('city-30-listbox')) return
    const portal = doc.createElement('div')
    portal.className = 'cx-select__options'
    portal.innerHTML = `
      <div class="cx-select-container cx-select-dropdown--open">
        <div class="cx-select__listbox" id="city-30-listbox-container">
          <div class="cx-select__list" role="grid" id="city-30-listbox" aria-label="City" tabindex="-1">
            ${['Dallas', 'Houston', 'Huntsville'].map((city, i) => `
              <div role="row">
                <div tabindex="-1" role="gridcell" id="city-30-listitem-${i}" aria-selected="false"
                     class="cx-select__list-item">
                  <div class="cx-select__list-item-container">
                    <span class="cx-select__list-item--content">${city}</span>
                  </div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>`
    doc.body.appendChild(portal)
    input.setAttribute('aria-expanded', 'true')
    for (const cell of portal.querySelectorAll<HTMLElement>('[role="gridcell"]')) {
      cell.addEventListener('click', () => {
        const text = cell.textContent?.trim() ?? ''
        const proto = Object.getPrototypeOf(input) as object
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
        setter?.call(input, text)
        portal.remove()
        input.setAttribute('aria-expanded', 'false')
      })
    }
  }
  input.addEventListener('click', open)
  toggle.addEventListener('click', open)
  return { input, toggle }
}

describe('Oracle CX cx-select (grid popup)', () => {
  it('detects the combobox input as ONE field and never its toggle button', () => {
    buildCxSelect(document)
    const fields = detectFields(document)
    const dropdowns = fields.filter((f) => f.signal.kind === 'custom-dropdown')
    expect(dropdowns).toHaveLength(1)
    expect(dropdowns[0].el.id).toBe('city-30')
    expect(dropdowns[0].signal.label).toMatch(/^City/)
    expect(fields.some((f) => f.el.id === 'city-30-toggle-button')).toBe(false)
  })

  it('fills via the grid popup: open → gridcell options found → click commits', async () => {
    const { input } = buildCxSelect(document)
    const result = await fillCustomDropdown(input, 'Houston')
    expect(result.outcome).toBe('filled')
    expect(input.value).toBe('Houston')
  })

  it('opens through the toggle path too (grid renders only after a click)', async () => {
    const { input, toggle } = buildCxSelect(document)
    // Simulate a widget whose INPUT click does nothing (some cx-selects only
    // open from the arrow): drop the input listener by rebuilding it.
    const clone = input.cloneNode(true) as HTMLInputElement
    input.replaceWith(clone)
    expect(toggle).toBeTruthy()
    const result = await fillCustomDropdown(clone, 'Huntsville')
    // The adjacent-trigger fallback clicks the ☰/arrow button next to the
    // input, which shares the widget wrapper — options then appear.
    expect(result.outcome).toBe('filled')
  }, 15000)
})

// ---------------------------------------------------------------------------
// The cx-select combobox INPUT looks skippable: non-searchable widgets render
// it `readonly`, searchable ones render it `type="search"`. Either plain-input
// veto used to delete the input while its companion toggle button was ALSO
// deduped against the DOM combobox — so the whole widget vanished from
// detection and never filled (live NOV miss, egay.fa.us6 CX_4001, section 1,
// 2026-07-17; harness-reproduced: pre-fix detected 0, post-fix 2 filled ok).
// The combobox trigger must survive BOTH vetoes; the toggle stays deduped.
// ---------------------------------------------------------------------------

/** A cx-select whose combobox input carries the given extra attribute
 *  (`readonly` or `type="search"`) alongside its deduped toggle button. */
function buildCxSelectTrigger(doc: Document, extraAttrs: string): void {
  const row = doc.createElement('div')
  row.className = 'input-row'
  row.innerHTML = `
    <label class="cx-select__label" for="country-26">Country</label>
    <div class="cx-select-container">
      <div class="input-field-container">
        <input autocomplete="none" name="country" id="country-26" role="combobox"
               aria-autocomplete="list" aria-haspopup="grid" aria-controls="country-26-listbox"
               aria-expanded="false" class="cx-select-input" ${extraAttrs} />
        <button type="button" class="icon-dropdown-arrow" id="country-26-toggle-button"
                tabindex="-1" aria-label="Open the drop-down list for Country."
                aria-haspopup="grid" aria-controls="country-26-listbox"></button>
      </div>
    </div>`
  doc.body.appendChild(row)
}

describe('Oracle CX cx-select combobox trigger survives plain-input vetoes', () => {
  it('detects a READONLY (non-searchable) combobox input, not its toggle button', () => {
    buildCxSelectTrigger(document, 'readonly')
    const fields = detectFields(document)
    const dropdowns = fields.filter((f) => f.signal.kind === 'custom-dropdown')
    expect(dropdowns).toHaveLength(1)
    expect(dropdowns[0].el.id).toBe('country-26')
    expect(dropdowns[0].signal.label).toMatch(/^Country/)
    expect(fields.some((f) => f.el.id === 'country-26-toggle-button')).toBe(false)
  })

  it('detects a type=search (searchable) combobox input, not its toggle button', () => {
    buildCxSelectTrigger(document, 'type="search"')
    const fields = detectFields(document)
    const dropdowns = fields.filter((f) => f.signal.kind === 'custom-dropdown')
    expect(dropdowns).toHaveLength(1)
    expect(dropdowns[0].el.id).toBe('country-26')
    expect(fields.some((f) => f.el.id === 'country-26-toggle-button')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Searchable cx-select catalogs (NOV City, live gap 2026-07-17): the popup
// opens on a rendered SUBSET of a large list (early alphabet only) — or on
// an empty "start typing" status panel — and the full catalog only reveals
// through the combobox input's filter. The fill must type the answer instead
// of giving up on the visible subset.
// ---------------------------------------------------------------------------

/** A city cx-select whose grid re-renders from `catalog` filtered by the
 *  input's value; empty value renders `initialSubset` (possibly nothing). */
function buildSearchableCxSelect(
  doc: Document,
  catalog: string[],
  initialSubset: string[],
): { input: HTMLInputElement } {
  const row = doc.createElement('div')
  row.className = 'input-row'
  row.innerHTML = `
    <label class="input-row__label cx-select__label" for="city-44">City</label>
    <div class="cx-select-container">
      <div class="input-field-container">
        <input autocomplete="none" name="city" id="city-44" type="text" role="combobox"
               aria-autocomplete="list" aria-haspopup="grid" aria-controls="city-44-listbox"
               aria-expanded="false" class="cx-select-input" />
      </div>
    </div>`
  doc.body.appendChild(row)
  const input = doc.getElementById('city-44') as HTMLInputElement

  const matches = () => {
    const term = input.value.trim().toLowerCase()
    return term === '' ? initialSubset : catalog.filter((c) => c.toLowerCase().includes(term))
  }
  const renderRows = (portal: HTMLElement) => {
    const names = matches()
    // Empty result set renders the bundle's role="status" panel, not a grid
    portal.innerHTML =
      names.length === 0
        ? `<div class="cx-select__listbox"><div role="status">Start typing to search</div></div>`
        : `
      <div class="cx-select__listbox">
        <div class="cx-select__list" role="grid" id="city-44-listbox" aria-label="City" tabindex="-1">
          ${names.map((city, i) => `
            <div role="row">
              <div tabindex="-1" role="gridcell" id="city-44-listitem-${i}" aria-selected="false"
                   class="cx-select__list-item">${city}</div>
            </div>`).join('')}
        </div>
      </div>`
    for (const cell of portal.querySelectorAll<HTMLElement>('[role="gridcell"]')) {
      cell.addEventListener('click', () => {
        const text = cell.textContent?.trim() ?? ''
        const proto = Object.getPrototypeOf(input) as object
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
        setter?.call(input, text)
        portal.remove()
        input.setAttribute('aria-expanded', 'false')
      })
    }
  }
  const open = () => {
    if (doc.querySelector('.cx-select__options[data-for="city-44"]')) return
    const portal = doc.createElement('div')
    portal.className = 'cx-select__options'
    portal.setAttribute('data-for', 'city-44')
    doc.body.appendChild(portal)
    input.setAttribute('aria-expanded', 'true')
    renderRows(portal)
  }
  input.addEventListener('click', open)
  input.addEventListener('input', () => {
    const portal = doc.querySelector<HTMLElement>('.cx-select__options[data-for="city-44"]')
    if (portal) renderRows(portal)
  })
  return { input }
}

const TX_CATALOG = ['Abilene', 'Amarillo', 'Austin', 'Dallas', 'El Paso', 'Fort Worth', 'Houston', 'Huntsville']

describe('Oracle CX searchable cx-select (filter-revealed catalog)', () => {
  it('fills Houston from a subset-rendered list by typing the filter', async () => {
    const { input } = buildSearchableCxSelect(document, TX_CATALOG, ['Abilene', 'Amarillo', 'Austin'])
    const result = await fillCustomDropdown(input, 'Houston')
    expect(result.outcome).toBe('filled')
    expect(input.value).toBe('Houston')
  }, 20000)

  it('fills Houston from an empty start-typing list', async () => {
    const { input } = buildSearchableCxSelect(document, TX_CATALOG, [])
    const result = await fillCustomDropdown(input, 'Houston')
    expect(result.outcome).toBe('filled')
    expect(input.value).toBe('Houston')
  }, 20000)

  it('an answer absent from the catalog fails honestly and leaves no filter residue', async () => {
    const { input } = buildSearchableCxSelect(document, TX_CATALOG, ['Abilene', 'Amarillo', 'Austin'])
    const result = await fillCustomDropdown(input, 'Zzyzx')
    expect(result.outcome).toBe('failed')
    expect(input.value).toBe('')
  }, 20000)

  it('degree cx-select: "Master of Science" lands on "Master\'s Degree" (variant placement)', async () => {
    const degrees = ['High School Diploma', "Associate's Degree", "Bachelor's Degree", "Master's Degree", 'Doctorate']
    const { input } = buildSearchableCxSelect(document, degrees, degrees)
    const result = await fillCustomDropdown(input, 'Master of Science')
    expect(result.outcome).toBe('filled')
    expect(input.value).toBe("Master's Degree")
  }, 20000)
})

describe('Oracle CX radio groups (role="radiogroup" carries the question)', () => {
  it('resolves the group question from the radiogroup aria-labelledby, not the option label', () => {
    document.body.innerHTML = `
      <div class="input-row input-row--radiogroup" role="radiogroup" aria-labelledby="q-14-label">
        <div class="form-element-label" id="q-14-label">Have you previously worked for Cummins or one of its subsidiaries?</div>
        <div class="input-row__control-container">
          <input type="radio" class="input-row__hidden-control apply-flow-input-radio-control"
                 id="300004690578469-14-300004700270291" name="300004690578469-14" value="300004700270291"
                 aria-labelledby="label-300004690578469-14-300004700270291" />
          <label class="apply-flow-input-radio" for="300004690578469-14-300004700270291">
            <span class="apply-flow-input-radio__button" aria-hidden="true"></span>
            <span id="label-300004690578469-14-300004700270291">Yes</span>
          </label>
          <input type="radio" class="input-row__hidden-control apply-flow-input-radio-control"
                 id="300004690578469-14-300004700270292" name="300004690578469-14" value="300004700270292"
                 aria-labelledby="label-300004690578469-14-300004700270292" />
          <label class="apply-flow-input-radio" for="300004690578469-14-300004700270292">
            <span class="apply-flow-input-radio__button" aria-hidden="true"></span>
            <span id="label-300004690578469-14-300004700270292">No</span>
          </label>
        </div>
      </div>`
    const fields = detectFields(document)
    const radios = fields.filter((f) => f.signal.kind === 'radio')
    expect(radios).toHaveLength(1)
    expect(radios[0].signal.label).toBe(
      'Have you previously worked for Cummins or one of its subsidiaries?',
    )
    expect(radios[0].signal.options.map((o) => o.text)).toEqual(['Yes', 'No'])
  })
})

// ---------------------------------------------------------------------------
// Pill groups (NOV capture, src/content/overlay/oracle.md): the Application
// Questions have ZERO native inputs — each answer is a plain
// <button aria-pressed> pill inside <ul role="list" aria-label="…question…">.
// The input/select/textarea sweep is structurally blind to them, which was
// the whole reason for the non-detection.
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
    fieldType: 'radio',
    options: [],
    status: 'active',
    source: 'training',
    captureContext: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

/** A cx-select-pills question exactly as Oracle CX renders it, with the
 *  framework's commit behavior: only a real click flips aria-pressed. */
function buildPillGroup(
  question: string,
  optionTexts: string[],
  dataQa = 'natTravelFlag',
  pressedIndex = -1,
): { buttons: HTMLButtonElement[]; clicks: () => number } {
  let clickCount = 0
  const row = document.createElement('div')
  row.className = 'input-row'
  row.innerHTML = `
    <div data-qa="${dataQa}">
      <div class="cx-select-pills">
        <ul class="cx-select-pills-container" role="list" aria-label="${question}">
          ${optionTexts.map((text, i) => `
            <li role="listitem">
              <button type="button" aria-disabled="false" aria-pressed="${i === pressedIndex}"
                      class="cx-select-pill-section${i === pressedIndex ? ' cx-select-pill-section--selected' : ''}">
                <span class="cx-select-pill-name"> ${text}</span>
              </button>
            </li>`).join('')}
        </ul>
      </div>
    </div>`
  document.body.appendChild(row)
  const buttons = [...row.querySelectorAll<HTMLButtonElement>('button.cx-select-pill-section')]
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      clickCount++
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === btn))
    })
  }
  return { buttons, clicks: () => clickCount }
}

describe('Oracle CX pill groups (button questionnaire, no native inputs)', () => {
  it('detects the group as ONE radio-kind field with the ul aria-label as question', () => {
    buildPillGroup('Travel Domestically', ['No', 'Yes'])
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    const [field] = fields
    expect(field.signal.kind).toBe('radio')
    expect(field.signal.label).toBe('Travel Domestically')
    expect(field.signal.options.map((o) => o.text)).toEqual(['No', 'Yes'])
    expect(field.signal.filled).toBe(false)
    expect(field.pillEls).toHaveLength(2)
    // the individual pill buttons never become fields of their own
    expect(fields.some((f) => f.el.tagName === 'BUTTON')).toBe(false)
  })

  it('a pressed pill marks the group filled (autofill skips answered questions)', () => {
    buildPillGroup('Willing to Relocate', ['No', 'Yes'], 'relocateFlag', 1)
    const [field] = detectFields(document)
    expect(field.signal.filled).toBe(true)
  })

  it('matches a stored answer and fills END-TO-END: click flips aria-pressed', async () => {
    const { buttons } = buildPillGroup('Willing to Relocate', ['No', 'Yes'], 'relocateFlag')
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: defaultProfile(),
      qa: [qaEntry({ question: 'Willing to relocate?', answer: 'Yes' })],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.action).toBe('autofill')
    const result = await fillField(field, { ...match!, resolvedAnswer: match!.rawAnswerTemplate })
    expect(result.outcome).toBe('filled')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false')
    // validation reads the pressed pill's text back
    expect(readActualValue(field)).toBe('Yes')
  })

  it('never re-clicks an already-pressed pill (a second click would toggle it OFF)', async () => {
    const { buttons, clicks } = buildPillGroup('Travel Internationally', ['No', 'Yes'], 'intlTravelFlag', 0)
    const [field] = detectFields(document)
    const { outcome } = await fillPillGroup(field.pillEls!, undefined, 'No')
    expect(outcome).toBe('filled')
    expect(clicks()).toBe(0)
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
  })

  it('handles non-yes/no option sets (frequency pills) and polarity answers', async () => {
    buildPillGroup('Travel Frequency', ['Never', 'Occasionally', 'Frequently'], 'natTravelFrequency')
    const [field] = detectFields(document)
    const { outcome, pickedText } = await fillPillGroup(field.pillEls!, undefined, 'Occasionally')
    expect(outcome).toBe('filled')
    expect(pickedText).toBe('Occasionally')
    expect(readActualValue(field)).toBe('Occasionally')
  })

  it('honest failed when the widget swallows the click (aria-pressed never flips)', async () => {
    const { buttons } = buildPillGroup('Are you a current NOV employee?', ['No', 'Yes'], '300000809568641')
    // Simulate a dead widget: remove the commit handlers by cloning
    for (const btn of buttons) btn.replaceWith(btn.cloneNode(true))
    const [field] = detectFields(document)
    const { outcome } = await fillPillGroup(field.pillEls!, undefined, 'No')
    expect(outcome).toBe('failed')
  }, 15000)

  it('MULTI-select pills (cx-multi-select-pills): compound answer presses several, unpresses none', async () => {
    // cx-select-pills isMultiselect=true (NOV bundle source): container rides
    // in .cx-multi-select-pills, several pills can be pressed at once.
    let clickCount = 0
    const row = document.createElement('div')
    row.className = 'input-row input-row--has-picker'
    row.innerHTML = `
      <div class="input-row__control-container input-row--multiselect cx-multi-select-pills" data-qa="preferredStates">
        <ul class="cx-select-pills-container" role="list" aria-label="Which states are you willing to work in?">
          ${['NC', 'NY', 'TX', 'NJ'].map((s, i) => `
            <li role="listitem">
              <button type="button" aria-disabled="false" aria-pressed="${i === 1}"
                      class="cx-select-pill-section${i === 1 ? ' cx-select-pill-section--selected' : ''}">
                <span class="cx-select-pill-name"> ${s}</span>
                <span class="${i === 1 ? 'cx-select-pill__remove-icon' : 'cx-select-pill__plus-icon'}"></span>
              </button>
            </li>`).join('')}
        </ul>
      </div>`
    document.body.appendChild(row)
    const buttons = [...row.querySelectorAll<HTMLButtonElement>('button')]
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        clickCount++
        btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'))
      })
    }
    const [field] = detectFields(document)
    expect(field.signal.kind).toBe('checkbox') // multi = checkbox semantics
    expect(field.pillEls).toHaveLength(4)
    const { outcome, pickedText } = await fillPillGroup(field.pillEls!, undefined, 'NC, TX', [], [], false, true)
    expect(outcome).toBe('filled')
    expect(pickedText).toBe('NC; TX')
    // NC + TX newly pressed, the pre-pressed NY untouched (no toggle-off)
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true', 'false'])
    expect(clickCount).toBe(2)
    expect(readActualValue(field)).toBe('NC; NY; TX')
  })

  it('detects UNANSWERED multi pills that render with NO aria-pressed at all (live NOV miss)', async () => {
    // cx-select-pills isMultiselect with no value yet: isSelected is
    // undefined, so Preact omits aria-pressed entirely — the class-anchored
    // fallback is the only detection signal.
    const row = document.createElement('div')
    row.innerHTML = `
      <div class="input-row__control-container input-row--multiselect cx-multi-select-pills" data-qa="300003662938200">
        <ul class="cx-select-pills-container" role="list" aria-label="Do you have a bachelor’s degree in engineering or supply chain management?">
          <li role="listitem"><button type="button" aria-disabled="false" class="cx-select-pill-section  "><span class="cx-select-pill-name"> Yes</span><span class="cx-select-pill__plus-icon"></span></button></li>
          <li role="listitem"><button type="button" aria-disabled="false" class="cx-select-pill-section  "><span class="cx-select-pill-name"> No</span><span class="cx-select-pill__plus-icon"></span></button></li>
        </ul>
      </div>`
    document.body.appendChild(row)
    const buttons = [...row.querySelectorAll<HTMLButtonElement>('button')]
    for (const btn of buttons) {
      btn.addEventListener('click', () =>
        btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true')),
      )
    }
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.kind).toBe('checkbox') // multiselect container
    expect(fields[0].signal.label).toMatch(/bachelor/)
    expect(fields[0].signal.filled).toBe(false)
    const { outcome } = await fillPillGroup(fields[0].pillEls!, undefined, 'Yes', [], [], false, true)
    expect(outcome).toBe('filled')
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
  })

  it('Cummins Title prefix pills fill from the stored name-prefix answer', async () => {
    const { buttons } = buildPillGroup('Title', ['Capt.', 'Doctor', 'Miss', 'Mr.', 'Mrs.', 'Ms.', 'Rev.'], 'title')
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: defaultProfile(),
      qa: [qaEntry({ question: 'Prefix', aliases: ['Title', 'Salutation'], answer: 'Mr.' })],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    expect(match?.action).toBe('autofill')
    const result = await fillField(field, { ...match!, resolvedAnswer: match!.rawAnswerTemplate })
    expect(result.outcome).toBe('filled')
    expect(buttons[3].getAttribute('aria-pressed')).toBe('true')
  })
})

describe('pill-group hardening (adversarial review catches, 2026-07-17)', () => {
  it('consent-worded pill groups carry consentLike despite kind radio (judge must never infer them)', () => {
    buildPillGroup('I agree to receive SMS updates about new job opportunities.', ['No', 'Yes'], 'smsConsent')
    const [field] = detectFields(document)
    expect(field.signal.kind).toBe('radio')
    expect(field.signal.consentLike).toBe(true)
  })

  it('cookie-preference toggle walls are never fields', () => {
    buildPillGroup('Manage cookie preferences', ['Necessary only', 'Accept all'], 'cmp')
    expect(detectFields(document)).toHaveLength(0)
  })

  it('search-facet filter chips are never fields', () => {
    document.body.innerHTML = `
      <main><section class="search-facet-filters">
        <h3>Employment Type</h3>
        <ul role="list">
          <li><button aria-pressed="false">Full time</button></li>
          <li><button aria-pressed="false">Part time</button></li>
        </ul>
      </section></main>`
    expect(detectFields(document)).toHaveLength(0)
  })

  it('several questions sharing one list container split into separate fields, never one merged field', () => {
    document.body.innerHTML = `
      <div role="group" aria-label="Application Questions">
        <div class="q"><p>Are you over 18?</p>
          <button aria-pressed="false">Yes</button><button aria-pressed="false">No</button></div>
        <div class="q"><p>Do you require sponsorship?</p>
          <button aria-pressed="false">Yes</button><button aria-pressed="false">No</button></div>
      </div>`
    const fields = detectFields(document)
    expect(fields).toHaveLength(2)
    const labels = fields.map((f) => f.signal.label)
    expect(labels).toContain('Are you over 18?')
    expect(labels).toContain('Do you require sponsorship?')
    for (const f of fields) expect(f.signal.options.map((o) => o.text)).toEqual(['Yes', 'No'])
  })

  it('a label-less pill group next to a labeled input never steals that label', () => {
    document.body.innerHTML = `
      <div class="page">
        <div class="field"><label for="sal">Expected Salary</label><input id="sal" name="expectedSalary" /></div>
        <div class="pills"><ul>
          <li><button aria-pressed="false">No</button></li>
          <li><button aria-pressed="false">Yes</button></li>
        </ul></div>
      </div>`
    const fields = detectFields(document)
    const salaryLabeled = fields.filter((f) => /expected salary/i.test(f.signal.label))
    expect(salaryLabeled).toHaveLength(1) // only the real input, never the pills
    expect(salaryLabeled[0].el.id).toBe('sal')
  })

  it('a dropdown trigger with BOTH aria-expanded and aria-pressed still detects as a dropdown', () => {
    document.body.innerHTML = `
      <div><span>Device Type</span>
        <button aria-expanded="false" aria-pressed="false">Select One</button></div>`
    const fields = detectFields(document)
    expect(fields.some((f) => f.signal.kind === 'custom-dropdown')).toBe(true)
  })

  it('fillField reports the pill that LANDED, not the stored wording (validation input)', async () => {
    const { buttons } = buildPillGroup('How often can you travel?', ['Never', 'Sometimes', 'Frequently'], 'travelFreq')
    const [field] = detectFields(document)
    const result = await fillField(field, {
      fieldId: field.signal.fieldId,
      resolvedAnswer: 'Occasionally',
      rawAnswerTemplate: 'Occasionally',
      confidence: 1,
      source: 'qa:x',
      unresolvedVars: [],
      chosenOptionValue: 'Sometimes', // semantic bridge placed it at match time
      action: 'autofill',
      needsReview: false,
      composite: false,
    })
    expect(result.outcome).toBe('filled')
    expect(result.filledText).toBe('Sometimes')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true')
  })

  it('slow async commits never trigger a second (toggle-off) click', async () => {
    // Widget commits ~1s after the click — within the pre-escalation poll
    let clickCount = 0
    document.body.innerHTML = `
      <ul role="list" aria-label="Willing to Relocate">
        <li><button type="button" aria-pressed="false" class="cx-select-pill-section"><span> No</span></button></li>
        <li><button type="button" aria-pressed="false" class="cx-select-pill-section"><span> Yes</span></button></li>
      </ul>`
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')]
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        clickCount++
        setTimeout(() => {
          for (const other of buttons) other.setAttribute('aria-pressed', String(other === btn))
        }, 1000)
      })
    }
    const [field] = detectFields(document)
    const { outcome } = await fillPillGroup(field.pillEls!, undefined, 'Yes')
    expect(outcome).toBe('filled')
    expect(clickCount).toBe(1) // never escalated into a second click
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true')
  }, 15000)
})

describe('"Are you a current <brand> employee?" (live NOV mismatch)', () => {
  it('answers No from previouslyEmployedHere=false — never the employer-name seed', async () => {
    const { buttons } = buildPillGroup('Are you a current NOV employee?', ['Yes', 'No'], '300000809568641')
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: { ...defaultProfile(), previouslyEmployedHere: false },
      qa: [
        // the trap: a current-employer entry whose answer is a company name
        qaEntry({
          id: 'seed-current-employer',
          question: 'Current employer',
          aliases: ['Who is your current employer?'],
          answer: '{{workHistory.0.company}}',
        }),
      ],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
      pageContext: { company: 'NOV', role: null, location: null, source: 'meta' },
      hostname: 'egay.fa.us6.oraclecloud.com',
    })
    expect(match?.rawAnswerTemplate).not.toContain('workHistory')
    expect(match?.action).toBe('autofill')
    expect(match?.chosenOptionValue).toBe('No')
    const result = await fillField(field, { ...match!, resolvedAnswer: match!.rawAnswerTemplate })
    expect(result.outcome).toBe('filled')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true') // No
  })

  it('past employment there → honestly skips (current status unknowable)', async () => {
    buildPillGroup('Are you a current NOV employee?', ['Yes', 'No'], '300000809568641')
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: { ...defaultProfile(), previouslyEmployedHere: true },
      qa: [],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
      pageContext: { company: 'NOV', role: null, location: null, source: 'meta' },
      hostname: 'egay.fa.us6.oraclecloud.com',
    })
    // no tier-1 answer; nothing else stored → no autofill-grade match
    expect(match?.action ?? 'ignore').not.toBe('autofill')
  })

  it('a template-variable answer that places on no option never becomes a chip', async () => {
    buildPillGroup('Are you a current employee of this company?', ['Yes', 'No'], 'curEmp')
    const [field] = detectFields(document)
    const match = await matchField(field.signal, {
      profile: { ...defaultProfile(), previouslyEmployedHere: true }, // getter skips
      qa: [
        qaEntry({
          id: 'seed-current-employer',
          question: 'Are you currently employed? Current employer',
          answer: '{{workHistory.0.company}}',
        }),
      ],
      seeds: [],
      settings: defaultSettings(),
      activePersona: null,
    })
    if (match && /workHistory/.test(match.rawAnswerTemplate)) {
      expect(match.action).toBe('ignore')
    }
  })
})

describe('EEO vocabulary covers plural/adjective race wordings', () => {
  it('flags "races"/"racial" as EEO topics', () => {
    expect(EEO_TOPIC_RE.test('Select the races you identify with.')).toBe(true)
    expect(EEO_TOPIC_RE.test('Racial or ethnic background')).toBe(true)
    // and must never bridge to a non-EEO question
    expect(crossesEeoTopic('Select the races you identify with.', 'School or University')).toBe(true)
  })

  it('does not overreach into non-EEO words', () => {
    expect(EEO_TOPIC_RE.test('racetrack operations manager')).toBe(false)
    expect(EEO_TOPIC_RE.test('trace the shipment')).toBe(false)
  })
})
