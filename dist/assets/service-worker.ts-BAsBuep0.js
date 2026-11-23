var _a;
import { g as getStore, p as pendingReviewCount, o as onStoreChanged, D as DEFAULT_PLANNER_MODEL } from "./storage-DrgdSKCL.js";
import { p as plannerUserPrompt, P as PLANNER_SYSTEM_PROMPT } from "./planner-B0wKr8bs.js";
import "./eeo-C8X2VxtH.js";
const JUDGE_TEXT_MAX_CHARS = 600;
function parseJudgeText(reply) {
  if (!reply) return null;
  let text = reply.trim();
  const quoted = text.match(/^"(.*)"$/s) ?? text.match(/^'(.*)'$/s) ?? text.match(/^[“”](.*)[“”]$/s);
  if (quoted) text = quoted[1].trim();
  if (!text) return null;
  if (/^unknown[.!]?$/i.test(text)) return null;
  if (text.length > JUDGE_TEXT_MAX_CHARS) text = `${text.slice(0, JUDGE_TEXT_MAX_CHARS).trimEnd()}…`;
  return text;
}
function parseJudgePath(reply) {
  if (!reply) return null;
  const m = reply.match(/(\d+)\s*[.,]\s*(\d+)/);
  if (!m) return null;
  const category = parseInt(m[1], 10) - 1;
  const option = parseInt(m[2], 10) - 1;
  if (category < 0 || option < 0) return null;
  return { category, option };
}
const contentScriptPath = "assets/index.ts-loader-CxSow0wF.js";
chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    const store = await getStore();
    await updateBadge();
    if (details.reason === "install" && !store.settings.onboardingCompleted) {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("src/ui/options/index.html#onboarding")
      });
    }
  })();
});
async function updateBadge() {
  const store = await getStore();
  const pending = pendingReviewCount(store);
  await chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" });
  await chrome.action.setBadgeText({ text: pending > 0 ? String(pending) : "" });
}
onStoreChanged(() => void updateBadge());
void updateBadge();
const attachedTabs = /* @__PURE__ */ new Set();
const detachTimers = /* @__PURE__ */ new Map();
const DEBUGGER_IDLE_DETACH_MS = 4e3;
function cdpAttach(tabId) {
  return new Promise((resolve, reject) => {
    if (attachedTabs.has(tabId)) return resolve();
    chrome.debugger.attach({ tabId }, "1.3", () => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else {
        attachedTabs.add(tabId);
        resolve();
      }
    });
  });
}
function cdpSend(tabId, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, () => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve();
    });
  });
}
function scheduleDetach(tabId) {
  clearTimeout(detachTimers.get(tabId));
  detachTimers.set(
    tabId,
    setTimeout(() => {
      detachTimers.delete(tabId);
      if (!attachedTabs.delete(tabId)) return;
      chrome.debugger.detach({ tabId }, () => void chrome.runtime.lastError);
    }, DEBUGGER_IDLE_DETACH_MS)
  );
}
(_a = chrome.debugger) == null ? void 0 : _a.onDetach.addListener((source) => {
  if (source.tabId !== void 0) attachedTabs.delete(source.tabId);
});
async function trustedClick(tabId, x, y) {
  await cdpAttach(tabId);
  const button = { x, y, button: "left", clickCount: 1 };
  await cdpSend(tabId, "Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await cdpSend(tabId, "Input.dispatchMouseEvent", { type: "mousePressed", ...button });
  await cdpSend(tabId, "Input.dispatchMouseEvent", { type: "mouseReleased", ...button });
  scheduleDetach(tabId);
}
async function trustedType(tabId, text) {
  await cdpAttach(tabId);
  await cdpSend(tabId, "Input.insertText", { text });
  scheduleDetach(tabId);
}
async function getJudgeConfig() {
  try {
    const { settings } = await getStore();
    const cfg = settings.semanticMatching;
    if (!cfg.enabled || !cfg.apiKeyRef) return null;
    return { apiKey: cfg.apiKeyRef, model: cfg.model || "gpt-4o-mini" };
  } catch {
    return null;
  }
}
async function judgeCompletion(system, prompt) {
  var _a2, _b, _c;
  const config = await getJudgeConfig();
  if (!config) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ]
      })
    });
    if (!res.ok) {
      console.debug("[FlashFiller] semantic judge HTTP", res.status);
      return null;
    }
    const data = await res.json();
    return ((_c = (_b = (_a2 = data.choices) == null ? void 0 : _a2[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) ?? null;
  } catch {
    return null;
  }
}
async function judgeIndex(prompt, optionCount) {
  var _a2;
  const reply = await judgeCompletion(
    "You match job-application form fields. Reply with ONLY a single number, nothing else.",
    prompt
  );
  if (reply === null) return null;
  const n = parseInt(((_a2 = String(reply).match(/\d+/)) == null ? void 0 : _a2[0]) ?? "0", 10);
  return n >= 1 && n <= optionCount ? n - 1 : null;
}
async function judgeText(system, prompt) {
  return parseJudgeText(await judgeCompletion(system, prompt));
}
const numbered = (items) => items.map((text, i) => `${i + 1}. ${text}`).join("\n");
function semanticChoose(answer, options) {
  return judgeIndex(
    `A job application form needs ONE option selected.
The applicant's saved answer: "${answer}"
Options:
${numbered(options)}

Which option number has the same meaning as the applicant's answer? If no option has the same meaning, pick the option CLOSEST in meaning to the applicant's answer that is professional and plausible — prefer general categories over specific organizations or claims you cannot verify from the answer. Never pick a placeholder or category heading (e.g. "Select One"). Reply with ONLY that number. Reply 0 only if every option would be a false or arbitrary claim about the applicant.`,
    options.length
  );
}
function semanticMatchQuestion(question, candidates) {
  return judgeIndex(
    `A job application asks: "${question}"
The applicant has saved answers to these questions:
${numbered(candidates)}

Which saved question is a REWORDING of the application's question — asking for exactly the same information, such that the saved answer can be submitted verbatim? A related or adjacent question (same form section, same topic area) does NOT count. Picking a merely-similar question is worse than picking none. Reply with ONLY that number. If none asks exactly the same thing, reply 0.`,
    candidates.length
  );
}
function semanticAnswer(question, options, facts) {
  return judgeIndex(
    `Facts about a job applicant:
${facts}

A job application asks: "${question}"
Options:
${numbered(options)}

Based ONLY on the facts above, which option number is correct for this applicant? Some options may be placeholders or category headings (e.g. "Select One") — never pick those. Reply with ONLY that number. If the facts do not clearly determine the answer, reply 0.`,
    options.length
  );
}
function semanticText(question, facts, kind) {
  return judgeText(
    `You write job-application answers for one specific applicant, using ONLY the facts provided. Reply with the answer text alone — no quotes, no preamble. If the facts do not determine the answer, reply exactly UNKNOWN.`,
    `Facts about the applicant:
${facts}

A job application asks: "${question}"
Write the applicant's answer in first person. Keep it under ${kind === "textarea" ? "80" : "15"} words. Never invent employers, dates, numbers, skills, or biographical details that are not in the facts. If the facts do not determine the answer, reply exactly UNKNOWN.`
  );
}
async function semanticCascade(question, answer, facts, categories) {
  if (categories.length === 0) return null;
  const tree = categories.map(
    (c, i) => `${i + 1}. ${c.label}
` + c.options.map((o, j) => `   ${i + 1}.${j + 1} ${o}`).join("\n")
  ).join("\n");
  const anchor = answer ? `The applicant's saved answer: "${answer}"` : `Facts about the applicant:
${facts}`;
  const reply = await judgeCompletion(
    "You match job-application form fields. Reply with ONLY two numbers joined by a dot (category.sub-option, e.g. 2.3), or 0 alone. Nothing else.",
    `A job application asks: "${question}"
The dropdown is hierarchical: picking a category reveals its sub-options, and the FINAL selection must be a sub-option.
${anchor}
Categories and their sub-options:
${tree}

Which sub-option should be selected? Judge the category and sub-option TOGETHER — the pair whose combined meaning best matches ${answer ? "the applicant's saved answer" : "what the facts clearly determine"}. Never pick a placeholder row (e.g. "Select One"). Reply with ONLY the pair of numbers, e.g. 2.3. Reply 0 if ${answer ? "no pair matches the saved answer" : "the facts do not clearly determine the answer"}.`
  );
  const path = parseJudgePath(reply);
  if (!path) return null;
  const branch = categories[path.category];
  if (!branch || path.option >= branch.options.length) return null;
  return path;
}
async function semanticEmbed(texts) {
  const config = await getJudgeConfig();
  if (!config || texts.length === 0) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        dimensions: 256,
        input: texts.slice(0, 256).map((t) => t.slice(0, 500))
      })
    });
    if (!res.ok) {
      console.debug("[FlashFiller] embeddings HTTP", res.status);
      return null;
    }
    const data = await res.json();
    if (!data.data) return null;
    const out = new Array(texts.length);
    for (const item of data.data) out[item.index] = item.embedding;
    return out;
  } catch {
    return null;
  }
}
async function getPlannerConfig() {
  try {
    const { settings } = await getStore();
    const cfg = settings.planner;
    if (!(cfg == null ? void 0 : cfg.apiKeyRef)) return null;
    return { apiKey: cfg.apiKeyRef, model: cfg.model || DEFAULT_PLANNER_MODEL };
  } catch {
    return null;
  }
}
async function plannerPlan(brief, repair) {
  var _a2;
  const config = await getPlannerConfig();
  if (!config) return { ok: false, error: "Planner not configured — Anthropic API key missing." };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        temperature: 0,
        system: PLANNER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: plannerUserPrompt(brief, repair) }]
      })
    });
    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = ((_a2 = body.error) == null ? void 0 : _a2.message) ?? "";
      } catch {
      }
      console.debug("[FlashFiller] planner HTTP", res.status, detail);
      return { ok: false, error: `Anthropic HTTP ${res.status}${detail ? `: ${detail}` : ""}` };
    }
    const data = await res.json();
    const raw = (data.content ?? []).filter((block) => block.type === "text" && typeof block.text === "string").map((block) => block.text).join("");
    return raw ? { ok: true, raw } : { ok: false, error: "Empty planner reply." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  var _a2;
  if (message.type === "PLANNER_PLAN") {
    void plannerPlan(message.brief, message.repair).then((result) => sendResponse(result));
    return true;
  }
  if (message.type === "SEMANTIC_EMBED") {
    void semanticEmbed(message.texts).then((vectors) => sendResponse({ ok: true, vectors }));
    return true;
  }
  if (message.type === "SEMANTIC_CHOOSE") {
    void semanticChoose(message.answer, message.options).then(
      (index) => sendResponse({ ok: true, index })
    );
    return true;
  }
  if (message.type === "SEMANTIC_MATCH_QUESTION") {
    void semanticMatchQuestion(message.question, message.candidates).then(
      (index) => sendResponse({ ok: true, index })
    );
    return true;
  }
  if (message.type === "SEMANTIC_ANSWER") {
    void semanticAnswer(message.question, message.options, message.facts).then(
      (index) => sendResponse({ ok: true, index })
    );
    return true;
  }
  if (message.type === "SEMANTIC_CASCADE") {
    void semanticCascade(message.question, message.answer, message.facts, message.categories).then(
      (path) => sendResponse({ ok: true, path })
    );
    return true;
  }
  if (message.type === "SEMANTIC_TEXT") {
    void semanticText(message.question, message.facts, message.kind).then(
      (text) => sendResponse({ ok: true, text })
    );
    return true;
  }
  if (message.type === "TRUSTED_CLICK" || message.type === "TRUSTED_TYPE") {
    const tabId = (_a2 = sender.tab) == null ? void 0 : _a2.id;
    if (tabId === void 0) {
      sendResponse({ ok: false, error: "No originating tab." });
      return false;
    }
    const action = message.type === "TRUSTED_CLICK" ? trustedClick(tabId, message.x, message.y) : trustedType(tabId, message.text);
    void action.then(() => sendResponse({ ok: true })).catch(
      (e) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) })
    );
    return true;
  }
  if (message.type === "CAPTURE_COUNT_CHANGED") {
    void updateBadge();
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === "OPEN_OPTIONS") {
    void chrome.tabs.create({
      url: chrome.runtime.getURL(`src/ui/options/index.html#${message.tab ?? ""}`)
    });
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === "SCAN_ACTIVE_TAB") {
    void scanActiveTab().then((result) => sendResponse(result));
    return true;
  }
  return false;
});
async function scanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!(tab == null ? void 0 : tab.id) || !tab.url || !/^https?:/.test(tab.url)) {
    return { ok: false, error: "This page can’t be scanned." };
  }
  const tabId = tab.id;
  const send = () => chrome.tabs.sendMessage(tabId, { type: "SCAN_ACTIVE_TAB" });
  try {
    await send();
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: [contentScriptPath]
      });
      await send();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Injection failed." };
    }
  }
  return { ok: true, ...await collectScanReports(tabId) };
}
async function collectScanReports(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      // Runs in the content scripts' isolated world; awaits in-flight scans.
      func: () => {
        var _a2;
        return ((_a2 = window.__flashfillerScanReport) == null ? void 0 : _a2.call(window)) ?? null;
      }
    });
    const totals = { detected: 0, matched: 0, skippedFilled: 0 };
    let reported = false;
    for (const frame of results) {
      const report = frame == null ? void 0 : frame.result;
      if (!report || typeof report.detected !== "number") continue;
      reported = true;
      totals.detected += report.detected;
      totals.matched += report.matched;
      totals.skippedFilled += report.skippedFilled;
    }
    return reported ? totals : {};
  } catch {
    return {};
  }
}
