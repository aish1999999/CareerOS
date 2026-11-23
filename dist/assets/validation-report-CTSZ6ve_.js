import { t as tokenizeAnswer, e as looksEeoLoose, l as lexicalScore, c as canonical, n as normalize } from "./eeo-C8X2VxtH.js";
import { e as DEFAULT_ENABLED_DOMAINS, n as newId, a as parseDateParts } from "./storage-DrgdSKCL.js";
import { r as readProfilePath, h as hostMatchesDomain } from "./seed-CEX56cSr.js";
const VAR_RE = /\{\{\s*([\w.]+)\s*\}\}/g;
function detectVariables(text) {
  const vars = /* @__PURE__ */ new Set();
  for (const m of text.matchAll(VAR_RE)) vars.add(m[1]);
  return [...vars];
}
function defaultToday() {
  const d = /* @__PURE__ */ new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}
function lookupVariable(name, input) {
  const session = input.session;
  if (session == null ? void 0 : session.has(name)) return session.get(name);
  switch (name) {
    case "company":
      return input.context.company;
    case "role":
    case "jobTitle":
      return input.context.role;
    case "location":
      return input.context.location;
    case "today":
      return (input.today ?? defaultToday)();
    default:
      if (name.includes(".")) {
        const value = readProfilePath(input.profile, name);
        return value === "" ? null : value;
      }
      return null;
  }
}
function resolveVariables(template, input) {
  const unresolved = /* @__PURE__ */ new Set();
  const text = template.replace(VAR_RE, (raw, name) => {
    const value = lookupVariable(name, input);
    if (value === null || value === void 0 || value === "") {
      unresolved.add(name);
      return raw;
    }
    return value;
  });
  return { text, unresolved: [...unresolved] };
}
const GENERIC_HOST_LABELS = /* @__PURE__ */ new Set([
  "www",
  "jobs",
  "careers",
  "career",
  "apply",
  "recruiting",
  "boards",
  "job-boards",
  "talent"
]);
function brandTokens(context, hostname = "") {
  const brand = /* @__PURE__ */ new Set();
  for (const t of tokenizeAnswer((context == null ? void 0 : context.company) ?? "")) brand.add(t);
  const lower = hostname.toLowerCase();
  const onAtsPlatform = DEFAULT_ENABLED_DOMAINS.some((d) => hostMatchesDomain(lower, d));
  const labels = onAtsPlatform ? lower.split(".").slice(0, 1) : lower.split(".").slice(0, -1);
  const hostLabel = labels.find((l) => l && !GENERIC_HOST_LABELS.has(l)) ?? "";
  if (hostLabel) {
    brand.add(hostLabel);
    for (const t of tokenizeAnswer(hostLabel)) brand.add(t);
  }
  return brand;
}
const isBrandToken = (t, brand) => t.length > 2 && t !== "com" && brand.has(t);
function isContextBranded(value, context, hostname = "") {
  const brand = brandTokens(context, hostname);
  if (brand.size === 0) return false;
  return tokenizeAnswer(value).some((t) => isBrandToken(t, brand));
}
function brandedOptionIndex(optionTexts, brand) {
  if (brand.size === 0) return void 0;
  let best;
  let bestOverlap = 0;
  optionTexts.forEach((text, index) => {
    const overlap = tokenizeAnswer(text).filter((t) => isBrandToken(t, brand)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = index;
    }
  });
  return best;
}
const SIMILAR_THRESHOLD = 0.8;
function findSimilar(qa, questionText) {
  let best = null;
  for (const entry of qa) {
    for (const text of [entry.question, ...entry.aliases]) {
      const score = lexicalScore(text, questionText);
      if (score >= SIMILAR_THRESHOLD && (!best || score > best.score)) best = { entry, score };
    }
  }
  return best;
}
function mergeOptions(a, b) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const text of [...a, ...b]) {
    const key = text.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text.trim());
  }
  return out;
}
function captureAliases(signal) {
  const rawLabel = signal.label || signal.placeholder;
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const text of [rawLabel, ...signal.labelAliases ?? []]) {
    const t = text == null ? void 0 : text.trim();
    if (!t || t === signal.normalizedQuestion || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out;
}
function buildCaptureDraft(signal, value, context, now = Date.now(), extras = {}) {
  return {
    id: newId(),
    question: extras.question ?? signal.normalizedQuestion,
    aliases: captureAliases(signal),
    answer: value,
    answerType: "text",
    answerTemplate: null,
    mapsTo: null,
    variables: detectVariables(value),
    personas: [],
    tags: ["captured"],
    fieldType: signal.kind,
    options: mergeOptions(signal.options.map((o) => o.text), []),
    status: "needs_review",
    // suggest-only until approved (review gate)
    source: "captured",
    captureContext: context,
    // powers "generalize" in the Review tab
    siteScope: extras.siteScope ?? null,
    reviewNote: extras.reviewNote ?? `Captured — approve to autofill on exact wording`,
    lastWrongAt: null,
    okCount: 0,
    wrongCount: 0,
    createdAt: now,
    updatedAt: now
  };
}
function buildInferredEntry(signal, answer, context, now = Date.now()) {
  const cleaned = cleanCaptureQuestion(signal);
  return {
    id: newId(),
    question: isSkippedCapture(cleaned) ? signal.normalizedQuestion : cleaned.question,
    aliases: captureAliases(signal),
    answer,
    answerType: "text",
    answerTemplate: null,
    mapsTo: null,
    variables: detectVariables(answer),
    personas: [],
    tags: ["ai-inferred"],
    fieldType: signal.kind,
    options: mergeOptions(signal.options.map((o) => o.text), []),
    status: "needs_review",
    source: "inferred",
    captureContext: context,
    siteScope: null,
    reviewNote: "AI-inferred and verified on one site — approve to reuse elsewhere",
    lastWrongAt: null,
    okCount: 0,
    wrongCount: 0,
    createdAt: now,
    updatedAt: now
  };
}
function isSkippedCapture(p) {
  return "skip" in p;
}
const VALUE_PLACEHOLDER_RE = /^\s*(please\s+)?(select|choose|pick)\b[\w\s()/.…-]*$|^\s*required\s*$|^\s*-+\s*$|^\s*—+\s*$|^\s*\.{3}\s*$/i;
const SELECTED_COUNT_RE = /^\s*\d+\s+(items?\s+)?selected\s*$/i;
const OPAQUE_ID_VALUE_RE = /^(?:[0-9a-f]{24,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const JUNK_KEY_WORDS = /* @__PURE__ */ new Set([
  "select",
  "choose",
  "pick",
  "apply",
  "submit",
  "continue",
  "next",
  "back",
  "search",
  "open",
  "close",
  "edit",
  "add",
  "remove",
  "browse",
  "upload",
  "complete",
  "complet",
  "done",
  "ok",
  "yes",
  "no",
  "save",
  "cancel",
  "clear"
]);
const LEADING_NUMBERING_RE = /^\s*\d{1,3}\s*[.):\-–]?\s+/;
function cleanCaptureQuestion(signal) {
  const fixes = [];
  let label = (signal.label || signal.normalizedQuestion || "").trim();
  const optionTexts = (signal.options ?? []).map((o) => o.text.trim()).filter((t) => t.length >= 2);
  if (optionTexts.length >= 2) {
    const present = optionTexts.filter((t) => label.toLowerCase().includes(t.toLowerCase()));
    if (present.length >= 2) {
      let stripped = label;
      for (const t of present) {
        const i = stripped.toLowerCase().indexOf(t.toLowerCase());
        if (i !== -1) stripped = `${stripped.slice(0, i)} ${stripped.slice(i + t.length)}`;
      }
      stripped = stripped.replace(/\s+/g, " ").trim();
      if (stripped.length >= 3) {
        fixes.push(`stripped ${present.length} option texts from label`);
        label = stripped;
      } else {
        return { skip: "label is only its own option texts — no real question" };
      }
    }
  }
  if (LEADING_NUMBERING_RE.test(label)) {
    label = label.replace(LEADING_NUMBERING_RE, "").trim();
    fixes.push("stripped questionnaire numbering");
  }
  let question = fixes.length === 0 ? (signal.normalizedQuestion || canonical(label) || normalize(label)).trim() : canonical(label) || normalize(label);
  question = question.replace(LEADING_NUMBERING_RE, "").trim();
  if (!question) return { skip: "empty question after cleaning" };
  const words = question.split(/\s+/);
  if (words.length === 1 && JUNK_KEY_WORDS.has(words[0]))
    return { skip: `bare widget word "${question}" is not a question` };
  if (question.length < 3) return { skip: `question key "${question}" too short to ever match` };
  return { question, fixes };
}
const DATE_CUE_RE = /\b(date|month|year)\b/i;
function profileDateParts(profile) {
  if (!profile) return [];
  const out = [];
  const push = (value) => {
    const parts = parseDateParts(value);
    if (parts) out.push({ year: parts.year, month: parts.month, day: parts.day });
  };
  for (const w of profile.workHistory) {
    if (w.startDate) push(w.startDate);
    if (w.endDate) push(w.endDate);
  }
  for (const e of profile.education) {
    if (e.startDate) push(e.startDate);
    if (e.endDate) push(e.endDate);
  }
  if (profile.earliestStartDate) push(profile.earliestStartDate);
  return out;
}
function canonicalizeDateCapture(raw, profile) {
  const trimmed = raw.trim();
  const slash = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const year = slash[3];
    const iso = (m, d) => `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (a > 12 && b <= 12) return { value: iso(b, a) };
    if (a <= 12 && b > 12) return { value: iso(a, b) };
    if (a > 12 && b > 12) return null;
    if (a === b) return { value: iso(a, b) };
    const known = profileDateParts(profile);
    const mmdd = known.some((k) => k.year === year && k.month === String(a).padStart(2, "0"));
    const ddmm = known.some((k) => k.year === year && k.month === String(b).padStart(2, "0"));
    if (mmdd && !ddmm) return { value: iso(a, b) };
    if (ddmm && !mmdd) return { value: iso(b, a) };
    return { ambiguous: true };
  }
  const monthYear = trimmed.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (monthYear && parseInt(monthYear[1], 10) > 12) return null;
  const parts = parseDateParts(trimmed);
  if (!parts) return null;
  const hasDay = /\d{4}-\d{1,2}-\d{1,2}/.test(trimmed) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(trimmed) || /^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}$/.test(trimmed);
  return { value: hasDay ? `${parts.year}-${parts.month}-${parts.day}` : `${parts.year}-${parts.month}` };
}
function prepareCaptureValue(signal, raw, context, hostname, profile) {
  const value = raw.trim();
  if (!value) return { skip: "empty value" };
  if (signal.questionSource === "identifier" || signal.questionSource === "section")
    return { skip: `question key from ${signal.questionSource} — unreliable across sites` };
  const cleaned = cleanCaptureQuestion(signal);
  if (isSkippedCapture(cleaned)) return cleaned;
  const question = cleaned.question;
  if (looksEeoLoose(signal.label) || looksEeoLoose(question) || looksEeoLoose(signal.normalizedQuestion))
    return { skip: "EEO/demographic topic — never captured" };
  if (VALUE_PLACEHOLDER_RE.test(value) || SELECTED_COUNT_RE.test(value))
    return { skip: "placeholder / multi-select counter, not an answer" };
  if (OPAQUE_ID_VALUE_RE.test(value)) return { skip: "opaque widget id, not an answer" };
  const dateLike = signal.kind === "date" || (signal.kind === "text" || signal.kind === "custom-dropdown") && DATE_CUE_RE.test(signal.label);
  if (dateLike) {
    const canon = canonicalizeDateCapture(value, profile);
    if (canon && "ambiguous" in canon)
      return { skip: `ambiguous DD/MM date "${value}" — could not disambiguate` };
    if (canon) return { value: canon.value, siteScope: null, note: "", question };
    if (signal.kind === "date") return { skip: `unparseable date "${value}"` };
  }
  if (isContextBranded(value, context, hostname))
    return {
      value,
      siteScope: hostname,
      note: `Mentions this company — scoped to ${hostname}`,
      question
    };
  if (isContextBranded(`${signal.label} ${question}`, context, hostname))
    return {
      value,
      siteScope: hostname,
      note: `Question names this company — scoped to ${hostname}`,
      question
    };
  return { value, siteScope: null, note: "", question };
}
function wrongVerdictAction(entry) {
  if (entry.source !== "captured" && entry.source !== "inferred") return "none";
  if (entry.status === "needs_review") return "none";
  return (entry.wrongCount ?? 0) >= 1 ? "demote" : "strike";
}
function shouldSilentMerge(value, entry, context, hostname = "") {
  const same = entry.answer.trim().toLowerCase() === value.trim().toLowerCase();
  return same || isContextBranded(value, context, hostname);
}
function mergeAsAlias(existing, questionText, options = [], now = Date.now()) {
  const alias = questionText.trim();
  const known = [existing.question, ...existing.aliases].map((t) => t.toLowerCase());
  const mergedOptions = mergeOptions(existing.options, options);
  const aliasNew = alias !== "" && !known.includes(alias.toLowerCase());
  const optionsGrew = mergedOptions.length !== existing.options.length;
  if (aliasNew || optionsGrew) {
    return {
      ...existing,
      aliases: aliasNew ? [...existing.aliases, alias] : existing.aliases,
      options: mergedOptions,
      updatedAt: now
    };
  }
  return existing;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function findGeneralizations(answer, context) {
  if (!context) return [];
  const spans = [];
  const sources = [
    [context.company, "company"],
    [context.role, "role"],
    [context.location, "location"]
  ];
  for (const [literal, variable] of sources) {
    if (!literal || literal.trim().length < 3) continue;
    const re = new RegExp(`(?<![\\w])${escapeRegExp(literal.trim())}(?![\\w])`, "gi");
    for (const m of answer.matchAll(re)) {
      spans.push({ start: m.index, end: m.index + m[0].length, literal: m[0], variable });
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const result = [];
  let lastEnd = -1;
  for (const span of spans) {
    if (span.start >= lastEnd) {
      result.push(span);
      lastEnd = span.end;
    }
  }
  return result;
}
function applyGeneralizations(answer, spans) {
  const sorted = [...spans].sort((a, b) => b.start - a.start);
  let result = answer;
  for (const span of sorted) {
    result = `${result.slice(0, span.start)}{{${span.variable}}}${result.slice(span.end)}`;
  }
  return result;
}
const VALIDATION_KEY = "flashfiller_validation_v1";
const VALIDATION_SCHEMA_VERSION = 1;
const MAX_STORED_REPORTS = 5;
function isStoredReport(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw;
  return typeof r.url === "string" && typeof r.at === "number" && Array.isArray(r.entries);
}
async function readEnvelope() {
  const result = await chrome.storage.local.get(VALIDATION_KEY);
  const raw = result[VALIDATION_KEY];
  const reports = Array.isArray(raw == null ? void 0 : raw.reports) ? raw.reports.filter(isStoredReport) : [];
  return { schemaVersion: VALIDATION_SCHEMA_VERSION, reports };
}
async function saveValidationReport(report) {
  const env = await readEnvelope();
  env.reports = [report, ...env.reports.filter((r) => r.url !== report.url)].slice(
    0,
    MAX_STORED_REPORTS
  );
  await chrome.storage.local.set({ [VALIDATION_KEY]: env });
}
async function loadValidationReports() {
  return (await readEnvelope()).reports;
}
export {
  brandedOptionIndex as a,
  brandTokens as b,
  buildCaptureDraft as c,
  detectVariables as d,
  isContextBranded as e,
  findSimilar as f,
  saveValidationReport as g,
  buildInferredEntry as h,
  isSkippedCapture as i,
  findGeneralizations as j,
  applyGeneralizations as k,
  mergeOptions as l,
  mergeAsAlias as m,
  loadValidationReports as n,
  prepareCaptureValue as p,
  resolveVariables as r,
  shouldSilentMerge as s,
  wrongVerdictAction as w
};
