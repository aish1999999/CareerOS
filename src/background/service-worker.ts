import type { CascadeCategory, Message, PlanRepairPayload, PlannerBrief, ScanReport, ScanResponse } from '@/types'
import { getStore, onStoreChanged, pendingReviewCount } from '@/lib/storage'
import { parseJudgePath, parseJudgeText } from '@/lib/judge-text'
import { DEFAULT_PLANNER_MODEL } from '@/lib/schema'
import { PLANNER_SYSTEM_PROMPT, plannerUserPrompt } from '@/lib/planner'
// CRXJS `?script` import: the built content-script path, injectable on demand
// for pages outside the manifest allowlist (activeTab, Section 4/13).
import contentScriptPath from '@/content/index?script'

// ---------------------------------------------------------------------------
// Background service worker (Section 4): initializes storage, opens
// onboarding on first install, keeps the review-count badge fresh, and
// injects the content script when the user asks to scan a page that isn't in
// the allowlist. No network calls except the OPT-IN semantic judge below
// (user-configured OpenAI key; off by default).
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    const store = await getStore() // materializes defaults + runs migrations
    await updateBadge()
    if (details.reason === 'install' && !store.settings.onboardingCompleted) {
      await chrome.tabs.create({
        url: chrome.runtime.getURL('src/ui/options/index.html#onboarding'),
      })
    }
  })()
})

// ---- Review-queue badge (Section 11) ----------------------------------------

async function updateBadge(): Promise<void> {
  const store = await getStore()
  const pending = pendingReviewCount(store)
  await chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' })
  await chrome.action.setBadgeText({ text: pending > 0 ? String(pending) : '' })
}

onStoreChanged(() => void updateBadge())
void updateBadge()

// ---- Trusted input (chrome.debugger / CDP) --------------------------------------
// The "Playwright tier": when page widgets ignore synthetic events, dispatch
// REAL input through the DevTools protocol — events arrive isTrusted, exactly
// like a physical mouse. Attach lingers a few seconds between clicks (one
// fill burst = one attach), then detaches so the infobar goes away.

const attachedTabs = new Set<number>()
const detachTimers = new Map<number, ReturnType<typeof setTimeout>>()
const DEBUGGER_IDLE_DETACH_MS = 4000

function cdpAttach(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (attachedTabs.has(tabId)) return resolve()
    chrome.debugger.attach({ tabId }, '1.3', () => {
      const err = chrome.runtime.lastError
      if (err) reject(new Error(err.message)) // e.g. DevTools open on this tab
      else {
        attachedTabs.add(tabId)
        resolve()
      }
    })
  })
}

function cdpSend(tabId: number, method: string, params: object): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, () => {
      const err = chrome.runtime.lastError
      if (err) reject(new Error(err.message))
      else resolve()
    })
  })
}

function scheduleDetach(tabId: number): void {
  clearTimeout(detachTimers.get(tabId))
  detachTimers.set(
    tabId,
    setTimeout(() => {
      detachTimers.delete(tabId)
      if (!attachedTabs.delete(tabId)) return
      chrome.debugger.detach({ tabId }, () => void chrome.runtime.lastError)
    }, DEBUGGER_IDLE_DETACH_MS),
  )
}

chrome.debugger?.onDetach.addListener((source) => {
  if (source.tabId !== undefined) attachedTabs.delete(source.tabId)
})

