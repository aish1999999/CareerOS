# FlashFiller Roadmap

Working backlog — reorder freely. ✅ done · ⏳ shipped, needs live verification · ◻ not started.

## Now (verify / polish what shipped)

- ⏳ **Application log (SHIPPED 2026-09-07, Stage 6 — verify live, `docs/plans/Stage6_applications.MD`):** the Tailor tab gains an **Application** panel (`lib/applications.ts`, `ui/components/ApplicationPanel.tsx`): approve → `drafted` with the résumé / cover-letter `documents` ids; opening the popup on the application page after Validate → `filled` with `fill_stats` from the validator's own ledger (`flashfiller_validation_v1`); **I submitted** → `submitted_at` at the press, never inferred; a status picker for the funnel. One `applications` row per job per surface through the outbox (the hub's upsert key; migration `0003`). The page capture now survives a popup reopen (`flashfiller_tailor_session_v1`, twelve hours, the same application site — the company's hosts or its ATS tenant — never a page carrying another posting's id). Nothing under `content/` changed.

- ⏳ **v7 full mode + edits on v7 drafts (SHIPPED 2026-09-07, Stage 5b — verify live, `docs/plans/Stage5b_v7_full.MD`):** the v7 preset picker gains `full · rephrase with the Sonnet writer` and `full · Haiku writer` (≈ $0.06 / $0.035; `TailorPreset.mode` persists, `mode` rides on the request); a v7 draft's review edits now finalize natively (a too-long edit is refused with the measure, as v6). Full mode's reverts are in the run dir, not on the page yet.

- ⏳ **v7 in the Tailor tab + model presets (SHIPPED 2026-09-07, Stage 5a — verify live, `docs/plans/Stage5a_engines.MD`):** engine picker v6 / v7 skills-only (v5 retired; a stored v5 → v6), a Models preset per engine (v6: Sonnet / Haiku extractor / all Haiku; v7: Haiku / Sonnet extractor) with the estimate on the Generate button and the confirm, the lens picker marks families with a master (`hasMaster`), readiness is three-way (`v7Ready`), the capture's `jobId` rides into the request and `documentId` comes back on finalize (`lib/tailor.ts`, `TailorTab.tsx`, `lib/hub.ts` `FlushReport.rows`). v7 review edits are refused until 5b — approve as generated, or run v6.

- ⏳ **Job capture → `jobs` (SHIPPED 2026-09-06, Stage 4 part 2 — verify live, `docs/plans/Stage4_capture.MD`):** Read this page now also records the posting through the hub outbox (`lib/job-capture.ts`, `content/adapters/postings/`), classified LinkedIn / ATS / company site, on the mapper's dedupe key; Preflight / Generate record the form; **Company is required** in the Tailor tab (`404: Company not found in preflight`). Never on page open (D13).

