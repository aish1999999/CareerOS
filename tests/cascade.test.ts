import { describe, expect, it } from 'vitest'
import { detectFields, getLabel, resolveLabel, resolveOptionText } from '@/content/detector'

// ---------------------------------------------------------------------------
// Label-resolution cascade (2026-07-16 rebuild): candidates are harvested
// from EVERY source and scored (sourceRank × textQuality) — a boilerplate
// <label> no longer beats a real question one node over, div-soup layouts
// resolve through the solo-container harvester, and runner-ups become
// capture aliases. Option text gets its own mini-cascade so coded radio
// values stop masquerading as answers.
// ---------------------------------------------------------------------------

function dom(html: string): Document {
  document.body.innerHTML = html
  return document
}

describe('resolveLabel cascade', () => {
  it('T1: explicit label keeps its historical precedence', () => {
    const doc = dom('<label for="fn">First Name</label><input id="fn">')
    expect(getLabel(doc.getElementById('fn')!, doc)).toBe('First Name')
  })

  it('T2: boilerplate label ("*") loses to a real sibling question', () => {
    const doc = dom(
      '<div><span>Have you previously worked for Acme Corp?</span>' +
        '<label for="q1">*</label><input id="q1"></div>',
    )
    const r = resolveLabel(doc.getElementById('q1')!, doc)
    expect(r.best).toBe('Have you previously worked for Acme Corp?')
  })

  it('T4: Workday-style div soup resolves via structural harvesting', () => {
    const doc = dom(
      '<div><div><span>Are you legally authorized to work in the United States?</span></div>' +
        '<div><div><input id="auth" type="text"></div></div></div>',
    )
    const r = resolveLabel(doc.getElementById('auth')!, doc)
    expect(r.best).toBe('Are you legally authorized to work in the United States?')
  })

  it('T5: table layouts use the column header; the row cell becomes an alias', () => {
    const doc = dom(
      '<table><thead><tr><th>Skill</th><th>Years of experience</th></tr></thead>' +
        '<tbody><tr><td>Python</td><td><input id="yrs"></td></tr></tbody></table>',
    )
    const r = resolveLabel(doc.getElementById('yrs')!, doc)
    expect(r.best).toBe('Years of experience')
    expect(r.aliases).toContain('Python')
  })

  it('T8: format-hint aria-labels ("MM/DD/YYYY") lose to real sources', () => {
    const doc = dom(
      '<div><span>Employment start date</span>' +
        '<input id="d" aria-label="MM/DD/YYYY"></div>',
    )
    const r = resolveLabel(doc.getElementById('d')!, doc)
    expect(r.best).toBe('Employment start date')
  })

  it('T10: over-long container text salvages the ?-terminated sentence', () => {
    const filler =
      'Please answer honestly. Falsification of any statement is grounds for dismissal. ' +
      'All information provided is kept strictly confidential and reviewed by our team. ' +
      'This includes every supplementary detail you may choose to provide us with today. '
    const doc = dom(
      `<div><p>${filler}Have you ever been convicted of a felony?</p><input id="fel"></div>`,
    )
    const r = resolveLabel(doc.getElementById('fel')!, doc)
    expect(r.best).toBe('Have you ever been convicted of a felony?')
  })

  it('signals expose questionSource + labelAliases for capture', () => {
    const doc = dom(
      '<table><thead><tr><th>Skill</th><th>Years of experience</th></tr></thead>' +
        '<tbody><tr><td>Python</td><td><input id="yrs"></td></tr></tbody></table>',
    )
    const fields = detectFields(doc)
    const f = fields.find((x) => x.el.id === 'yrs')!
    expect(f.signal.questionSource).toBe('label')
    expect(f.signal.labelAliases).toContain('Python')
  })

  it('unlabeled fields report identifier provenance (capture refuses these keys)', () => {
    const doc = dom('<input id="x" name="q_00123">')
    const fields = detectFields(doc)
    const f = fields.find((x) => x.el.id === 'x')!
    expect(f.signal.questionSource).toBe('identifier')
  })
})

describe('resolveOptionText mini-cascade', () => {
  it('finds the text node right after an unlabeled radio', () => {
    const doc = dom(
      '<div role="radiogroup" aria-label="Do you require sponsorship?">' +
        '<input type="radio" name="s" value="opt_1" id="r1"><span>Yes</span>' +
        '<input type="radio" name="s" value="opt_2" id="r2"><span>No</span></div>',
    )
    expect(resolveOptionText(doc.getElementById('r1') as HTMLInputElement, doc)).toBe('Yes')
    expect(resolveOptionText(doc.getElementById('r2') as HTMLInputElement, doc)).toBe('No')
  })

  it('radio groups carry mini-cascade texts, never opt_N codes, when text exists', () => {
    const doc = dom(
      '<fieldset><legend>Do you require visa sponsorship?</legend>' +
        '<input type="radio" name="v" value="opt_1" id="v1"><span>Yes</span>' +
        '<input type="radio" name="v" value="opt_2" id="v2"><span>No</span></fieldset>',
    )
    const fields = detectFields(doc)
    const group = fields.find((f) => f.signal.kind === 'radio')!
    expect(group.signal.options.map((o) => o.text)).toEqual(['Yes', 'No'])
    expect(group.signal.label).toBe('Do you require visa sponsorship?')
  })

  it('falls back to the coded value only when NO text exists anywhere', () => {
    const doc = dom(
      '<div role="radiogroup" aria-label="Gender">' +
        '<input type="radio" name="g" value="M" id="g1">' +
        '<input type="radio" name="g" value="F" id="g2"></div>',
    )
    const fields = detectFields(doc)
    const group = fields.find((f) => f.signal.kind === 'radio')!
    expect(group.signal.options.map((o) => o.text)).toEqual(['M', 'F'])
  })
})

describe('segmented dates never capture (pinned decision)', () => {
  it('date segments carry no data-ff-id of their own — only the wrapper does', () => {
    const doc = dom(
      '<div data-automation-id="dateInputWrapper"><span>From</span>' +
        '<input data-automation-id="dateSectionMonth-input" id="m">' +
        '<input data-automation-id="dateSectionDay-input" id="d">' +
        '<input data-automation-id="dateSectionYear-input" id="y"></div>',
    )
    detectFields(doc)
    // The capture focusout listener keys off data-ff-id on the blurred
    // input; segments have none, so segment blurs can never store fragments.
    expect(doc.getElementById('m')!.getAttribute('data-ff-id')).toBeNull()
    expect(doc.getElementById('d')!.getAttribute('data-ff-id')).toBeNull()
    expect(doc.getElementById('y')!.getAttribute('data-ff-id')).toBeNull()
  })
})
