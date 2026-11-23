// ---------------------------------------------------------------------------
// Document store (Resume feature, 2026-07-17). The user uploads their resume/
// cover letter ONCE into the extension; autofill re-attaches the stored bytes
// to every application's file input. Documents live under their OWN storage
// key — the main store is zod-parsed on every getStore() and must not drag
// megabytes of base64 through every read. chrome.storage.local (extension-
// scoped) is deliberate: a content script's IndexedDB belongs to the PAGE's
// origin, not the extension. `unlimitedStorage` covers the quota.
// ---------------------------------------------------------------------------

export const DOCS_KEY = 'flashfiller_documents_v1'
export const DOCS_SCHEMA_VERSION = 1

/** Past this size some ATS uploaders reject the file — the UI warns. */
export const DOC_SIZE_WARN_BYTES = 4 * 1024 * 1024

export type DocumentKind = 'resume' | 'coverLetter' | 'other'

export interface StoredDocument {
  id: string
  kind: DocumentKind
  /** "Candidate_Resume.pdf" — what sites may display. */
  name: string
  /** application/pdf | docx mime | text/plain… */
  mime: string
  /** base64 payload. */
  bytesB64: string
  /** Raw byte count, for UI + per-site max-size checks. */
  size: number
  /** [] = universal — same convention as QAEntry. */
  personas: string[]
  /** The one auto-attached when several match. */
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

/** Everything but the payload — what rides into the matcher (bytes are
 *  fetched by id at fill time, never carried through match context). */
export type DocumentMeta = Omit<StoredDocument, 'bytesB64'>

interface DocsEnvelope {
  schemaVersion: number
  documents: StoredDocument[]
}

// ---- base64 <-> bytes (pure, unit-tested) -----------------------------------

const B64_CHUNK = 0x8000 // String.fromCharCode arg-spread limit safety

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK))
  }
  return btoa(binary)
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const EXT_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
  '.odt': 'application/vnd.oasis.opendocument.text',
}

export function mimeFromName(name: string): string {
  const ext = name.match(/\.\w+$/)?.[0]?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? 'application/octet-stream'
}

// ---- Envelope persistence ---------------------------------------------------

function isStoredDocument(raw: unknown): raw is StoredDocument {
  if (typeof raw !== 'object' || raw === null) return false
  const d = raw as Record<string, unknown>
  return (
    typeof d.id === 'string' &&
    typeof d.name === 'string' &&
    typeof d.bytesB64 === 'string' &&
    (d.kind === 'resume' || d.kind === 'coverLetter' || d.kind === 'other')
  )
}

/** Tolerant read: unknown/corrupt payloads yield an empty envelope rather
 *  than crashing every scan (documents are re-uploadable; never worth a
 *  poisoned pipeline). */
async function readEnvelope(): Promise<DocsEnvelope> {
  const result = await chrome.storage.local.get(DOCS_KEY)
  const raw = result[DOCS_KEY] as Partial<DocsEnvelope> | undefined
  const documents = Array.isArray(raw?.documents) ? raw.documents.filter(isStoredDocument) : []
  return {
    schemaVersion: DOCS_SCHEMA_VERSION,
    documents: documents.map((d) => ({
      ...d,
      mime: typeof d.mime === 'string' ? d.mime : 'application/octet-stream',
      size: typeof d.size === 'number' ? d.size : 0,
      personas: Array.isArray(d.personas) ? d.personas.filter((p) => typeof p === 'string') : [],
      isDefault: d.isDefault === true,
      createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
      updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : 0,
    })),
  }
}

async function writeEnvelope(env: DocsEnvelope): Promise<void> {
  await chrome.storage.local.set({ [DOCS_KEY]: env })
}

// Metadata cache: rescans re-run matching constantly and the envelope carries
// megabytes of base64 — cache the stripped metadata, invalidate on any write
// to the key (from ANY extension context; onChanged fires cross-context).
let metaCache: DocumentMeta[] | null = null
let watching = false

function watchInvalidations(): void {
  if (watching) return
  watching = true
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && DOCS_KEY in changes) metaCache = null
    })
  } catch {
    // Non-extension context (plain unit test) — cache just stays warm
  }
}

function stripBytes(doc: StoredDocument): DocumentMeta {
  const { bytesB64: _bytes, ...meta } = doc
  return meta
}

export async function listDocuments(): Promise<StoredDocument[]> {
  return (await readEnvelope()).documents
}

export async function listDocumentMeta(): Promise<DocumentMeta[]> {
  watchInvalidations()
  if (metaCache) return metaCache
  metaCache = (await readEnvelope()).documents.map(stripBytes)
  return metaCache
}

export async function getDocument(id: string): Promise<StoredDocument | null> {
  return (await readEnvelope()).documents.find((d) => d.id === id) ?? null
}

