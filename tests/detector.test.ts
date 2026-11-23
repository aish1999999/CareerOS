import { beforeEach, describe, expect, it } from 'vitest'
import { detectFields } from '@/content/detector'

function render(html: string): void {
  document.body.innerHTML = html
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('detectFields', () => {
  it('builds a signal from <label for>', () => {
    render(`<label for="fn">First Name *</label><input id="fn" type="text" required>`)
    const [field] = detectFields(document)
    expect(field.signal.label).toBe('First Name *')
    expect(field.signal.normalizedQuestion).toBe('first name')
    expect(field.signal.kind).toBe('text')
    expect(field.signal.required).toBe(true)
  })

  it('uses wrapping label, aria-label, placeholder, then name', () => {
    render(`
      <label>Email address <input type="email" id="a"></label>
      <input type="text" aria-label="Phone number" id="b">
      <input type="text" placeholder="LinkedIn URL" id="c">
      <input type="text" name="candidate_last_name" id="d">
    `)
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => f.el.id === id)!.signal
    expect(byId('a').label).toContain('Email')
    expect(byId('b').label).toBe('Phone number')
    expect(byId('c').normalizedQuestion).toContain('linkedin')
    expect(byId('d').normalizedQuestion).toBe('candidate last name')
  })

  it('captures autocomplete tokens and select options', () => {
    render(`
      <label for="ctry">Country</label>
      <select id="ctry" autocomplete="country-name">
        <option value="">Choose…</option>
        <option value="de">Germany</option>
        <option value="us">United States</option>
      </select>
    `)
    const [field] = detectFields(document)
    expect(field.signal.kind).toBe('select')
    expect(field.signal.autocomplete).toBe('country-name')
    expect(field.signal.options).toContainEqual({ value: 'de', text: 'Germany' })
  })

  it('groups radios by name with option labels and fieldset legend as question', () => {
    render(`
      <fieldset>
        <legend>Are you authorized to work in the US?</legend>
        <label for="r1">Yes</label><input type="radio" name="auth" id="r1" value="yes">
        <label for="r2">No</label><input type="radio" name="auth" id="r2" value="no">
      </fieldset>
    `)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    const { signal, groupEls } = fields[0]
    expect(signal.kind).toBe('radio')
    expect(groupEls).toHaveLength(2)
    expect(signal.label).toContain('authorized to work')
    expect(signal.options.map((o) => o.text)).toEqual(['Yes', 'No'])
  })

  it('flags consent checkboxes and EEO fields', () => {
    render(`
      <label for="tos">I agree to the terms and privacy policy</label>
      <input type="checkbox" id="tos">
      <label for="g">Gender identity (voluntary)</label>
      <select id="g"><option>Woman</option><option>Man</option></select>
    `)
    const fields = detectFields(document)
    const consent = fields.find((f) => f.el.id === 'tos')!
    const eeo = fields.find((f) => f.el.id === 'g')!
    expect(consent.signal.consentLike).toBe(true)
    expect(eeo.signal.eeoLike).toBe(true)
  })

  it('skips hidden inputs, honeypots, search boxes, disabled fields', () => {
    render(`
      <input type="hidden" name="csrf">
      <input type="text" name="website_hp" style="display:none">
      <div style="visibility:hidden"><input type="text" name="trap"></div>
      <input type="text" name="hp2" style="position:absolute;left:-9999px">
      <input type="search" name="q" placeholder="Search jobs">
      <input type="text" name="disabled_one" disabled>
      <label for="real">City</label><input type="text" id="real">
    `)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].el.id).toBe('real')
  })

  it('marks already-filled fields', () => {
    render(`<label for="e">Email</label><input id="e" type="email" value="a@b.c">`)
    const [field] = detectFields(document)
    expect(field.signal.filled).toBe(true)
  })

  it('detects multiplicity cues for composite routing', () => {
    render(`<label for="w">List your last 3 employers</label><textarea id="w"></textarea>`)
    const [field] = detectFields(document)
    expect(field.signal.multiplicityCue).toBe(true)
    expect(field.signal.kind).toBe('textarea')
  })

  it('detects custom dropdowns via role=combobox', () => {
    render(`<div role="combobox" aria-label="Country of residence" aria-haspopup="listbox"></div>`)
    const [field] = detectFields(document)
    expect(field.signal.kind).toBe('custom-dropdown')
    expect(field.signal.normalizedQuestion).toContain('country')
  })

  it('stamps stable data-ff-id attributes', () => {
    render(`<input type="text" aria-label="Nickname">`)
    const [first] = detectFields(document)
    const [second] = detectFields(document)
    expect(first.signal.fieldId).toBe(second.signal.fieldId)
  })
})

