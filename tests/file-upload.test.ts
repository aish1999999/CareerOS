import { beforeEach, describe, expect, it } from 'vitest'
import { detectFields, type DetectedField } from '@/content/detector'
import { matchField, type MatcherContext } from '@/content/matcher'
import { buildFileTransfer, fillFileUpload, uploadZoneFilename, type DocumentPayload } from '@/content/autofill'
import { validateFields } from '@/content/validate'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import type { MatchResult, SignalBundle } from '@/types'
import type { DocumentMeta } from '@/lib/documents'

// ---------------------------------------------------------------------------
// Resume feature end-to-end (jsdom): detection of hidden ATS upload inputs,
// document matching, the attach + synthetic-drop fill paths (DataTransfer/
// DragEvent shimmed in tests/setup.ts), and validation verdicts.
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.innerHTML = ''
})

function signal(overrides: Partial<SignalBundle>): SignalBundle {
  return {
    fieldId: 'f1',
    kind: 'file',
    label: '',
    placeholder: '',
    autocomplete: '',
    name: '',
    id: '',
    dataAttrs: [],
    required: false,
    options: [],
    sectionContext: '',
    multiplicityCue: false,
    normalizedQuestion: 'resume cv',
    rawText: '',
    filled: false,
    consentLike: false,
    eeoLike: false,
    ...overrides,
  }
}