/** base64 → raw bytes for the fill layer. Null when the id is gone. */
export async function getDocumentBytes(id: string): Promise<Uint8Array | null> {
  const doc = await getDocument(id)
  return doc ? base64ToBytes(doc.bytesB64) : null
}

function newDocId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

/** Guess the kind from the file name — the UI lets the user correct it. */
export function guessKind(name: string): DocumentKind {
  if (/cover[\s_-]*letter|\bcl\b/i.test(name)) return 'coverLetter'
  if (/resume|\bcv\b|curriculum/i.test(name)) return 'resume'
  return 'other'
}

/** Blob.arrayBuffer with a FileReader fallback (older engines, jsdom). */
async function fileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === 'function') return new Uint8Array(await file.arrayBuffer())
  return await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export async function saveDocument(
  file: File,
  kind: DocumentKind,
  opts: { personas?: string[] } = {},
): Promise<StoredDocument> {
  const bytes = await fileBytes(file)
  const env = await readEnvelope()
  const now = Date.now()
  const doc: StoredDocument = {
    id: newDocId(),
    kind,
    name: file.name,
    mime: file.type || mimeFromName(file.name),
    bytesB64: bytesToBase64(bytes),
    size: bytes.byteLength,
    personas: opts.personas ?? [],
    // First document of its kind is the default automatically
    isDefault: !env.documents.some((d) => d.kind === kind),
    createdAt: now,
    updatedAt: now,
  }
  env.documents.push(doc)
  await writeEnvelope(env)
  metaCache = null
  return doc
}

/** Patch metadata (kind, personas, default star, rename). Setting
 *  isDefault=true clears the star on every other document of the same kind. */
export async function updateDocument(
  id: string,
  patch: Partial<Pick<StoredDocument, 'kind' | 'name' | 'personas' | 'isDefault'>>,
): Promise<void> {
  const env = await readEnvelope()
  const target = env.documents.find((d) => d.id === id)
  if (!target) return
  Object.assign(target, patch, { updatedAt: Date.now() })
  if (patch.isDefault === true) {
    for (const d of env.documents) {
      if (d.id !== id && d.kind === target.kind) d.isDefault = false
    }
  }
  await writeEnvelope(env)
  metaCache = null
}

export async function deleteDocument(id: string): Promise<void> {
  const env = await readEnvelope()
  env.documents = env.documents.filter((d) => d.id !== id)
  await writeEnvelope(env)
  metaCache = null
}

// ---- The matching brain (pure — matcher imports this) -----------------------

export interface PickDocumentQuery {
  /** What the field/zone asks for ('resume' | 'coverLetter'); 'other'/absent
   *  = a generic attachments zone. */
  docCue?: DocumentKind
  /** The input's accept attribute — an accept=".pdf" input never gets the .docx. */
  accept?: string
  /** Effective persona; null = universal only. */
  persona?: string | null
}

/** Does the document satisfy the input's accept attribute? Empty accept =
 *  everything. Tokens: ".pdf", "application/pdf", "application/*". */
export function acceptMatches(accept: string | undefined, doc: Pick<DocumentMeta, 'name' | 'mime'>): boolean {
  if (!accept || !accept.trim()) return true
  const ext = doc.name.match(/\.\w+$/)?.[0]?.toLowerCase() ?? ''
  const mime = doc.mime.toLowerCase()
  return accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .some((token) => {
      if (token.startsWith('.')) return ext === token
      if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1))
      return mime === token
    })
}

/**
 * Which stored document belongs on this upload field? Pure and honest:
 * cue-typed zones only ever get their own kind (a cover-letter zone with no
 * stored cover letter gets NOTHING, never the resume); generic zones prefer
 * the resume. Ranking: active-persona docs, then (generic only) resumes,
 * then the default star, then most recently updated.
 */
export function pickDocument(docs: DocumentMeta[], query: PickDocumentQuery): DocumentMeta | null {
  const cue = query.docCue ?? 'other'
  let pool = docs.filter((d) => acceptMatches(query.accept, d))
  if (cue === 'resume' || cue === 'coverLetter') pool = pool.filter((d) => d.kind === cue)
  // Persona scoping — same convention as QAEntry: [] = universal;
  // persona-pinned docs never attach outside their persona.
  pool = pool.filter(
    (d) => d.personas.length === 0 || (!!query.persona && d.personas.includes(query.persona)),
  )
  if (pool.length === 0) return null
  const rank = (d: DocumentMeta): number[] => [
    query.persona && d.personas.includes(query.persona) ? 1 : 0,
    cue === 'other' && d.kind === 'resume' ? 1 : 0,
    d.isDefault ? 1 : 0,
    d.updatedAt,
  ]
  return pool.reduce((best, d) => {
    const a = rank(d)
    const b = rank(best)
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] > b[i] ? d : best
    }
    return best
  })
}