// Exact DOM shape documented in date.md (real Workday capture).
function workdayDateWidget(sectionKey: string, dateKey: string, label: string, month = '', year = ''): string {
  const prefix = `${sectionKey}--${dateKey}`
  return `
    <div>
      <label>${label}*</label>
      <div id="${prefix}" data-automation-id="dateInputWrapper" role="group">
        <input id="${prefix}-dateSectionMonth-input" data-automation-id="dateSectionMonth-input"
               role="spinbutton" type="text" aria-label="Month" aria-valuemin="1" aria-valuemax="12" value="${month}">
        <input id="${prefix}-dateSectionYear-input" data-automation-id="dateSectionYear-input"
               role="spinbutton" type="text" aria-label="Year" aria-valuemin="1" aria-valuemax="9999" value="${year}">
      </div>
    </div>
  `
}

describe('Workday segmented date widgets', () => {
  it('groups Month/Year spinbuttons into ONE date field labeled by the wrapper', () => {
    render(workdayDateWidget('workExperience-6', 'startDate', 'From'))
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    const [field] = fields
    expect(field.signal.kind).toBe('date')
    expect(field.signal.label).toContain('From')
    expect(field.signal.required).toBe(true)
    expect(field.dateSegmentEls?.month?.getAttribute('aria-label')).toBe('Month')
    expect(field.dateSegmentEls?.year?.getAttribute('aria-label')).toBe('Year')
  })

  it('never labels a date group with spinbutton value noise ("current value is YYYY")', () => {
    // NVIDIA education page: year-only date widgets, no resolvable wrapper
    // label — the empty spinbutton announces its FORMAT as aria text, which
    // must not become the question (it matches nothing, ever).
    const yearOnly = (n: number) => `
      <div id="education-${n}--startDate" data-automation-id="dateInputWrapper" role="group">
        <input id="education-${n}--startDate-dateSectionYear-input" data-automation-id="dateSectionYear-input"
               role="spinbutton" type="text" aria-label="current value is YYYY"
               aria-valuetext="current value is YYYY" aria-valuemin="1" aria-valuemax="9999" value="">
      </div>
    `
    render(`<div>${yearOnly(1)}${yearOnly(2)}</div>`)
    const fields = detectFields(document)
    expect(fields).toHaveLength(2)
    for (const field of fields) {
      expect(field.signal.kind).toBe('date')
      expect(field.signal.label).not.toMatch(/current value/i)
      expect(field.signal.normalizedQuestion).not.toMatch(/current value/i)
      // The wrapper's identifier carries the question instead
      expect(field.signal.normalizedQuestion).toContain('start')
      // …and the education repeat family gates the date getter correctly
      expect(field.signal.sectionKind).toBe('education')
    }
    expect(fields.map((f) => f.signal.sectionIndex)).toEqual([0, 1])
  })

  it('treats the group as filled only when every segment has a value', () => {
    render(
      workdayDateWidget('workExperience-6', 'startDate', 'From', '2', '2002') +
        workdayDateWidget('workExperience-6', 'endDate', 'To', '', '2007'),
    )
    const fields = detectFields(document)
    expect(fields).toHaveLength(2)
    const from = fields.find((f) => f.signal.label.includes('From'))!
    const to = fields.find((f) => f.signal.label.includes('To'))!
    expect(from.signal.filled).toBe(true)
    expect(to.signal.filled).toBe(false)
  })
})

describe('repeated-section indexing', () => {
  it('ranks Workday id-prefixed blocks by DOM order, not by their instance number', () => {
    // widget-instance numbers are NOT ordinals — deletes leave gaps (6, 9)
    render(`
      <div>
        <label for="workExperience-6--company">Company</label>
        <input id="workExperience-6--company" type="text">
        ${workdayDateWidget('workExperience-6', 'startDate', 'From')}
        <label for="workExperience-9--company">Company</label>
        <input id="workExperience-9--company" type="text">
        ${workdayDateWidget('workExperience-9', 'startDate', 'From')}
      </div>
    `)
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => f.el.id === id)!.signal
    expect(byId('workExperience-6--company').sectionIndex).toBe(0)
    expect(byId('workExperience-9--company').sectionIndex).toBe(1)
    const dates = fields.filter((f) => f.signal.kind === 'date')
    expect(dates.map((f) => f.signal.sectionIndex).sort()).toEqual([0, 1])
  })

  it('falls back to numbered repeating-block headings', () => {
    render(`
      <section><h3>Work Experience 1</h3><label for="c1">Company</label><input id="c1" type="text"></section>
      <section><h3>Work Experience 2</h3><label for="c2">Company</label><input id="c2" type="text"></section>
    `)
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => f.el.id === id)!.signal
    expect(byId('c1').sectionIndex).toBe(0)
    expect(byId('c2').sectionIndex).toBe(1)
  })

  it('never derives an index from unrelated numbered headings', () => {
    render(`
      <section><h3>Step 2 of 4</h3><label for="c1">Company</label><input id="c1" type="text"></section>
    `)
    const [field] = detectFields(document)
    expect(field.signal.sectionIndex).toBeUndefined()
  })
})

