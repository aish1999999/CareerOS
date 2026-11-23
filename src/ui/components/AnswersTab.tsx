import { useRef, useState } from 'react'
import type { QAEntry, StoreData } from '@/types'
import { newId, redactForExport, runMigrations } from '@/lib/storage'
import { validateImport } from '@/lib/schema'
import { detectVariables } from '@/content/variables'
import { useApp } from '@/ui/store'

// ---------------------------------------------------------------------------
// Answers tab (Section 12): searchable list of Q&A entries with add/edit/
// delete and JSON import/export (lossless round-trip, Section 9).
// ---------------------------------------------------------------------------

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Editor({
  entry,
  personas,
  onSave,
  onCancel,
}: {
  entry: QAEntry
  personas: string[]
  onSave: (e: QAEntry) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<QAEntry>(entry)
  const vars = detectVariables(draft.answer)

  return (
    <div className="card">
      <div className="field">
        <label>Question</label>
        <input
          type="text"
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Aliases (one per line — other phrasings of the same question)</label>
        <textarea
          value={draft.aliases.join('\n')}
          onChange={(e) =>
            setDraft({ ...draft, aliases: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })
          }
        />
      </div>
      <div className="field">
        <label>Answer — supports {'{{company}}, {{role}}, {{location}}, {{today}}, {{profile.*}}'}</label>
        <textarea
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
        />
      </div>
      {vars.length > 0 && (
        <div className="muted" style={{ marginBottom: 8 }}>
          Template variables: {vars.map((v) => <span className="chip" key={v}>{`{{${v}}}`}</span>)}
        </div>
      )}
      <div className="field">
        <label style={{ fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={draft.answerMode === 'judge'}
            onChange={(e) => setDraft({ ...draft, answerMode: e.target.checked ? 'judge' : 'auto' })}
          />{' '}
          AI judge only — OpenAI picks the closest option for this question; local matching never
          places it (needs the API key in Settings; no pick = review chip)
        </label>
      </div>
      <div className="field">
        <label>Personas (none = universal)</label>
        <div className="list-editor">
          {personas.map((p) => (
            <label key={p} style={{ fontSize: 12.5 }}>
              <input
                type="checkbox"
                checked={draft.personas.includes(p)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    personas: e.target.checked
                      ? [...draft.personas, p]
                      : draft.personas.filter((x) => x !== p),
                  })
                }
              />{' '}
              {p}
            </label>
          ))}
        </div>
      </div>
      <div className="btn-row">
        <button
          className="btn primary"
          disabled={!draft.question.trim() || !draft.answer.trim()}
          onClick={() =>
            onSave({ ...draft, variables: vars, updatedAt: Date.now() })
          }
        >
          Save answer
        </button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export function AnswersTab() {
  const { store, saveQA, removeQA, importPayload } = useApp()
  const [search, setSearch] = useState('')
  const [personaFilter, setPersonaFilter] = useState('')
  const [editing, setEditing] = useState<QAEntry | null>(null)
  const [importReport, setImportReport] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const active = store.qa.filter((e) => e.status === 'active')
  const needle = search.toLowerCase()
  const filtered = active.filter((e) => {
    const matchesSearch =
      !needle ||
      e.question.toLowerCase().includes(needle) ||
      e.answer.toLowerCase().includes(needle) ||
      e.aliases.some((a) => a.toLowerCase().includes(needle))
    const matchesPersona =
      !personaFilter ||
      (personaFilter === '__universal' ? e.personas.length === 0 : e.personas.includes(personaFilter))
    return matchesSearch && matchesPersona
  })

  const startNew = () =>
    setEditing({
      id: newId(),
      question: '',
      aliases: [],
      answer: '',
      answerType: 'text',
      answerTemplate: null,
      mapsTo: null,
      variables: [],
      personas: [],
      tags: [],
      fieldType: 'text',
      options: [],
      status: 'active',
      source: 'import',
      captureContext: null,
      siteScope: null,
      reviewNote: '',
      lastWrongAt: null,
      okCount: 0,
      wrongCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

  const handleImportFile = async (file: File) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setImportReport('Import failed: not valid JSON.')
      return
    }
    // Old exports migrate on the way in (Stage 1): the v9 scrub applies to a
    // re-imported v8 file exactly as it did to the live store.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      parsed = runMigrations(parsed as Record<string, unknown>)
    }
    const result = validateImport(parsed)
    if (!result.ok || !result.data) {
      setImportReport(`Import failed: ${result.errors.join('; ')}`)
      return
    }
    // Cancel means cancel: the old single prompt mapped it to REPLACE, so backing out of the wrong
    // file wiped every existing answer. Replace is now a second, explicit yes.
    const n = result.data.qa?.length ?? 0
    if (!confirm(`Import ${n} answer${n === 1 ? '' : 's'}${result.data.profile ? ' + profile' : ''} by MERGING into your existing data?\n\n(matching ids updated, new added — Cancel aborts)`)) {
      setImportReport('Import cancelled — nothing changed.')
      return
    }
    const replace = confirm('Also REPLACE all existing Q&A with this file?\n\nOK = replace everything · Cancel = keep merging')
    await importPayload(result.data, replace ? 'replace' : 'merge')
    const rejectedNote =
      result.rejected.length > 0
        ? ` ${result.rejected.length} malformed entr${result.rejected.length === 1 ? 'y' : 'ies'} rejected: ${result.rejected
          .slice(0, 3)
          .map((r) => `#${r.index}${r.question ? ` (“${r.question.slice(0, 30)}”)` : ''} — ${r.reason}`)
          .join('; ')}${result.rejected.length > 3 ? '…' : ''}`
        : ''
    setImportReport(
      `Imported ${result.data.qa?.length ?? 0} answers${result.data.profile ? ' + profile' : ''}${result.data.optionSets ? ` + ${result.data.optionSets.length} option sets` : ''
      }${result.data.settings ? ' + settings' : ''}.${rejectedNote}`,
    )
  }

  const exportAll = () => {
    // Stage 1 (2026-08-22): the export used to carry the OpenAI API key in
    // plaintext — it left the machine at least once. Secrets never ride in
    // exports (Stage 2 adds the Anthropic planner key to the rule);
    // re-importing keeps the live keys because import MERGES settings and
    // empty refs are ignored on that path. redactForExport is the single
    // source of the redaction rule — pinned by test.
    const payload: StoreData = redactForExport(store)
    download('flashfiller-export.json', payload)
  }

  return (
    <div>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search answers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={personaFilter} onChange={(e) => setPersonaFilter(e.target.value)}>
          <option value="">All personas</option>
          <option value="__universal">Universal only</option>
          {store.settings.personas.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button className="btn small primary" onClick={startNew}>+ Add</button>
      </div>

      <div className="toolbar">
        <button className="btn small" onClick={exportAll}>Export JSON</button>
        <button className="btn small" onClick={() => fileRef.current?.click()}>Import JSON</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImportFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {importReport && <div className="note">{importReport}</div>}

      {editing && (
        <Editor
          entry={editing}
          personas={store.settings.personas}
          onSave={(e) => {
            void saveQA(e)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {filtered.length === 0 && !editing && (
        <div className="empty-state">
          No answers yet. Use the <strong>Training</strong> tab to answer common questions, or
          add one manually.
        </div>
      )}

      {filtered.map((entry) => (
        <div className="card qa-item" key={entry.id}>
          <div className="q">{entry.question}</div>
          <div className="a">{entry.answer || (entry.answerType !== 'text' ? `(from ${entry.answerType})` : '')}</div>
          <div>
            {entry.personas.map((p) => <span className="chip" key={p}>{p}</span>)}
            {entry.personas.length === 0 && <span className="chip gray">universal</span>}
            {entry.variables.length > 0 && <span className="chip gray">{'{{…}}'}</span>}
            {entry.answerMode === 'judge' && <span className="chip">AI judge</span>}
            <span className="chip gray">{entry.source}</span>
          </div>
          <div className="item-actions">
            <button className="btn small" onClick={() => setEditing(entry)}>Edit</button>
            <button
              className="btn small danger"
              onClick={() => {
                if (confirm(`Delete “${entry.question}”?`)) void removeQA(entry.id)
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