- ⏳ **Validate + AI Fill pill buttons (SHIPPED 2026-07-21, verify live):** Validate = on-demand read-only census (chips + toast + structured-notes report: question/options/kind/expected/actual/verdict per field; in-memory for the live pass + durable copy under `flashfiller_validation_v1`, capped 5 pages). AI Fill = fills ONLY still-empty fields from that report via the OpenAI judge (stored-answer misses retry judge-only; unanswered fields infer; capped 15/click; auto re-validates after). User decisions: text notes not screenshots; 'wrong' fields NEVER overwritten by AI (warning chip only). Hard-excluded from AI: EEO/consent/file/password. Decline-cache eviction on button press (judge "no"s get a fresh roll); adversarial review 2026-07-21 fixed: fresh-detection identity pairing, mid-pass emptiness re-check, validation-oracle merge (wizard-step poisoning), radio "on"-value polarity flip (also in matcher inference), dismissed-pill resurrection, double-enqueue billing
- ⏳ **Cross-site answering suite (SHIPPED 2026-07-14, verify live):** 114-seed catalog + 58 pre-answered import entries (docs/AdditionalQuestions.MD); numeric-range option matching (travel %, age brackets); ordered fallback answers (F-1↔OPT, IE→Engineering); notify chips (locations/interview availability/references/current salary/vaccination); "worked at ‹company›" brand-agnostic getter; earliest-start-date kind-aware getter; X-years-experience getter; consent auto-fill from curated answers (full-autonomy mode 2026-07-14: review gate removed everywhere — captures active, needs_review fills, generated text fills); OpenAI judge backup (drift matching, option inference incl. fill-time for custom dropdowns, free-text drafting → fills directly) with session cache + learning loop (drift→alias, inferred→active entry tagged ai-inferred)
- ⏳ **Account creation (SHIPPED 2026-07-15, verify live):** password inputs detected (kind 'password', never skipped, never captured, masked in chips/debug); auth-context stamping (password input in same form / small auth page) switches email+username fields to the dedicated ACCOUNT email; profile gained accountEmail/accountPassword (Profile tab → "ATS account credentials"; shipped in the import file). FlashFiller fills the signup form — the user clicks Create Account (never auto-submits).
- ◻ **ONE-TIME USER ACTION:** Options → import `flashfiller-profile-import.local.json` (brings the 58 curated answers + profile updates); enter OpenAI key in Settings → Semantic matching to enable the judge

- ◻ **BUG (first up):** newly added answers save but don't fill on re-test. Stale-matches cause fixed 2026-07-13 (store changes now trigger rescan on open tabs); still to check: needs_review quarantine vs Training-tab status, seed aliases carried into entries, lexical scoring on sentence-length labels vs short stored questions

- ⏳ Verify on live Workday: education-section fills (school/degree/field/dates must come from education entries, work sections from work history)
- ⏳ Verify: hierarchical "How did you hear about us?" → Website → company-domain leaf auto-pick
- ⏳ **Hierarchical cascade judge (SHIPPED 2026-07-16, verify live):** "How did you hear" trees where the stored answer matches no category/sub-option text — every expandable branch is harvested (cap 8) and ONE OpenAI call (`SEMANTIC_CASCADE`) picks the primary + sub-option combination; inference (no stored answer) now explores hierarchies too when the judge is configured; validated replies only (in-range, non-placeholder), decline → honest chip
- ⏳ Verify: multi-select checkbox groups on a real form
- ⏳ Verify: suggestion chips reposition correctly while scrolling Workday's inner container
- ✅ 2026-07-14: the 15 Training-tab questions AND "How did you hear" → Website now ship pre-answered in the import file — superseded by the import step above

## Trusted-input fallback tier (SHIPPED 2026-07-13 — verify live)

"Playwright inside the extension": Playwright itself is Node-only and can't run in an extension, but its power — trusted input events — comes from CDP, which extensions reach via `chrome.debugger`. Escalation chain per dropdown: synthetic pointer clicks → keyboard protocol → **real CDP click** (service worker attaches debugger, dispatches `Input.dispatchMouseEvent` at the element's coordinates; `isTrusted: true`, indistinguishable from a human) → honest failure chip.

- ✅ `debugger` permission, SW `TRUSTED_CLICK` handler (attach reuse + 4s idle detach), content-side coordinate provider (top-frame only), `trustedSelect` escalation in fillCustomDropdown
- ◻ Verify live on a stubborn widget. Caveats: Chrome shows a "FlashFiller started debugging this browser" infobar while attached (auto-detaches ~4 s after the last trusted click); the tier can't attach while DevTools is open on that tab — it falls back to the failure chip, so close DevTools when testing it
- ◻ Consider trusted-tier escalation for other stubborn widget kinds (date segments, checkboxes) if live use shows the need

## Playwright dev-harness (SHIPPED 2026-07-14)

