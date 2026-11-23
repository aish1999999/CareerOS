import { useState } from 'react'
import { useApp } from '@/ui/store'

// ---------------------------------------------------------------------------
// Settings tab (Section 12): thresholds, overwrite, per-domain enable list,
// persona manager, capture-loop and semantic-matching config, delete-all.
// ---------------------------------------------------------------------------

export function SettingsTab() {
  const { store, patchSettings, deleteAllData } = useApp()
  const s = store.settings
  const [newDomain, setNewDomain] = useState('')
  const [newPersona, setNewPersona] = useState('')

  return (
    <div>
      <h3>Matching thresholds</h3>
      <div className="slider-row">
        <div className="slider-head">
          <span>Auto-fill at or above</span>
          <strong>{Math.round(s.autoFillThreshold * 100)}%</strong>
        </div>
        <input
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={s.autoFillThreshold}
          onChange={(e) =>
            void patchSettings({
              autoFillThreshold: Math.max(Number(e.target.value), s.suggestThreshold),
            })
          }
        />
      </div>
      <div className="slider-row">
        <div className="slider-head">
          <span>Suggest at or above</span>
          <strong>{Math.round(s.suggestThreshold * 100)}%</strong>
        </div>
        <input
          type="range"
          min={0.3}
          max={1}
          step={0.05}
          value={s.suggestThreshold}
          onChange={(e) =>
            void patchSettings({
              suggestThreshold: Math.min(Number(e.target.value), s.autoFillThreshold),
            })
          }
        />
      </div>

      <h3>Filling behavior</h3>
      <div className="toggle-row">
        <div>
          <div className="label">Overwrite already-filled fields</div>
          <div className="sub">Off: existing content is always respected</div>
        </div>
        <input
          type="checkbox"
          checked={s.overwriteFilled}
          onChange={(e) => void patchSettings({ overwriteFilled: e.target.checked })}
        />
      </div>
      <div className="toggle-row">
        <div>
          <div className="label">Auto-attach documents</div>
          <div className="sub">
            Off: matched resumes/cover letters show a suggestion chip instead of attaching
            silently (documents live in the Documents tab)
          </div>
        </div>
        <input
          type="checkbox"
          checked={s.autoAttachDocuments}
          onChange={(e) => void patchSettings({ autoAttachDocuments: e.target.checked })}
        />
      </div>
      <div className="toggle-row">
        <div>
          <div className="label">Capture loop</div>
          <div className="sub">Offer to save answers you type that FlashFiller didn’t know</div>
        </div>
        <input
          type="checkbox"
          checked={s.captureLoopEnabled}
          onChange={(e) => void patchSettings({ captureLoopEnabled: e.target.checked })}
        />
      </div>
      <div className="field" style={{ marginTop: 8 }}>
        <label>Delay between fills (ms) — never faster than the page can handle</label>
        <input
          type="number"
          min={0}
          value={s.fillDelayMs}
          onChange={(e) => void patchSettings({ fillDelayMs: Math.max(0, Number(e.target.value) || 0) })}
        />
      </div>

      <h3>Enabled domains</h3>
      <p className="muted">
        FlashFiller activates automatically on these domains. Anywhere else, use “Scan this
        page” in the popup (only acts on your click).
      </p>
      <div className="list-editor">
        {s.enabledDomains.map((d) => (
          <span className="removable" key={d}>
            {d}
            <button
              onClick={() =>
                void patchSettings({ enabledDomains: s.enabledDomains.filter((x) => x !== d) })
              }
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder="jobs.example.com"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          style={{ padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 7 }}
        />
        <button
          className="btn small"
          disabled={!newDomain.trim()}
          onClick={() => {
            const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
            if (domain && !s.enabledDomains.includes(domain))
              void patchSettings({ enabledDomains: [...s.enabledDomains, domain] })
            setNewDomain('')
          }}
        >
          Add
        </button>
      </div>

      <h3>Personas</h3>
      <p className="muted">
        Answer the same question differently per role type. The active persona’s answers are
        preferred when filling.
      </p>
      <div className="list-editor">
        {s.personas.map((p) => (
          <span className="removable" key={p}>
            {p}
            <button
              onClick={() =>
                void patchSettings({
                  personas: s.personas.filter((x) => x !== p),
                  activePersona: s.activePersona === p ? null : s.activePersona,
                })
              }
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder="e.g. backend"
          value={newPersona}
          onChange={(e) => setNewPersona(e.target.value)}
          style={{ padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 7 }}
        />
        <button
          className="btn small"
          disabled={!newPersona.trim()}
          onClick={() => {
            const p = newPersona.trim()
            if (p && !s.personas.includes(p)) void patchSettings({ personas: [...s.personas, p] })
            setNewPersona('')
          }}
        >
          Add
        </button>
      </div>
      <div className="field" style={{ marginTop: 10 }}>
        <label>Active persona</label>
        <select
          value={s.activePersona ?? ''}
          onChange={(e) => void patchSettings({ activePersona: e.target.value || null })}
        >
          <option value="">None (universal answers only)</option>
          {s.personas.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="toggle-row">
        <div>
          <div className="label">Auto-infer persona from job title</div>
          <div className="sub">e.g. a “Senior Frontend Engineer” posting activates “frontend”</div>
        </div>
        <input
          type="checkbox"
          checked={s.autoInferPersona}
          onChange={(e) => void patchSettings({ autoInferPersona: e.target.checked })}
        />
      </div>

      <h3>Semantic matching (optional)</h3>
      <div className="note">
        Privacy: with this OFF (default), FlashFiller makes <strong>zero</strong> network
        requests — all matching is local. Turning it on sends form questions, their option
        texts, and (when inferring an unknown question) a summary of your profile answers
        to OpenAI, using your own API key, stored only on this device.
      </div>
      <div className="toggle-row">
        <span className="label">Enable semantic matching</span>
        <input
          type="checkbox"
          checked={s.semanticMatching.enabled}
          onChange={(e) =>
            void patchSettings({
              semanticMatching: {
                ...s.semanticMatching,
                enabled: e.target.checked,
                // Turning the judge on means OpenAI — the only provider shipped
                provider: e.target.checked ? 'openai' : s.semanticMatching.provider,
              },
            })
          }
        />
      </div>
      {s.semanticMatching.enabled && (
        <div>
          <div className="field">
            <label>OpenAI API key (stored locally, sent only to api.openai.com)</label>
            <input
              type="password"
              placeholder="sk-..."
              value={s.semanticMatching.apiKeyRef ?? ''}
              onChange={(e) =>
                void patchSettings({
                  semanticMatching: { ...s.semanticMatching, apiKeyRef: e.target.value || null },
                })
              }
            />
          </div>
          <div className="field">
            <label>Model</label>
            <input
              type="text"
              placeholder="gpt-4o-mini"
              value={s.semanticMatching.model}
              onChange={(e) =>
                void patchSettings({
                  semanticMatching: { ...s.semanticMatching, model: e.target.value },
                })
              }
            />
          </div>
          {!s.semanticMatching.apiKeyRef && (
            <div className="warn">
              Without an API key, matching stays fully local (lexical) — the judge never runs.
            </div>
          )}
        </div>
      )}

      <h3>LLM-first filling (beta)</h3>
      <div className="note">
        The inversion: after the normal (deterministic) pass, <strong>one</strong> Claude call
        plans everything left on the page — questionnaires, EEO placement from your stored
        answers, dropdowns — and the guarded executor fills it. At most one repair round per
        page. Privacy: the unresolved questions with their options, your profile facts, your
        stored EEO answers (placement only), and relevant saved answers are sent to
        api.anthropic.com using your own key, stored only on this device. Your account
        password never leaves this device. FlashFiller still never submits anything.
      </div>
      <div className="field">
        <label>Fill mode</label>
        <select
          value={s.fillMode}
          onChange={(e) =>
            void patchSettings({ fillMode: e.target.value === 'llm-first' ? 'llm-first' : 'assisted' })
          }
        >
          <option value="assisted">Assisted (default) — deterministic + per-field AI pokes</option>
          <option value="llm-first">LLM-first — deterministic pass, then one Claude plan</option>
        </select>
      </div>
      {s.fillMode === 'llm-first' && (
        <div>
          <div className="field">
            <label>Anthropic API key (stored locally, sent only to api.anthropic.com)</label>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={s.planner.apiKeyRef ?? ''}
              onChange={(e) =>
                void patchSettings({
                  planner: { ...s.planner, apiKeyRef: e.target.value || null },
                })
              }
            />
          </div>
          <div className="field">
            <label>Model</label>
            <input
              type="text"
              placeholder="claude-haiku-4-5"
              value={s.planner.model}
              onChange={(e) =>
                void patchSettings({ planner: { ...s.planner, model: e.target.value } })
              }
            />
          </div>
          {!s.planner.apiKeyRef && (
            <div className="warn">
              Without an Anthropic key the planner never runs — filling stays exactly as in
              assisted mode.
            </div>
          )}
        </div>
      )}

      <h3>Your data</h3>
      <p className="muted">
        Everything lives in this browser’s local extension storage. Export from the Answers
        tab any time.
      </p>
      <button
        className="btn danger"
        onClick={() => {
          if (
            confirm(
              'Delete ALL FlashFiller data — profile, answers, settings? This cannot be undone. (Consider exporting first.)',
            )
          )
            void deleteAllData()
        }}
      >
        Delete all my data
      </button>
    </div>
  )
}
