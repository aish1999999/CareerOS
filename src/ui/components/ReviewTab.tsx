import { Fragment, useMemo, useState } from 'react'
import type { QAEntry } from '@/types'
import {
  applyGeneralizations,
  findGeneralizations,
  type GeneralizationSpan,
} from '@/content/capture'
import { detectVariables } from '@/content/variables'
import { useApp } from '@/ui/store'

// ---------------------------------------------------------------------------
// Needs-Review queue (Section 11). Captured answers are quarantined here —
// suggestion-only until approved. "Generalize" detects literal company/role/
// location strings via the capture-time context and shows a HIGHLIGHTED DIFF
// the user confirms before anything is replaced (NOTE.MD), because a company
// name can be a common word.
// ---------------------------------------------------------------------------

function GeneralizeDiff({
  answer,
  spans,
  selected,
  onToggle,
}: {
  answer: string
  spans: GeneralizationSpan[]
  selected: Set<number>
  onToggle: (i: number) => void
}) {
  // Render the answer with each proposed replacement inline: literal
  // struck-through, variable highlighted — a before/after in one view.
  const parts: React.ReactNode[] = []
  let cursor = 0
  spans.forEach((span, i) => {
    if (span.start > cursor) parts.push(answer.slice(cursor, span.start))
    const active = selected.has(i)
    parts.push(
      <Fragment key={i}>
        {active ? (
          <>
            <mark>{span.literal}</mark>
            <span className="var">{`{{${span.variable}}}`}</span>
          </>
        ) : (
          span.literal
        )}
      </Fragment>,
    )
    cursor = span.end
  })
  parts.push(answer.slice(cursor))

  return (
    <div>
      <div className="diff">{parts}</div>
      {spans.map((span, i) => (
        <label className="gen-option" key={i}>
          <input type="checkbox" checked={selected.has(i)} onChange={() => onToggle(i)} />
          <span>
            Replace “<strong>{span.literal}</strong>” with{' '}
            <code>{`{{${span.variable}}}`}</code>
          </span>
        </label>
      ))}
    </div>
  )
}