describe('section kind classification', () => {
  it('derives work vs education from Workday id prefixes', () => {
    render(`
      <label for="workExperience-6--company">Company</label>
      <input id="workExperience-6--company" type="text">
      <label for="education-2--school">School or University</label>
      <input id="education-2--school" type="text">
    `)
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => f.el.id === id)!.signal
    expect(byId('workExperience-6--company').sectionKind).toBe('work')
    expect(byId('education-2--school').sectionKind).toBe('education')
  })

  it('derives kind from section headings when there is no id prefix', () => {
    render(`
      <section><h3>Education</h3><label for="s1">From</label><input id="s1" type="text"></section>
    `)
    const [field] = detectFields(document)
    expect(field.signal.sectionKind).toBe('education')
  })
})

describe('checkbox groups (multi-select)', () => {
  it('groups same-name checkboxes into one field with the legend as question', () => {
    render(`
      <fieldset>
        <legend>Which shifts are you available for?</legend>
        <label for="s1">Morning</label><input type="checkbox" name="shifts[]" id="s1" value="am">
        <label for="s2">Evening</label><input type="checkbox" name="shifts[]" id="s2" value="pm">
        <label for="s3">Night</label><input type="checkbox" name="shifts[]" id="s3" value="night">
      </fieldset>
    `)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    const [field] = fields
    expect(field.signal.kind).toBe('checkbox')
    expect(field.groupEls).toHaveLength(3)
    expect(field.signal.label).toBe('Which shifts are you available for?')
    expect(field.signal.options.map((o) => o.text)).toEqual(['Morning', 'Evening', 'Night'])
  })

  it('groups unnamed checkboxes sharing a role=group container', () => {
    render(`
      <div role="group" aria-label="Preferred locations">
        <label><input type="checkbox">Houston</label>
        <label><input type="checkbox">Austin</label>
      </div>
    `)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].groupEls).toHaveLength(2)
    expect(fields[0].signal.label).toBe('Preferred locations')
  })

  it('keeps an isolated checkbox a lone yes/no field', () => {
    render(`<label for="c">I have a valid driver's license</label><input type="checkbox" id="c">`)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].groupEls).toBeUndefined()
  })

  it('a grouped consent pair still reads consent-like', () => {
    render(`
      <fieldset>
        <legend>Please confirm you agree to the following</legend>
        <label><input type="checkbox" name="agree[]">I agree to the terms</label>
        <label><input type="checkbox" name="agree[]">I consent to a background check</label>
      </fieldset>
    `)
    const [field] = detectFields(document)
    expect(field.signal.consentLike).toBe(true)
  })
})

describe('styled dropdown triggers & hidden backing selects', () => {
  it('detects a labeled placeholder button with aria-haspopup as a custom dropdown', () => {
    render(`
      <div>
        <label id="rel">Are you willing to relocate?*</label>
        <button aria-haspopup="true" aria-expanded="false" aria-labelledby="rel">Select One</button>
      </div>
    `)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.kind).toBe('custom-dropdown')
    expect(fields[0].signal.label).toContain('relocate')
  })

  it('ignores popup buttons inside site chrome and non-placeholder buttons', () => {
    render(`
      <nav><button aria-haspopup="true">Select</button></nav>
      <button aria-expanded="false" aria-label="FAQ">Do you sponsor visas? Read more</button>
    `)
    expect(detectFields(document)).toHaveLength(0)
  })

  it('detects a hidden backing select behind a styled widget (select2 pattern)', () => {
    render(`
      <label for="rel2">Willing to relocate?</label>
      <select id="rel2" style="display:none">
        <option value="">Select One</option>
        <option value="y">Yes</option>
        <option value="n">No</option>
      </select>
      <div class="fancy-select">Select One</div>
    `)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.kind).toBe('select')
    expect(fields[0].signal.options.map((o) => o.value)).toContain('y')
  })

  it('still skips hidden selects without a real option list (honeypots)', () => {
    render(`<select name="trap" style="display:none"><option value="">x</option></select>`)
    expect(detectFields(document)).toHaveLength(0)
  })

  it('treats a resting "Select One" placeholder with a non-empty value as unfilled', () => {
    render(`
      <label for="sp">Require sponsorship?</label>
      <select id="sp">
        <option value="0" selected>Select One</option>
        <option value="1">Yes</option>
        <option value="2">No</option>
      </select>
    `)
    const [field] = detectFields(document)
    expect(field.signal.filled).toBe(false)
  })
})

