import { useMemo, useState } from 'react'
import type { QAEntry, SeedQuestion } from '@/types'
import { seedEntryId, seedStatuses, trainingQueue } from '@/lib/seed'
import { detectVariables, resolveVariables } from '@/content/variables'
import { useApp } from '@/ui/store'

// ---------------------------------------------------------------------------
// Guided training (Section 10): flashcard/interview UI over the bundled seed
// catalog. Only ANSWERED questions are written to qa (status active, source
// training). Profile-backed seeds show as "already covered" — never written
// as blank text. Persona-aware and variable-aware with live preview.
// ---------------------------------------------------------------------------

const SAMPLE_CONTEXT = {
  company: 'Acme Corp',
  role: 'Software Engineer',
  location: 'Berlin',
  source: 'none' as const,
}

export function buildTrainingEntry(
  seed: SeedQuestion,
  answer: string,
  persona: string | null,
  now = Date.now(),
): QAEntry {
  return {
    id: seedEntryId(seed.id, persona),
    question: seed.question,
    aliases: seed.aliases,
    answer,
    answerType: 'text',
    answerTemplate: null,
    mapsTo: null,
    variables: detectVariables(answer),
    personas: persona ? [persona] : [],
    tags: [`seed:${seed.id}`, seed.category],
    fieldType: seed.fieldType,
    options: [],
    status: 'active',
    source: 'training',
    captureContext: null,
    siteScope: null,
    reviewNote: '',
    lastWrongAt: null,
    okCount: 0,
    wrongCount: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function TrainingTab({ limit, onDone }: { limit?: number; onDone?: () => void }) {
  const { store, seeds, saveQA, patchSettings } = useApp()
  const [persona, setPersona] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newQ, setNewQ] = useState({ question: '', answer: '' })

  const statuses = useMemo(
    () =>
      seeds
        ? seedStatuses(seeds, store.qa, store.profile, store.settings, persona)
        : [],
    [seeds, store, persona],
  )

  const queueAll = useMemo(() => trainingQueue(statuses, category || undefined), [statuses, category])
  const queue = limit ? queueAll.slice(0, limit) : queueAll

  if (!seeds) return <div className="empty-state">Seed catalog unavailable.</div>

  const freeTextSeeds = statuses.filter(
    (s) => s.seed.answerType === 'freeText' && s.coverage !== 'suppressed',
  )
  const answeredCount = freeTextSeeds.filter((s) => s.coverage === 'answered').length
  const coveredCount = statuses.filter((s) => s.coverage === 'covered').length
  const total = freeTextSeeds.length

  const current = queue[Math.min(index, queue.length - 1)]
  const done = queue.length === 0 || index >= queue.length

  // Skip/Back move the index. Save and Not-applicable do NOT: the answered seed leaves the queue and
  // the next one slides into this slot — advancing as well skipped a question each time and ended
  // the queue with unanswered seeds left (2026-09-16 audit).
  const advance = () => {
    setAnswer('')
    if (index + 1 >= queue.length && onDone) onDone()
    else setIndex(index + 1)
  }
  const consumed = () => {
    setAnswer('')
    if (queue.length <= 1 && onDone) onDone()
  }

  const save = async () => {
    if (!current || !answer.trim()) return
    await saveQA(buildTrainingEntry(current, answer.trim(), persona))
    consumed()
  }

  const notApplicable = async () => {
    if (!current) return
    await patchSettings({
      suppressedSeedIds: [...store.settings.suppressedSeedIds, current.id],
    })
    consumed()
  }

  const vars = detectVariables(answer)
  const preview =
    vars.length > 0
      ? resolveVariables(answer, { context: SAMPLE_CONTEXT, profile: store.profile })
      : null

  return (
    <div>
      <div className="toolbar">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: total ? `${(answeredCount / total) * 100}%` : '0%' }}
          />
        </div>
        <span className="muted">{answeredCount} / {total} answered</span>
      </div>
      <div className="toolbar">
        <select value={category} onChange={(e) => { setCategory(e.target.value); setIndex(0) }}>
          <option value="">All categories</option>
          {seeds.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <select
          value={persona ?? ''}
          onChange={(e) => { setPersona(e.target.value || null); setIndex(0) }}
          title="Answer the same question differently per persona"
        >
          <option value="">Universal answer</option>
          {store.settings.personas.map((p) => (
            <option key={p} value={p}>As: {p}</option>
          ))}
        </select>
      </div>

      {coveredCount > 0 && (
        <div className="note">
          ✓ {coveredCount} questions already covered by your profile — no typing needed.
        </div>
      )}

      {done ? (
        <div className="empty-state">
          🎉 Nothing left to answer{category ? ' in this category' : ''}.
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => setShowNewForm(true)}>+ Add your own question</button>
            {onDone && <button className="btn primary" onClick={onDone}>Finish</button>}
          </div>
        </div>
      ) : current ? (
        <div className="card flashcard">
          <div className="category">
            {seeds.categories.find((c) => c.id === current.category)?.label ?? current.category}
            {' · '}
            {index + 1} of {queue.length}
            {' · appears as '}
            {current.fieldType}
          </div>
          <div className="question">{current.question}</div>
          {current.guidance && <div className="guidance">{current.guidance}</div>}
          <div className="field">
            <textarea
              value={answer}
              placeholder={persona ? `Your ${persona} answer…` : 'Your answer… ({{company}}, {{role}} become per-application variables)'}
              onChange={(e) => setAnswer(e.target.value)}
              rows={current.fieldType === 'textarea' ? 6 : 2}
            />
          </div>
          {preview && (
            <div className="preview">
              <span className="preview-label">Preview with sample job (Acme Corp · Software Engineer · Berlin)</span>
              {preview.text}
              {preview.unresolved.length > 0 && (
                <div className="warn" style={{ marginTop: 6 }}>
                  Unresolved: {preview.unresolved.join(', ')} — you’ll be prompted when filling.
                </div>
              )}
            </div>
          )}
          <div className="btn-row">
            <button className="btn primary" disabled={!answer.trim()} onClick={() => void save()}>
              Save
            </button>
            <button className="btn" onClick={advance}>Skip</button>
            <button className="btn" onClick={() => void notApplicable()} title="Don’t ask me this again">
              Not applicable
            </button>
            <button className="btn" disabled={index === 0} onClick={() => { setAnswer(''); setIndex(index - 1) }}>
              ← Back
            </button>
          </div>
        </div>
      ) : null}

      {!done && (
        <button className="btn small" onClick={() => setShowNewForm(!showNewForm)}>
          + Add your own question
        </button>
      )}

      {showNewForm && (
        <div className="card">
          <div className="field">
            <label>Question</label>
            <input
              type="text"
              value={newQ.question}
              onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Answer</label>
            <textarea value={newQ.answer} onChange={(e) => setNewQ({ ...newQ, answer: e.target.value })} />
          </div>
          <div className="btn-row">
            <button
              className="btn primary"
              disabled={!newQ.question.trim() || !newQ.answer.trim()}
              onClick={() => {
                const now = Date.now()
                void saveQA({
                  id: `custom-${now}`,
                  question: newQ.question.trim(),
                  aliases: [],
                  answer: newQ.answer.trim(),
                  answerType: 'text',
                  answerTemplate: null,
                  mapsTo: null,
                  variables: detectVariables(newQ.answer),
                  personas: persona ? [persona] : [],
                  tags: ['custom'],
                  fieldType: 'textarea',
                  options: [],
                  status: 'active',
                  source: 'training',
                  captureContext: null,
                  siteScope: null,
                  reviewNote: '',
                  lastWrongAt: null,
                  okCount: 0,
                  wrongCount: 0,
                  createdAt: now,
                  updatedAt: now,
                })
                setNewQ({ question: '', answer: '' })
                setShowNewForm(false)
              }}
            >
              Save question
            </button>
            <button className="btn" onClick={() => setShowNewForm(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