function ReviewCard({ entry }: { entry: QAEntry }) {
  const { store, saveQA, removeQA } = useApp()
  const [draft, setDraft] = useState<QAEntry>(entry)
  const [showGeneralize, setShowGeneralize] = useState(false)

  const spans = useMemo(
    () => findGeneralizations(draft.answer, draft.captureContext),
    [draft.answer, draft.captureContext],
  )
  const [selected, setSelected] = useState<Set<number>>(new Set(spans.map((_, i) => i)))

  const applySelected = () => {
    const chosen = spans.filter((_, i) => selected.has(i))
    const generalized = applyGeneralizations(draft.answer, chosen)
    setDraft({ ...draft, answer: generalized, variables: detectVariables(generalized) })
    setShowGeneralize(false)
  }

  // A blank question would be a zod-invalid entry: every later getStore() would fall back to the
  // defaults and the NEXT write would empty the whole store (2026-09-16 audit) — so it never saves.
  const approvable = !!draft.answer.trim() && !!draft.question.trim()
  const approve = () =>
    void saveQA({
      ...draft,
      question: draft.question.trim(),
      status: 'active',
      reviewNote: '',
      lastWrongAt: null,
      wrongCount: 0,
      variables: detectVariables(draft.answer),
      updatedAt: Date.now(),
    })

  const context = draft.captureContext
  const cameBackWrong = entry.lastWrongAt != null

  return (
    <div className="card">
      <div className="muted" style={{ marginBottom: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="badge">{entry.source === 'inferred' ? 'ai-inferred' : entry.source}</span>
        <span className="badge">{entry.fieldType}</span>
        {entry.siteScope && <span className="badge">only {entry.siteScope}</span>}
      </div>
      {entry.reviewNote && (
        <div
          className={cameBackWrong ? 'note danger' : 'note'}
          style={cameBackWrong ? { color: '#b3261e', fontWeight: 600 } : undefined}
        >
          {cameBackWrong ? '⚠ ' : ''}
          {entry.reviewNote}
        </div>
      )}
      <div className="field">
        <label>Question</label>
        <input
          type="text"
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Answer</label>
        <textarea
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
        />
      </div>

      {context && (context.company || context.role || context.location) && (
        <div className="muted" style={{ marginBottom: 6 }}>
          Captured on: {[context.company, context.role, context.location].filter(Boolean).join(' · ')}
        </div>
      )}

      {entry.options.length > 0 && (
        <div className="muted" style={{ marginBottom: 6 }}>
          Field offered:{' '}
          {entry.options.map((o) => (
            <code key={o} style={{ marginRight: 6 }}>
              {o}
            </code>
          ))}
        </div>
      )}

      {entry.siteScope && (
        <label className="gen-option" style={{ marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={draft.siteScope === null}
            onChange={(e) => setDraft({ ...draft, siteScope: e.target.checked ? null : entry.siteScope })}
          />
          <span>
            Make universal — currently only fills on <strong>{entry.siteScope}</strong>
          </span>
        </label>
      )}

      {spans.length > 0 && !showGeneralize && (
        <button className="btn small" onClick={() => { setSelected(new Set(spans.map((_, i) => i))); setShowGeneralize(true) }}>
          ✨ Generalize ({spans.length} literal{spans.length === 1 ? '' : 's'} found)
        </button>
      )}
      {showGeneralize && (
        <div>
          <div className="note">
            Review each replacement below — nothing changes until you apply.
          </div>
          <GeneralizeDiff
            answer={draft.answer}
            spans={spans}
            selected={selected}
            onToggle={(i) => {
              const next = new Set(selected)
              if (next.has(i)) next.delete(i)
              else next.add(i)
              setSelected(next)
            }}
          />
          <div className="btn-row">
            <button className="btn primary small" disabled={selected.size === 0} onClick={applySelected}>
              Apply {selected.size} replacement{selected.size === 1 ? '' : 's'}
            </button>
            <button className="btn small" onClick={() => setShowGeneralize(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="field" style={{ marginTop: 8 }}>
        <label>Personas (none = universal)</label>
        <div className="list-editor">
          {store.settings.personas.map((p) => (
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
        <button className="btn primary" disabled={!approvable} onClick={approve}>
          ✓ Approve
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Discard this captured answer?')) void removeQA(entry.id)
          }}
        >
          Discard
        </button>
      </div>
    </div>
  )
}

export function ReviewTab() {
  const { store, saveManyQA, removeQA } = useApp()
  const pending = store.qa.filter((e) => e.status === 'needs_review')

  if (pending.length === 0) {
    return (
      <div className="empty-state">
        Review queue is empty. Answers captured while you apply will appear here for approval —
        they’re never auto-filled until you approve them.
      </div>
    )
  }

  return (
    <div>
      <div className="toolbar">
        <span className="muted">{pending.length} pending</span>
        <span style={{ flex: 1 }} />
        <button
          className="btn small"
          onClick={() => {
            if (confirm(`Approve all ${pending.length} pending answers as-is?`))
              void saveManyQA(
                pending.map((e) => ({
                  ...e,
                  status: 'active' as const,
                  reviewNote: '',
                  lastWrongAt: null,
                  wrongCount: 0,
                  updatedAt: Date.now(),
                })),
              )
          }}
        >
          Approve all
        </button>
        <button
          className="btn small danger"
          onClick={() => {
            if (confirm(`Discard all ${pending.length} pending answers? This can’t be undone.`)) {
              // one at a time: each removal is a read-modify-write of the store, and N in the same
              // tick all read the full list and the last write wins (only one entry was ever removed)
              void (async () => { for (const e of pending) await removeQA(e.id) })()
            }
          }}
        >
          Discard all
        </button>
      </div>
      {pending.map((entry) => (
        <ReviewCard key={`${entry.id}-${entry.updatedAt}`} entry={entry} />
      ))}
    </div>
  )
}
