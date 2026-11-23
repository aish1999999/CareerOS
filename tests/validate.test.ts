import { beforeEach, describe, expect, it } from 'vitest'
import { readActualValue, summarizeValidation, validateFields, valuesMatch } from '@/content/validate'
import { detectFields } from '@/content/detector'
import type { MatchResult } from '@/types'

// ---------------------------------------------------------------------------
// Validation layer: reads the page AFTER fills settle and judges completeness
// + correctness against the expected answers. Never writes.
// ---------------------------------------------------------------------------

function match(fieldId: string, overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: 'value',
    confidence: 0.9,
    source: 'profile',
    unresolvedVars: [],
    action: 'autofill',
    needsReview: false,
    composite: false,
    ...overrides,
  }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('valuesMatch (tolerant correctness)', () => {
  it('accepts exact, canonical, and geographic equivalents', () => {
    expect(valuesMatch('Texas', 'Texas', 'select')).toBe(true)
    expect(valuesMatch('TX', 'Texas', 'select')).toBe(true)
    expect(valuesMatch('United States', 'United States of America', 'select')).toBe(true)
  })

  it('accepts reformatted dates (same month)', () => {
    expect(valuesMatch('2026-01', '01/2026', 'date')).toBe(true)
    expect(valuesMatch('January 2026', '2026-01', 'date')).toBe(true)
    expect(valuesMatch('2026-01', '02/2026', 'date')).toBe(false)
  })

  it('accepts polarity-equivalent wordings and rejects opposites', () => {
    expect(valuesMatch('No', 'I am not a protected veteran', 'select')).toBe(true)
    expect(valuesMatch('No', 'Yes', 'select')).toBe(false)
  })

  it('flags the Algeria class: unrelated option committed', () => {
    expect(valuesMatch('United States', 'Algeria', 'custom-dropdown')).toBe(false)
  })
})

describe('validateFields', () => {
  it('ok / wrong / missing verdicts across a small form', () => {
    document.body.innerHTML = `
      <label for="fn">First name</label><input id="fn" value="Ada">
      <label for="ct">Country</label>
      <select id="ct">
        <option value="">- Select -</option>
        <option selected>Algeria</option>
        <option>United States</option>
      </select>
      <label for="st">State</label>
      <select id="st">
        <option value="">- Select -</option>
        <option>Texas</option>
      </select>
      <label for="np">Nickname preference</label><input id="np" required>
    `
    const fields = detectFields(document)
    const id = (domId: string) =>
      fields.find((f) => (f.el as HTMLElement).id === domId)!.signal.fieldId
    const matches = new Map<string, MatchResult>([
      [id('fn'), match(id('fn'), { resolvedAnswer: 'Ada' })],
      [id('ct'), match(id('ct'), { resolvedAnswer: 'United States' })],
      [id('st'), match(id('st'), { resolvedAnswer: 'TX' })],
      // no match for #np
    ])
    const report = validateFields(fields, matches, new Map())
    const byId = (domId: string) => report.find((v) => v.fieldId === id(domId))!

    expect(byId('fn').verdict).toBe('ok')
    expect(byId('ct').verdict).toBe('wrong') // Algeria committed, US expected
    expect(byId('ct').actual).toBe('Algeria')
    expect(byId('ct').expected).toBe('United States')
    expect(byId('st').verdict).toBe('missing-answerable') // still on "- Select -"
    expect(byId('np').verdict).toBe('missing-unanswered')
    expect(byId('np').required).toBe(true)

    const summary = summarizeValidation(report)
    expect(summary).toMatchObject({ ok: 1, wrong: 1, missingAnswerable: 1, missingUnanswered: 1 })
  })

  it('entries carry structured notes: question, options, section, policy flags', () => {
    document.body.innerHTML = `
      <label for="src">How did you hear about us?</label>
      <select id="src">
        <option value="">- Select -</option>
        <option>LinkedIn</option>
        <option>Referral</option>
      </select>
      <label for="eth">Are you Hispanic or Latino?</label>
      <select id="eth">
        <option value="">- Select -</option>
        <option>Yes</option>
        <option>No</option>
      </select>
    `
    const fields = detectFields(document)
    const report = validateFields(fields, new Map(), new Map())
    const by = (domId: string) =>
      report.find((v) => v.fieldId === fields.find((f) => (f.el as HTMLElement).id === domId)!.signal.fieldId)!

    const src = by('src')
    expect(src.normalizedQuestion).not.toBe('')
    expect(src.options).toContain('LinkedIn')
    expect(src.options).toContain('Referral')
    expect(src.eeoLike).toBe(false)
    expect(src.consentLike).toBe(false)
    expect(by('eth').eeoLike).toBe(true) // the AI Fill hard-exclusion flag rides along
  })

  it('prefers the recorded filled value over the raw answer (judge-picked options)', () => {
    document.body.innerHTML = `
      <label for="dv">Device type</label>
      <select id="dv"><option value="">-</option><option selected>Laptop</option></select>
    `
    const fields = detectFields(document)
    const fid = fields[0].signal.fieldId
    // inferAtFill match: rawAnswerTemplate is '' — the judge picked "Laptop" at fill time
    const matches = new Map([[fid, match(fid, { rawAnswerTemplate: '', inferAtFill: true })]])
    const report = validateFields(fields, matches, new Map([[fid, 'Laptop']]))
    expect(report[0].verdict).toBe('ok')
  })

  it('radio groups validate against the checked member', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Are you willing to relocate?</legend>
        <label><input type="radio" name="rel" checked>Yes</label>
        <label><input type="radio" name="rel">No</label>
      </fieldset>
    `
    const fields = detectFields(document)
    const fid = fields[0].signal.fieldId
    const matches = new Map([[fid, match(fid, { resolvedAnswer: 'Yes' })]])
    expect(validateFields(fields, matches, new Map())[0].verdict).toBe('ok')
  })

  it('suggest-only matches waiting for the user are skipped, not failures', () => {
    document.body.innerHTML = `<label for="q">Why us</label><input id="q">`
    const fields = detectFields(document)
    const fid = fields[0].signal.fieldId
    const matches = new Map([[fid, match(fid, { action: 'suggest' })]])
    expect(validateFields(fields, matches, new Map())[0].verdict).toBe('skipped')
  })

  it('password values are masked in the report', () => {
    document.body.innerHTML = `<label for="pw">Password</label><input id="pw" type="password" value="S3cret!">`
    const fields = detectFields(document)
    const fid = fields[0].signal.fieldId
    const matches = new Map([[fid, match(fid, { resolvedAnswer: 'S3cret!' })]])
    const [v] = validateFields(fields, matches, new Map())
    expect(v.verdict).toBe('ok')
    expect(v.expected).toBe('••••••••')
    expect(v.actual).toBe('••••••••')
  })

  it('file inputs and notify matches are skipped', () => {
    document.body.innerHTML = `
      <label for="cv">Resume</label><input id="cv" type="file">
      <label for="loc">Preferred location</label><input id="loc">
    `
    const fields = detectFields(document)
    const id = (domId: string) =>
      fields.find((f) => (f.el as HTMLElement).id === domId)!.signal.fieldId
    const matches = new Map([
      [id('loc'), match(id('loc'), { notify: true, rawAnswerTemplate: 'Pick per posting' })],
    ])
    const report = validateFields(fields, matches, new Map())
    expect(report.find((v) => v.fieldId === id('cv'))!.verdict).toBe('skipped')
    expect(report.find((v) => v.fieldId === id('loc'))!.verdict).toBe('skipped')
  })

  it('user-filled fields without a match are not judged', () => {
    document.body.innerHTML = `<label for="x">Custom question</label><input id="x" value="their own words">`
    const fields = detectFields(document)
    expect(validateFields(fields, new Map(), new Map())[0].verdict).toBe('skipped')
  })

  it('readActualValue: checkbox groups list the checked members', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Shifts you can work</legend>
        <label><input type="checkbox" name="s" checked>Morning</label>
        <label><input type="checkbox" name="s">Evening</label>
        <label><input type="checkbox" name="s" checked>Night</label>
      </fieldset>
    `
    const fields = detectFields(document)
    expect(readActualValue(fields[0])).toBe('Morning; Night')
  })
})

