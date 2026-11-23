/**
 * Stage 1 (2026-08-22) — foundations for LLM-first filling. Every case here
 * traces to a defect found in the Aug 21 live-store export or to a live fill
 * failure the user reported:
 *
 *   1. Combobox-as-text: ATS dropdowns rendered as plain <input> took the
 *      typing path — text visible, no option SELECTED, form state empty.
 *   2. Capture key pollution: "genderdecline answerfemalemale" (option texts
 *      mashed into the label — an EEO leak past the \b-anchored gate),
 *      "4 how long work material manager" (questionnaire numbering),
 *      "select" holding a disability answer, "apply"/"complet" fragments.
 *   3. okCount starvation: 71/75 learned entries at zero — nothing graduates.
 *   4. siteScope never applied (75/75 captured entries global).
 *   5. The v9 store scrub for everything already poisoned.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { resetChromeMock, seedChromeStorage } from './setup'
import { looksEeoLoose, crossesEeoTopic } from '@/lib/eeo'
import {
  cleanCaptureQuestion,
  isSkippedCapture,
  prepareCaptureValue,
} from '@/content/capture'
import { hasComboboxSignals } from '@/content/detector'
import { alphabeticalFraction, fillField } from '@/content/autofill'
import { getStore, runMigrations } from '@/lib/storage'
import { SCHEMA_VERSION } from '@/lib/schema'
import type { MatchResult, PageContext, SignalBundle } from '@/types'
import type { DetectedField } from '@/content/detector'

function signal(overrides: Partial<SignalBundle> = {}): SignalBundle {
  return {
    fieldId: 'f1',
    kind: 'text',
    label: 'Some question',
    placeholder: '',
    autocomplete: '',
    name: '',
    id: '',
    dataAttrs: [],
    required: false,
    options: [],
    sectionContext: '',
    multiplicityCue: false,
    normalizedQuestion: 'some question',
    rawText: '',
    filled: false,
    consentLike: false,
    eeoLike: false,
    ...overrides,
  }
}

const context: PageContext = {
  company: 'Novo Nordisk',
  role: 'Operations Engineer',
  location: 'Clayton, NC',
  source: 'jsonld',
}

// ---------------------------------------------------------------------------
// EEO loose detection — the mashed-label leak
// ---------------------------------------------------------------------------

describe('looksEeoLoose (boundary-tolerant EEO guard)', () => {
  it('catches the live mashed gender label that beat \\bgender\\b', () => {
    expect(looksEeoLoose('GenderDecline to answerFemaleMale')).toBe(true)
    expect(looksEeoLoose('genderdecline answerfemalemale')).toBe(true)
    // the word-boundary guard alone provably missed it
    expect(crossesEeoTopic('genderdecline answerfemalemale', 'city')).toBe(false)
  })
  it('catches squashed disability/veteran/ethnicity variants', () => {
    expect(looksEeoLoose('DisabilityStatusSelect')).toBe(true)
    expect(looksEeoLoose('veteranstatus')).toBe(true)
    expect(looksEeoLoose('EthnicityHispanicLatinoNo')).toBe(true)
  })
  it('never fires on innocent words containing "race"', () => {
    expect(looksEeoLoose('We embrace diverse candidates')).toBe(false)
    expect(looksEeoLoose('trace the shipment')).toBe(false)
  })
  it('still honors the ordinary word-boundary vocabulary', () => {
    expect(looksEeoLoose('What is your race?')).toBe(true)
    expect(looksEeoLoose('Preferred start date')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Capture question hygiene
// ---------------------------------------------------------------------------

describe('cleanCaptureQuestion', () => {
  it('strips option-text contamination from composed trigger labels', () => {
    const cleaned = cleanCaptureQuestion({
      label: 'GenderDecline to answerFemaleMale',
      normalizedQuestion: 'genderdecline answerfemalemale',
      options: [{ text: 'Decline to answer' }, { text: 'Female' }, { text: 'Male' }],
    })
    expect(isSkippedCapture(cleaned)).toBe(false)
    if (!isSkippedCapture(cleaned)) expect(cleaned.question).toBe('gender')
  })

  it('strips questionnaire numbering (live: "4 how long work material manager")', () => {
    const cleaned = cleanCaptureQuestion({
      label: '4. How long have you worked as a material manager?',
      normalizedQuestion: '4 how long work material manager',
      options: [],
    })
    expect(isSkippedCapture(cleaned)).toBe(false)
    if (!isSkippedCapture(cleaned)) expect(cleaned.question).not.toMatch(/^\d/)
  })

  it('refuses bare widget words (live: disability answer stored under "select")', () => {
    for (const junk of ['select', 'apply', 'complet', 'Continue']) {
      const cleaned = cleanCaptureQuestion({
        label: junk,
        normalizedQuestion: junk.toLowerCase(),
        options: [],
      })
      expect(isSkippedCapture(cleaned)).toBe(true)
    }
  })

  it('refuses labels that are ONLY their own option texts', () => {
    const cleaned = cleanCaptureQuestion({
      label: 'YesNo',
      normalizedQuestion: 'yesno',
      options: [{ text: 'Yes' }, { text: 'No' }],
    })
    expect(isSkippedCapture(cleaned)).toBe(true)
  })

  it('leaves ordinary questions untouched', () => {
    const cleaned = cleanCaptureQuestion({
      label: 'Are you willing to relocate?',
      normalizedQuestion: 'willing relocate',
      options: [{ text: 'Yes' }, { text: 'No' }],
    })
    expect(isSkippedCapture(cleaned)).toBe(false)
    if (!isSkippedCapture(cleaned)) expect(cleaned.question).toContain('relocate')
  })
})

describe('prepareCaptureValue (Stage 1 additions)', () => {
  it('blocks EEO captures even when the label is mashed', () => {
    const prepared = prepareCaptureValue(
      signal({
        label: 'GenderDecline to answerFemaleMale',
        normalizedQuestion: 'genderdecline answerfemalemale',
        kind: 'custom-dropdown',
      }),
      'Male',
      context,
      'careers.example.com',
    )
    expect(isSkippedCapture(prepared)).toBe(true)
  })

  it('pins company-specific QUESTIONS to the site (75/75 were global in the live store)', () => {
    const prepared = prepareCaptureValue(
      signal({
        label: 'Do you have a family member currently employed by Novo Nordisk?',
        normalizedQuestion: 'family member currently employ novo nordisk',
      }),
      'No',
      context,
      'novonordisk.wd3.myworkdayjobs.com',
    )
    expect(isSkippedCapture(prepared)).toBe(false)
    if (!isSkippedCapture(prepared)) {
      expect(prepared.siteScope).toBe('novonordisk.wd3.myworkdayjobs.com')
      expect(prepared.question).toContain('novo')
    }
  })

  it('leaves generic questions unpinned and carries the cleaned key', () => {
    const prepared = prepareCaptureValue(
      signal({
        label: '6. ISO 9001 / QS9000 / ISO 14001 knowledge?',
        normalizedQuestion: '6 iso 9001 qs9000 iso 14001 knowledge',
      }),
      'Yes',
      context,
      'jobs.lever.co',
    )
    expect(isSkippedCapture(prepared)).toBe(false)
    if (!isSkippedCapture(prepared)) {
      expect(prepared.siteScope).toBeNull()
      expect(prepared.question).not.toMatch(/^\d/)
    }
  })
})

// ---------------------------------------------------------------------------
// Combobox signals + the fill-time reroute
// ---------------------------------------------------------------------------

describe('hasComboboxSignals', () => {
  it('recognizes the attribute spellings ATSes actually use', () => {
    for (const html of [
      `<input role="combobox">`,
      `<input aria-haspopup="listbox">`,
      `<input aria-haspopup="true">`,
      `<input aria-autocomplete="list">`,
      `<input aria-autocomplete="both">`,
      `<input aria-expanded="false">`,
    ]) {
      document.body.innerHTML = html
      expect(hasComboboxSignals(document.body.firstElementChild as HTMLElement)).toBe(true)
    }
  })
  it('recognizes aria-controls pointing at a listbox', () => {
    document.body.innerHTML = `<input aria-controls="lst"><div id="lst" role="listbox"></div>`
    expect(hasComboboxSignals(document.querySelector('input')!)).toBe(true)
  })
  it('stays quiet on plain inputs, selects, and accordion buttons', () => {
    document.body.innerHTML = `<input type="text" aria-label="City">`
    expect(hasComboboxSignals(document.querySelector('input')!)).toBe(false)
    document.body.innerHTML = `<select><option>a</option></select>`
    expect(hasComboboxSignals(document.querySelector('select')!)).toBe(false)
    document.body.innerHTML = `<button aria-expanded="false">Section</button>`
    expect(hasComboboxSignals(document.querySelector('button')!)).toBe(false)
  })
})

describe('fillField combobox reroute (the "text typed into a dropdown" fix)', () => {
  const baseMatch: MatchResult = {
    fieldId: 'f1',
    resolvedAnswer: 'United States',
    rawAnswerTemplate: 'United States',
    confidence: 0.9,
    source: 'profile',
    unresolvedVars: [],
    action: 'autofill',
    needsReview: false,
    composite: false,
  }

  it('routes a text-classified combobox input through option SELECTION, never raw typing', async () => {
    document.body.innerHTML = `
      <input type="text" aria-autocomplete="list" aria-controls="lst" aria-label="Country">
      <div id="lst" role="listbox">
        <div role="option">India</div>
        <div role="option">United States</div>
      </div>`
    const el = document.querySelector('input') as HTMLInputElement
    let clicked = ''
    for (const opt of document.querySelectorAll('[role="option"]')) {
      opt.addEventListener('click', () => (clicked = opt.textContent ?? ''))
    }
    const field: DetectedField = { el, signal: signal({ kind: 'text', label: 'Country' }) }
    const { outcome } = await fillField(field, baseMatch)
    expect(outcome).toBe('filled')
    expect(clicked).toBe('United States') // an OPTION was selected…
    expect(el.value).not.toBe('United States') // …not text typed into the box
  }, 15_000)

  it('still types into genuinely plain text inputs', async () => {
    document.body.innerHTML = `<input type="text" aria-label="City">`
    const el = document.querySelector('input') as HTMLInputElement
    const field: DetectedField = { el, signal: signal({ kind: 'text', label: 'City' }) }
    const { outcome } = await fillField(field, { ...baseMatch, resolvedAnswer: 'Cary' })
    expect(outcome).toBe('filled')
    expect(el.value).toBe('Cary')
  })
})

describe('alphabeticalFraction (the country-list jump)', () => {
  it('places United States deep in the alphabet, per the methodology', () => {
    const f = alphabeticalFraction('United States')
    expect(f).toBeGreaterThan(0.75)
    expect(f).toBeLessThan(0.95)
  })
  it('orders sensibly and defaults mid-list for non-letters', () => {
    expect(alphabeticalFraction('Albania')).toBeLessThan(alphabeticalFraction('Mexico'))
    expect(alphabeticalFraction('Mexico')).toBeLessThan(alphabeticalFraction('United States'))
    expect(alphabeticalFraction('+1 (US)')).toBe(0.5)
  })
})

// ---------------------------------------------------------------------------
// v8 → v9 store scrub
// ---------------------------------------------------------------------------

function learnedEntry(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: `q-${Math.random().toString(36).slice(2, 8)}`,
    question: 'placeholder',
    aliases: [],
    answer: 'x',
    answerType: 'text',
    answerTemplate: null,
    mapsTo: null,
    variables: [],
    personas: [],
    tags: ['captured'],
    fieldType: 'text',
    options: [],
    status: 'active',
    source: 'captured',
    captureContext: null,
    siteScope: null,
    reviewNote: '',
    lastWrongAt: null,
    okCount: 0,
    wrongCount: 0,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

describe('v8 → v9 migration (live-store scrub)', () => {
  beforeEach(() => resetChromeMock())

  const poisonedStore = () => ({
    schemaVersion: 8,
    profile: {
      firstName: 'Ada',
      lastName: 'M',
      phone: '346 303-7626 ',
      address: { line1: '', line2: '', city: 'Cary ', state: 'NC', postalCode: '', country: 'United States' },
      workHistory: [{ company: 'MPI - McWane Plant & Industrial ', title: 'Operations Engineer ', startDate: '2025-03', endDate: '2026-05', location: 'Houston, TX', description: '' }],
    },
    qa: [
      learnedEntry({ id: 'g1', question: 'genderdecline answerfemalemale', answer: 'Female', createdAt: 1 }),
      learnedEntry({ id: 'g2', question: 'genderdecline answerfemalemale', answer: 'Male', createdAt: 2 }),
      learnedEntry({ id: 'j1', question: 'select', answer: 'No, I Don’t Have A Disability' }),
      learnedEntry({ id: 'j2', question: 'apply', answer: 'No' }),
      learnedEntry({ id: 'p1', question: 'phone', answer: '+1', createdAt: 3 }),
      learnedEntry({ id: 'p2', question: 'phone', answer: '346 303-7626', createdAt: 4 }),
      learnedEntry({ id: 's1', question: 'salary expectation salary expectation numeric format', answer: '100000120000' }),
      learnedEntry({ id: 'c1', question: 'city', answer: 'Cary', createdAt: 10 }),
      learnedEntry({ id: 'c2', question: 'city', answer: 'Houston, TX', createdAt: 20 }),
      learnedEntry({ id: 'ok1', question: 'acceptable travel', answer: 'Less than 50% ' }),
      // curated entries are never scrubbed, whatever their shape
      learnedEntry({ id: 'seed1', question: 'select', answer: 'kept', source: 'import', tags: ['seed:x'] }),
    ],
    optionSets: [],
    settings: {},
  })

  it('removes EEO leaks, junk keys, degenerate answers, and duplicate keys', async () => {
    seedChromeStorage('flashfiller', poisonedStore())
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    const ids = store.qa.map((e) => e.id)
    expect(ids).not.toContain('g1') // gender mash (wrong value)
    expect(ids).not.toContain('g2') // gender mash
    expect(ids).not.toContain('j1') // disability under "select"
    expect(ids).not.toContain('j2') // bare "apply"
    expect(ids).not.toContain('p1') // phone answering "+1"
    expect(ids).not.toContain('s1') // salary mash
    expect(ids).not.toContain('c2') // later duplicate "city"
    expect(ids).toContain('p2')
    expect(ids).toContain('c1')     // oldest duplicate kept
    expect(ids).toContain('ok1')
    expect(ids).toContain('seed1')  // curated survives
  })

  it('trims whitespace in answers and profile fields', async () => {
    seedChromeStorage('flashfiller', poisonedStore())
    const store = await getStore()
    expect(store.qa.find((e) => e.id === 'ok1')?.answer).toBe('Less than 50%')
    expect(store.profile.phone).toBe('346 303-7626')
    expect(store.profile.address.city).toBe('Cary')
    expect(store.profile.workHistory[0].company).toBe('MPI - McWane Plant & Industrial')
    expect(store.profile.workHistory[0].title).toBe('Operations Engineer')
  })

  it('applies the same scrub to a re-imported old export (runMigrations directly)', () => {
    const migrated = runMigrations(poisonedStore() as unknown as Record<string, unknown>)
    const qa = migrated.qa as { id: string }[]
    expect(qa.map((e) => e.id)).not.toContain('g1')
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
  })
})