function meta(overrides: Partial<DocumentMeta> = {}): DocumentMeta {
  return {
    id: 'doc-1',
    kind: 'resume',
    name: 'Candidate_Resume.pdf',
    mime: 'application/pdf',
    size: 100,
    personas: [],
    isDefault: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function ctx(overrides: Partial<MatcherContext> = {}): MatcherContext {
  return {
    profile: defaultProfile(),
    qa: [],
    seeds: [],
    settings: defaultSettings(),
    activePersona: null,
    ...overrides,
  }
}

const payload = (name = 'Candidate_Resume.pdf'): DocumentPayload => ({
  name,
  mime: 'application/pdf',
  bytes: new TextEncoder().encode('%PDF-1.4 fake'),
})

// ---- Detection (P2) ---------------------------------------------------------

describe('detector — file-upload fields', () => {
  it('rescues the hidden input behind a Workday-style drop zone, labels from the zone, cues resume', () => {
    document.body.innerHTML = `
      <div data-automation-id="file-upload-drop-zone">
        <div>Resume/CV</div>
        <p>Drop files here, or</p>
        <button data-automation-id="select-files">Select files</button>
        <input type="file" style="display:none" accept=".pdf,.doc,.docx">
      </div>
    `
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    const f = fields[0]
    expect(f.signal.kind).toBe('file')
    expect(f.uploadZoneEl?.getAttribute('data-automation-id')).toBe('file-upload-drop-zone')
    expect(f.signal.docCue).toBe('resume')
    expect(f.signal.accept).toBe('.pdf,.doc,.docx')
    expect(f.signal.label.toLowerCase()).toContain('resume')
  })

  it('detects a plain labeled file input (Greenhouse-style) with no zone', () => {
    document.body.innerHTML = `
      <label for="res">Attach your resume</label>
      <input id="res" name="resume" type="file">
    `
    const fields = detectFields(document)
    expect(fields).toHaveLength(1)
    expect(fields[0].signal.kind).toBe('file')
    expect(fields[0].signal.docCue).toBe('resume')
    expect(fields[0].uploadZoneEl).toBeUndefined()
  })

  it('cues cover letters separately and generic attachments as other', () => {
    document.body.innerHTML = `
      <label for="cl">Cover letter</label><input id="cl" type="file">
      <label for="extra">Additional attachments</label><input id="extra" type="file">
    `
    const fields = detectFields(document)
    const byId = (id: string) => fields.find((f) => (f.el as HTMLElement).id === id)!
    expect(byId('cl').signal.docCue).toBe('coverLetter')
    expect(byId('extra').signal.docCue).toBe('other')
  })

  it('accent-tolerant resume cue ("Résumé")', () => {
    document.body.innerHTML = `<label for="r">Résumé</label><input id="r" type="file">`
    expect(detectFields(document)[0].signal.docCue).toBe('resume')
  })

  it('keeps the off-screen-position honeypot veto even for file inputs', () => {
    document.body.innerHTML = `
      <label for="hp">Resume</label>
      <input id="hp" type="file" style="position:absolute;left:-2000px">
    `
    expect(detectFields(document)).toHaveLength(0)
  })
})

// ---- Matching (P3) ----------------------------------------------------------

describe('matcher — document tier for file fields', () => {
  const fileSignal = signal({ label: 'Resume/CV', docCue: 'resume', accept: '.pdf,.doc,.docx' })

  it('matches a stored resume: document:<id> source, autofill action', async () => {
    const m = await matchField(fileSignal, ctx({ documents: [meta()] }))
    expect(m).toMatchObject({
      source: 'document:doc-1',
      rawAnswerTemplate: 'Candidate_Resume.pdf',
      action: 'autofill',
      confidence: 0.92,
    })
  })

  it('suggest-only when autoAttachDocuments is off', async () => {
    const settings = { ...defaultSettings(), autoAttachDocuments: false }
    const m = await matchField(fileSignal, ctx({ documents: [meta()], settings }))
    expect(m?.action).toBe('suggest')
  })

  it('honest null: no documents, wrong kind, or accept mismatch', async () => {
    expect(await matchField(fileSignal, ctx())).toBeNull()
    expect(
      await matchField(signal({ label: 'Cover letter', docCue: 'coverLetter' }), ctx({ documents: [meta()] })),
    ).toBeNull()
    expect(
      await matchField(signal({ docCue: 'resume', accept: '.doc,.docx' }), ctx({ documents: [meta()] })),
    ).toBeNull()
  })

  it('miscellaneous/"additional documents" zones attach a document too (user keeps a second resume under kind Other)', async () => {
    const misc = signal({ label: 'Miscellaneous documents', docCue: 'other' })
    const secondResume = meta({ id: 'doc-2', kind: 'other', name: 'Candidate_Resume_v2.pdf' })
    const m = await matchField(misc, ctx({ documents: [meta(), secondResume] }))
    // Generic zones prefer the RESUME kind (plan §3: "only the default resume, once")
    expect(m).toMatchObject({ source: 'document:doc-1', action: 'autofill' })
  })
})

// ---- Fill (P3) --------------------------------------------------------------

describe('autofill — fillFileUpload', () => {
  function makeField(withZone: boolean): DetectedField & { input: HTMLInputElement; zone: HTMLElement } {
    document.body.innerHTML = `
      <div data-automation-id="file-upload-drop-zone">
        <div>Resume/CV</div>
        <input type="file">
      </div>
    `
    const zone = document.querySelector<HTMLElement>('[data-automation-id="file-upload-drop-zone"]')!
    const input = document.querySelector<HTMLInputElement>('input')!
    return {
      el: input,
      uploadZoneEl: withZone ? zone : undefined,
      signal: signal({ label: 'Resume/CV', docCue: 'resume' }),
      input,
      zone,
    }
  }

  it('buildFileTransfer wraps a File (shimmed DataTransfer)', () => {
    const dt = buildFileTransfer(new File(['x'], 'a.pdf'))
    expect(dt?.files.length).toBe(1)
    expect(dt?.files[0].name).toBe('a.pdf')
  })

  it('attaches via input.files + input/change events when assignment sticks', async () => {
    const field = makeField(false)
    // jsdom's files property rejects non-native FileLists — give the
    // instance a plain writable slot so the assignment path is observable.
    Object.defineProperty(field.input, 'files', { writable: true, value: null, configurable: true })
    const events: string[] = []
    field.input.addEventListener('input', () => events.push('input'))
    field.input.addEventListener('change', () => events.push('change'))

    const result = await fillFileUpload(field, payload())
    expect(result.outcome).toBe('filled')
    expect(result.filledText).toBe('Candidate_Resume.pdf')
    expect(events).toEqual(['input', 'change'])
    expect(field.input.files![0].name).toBe('Candidate_Resume.pdf')
  })

  it('falls back to a synthetic drop on the zone when input.files is read-only', async () => {
    const field = makeField(true)
    Object.defineProperty(field.input, 'files', { get: () => null, configurable: true })
    let dropped: File | null = null
    field.zone.addEventListener('drop', (e) => {
      dropped = (e as DragEvent).dataTransfer?.files[0] ?? null
      const chip = document.createElement('div')
      chip.className = 'file-name'
      chip.textContent = dropped?.name ?? ''
      field.zone.appendChild(chip)
    })

    const result = await fillFileUpload(field, payload())
    expect(result.outcome).toBe('filled')
    expect(dropped!.name).toBe('Candidate_Resume.pdf')
  })

  it('fails honestly when neither path lands', async () => {
    const field = makeField(false)
    Object.defineProperty(field.input, 'files', { get: () => null, configurable: true })
    const result = await fillFileUpload(field, payload())
    expect(result.outcome).toBe('failed')
    expect(result.filledText).toBeNull()
  })
})

describe('uploadZoneFilename', () => {
  it('reads a rendered filename chip', () => {
    document.body.innerHTML = `<div id="z"><div class="file-name">Candidate_Resume.pdf</div></div>`
    expect(uploadZoneFilename(document.getElementById('z')!)).toBe('Candidate_Resume.pdf')
  })

  it('falls back to an extension-bearing token, ignoring format-hint noise', () => {
    document.body.innerHTML = `<div id="z">Uploaded: resume.pdf (120 KB)</div>`
    expect(uploadZoneFilename(document.getElementById('z')!)).toBe('resume.pdf')
    document.body.innerHTML = `<div id="z">Accepted formats: .pdf, .docx — upload a .pdf file</div>`
    expect(uploadZoneFilename(document.getElementById('z')!)).toBe('')
  })
})

// ---- Validation (P4) --------------------------------------------------------

describe('validate — file verdicts', () => {
  function match(fieldId: string, overrides: Partial<MatchResult> = {}): MatchResult {
    return {
      fieldId,
      resolvedAnswer: null,
      rawAnswerTemplate: 'Candidate_Resume.pdf',
      confidence: 0.92,
      source: 'document:doc-1',
      unresolvedVars: [],
      action: 'autofill',
      needsReview: false,
      composite: false,
      ...overrides,
    }
  }

  function detectOne(): DetectedField {
    document.body.innerHTML = `
      <div data-automation-id="file-upload-drop-zone">
        <div>Resume/CV</div>
        <input type="file" style="display:none">
      </div>
    `
    return detectFields(document)[0]
  }

  it('ok when the input holds the expected file', () => {
    const field = detectOne()
    Object.defineProperty(field.el, 'files', {
      configurable: true,
      value: [new File(['x'], 'Candidate_Resume.pdf')],
    })
    const id = field.signal.fieldId
    const report = validateFields([field], new Map([[id, match(id)]]), new Map())
    expect(report[0]).toMatchObject({ verdict: 'ok', actual: 'Candidate_Resume.pdf' })
  })

  it('ok via the zone-rendered chip when the site cleared the input', () => {
    const field = detectOne()
    const chip = document.createElement('div')
    chip.className = 'file-name'
    chip.textContent = 'Candidate_Resume.pdf (120 KB)'
    field.uploadZoneEl!.appendChild(chip)
    const id = field.signal.fieldId
    const report = validateFields([field], new Map([[id, match(id)]]), new Map())
    expect(report[0].verdict).toBe('ok')
  })

  it('missing-answerable when an attach was expected but nothing landed', () => {
    const field = detectOne()
    const id = field.signal.fieldId
    const report = validateFields([field], new Map([[id, match(id)]]), new Map())
    expect(report[0].verdict).toBe('missing-answerable')
  })

  it('skipped when suggest-only (waiting for the user) or unmatched', () => {
    const field = detectOne()
    const id = field.signal.fieldId
    expect(
      validateFields([field], new Map([[id, match(id, { action: 'suggest' })]]), new Map())[0].verdict,
    ).toBe('skipped')
    expect(validateFields([field], new Map(), new Map())[0].verdict).toBe('skipped')
  })

  it('wrong when a DIFFERENT file sits in the field', () => {
    const field = detectOne()
    Object.defineProperty(field.el, 'files', {
      configurable: true,
      value: [new File(['x'], 'unrelated_essay.docx')],
    })
    const id = field.signal.fieldId
    const report = validateFields([field], new Map([[id, match(id)]]), new Map())
    expect(report[0]).toMatchObject({ verdict: 'wrong', actual: 'unrelated_essay.docx' })
  })
})
