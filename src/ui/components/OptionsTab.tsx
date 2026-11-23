import { useMemo, useState } from 'react'
import type { OptionSet, QAEntry } from '@/types'
import { mergeOptions } from '@/content/capture'
import { newId } from '@/lib/storage'
import { useApp } from '@/ui/store'

// ---------------------------------------------------------------------------
// Options tab: every captured question that carried a fixed choice list
// (selects, radios, checkboxes, custom dropdowns), shown with its options.
// Forms word the same thing differently — "Yes" vs "Yes, I am authorized to
// work" — and only the user can say which wordings mean the same thing. Two
// classification tools live here:
//   1. Merge questions that mean the same → one entry, the others' texts
//      become aliases (raises match confidence).
//   2. Group option texts that mean the same into OPTION SETS → when filling,
//      any member of a set can stand in for the stored answer.
// ---------------------------------------------------------------------------

function QuestionRow({
  entry,
  selected,
  onToggle,
}: {
  entry: QAEntry
  selected: boolean
  onToggle: () => void
}) {
  return (
    <div className="card qa-item">
      <label style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span className="q">{entry.question}</span>
        <span className="chip gray">{entry.fieldType}</span>
        {entry.status === 'needs_review' && <span className="chip warn-chip">needs review</span>}
      </label>
      <div className="a">Answer: {entry.answer || '—'}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {entry.options.map((option) => (
          <span
            key={option}
            className={`chip ${option === entry.answer ? '' : 'gray'}`}
            title={option === entry.answer ? 'Stored answer' : undefined}
          >
            {option}
          </span>
        ))}
      </div>
      {entry.aliases.length > 0 && (
        <div className="muted">Also matches: {entry.aliases.join(' · ')}</div>
      )}
    </div>
  )
}

function SetCard({ set, knownOptions }: { set: OptionSet; knownOptions: string[] }) {
  const { saveOptionSet, removeOptionSet } = useApp()
  const [label, setLabel] = useState(set.label)
  const [draft, setDraft] = useState('')
  const listId = `ff-known-options-${set.id}`

  const addOption = () => {
    const text = draft.trim()
    if (!text) return
    void saveOptionSet({ ...set, options: mergeOptions(set.options, [text]) })
    setDraft('')
  }

  return (
    <div className="card">
      <div className="field">
        <label>Set name</label>
        <input
          type="text"
          value={label}
          placeholder="e.g. Authorized to work — Yes"
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label.trim() !== set.label) void saveOptionSet({ ...set, label: label.trim() })
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {set.options.length === 0 && <span className="muted">No options yet — add the wordings that mean the same thing.</span>}
        {set.options.map((option) => (
          <span key={option} className="chip">
            {option}{' '}
            <button
              className="chip-remove"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              title="Remove from set"
              onClick={() =>
                void saveOptionSet({ ...set, options: set.options.filter((o) => o !== option) })
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <input
          type="text"
          list={listId}
          value={draft}
          placeholder="Add an equivalent option wording…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addOption()
          }}
        />
        <datalist id={listId}>
          {knownOptions
            .filter((o) => !set.options.some((s) => s.toLowerCase() === o.toLowerCase()))
            .map((o) => (
              <option key={o} value={o} />
            ))}
        </datalist>
        <button className="btn small" disabled={!draft.trim()} onClick={addOption}>
          Add
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="btn small danger"
          onClick={() => {
            if (confirm(`Delete option set “${set.label || 'Untitled'}”?`)) void removeOptionSet(set.id)
          }}
        >
          Delete set
        </button>
      </div>
    </div>
  )
}

export function OptionsTab() {
  const { store, saveQA, removeQA, saveOptionSet } = useApp()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [survivorId, setSurvivorId] = useState<string | null>(null)

  const withOptions = useMemo(
    () => store.qa.filter((e) => e.options.length > 0),
    [store.qa],
  )
  const knownOptions = useMemo(
    () => mergeOptions(withOptions.flatMap((e) => e.options), []).sort((a, b) => a.localeCompare(b)),
    [withOptions],
  )

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    if (!next.has(survivorId ?? '')) setSurvivorId([...next][0] ?? null)
  }

  const selectedEntries = withOptions.filter((e) => selected.has(e.id))

  const mergeSelected = async () => {
    const survivor = selectedEntries.find((e) => e.id === survivorId)
    if (!survivor || selectedEntries.length < 2) return
    const others = selectedEntries.filter((e) => e.id !== survivor.id)
    if (
      !confirm(
        `Merge ${others.length} question${others.length === 1 ? '' : 's'} into “${survivor.question}”?\n\n` +
          'Their question texts become aliases of the kept entry; the kept answer wins. This cannot be undone.',
      )
    )
      return

    const known = new Set([survivor.question, ...survivor.aliases].map((t) => t.toLowerCase()))
    const aliases = [...survivor.aliases]
    for (const other of others) {
      for (const text of [other.question, ...other.aliases]) {
        if (text.trim() && !known.has(text.toLowerCase())) {
          known.add(text.toLowerCase())
          aliases.push(text)
        }
      }
    }
    const answersDiffer = others.some((o) => o.answer.trim() !== survivor.answer.trim())
    await saveQA({
      ...survivor,
      aliases,
      options: mergeOptions(survivor.options, others.flatMap((o) => o.options)),
      // A merged-away entry disagreed on the answer → re-check before autofill
      status: answersDiffer ? 'needs_review' : survivor.status,
      updatedAt: Date.now(),
    })
    for (const other of others) await removeQA(other.id)
    setSelected(new Set())
    setSurvivorId(null)
  }

  return (
    <div>
      <div className="note">
        Questions captured from choice fields (dropdowns, radios, checkboxes) appear here with
        every option the form offered. Different forms word the same question — and the same
        option — differently; classifying them is your call. Merge equivalent <strong>questions</strong> so
        they match as one, and group equivalent <strong>option wordings</strong> into sets so a stored answer
        can fill any of its set’s wordings.
      </div>

      <h3 style={{ margin: '14px 0 8px' }}>Captured questions &amp; their options</h3>
      {withOptions.length === 0 ? (
        <div className="empty-state">
          Nothing here yet. When you (or an agent like Claude) answer a dropdown, radio or
          checkbox question FlashFiller didn’t know, saving it from the capture prompt records
          the question together with all its options.
        </div>
      ) : (
        <>
          {selected.size >= 2 && (
            <div className="toolbar">
              <span className="muted">{selected.size} selected — keep:</span>
              <select value={survivorId ?? ''} onChange={(e) => setSurvivorId(e.target.value)}>
                {selectedEntries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.question}
                  </option>
                ))}
              </select>
              <button className="btn small primary" onClick={() => void mergeSelected()}>
                Merge as same question
              </button>
            </div>
          )}
          {withOptions.map((entry) => (
            <QuestionRow
              key={entry.id}
              entry={entry}
              selected={selected.has(entry.id)}
              onToggle={() => toggle(entry.id)}
            />
          ))}
        </>
      )}

      <h3 style={{ margin: '18px 0 8px' }}>Option sets (equivalent wordings)</h3>
      <div className="muted" style={{ marginBottom: 8 }}>
        Example: group “Yes”, “Yes, I am authorized to work in the United States” and
        “Authorized” — then an entry whose answer is any one of them can fill a form that
        offers any other.
      </div>
      {store.optionSets.map((set) => (
        <SetCard key={set.id} set={set} knownOptions={knownOptions} />
      ))}
      <button
        className="btn"
        onClick={() => void saveOptionSet({ id: newId(), label: '', options: [] })}
      >
        + New option set
      </button>
    </div>
  )
}
