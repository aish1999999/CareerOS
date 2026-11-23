import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/ui/store'
import {
  DOC_SIZE_WARN_BYTES,
  deleteDocument,
  guessKind,
  listDocumentMeta,
  saveDocument,
  updateDocument,
  type DocumentKind,
  type DocumentMeta,
} from '@/lib/documents'

// ---------------------------------------------------------------------------
// Documents tab (Resume feature, 2026-07-17): upload the resume/cover letter
// ONCE into local extension storage; autofill re-attaches the bytes to every
// application's file input. Same shape as the rest of the product: store
// once, fill everywhere, validate honestly, never submit.
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<DocumentKind, string> = {
  resume: 'Resume',
  coverLetter: 'Cover letter',
  other: 'Other',
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export function DocumentsTab() {
  const { store } = useApp()
  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const refresh = async () => setDocs(await listDocumentMeta())
  useEffect(() => {
    void refresh()
  }, [])

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    for (const file of [...files]) {
      await saveDocument(file, guessKind(file.name))
    }
    setStatus(`${files.length === 1 ? files[0].name : `${files.length} files`} saved.`)
    setTimeout(() => setStatus(null), 4000)
    await refresh()
  }

  const patch = async (id: string, p: Parameters<typeof updateDocument>[1]) => {
    await updateDocument(id, p)
    await refresh()
  }

  return (
    <div>
      <h3>Documents</h3>
      <p className="muted">
        Stored locally in this browser only — files never leave your machine except into the
        application form itself. Matched documents attach to upload fields automatically
        (Settings → “Auto-attach documents” switches to suggest-only chips).
      </p>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
        style={{ display: 'none' }}
        onChange={(e) => {
          void addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <button className="btn primary" onClick={() => fileInput.current?.click()}>
        Add document
      </button>
      {status && <div className="note" style={{ marginTop: 8 }}>{status}</div>}

      {docs.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Nothing stored yet. Upload your resume once and FlashFiller can attach it to every
          application’s “Upload resume” field for you — including drag-and-drop-only widgets.
        </p>
      ) : (
        <div style={{ marginTop: 12 }}>
          {docs.map((d) => (
            <div
              key={d.id}
              className="row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}
            >
              <button
                className="btn small"
                title={d.isDefault ? 'Default for its kind' : 'Make default'}
                onClick={() => void patch(d.id, { isDefault: true })}
                style={{ minWidth: 30 }}
              >
                {d.isDefault ? '★' : '☆'}
              </button>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="label" style={{ wordBreak: 'break-all' }}>{d.name}</div>
                <div className="sub">
                  {formatSize(d.size)}
                  {d.size > DOC_SIZE_WARN_BYTES && (
                    <span className="warn" style={{ marginLeft: 6 }}>
                      over 4 MB — some sites reject files this large
                    </span>
                  )}
                </div>
              </div>
              <select
                value={d.kind}
                onChange={(e) => void patch(d.id, { kind: e.target.value as DocumentKind })}
              >
                {(Object.keys(KIND_LABELS) as DocumentKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <button
                className="btn small danger"
                onClick={() => {
                  if (confirm(`Delete "${d.name}" from FlashFiller?`)) void deleteDocument(d.id).then(refresh)
                }}
              >
                ✕
              </button>
              {store.settings.personas.length > 0 && (
                <div className="list-editor" style={{ width: '100%' }}>
                  {store.settings.personas.map((p) => {
                    const on = d.personas.includes(p)
                    return (
                      <span
                        key={p}
                        className="removable"
                        style={{ opacity: on ? 1 : 0.45, cursor: 'pointer' }}
                        title={
                          on
                            ? `Only attaches when the "${p}" persona is active — click to make universal again`
                            : `Pin to the "${p}" persona`
                        }
                        onClick={() =>
                          void patch(d.id, {
                            personas: on ? d.personas.filter((x) => x !== p) : [...d.personas, p],
                          })
                        }
                      >
                        {p}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          <p className="muted" style={{ marginTop: 10 }}>
            ★ marks the document attached when several of the same kind match. No persona
            selected = universal. Cover-letter fields only ever receive cover letters; a field
            that accepts only formats you haven’t stored gets an honest chip instead.
          </p>
        </div>
      )}
    </div>
  )
}
