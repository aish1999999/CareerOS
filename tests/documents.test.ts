import { beforeEach, describe, expect, it } from 'vitest'
import {
  acceptMatches,
  base64ToBytes,
  bytesToBase64,
  deleteDocument,
  getDocument,
  getDocumentBytes,
  guessKind,
  listDocumentMeta,
  listDocuments,
  mimeFromName,
  pickDocument,
  saveDocument,
  updateDocument,
  type DocumentMeta,
} from '@/lib/documents'
import { resetChromeMock } from './setup'

// ---------------------------------------------------------------------------
// Document store (resume feature): base64 round-trip, envelope persistence,
// and the pure matching brain (pickDocument).
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetChromeMock()
})

function meta(overrides: Partial<DocumentMeta> = {}): DocumentMeta {
  return {
    id: 'd1',
    kind: 'resume',
    name: 'Candidate_Resume.pdf',
    mime: 'application/pdf',
    size: 1234,
    personas: [],
    isDefault: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('base64 round-trip', () => {
  it('survives every byte value', () => {
    const bytes = new Uint8Array(256)
    for (let i = 0; i < 256; i++) bytes[i] = i
    const back = base64ToBytes(bytesToBase64(bytes))
    expect([...back]).toEqual([...bytes])
  })

  it('handles payloads past the chunking threshold', () => {
    const bytes = new Uint8Array(0x8000 * 2 + 17)
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31) % 256
    const back = base64ToBytes(bytesToBase64(bytes))
    expect(back.length).toBe(bytes.length)
    expect(back[bytes.length - 1]).toBe(bytes[bytes.length - 1])
  })
})

describe('helpers', () => {
  it('mimeFromName maps common document extensions', () => {
    expect(mimeFromName('resume.pdf')).toBe('application/pdf')
    expect(mimeFromName('resume.DOCX')).toContain('officedocument')
    expect(mimeFromName('weird.xyz')).toBe('application/octet-stream')
  })

  it('guessKind reads the filename', () => {
    expect(guessKind('Candidate_Resume.pdf')).toBe('resume')
    expect(guessKind('my-cv-2026.pdf')).toBe('resume')
    expect(guessKind('Cover_Letter_Acme.docx')).toBe('coverLetter')
    expect(guessKind('transcript.pdf')).toBe('other')
  })
})

describe('envelope persistence', () => {
  it('save → list → bytes round-trip; first of a kind becomes default', async () => {
    const file = new File(['%PDF-1.4 fake resume bytes'], 'resume.pdf', { type: 'application/pdf' })
    const saved = await saveDocument(file, 'resume')
    expect(saved.isDefault).toBe(true)
    expect(saved.mime).toBe('application/pdf')
    expect(saved.size).toBeGreaterThan(0)

    const listed = await listDocuments()
    expect(listed).toHaveLength(1)
    expect(listed[0].name).toBe('resume.pdf')

    const bytes = await getDocumentBytes(saved.id)
    expect(new TextDecoder().decode(bytes!)).toBe('%PDF-1.4 fake resume bytes')

    // Second resume is NOT default; a cover letter starts its own default
    const second = await saveDocument(file, 'resume')
    expect(second.isDefault).toBe(false)
    const cl = await saveDocument(new File(['x'], 'cl.pdf'), 'coverLetter')
    expect(cl.isDefault).toBe(true)
  })

  it('metadata list carries no bytes and tracks writes', async () => {
    const saved = await saveDocument(new File(['abc'], 'resume.pdf'), 'resume')
    const metaList = await listDocumentMeta()
    expect(metaList).toHaveLength(1)
    expect('bytesB64' in metaList[0]).toBe(false)

    await deleteDocument(saved.id)
    expect(await listDocumentMeta()).toHaveLength(0)
    expect(await getDocument(saved.id)).toBeNull()
  })

  it('updateDocument default star clears same-kind siblings only', async () => {
    const a = await saveDocument(new File(['a'], 'a.pdf'), 'resume')
    const b = await saveDocument(new File(['b'], 'b.pdf'), 'resume')
    const cl = await saveDocument(new File(['c'], 'c.pdf'), 'coverLetter')
    await updateDocument(b.id, { isDefault: true })
    const docs = await listDocuments()
    expect(docs.find((d) => d.id === a.id)!.isDefault).toBe(false)
    expect(docs.find((d) => d.id === b.id)!.isDefault).toBe(true)
    expect(docs.find((d) => d.id === cl.id)!.isDefault).toBe(true) // untouched
  })

  it('missing-file mime falls back to the extension mapping', async () => {
    const saved = await saveDocument(new File(['x'], 'resume.docx'), 'resume')
    expect(saved.mime).toContain('officedocument')
  })
})

describe('acceptMatches', () => {
  const pdf = { name: 'resume.pdf', mime: 'application/pdf' }
  it('empty accept admits everything', () => {
    expect(acceptMatches(undefined, pdf)).toBe(true)
    expect(acceptMatches('  ', pdf)).toBe(true)
  })
  it('extension, mime, and wildcard tokens', () => {
    expect(acceptMatches('.pdf', pdf)).toBe(true)
    expect(acceptMatches('.doc,.docx', pdf)).toBe(false)
    expect(acceptMatches('application/pdf', pdf)).toBe(true)
    expect(acceptMatches('application/*', pdf)).toBe(true)
    expect(acceptMatches('image/*', pdf)).toBe(false)
    expect(acceptMatches('.doc, .docx, application/pdf', pdf)).toBe(true)
  })
})

describe('pickDocument — the matching brain', () => {
  it('cue-typed zones only get their own kind; honest null otherwise', () => {
    const resume = meta({ id: 'r' })
    const cover = meta({ id: 'c', kind: 'coverLetter', name: 'cl.pdf' })
    expect(pickDocument([resume, cover], { docCue: 'resume' })?.id).toBe('r')
    expect(pickDocument([resume, cover], { docCue: 'coverLetter' })?.id).toBe('c')
    expect(pickDocument([resume], { docCue: 'coverLetter' })).toBeNull()
    expect(pickDocument([], { docCue: 'resume' })).toBeNull()
  })

  it('accept filter: a .pdf-only doc never lands on a .docx-only input', () => {
    const resume = meta()
    expect(pickDocument([resume], { docCue: 'resume', accept: '.doc,.docx' })).toBeNull()
    expect(pickDocument([resume], { docCue: 'resume', accept: '.pdf' })?.id).toBe('d1')
  })

  it('generic zones prefer the resume, then the default star, then recency', () => {
    const other = meta({ id: 'o', kind: 'other', isDefault: true, updatedAt: 9 })
    const resume = meta({ id: 'r', updatedAt: 2 })
    expect(pickDocument([other, resume], { docCue: 'other' })?.id).toBe('r')

    const oldDefault = meta({ id: 'a', isDefault: true, updatedAt: 1 })
    const newer = meta({ id: 'b', updatedAt: 5 })
    expect(pickDocument([oldDefault, newer], { docCue: 'resume' })?.id).toBe('a')
    expect(pickDocument([meta({ id: 'x', updatedAt: 1 }), meta({ id: 'y', updatedAt: 5 })], { docCue: 'resume' })?.id).toBe('y')
  })

  it('persona scoping: pinned docs win under their persona, vanish outside it', () => {
    const universal = meta({ id: 'u', isDefault: true })
    const pinned = meta({ id: 'p', personas: ['frontend'] })
    expect(pickDocument([universal, pinned], { docCue: 'resume', persona: 'frontend' })?.id).toBe('p')
    expect(pickDocument([universal, pinned], { docCue: 'resume', persona: null })?.id).toBe('u')
    expect(pickDocument([pinned], { docCue: 'resume', persona: null })).toBeNull()
    expect(pickDocument([pinned], { docCue: 'resume', persona: 'backend' })).toBeNull()
  })
})
