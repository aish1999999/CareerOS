import type {
  FieldKind,
  MatchResult,
  Message,
  PageContext,
  PlanRepairPayload,
  PlannerBrief,
  PlannerCandidate,
  QAEntry,
  ScanReport,
  SeedQuestion,
  SignalBundle,
  StoreData,
} from '@/types'
import { getStore, onStoreChanged, patchQA, upsertQA } from '@/lib/storage'
import { enabledForPage, getAdapter } from '@/content/adapters/index'
import { classifyIntent } from '@/lib/intent'
import { SeedCatalogSchema } from '@/lib/schema'
import { detectFields, type DetectedField } from '@/content/detector'
import { extractPageContext } from '@/content/context'
import {
  buildFactSheet,
  inferPersona,
  isIdentityLabel,
  matchAll,
  setSemanticAnswerer,
  recordOptionEquivalence,
  setSemanticCascader,
  setSemanticChooser,
  setSemanticQuestionMatcher,
  setSemanticSimilarity,
  setSemanticTextAnswerer,
  type MatcherContext,
} from '@/content/matcher'
import {
  inferDropdownMatch,
  inferOptionMatch,
  inferTextMatch,
  judgeRetryMatch,
  selectAiFillTargets,
} from '@/content/ai-fill'
import {
  STANCES,
  buildEeoStored,
  buildProfileFacts,
  buildRepairItems,
  censusEntry,
  deriveLifeState,
  eeoStoredAnswerFor,
  extractPlanJson,
  neighborLabels,
  planEntryToMatch,
  selectPlanTargets,
  selectRelevantQA,
  validatePlan,
  type PlanDecision,
} from '@/lib/planner'
import { saveValidationReport } from '@/lib/validation-report'
import { createJudgeCache } from '@/content/judge-cache'
import { prefetchEmbeddings, semanticSimilarity } from '@/lib/embed-cache'
import {
  base64ToBytes,
  getDocument,
  listDocumentMeta,
  type DocumentMeta,
} from '@/lib/documents'
import { canonicalAnswer } from '@/lib/normalize'
import { lexicalAnswerScore } from '@/lib/scorers/lexical'
import { newId, upsertOptionSet } from '@/lib/storage'
import { resolveVariables } from '@/content/variables'
import { fillField } from '@/content/autofill'
import {
  readActualValue,
  summarizeValidation,
  validateFields,
  type FieldValidation,
} from '@/content/validate'
import {
  buildCaptureDraft,
  buildInferredEntry,
  findSimilar,
  isContextBranded,
  isSkippedCapture,
  mergeAsAlias,
  prepareCaptureValue,
  shouldSilentMerge,
  wrongVerdictAction,
} from '@/content/capture'
import { crossesEeoTopic, looksEeoLoose } from '@/lib/eeo'
import { Overlay, type BadgeAiFill } from '@/content/overlay/overlay'

// ---------------------------------------------------------------------------
// Content-script bootstrap (Sections 4, 12, 14). Transparent injection: the
// script stays dormant unless the domain is user-enabled or the user asks for
// a scan from the popup. It only ever FILLS after an explicit user action
// (Autofill button / Accept chip). Never submits anything.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __flashfillerActive?: boolean
    /** Read by the service worker (executeScript func) to aggregate scan
     *  counts across frames; awaits an in-flight scan before reporting. */
    __flashfillerScanReport?: () => Promise<ScanReport | null>
    /** Test-harness hook (Playwright via SW executeScript): activate, scan,
     *  autofill, and report — the programmatic Autofill button. */
    __flashfillerAutofill?: () => Promise<{ filled: number; suggested: number } | null>
    /** Harness observability: the extension's own view of the last scan —
     *  per-field signals and match decisions. */
    __flashfillerDebug?: () => {
      signals: Array<Record<string, unknown>>
      matches: Array<Record<string, unknown>>
    } | null
    /** Validation layer on demand: fresh read-only comparison of the page's
     *  actual state vs expected answers — the bug-report table. */
    __flashfillerValidate?: () => Array<Record<string, unknown>> | null
  }
}

// Meaning-level matching via the user-configured OpenAI judge in the
// service worker; unconfigured (no key) → null → callers stay lexical.
// Session-cached (nulls too): MutationObserver rescans re-run matchAll
// constantly, and each judge call is a billed API request.
const judgeCache = createJudgeCache((message) => chrome.runtime.sendMessage(message))
const askCached = <T,>(message: Message, read: (r: unknown) => T | null): Promise<T | null> =>
  judgeCache.ask(message, read)
const askJudge = (message: Message): Promise<number | null> =>
  askCached(message, (r) => (r as { index?: number | null }).index ?? null)
const askJudgeText = (message: Message): Promise<string | null> =>
  askCached(message, (r) => (r as { text?: string | null }).text ?? null)

if (window.__flashfillerActive) {
  // Already injected (manifest + popup executeScript can overlap)
} else {
  window.__flashfillerActive = true
  setSemanticChooser((answer, options) => askJudge({ type: 'SEMANTIC_CHOOSE', answer, options }))
  setSemanticQuestionMatcher((question, candidates) =>
    askJudge({ type: 'SEMANTIC_MATCH_QUESTION', question, candidates }),
  )
  setSemanticAnswerer((question, options, facts) =>
    askJudge({ type: 'SEMANTIC_ANSWER', question, options, facts }),
  )
  setSemanticCascader((question, answer, facts, categories) =>
    askCached({ type: 'SEMANTIC_CASCADE', question, answer, facts, categories }, (r) =>
      (r as { path?: { category: number; option: number } | null }).path ?? null,
    ),
  )
  setSemanticTextAnswerer((question, facts, kind) =>
    askJudgeText({ type: 'SEMANTIC_TEXT', question, facts, kind }),
  )
  // Local embedding cache (Phase 2): same opt-in gate as the judge — no key,
  // no network, callers stay lexical. Vectors persist locally, so cross-site
  // wording drift gets cheaper to bridge every session.
  setSemanticSimilarity(semanticSimilarity)
  main()
}

/** Displayed text of a custom (div-based) dropdown — value for input-backed
 *  comboboxes, else aria-valuetext, else visible text. */
function dropdownDisplayText(el: HTMLElement): string {
  const value = (el as HTMLInputElement).value
  if (typeof value === 'string' && value.trim()) return value.trim()
  const aria = el.getAttribute('aria-valuetext')
  if (aria?.trim()) return aria.trim()
  return el.textContent?.trim() ?? ''
}

/** Session-answer key: repeated sections ask the same question ("Company")
 *  several times with different answers — scope the cache per block so
 *  section 2 never inherits section 1's answer (Section 14). */
function answerKey(signal: SignalBundle): string {
  return signal.sectionIndex === undefined
    ? signal.normalizedQuestion
    : `${signal.normalizedQuestion}#${signal.sectionIndex}`
}