describe('robustness guards', () => {
  it('empty expectation (unrecorded deferred inference) → skipped, never wrong', () => {
    document.body.innerHTML = `
      <label for="dv">Device type</label>
      <select id="dv"><option value="">-</option><option selected>Laptop</option></select>
    `
    const fields = detectFields(document)
    const fid = fields[0].signal.fieldId
    const matches = new Map([[fid, match(fid, { rawAnswerTemplate: '', inferAtFill: true })]])
    // NOTE: filledValues empty — the pick was never recorded
    expect(validateFields(fields, matches, new Map())[0].verdict).toBe('skipped')
  })

  it('multi-select dropdown with pills elsewhere (empty display, recorded fill) → skipped', () => {
    document.body.innerHTML = `<div id="ms" role="combobox" aria-label="Skills"></div>`
    const fields = detectFields(document)
    const fid = fields[0].signal.fieldId
    const matches = new Map([[fid, match(fid, { resolvedAnswer: 'Lean Six Sigma' })]])
    const report = validateFields(fields, matches, new Map([[fid, 'Lean Six Sigma']]))
    expect(report[0].verdict).toBe('skipped')
  })

  it('the same empty dropdown WITHOUT a recorded fill is a real miss', () => {
    document.body.innerHTML = `<div id="ms" role="combobox" aria-label="Skills"></div>`
    const fields = detectFields(document)
    const fid = fields[0].signal.fieldId
    const matches = new Map([[fid, match(fid, { resolvedAnswer: 'Lean Six Sigma' })]])
    expect(validateFields(fields, matches, new Map())[0].verdict).toBe('missing-answerable')
  })

  it('whitespace and case never produce false alarms', () => {
    expect(valuesMatch('  yes ', 'YES', 'radio')).toBe(true)
    expect(valuesMatch('Houston', '  houston  ', 'text')).toBe(true)
  })
})

describe('ignore-matches count as unanswered', () => {
  it('a below-threshold match does not mask a coverage gap', () => {
    document.body.innerHTML = `<label for="q">Why do you want to work here?</label><textarea id="q"></textarea>`
    const fields = detectFields(document)
    const fid = fields[0].signal.fieldId
    const matches = new Map([[fid, match(fid, { action: 'ignore', confidence: 0.3 })]])
    expect(validateFields(fields, matches, new Map())[0].verdict).toBe('missing-unanswered')
  })
})