async function trustedClick(tabId: number, x: number, y: number): Promise<void> {
  await cdpAttach(tabId)
  const button = { x, y, button: 'left', clickCount: 1 }
  await cdpSend(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await cdpSend(tabId, 'Input.dispatchMouseEvent', { type: 'mousePressed', ...button })
  await cdpSend(tabId, 'Input.dispatchMouseEvent', { type: 'mouseReleased', ...button })
  scheduleDetach(tabId)
}

/** Types into whatever holds focus — real trusted text insertion, so
 *  controlled components (react-datepicker) accept it as a user edit. */
async function trustedType(tabId: number, text: string): Promise<void> {
  await cdpAttach(tabId)
  await cdpSend(tabId, 'Input.insertText', { text })
  scheduleDetach(tabId)
}

// ---- Semantic judge (OpenAI) ------------------------------------------------------
// Places an answer on options by MEANING when lexical matching can't. STRICTLY
// opt-in: runs only when the user enabled semantic matching in Settings with
// provider "openai" and their own API key — question text, option texts, and
// (for inference) the profile fact sheet are sent to api.openai.com. With the
// setting off (default) no request is ever made and callers stay lexical.

async function getJudgeConfig(): Promise<{ apiKey: string; model: string } | null> {
  try {
    const { settings } = await getStore()
    const cfg = settings.semanticMatching
    // enabled + key is the whole gate. `provider` is deliberately NOT
    // checked: OpenAI is the only provider shipped, and stores that were
    // enabled before the toggle started force-setting provider:'openai'
    // (or enabled via import) still carry the 'none' default — requiring it
    // silently disabled the judge for exactly those users (live 2026-07-21).
    if (!cfg.enabled || !cfg.apiKeyRef) return null
    return { apiKey: cfg.apiKeyRef, model: cfg.model || 'gpt-4o-mini' }
  } catch {
    return null
  }
}

/** One chat-completions call; returns the raw reply text or null. */
async function judgeCompletion(system: string, prompt: string): Promise<string | null> {
  const config = await getJudgeConfig()
  if (!config) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) {
      console.debug('[FlashFiller] semantic judge HTTP', res.status)
      return null
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

async function judgeIndex(prompt: string, optionCount: number): Promise<number | null> {
  const reply = await judgeCompletion(
    'You match job-application form fields. Reply with ONLY a single number, nothing else.',
    prompt,
  )
  if (reply === null) return null
  const n = parseInt(String(reply).match(/\d+/)?.[0] ?? '0', 10)
  return n >= 1 && n <= optionCount ? n - 1 : null
}

/** Free-text drafting: returns a short answer, or null on decline/UNKNOWN. */
async function judgeText(system: string, prompt: string): Promise<string | null> {
  return parseJudgeText(await judgeCompletion(system, prompt))
}

const numbered = (items: string[]) => items.map((text, i) => `${i + 1}. ${text}`).join('\n')

/** Stored answer ↔ differently-worded option. Two tiers, both anchored to
 *  the applicant's own answer: exact meaning first; failing that, the
 *  CLOSEST professional equivalent (sites don't all offer the same options —
 *  a stored "Company website" must still land on "Advertising" when no
 *  website option exists). Anchoring means a factual "No" can never flip. */
function semanticChoose(answer: string, options: string[]): Promise<number | null> {
  return judgeIndex(
    `A job application form needs ONE option selected.\n` +
    `The applicant's saved answer: "${answer}"\n` +
    `Options:\n${numbered(options)}\n\n` +
    `Which option number has the same meaning as the applicant's answer? ` +
    `If no option has the same meaning, pick the option CLOSEST in meaning to the applicant's answer ` +
    `that is professional and plausible — prefer general categories over specific organizations or ` +
    `claims you cannot verify from the answer. Never pick a placeholder or category heading ` +
    `(e.g. "Select One"). Reply with ONLY that number. ` +
    `Reply 0 only if every option would be a false or arbitrary claim about the applicant.`,
    options.length,
  )
}

/** Unknown question wording ↔ the applicant's stored questions. */
function semanticMatchQuestion(question: string, candidates: string[]): Promise<number | null> {
  return judgeIndex(
    `A job application asks: "${question}"\n` +
    `The applicant has saved answers to these questions:\n${numbered(candidates)}\n\n` +
    `Which saved question is a REWORDING of the application's question — asking for exactly ` +
    `the same information, such that the saved answer can be submitted verbatim? ` +
    `A related or adjacent question (same form section, same topic area) does NOT count. ` +
    `Picking a merely-similar question is worse than picking none. ` +
    `Reply with ONLY that number. If none asks exactly the same thing, reply 0.`,
    candidates.length,
  )
}

/** No stored answer at all: infer the option from the applicant's facts —
 *  instructed to decline rather than guess. */
function semanticAnswer(question: string, options: string[], facts: string): Promise<number | null> {
  return judgeIndex(
    `Facts about a job applicant:\n${facts}\n\n` +
    `A job application asks: "${question}"\n` +
    `Options:\n${numbered(options)}\n\n` +
    `Based ONLY on the facts above, which option number is correct for this applicant? ` +
    `Some options may be placeholders or category headings (e.g. "Select One") — never pick those. ` +
    `Reply with ONLY that number. If the facts do not clearly determine the answer, reply 0.`,
    options.length,
  )
}

/** Open-ended question with no stored answer: draft a short first-person
 *  reply from the facts, or decline with UNKNOWN. The result is only ever a
 *  suggestion chip — the user reviews before it lands on the page. */
function semanticText(
  question: string,
  facts: string,
  kind: 'text' | 'textarea',
): Promise<string | null> {
  return judgeText(
    `You write job-application answers for one specific applicant, using ONLY the facts provided. ` +
    `Reply with the answer text alone — no quotes, no preamble. ` +
    `If the facts do not determine the answer, reply exactly UNKNOWN.`,
    `Facts about the applicant:\n${facts}\n\n` +
    `A job application asks: "${question}"\n` +
    `Write the applicant's answer in first person. Keep it under ${kind === 'textarea' ? '80' : '15'} words. ` +
    `Never invent employers, dates, numbers, skills, or biographical details that are not in the facts. ` +
    `If the facts do not determine the answer, reply exactly UNKNOWN.`,
  )
}

/** Hierarchical dropdown ("How did you hear about us?"): the content script
 *  harvests every category with its sub-options, and ONE call here picks the
 *  primary + sub-option COMBINATION — the model sees the whole tree, so a
 *  saved "LinkedIn" lands under "Social Media" even though no category text
 *  mentions it. Anchored to the saved answer when one exists; otherwise the
 *  fact sheet, instructed to decline rather than guess. */
async function semanticCascade(
  question: string,
  answer: string,
  facts: string,
  categories: CascadeCategory[],
): Promise<{ category: number; option: number } | null> {
  if (categories.length === 0) return null
  const tree = categories
    .map(
      (c, i) =>
        `${i + 1}. ${c.label}\n` +
        c.options.map((o, j) => `   ${i + 1}.${j + 1} ${o}`).join('\n'),
    )
    .join('\n')
  const anchor = answer
    ? `The applicant's saved answer: "${answer}"`
    : `Facts about the applicant:\n${facts}`
  const reply = await judgeCompletion(
    'You match job-application form fields. Reply with ONLY two numbers joined by a dot ' +
      '(category.sub-option, e.g. 2.3), or 0 alone. Nothing else.',
    `A job application asks: "${question}"\n` +
      `The dropdown is hierarchical: picking a category reveals its sub-options, and the ` +
      `FINAL selection must be a sub-option.\n` +
      `${anchor}\n` +
      `Categories and their sub-options:\n${tree}\n\n` +
      `Which sub-option should be selected? Judge the category and sub-option TOGETHER — the ` +
      `pair whose combined meaning best matches ${answer ? "the applicant's saved answer" : 'what the facts clearly determine'}. ` +
      `Never pick a placeholder row (e.g. "Select One"). ` +
      `Reply with ONLY the pair of numbers, e.g. 2.3. ` +
      `Reply 0 if ${answer ? 'no pair matches the saved answer' : 'the facts do not clearly determine the answer'}.`,
  )
  const path = parseJudgePath(reply)
  if (!path) return null
  const branch = categories[path.category]
  if (!branch || path.option >= branch.options.length) return null
  return path
}

/** Batch embeddings (text-embedding-3-small, 256 dims — small enough to
 *  cache thousands of vectors in chrome.storage.local). Same opt-in gate as
 *  the judge: no key → null → callers stay lexical, zero network. */
async function semanticEmbed(texts: string[]): Promise<number[][] | null> {
  const config = await getJudgeConfig()
  if (!config || texts.length === 0) return null
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        dimensions: 256,
        input: texts.slice(0, 256).map((t) => t.slice(0, 500)),
      }),
    })
    if (!res.ok) {
      console.debug('[FlashFiller] embeddings HTTP', res.status)
      return null
    }
    const data = (await res.json()) as { data?: Array<{ index: number; embedding: number[] }> }
    if (!data.data) return null
    const out: number[][] = new Array(texts.length)
    for (const item of data.data) out[item.index] = item.embedding
    return out
  } catch {
    return null
  }
}