function main() {
  const state = {
    store: null as StoreData | null,
    seeds: [] as SeedQuestion[],
    context: { company: null, role: null, location: null, source: 'none' } as PageContext,
    fields: new Map<string, DetectedField>(),
    matches: new Map<string, MatchResult>(),
    /** Per-application-session variable answers (Section 7) — memory only. */
    sessionVars: new Map<string, string>(),
    /** Answered signatures for consistency across wizard steps (Section 14).
     *  The producing field's KIND rides along: a cached date must never
     *  replay into a text field that merely shares the question key ("From"
     *  label leaking onto an address input — live bug 2026-07-15). */
    sessionAnswers: new Map<string, { value: string; kind: FieldKind }>(),
    skipped: new Set<string>(),
    capturePrompted: new Set<string>(),
    /** Fields FlashFiller itself filled — never capture our own fills. */
    selfFilled: new Set<string>(),
    /** Matcher context of the last scan — fact sheets for fill-time inference. */
    matcherCtx: null as MatcherContext | null,
    /** Stored document metadata (resume/cover letter) — bytes stay in
     *  storage until a fill actually needs them. */
    documents: [] as DocumentMeta[],
    /** answerKeys already persisted by the learning loop this session —
     *  rescans/refills must not duplicate entries. */
    persistedLearnings: new Set<string>(),
    /** What each fill ACTUALLY placed (fieldId → text) — the validation
     *  layer's expected values (judge-picked dropdown options live only here). */
    filledValues: new Map<string, string>(),
    /** The match set of the last autofill run — validation's oracle (the
     *  live matches map loses filled fields on rescan). */
    lastFillMatches: null as Map<string, MatchResult> | null,
    /** Last validation pass (post-fill or Validate button) — the AI Fill
     *  pass's input. Carries its own match snapshot: matches for filled
     *  fields exist nowhere else after a rescan. A durable copy also goes to
     *  storage (validation-report.ts); fieldIds only mean anything in THIS
     *  page instance, so the live pass reads memory. */
    lastValidationReport: null as {
      at: number
      report: FieldValidation[]
      matches: Map<string, MatchResult>
    } | null,
    /** AI Fill pass in flight — re-entry guard + badge busy state. */
    aiFillBusy: false,
    /** AI Fill queued but not started (the fill queue may be busy for many
     *  seconds) — a double-click must not queue a second billed pass. */
    aiFillPending: false,
    /** Last displayed text per custom dropdown — externally-set values are
     *  detected by diffing on rescan (no change event to listen to). */
    /** Display text AND question identity per dropdown — the diff must know
     *  when a data-ff-id was recycled into a different widget. */
    dropdownTexts: new Map<string, { text: string; question: string }>(),
    /** Entry ids the user explicitly confirmed this session (chip Accept) —
     *  a validation pass must not immediately re-demote them. */
    userConfirmedEntries: new Set<string>(),
    /** Entry ids that already took ONE feedback action this session (an
     *  ok-tick or a wrong-strike) — rescans must not multiply-count the same
     *  fill's verdict. */
    strickenEntries: new Set<string>(),
    dismissed: false,
    activated: false,
    /** Observers/listeners attached (once) — see activate(). */
    attached: false,
    lastScanReport: null as ScanReport | null,
    scanInFlight: null as Promise<ScanReport | null> | null,
    overlay: null as Overlay | null,
    scanTimer: 0 as ReturnType<typeof setTimeout> | 0,
    /** All fill work (autofill runs, chip Accepts, variable-prompt retries)
     *  chains through here: dropdown fills open popups and poll the live
     *  DOM — two in flight at once cross-match each other's option lists,
     *  and each may hold a semantic-judge call whose pick must land on the
     *  popup it was asked about. */
    fillQueue: Promise.resolve() as Promise<unknown>,
  }

  /** Serialize a fill job behind whatever fill work is already running. */
  function enqueueFill<T>(job: () => Promise<T>): Promise<T> {
    const run = state.fillQueue.then(job, job)
    state.fillQueue = run.then(
      () => undefined,
      () => undefined, // a failed job must not wedge the queue
    )
    return run
  }

  // ---- Activation gating ------------------------------------------------------
  // The script now loads on EVERY http(s) page (and frame). Dormant cost must
  // stay near zero: nothing is observed, patched, or listened to until the
  // site is enabled or the user asks for a scan.

  /** The store loads async; the message listener registers synchronously
   *  before it so a popup scan can never race the load. */
  const storeReady: Promise<StoreData> = getStore().then((store) => {
    state.store = store
    return store
  })

  function activate() {
    state.activated = true
    if (state.attached) return
    state.attached = true
    observeChanges()
    attachCaptureListeners()
  }

  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (message.type === 'PING') {
      // activation state + platform linkage for the popup: a fingerprint-
      // activated vanity page (careers.honeywell.com → oraclecloud.com) has
      // no hostname entry the popup could infer enablement from.
      sendResponse({
        ok: true,
        activated: state.activated,
        platformDomain: getAdapter(location.hostname, document)?.canonicalDomain ?? null,
      })
      return false
    }
    if (message.type === 'SCAN_ACTIVE_TAB') {
      void storeReady.then(async () => {
        activate()
        state.dismissed = false
        const report = await scan(true)
        sendResponse({ ok: true, ...(report ?? {}) })
      })
      return true // async response
    }
    return false
  })

  // Frame-accurate scan counts: tabs.sendMessage only returns ONE frame's
  // response, so the service worker collects per-frame reports via this
  // global instead (executeScript awaits the returned promise).
  window.__flashfillerScanReport = async () => {
    if (state.scanInFlight) await state.scanInFlight.catch(() => null)
    return state.lastScanReport
  }

  window.__flashfillerAutofill = async () => {
    await storeReady
    activate()
    state.dismissed = false
    await awaitWidgetSettle()
    await scan(true)
    const report = await enqueueFill(() => runAutofill())
    // Late hydrators: Oracle CX mounts lower sections/selects SECONDS after
    // the page settles (live NOV: Gender/Veteran appeared as field #27 after
    // the fill pass ended, unfilled forever). One bounded follow-up pass for
    // fields that only appeared afterwards; filled fields skip as always.
    const fieldsBefore = state.fields.size
    await new Promise((resolve) => setTimeout(resolve, 2500))
    await scan(true)
    if (state.fields.size > fieldsBefore) {
      const second = await enqueueFill(() => runAutofill())
      if (report && second) {
        report.filled += second.filled
        report.suggested += second.suggested
      }
    }
    return report
  }

  /** Widget-hydration settle: Oracle CX renders selects as loading skeletons
   *  for the first seconds of a section (.cx-select--loading progressbars) —
   *  a fill pass that scans mid-hydration never even DETECTS those fields
   *  (live NOV miss 2026-07-17: Gender/Veteran/Country skipped as
   *  skeletons). Wait for active skeletons to clear, capped. */
  async function awaitWidgetSettle(maxMs = 4000): Promise<void> {
    const SKELETON = '.cx-select--loading, [role="progressbar"][aria-busy="true"]'
    const deadline = Date.now() + maxMs
    while (Date.now() < deadline) {
      if (!document.querySelector(SKELETON)) return
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  window.__flashfillerDebug = () => {
    if (state.fields.size === 0) return null
    return {
      signals: [...state.fields.values()].map(({ signal, el }) => ({
        fieldId: signal.fieldId,
        kind: signal.kind,
        label: signal.label,
        name: signal.name,
        id: signal.id,
        questionSource: signal.questionSource,
        normalizedQuestion: signal.normalizedQuestion,
        filled: signal.filled,
        optionCount: signal.options.length,
        sectionKind: signal.sectionKind,
        sectionIndex: signal.sectionIndex,
        consentLike: signal.consentLike,
        eeoLike: signal.eeoLike,
        // The two diagnosis blind spots: date widgets (segment labeling) and
        // fields the matcher produced nothing for.
        html:
          signal.kind === 'date' || !state.matches.has(signal.fieldId)
            ? el.outerHTML.slice(0, 700)
            : undefined,
      })),
      matches: [...state.matches.values()].map((m) => ({
        fieldId: m.fieldId,
        action: m.action,
        source: m.source,
        confidence: Math.round(m.confidence * 100) / 100,
        answer:
          state.fields.get(m.fieldId)?.signal.kind === 'password'
            ? '••••••••'
            : m.rawAnswerTemplate.slice(0, 40),
        chosenOptionValue: m.chosenOptionValue,
        provenance: m.provenance,
        inferAtFill: m.inferAtFill,
        notify: m.notify,
      })),
    }
  }

  window.__flashfillerValidate = () => {
    if (state.fields.size === 0) return null
    return runValidation() as unknown as Array<Record<string, unknown>>
  }

  async function init() {
    const store = await storeReady
    onStoreChanged((updated) => {
      state.store = updated
      // Site enabled from the popup toggle / options page while this tab
      // (or frame) sat dormant → wake it without a reload.
      if (
        !state.activated &&
        enabledForPage(
          location.hostname,
          document,
          updated.settings.enabledDomains,
          updated.settings.disabledDomains,
        )
      ) {
        activate()
        void scan()
      } else if (state.activated && !state.dismissed) {
        // Answers added/approved in the Options tabs must reach pages that
        // already scanned — stale matches read as "saved but never fills".
        scheduleRescan(300)
      }
    })
    if (
      enabledForPage(
        location.hostname,
        document,
        store.settings.enabledDomains,
        store.settings.disabledDomains,
      )
    ) {
      activate()
      await scan()
    }
    // else: fully dormant — only SCAN_ACTIVE_TAB or a settings change wakes us.
    // (enabledForPage also wakes vanity-domain platform deployments — e.g.
    // careers.honeywell.com fingerprints as Oracle CX and rides the
    // oraclecloud.com enablement; the check is one querySelector, read-only.)
  }

  // ---- Scanning -----------------------------------------------------------------

  function getOverlay(): Overlay {
    if (!state.overlay) {
      state.overlay = new Overlay({
        onAutofill: () => void enqueueFill(() => runAutofill()),
        // Validate reads through the fill queue so it never judges a page
        // mid-fill; AI Fill is a fill job like any other.
        onValidate: () => void enqueueFill(() => runValidateOnDemand()),
        onAiFill: () => {
          if (state.aiFillBusy || state.aiFillPending) return
          state.aiFillPending = true
          // Stage 2 routing: llm-first mode drives the one-call planner;
          // assisted keeps the per-field judge pokes.
          const pass = state.store?.settings.fillMode === 'llm-first' ? runPlanFill : runAiFill
          void enqueueFill(() => pass()).finally(() => {
            state.aiFillPending = false
          })
        },
        onAccept: (fieldId) => void acceptSuggestion(fieldId),
        onSkip: (fieldId) => {
          state.skipped.add(fieldId)
          state.overlay?.removeChip(fieldId)
        },
        onDismiss: () => {
          state.dismissed = true
          state.overlay = null
        },
      })
    }
    return state.overlay
  }

  /** AI Fill button state for the badge — re-derived from state on every
   *  rebuild. null until a validation report exists (no report, no button). */
  function badgeAiFill(): BadgeAiFill | null {
    if (!state.lastValidationReport) return null
    const settings = state.store?.settings
    if (settings?.fillMode === 'llm-first' && state.store) {
      // Planner targets: EEO fields WITH stored values count (placement-only).
      const eeoStored = buildEeoStored(state.store.profile, state.store.qa)
      const { targets } = selectPlanTargets(state.lastValidationReport.report, (v) =>
        eeoStoredAnswerFor(v.label || v.normalizedQuestion, eeoStored),
      )
      return {
        count: targets.length,
        enabled: !!settings.planner.apiKeyRef,
        busy: state.aiFillBusy,
        mode: 'planner',
      }
    }
    const sem = settings?.semanticMatching
    return {
      count: selectAiFillTargets(state.lastValidationReport.report).targets.length,
      // enabled + key only — `provider` may still be the 'none' default on
      // stores enabled before the toggle force-set it (see getJudgeConfig)
      enabled: !!(sem?.enabled && sem.apiKeyRef),
      busy: state.aiFillBusy,
      mode: 'judge',
    }
  }

  /** Re-render the badge outside a scan (post-validation, AI-pass busy
   *  flips) — same inputs doScan would use. */
  function refreshBadge(): void {
    if (!state.overlay) return
    const actionable = [...state.matches.values()].filter((m) => m.action !== 'ignore').length
    state.overlay.setBadge(actionable, { aiFill: badgeAiFill() })
  }

  /** `explicit` = user-triggered (popup Scan): report a zero-match result
   *  visibly instead of silently showing nothing. */
  function scan(explicit = false): Promise<ScanReport | null> {
    const run = doScan(explicit).finally(() => {
      if (state.scanInFlight === run) state.scanInFlight = null
    })
    state.scanInFlight = run
    return run
  }

  async function doScan(explicit: boolean): Promise<ScanReport | null> {
    if (!state.activated || state.dismissed || !state.store) return null
    const store = state.store

    const detected = detectFields(document)
    state.fields = new Map(detected.map((f) => [f.signal.fieldId, f]))
    state.context = extractPageContext(document)

    if (state.seeds.length === 0) {
      try {
        const res = await fetch(chrome.runtime.getURL('seed-questions.json'))
        state.seeds = SeedCatalogSchema.parse(await res.json()).questions as SeedQuestion[]
      } catch {
        state.seeds = [] // matching still works from the qa store alone
      }
    }

    const activePersona =
      store.settings.activePersona ??
      (store.settings.autoInferPersona
        ? inferPersona(state.context.role, store.settings.personas)
        : null)

    const signals = detected.map((f) => f.signal)

    // Warm the local embedding cache (silent no-op without an API key):
    // this page's questions + the store's questions/aliases, so the semantic
    // checks during matching are pure cache lookups.
    const embedTexts: string[] = detected.map(
      (f) => f.signal.label || f.signal.normalizedQuestion,
    )
    for (const e of store.qa) embedTexts.push(e.question, ...e.aliases)
    void prefetchEmbeddings(embedTexts.filter(Boolean).slice(0, 400))

    // Stored documents ride into matching as metadata only (listDocumentMeta
    // caches; the megabytes of base64 stay in storage until a fill needs them)
    try {
      state.documents = await listDocumentMeta()
    } catch {
      state.documents = []
    }

    state.matcherCtx = {
      profile: store.profile,
      qa: store.qa,
      seeds: state.seeds,
      optionSets: store.optionSets,
      settings: store.settings,
      activePersona,
      pageContext: state.context,
      hostname: location.hostname,
      documents: state.documents,
    }
    state.matches = await matchAll(signals, state.matcherCtx)

    // Wizard-step consistency (Section 14): a question answered on a previous
    // step of this session fills the same way again — but only into the SAME
    // kind of field. A cached "From" date must never land in a text input
    // that merely inherited the same question key (address label leak).
    for (const field of detected) {
      const { signal } = field
      if (signal.filled || state.matches.has(signal.fieldId)) continue
      const cached = state.sessionAnswers.get(answerKey(signal))
      if (cached && cached.kind === signal.kind && !signal.consentLike && signal.kind !== 'file') {
        state.matches.set(signal.fieldId, {
          fieldId: signal.fieldId,
          resolvedAnswer: null,
          rawAnswerTemplate: cached.value,
          confidence: 0.9,
          source: 'profile',
          unresolvedVars: [],
          action: 'autofill',
          needsReview: false,
          composite: false,
        })
      }
    }

    // Custom dropdowns fire no change event when a listbox option is clicked
    // (by the user or an agent) — detect externally-set values by diffing the
    // displayed text across rescans (Section 11).
    for (const field of detected) {
      const { signal } = field
      if (signal.kind !== 'custom-dropdown') continue
      const current = dropdownDisplayText(field.el)
      const previous = state.dropdownTexts.get(signal.fieldId)
      state.dropdownTexts.set(signal.fieldId, {
        text: current,
        question: signal.normalizedQuestion,
      })
      if (previous === undefined || previous.text === current || !current) continue
      // Same data-ff-id, different question: the SPA recycled this DOM node
      // into ANOTHER widget (Workday wizard-step swap) — the text "change"
      // is an identity change, not a user selection. Capturing it would
      // attribute widget B's value to widget A's question (live corruption
      // 2026-07-16: "School or University*" aliased onto the stored
      // disability answer this way).
      if (previous.question !== signal.normalizedQuestion) {
        console.debug(
          '[FlashFiller] capture skipped: widget identity changed',
          `"${previous.question}" → "${signal.normalizedQuestion}"`,
        )
        continue
      }
      const gated = captureGate(signal.fieldId)
      if (gated) promptCapture(gated, current)
    }

    const actionable = [...state.matches.values()].filter((m) => m.action !== 'ignore')
    const report: ScanReport = {
      detected: detected.length,
      matched: actionable.length,
      skippedFilled: detected.filter((f) => f.signal.filled).length,
    }
    state.lastScanReport = report

    // Support/diagnosis breadcrumb: what did the detector see, per kind?
    console.debug(
      '[FlashFiller] scan',
      report,
      detected.reduce<Record<string, number>>((acc, f) => {
        acc[f.signal.kind] = (acc[f.signal.kind] ?? 0) + 1
        return acc
      }, {}),
    )

    const aiFill = badgeAiFill()
    if (actionable.length > 0) getOverlay().setBadge(actionable.length, { aiFill })
    else if (explicit && detected.length > 0) getOverlay().setBadge(0, { explicit: true, aiFill })
    else state.overlay?.setBadge(0, { aiFill })

    // Prune/re-anchor chips whose fields left with the previous wizard step
    state.overlay?.refresh()

    return report
  }

  // ---- Filling --------------------------------------------------------------------

  function resolveMatch(match: MatchResult): { value: string | null; unresolved: string[] } {
    const store = state.store!
    const { text, unresolved } = resolveVariables(match.rawAnswerTemplate, {
      context: state.context,
      profile: store.profile,
      session: state.sessionVars,
    })
    return unresolved.length > 0 ? { value: null, unresolved } : { value: text, unresolved: [] }
  }

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  type FillOneOutcome = 'filled' | 'failed' | 'refused' | 'prompted'

  async function fillOne(
    field: DetectedField,
    match: MatchResult,
    opts: { userInitiated?: boolean } = {},
  ): Promise<FillOneOutcome> {
    const { value, unresolved } = resolveMatch(match)
    if (value === null) {
      // Never fill literal {{braces}} — prompt instead (Section 7), remember
      // the answer for this application session only, then retry the fill.
      const overlay = getOverlay()
      const name = unresolved[0]
      overlay.promptVariable(name, field.el, (provided) => {
        state.sessionVars.set(name, provided)
        void enqueueFill(() => fillOne(field, match, opts))
      })
      return 'prompted'
    }
    // Fact sheet only for deferred dropdown inference — it's the judge's
    // evidence, built against THIS question for relevance
    const factSheet =
      match.inferAtFill && state.matcherCtx
        ? buildFactSheet(state.matcherCtx, field.signal.label || field.signal.normalizedQuestion)
        : null
    // File fields: fetch the stored document's bytes by id at fill time —
    // metadata matched, bytes never rode through the match context. A doc
    // deleted between scan and fill fails honestly (chip).
    let documentPayload: { name: string; mime: string; bytes: Uint8Array } | null = null
    if (field.signal.kind === 'file') {
      if (match.source.startsWith('document:')) {
        const doc = await getDocument(match.source.slice('document:'.length))
        if (doc) documentPayload = { name: doc.name, mime: doc.mime, bytes: base64ToBytes(doc.bytesB64) }
      }
      if (!documentPayload) return 'failed'
    }
    // Fallback answers may be templates too ("{{education.0.degree}}" behind
    // the "degree in field" composite) — resolve them here; ones that stay
    // unresolved are dropped rather than tried literally against options.
    const answerFallbacks = (match.answerFallbacks ?? [])
      .map(
        (f) =>
          resolveVariables(f, {
            context: state.context,
            profile: state.store!.profile,
            session: state.sessionVars,
          }).text,
      )
      .filter((t) => t.trim() !== '' && !/\{\{[\w.\s]+\}\}/.test(t))
    const { outcome, filledText } = await fillField(
      field,
      { ...match, resolvedAnswer: value, answerFallbacks },
      state.store?.optionSets ?? [],
      state.context,
      { userInitiated: opts.userInitiated, factSheet, document: documentPayload },
    )
    if (outcome === 'filled') {
      state.selfFilled.add(match.fieldId) // our own fill — capture must ignore it
      state.sessionAnswers.set(answerKey(field.signal), {
        value: filledText ?? value,
        kind: field.signal.kind,
      })
      state.filledValues.set(match.fieldId, filledText ?? value)
      getOverlay().highlightFilled(field.el)
      getOverlay().removeChip(match.fieldId)
      persistLearning(field.signal, match, filledText ?? value)
    } else {
      // Support/diagnosis breadcrumb — visible in the page console
      console.debug(
        '[FlashFiller] fill outcome',
        outcome,
        field.signal.label || field.signal.normalizedQuestion,
        `(${field.signal.kind})`,
      )
    }
    return outcome
  }

  /** The learning flywheel: a VERIFIED fill that came from the judge is
   *  saved, so the same question on the next site (or next rescan) answers
   *  from the store — no repeat API call, consistent answers everywhere.
   *  Drift hits grow the matched entry's aliases; inferred answers become
   *  new active entries tagged 'ai-inferred' (user decision). */
  function persistLearning(signal: SignalBundle, match: MatchResult, answerText: string) {
    const store = state.store
    if (!store || !match.provenance || !answerText.trim()) return
    // Repeated-section answers (Company, dates…) are entry-specific — a
    // globally-saved one would poison every future block. EEO never learns —
    // and the loose test backs up the word-boundary flag (mashed labels
    // defeated \bgender\b in the live store, Stage 1).
    if (signal.sectionIndex !== undefined || signal.eeoLike) return
    if (looksEeoLoose(signal.label) || looksEeoLoose(signal.normalizedQuestion)) return
    const key = answerKey(signal)
    if (state.persistedLearnings.has(key)) return
    state.persistedLearnings.add(key)

    const wording = signal.label || signal.normalizedQuestion

    if (match.provenance === 'drift' && match.source.startsWith('qa:')) {
      const id = match.source.slice(3)
      const entry = store.qa.find((e) => e.id === id)
      if (!entry) return
      // A drift bridge across the EEO/non-EEO line is a judge mistake, and
      // an alias would make it permanent — never distill those.
      if (crossesEeoTopic(wording, entry.question)) return
      const merged = mergeAsAlias(entry, wording, signal.options.map((o) => o.text))
      if (merged !== entry) void upsertQA(merged) // reference no-op = already known
      return
    }

    if (match.provenance === 'inferred') {
      const similar = findSimilar(store.qa, signal.normalizedQuestion)
      if (similar) {
        // Same answer → the new wording is an alias; a DIFFERENT stored
        // answer is never clobbered by an inference.
        if (similar.entry.answer.trim().toLowerCase() === answerText.trim().toLowerCase()) {
          const merged = mergeAsAlias(similar.entry, wording, signal.options.map((o) => o.text))
          if (merged !== similar.entry) void upsertQA(merged)
        }
        return
      }
      void upsertQA(buildInferredEntry(signal, answerText, state.context))
    }
  }

  function showSuggestionChip(fieldId: string, field: DetectedField, match: MatchResult, meta: string) {
    // Notify matches carry guidance, not an answer — flag chip, no Accept
    if (match.notify) {
      getOverlay().showChip({
        fieldId,
        anchor: field.el,
        title: field.signal.label,
        value: '',
        meta: match.rawAnswerTemplate,
        needsReview: false,
        kind: 'flag',
      })
      return
    }
    const { value } = resolveMatch(match)
    getOverlay().showChip({
      fieldId,
      anchor: field.el,
      title: field.signal.label,
      value:
        field.signal.kind === 'password' ? '••••••••' : value ?? match.rawAnswerTemplate,
      meta,
      needsReview: match.needsReview,
      kind: 'suggestion',
    })
  }

  /** React sites (Phenom…) re-mount form subtrees between scan and fill,
   *  detaching scanned elements — silently skipping them made "matched but
   *  never fills". Re-resolve the field to its live twin by question+kind. */
  function refreshField(field: DetectedField): DetectedField | null {
    if (field.el.isConnected) return field
    const fresh = detectFields(document)
    return (
      fresh.find(
        (f) =>
          f.signal.normalizedQuestion === field.signal.normalizedQuestion &&
          f.signal.kind === field.signal.kind &&
          !f.signal.filled,
      ) ?? null
    )
  }

  async function runAutofill(): Promise<{ filled: number; suggested: number } | null> {
    if (!state.store) return null
    const overlay = getOverlay()
    let filled = 0
    let suggested = 0
    const attempted = new Set<string>()
    // Validation judges against THIS run's matches: the dependent-field
    // rescan below replaces state.matches, and filled fields don't re-match
    // (they're skipped), so the live map goes empty right when the
    // validator needs it (caught by the harness).
    const matchSnapshot = new Map(state.matches)

    // Documents attach FIRST: Workday "parse my resume" flows can trigger the
    // site's own parser writing into fields — attaching before the text
    // fills lets the normal rescan/refill pass run after the parser settles
    // instead of being clobbered by it. Stable sort keeps detection order
    // within each group.
    const fillOrder = [...state.matches].sort(
      ([a], [b]) =>
        (state.fields.get(a)?.signal.kind === 'file' ? 0 : 1) -
        (state.fields.get(b)?.signal.kind === 'file' ? 0 : 1),
    )
    for (const [fieldId, match] of fillOrder) {
      const staleField = state.fields.get(fieldId)
      if (!staleField) continue
      const field = refreshField(staleField)
      if (!field) {
        console.debug('[FlashFiller] field vanished before fill', staleField.signal.label)
        continue
      }
      if (field !== staleField) state.fields.set(fieldId, field) // keep chips/accepts live
      // Pill answers are attribute flips (aria-pressed) that no scan-time
      // snapshot tracks — re-read LIVE state or a user's manual pill answer
      // gets clicked over by a stale filled=false (review catch 2026-07-17).
      if (field.pillEls) {
        field.signal.filled = field.pillEls.some(
          (p) => p.getAttribute('aria-pressed') === 'true',
        )
      }
      if (field.signal.filled && !state.store.settings.overwriteFilled) {
        attempted.add(answerKey(field.signal))
        continue
      }

      if (match.action === 'autofill') {
        const outcome = await fillOne(field, match)
        // Only settled outcomes are excluded from the follow-up pass — a
        // FAILED fill (State whose options hadn't loaded yet) and
        // suggest-capped matches get one more chance after the rescan.
        if (outcome !== 'failed') attempted.add(answerKey(field.signal))
        if (outcome === 'filled') {
          filled++
        } else {
          // A silent failure looks like "the extension ignored this field" —
          // always leave a visible chip so the answer is one click away.
          if (outcome === 'failed') {
            showSuggestionChip(
              fieldId,
              field,
              match,
              `Couldn’t fill automatically (${Math.round(match.confidence * 100)}% match) — Accept retries`,
            )
          }
          suggested++
        }
        if (state.store.settings.fillDelayMs > 0) {
          // never fill faster than page handlers can process (Section 8)
          await wait(state.store.settings.fillDelayMs + Math.random() * 40)
        }
      } else if (match.action === 'suggest' && !state.skipped.has(fieldId)) {
        showSuggestionChip(fieldId, field, match, `${Math.round(match.confidence * 100)}% match`)
        suggested++
      }
    }

    // Dependent fields ("Source" appears only after the primary selection):
    // one follow-up pass over autofill-able fields that appeared since.
    await wait(600) // let the site render dependents
    await scan()
    for (const [fieldId, match] of state.matches) matchSnapshot.set(fieldId, match)
    for (const [fieldId, match] of state.matches) {
      if (match.action !== 'autofill') continue
      const field = state.fields.get(fieldId)
      if (!field) continue
      const key = answerKey(field.signal)
      if (attempted.has(key)) continue
      attempted.add(key)
      const live = refreshField(field)
      if (!live || (live.signal.filled && !state.store.settings.overwriteFilled)) continue
      const outcome = await fillOne(live, match)
      if (outcome === 'filled') filled++
      else if (outcome === 'failed') {
        showSuggestionChip(fieldId, live, match, 'Couldn’t fill automatically — Accept retries')
        suggested++
      }
    }

    // Flag what we must not touch (Sections 8, 13)
    for (const field of state.fields.values()) {
      const { signal } = field
      if (!field.el.isConnected || signal.filled) continue
      if (signal.kind === 'file' && !matchSnapshot.has(signal.fieldId)) {
        // Matched file fields attach (or chip on failure) above — only the
        // ones with NO matching stored document keep the manual flag.
        overlay.showChip({
          fieldId: signal.fieldId,
          anchor: field.el,
          title: signal.label,
          value: '',
          meta: 'No stored document matches — attach manually (or add one under Options → Documents)',
          needsReview: false,
          kind: 'flag',
        })
      } else if (signal.consentLike && !state.matches.has(signal.fieldId)) {
        // Matched consent boxes already show their pre-answered chip
        // (certification boxes auto-tick); only the unmatched rest get the
        // manual-review flag.
        overlay.showChip({
          fieldId: signal.fieldId,
          anchor: field.el,
          title: signal.label,
          value: '',
          meta: 'Consent box — review and check it yourself',
          needsReview: false,
          kind: 'flag',
        })
      }
    }

    // ---- Validation layer (reader, never writes): the filler must not be
    // its own validator. Compare the page's ACTUAL end state against the
    // expected answers — wrong fills get a fix chip, silent misses a retry
    // chip, genuine gaps a flag. A validation crash must never take the
    // fill flow (or its toast) down with it.
    await wait(800) // let controlled components settle before judging
    state.lastFillMatches = matchSnapshot
    let report: FieldValidation[] = []
    try {
      report = runValidation()
    } catch (error) {
      console.debug('[FlashFiller] validation crashed', error)
    }
    const summary = summarizeValidation(report)
    for (const v of report) {
      if (v.verdict === 'skipped') continue

      // ---- Learned-entry feedback (2026-07-16 rebuild) ----
      // ok → graduation counter (okCount ≥ 3, no wrongs = trusted, normal
      // thresholds). wrong → two-strike demotion back to Review, with the
      // evidence in the note. Curated training/import entries: log only —
      // the tolerant comparison has false positives on site reformatting,
      // and flooding Review with the import bank would poison the queue.
      const feedbackMatch = matchSnapshot.get(v.fieldId)
      if (feedbackMatch?.source.startsWith('qa:')) {
        const id = feedbackMatch.source.slice(3)
        const entry = state.store?.qa.find((e) => e.id === id)
        if (entry && (entry.source === 'captured' || entry.source === 'inferred')) {
          if (v.verdict === 'ok' && !state.strickenEntries.has(id)) {
            state.strickenEntries.add(id) // one graduation tick per session
            void patchQA(id, { okCount: (entry.okCount ?? 0) + 1, updatedAt: Date.now() })
          } else if (
            v.verdict === 'wrong' &&
            !state.userConfirmedEntries.has(id) &&
            !state.strickenEntries.has(id)
          ) {
            state.strickenEntries.add(id)
            const action = wrongVerdictAction(entry)
            if (action !== 'none') {
              const note = `Filled wrong value on ${location.hostname}: expected "${v.expected ?? ''}", found "${v.actual ?? ''}"`
              void patchQA(id, {
                wrongCount: (entry.wrongCount ?? 0) + 1,
                lastWrongAt: Date.now(),
                okCount: 0, // graduation resets on any wrong
                reviewNote: note,
                ...(action === 'demote' ? { status: 'needs_review' as const } : {}),
                updatedAt: Date.now(),
              })
              console.debug(
                `[FlashFiller] ${action === 'demote' ? 'demoted' : 'struck'} learned entry`,
                entry.question,
                note,
              )
              if (action === 'demote')
                void chrome.runtime.sendMessage({ type: 'CAPTURE_COUNT_CHANGED' } satisfies Message)
            }
          }
        }
      }

      // ---- Equivalence distillation (Phase 2) ----
      // A validated-ok fill whose stored answer is lexically FAR from the
      // option that actually landed means a semantic bridge (embedding /
      // judge / intent tier) did the work. Write the pair into an option
      // equivalence set so the next site places it offline at 0.95.
      if (v.verdict === 'ok' && feedbackMatch && v.actual) {
        const vKind = state.fields.get(v.fieldId)?.signal.kind
        const answerText = feedbackMatch.rawAnswerTemplate
        if (
          (vKind === 'select' || vKind === 'radio' || vKind === 'custom-dropdown') &&
          answerText &&
          !answerText.includes('{{') &&
          canonicalAnswer(answerText) !== canonicalAnswer(v.actual) &&
          lexicalAnswerScore(answerText, v.actual) < 0.55
        ) {
          const set = recordOptionEquivalence(
            state.store?.optionSets ?? [],
            answerText,
            v.actual,
            newId,
          )
          if (set) {
            void upsertOptionSet(set)
            console.debug('[FlashFiller] learned option equivalence', answerText, '≈', v.actual)
          }
        }
      }

    }
    renderValidationFindings(report, matchSnapshot)
    storeValidationReport(report, matchSnapshot)
    console.debug('[FlashFiller] validation summary', summary)
    refreshBadge() // the report exists now — surface the AI Fill button
    // The inversion (Stage 2): in llm-first mode the deterministic pass hands
    // its residue straight to the planner — queued, never awaited from inside
    // this queued job (that would deadlock the fill queue).
    maybeQueuePlanFill()

    overlay.toast(
      `FlashFiller: ${filled} filled, ${suggested} suggested · validated: ${summary.ok} ok` +
      (summary.wrong > 0 ? `, ${summary.wrong} WRONG` : '') +
      (summary.missingAnswerable > 0 ? `, ${summary.missingAnswerable} missed` : '') +
      (summary.missingUnanswered > 0 ? `, ${summary.missingUnanswered} unanswered` : '') +
      '. Review before submitting!',
    )
    return { filled, suggested }
  }

  /** Fresh read-only validation of the CURRENT page state against the last
   *  fill run's matches (post-fill rescans drop filled fields from the live
   *  map); also refreshes state.fields for chip anchoring. Exposed via
   *  __flashfillerValidate. */
  /** Validation's match oracle: live matches MERGED with the last fill
   *  run's snapshot. The snapshot wins for fields we actually filled (their
   *  live matches vanish on rescan, and the snapshot holds the judge-picked
   *  values); live wins everywhere else — a whole-map fallback froze later
   *  wizard steps to the step-1 snapshot, flagging matched step-2 fields as
   *  "no stored answer" (review catch 2026-07-21). */
  function validationOracle(): Map<string, MatchResult> {
    const merged = new Map(state.matches)
    if (state.lastFillMatches) {
      for (const [fieldId, match] of state.lastFillMatches) {
        if (state.filledValues.has(fieldId) || !merged.has(fieldId)) merged.set(fieldId, match)
      }
    }
    return merged
  }

  function runValidation(): FieldValidation[] {
    const fresh = detectFields(document)
    for (const field of fresh) {
      const existing = state.fields.get(field.signal.fieldId)
      if (!existing || !existing.el.isConnected) state.fields.set(field.signal.fieldId, field)
    }
    return validateFields(fresh, validationOracle(), state.filledValues)
  }

  /** Chips + console lines for a validation report — shared by the post-fill
   *  pass, the Validate button, and the AI pass's re-validation. Learned-
   *  entry feedback and equivalence distillation are deliberately NOT here:
   *  they interpret verdicts as feedback on a JUST-RUN fill, and an
   *  on-demand Validate re-running them would multiply-count the same
   *  fill's verdict (strike/graduation double-tick). */
  function renderValidationFindings(
    report: FieldValidation[],
    matchSnapshot: Map<string, MatchResult>,
  ): void {
    // state.overlay, never getOverlay(): findings arriving after the user
    // dismissed the pill must not resurrect it.
    const overlay = state.overlay
    if (!overlay) return
    for (const v of report) {
      if (v.verdict === 'skipped' || v.verdict === 'ok') continue
      console.debug('[FlashFiller] validation', v.verdict, v.label, `(${v.kind})`, {
        expected: v.expected,
        actual: v.actual,
      })
      const field = state.fields.get(v.fieldId)
      const match = matchSnapshot.get(v.fieldId)
      if (v.verdict === 'wrong' && field && match) {
        overlay.showChip({
          fieldId: v.fieldId,
          anchor: field.el,
          title: v.label,
          value: v.expected ?? '',
          meta: `Validation: found “${v.actual ?? ''}” — Accept refills`,
          needsReview: false,
          kind: 'suggestion',
        })
      } else if (v.verdict === 'missing-answerable' && field && match) {
        showSuggestionChip(v.fieldId, field, match, 'Validation: still empty — Accept retries')
      } else if (v.verdict === 'missing-unanswered' && v.required && field) {
        overlay.showChip({
          fieldId: v.fieldId,
          anchor: field.el,
          title: v.label,
          value: '',
          meta: 'Required, no stored answer — fill it once and I’ll learn it',
          needsReview: false,
          kind: 'flag',
        })
      }
    }
  }

  /** Remember the report for the AI Fill pass (memory — its fieldIds and
   *  match snapshot only mean anything in this page instance) and mirror the
   *  serializable notes to storage — the durable, inspectable copy. */
  function storeValidationReport(
    report: FieldValidation[],
    matchSnapshot: Map<string, MatchResult>,
  ): void {
    state.lastValidationReport = { at: Date.now(), report, matches: new Map(matchSnapshot) }
    saveValidationReport({
      url: location.href,
      at: Date.now(),
      summary: summarizeValidation(report),
      entries: report,
    }).catch((error) => console.debug('[FlashFiller] validation report persist failed', error))
  }

  /** Validate button: on-demand read-only census — what landed vs what is
   *  still empty. Runs through the fill queue so it never judges a page
   *  mid-fill. Chips + toast mirror the post-fill flow; the stored report
   *  feeds the AI Fill button. */
  async function runValidateOnDemand(): Promise<void> {
    if (!state.store || state.dismissed) return
    // Captured, never getOverlay(): a queued job must not resurrect a pill
    // the user just dismissed.
    const overlay = state.overlay
    if (!overlay) return
    await wait(400) // let whatever just settled finish rendering
    let report: FieldValidation[]
    try {
      report = runValidation()
    } catch (error) {
      console.debug('[FlashFiller] validation crashed', error)
      overlay.toast('Validation crashed — see the console.')
      return
    }
    const matchSnapshot = validationOracle()
    renderValidationFindings(report, matchSnapshot)
    storeValidationReport(report, matchSnapshot)
    const summary = summarizeValidation(report)
    console.debug('[FlashFiller] validation summary', summary)
    const { targets } = selectAiFillTargets(report)
    refreshBadge()
    overlay.toast(
      `Validated: ${summary.ok} ok` +
        (summary.wrong > 0 ? `, ${summary.wrong} WRONG` : '') +
        (summary.missingAnswerable > 0 ? `, ${summary.missingAnswerable} missed` : '') +
        (summary.missingUnanswered > 0 ? `, ${summary.missingUnanswered} unanswered` : '') +
        (targets.length > 0 ? ` · ${targets.length} fillable by AI` : ''),
    )
  }

  /** AI Fill button (2026-07-21): fill the still-EMPTY fields from the last
   *  validation report via the OpenAI judge. Never overwrites a filled
   *  field (user decision — 'wrong' keeps its warning chip), never touches
   *  EEO/consent/files/passwords, never submits. Judge declines surface as
   *  honest flag chips. */
  async function runAiFill(): Promise<void> {
    if (!state.store || state.aiFillBusy || state.dismissed) return
    // Captured, never getOverlay(): a queued pass must not resurrect a
    // dismissed pill.
    const overlay = state.overlay
    if (!overlay) return
    const sem = state.store.settings.semanticMatching
    if (!sem.enabled || !sem.apiKeyRef) {
      // Say WHICH half is missing — "enable X" when X looks enabled reads
      // as a broken extension (live confusion 2026-07-21).
      overlay.toast(
        !sem.enabled
          ? 'AI Fill needs the OpenAI judge — enable Semantic matching in Options → Settings.'
          : 'AI Fill needs your OpenAI API key — Options → Settings → Semantic matching.',
      )
      return
    }
    const reportState = state.lastValidationReport
    if (!reportState) {
      overlay.toast('Run Validate first — AI Fill works from its report.')
      return
    }
    state.aiFillBusy = true
    refreshBadge()
    try {
      // The stored report is the user's mandate; the page may have moved on
      // since (chip accepts, wizard rerender) — re-detect for execution
      // truth. Targets pair with THIS pass's fields: fresh signals carry the
      // CURRENT question/flags even when an SPA recycled a node under a
      // reused data-ff-id (the 2026-07-16 corruption vector), so entry and
      // widget identity always agree — the stale state.fields snapshot never
      // drives a fill. A detection crash aborts: filling from a stale report
      // would be guessing.
      let fresh: DetectedField[]
      try {
        fresh = detectFields(document)
      } catch (error) {
        console.debug('[FlashFiller] AI fill aborted: detection crashed', error)
        overlay.toast('AI Fill aborted — couldn’t re-check the page.')
        return
      }
      const freshFields = new Map(fresh.map((f) => [f.signal.fieldId, f]))
      for (const field of fresh) {
        const existing = state.fields.get(field.signal.fieldId)
        if (!existing || !existing.el.isConnected) state.fields.set(field.signal.fieldId, field)
      }
      const liveOracle = validationOracle()
      const report = validateFields(fresh, liveOracle, state.filledValues)
      const { targets, skipped, overflow } = selectAiFillTargets(report)
      for (const s of skipped) {
        // Policy exclusions get an honest chip; files already carry their
        // "attach manually" flag and passwords are never ours.
        if (s.why !== 'eeo' && s.why !== 'consent') continue
        const field = state.fields.get(s.entry.fieldId)
        if (!field || !field.el.isConnected) continue
        overlay.showChip({
          fieldId: s.entry.fieldId,
          anchor: field.el,
          title: s.entry.label,
          value: '',
          meta: 'Needs your answer — AI never guesses demographics or consent',
          needsReview: false,
          kind: 'flag',
        })
      }
      if (targets.length === 0) {
        overlay.toast('Nothing left for AI to fill — run Validate to refresh the report.')
        return
      }
      const evicted = judgeCache.evictDeclines() // explicit retry = fresh roll on earlier "no"s
      console.debug('[FlashFiller] AI fill start', {
        targets: targets.length,
        evictedDeclines: evicted,
        overflow,
      })
      const matches = new Map(reportState.matches)
      let filled = 0
      let declined = 0
      let failed = 0
      let dropped = 0
      const declineChip = (field: DetectedField, title: string) =>
        overlay.showChip({
          fieldId: field.signal.fieldId,
          anchor: field.el,
          title,
          value: '',
          meta: 'AI couldn’t determine an answer — fill manually',
          needsReview: false,
          kind: 'flag',
        })
      for (const t of targets) {
        const freshField = freshFields.get(t.entry.fieldId)
        const field = freshField ? refreshField(freshField) : null
        if (!field) {
          dropped++
          continue
        }
        state.fields.set(field.signal.fieldId, field) // chips/accepts anchor live
        const { signal } = field
        // Belt-and-braces: re-check the LIVE signal — report flags could be
        // stale after an SPA identity swap.
        if (signal.eeoLike || signal.consentLike || signal.kind === 'file' || signal.kind === 'password') {
          dropped++
          continue
        }
        const question = signal.label || signal.normalizedQuestion
        // The fresh validation judged against liveOracle — a match that only
        // appeared after the report was stored still deserves its
        // stored-answer retry before falling back to inference.
        const storedMatch = matches.get(t.entry.fieldId) ?? liveOracle.get(t.entry.fieldId)
        let match: MatchResult | null = null
        if (
          t.reason === 'missing-answerable' &&
          storedMatch &&
          storedMatch.action !== 'ignore' &&
          !storedMatch.notify
        ) {
          // The stored answer never landed: for option widgets the lexical
          // walk already failed — force judge-only placement; text kinds
          // simply retry the verbatim write. fieldId rebases onto the LIVE
          // signal: a remount twin carries a NEW data-ff-id, and
          // selfFilled/filledValues keyed on the old one would let the
          // capture loop prompt on our own fill.
          match = {
            ...(signal.kind === 'select' ||
            signal.kind === 'radio' ||
            signal.kind === 'custom-dropdown'
              ? judgeRetryMatch(storedMatch)
              : { ...storedMatch, action: 'autofill' as const, needsReview: false }),
            fieldId: signal.fieldId,
          }
        } else if (signal.kind === 'custom-dropdown') {
          match = inferDropdownMatch(signal.fieldId)
        } else if ((signal.kind === 'select' || signal.kind === 'radio') && signal.options.length > 0) {
          const index = await askJudge({
            type: 'SEMANTIC_ANSWER',
            question,
            options: signal.options.map((o) => o.text),
            facts: state.matcherCtx ? buildFactSheet(state.matcherCtx, question) : '',
          })
          if (index === null || !signal.options[index]) {
            declined++
            declineChip(field, question)
            continue
          }
          match = inferOptionMatch(signal.fieldId, signal.options[index], signal.kind)
        } else if (signal.kind === 'text' || signal.kind === 'textarea') {
          if (isIdentityLabel(signal.label)) {
            dropped++ // name/email/phone gaps are tier-1 territory, not drafting
            continue
          }
          const text = await askJudgeText({
            type: 'SEMANTIC_TEXT',
            question,
            facts: state.matcherCtx ? buildFactSheet(state.matcherCtx, question) : '',
            kind: signal.kind === 'textarea' ? 'textarea' : 'text',
          })
          if (!text) {
            declined++
            declineChip(field, question)
            continue
          }
          match = inferTextMatch(signal.fieldId, text)
        }
        if (!match) {
          dropped++
          continue
        }
        // Seconds of judge round-trips separate pass-start validation from
        // this fill — never place anything over a field that is no longer
        // empty (the user may be typing into it right now).
        if (readActualValue(field).trim() !== '') {
          dropped++
          continue
        }
        const outcome = await fillOne(field, match, { userInitiated: true })
        if (outcome === 'filled') {
          filled++
          matches.set(signal.fieldId, match) // re-validation's oracle
        } else if (outcome === 'failed') {
          failed++
          declineChip(field, question)
        }
        if (state.store.settings.fillDelayMs > 0) {
          await wait(state.store.settings.fillDelayMs + Math.random() * 40)
        }
      }
      // The AI pass is never its own validator either.
      await wait(800)
      state.lastFillMatches = matches
      let after: FieldValidation[] = []
      try {
        after = runValidation()
      } catch (error) {
        console.debug('[FlashFiller] validation crashed', error)
      }
      renderValidationFindings(after, matches)
      storeValidationReport(after, matches)
      const summary = summarizeValidation(after)
      console.debug('[FlashFiller] validation summary', summary)
      overlay.toast(
        `AI Fill: ${filled} filled` +
          (declined > 0 ? `, ${declined} declined` : '') +
          (failed > 0 ? `, ${failed} failed` : '') +
          (dropped > 0 ? `, ${dropped} skipped` : '') +
          (overflow > 0 ? ` · ${overflow} more — run again` : '') +
          ` · now ${summary.ok} ok. Review before submitting!`,
      )
    } finally {
      state.aiFillBusy = false
      refreshBadge()
    }
  }

  // ---- LLM-first fill pass (Stage 2, 2026-08-22) --------------------------------
  // ONE Claude Haiku plan over everything the deterministic pass left, executed
  // through the normal widget-correct fill machinery under the §5 guardrails
  // (lib/planner.ts). The model proposes; code decides and executes. Never
  // submits, never overwrites, EEO placement only from stored values.

  /** A stored entry's answer, resolved for the brief — or null when it can't
   *  be offered (composites/notify, unresolved {{vars}}, empty, or anything
   *  touching the account password). */
  function candidateAnswerOf(entry: QAEntry): string | null {
    if (!state.store) return null
    if (entry.answerType === 'composite' || entry.answerType === 'notify') return null
    if (entry.answerType === 'profile' && entry.mapsTo) {
      const path = entry.mapsTo.replace(/^profile\./, '')
      if (/accountpassword/i.test(path)) return null
      let cur: unknown = state.store.profile
      for (const part of path.split('.')) {
        if (cur === null || typeof cur !== 'object') return null
        cur = (cur as Record<string, unknown>)[part]
      }
      if (cur === undefined || cur === null || typeof cur === 'object') return null
      const text = typeof cur === 'boolean' ? (cur ? 'Yes' : 'No') : String(cur).trim()
      return text || null
    }
    if (!entry.answer.trim()) return null
    const { text, unresolved } = resolveVariables(entry.answer, {
      context: state.context,
      profile: state.store.profile,
      session: state.sessionVars,
    })
    const resolvedText = text.trim()
    if (unresolved.length > 0 || !resolvedText || /\{\{[\w.\s]+\}\}/.test(resolvedText)) return null
    return resolvedText
  }

  /** Job-posting excerpt for the brief (Stage 2.5) — read-only, best-effort:
   *  JSON-LD JobPosting.description first, then the page's main content.
   *  Grounds the inference lane ("what does this role actually need?") and
   *  essay drafts. Empty string = nothing usable found. */
  function harvestJdExcerpt(maxChars = 1600): string {
    const tidy = (text: string): string =>
      text
        .replace(/ /g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    const clip = (text: string): string =>
      text.length <= maxChars ? text : `${text.slice(0, maxChars).trimEnd()}…`
    try {
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const walk = (node: unknown): string | null => {
            if (Array.isArray(node)) {
              for (const item of node) {
                const hit = walk(item)
                if (hit) return hit
              }
              return null
            }
            if (node && typeof node === 'object') {
              const record = node as Record<string, unknown>
              if (record['@type'] === 'JobPosting' && typeof record.description === 'string') {
                const div = document.createElement('div')
                div.innerHTML = record.description
                return div.textContent ?? null
              }
              if (record['@graph']) return walk(record['@graph'])
            }
            return null
          }
          const hit = walk(JSON.parse(script.textContent ?? 'null'))
          if (hit && hit.trim().length > 120) return clip(tidy(hit))
        } catch {
          // one malformed block must not sink the harvest
        }
      }
      const main = document.querySelector('main, [role="main"], article')
      const text = tidy((main as HTMLElement | null)?.innerText ?? '')
      if (text.length > 200) return clip(text)
    } catch {
      // harvesting is best-effort; the brief just goes out without a JD
    }
    return ''
  }

  /** One planner request through the service worker; null on any failure
   *  (details in the console). Deliberately NOT judge-cached — every page's
   *  plan is unique, and a cached plan would be a stale plan. */
  async function requestPlan(
    brief: PlannerBrief,
    repair: PlanRepairPayload | null,
  ): Promise<string | null> {
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'PLANNER_PLAN',
        brief,
        repair,
      } satisfies Message)) as { ok?: boolean; raw?: string | null; error?: string } | undefined
      if (res?.ok && typeof res.raw === 'string') return res.raw
      if (res?.error) console.debug('[FlashFiller] planner error', res.error)
      return null
    } catch (error) {
      console.debug('[FlashFiller] planner message failed', error)
      return null
    }
  }

  /** Execute validated plan decisions through fillOne — shared by the first
   *  round and the repair round. Belt-and-braces live-signal re-checks mirror
   *  runAiFill (SPA identity swaps): consent/file/password never; EEO only
   *  when THIS decision is eeo-sourced. */
  async function executePlanDecisions(
    decisions: PlanDecision[],
    freshFields: Map<string, DetectedField>,
    matches: Map<string, MatchResult>,
    attemptedValues: Map<string, string>,
    counts: { filled: number; suggested: number; humans: number },
    overlay: Overlay,
  ): Promise<void> {
    for (const d of decisions) {
      const staleField = freshFields.get(d.entry.fieldId) ?? state.fields.get(d.entry.fieldId)
      const field = staleField ? refreshField(staleField) : null
      if (!field) continue
      state.fields.set(field.signal.fieldId, field) // chips/accepts anchor live
      const { signal } = field
      if (signal.consentLike || signal.kind === 'file' || signal.kind === 'password') continue
      if (signal.eeoLike && d.sourceKind !== 'eeo') continue
      const question = signal.label || signal.normalizedQuestion
      if (d.entry.action === 'skip' || d.entry.action === 'needs_human') {
        counts.humans++
        overlay.showChip({
          fieldId: signal.fieldId,
          anchor: field.el,
          title: question,
          value: '',
          meta: `Planner: ${d.entry.reason || 'needs your answer'}`,
          needsReview: false,
          kind: 'flag',
        })
        continue
      }
      const match = planEntryToMatch(d, signal)
      if (match.action === 'suggest') {
        matches.set(signal.fieldId, match) // Accept resolves through the report snapshot
        showSuggestionChip(signal.fieldId, field, match, 'Planner suggests — Accept fills')
        counts.suggested++
        continue
      }
      // Seconds of planner round-trip separate pass-start validation from this
      // fill — never place anything over a field that is no longer empty.
      if (readActualValue(field).trim() !== '') continue
      const outcome = await fillOne(field, match, { userInitiated: true })
      if (outcome === 'filled') {
        counts.filled++
        matches.set(signal.fieldId, match)
        attemptedValues.set(signal.fieldId, match.rawAnswerTemplate)
      } else if (outcome === 'failed') {
        matches.set(signal.fieldId, match)
        attemptedValues.set(signal.fieldId, match.rawAnswerTemplate) // repair evidence
        showSuggestionChip(signal.fieldId, field, match, 'Planner couldn’t place this — Accept retries')
        counts.suggested++
      }
      if (state.store!.settings.fillDelayMs > 0) {
        await wait(state.store!.settings.fillDelayMs + Math.random() * 40)
      }
    }
  }

  /** The inversion (plan §4): census → deterministic residue → ONE planner
   *  call → guarded execution → one repair round with evidence → honest chips. */
  async function runPlanFill(): Promise<void> {
    if (!state.store || state.aiFillBusy || state.dismissed) return
    // Captured, never getOverlay(): a queued pass must not resurrect a
    // dismissed pill.
    const overlay = state.overlay
    if (!overlay) return
    const settings = state.store.settings
    if (settings.fillMode !== 'llm-first') return
    if (!settings.planner.apiKeyRef) {
      overlay.toast(
        'LLM-first filling needs your Anthropic API key — Options → Settings → LLM-first filling.',
      )
      return
    }
    state.aiFillBusy = true
    refreshBadge()
    try {
      let fresh: DetectedField[]
      try {
        fresh = detectFields(document)
      } catch (error) {
        console.debug('[FlashFiller] plan fill aborted: detection crashed', error)
        overlay.toast('Plan fill aborted — couldn’t re-check the page.')
        return
      }
      const freshFields = new Map(fresh.map((f) => [f.signal.fieldId, f]))
      for (const field of fresh) {
        const existing = state.fields.get(field.signal.fieldId)
        if (!existing || !existing.el.isConnected) state.fields.set(field.signal.fieldId, field)
      }
      const liveOracle = validationOracle()
      const report = validateFields(fresh, liveOracle, state.filledValues)
      const profile = state.store.profile
      const eeoStored = buildEeoStored(profile, state.store.qa)
      const { targets, skipped, overflow } = selectPlanTargets(report, (v) =>
        eeoStoredAnswerFor(v.label || v.normalizedQuestion, eeoStored),
      )
      for (const s of skipped) {
        if (s.why !== 'eeo-unstored' && s.why !== 'consent') continue
        const field = state.fields.get(s.entry.fieldId)
        if (!field || !field.el.isConnected) continue
        overlay.showChip({
          fieldId: s.entry.fieldId,
          anchor: field.el,
          title: s.entry.label,
          value: '',
          meta:
            s.why === 'consent'
              ? 'Consent box — review and check it yourself'
              : 'Needs your answer — nothing stored for this demographic question',
          needsReview: false,
          kind: 'flag',
        })
      }
      if (targets.length === 0) {
        overlay.toast('Nothing left for the planner — run Validate to refresh the report.')
        return
      }
      const signalsAll = fresh.map((f) => f.signal)
      const censusFields = targets.map((t) => {
        const field = freshFields.get(t.fieldId)
        return censusEntry(
          t,
          field?.signal,
          field ? neighborLabels(field.signal, signalsAll) : [],
          field ? readActualValue(field) : '',
        )
      })
      const questions = censusFields.map((f) => f.label || f.normalizedQuestion)
      const candidates: PlannerCandidate[] = []
      for (const entry of selectRelevantQA(state.store.qa, questions, location.hostname)) {
        const answer = candidateAnswerOf(entry)
        if (!answer) continue
        candidates.push({
          id: entry.id,
          question: entry.question,
          answer,
          ...(entry.fallbacks?.length ? { fallbacks: entry.fallbacks } : {}),
        })
      }
      const brief: PlannerBrief = {
        page: {
          company: state.context.company,
          role: state.context.role,
          hostname: location.hostname,
        },
        fields: censusFields,
        profileFacts: buildProfileFacts(profile),
        lifeState: deriveLifeState(profile),
        stances: STANCES,
        eeoStored,
        candidates,
        overflow,
        jd: harvestJdExcerpt() || null,
      }
      console.debug('[FlashFiller] planner brief', {
        fields: censusFields.length,
        candidates: candidates.length,
        overflow,
        jdChars: brief.jd?.length ?? 0,
      })
      const raw = await requestPlan(brief, null)
      if (!raw) {
        overlay.toast(
          'Planner call failed — check the Anthropic key in Options → Settings (console has details).',
        )
        return
      }
      const plan = extractPlanJson(raw)
      if (!plan) {
        console.debug('[FlashFiller] unparseable plan', raw.slice(0, 400))
        overlay.toast('Planner returned an unreadable plan — try again.')
        return
      }
      const { accepted, rejected } = validatePlan(plan, brief)
      console.debug('[FlashFiller] plan validated', {
        accepted: accepted.length,
        rejected: rejected.map((r) => `${r.entry.fieldId}: ${r.why}`),
      })
      for (const r of rejected) {
        const field = state.fields.get(r.entry.fieldId)
        if (!field || !field.el.isConnected) continue
        overlay.showChip({
          fieldId: r.entry.fieldId,
          anchor: field.el,
          title: field.signal.label || field.signal.normalizedQuestion,
          value: '',
          meta: `Planner blocked: ${r.why} — fill manually`,
          needsReview: false,
          kind: 'flag',
        })
      }
      const matches = new Map(liveOracle)
      const attemptedValues = new Map<string, string>()
      const counts = { filled: 0, suggested: 0, humans: 0 }
      await executePlanDecisions(accepted, freshFields, matches, attemptedValues, counts, overlay)

      // Repair round (once, plan §4 Phase 5): failures on ATTEMPTED fields go
      // back with evidence; corrected entries re-validate against the SAME
      // brief and re-execute. Still failing → honest chips.
      await wait(800)
      let after: FieldValidation[] = []
      try {
        after = runValidation()
      } catch (error) {
        console.debug('[FlashFiller] validation crashed', error)
      }
      const repairItems = buildRepairItems(after, attemptedValues, (fieldId) => {
        const field = state.fields.get(fieldId)
        return field ? field.signal.options.map((o) => o.text) : []
      })
      if (repairItems.length > 0) {
        console.debug(
          '[FlashFiller] planner repair round',
          repairItems.map((i) => i.label),
        )
        const repairRaw = await requestPlan(brief, { items: repairItems, previous: plan })
        const repairPlan = repairRaw ? extractPlanJson(repairRaw) : null
        if (repairPlan) {
          const repairIds = new Set(repairItems.map((i) => i.fieldId))
          const second = validatePlan(
            repairPlan.filter((e) => repairIds.has(e.fieldId)),
            brief,
          )
          await executePlanDecisions(
            second.accepted,
            freshFields,
            matches,
            attemptedValues,
            counts,
            overlay,
          )
          await wait(800)
          try {
            after = runValidation()
          } catch (error) {
            console.debug('[FlashFiller] validation crashed', error)
          }
        }
      }
      state.lastFillMatches = matches
      renderValidationFindings(after, matches)
      storeValidationReport(after, matches)
      const summary = summarizeValidation(after)
      console.debug('[FlashFiller] validation summary', summary)
      overlay.toast(
        `Planner: ${counts.filled} filled` +
          (counts.suggested > 0 ? `, ${counts.suggested} suggested` : '') +
          (counts.humans > 0 ? `, ${counts.humans} for you` : '') +
          (rejected.length > 0 ? `, ${rejected.length} blocked` : '') +
          (overflow > 0 ? ` · ${overflow} more — run again` : '') +
          ` · now ${summary.ok} ok. Review before submitting!`,
      )
    } finally {
      state.aiFillBusy = false
      refreshBadge()
    }
  }

  /** Queue the planner behind the deterministic pass (fire-and-forget: an
   *  enqueue awaited from inside a queued job would deadlock the queue). */
  function maybeQueuePlanFill(): void {
    const settings = state.store?.settings
    if (settings?.fillMode !== 'llm-first' || !settings.planner.apiKeyRef) return
    if (state.aiFillBusy || state.aiFillPending) return
    const reportState = state.lastValidationReport
    if (!reportState || !state.store) return
    const eeoStored = buildEeoStored(state.store.profile, state.store.qa)
    const { targets } = selectPlanTargets(reportState.report, (v) =>
      eeoStoredAnswerFor(v.label || v.normalizedQuestion, eeoStored),
    )
    if (targets.length === 0) return
    state.aiFillPending = true
    void enqueueFill(() => runPlanFill()).finally(() => {
      state.aiFillPending = false
    })
  }

  async function acceptSuggestion(fieldId: string) {
    const field = state.fields.get(fieldId)
    // Validation chips ("found X — Accept refills") anchor to FILLED fields,
    // which the live match map drops on rescan — fall back to the snapshots
    // so those Accepts actually refill instead of silently no-opping.
    const match =
      state.matches.get(fieldId) ??
      state.lastFillMatches?.get(fieldId) ??
      state.lastValidationReport?.matches.get(fieldId)
    if (!field || !match || match.notify) return // guidance chips have nothing to fill
    state.overlay?.removeChip(fieldId)
    const outcome = await enqueueFill(() => fillOne(field, match, { userInitiated: true }))
    if (outcome === 'failed') {
      getOverlay().toast('FlashFiller: couldn’t place that answer on this field — fill it manually once and I’ll learn it.')
      return
    }
    // Accept-on-chip IS approval: the user just confirmed this answer on a
    // live field. A pending learned entry flips active (Review queue drops),
    // and the confirmation shields it from same-session re-demotion.
    // Stage 1 (graduation starvation fix): an Accept is ALSO a human-validated
    // ok — the live store showed okCount stuck at 0 on 71/75 learned entries
    // because ungraduated entries rarely autofill, so validation never got the
    // chance to credit them. A deliberate Accept is at least as strong a tick.
    if (outcome === 'filled' && match.source.startsWith('qa:')) {
      const id = match.source.slice(3)
      state.userConfirmedEntries.add(id)
      const entry = state.store?.qa.find((e) => e.id === id)
      if (entry && (entry.source === 'captured' || entry.source === 'inferred')) {
        const credit = state.strickenEntries.has(id)
          ? {}
          : { okCount: (entry.okCount ?? 0) + 1 }
        state.strickenEntries.add(id) // one graduation tick per session
        void patchQA(id, {
          ...credit,
          ...(entry.status === 'needs_review'
            ? { status: 'active' as const, reviewNote: '', lastWrongAt: null, wrongCount: 0 }
            : {}),
          updatedAt: Date.now(),
        })
        void chrome.runtime.sendMessage({ type: 'CAPTURE_COUNT_CHANGED' } satisfies Message)
      } else if (entry && entry.status === 'needs_review') {
        void patchQA(id, {
          status: 'active',
          reviewNote: '',
          lastWrongAt: null,
          wrongCount: 0,
          updatedAt: Date.now(),
        })
        void chrome.runtime.sendMessage({ type: 'CAPTURE_COUNT_CHANGED' } satisfies Message)
      }
    }
  }

  // ---- Capture loop (Section 11) -----------------------------------------------
  // Text inputs/textareas capture on focusout; selects, radios and checkboxes
  // capture on change (with the field's full option list recorded so the
  // Options tab can classify equivalent wordings); custom dropdowns are
  // diffed on rescan in scan() — they fire no form events when a listbox
  // option is clicked.

  /** Common gating: capture only enabled + activated, once per field, never
   *  consent/EEO/file, never our own fills, and only what the matcher DIDN'T
   *  know: no match / below suggest / explicitly skipped (Section 11). */
  function captureGate(fieldId: string): DetectedField | null {
    const store = state.store
    if (!store || !store.settings.captureLoopEnabled || !state.activated) return null
    if (state.capturePrompted.has(fieldId) || state.selfFilled.has(fieldId)) return null
    const field = state.fields.get(fieldId)
    if (!field) return null
    const { signal } = field
    // Passwords are NEVER captured — they'd land in plain sight in the store
    if (signal.consentLike || signal.eeoLike || signal.kind === 'file' || signal.kind === 'password')
      return null
    const match = state.matches.get(fieldId)
    const unknown = !match || match.action === 'ignore' || state.skipped.has(fieldId)
    return unknown ? field : null
  }

  async function promptCapture(field: DetectedField, rawValue: string) {
    const store = state.store
    if (!store) return
    const { signal } = field
    if (!rawValue || rawValue === state.sessionAnswers.get(answerKey(signal))?.value) return

    state.capturePrompted.add(signal.fieldId)

    // Clean/normalize BEFORE anything is stored: junk question keys and
    // placeholder noise are skipped (with a breadcrumb), dates go canonical
    // ISO, branded answers get site-scoped (Section 11 rebuild).
    const prepared = prepareCaptureValue(
      signal,
      rawValue,
      state.context,
      location.hostname,
      store.profile,
    )
    if (isSkippedCapture(prepared)) {
      console.debug(
        '[FlashFiller] capture skipped:',
        prepared.skip,
        `— "${signal.label || signal.normalizedQuestion}"`,
      )
      return
    }
    const value = prepared.value

    const fieldWording = signal.label || signal.normalizedQuestion
    let similar = findSimilar(store.qa, prepared.question)
    // EEO asymmetry: a demographic-topic entry and a non-EEO field wording
    // (or vice versa) are never the same question — whatever similarity,
    // value equality, or a judge says. Poisoned-alias vector, 2026-07-16.
    if (similar && crossesEeoTopic(fieldWording, similar.entry.question)) similar = null
    if (!similar) {
      // Lexical miss — one (cached) drift-judge call: is this an existing
      // question in new wording? Instant null without an API key.
      // Pending entries stay in the pool (distill-while-gated): mergeAsAlias
      // preserves status, so aliasing a needs_review entry never activates
      // it — it just means approval day inherits every wording seen so far.
      const pool = store.qa.slice(0, 40)
      if (pool.length > 0) {
        const index = await askJudge({
          type: 'SEMANTIC_MATCH_QUESTION',
          question: signal.label || signal.normalizedQuestion,
          candidates: pool.map((e) => e.question),
        })
        if (index !== null && pool[index] && !crossesEeoTopic(fieldWording, pool[index].question)) {
          const entry = pool[index]
          if (shouldSilentMerge(value, entry, state.context, location.hostname)) {
            // Same answer, new wording → merge silently: next time this
            // site's phrasing matches lexically, no judge needed.
            const merged = mergeAsAlias(
              entry,
              signal.label || signal.normalizedQuestion,
              signal.options.map((o) => o.text),
            )
            if (merged !== entry) {
              void upsertQA(merged)
              void chrome.runtime.sendMessage({ type: 'CAPTURE_COUNT_CHANGED' } satisfies Message)
            }
            return
          }
          similar = { entry, score: 0.87 } // conflicting answer → user decides
        }
      }
    }
    getOverlay().showCapturePrompt(
      field.el,
      signal.label || signal.normalizedQuestion,
      similar?.entry.question ?? null,
      (choice) => {
        if (choice === 'new') {
          void upsertQA(
            buildCaptureDraft(signal, value, state.context, Date.now(), {
              siteScope: prepared.siteScope,
              question: prepared.question,   // hygiene-cleaned key (Stage 1)
              reviewNote:
                prepared.note ||
                `Captured on ${location.hostname} — suggests until approved in Review`,
            }),
          )
          void chrome.runtime.sendMessage({ type: 'CAPTURE_COUNT_CHANGED' } satisfies Message)
        } else if (choice === 'merge' && similar) {
          const merged = mergeAsAlias(
            similar.entry,
            signal.label || signal.normalizedQuestion,
            signal.options.map((o) => o.text),
          )
          // Answer text differs from the stored one? The user just typed it
          // deliberately — it becomes the answer, but goes back through the
          // review gate (a changed answer is a changed entry). Page-branded
          // differences ("mcwane.com" under a stored "Website") never
          // overwrite the generic stored answer.
          if (
            similar.entry.answer.trim() !== value &&
            !isContextBranded(value, state.context, location.hostname)
          ) {
            void upsertQA({
              ...merged,
              answer: value,
              status: 'needs_review',
              reviewNote: `Answer changed on ${location.hostname}: was "${similar.entry.answer}"`,
              updatedAt: Date.now(),
            })
          } else {
            void upsertQA(merged)
          }
          void chrome.runtime.sendMessage({ type: 'CAPTURE_COUNT_CHANGED' } satisfies Message)
        }
      },
    )
  }

  /** Radio inputs carry no data-ff-id of their own — the group's id lives on
   *  its first radio. Recover the group from any member. */
  function findRadioGroupField(radio: HTMLInputElement): DetectedField | null {
    for (const field of state.fields.values()) {
      if (field.groupEls?.includes(radio)) return field
    }
    return null
  }

  /** Attached once, on first activation (activate()) — dormant pages carry
   *  no document-level listeners at all. */
  function attachCaptureListeners() {
    document.addEventListener(
      'focusout',
      (event) => {
        const target = event.target as HTMLElement | null
        if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement))
          return
        // Option-bearing inputs are captured on change with their option text
        if (target instanceof HTMLInputElement && (target.type === 'radio' || target.type === 'checkbox'))
          return
        // Segmented dates (Workday month/day/year spinbuttons) deliberately
        // never capture: only the group WRAPPER carries data-ff-id, so a
        // segment blur no-ops here. Deliberate (2026-07-16): profile
        // work/education dates + earliestStartDate already answer every
        // segmented-date question seen; learning per-segment fragments would
        // only store un-fillable junk. Pinned by test.
        // Belt-and-braces: password values never even reach the capture gate
        if (target instanceof HTMLInputElement && target.type === 'password') return
        const fieldId = target.getAttribute('data-ff-id')
        if (!fieldId) return
        const field = captureGate(fieldId)
        if (field) promptCapture(field, target.value.trim())
      },
      true,
    )

    document.addEventListener(
      'change',
      (event) => {
        const target = event.target as HTMLElement | null
        if (!target) return

        if (target instanceof HTMLSelectElement) {
          const fieldId = target.getAttribute('data-ff-id')
          if (!fieldId) return
          const field = captureGate(fieldId)
          if (!field) return
          const chosen = target.selectedIndex >= 0 ? target.options[target.selectedIndex] : null
          const text = chosen ? chosen.text.trim() || chosen.value.trim() : ''
          promptCapture(field, text)
          return
        }

        if (target instanceof HTMLInputElement && target.type === 'radio') {
          if (!target.checked) return
          const field = findRadioGroupField(target)
          if (!field || !captureGate(field.signal.fieldId)) return
          // Options are index-parallel to groupEls (values are often empty/duplicated)
          const index = field.groupEls?.indexOf(target) ?? -1
          const text = (index >= 0 ? field.signal.options[index]?.text : '')?.trim() ?? ''
          // No resolvable label text → the option "text" is the coded VALUE
          // (opt_4837). A coded token matches no option text on any other
          // site — refuse to learn it rather than store a dead answer.
          // Exception: values with clear polarity ("Y", "No", "true") place
          // fine through the intent tier.
          if (!text || (text === target.value && !/[a-z]{3,}/i.test(text) && classifyIntent(text) === 'unknown')) {
            console.debug(
              '[FlashFiller] capture skipped: radio option has no label text',
              `— "${field.signal.label || field.signal.normalizedQuestion}"`,
            )
            state.capturePrompted.add(field.signal.fieldId)
            return
          }
          promptCapture(field, text)
          return
        }

        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
          const fieldId = target.getAttribute('data-ff-id')
          if (!fieldId) return
          const field = captureGate(fieldId)
          if (field) promptCapture(field, target.checked ? 'Yes' : 'No')
        }
      },
      true,
    )
  }

  // ---- Dynamic content & SPA navigation (Section 14) ------------------------------

  function scheduleRescan(delay = 600) {
    if (state.scanTimer) clearTimeout(state.scanTimer)
    state.scanTimer = setTimeout(() => {
      state.scanTimer = 0
      void scan()
    }, delay)
  }

  function observeChanges() {
    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((m) => {
        const target = m.target as HTMLElement
        return !(target.closest?.('[data-flashfiller]'))
      })
      if (relevant && state.activated && !state.dismissed) scheduleRescan()
    })
    // attributeFilter: pill answers commit as aria-pressed flips with NO
    // childList change and no form event — without this, manual pill answers
    // are invisible to rescans (stale filled=false; review catch 2026-07-17).
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-pressed'],
    })

    // SPA step navigation: popstate + patched pushState/replaceState
    window.addEventListener('popstate', () => scheduleRescan(800))
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = history[method].bind(history)
      history[method] = ((...args: Parameters<History['pushState']>) => {
        original(...args)
        scheduleRescan(800)
      }) as History['pushState']
    }
  }

  void init()
}