describe('Workday questionnaire dropdowns (user-captured DOM)', () => {
  it('resolves the QUESTION as label, not the aria-label placeholder "Select One Required"', () => {
    render(`
      <div>
        <div><b>Will you, now or in the future, require sponsorship for employment status (e.g., H-1b visa status)?*</b></div>
        <div>
          <button aria-haspopup="listbox" type="button" value="" aria-label="Select One Required">Select One</button>
        </div>
      </div>
    `)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.kind).toBe('custom-dropdown')
    expect(fields[0].signal.label).toContain('require sponsorship')
    expect(fields[0].signal.label).not.toBe('Select One Required')
  })

  it('keeps the placeholder label only when nothing better exists', () => {
    render(`<button aria-haspopup="listbox" aria-label="Select One Required">Select One</button>`)
    const [field] = detectFields(document)
    expect(field.signal.label).toBe('Select One') // placeholder junk, 'Required' tail stripped
  })

  it('never detects the page-chrome language selector as a fillable field', () => {
    render(`
      <div data-automation-id="globalHeader">
        <button aria-haspopup="listbox" aria-label="language selector button">English</button>
      </div>
      <button data-automation-id="languageSelectorButton" aria-haspopup="listbox">English</button>
      <header><button aria-haspopup="listbox" aria-label="Locale">English</button></header>
    `)
    expect(detectFields(document)).toHaveLength(0)
  })
})

describe('non-Workday date-range pages (react-datepicker sites)', () => {
  it('never derives a section index from a single site-wide numbered wrapper', () => {
    render(`
      <div id="step-2--panel">
        <label for="f1">From</label><input id="f1" type="text">
        <label for="f2">From</label><input id="f2" type="text">
      </div>
    `)
    const fields = detectFields(document)
    expect(fields).toHaveLength(2)
    expect(fields.every((f) => f.signal.sectionIndex === undefined)).toBe(true)
  })

  it('keeps a bare "To" label detectable despite being a stopword', () => {
    render(`<label for="t">To</label><input id="t" type="text">`)
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.normalizedQuestion).toBe('to')
  })

  it('ignores picker-popup internals (year select, nav buttons)', () => {
    render(`
      <div class="react-datepicker">
        <button>Previous Month</button>
        <select class="range-select"><option>2026</option></select>
        <button aria-expanded="false">Next Month</button>
      </div>
    `)
    expect(detectFields(document)).toHaveLength(0)
  })
})

describe('structural repeated blocks (Phenom-style, no numbered ids/headings)', () => {
  function workItem(n: number): string {
    return `
      <div class="exp-item">
        <label for="jt${n}">Job Title*</label><input id="jt${n}" type="text">
        <label for="co${n}">Company*</label><input id="co${n}" type="text">
        <label for="wf${n}">From*</label>
        <div class="react-datepicker__input-container"><input id="wf${n}" type="text"></div>
        <label for="wt${n}">To*</label>
        <div class="react-datepicker__input-container"><input id="wt${n}" type="text"></div>
      </div>`
  }
  function eduItem(n: number): string {
    return `
      <div class="edu-item">
        <label for="sc${n}">School or University*</label><input id="sc${n}" type="text">
        <label for="ef${n}">From</label>
        <div class="react-datepicker__input-container"><input id="ef${n}" type="text"></div>
        <label for="et${n}">To (Actual or Expected)</label>
        <div class="react-datepicker__input-container"><input id="et${n}" type="text"></div>
      </div>`
  }

  it('assigns per-block indexes and kinds from the blocks own labels', () => {
    render(`
      <div>${workItem(1)}${workItem(2)}${workItem(3)}</div>
      <div>${eduItem(1)}${eduItem(2)}</div>
    `)
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => f.el.id === id)!.signal
    expect(byId('wf1').sectionIndex).toBe(0)
    expect(byId('wf1').sectionKind).toBe('work')
    expect(byId('wt2').sectionIndex).toBe(1)
    expect(byId('wt2').sectionKind).toBe('work')
    expect(byId('co3').sectionIndex).toBe(2)
    expect(byId('ef1').sectionIndex).toBe(0)
    expect(byId('ef1').sectionKind).toBe('education')
    expect(byId('et2').sectionIndex).toBe(1)
    expect(byId('et2').sectionKind).toBe('education')
  })

  it('never gives generic layout rows a section identity', () => {
    render(`
      <div class="row"><label for="c">City</label><input id="c"><label for="s">State</label><input id="s"></div>
      <div class="row"><label for="fn">First Name</label><input id="fn"><label for="ln">Last Name</label><input id="ln"></div>
    `)
    const fields = detectFields(document)
    expect(fields.every((f) => f.signal.sectionIndex === undefined)).toBe(true)
  })
})