`node scripts/harness.mjs <url> [--headed] [--keep-open <secs>]` — loads dist/ into Chromium (channel 'chromium' for headless extensions), seeds the store from flashfiller-profile-import.local.json + enables the target host, triggers autofill via the `window.__flashfillerAutofill` isolated-world hook (through the SW), prints [FlashFiller] console lines + per-field values, screenshots to docs/harness-last-run.png. Validated on the Greenhouse fixture (6/6 filled, honeypot untouched). NEVER clicks Submit. Caveat: the chrome.debugger trusted tier can't attach while Playwright's CDP is connected — tiers 1–2 only under harness.

## Next (coverage & robustness)

- ◻ Export/backup habit: Options → export store JSON after good capture sessions (chrome.storage is the only copy of trained answers)
- ◻ Seed more questions as real forms surface gaps (capture → approve loop also covers this organically)
- ◻ Live pass on the other ATS adapters: Greenhouse, Lever, iCIMS, SuccessFactors (Grifols), SmartRecruiters — same verification checklist as Workday
- ◻ Workday "Add Another" education/work blocks: confirm rotation when blocks are added mid-session (rescan counter logic shipped, untested on Add-flows)
- ◻ Dependent sub-fields beyond hierarchical dropdowns (e.g., "Other — please specify" text inputs that appear after a selection)

## Learned-answer rebuild (SHIPPED 2026-07-16 — schema v6)

Scope change, user-directed: supersedes the 2026-07-14 "no review gate" decision for LEARNED entries only.

- ✅ Review gate restored for captured/inferred entries: save as needs_review, suggest-only; chip Accept = approve; ReviewTab shows source badge / evidence note / offered options / siteScope with "make universal"
- ✅ Feedback loop: validation ok → graduation counter (3 clean fills = trusted, normal thresholds); wrong → strike, second wrong → auto-demote with evidence note; curated entries exempt; `patchQA` closes the merge/approve write race
- ✅ Capture hygiene (`prepareCaptureValue`): identifier/section question keys skip; dates → canonical ISO with DD/MM detection + profile-date disambiguation (ambiguous → honest skip); placeholder/"2 selected" noise skips; branded answers siteScope-pinned instead of blocked; radio coded values (opt_4837) refuse to learn
- ✅ Label-resolution cascade (detector): all sources harvested + scored (boilerplate labels lose to real sibling questions; table headers; solo-container div-soup reader; over-long text salvage), runner-ups → capture aliases; option-text mini-cascade shared by detect/fill/validate; `questionSource` provenance on every signal
- ✅ Qualifier guard: "current vs desired / start vs end / min vs max" question pairs never bridge, whatever the score — applies to all tier-2 sources
- ✅ Semantic layer (opt-in, key-gated like the judge): local 256-d embedding cache; paraphrase questions clear with margin; option placement tier before the LLM judge; validated bridges distill into aliases + auto option-equivalence sets
- ✅ 62 new tests (learning-rebuild, cascade, migration-v6) — suite at 407

## Oracle Recruiting Cloud support (SHIPPED 2026-07-16/17 — schema v8)

Scope change, user-directed: FlashFiller sat dormant on the Cummins apply flow
(fa-espx-saasfaprod1.fa.ocs.oraclecloud.com) — Oracle was never a supported ATS.

- ✅ `oraclecloud.com` default-enabled (suffix covers all tenant pods) + v7→v8 migration unions it into the existing store
- ✅ `oracle` site adapter: multi-step flag, role/context extraction, Oracle JET listbox option selector (`.oj-listbox-result`, superset of the generic default)
- ✅ cx-select comboboxes (harness + bundle-source diagnosis): grid-popup option selector, companion toggle-button suppression, radiogroup aria-labelledby questions, EEO races?/racial + terse EEO seed aliases
- ✅ Pill groups (user DOM analysis, src/content/overlay/oracle.md): `<button aria-pressed>` questionnaire answers with ZERO native inputs detect as radio-kind fields (pillEls), fill by click + aria-pressed verification (trusted-click escalation), validate reads the pressed pill
- ◻ Live pass on a real Oracle application (email OTP gates each draft — user must sign in)