// ---- LLM-first planner (Anthropic, Stage 2 2026-08-22) ----------------------------
// ONE Claude Haiku call per page (plus at most one repair round) replaces the
// per-field judge pokes when fillMode is 'llm-first'. Same strict opt-in
// shape as the judge: runs only with the user's own Anthropic key from
// Settings → LLM-first filling; without it, no request is ever made. The
// brief is built content-side by lib/planner.ts (profile facts allow-listed,
// accountPassword never present); parsing and §5 guardrail validation also
// happen content-side where they are unit-testable — this worker only
// transports. The CORS header is Anthropic's documented browser-access
// opt-in; the user's key already lives in this browser by design.

async function getPlannerConfig(): Promise<{ apiKey: string; model: string } | null> {
  try {
    const { settings } = await getStore()
    const cfg = settings.planner
    if (!cfg?.apiKeyRef) return null
    return { apiKey: cfg.apiKeyRef, model: cfg.model || DEFAULT_PLANNER_MODEL }
  } catch {
    return null
  }
}

async function plannerPlan(
  brief: PlannerBrief,
  repair?: PlanRepairPayload | null,
): Promise<{ ok: boolean; raw?: string | null; error?: string }> {
  const config = await getPlannerConfig()
  if (!config) return { ok: false, error: 'Planner not configured — Anthropic API key missing.' }
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        temperature: 0,
        system: PLANNER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: plannerUserPrompt(brief, repair) }],
      }),
    })
    if (!res.ok) {
      let detail = ''
      try {
        const body = (await res.json()) as { error?: { message?: string } }
        detail = body.error?.message ?? ''
      } catch {
        // status alone is the diagnosis
      }
      console.debug('[FlashFiller] planner HTTP', res.status, detail)
      return { ok: false, error: `Anthropic HTTP ${res.status}${detail ? `: ${detail}` : ''}` }
    }
    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
    const raw = (data.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('')
    return raw ? { ok: true, raw } : { ok: false, error: 'Empty planner reply.' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ---- Messaging -----------------------------------------------------------------

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.type === 'PLANNER_PLAN') {
    void plannerPlan(message.brief, message.repair).then((result) => sendResponse(result))
    return true // async response
  }
  if (message.type === 'SEMANTIC_EMBED') {
    void semanticEmbed(message.texts).then((vectors) => sendResponse({ ok: true, vectors }))
    return true // async response
  }
  if (message.type === 'SEMANTIC_CHOOSE') {
    void semanticChoose(message.answer, message.options).then((index) =>
      sendResponse({ ok: true, index }),
    )
    return true // async response
  }
  if (message.type === 'SEMANTIC_MATCH_QUESTION') {
    void semanticMatchQuestion(message.question, message.candidates).then((index) =>
      sendResponse({ ok: true, index }),
    )
    return true
  }
  if (message.type === 'SEMANTIC_ANSWER') {
    void semanticAnswer(message.question, message.options, message.facts).then((index) =>
      sendResponse({ ok: true, index }),
    )
    return true
  }
  if (message.type === 'SEMANTIC_CASCADE') {
    void semanticCascade(message.question, message.answer, message.facts, message.categories).then(
      (path) => sendResponse({ ok: true, path }),
    )
    return true
  }
  if (message.type === 'SEMANTIC_TEXT') {
    void semanticText(message.question, message.facts, message.kind).then((text) =>
      sendResponse({ ok: true, text }),
    )
    return true
  }
  if (message.type === 'TRUSTED_CLICK' || message.type === 'TRUSTED_TYPE') {
    const tabId = sender.tab?.id
    if (tabId === undefined) {
      sendResponse({ ok: false, error: 'No originating tab.' })
      return false
    }
    const action =
      message.type === 'TRUSTED_CLICK'
        ? trustedClick(tabId, message.x, message.y)
        : trustedType(tabId, message.text)
    void action
      .then(() => sendResponse({ ok: true }))
      .catch((e) =>
        sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      )
    return true // async response
  }
  if (message.type === 'CAPTURE_COUNT_CHANGED') {
    void updateBadge()
    sendResponse({ ok: true })
    return false
  }
  if (message.type === 'OPEN_OPTIONS') {
    void chrome.tabs.create({
      url: chrome.runtime.getURL(`src/ui/options/index.html#${message.tab ?? ''}`),
    })
    sendResponse({ ok: true })
    return false
  }
  if (message.type === 'SCAN_ACTIVE_TAB') {
    void scanActiveTab().then((result) => sendResponse(result))
    return true // async response
  }
  return false
})

