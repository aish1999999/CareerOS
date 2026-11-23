# FlashFiller Stage 2 — LLM-first filling (Claude Haiku planner)

*Built + verified in the cloud 2026-08-22 · full suite 751/751 green (44 new Stage-2 tests) · tsc clean.*
*Planner model: `claude-haiku-4-5` (Anthropic's latest Haiku — fastest, cheapest tier). Default fill mode stays `assisted`; nothing changes until you switch it on.*

## What shipped

**The inversion (plan §4), behind `Settings → LLM-first filling`:**
deterministic pass → everything left is packaged into ONE structured brief →
one Claude Haiku call returns a fill plan → code validates every entry against
the §5 guardrails → the existing widget-correct engine executes → validation
→ at most ONE repair round with evidence → honest chips for the residue.
Never submits. Never overwrites. EEO placement only from stored values.

## Files

| File | Change |
|---|---|
| `src/lib/planner.ts` | **NEW** — census/brief assembly, stance table, plan parser, §5 guardrail validation, plan→MatchResult mapping, repair evidence, prompts. Pure; 44 tests. |
| `tests/stage2-planner.test.ts` | **NEW** — the guardrail battery (gender can never flip, disability "No" lands on CC-305 long forms, military always No, unemployed → "N/A", invented values die, option membership, confidence floor, migration, key redaction). |
| `src/types.ts` | fillMode/planner settings, census/brief/plan wire types, `PLANNER_PLAN` message. |
| `src/lib/schema.ts` | SCHEMA_VERSION 10, `DEFAULT_PLANNER_MODEL = 'claude-haiku-4-5'`, settings schema. |
| `src/lib/storage.ts` | v9→v10 migration, import preserves the live Anthropic key, `redactForExport` (blanks BOTH api keys). |
| `src/background/service-worker.ts` | The single Anthropic call (`PLANNER_PLAN` handler): user's own key, `anthropic-dangerous-direct-browser-access` header, temperature 0. |
| `src/content/index.ts` | `runPlanFill` pass (census → plan → guarded execution → repair), auto-queues after Autofill in llm-first mode, AI Fill button routes to the planner. |
| `src/content/overlay/overlay.ts` | Badge button planner mode (label/tooltips). |
| `src/ui/components/SettingsTab.tsx` | "LLM-first filling (beta)" section: fill mode, Anthropic key, model, privacy note. |
| `src/ui/components/AnswersTab.tsx` | Export goes through `redactForExport`. |
| `manifest.config.ts` | v0.8.0 — chrome://extensions shows whether the rebuild actually loaded. |

## Guardrails (code-enforced — the model only proposes)

1. Every fill must cite a source (`profile:<path>` / `qa:<id>` / `eeo:<key>` / `stance:<topic>` / `policy:current-employer` / `context:*` / `draft`) and the value must actually trace to it — invented values are rejected before any DOM write.
2. EEO fields: stored values only, mapped onto same-meaning option wordings ("Asian (Not Hispanic or Latino)" ≡ stored "Asian"; CC-305 long-form "No…" ≡ stored "No"). Word-boundary matching — "Female" can never match stored "Male". Nothing stored → honest chip.
3. Stance table (all No, as you decided): military/veteran service, government employment, social-security income, non-compete, bondable — binds whatever source the model cites.
4. Unemployed → current/present-employer fields get exactly "N/A"; work-history sections keep real history.
5. Essays/drafts and sub-0.8-confidence fills demote to suggestion chips (Accept fills them).
6. Consent boxes, files, passwords: never the planner's. Submission: always yours.
7. Brief privacy: profile facts are allow-listed — `accountPassword` (and pronouns/EEO outside the placement-only block) never leave the device; exports now blank the Anthropic key too.

## To activate after the files land

1. Rebuild + reload the extension (chrome://extensions should show **0.8.0**), reload the tab.
2. Options → Settings → **LLM-first filling** → mode "LLM-first", paste your **Anthropic API key** (`sk-ant-…`). Model defaults to `claude-haiku-4-5`.
3. Fill a page: Autofill runs the normal pass, then the planner automatically takes the leftovers (badge shows "Planning…", then a `Planner: X filled…` toast). The AI Fill button re-runs the planner on demand.
4. Watch the page console for `[FlashFiller] planner brief / plan validated / repair round` breadcrumbs — that's the evidence trail for scoring the fixes.

Still pending from before: import `flashfiller-profile-complete.local.json` (all 4 employers), and rotate the OpenAI key that leaked in the Aug 21 export.

## Cost

One plan call (+ at most one repair) per page at Haiku pricing ($1/MTok in, $5/MTok out) ≈ a cent or less per application page.