## Resume / document upload (SHIPPED 2026-07-17 — plan: ResumeFeature.MD)

Scope change, user-directed: supersedes the "file uploads untouched" hard limit.
Store once (Options → Documents), attach everywhere, validate honestly, never submit.

- ✅ Document store `lib/documents.ts`: own storage key `flashfiller_documents_v1` (base64 stays out of the zod-parsed main store), `unlimitedStorage` permission, kind/personas/default-star metadata, pure `pickDocument` matching brain
- ✅ Documents tab (popup + options): upload, kind selector, default star, persona pins, >4MB warning; `autoAttachDocuments` toggle in Settings (default ON; off = suggest chips)
- ✅ Detection: hidden `input[type=file]` rescued (hidden-ness is normal uploader styling; off-screen-position honeypot veto kept), upload-zone association (`uploadZoneEl`) + zone-derived labels, `docCue` resume/coverLetter/other (accent-tolerant), `accept` on the signal; "Select files" trigger buttons no longer double-detect as placeholder dropdowns
- ✅ Matching: file fields route to `pickDocument` (kind cue / accept filter / persona / default / recency) → `source: document:<id>` at 0.92; cover-letter zones never get the resume; honest null → flag chip
- ✅ Fill: `fillFileUpload` — File + DataTransfer → `input.files` + input/change, verify, else synthetic dragenter/dragover/drop on the zone, re-verify (input.files OR zone filename chip), else honest failed; documents attach FIRST in the fill order (Workday parse-my-resume overwrite mitigation)
- ✅ Validation: real file verdicts (ok / wrong / missing-answerable) via `input.files` or the shared `uploadZoneFilename` zone reader; verifies page hand-off, not the site's server upload
- ✅ 33 new tests (documents, file-upload; DataTransfer/DragEvent shim in tests/setup.ts) — suite at 590
- ◻ Live pass per ATS (Workday attachments step, Greenhouse, Lever) — checklist in docs/testing-checklist.md
- ◻ CDP `DOM.setFileInputFiles` escalation explicitly OUT of scope (needs a real temp file path extensions can't write)

## Later (bigger lifts)

- ◻ Canonical fact schema for EEO/demographics (answer combined vs split race/ethnicity questions from one stored fact) + template-question entity slots ("have you worked for {company}" → employer-list rule, suggest-first)
- ◻ Embedding-assisted Tier-2 scoring for ALL sources (currently: bar assist + option placement; scorer plug-in point exists in `lib/scorers/`)
- ◻ Per-application run report (what filled/suggested/skipped, exportable) beyond the toast
- ◻ Firefox port
- ◻ Toolbar icon PNGs + store-submission packaging (only if ever distributing)

## Done highlights (see memory changelog for full detail)

- ✅ Workday segmented MM/YYYY date widgets (typing simulation, focus-following, validation clears)
- ✅ Repeated work-experience sections fill from the right entries (DOM-order section ranking)
- ✅ Profile dates canonicalized to month pickers (schema v5 migration)
- ✅ Sentence-label matching scopes (no more "…to…" → end-date hijacks)
- ✅ Workday questionnaire dropdowns end-to-end (placeholder aria-label fix + chrome exclusion + pointer clicks + keyboard fallback + honest failure chips)
- ✅ Checkbox groups, hierarchical dropdowns, page-branded sub-options, 71-question seed catalog

## 2026-08-19 — Tailor tab: on-demand cover letter (user-directed)

Supersedes the "generated cover letters (out of scope v1)" note for the TAILOR
TAB only: after a run completes, a separate "Generate cover letter" button
(POST /tailor/{jobId}/coverletter, ~$0.05) writes a letter from that run's
thinking-trace analysis (contract v1.2.0). The letter is review material —
shown, copied, downloaded, or explicitly saved to Documents (kind coverLetter,
so pickDocument only ever offers it to cover-letter upload zones). Autofill
still NEVER generates or attaches a letter on its own; content/ is untouched.

## 2026-08-22 — Stage 1 of LLM-first filling (user-directed; spec: docs/llm-first-filling-plan.md)

Foundations shipped ahead of the LLM planner: (1) combobox signals widened +
fill-time reroute — a text-classified input carrying combobox attributes now
takes the open→select→verify dropdown path, never raw typing; (2) virtualized
catalog scroll tier — country/state lists jump by alphabetical rank then steer;
(3) capture hygiene v2 — option-text-mashed labels cleaned (the gender-leak
shape), questionnaire numbering stripped, bare widget words refused,
boundary-tolerant EEO guard, company-specific questions siteScope-pinned;
(4) store migration v9 scrubs the poisoned/duplicate/whitespace entries (also
applied to re-imported old exports); (5) graduation fix — chip Accepts credit
okCount; (6) exports redact the OpenAI API key; (7)
flashfiller-profile-complete.local.json completes workHistory to all four
employers (import it via Options → Answers → Import).

## Stage 2 — LLM-first filling (2026-08-22)

- ONE Claude Haiku (`claude-haiku-4-5`) planner call per page replaces per-field judge pokes, behind `fillMode: llm-first` (Options → Settings → LLM-first filling; default stays `assisted` = pre-Stage-2 behavior).
- New `src/lib/planner.ts` (pure): field census + brief assembly (allow-listed profile facts — accountPassword never leaves), life-state derivation, stance table (military/government/social-security-income/non-compete/bondable → No), plan JSON parsing, §5 guardrails in code (mandatory source tracing, EEO stored-values-only with word-boundary matching, current-employer → "N/A" while unemployed, option membership, 0.8 confidence floor → suggest), plan→MatchResult mapping into the existing fill engine, one repair round with evidence.
- Service worker owns the single Anthropic call (`PLANNER_PLAN`, temperature 0, browser-access header). Manifest v0.8.0. SCHEMA_VERSION 10 (v9→v10 adds planner settings); exports now blank the Anthropic key alongside the OpenAI one; import preserves live keys.
- Flow: Autofill runs the deterministic pass → residue auto-queues one plan → guarded execution → chips for suggests/needs-human/blocked. AI Fill button re-runs the planner in llm-first mode.
- Verified in cloud: 751/751 vitest (44 new in `tests/stage2-planner.test.ts`), tsc clean. `.prestage2` backups beside every replaced file.
- Stage 3 (later): distill planner picks into option-equivalence sets / captures at scale, then default-on after validation across Workday, Greenhouse, Oracle CX, iCIMS, SuccessFactors.

### Stage 2.5 — the inference lane (2026-08-22, same day)

User feedback on first Stage-2 contact: "the current AI fill is just like before — additional questions completely unrelated to the stored json must be answered by intelligent understanding" (test target: eaton.eightfold.ai). Three changes:
- **`source: "inference"`** — the planner may now DERIVE answers (years-with-a-skill from work history, tooling from descriptions, how-did-you-hear, logistics consistent with stated preferences, ratings grounded in history + the JD). Guardrails: mandatory one-line reasoning (missing → rejected), 0.85 confidence floor to fill silently (below → Accept chip; omitted confidence never defaults past it), stances/current-employer/option-membership/EEO-block all still bind, essays stay suggest-only, credentials/legal history stay needs_human. Inferred fills learn (provenance 'inferred') so next site answers offline.
- **Brief upgrades**: work-history descriptions ride trimmed (320 chars); a JD excerpt harvested from the page (JSON-LD JobPosting → main content, 1600 chars) grounds inference + drafts.
- **Eightfold**: `eightfold.ai` joins DEFAULT_ENABLED_DOMAINS (v10→v11 migration unions it into existing stores). Manifest 0.8.1; planner-mode button now reads "Plan Fill (n)" so the new engine is visibly not the old AI Fill.
- Verified: 762/762 vitest (55 in stage2-planner), tsc clean. `.prestage25` backups beside every replaced file.