/**
 * Popup asked to scan the current tab. The content script now ships on every
 * http(s) page, but the executeScript fallback is still load-bearing: tabs
 * that were already open when the extension was installed/reloaded have no
 * script yet, and activeTab covers them on this explicit user gesture.
 *
 * Counts: tabs.sendMessage returns only ONE frame's response (first wins),
 * which lies on iframe-hosted forms (Greenhouse embeds, SuccessFactors apply
 * frames). So the wake-up message triggers the scans, then a second
 * executeScript pass collects every frame's report and sums them.
 */
async function scanActiveTab(): Promise<ScanResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) {
    return { ok: false, error: 'This page can’t be scanned.' }
  }
  const tabId = tab.id
  const send = () =>
    chrome.tabs.sendMessage(tabId, { type: 'SCAN_ACTIVE_TAB' } satisfies Message)
  try {
    await send()
  } catch {
    // Not injected yet — inject into all frames, then wake it
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: [contentScriptPath],
      })
      await send()
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Injection failed.' }
    }
  }
  return { ok: true, ...(await collectScanReports(tabId)) }
}

async function collectScanReports(tabId: number): Promise<Partial<ScanReport>> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      // Runs in the content scripts' isolated world; awaits in-flight scans.
      func: () =>
        (
          window as Window & { __flashfillerScanReport?: () => Promise<unknown> }
        ).__flashfillerScanReport?.() ?? null,
    })
    const totals: ScanReport = { detected: 0, matched: 0, skippedFilled: 0 }
    let reported = false
    for (const frame of results) {
      const report = frame?.result as ScanReport | null
      if (!report || typeof report.detected !== 'number') continue
      reported = true
      totals.detected += report.detected
      totals.matched += report.matched
      totals.skippedFilled += report.skippedFilled
    }
    return reported ? totals : {}
  } catch {
    return {} // scan ran; counts just unavailable (e.g. frame vanished mid-collect)
  }
}
