var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { a as parseDateParts, g as getStore, S as SeedCatalogSchema, u as upsertQA, o as onStoreChanged, b as patchQA, c as upsertOptionSet, n as newId } from "./storage-DrgdSKCL.js";
import { r as readProfilePath, p as pickDocument, h as hostMatchesDomain, g as getAdapter, e as extractPageContext, l as listDocumentMeta, a as enabledForPage, b as getDocument, c as base64ToBytes } from "./seed-CEX56cSr.js";
import { s as stripParentheticals, c as classifyIntent, b as buildEeoStored, a as selectPlanTargets, e as eeoStoredAnswerFor, d as censusEntry, n as neighborLabels, f as selectRelevantQA, S as STANCES, g as deriveLifeState, h as buildProfileFacts, i as extractPlanJson, v as validatePlan, j as buildRepairItems, k as planEntryToMatch } from "./planner-B0wKr8bs.js";
import { c as canonical, n as normalize, E as EEO_TOPIC_RE, h as humanizeIdentifier, a as canonicalAnswer, l as lexicalScore, b as crossesEeoTopic, d as lexicalAnswerScore, t as tokenizeAnswer, e as looksEeoLoose } from "./eeo-C8X2VxtH.js";
import { b as brandTokens, d as detectVariables, a as brandedOptionIndex, p as prepareCaptureValue, i as isSkippedCapture, f as findSimilar, s as shouldSilentMerge, m as mergeAsAlias, c as buildCaptureDraft, e as isContextBranded, w as wrongVerdictAction, g as saveValidationReport, r as resolveVariables, h as buildInferredEntry } from "./validation-report-CTSZ6ve_.js";
const FF_ID_ATTR = "data-ff-id";
let idCounter = 0;
const MULTIPLICITY_RE = /\b(list|each|all of|last \d+|previous (?:employers?|positions?|roles?)|employers?|employment history|work history|education history|references)\b/i;
const CONSENT_RE = /\b(agree|consent|certify|acknowledge|accept|terms|privacy policy|authorize .* (?:contact|background)|signature)\b/i;
const CERTIFICATION_RE = /\bcertify\b.{0,80}\b(true|accurate|correct|complete)|\b(true|accurate|correct)\b.{0,40}\b(information|answers|statements)|\bat.?will\b|\backnowledg\w+\b.{0,60}\bat.?will\b/i;
const EEO_RE = EEO_TOPIC_RE;
const SEARCH_RE = /\b(search|filter)\b/i;
const SITE_CHROME_SELECTOR = 'header, footer, nav, [role="banner"], [role="navigation"], [role="menubar"], [role="contentinfo"], [data-automation-id*="languageSelector"], [data-automation-id="globalHeader"], [data-automation-id="header"], [data-automation-id="utilityButtonBar"]';
function isHiddenOrHoneypot(el) {
  if (el.closest('[hidden], [aria-hidden="true"]')) return true;
  let node = el;
  while (node) {
    const style = node.style;
    if (style.display === "none" || style.visibility === "hidden") return true;
    if (typeof getComputedStyle === "function") {
      const computed = getComputedStyle(node);
      if (computed.display === "none" || computed.visibility === "hidden") return true;
    }
    if (parseInt(style.left || "0", 10) < -999 || parseInt(style.top || "0", 10) < -999 || style.opacity === "0")
      return true;
    node = node.parentElement;
  }
  const width = el.getAttribute("width");
  const height = el.getAttribute("height");
  if ((width === "0" || height === "0") && el.tagName === "INPUT") return true;
  return false;
}
function isOffscreenPositioned(el) {
  let node = el;
  while (node) {
    const style = node.style;
    if (parseInt(style.left || "0", 10) < -999 || parseInt(style.top || "0", 10) < -999) return true;
    node = node.parentElement;
  }
  return false;
}
function isSkippableInput(el) {
  const type = (el.type || "text").toLowerCase();
  if (["hidden", "submit", "button", "image", "reset"].includes(type)) return true;
  if (el.disabled) return true;
  const isComboTrigger = el.getAttribute("role") === "combobox" || el.hasAttribute("aria-haspopup") || hasComboboxSignals(el);
  if (el.readOnly && !isComboTrigger) return true;
  if (el.closest(MULTISELECT_CONTAINER_SELECTOR)) return false;
  if (isComboTrigger) return false;
  if (type === "search") return true;
  if (SEARCH_RE.test(el.name) || SEARCH_RE.test(el.id) || el.getAttribute("role") === "searchbox")
    return true;
  return false;
}
function labelFromFor(el, doc) {
  var _a;
  if (!el.id) return null;
  try {
    const escaped = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(el.id) : el.id.replace(/["\\]/g, "\\$&");
    const label = doc.querySelector(`label[for="${escaped}"]`);
    return ((_a = label == null ? void 0 : label.textContent) == null ? void 0 : _a.trim()) || null;
  } catch {
    return null;
  }
}
function labelFromWrap(el) {
  var _a;
  const label = el.closest("label");
  if (!label) return null;
  const clone = label.cloneNode(true);
  clone.querySelectorAll("input, select, textarea, button").forEach((n) => n.remove());
  return ((_a = clone.textContent) == null ? void 0 : _a.trim()) || null;
}
function labelFromAria(el, doc) {
  var _a;
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map((id) => {
      var _a2, _b;
      return ((_b = (_a2 = doc.getElementById(id)) == null ? void 0 : _a2.textContent) == null ? void 0 : _b.trim()) ?? "";
    }).filter(Boolean).join(" ");
    if (text) return text;
  }
  return ((_a = el.getAttribute("aria-label")) == null ? void 0 : _a.trim()) || null;
}
const NON_LABEL_SIBLING = '[role="listbox"], [role="menu"], [role="tree"], [role="dialog"]';
function labelFromPrecedingText(el) {
  var _a;
  let node = el;
  for (let depth = 0; depth < 4 && node; depth++) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (!sibling.querySelector("input, select, textarea") && !sibling.matches(NON_LABEL_SIBLING) && !sibling.querySelector('[role="option"], [role="menuitem"]') && // A neighboring pill-question block contains only BUTTONS — its
      // question+options text must never leak in as this field's label
      // (review catch 2026-07-17: wrong-question pill autofill).
      !sibling.querySelector('button[aria-pressed], [class*="pill" i] button')) {
        const text = (_a = sibling.textContent) == null ? void 0 : _a.trim();
        if (text && text.length > 1 && text.length < 300) return text;
      }
      sibling = sibling.previousElementSibling;
    }
    node = node.parentElement;
  }
  return null;
}
const PLACEHOLDER_LABEL_RE = /^\s*(please\s+)?(select|choose|pick)\b[\w\s()/-]*$|^\s*required\s*$/i;
const BOILERPLATE_LABEL_RE = /^\s*(\*+|optional|required|search|clear|edit|remove|delete|help|\?|close|add|x)\s*$/i;
const QUESTION_WORD_RE = /\b(who|what|when|where|which|how|have|has|are|is|do|does|did|will|would|can)\b/i;
const HUMANIZED_ID_RE = /^[a-z][a-z\s]*\d{2,}$/i;
function salvageLongText(text) {
  const question = text.match(/[^.!?\n]{4,200}\?/);
  if (question) return question[0].trim();
  const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length >= 4 && l.length <= 120);
  return firstLine ?? null;
}
function labelQuality(raw) {
  let text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { text, quality: 0 };
  if (BOILERPLATE_LABEL_RE.test(text)) return { text, quality: 0 };
  if (!/[a-z]/i.test(text)) return { text, quality: 0 };
  let penalty = 1;
  if (text.length > 160) {
    const salvaged = salvageLongText(text);
    if (salvaged) {
      text = salvaged;
      penalty = 0.9;
    } else if (text.length > 300) {
      return { text, quality: 0 };
    }
  }
  if (/^[MDYHhms\d\s/\-.:]+$/.test(text)) return { text, quality: 0.05 };
  let q = penalty;
  if (/\?\s*$/.test(text)) q *= 1.2;
  else if (/:\s*$/.test(text)) q *= 1.1;
  if (text.length < 3) q *= 0.5;
  else if (text.length <= 7) q *= 0.85;
  else if (text.length > 120) q *= 0.7;
  const letters = text.replace(/[^a-z]/gi, "").length;
  if (letters / text.length < 0.4) q *= 0.3;
  if (HUMANIZED_ID_RE.test(text)) q *= 0.25;
  if (QUESTION_WORD_RE.test(text)) q *= 1.1;
  if (PLACEHOLDER_LABEL_RE.test(text)) q *= 0.1;
  return { text, quality: Math.min(1.2, q) };
}
function labelsFromTable(el) {
  var _a, _b, _c;
  const cell = el.closest("td");
  if (!cell || !(cell instanceof HTMLTableCellElement)) return [];
  const out = [];
  const table = cell.closest("table");
  const headRow = (table == null ? void 0 : table.querySelector("thead tr")) ?? (table == null ? void 0 : table.querySelector("tr"));
  const headCell = headRow == null ? void 0 : headRow.children[cell.cellIndex];
  const headText = (_a = headCell == null ? void 0 : headCell.textContent) == null ? void 0 : _a.trim();
  if (headText && headCell !== cell) out.push(headText);
  const row = cell.closest("tr");
  const rowHeader = (_c = (_b = row == null ? void 0 : row.querySelector("th")) == null ? void 0 : _b.textContent) == null ? void 0 : _c.trim();
  if (rowHeader) out.push(rowHeader);
  return out;
}
function labelFromDt(el) {
  var _a;
  const dd = el.closest("dd");
  let sib = (dd == null ? void 0 : dd.previousElementSibling) ?? null;
  while (sib && sib.tagName !== "DT") sib = sib.previousElementSibling;
  return ((_a = sib == null ? void 0 : sib.textContent) == null ? void 0 : _a.trim()) || null;
}
const CONTAINER_STOP = /* @__PURE__ */ new Set(["FORM", "FIELDSET", "BODY", "MAIN", "SECTION", "TABLE"]);
function labelFromSoloContainer(el) {
  var _a;
  let node = el.parentElement;
  for (let depth = 0; node && depth < 5; depth++) {
    const controls = node.querySelectorAll(
      'input, select, textarea, [role="combobox"], button[aria-pressed]'
    );
    if (controls.length === 1) {
      const clone = node.cloneNode(true);
      clone.querySelectorAll('input, select, textarea, button, [role="listbox"], [role="option"], script, style').forEach((n) => n.remove());
      const text = (_a = clone.textContent) == null ? void 0 : _a.trim();
      if (text && text.length > 1) return text;
    }
    if (controls.length > 1) return null;
    if (CONTAINER_STOP.has(node.tagName)) return null;
    node = node.parentElement;
  }
  return null;
}
function resolveLabel(el, doc) {
  const explicitRanks = /* @__PURE__ */ new Map();
  const push = (list, text, rank, explicit = false) => {
    const t = text == null ? void 0 : text.trim();
    if (!t) return;
    list.push({ text: t, rank });
    if (explicit) explicitRanks.set(t, rank);
  };
  const harvested = [];
  push(harvested, labelFromFor(el, doc), 1, true);
  push(harvested, labelFromWrap(el), 0.98, true);
  push(harvested, labelFromAria(el, doc), 0.9, true);
  for (const t of labelsFromTable(el)) push(harvested, t, 0.8);
  push(harvested, labelFromDt(el), 0.8);
  push(harvested, labelFromPrecedingText(el), 0.75);
  push(harvested, labelFromSoloContainer(el), 0.65);
  const scored = harvested.map((c) => {
    const { text, quality } = labelQuality(c.text);
    return { text, explicit: explicitRanks.has(c.text), quality, score: c.rank * quality };
  }).filter((c) => c.score > 0);
  scored.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
  if (scored.length === 0) {
    const rawFirst = harvested.find((c) => c.text);
    return { best: (rawFirst == null ? void 0 : rawFirst.text) ?? "", explicit: false, aliases: [] };
  }
  const explicitOk = scored.find((c) => c.explicit && c.quality >= 0.5);
  const best = explicitOk ?? scored[0];
  const aliases = [];
  const seen = /* @__PURE__ */ new Set([best.text.toLowerCase()]);
  for (const c of scored.filter((s) => s !== best)) {
    const key = c.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(c.text);
    if (aliases.length >= 4) break;
  }
  return { best: best.text, explicit: best.explicit, aliases };
}
function getLabel(el, doc) {
  return resolveLabel(el, doc).best;
}
function resolveOptionText(el, doc) {
  var _a, _b;
  const own = labelFromFor(el, doc) ?? labelFromWrap(el) ?? labelFromAria(el, doc);
  if (own) return own;
  let sib = el.nextSibling;
  while (sib) {
    const text = sib.nodeType === Node.TEXT_NODE ? (_a = sib.textContent) == null ? void 0 : _a.trim() : sib instanceof HTMLElement && !sib.querySelector("input, select, textarea") ? (_b = sib.textContent) == null ? void 0 : _b.trim() : void 0;
    if (text) return text;
    if (sib instanceof HTMLElement && sib.querySelector("input, select, textarea")) break;
    sib = sib.nextSibling;
  }
  return "";
}
function getSectionContext(el) {
  var _a, _b, _c, _d;
  const fieldset = el.closest("fieldset");
  const legend = (_b = (_a = fieldset == null ? void 0 : fieldset.querySelector("legend")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim();
  if (legend) return legend;
  const section = el.closest('section, [role="group"], form');
  const heading = (_d = (_c = section == null ? void 0 : section.querySelector("h1, h2, h3, h4, h5, h6")) == null ? void 0 : _c.textContent) == null ? void 0 : _d.trim();
  return heading ?? "";
}
const REPEAT_HEADING_RE = /(?:experience|employment|employer|position|job|work|education|reference)[^0-9]*(\d+)\s*$/i;
function headingSectionIndex(sectionContext) {
  const h = sectionContext.match(REPEAT_HEADING_RE);
  if (!h) return void 0;
  const n = parseInt(h[1], 10);
  return n >= 1 && n <= 50 ? n - 1 : void 0;
}
function sectionKindOf(text) {
  if (!text) return void 0;
  if (/educat|school|universit|college|degree/i.test(text)) return "education";
  if (/work|employ|experience|job|position/i.test(text)) return "work";
  return void 0;
}
const REPEAT_ID_RE = /^([a-zA-Z]\w*)-(\d+)--/;
const REPEAT_AUTOMATION_RE = /^([a-zA-Z]\w*)-(\d+)$/;
function getRepeatKey(el) {
  let node = el;
  while (node) {
    const idMatch = node.id.match(REPEAT_ID_RE);
    if (idMatch) return { family: idMatch[1], key: `${idMatch[1]}-${idMatch[2]}` };
    const auto = node.getAttribute("data-automation-id");
    const autoMatch = auto == null ? void 0 : auto.match(REPEAT_AUTOMATION_RE);
    if (autoMatch) return { family: autoMatch[1], key: `${autoMatch[1]}-${autoMatch[2]}` };
    node = node.parentElement;
  }
  return null;
}
function selectOptions(el) {
  return [...el.options].filter((o) => o.value !== "" || o.text.trim() !== "").map((o) => ({ value: o.value, text: o.text.trim() }));
}
function inputKind(el) {
  const type = (el.type || "text").toLowerCase();
  switch (type) {
    case "password":
      return "password";
    case "email":
      return "email";
    case "tel":
      return "tel";
    case "url":
      return "url";
    case "number":
      return "number";
    case "date":
    case "month":
      return "date";
    case "radio":
      return "radio";
    case "checkbox":
      return "checkbox";
    case "file":
      return "file";
    default:
      return "text";
  }
}
const MULTISELECT_CONTAINER_SELECTOR = '[data-automation-id*="multiselect" i]';
function hasComboboxSignals(el) {
  if (el.tagName === "SELECT") return false;
  const role = el.getAttribute("role");
  if (role === "combobox") return true;
  const haspopup = el.getAttribute("aria-haspopup");
  if (haspopup === "listbox" || haspopup === "true") return true;
  const autocomplete = el.getAttribute("aria-autocomplete");
  if (autocomplete === "list" || autocomplete === "both") return true;
  if (el instanceof HTMLInputElement) {
    if (el.hasAttribute("aria-expanded")) return true;
  }
  const controlsId = el.getAttribute("aria-controls") ?? el.getAttribute("aria-owns");
  if (controlsId) {
    const target = el.ownerDocument.getElementById(controlsId.split(/\s+/)[0]);
    if ((target == null ? void 0 : target.getAttribute("role")) === "listbox") return true;
  }
  return false;
}
function isCustomDropdown(el) {
  if (el.tagName === "SELECT") return false;
  if (hasComboboxSignals(el)) return true;
  return el instanceof HTMLInputElement && !!el.closest(MULTISELECT_CONTAINER_SELECTOR);
}
const DROPDOWN_PLACEHOLDER_RE = /^(select|choose|pick|please\s|-+$|—+$|\.{3}$)/i;
const TRAILING_PLACEHOLDER_RE = /\b(please\s+)?(select|choose|pick)(\s+(one|an?\s+option|\.{3}|…))?(\s+\(?required\)?)?\s*$/i;
function isDropdownButton(el) {
  var _a;
  const role = el.getAttribute("role");
  if (el.tagName !== "BUTTON" && role !== "button") return false;
  if (el.hasAttribute("aria-pressed") && !el.getAttribute("aria-haspopup") && !el.hasAttribute("aria-expanded"))
    return false;
  const typeAttr = el.getAttribute("type");
  if (typeAttr === "submit" || typeAttr === "reset") return false;
  if (el.closest('nav, header, footer, [role="navigation"], [role="menubar"], [role="menu"], [role="tablist"]'))
    return false;
  const text = ((_a = el.textContent) == null ? void 0 : _a.trim()) ?? "";
  const hasPopupHint = !!el.getAttribute("aria-haspopup") || el.hasAttribute("aria-expanded");
  if (hasPopupHint && text === "") return true;
  return DROPDOWN_PLACEHOLDER_RE.test(text) || TRAILING_PLACEHOLDER_RE.test(text);
}
function stripLabelPlaceholder(label) {
  let text = label.trim();
  const stripped = text.replace(TRAILING_PLACEHOLDER_RE, "").trim();
  if (stripped !== "") text = stripped;
  return text.replace(/\s*\(?required\)?\s*$/i, "").trim() || text;
}
function ensureFieldId(el) {
  const existing = el.getAttribute(FF_ID_ATTR);
  if (existing) return existing;
  const id = `ff-${++idCounter}`;
  el.setAttribute(FF_ID_ATTR, id);
  return id;
}
function isRequired(el, label) {
  if (el.hasAttribute("required") || el.getAttribute("aria-required") === "true") return true;
  return /[*✱]\s*$/.test(label) || /^\s*\*/.test(label);
}
function isFilled(el, kind) {
  var _a;
  if (kind === "checkbox" || kind === "radio") return el.checked;
  if (kind === "contenteditable") return (el.textContent ?? "").trim() !== "";
  if (kind === "custom-dropdown") {
    const value = el.value;
    if (typeof value === "string" && value.trim() !== "") return true;
    const aria = el.getAttribute("aria-valuetext");
    if (aria && aria.trim() !== "") return true;
    const pillHolder = el instanceof HTMLInputElement ? el.closest(MULTISELECT_CONTAINER_SELECTOR) : null;
    const text = ((_a = (pillHolder ?? el).textContent) == null ? void 0 : _a.trim()) ?? "";
    if (text === "" || text.toLowerCase() === "required") return false;
    if (/\b(select|choose|pick|search)\b/i.test(text)) return false;
    if (/\b0\s+items?\s+selected\b/i.test(text)) return false;
    return true;
  }
  if (kind === "select") {
    const select = el;
    const chosen = select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    if (!chosen || chosen.value.trim() === "") return false;
    return !/^\s*(select|choose|please|pick|-+\s*$|—|\.{3})/i.test(chosen.text);
  }
  return (el.value ?? "").trim() !== "";
}
function interestingDataAttrs(el) {
  const out = [];
  for (const attr of el.getAttributeNames()) {
    if (attr.startsWith("data-") && attr !== FF_ID_ATTR && /field|question|label|name|automation/.test(attr)) {
      const value = el.getAttribute(attr);
      if (value) out.push(value);
    }
  }
  return out;
}
function buildSignal(el, kind, doc, options = []) {
  const resolved = resolveLabel(el, doc);
  let label = stripLabelPlaceholder(resolved.best);
  if (!label && kind === "custom-dropdown") {
    const own = (el.textContent ?? "").trim();
    const remainder = own.replace(TRAILING_PLACEHOLDER_RE, "").replace(/\s*\(?required\)?\s*$/i, "").trim();
    if (remainder !== "" && remainder.toLowerCase() !== own.toLowerCase()) label = remainder;
  }
  const placeholder = el.getAttribute("placeholder") ?? "";
  const name = el.getAttribute("name") ?? "";
  const id = el.getAttribute("id") ?? "";
  const sectionContext = getSectionContext(el);
  const questionText = label || placeholder || humanizeIdentifier(name || id) || sectionContext;
  const questionSource = label ? "label" : placeholder ? "placeholder" : humanizeIdentifier(name || id) ? "identifier" : "section";
  const normalizedQuestion = canonical(questionText) || normalize(questionText);
  const rawText = [label, placeholder, sectionContext].filter(Boolean).join(" ");
  const consentText = `${label} ${sectionContext}`;
  const eeoText = `${label} ${name} ${id} ${sectionContext}`;
  return {
    fieldId: ensureFieldId(el),
    kind,
    label,
    placeholder,
    autocomplete: (el.getAttribute("autocomplete") ?? "").toLowerCase(),
    name,
    id,
    dataAttrs: interestingDataAttrs(el),
    required: isRequired(el, label),
    options,
    sectionContext,
    sectionIndex: headingSectionIndex(sectionContext),
    sectionKind: sectionKindOf(sectionContext),
    multiplicityCue: MULTIPLICITY_RE.test(`${label} ${placeholder}`),
    normalizedQuestion,
    rawText,
    questionSource,
    labelAliases: resolved.aliases,
    filled: isFilled(el, kind),
    consentLike: kind === "checkbox" && CONSENT_RE.test(consentText),
    certificationLike: kind === "checkbox" && CERTIFICATION_RE.test(consentText),
    eeoLike: EEO_RE.test(eeoText)
  };
}
function dateSegmentRole(el) {
  const auto = el.getAttribute("data-automation-id") ?? "";
  const m = auto.match(/^dateSection(Month|Day|Year)/i);
  if (m) return m[1].toLowerCase();
  return null;
}
function dateSegmentWrapper(el) {
  return el.closest('[data-automation-id="dateInputWrapper"], [data-automation-id="dateInput"]') ?? el.parentElement ?? el;
}
const SPINBUTTON_NOISE_RE = /^current value is\b/i;
function dateGroupField(wrapper, segments, doc) {
  const signal = buildSignal(wrapper, "date", doc);
  const parts = [segments.month, segments.day, segments.year].filter(
    (s) => Boolean(s)
  );
  if (SPINBUTTON_NOISE_RE.test(signal.label)) {
    signal.label = "";
    const identifier = humanizeIdentifier(signal.name || signal.id);
    const questionText = signal.placeholder || identifier || signal.sectionContext;
    signal.normalizedQuestion = canonical(questionText) || normalize(questionText);
    signal.questionSource = signal.placeholder ? "placeholder" : identifier ? "identifier" : "section";
    signal.rawText = [signal.placeholder, signal.sectionContext].filter(Boolean).join(" ");
  }
  if (!signal.label) {
    const fallback = parts.map((s) => getLabel(s, doc)).find((l) => l && !SPINBUTTON_NOISE_RE.test(l)) ?? "";
    if (fallback) {
      signal.label = fallback;
      signal.normalizedQuestion = canonical(fallback);
      signal.rawText = [fallback, signal.sectionContext].filter(Boolean).join(" ");
      signal.questionSource = "label";
    }
  }
  if (!signal.normalizedQuestion && signal.label) {
    signal.normalizedQuestion = normalize(signal.label);
  }
  signal.required = signal.required || parts.some((s) => isRequired(s, ""));
  signal.filled = parts.every((s) => s.value.trim() !== "");
  return { el: wrapper, dateSegmentEls: segments, signal };
}
const UPLOAD_ZONE_SELECTOR = '[data-automation-id*="file-upload" i], [data-automation-id*="fileupload" i], [data-automation-id*="attachment" i], [class*="dropzone" i], [class*="drop-zone" i], [class*="file-upload" i], [class*="upload" i], [aria-label*="upload" i]';
const DRAG_DROP_TEXT_RE = /\b(drag\s*(and|&|'?n'?)?\s*drop|drop\s+(a\s+)?(files?|here|your))\b/i;
function fileUploadZone(anchor) {
  let node = anchor.parentElement;
  for (let depth = 0; node && depth < 6; depth++) {
    if (node.matches(UPLOAD_ZONE_SELECTOR)) return node;
    if (DRAG_DROP_TEXT_RE.test(node.textContent ?? "")) return node;
    if (CONTAINER_STOP.has(node.tagName)) return null;
    node = node.parentElement;
  }
  return null;
}
function deaccent(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
const RESUME_CUE_RE = /\b(resume|curriculum\s+vitae|cv)\b/i;
const COVER_CUE_RE = /\bcover[\s_-]*letter\b/i;
function docCueOf(text) {
  const t = deaccent(text);
  if (RESUME_CUE_RE.test(t)) return "resume";
  if (COVER_CUE_RE.test(t)) return "coverLetter";
  return "other";
}
const UPLOAD_BUTTON_LABEL_RE = /^(select|choose|browse|upload|attach)\b[\w\s]*$/i;
function fileUploadField(input, doc) {
  var _a, _b;
  const zone = fileUploadZone(input) ?? void 0;
  const signal = buildSignal(input, "file", doc);
  const acceptAttr = (_a = input.getAttribute("accept")) == null ? void 0 : _a.trim();
  if (acceptAttr) signal.accept = acceptAttr;
  if (zone && (!signal.label || UPLOAD_BUTTON_LABEL_RE.test(signal.label))) {
    const resolved = resolveLabel(zone, doc);
    let zoneLabel = stripLabelPlaceholder(resolved.best);
    if (!zoneLabel || UPLOAD_BUTTON_LABEL_RE.test(zoneLabel)) {
      const clone = zone.cloneNode(true);
      clone.querySelectorAll("input, select, textarea, button, script, style").forEach((n) => n.remove());
      const own = ((_b = clone.textContent) == null ? void 0 : _b.replace(/\s+/g, " ").trim()) ?? "";
      if (own.length > 1) {
        const { text, quality } = labelQuality(own);
        if (quality > 0) zoneLabel = text;
      }
    }
    if (zoneLabel) {
      signal.label = zoneLabel;
      signal.normalizedQuestion = canonical(zoneLabel) || normalize(zoneLabel);
      signal.rawText = [zoneLabel, signal.sectionContext].filter(Boolean).join(" ");
      signal.questionSource = "label";
    }
  }
  signal.docCue = docCueOf(
    [
      signal.label,
      ...signal.labelAliases ?? [],
      (zone == null ? void 0 : zone.textContent) ?? "",
      signal.name,
      signal.id,
      signal.dataAttrs.join(" "),
      signal.sectionContext
    ].join(" ")
  );
  if (!signal.normalizedQuestion) signal.normalizedQuestion = normalize(signal.label || "file upload");
  return { el: input, uploadZoneEl: zone, signal };
}
function radioGroupSignal(radios, doc) {
  var _a, _b;
  const first = radios[0];
  const options = radios.map((radio) => ({
    value: radio.value,
    text: resolveOptionText(radio, doc) || radio.value
  }));
  const fieldset = first.closest("fieldset");
  const legend = (_b = (_a = fieldset == null ? void 0 : fieldset.querySelector("legend")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim();
  const ariaGroup = first.closest('[role="radiogroup"], [role="group"]');
  const groupLabel = legend ?? (ariaGroup ? labelFromAria(ariaGroup, doc) : null) ?? labelFromAria(first, doc) ?? labelFromPrecedingText(first.parentElement ?? first) ?? "";
  const signal = buildSignal(first, "radio", doc, options);
  if (groupLabel) {
    signal.label = groupLabel;
    signal.normalizedQuestion = canonical(groupLabel);
    signal.rawText = [groupLabel, signal.sectionContext].filter(Boolean).join(" ");
    signal.questionSource = "label";
  }
  signal.filled = radios.some((r) => r.checked);
  signal.eeoLike = EEO_RE.test(`${groupLabel} ${first.name} ${signal.sectionContext}`);
  return { el: first, groupEls: radios, signal };
}
const EDU_ITEM_RE = /school|universit|college|degree|field of study|gpa|graduat/i;
const WORK_ITEM_RE = /job.?title|company|employer|role description|currently work/i;
function structuralRepeatItem(el) {
  let node = el.parentElement;
  for (let depth = 0; node && depth < 8; depth++) {
    const parent = node.parentElement;
    if (parent && typeof node.className === "string" && node.className) {
      const reference = node;
      const siblings = [...parent.children].filter(
        (c) => c instanceof HTMLElement && c.tagName === reference.tagName && c.className === reference.className
      );
      if (siblings.length >= 2 && reference.querySelectorAll("input, select, textarea").length >= 2 && siblings.every((s) => s.querySelector("input, select, textarea"))) {
        return { item: reference, index: siblings.indexOf(reference) };
      }
    }
    node = parent;
  }
  return null;
}
function classifyRepeatItem(item) {
  const bits = [...item.querySelectorAll("label, legend")].map((l) => l.textContent ?? "");
  for (const labelled of item.querySelectorAll("[aria-label]"))
    bits.push(labelled.getAttribute("aria-label") ?? "");
  const text = bits.join(" ");
  if (EDU_ITEM_RE.test(text)) return "education";
  if (WORK_ITEM_RE.test(text)) return "work";
  return void 0;
}
function checkboxGroupSignal(boxes, doc) {
  var _a, _b;
  const first = boxes[0];
  const options = boxes.map((box) => ({
    value: box.value,
    text: resolveOptionText(box, doc) || box.value
  }));
  const container = first.closest('fieldset, [role="group"]');
  const legend = (_b = (_a = container == null ? void 0 : container.querySelector("legend")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim();
  const groupLabel = legend ?? (container ? labelFromAria(container, doc) : null) ?? labelFromAria(first, doc) ?? labelFromPrecedingText(container ?? first.parentElement ?? first) ?? "";
  const signal = buildSignal(first, "checkbox", doc, options);
  if (groupLabel) {
    signal.label = groupLabel;
    signal.normalizedQuestion = canonical(groupLabel);
    signal.rawText = [groupLabel, signal.sectionContext].filter(Boolean).join(" ");
    signal.questionSource = "label";
  }
  signal.filled = boxes.some((b) => b.checked);
  signal.consentLike = CONSENT_RE.test(`${groupLabel} ${signal.sectionContext}`);
  signal.certificationLike = CERTIFICATION_RE.test(`${groupLabel} ${signal.sectionContext}`);
  signal.eeoLike = EEO_RE.test(`${groupLabel} ${first.name} ${signal.sectionContext}`);
  return { el: first, groupEls: boxes, signal };
}
function detectFields(root = document) {
  var _a, _b, _c, _d;
  const doc = (root instanceof Document ? root : root.ownerDocument) ?? document;
  const results = [];
  const radioGroups = /* @__PURE__ */ new Map();
  const dateGroups = /* @__PURE__ */ new Map();
  const checkboxes = [];
  const repeatRanks = /* @__PURE__ */ new Map();
  const registerRepeatKey = (el) => {
    const rk = getRepeatKey(el);
    if (!rk) return;
    let ranks = repeatRanks.get(rk.family);
    if (!ranks) {
      ranks = /* @__PURE__ */ new Map();
      repeatRanks.set(rk.family, ranks);
    }
    if (!ranks.has(rk.key)) ranks.set(rk.key, ranks.size);
  };
  const candidates = root.querySelectorAll(
    'input, textarea, select, [contenteditable="true"], [role="combobox"], [aria-haspopup="listbox"], button, [role="button"]'
  );
  for (const el of candidates) {
    if (el.closest("[data-flashfiller]")) continue;
    if (el.closest(SITE_CHROME_SELECTOR)) continue;
    if (el.closest(".react-datepicker")) continue;
    if (isHiddenOrHoneypot(el)) {
      const backingSelect = el instanceof HTMLSelectElement && selectOptions(el).length >= 2;
      const uploadInput = el instanceof HTMLInputElement && (el.type || "").toLowerCase() === "file" && !isOffscreenPositioned(el);
      if (!backingSelect && !uploadInput) continue;
    }
    registerRepeatKey(el);
    if (el instanceof HTMLInputElement) {
      const comboContainer = el.closest('[role="combobox"], [aria-haspopup="listbox"]');
      if (comboContainer && comboContainer !== el) continue;
      if (isSkippableInput(el)) continue;
      const segmentRole = dateSegmentRole(el);
      if (segmentRole) {
        const wrapper = dateSegmentWrapper(el);
        const segments = dateGroups.get(wrapper) ?? {};
        if (!segments[segmentRole]) segments[segmentRole] = el;
        dateGroups.set(wrapper, segments);
        continue;
      }
      const kind = inputKind(el);
      if (kind === "file") {
        results.push(fileUploadField(el, doc));
        continue;
      }
      if (kind === "radio") {
        const key = el.name || `__anon-${ensureFieldId(el)}`;
        const group = radioGroups.get(key) ?? [];
        group.push(el);
        radioGroups.set(key, group);
        continue;
      }
      if (kind === "checkbox") {
        checkboxes.push(el);
        continue;
      }
      if (isCustomDropdown(el)) {
        results.push({ el, signal: buildSignal(el, "custom-dropdown", doc) });
        continue;
      }
      if (el.closest(".react-datepicker-wrapper, .react-datepicker__input-container")) {
        const signal = buildSignal(el, "date", doc);
        signal.dateWidget = "react-datepicker";
        results.push({ el, signal });
        continue;
      }
      results.push({ el, signal: buildSignal(el, kind, doc) });
    } else if (el instanceof HTMLTextAreaElement) {
      if (el.disabled || el.readOnly) continue;
      results.push({ el, signal: buildSignal(el, "textarea", doc) });
    } else if (el instanceof HTMLSelectElement) {
      if (el.disabled) continue;
      results.push({ el, signal: buildSignal(el, "select", doc, selectOptions(el)) });
    } else if (el.getAttribute("contenteditable") === "true") {
      results.push({ el, signal: buildSignal(el, "contenteditable", doc) });
    } else if (isCustomDropdown(el) || isDropdownButton(el)) {
      const controlsId = el.getAttribute("aria-controls");
      if ((el.tagName === "BUTTON" || el.getAttribute("role") === "button") && controlsId && [...root.querySelectorAll('[role="combobox"]')].some(
        (c) => c !== el && c.getAttribute("aria-controls") === controlsId
      ))
        continue;
      if (el.matches(MULTISELECT_CONTAINER_SELECTOR) && !el.matches('[role="combobox"], [aria-haspopup="listbox"]') && el.querySelector('input:not([type="hidden"])'))
        continue;
      if ((el.tagName === "BUTTON" || el.getAttribute("role") === "button") && (el.closest(MULTISELECT_CONTAINER_SELECTOR) || ((_a = el.parentElement) == null ? void 0 : _a.querySelector(MULTISELECT_CONTAINER_SELECTOR))))
        continue;
      if ((el.tagName === "BUTTON" || el.getAttribute("role") === "button") && (((_b = el.closest(UPLOAD_ZONE_SELECTOR)) == null ? void 0 : _b.querySelector('input[type="file"]')) || ((_c = el.parentElement) == null ? void 0 : _c.querySelector('input[type="file"]'))))
        continue;
      results.push({ el, signal: buildSignal(el, "custom-dropdown", doc) });
    }
  }
  for (const [wrapper, segments] of dateGroups) {
    results.push(dateGroupField(wrapper, segments, doc));
  }
  for (const radios of radioGroups.values()) {
    if (radios.length > 0) results.push(radioGroupSignal(radios, doc));
  }
  const pillGroups = /* @__PURE__ */ new Map();
  const pillButtons = /* @__PURE__ */ new Set([
    ...root.querySelectorAll('button[aria-pressed], [role="button"][aria-pressed]'),
    ...root.querySelectorAll(
      'ul[class*="pill" i] button, ol[class*="pill" i] button, [role="list"][class*="pill" i] button'
    )
  ]);
  for (const btn of pillButtons) {
    if (btn.closest("[data-flashfiller]")) continue;
    if (btn.closest(SITE_CHROME_SELECTOR)) continue;
    if (btn.closest('[role="toolbar"], [role="tablist"], [role="menu"], [role="menubar"]')) continue;
    if (btn.closest('aside, [class*="facet" i], [class*="filter" i]')) continue;
    if (isHiddenOrHoneypot(btn)) continue;
    if (!(btn.textContent ?? "").trim()) continue;
    const container = btn.closest(
      'ul, ol, [role="list"], [role="radiogroup"], [role="group"]'
    );
    if (!container) continue;
    const group = pillGroups.get(container) ?? [];
    group.push(btn);
    pillGroups.set(container, group);
  }
  const pillBlocks = [];
  for (const [container, pills] of pillGroups) {
    if (pills.length < 2) continue;
    const byChild = /* @__PURE__ */ new Map();
    for (const pill of pills) {
      let child = pill;
      while (child.parentElement && child.parentElement !== container) child = child.parentElement;
      const bucket = byChild.get(child) ?? [];
      bucket.push(pill);
      byChild.set(child, bucket);
    }
    const partitions = [...byChild.entries()];
    if (partitions.length >= 2 && partitions.every(([, group]) => group.length >= 2)) {
      for (const [child, group] of partitions) pillBlocks.push({ el: child, pills: group });
    } else {
      pillBlocks.push({ el: container, pills });
    }
  }
  for (const { el: blockEl, pills } of pillBlocks) {
    const options = pills.map((p) => {
      const text = (p.textContent ?? "").trim();
      return { value: text, text };
    });
    let multi = pills.some((p) => p.querySelector('[class*="plus-icon" i], [class*="remove-icon" i]'));
    for (let node = blockEl, depth = 0; node && depth < 4 && !multi; depth++) {
      if (typeof node.className === "string" && /multiselect/i.test(node.className)) multi = true;
      node = node.parentElement;
    }
    const signal = buildSignal(blockEl, multi ? "checkbox" : "radio", doc, options);
    if (!signal.label) {
      const clone = blockEl.cloneNode(true);
      clone.querySelectorAll('button, [role="button"], script, style').forEach((n) => n.remove());
      const own = ((_d = clone.textContent) == null ? void 0 : _d.replace(/\s+/g, " ").trim()) ?? "";
      if (own.length > 1 && own.length < 300) {
        signal.label = own;
        signal.normalizedQuestion = canonical(own) || normalize(own);
        signal.rawText = [own, signal.sectionContext].filter(Boolean).join(" ");
        signal.questionSource = "label";
        signal.eeoLike = EEO_RE.test(`${own} ${signal.name} ${signal.id} ${signal.sectionContext}`);
      }
    }
    const consentText = `${signal.label} ${signal.sectionContext}`;
    signal.consentLike = CONSENT_RE.test(consentText);
    signal.certificationLike = CERTIFICATION_RE.test(consentText);
    if (/\bcookies?\b/i.test(consentText)) continue;
    signal.filled = pills.some((p) => p.getAttribute("aria-pressed") === "true");
    results.push({ el: blockEl, pillEls: pills, signal });
  }
  const checkboxGroups = /* @__PURE__ */ new Map();
  const soloBoxes = [];
  for (const box of checkboxes) {
    const name = box.name.replace(/\[\]$/, "");
    let key = name ? `name:${name}` : "";
    if (!key) {
      const container = box.closest('fieldset, [role="group"]');
      if (container) key = `container:${ensureFieldId(container)}`;
    }
    if (!key) {
      soloBoxes.push(box);
      continue;
    }
    const group = checkboxGroups.get(key) ?? [];
    group.push(box);
    checkboxGroups.set(key, group);
  }
  for (const boxes of checkboxGroups.values()) {
    if (boxes.length >= 2) results.push(checkboxGroupSignal(boxes, doc));
    else soloBoxes.push(boxes[0]);
  }
  for (const box of soloBoxes) {
    results.push({ el: box, signal: buildSignal(box, "checkbox", doc) });
  }
  const passwordFields = results.filter((f) => f.signal.kind === "password");
  if (passwordFields.length > 0) {
    const authForms = new Set(
      passwordFields.map((f) => f.el.closest("form")).filter((form) => form !== null)
    );
    const smallAuthPage = results.length <= 8;
    for (const field of results) {
      const { kind } = field.signal;
      if (kind === "password") {
        field.signal.authContext = true;
        continue;
      }
      if (kind !== "email" && kind !== "text") continue;
      const form = field.el.closest("form");
      if (form && authForms.has(form) || smallAuthPage) field.signal.authContext = true;
    }
  }
  for (const field of results) {
    const rk = getRepeatKey(field.el);
    if (!rk) continue;
    const ranks = repeatRanks.get(rk.family);
    if (ranks && ranks.size >= 2) {
      const rank = ranks.get(rk.key);
      if (rank !== void 0) field.signal.sectionIndex = rank;
    }
    field.signal.sectionKind = sectionKindOf(rk.family) ?? field.signal.sectionKind;
  }
  const structuralCache = /* @__PURE__ */ new Map();
  const structuralHits = [];
  for (const field of results) {
    if (field.signal.sectionIndex !== void 0) continue;
    const hit = structuralRepeatItem(field.el);
    if (!hit) continue;
    let info = structuralCache.get(hit.item);
    if (!info) {
      info = { index: hit.index, kind: classifyRepeatItem(hit.item) };
      structuralCache.set(hit.item, info);
    }
    if (info.kind) {
      field.signal.sectionIndex = info.index;
      field.signal.sectionKind = info.kind;
      structuralHits.push({ field, item: hit.item, index: info.index, kind: info.kind });
    }
  }
  const collidedKinds = /* @__PURE__ */ new Set();
  const seenItemByKey = /* @__PURE__ */ new Map();
  for (const h of structuralHits) {
    const key = `${h.kind}|${h.index}|${h.field.signal.normalizedQuestion}`;
    const prev = seenItemByKey.get(key);
    if (prev && prev !== h.item) collidedKinds.add(h.kind);
    else seenItemByKey.set(key, h.item);
  }
  for (const h of structuralHits) {
    if (collidedKinds.has(h.kind)) h.field.signal.sectionIndex = void 0;
  }
  return results.filter((f) => f.signal.normalizedQuestion !== "");
}
const SECTION_RE = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
function interpolateItem(body, item) {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (raw, field) => {
    const value = item[field];
    if (value === void 0 || value === null || value === "") return raw;
    return String(value);
  });
}
function renderComposite(template, profile) {
  let sawSection = false;
  let anyItems = false;
  let text = template.replace(SECTION_RE, (_m, arrayName, body) => {
    sawSection = true;
    const arr = profile[arrayName];
    if (!Array.isArray(arr) || arr.length === 0) return "";
    anyItems = true;
    return arr.map((item) => interpolateItem(body, item)).join("");
  });
  text = text.replace(/\{\{\s*(profile\.[\w.]+)\s*\}\}/g, (raw, path) => {
    const value = readProfilePath(profile, path);
    return value === "" ? raw : value;
  });
  const empty = sawSection ? !anyItems : /\{\{\s*profile\.[\w.]+\s*\}\}/.test(text);
  return { text: text.replace(/\n+$/, ""), empty };
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function decontextualize(canonicalText, pageContext, hostname) {
  if (!pageContext && !hostname) return canonicalText;
  let text = canonicalText;
  const swaps = [
    [(pageContext == null ? void 0 : pageContext.company) ?? null, "company"],
    [(pageContext == null ? void 0 : pageContext.role) ?? null, "position"],
    [(pageContext == null ? void 0 : pageContext.location) ?? null, "location"]
  ];
  for (const [literal, generic] of swaps) {
    if (!literal) continue;
    const c = canonical(literal);
    if (c.length < 3) continue;
    text = text.replace(new RegExp(`(?<!\\S)${escapeRegExp(c)}(?!\\S)`, "g"), generic);
  }
  for (const token of brandTokens(pageContext, hostname ?? "")) {
    if (token.length < 3) continue;
    text = text.replace(new RegExp(`(?<!\\S)${escapeRegExp(token)}(?!\\S)`, "gi"), "company");
  }
  return text.replace(/\b(company)(\s+\1)+\b/g, "$1");
}
const fullName = (p) => [p.firstName, p.lastName].filter(Boolean).join(" ");
const yesNo = (b) => b ? "Yes" : "No";
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
function formatLongDate(iso) {
  const m = iso.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (!m) return iso;
  const month = MONTH_NAMES[parseInt(m[2], 10) - 1];
  if (!month) return iso;
  return `${month} ${parseInt(m[3] ?? "1", 10)}, ${m[1]}`;
}
const startDateGetter = (p, _ctx, signal) => {
  if (!p.earliestStartDate) return "";
  return (signal == null ? void 0 : signal.kind) === "date" ? p.earliestStartDate : formatLongDate(p.earliestStartDate);
};
startDateGetter.matchedKey = "earliestStartDate";
const yearsExperienceGetter = (_p, _ctx, signal) => {
  const label = (signal == null ? void 0 : signal.label) ?? "";
  const asksYesNo = /^\s*(do|does|have|has|are|is|can|did|will)\b/i.test(label);
  return asksYesNo ? "Yes" : "";
};
const previouslyEmployedGetter = (p, ctx, signal) => {
  const label = (signal == null ? void 0 : signal.label) ?? "";
  if (!/\b(work|employ|partner|contract)/i.test(label)) return "";
  if (!/\b(previously|ever|formerly|before|prior|in the past)\b/i.test(label)) return "";
  const genericCue = /\bthis (company|organi[sz]ation|employer|firm)\b|\b(for|with|by|at) us\b|\bour (company|organi[sz]ation|subsidiaries)\b/i.test(
    label
  );
  const brand = brandTokens(ctx == null ? void 0 : ctx.pageContext, (ctx == null ? void 0 : ctx.hostname) ?? "");
  const brandCue = [...brand].some(
    (t) => t.length > 2 && new RegExp(`\\b${escapeRegExp(t)}\\b`, "i").test(label)
  );
  if (!genericCue && !brandCue) return "";
  return yesNo(p.previouslyEmployedHere);
};
previouslyEmployedGetter.matchedKey = "previouslyEmployedHere";
const currentEmployeeGetter = (p, ctx, signal) => {
  const label = (signal == null ? void 0 : signal.label) ?? "";
  if (!/\bemployee\b|\bemployed\b|\bworking\b/i.test(label)) return "";
  if (!/\bcurrent(ly)?\b/i.test(label)) return "";
  const genericCue = /\bthis (company|organi[sz]ation|employer|firm)\b|\b(for|with|by|at) us\b|\bour (company|organi[sz]ation|subsidiaries)\b/i.test(
    label
  );
  const brand = brandTokens(ctx == null ? void 0 : ctx.pageContext, (ctx == null ? void 0 : ctx.hostname) ?? "");
  const brandCue = [...brand].some(
    (t) => t.length > 2 && new RegExp(`\\b${escapeRegExp(t)}\\b`, "i").test(label)
  );
  if (!genericCue && !brandCue) return "";
  return p.previouslyEmployedHere ? "" : "No";
};
currentEmployeeGetter.matchedKey = "currentEmployeeHere";
currentEmployeeGetter.fallbacksFor = (value) => value === "No" ? ["I am not a current employee", "Not a current employee"] : [];
previouslyEmployedGetter.fallbacksFor = (value) => value === "No" ? [
  "I have never worked for this company",
  "I have never been employed by this company",
  "No prior employment",
  "No experience",
  "Not applicable"
] : [
  "I have previously worked for this company",
  "I was previously employed by this company",
  "I am a former employee"
];
function sortByEndDateDesc(entries) {
  return [...entries].sort((a, b) => {
    if (!a.endDate && b.endDate) return -1;
    if (a.endDate && !b.endDate) return 1;
    if (!a.endDate && !b.endDate) {
      const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return startB - startA;
    }
    const endA = new Date(a.endDate).getTime();
    const endB = new Date(b.endDate).getTime();
    return endB - endA;
  });
}
function getSortedWorkHistory(profile) {
  return sortByEndDateDesc(profile.workHistory);
}
function getSortedEducation(profile) {
  return sortByEndDateDesc(profile.education);
}
function workHistoryGetter(key) {
  const getter = (p, ctx, signal) => {
    var _a, _b;
    if ((signal == null ? void 0 : signal.sectionKind) === "education") return "";
    const sorted = getSortedWorkHistory(p);
    const index = (signal == null ? void 0 : signal.sectionIndex) ?? ((_a = ctx == null ? void 0 : ctx.usageCounts) == null ? void 0 : _a[key]) ?? 0;
    return ((_b = sorted[index]) == null ? void 0 : _b[key]) ?? "";
  };
  getter.matchedKey = key;
  return getter;
}
const WORK_SECTION_KEYS = /* @__PURE__ */ new Set([
  "company",
  "title",
  "startDate",
  "endDate",
  "location",
  "description"
]);
function educationGetter(key) {
  const matchedKey = `education.${key}`;
  const getter = (p, ctx, signal) => {
    var _a, _b;
    if ((signal == null ? void 0 : signal.sectionKind) === "work") return "";
    if ((key === "startDate" || key === "endDate") && (signal == null ? void 0 : signal.sectionKind) !== "education")
      return "";
    const sorted = getSortedEducation(p);
    const index = (signal == null ? void 0 : signal.sectionIndex) ?? ((_a = ctx == null ? void 0 : ctx.usageCounts) == null ? void 0 : _a[matchedKey]) ?? 0;
    return ((_b = sorted[index]) == null ? void 0 : _b[key]) ?? "";
  };
  getter.matchedKey = matchedKey;
  return getter;
}
const DEGREE_LEVEL_RES = [
  [/\bbachelor/i, /\bbachelor|\bb\.?\s?(s|sc|a|e|eng|tech)\b/i],
  [/\bmaster/i, /\bmaster|\bm\.?\s?(s|sc|a|e|eng|tech|ba)\b/i],
  [/\b(doctor|ph\.?d)/i, /\bdoctor|\bph\.?d/i],
  [/\bassociate/i, /\bassociate/i]
];
const degreeQuestionGetter = (p, _ctx, signal) => {
  var _a;
  const label = (signal == null ? void 0 : signal.label) ?? "";
  if (!/\bdegree\b/i.test(label) || !/^(do you|have you|are you)/i.test(label.trim())) return "";
  const level = DEGREE_LEVEL_RES.find(([ask]) => ask.test(label));
  if (!level) return "";
  const holders = p.education.filter((e) => level[1].test(e.degree));
  if (holders.length === 0) return "";
  const inClause = ((_a = label.match(/degree\s+in\s+([^?.]*)/i)) == null ? void 0 : _a[1]) ?? "";
  const disciplineTokens = inClause.split(/[^a-z]+/i).filter((t) => t.length >= 4 && !/related|field|similar|equivalent|discipline|area|another|other/i.test(t));
  if (disciplineTokens.length === 0) return "Yes";
  const haystack = holders.map((e) => `${e.degree} ${e.field}`.toLowerCase()).join(" ");
  return disciplineTokens.some((t) => haystack.includes(t.toLowerCase())) ? "Yes" : "";
};
degreeQuestionGetter.matchedKey = "educationDegreeQuestion";
const authorizedToWorkGetter = (p, _ctx, signal) => /^\s*(are|do|will)\s+you\b/i.test((signal == null ? void 0 : signal.label) ?? "") ? yesNo(p.authorizedToWork) : p.workAuthorization;
authorizedToWorkGetter.matchedKey = "authorizedToWork";
authorizedToWorkGetter.fallbacksFor = (value) => value === "Yes" ? ["Authorized to work for all United States employers", "I am authorized to work for all employers"] : ["Not authorized to work in the United States"];
const emailGetter = (p, _ctx, signal) => (signal == null ? void 0 : signal.authContext) && p.accountEmail ? p.accountEmail : p.email;
const passwordGetter = (p, _ctx, signal) => (signal == null ? void 0 : signal.kind) === "password" ? p.accountPassword : "";
passwordGetter.matchedKey = "accountPassword";
const usernameGetter = (p, _ctx, signal) => (signal == null ? void 0 : signal.authContext) ? p.accountEmail || p.email : "";
const ADDRESSY_RE = /\baddress\b|street|city|zip|postal|\bapt\b|suite|\bunit\b/i;
const DATE_HINT_RE = /\b(date|mm|dd|yy+)\b|\d{1,2}\s*\/\s*\d{2,4}/i;
function dateContextGate(getter) {
  const gated = (p, ctx, signal) => {
    if (!signal) return "";
    const identityText = `${signal.label} ${humanizeIdentifier(signal.name)} ${humanizeIdentifier(signal.id)} ${signal.sectionContext}`;
    if (ADDRESSY_RE.test(identityText)) return "";
    const hintText = `${signal.placeholder} ${signal.label} ${humanizeIdentifier(signal.name)} ${humanizeIdentifier(signal.id)}`;
    const dateish = signal.kind === "date" || DATE_HINT_RE.test(hintText) || signal.sectionKind !== void 0;
    if (!dateish) return "";
    return getter(p, ctx, signal);
  };
  gated.matchedKey = getter.matchedKey;
  return gated;
}
const AUTOCOMPLETE_MAP = {
  "given-name": (p) => p.firstName,
  "additional-name": () => "",
  "family-name": (p) => p.lastName,
  name: fullName,
  email: emailGetter,
  username: usernameGetter,
  "new-password": passwordGetter,
  "current-password": passwordGetter,
  tel: (p) => p.phone,
  "tel-national": (p) => p.phone,
  "street-address": (p) => [p.address.line1, p.address.line2].filter(Boolean).join(", "),
  "address-line1": (p) => p.address.line1,
  "address-line2": (p) => p.address.line2,
  "address-level1": (p) => p.address.state,
  "address-level2": (p) => p.address.city,
  "postal-code": (p) => p.address.postalCode,
  country: (p) => p.address.country,
  "country-name": (p) => p.address.country,
  organization: workHistoryGetter("company"),
  "organization-title": workHistoryGetter("title"),
  url: (p) => p.links.website || p.links.portfolio
};
const NAME_PATTERNS = [
  // Credentials first: "Confirm Password" must never fall through to
  // anything else, and the getters are hard-gated (kind/authContext).
  [/pass.?word|passcode/i, passwordGetter, "always"],
  [/user.?name|user.?id|login.?id/i, usernameGetter, "always"],
  [/first.?name|given.?name|fname/i, (p) => p.firstName, "always"],
  [/last.?name|family.?name|surname|lname/i, (p) => p.lastName, "always"],
  [
    /full.?name|your.?name|^name$|candidate.?name|legal.?name/i,
    // Workday nests ids as "legalName--middleName": the humanized identifier
    // matches /legal.?name/, but a middle-name field must never receive the
    // full name (live Novonesis catch 2026-07-16). No stored middle name →
    // the field stays empty.
    (p, _ctx, signal) => /\bmiddle\b|\bmname\b/i.test(
      `${(signal == null ? void 0 : signal.label) ?? ""} ${humanizeIdentifier((signal == null ? void 0 : signal.name) ?? "")} ${humanizeIdentifier((signal == null ? void 0 : signal.id) ?? "")}`
    ) ? "" : fullName(p),
    "always"
  ],
  [/e.?mail/i, emailGetter, "always"],
  // Before the phone pattern: "Country Phone Code" contains "phone" but wants
  // the dialing code, not the number (live Novonesis catch 2026-07-16). The
  // phone cue keeps ISO address "Country Code" fields out.
  [
    /\b(country|dial(?:l?ing)?)\b[^?]{0,15}\bcode\b|\bcode\b[^?]{0,10}\b(country|dial)/i,
    (_p, _ctx, signal) => /phone|mobile|cell|telephone|dial/i.test(
      `${(signal == null ? void 0 : signal.label) ?? ""} ${(signal == null ? void 0 : signal.name) ?? ""} ${(signal == null ? void 0 : signal.id) ?? ""} ${(signal == null ? void 0 : signal.sectionContext) ?? ""}`
    ) ? "+1" : "",
    "always"
  ],
  [
    /phone|mobile|cell|telephone/i,
    // "Phone Extension" fields must stay empty — caught live by the harness
    (p, _ctx, signal) => /\bext(ension)?\b/i.test(`${(signal == null ? void 0 : signal.label) ?? ""} ${(signal == null ? void 0 : signal.name) ?? ""} ${(signal == null ? void 0 : signal.id) ?? ""}`) ? "" : p.phone,
    "always"
  ],
  // "Phone Device Type" (Workday/ATS: Mobile/Landline/Fax) — the stored
  // number is a cell, answer instantly without any judge call. Requires the
  // phone cue so IT-style "Primary device type" (Laptop…) never hits.
  [
    /\b(phone|telephone|cell)\b[^?]{0,12}\b(device\s*)?type\b|\b(device\s*)?type\b[^?]{0,12}\b(phone|telephone)\b/i,
    () => "Mobile",
    "always"
  ],
  [/linked.?in/i, (p) => p.links.linkedin, "always"],
  [/git.?hub/i, (p) => p.links.github, "always"],
  [/portfolio/i, (p) => p.links.portfolio, "always"],
  [/website|personal.?site|home.?page/i, (p) => p.links.website || p.links.portfolio, "always"],
  [/address.?(line.?)?1|street/i, (p) => p.address.line1, "always"],
  [/address.?line.?2|apt|suite|unit/i, (p) => p.address.line2, "always"],
  [/city|town|locality/i, (p) => p.address.city, "short-label"],
  [/state|province|region/i, (p) => p.address.state, "short-label"],
  [/postal|zip/i, (p) => p.address.postalCode, "always"],
  [/country/i, (p) => p.address.country, "short-label"],
  [/sponsor(ship)?/i, (p) => yesNo(p.requiresSponsorship), "always"],
  [
    /authoriz(e|ed|ation)|work.?permit|right.?to.?work|(legally\s+)?eligible\s+to\s+work/i,
    authorizedToWorkGetter,
    "always"
  ],
  // "Are you at least 18 years of age?" — inherently Yes for this user (24);
  // pattern is age-specific so ordinary age questions never hit it.
  [
    /\bat least (18|eighteen)\b|\b1[68] years (of age|or older)\b|\bminimum age\b/i,
    () => "Yes",
    "always"
  ],
  [/relocat/i, (p) => yesNo(p.willingToRelocate), "always"],
  // Employment-start questions (before the notice/availability catch-all):
  // needs an availability cue so bare work-history "Start date" labels
  // (short-label pattern below) keep their own getter.
  [
    /\b(earliest|soonest)\b[^?]*\bstart|when (can|could) you (start|begin|join)|available to (start|begin)|\bdate\b[^?]{0,25}\bavailable\b|start.?date.{0,12}availab|availab\w*.{0,12}start.?date/i,
    startDateGetter,
    "always"
  ],
  // Prior-employment-here — before authoriz/work patterns so its distinctive
  // phrasing wins ("Have you previously worked for Amgen?")
  [/\b(previously|ever|formerly|before|prior|in the past)\b.{0,40}\b(work|employ|partner|contract)|\b(work|employ|partner)\w*.{0,40}\b(previously|before|in the past)\b/i, previouslyEmployedGetter, "always"],
  // Current-employment-here ("Are you a current NOV employee?") — the getter
  // itself gates on the current cue + a this-company/brand cue.
  [/\bcurrent(ly)?\b.{0,30}\b(employee|employed|working)\b|\b(employee|employed|working)\b.{0,20}\bcurrently\b/i, currentEmployeeGetter, "always"],
  // "[X]+ years of experience in …?" screening questions
  [/\b\d+\s*\+?\s*(or more\s+)?years?\b[^?]*\bexperience\b|\bexperience\b[^?]*\b\d+\s*\+?\s*years?\b/i, yearsExperienceGetter, "always"],
  [
    /notice.?period|start.?date.?availab|availability/i,
    // "Interview availability" is scheduling, not a notice period
    (p, _ctx, signal) => /\binterview\b/i.test((signal == null ? void 0 : signal.label) ?? "") ? "" : p.noticePeriod,
    "always"
  ],
  [/salary|compensation|pay.?expectation/i, (p) => p.desiredSalary, "always"],
  [/pronoun/i, (p) => p.pronouns, "always"],
  [/company|employer|organization/i, workHistoryGetter("company"), "short-label"],
  // Before title: "Role Description" must not fill the job title.
  // short-label: screening questions QUOTE the phrase ("After reviewing this
  // job description, are you able to perform the essential functions…") and
  // must never receive a work-history description (live bug 2026-07-15);
  // identifier matching stays loose, so named description fields still hit.
  [
    // \w* extensions matter: short-label matches must END on a word boundary
    /(?:role|job|position|work)\W*descri\w*|descri\w*\W*(?:role|job|position)\w*|responsibilit\w*|duties/i,
    workHistoryGetter("description"),
    "short-label"
  ],
  [/title|role|position/i, workHistoryGetter("title"), "short-label"],
  // "Start date"/"End date" are distinctive; bare "From"/"To" is not — an
  // unlabeled address input can inherit a neighboring "From" caption or carry
  // "from" in its name, so the bare words are date-context gated.
  [/start.?date/i, workHistoryGetter("startDate"), "short-label"],
  [/\bfrom\b/i, dateContextGate(workHistoryGetter("startDate")), "short-label"],
  [/end.?date/i, workHistoryGetter("endDate"), "short-label"],
  [/\bto\b/i, dateContextGate(workHistoryGetter("endDate")), "short-label"],
  // Education — after the work patterns: the same "From"/"To" labels appear
  // in both block kinds, and each getter yields '' outside its own kind.
  [/school|universit|college|institution/i, educationGetter("institution"), "always"],
  // "Do you have a bachelor's degree in …?" BEFORE the plain degree-name
  // getter — a yes/no screening question must never fill the degree NAME.
  [/\b(do you|have you)\b[^?]*\bdegree\b/i, degreeQuestionGetter, "always"],
  [/degree|qualification/i, educationGetter("degree"), "always"],
  [/field.?of.?study|major|discipline|area.?of.?study/i, educationGetter("field"), "always"],
  [/graduat/i, educationGetter("endDate"), "always"],
  [/start.?date/i, educationGetter("startDate"), "short-label"],
  [/\bfrom\b/i, dateContextGate(educationGetter("startDate")), "short-label"],
  [/end.?date/i, educationGetter("endDate"), "short-label"],
  [/\bto\b/i, dateContextGate(educationGetter("endDate")), "short-label"]
];
function labelMatches(re, label) {
  const m = label.match(re);
  if (!m || m.index === void 0) return false;
  const isWordChar = (ch) => !!ch && /[a-z0-9]/i.test(ch);
  return !isWordChar(label[m.index - 1]) && !isWordChar(label[m.index + m[0].length]);
}
const GENERIC_LABEL_MAX_WORDS = 6;
function isIdentityLabel(label) {
  const words = label.trim().split(/\s+/).filter(Boolean).length;
  return words <= GENERIC_LABEL_MAX_WORDS && /\b(name|e.?mail|phone|address|city|state|zip|postal|country|date|salary|linked.?in|git.?hub|website|url)\b/i.test(
    label
  );
}
function tier1Match(signal, ctx) {
  var _a;
  if (signal.kind === "password") {
    const value = ctx.profile.accountPassword;
    return value ? { value, confidence: 0.95, matchedKey: "accountPassword" } : null;
  }
  const tokens = signal.autocomplete.split(/\s+/).filter((t) => t && t !== "on" && t !== "off");
  for (const token of tokens) {
    const getter = AUTOCOMPLETE_MAP[token];
    if (getter) {
      const value = getter(ctx.profile, ctx, signal);
      if (value) return { value, confidence: 0.98, matchedKey: getter.matchedKey };
    }
  }
  const identifiers = [signal.name, signal.id].filter(Boolean).map(humanizeIdentifier);
  const label = signal.label;
  const labelWordCount = label.trim().split(/\s+/).filter(Boolean).length;
  const sentenceLike = label.includes("?") || /^\s*(am|are|is|do|does|did|will|would|can|could|have|has|what|when|where|which|who|why|how|please)\b/i.test(
    label
  );
  for (const [re, getter, scope] of NAME_PATTERNS) {
    const identifierHit = identifiers.some(
      (h) => scope === "always" ? re.test(h) : labelMatches(re, h)
    );
    const labelHit = label ? scope === "always" ? re.test(label) : !sentenceLike && labelWordCount <= GENERIC_LABEL_MAX_WORDS && labelMatches(re, label) : false;
    if (identifierHit || labelHit) {
      const value = getter(ctx.profile, ctx, signal);
      if (value)
        return {
          value,
          confidence: 0.9,
          matchedKey: getter.matchedKey,
          fallbacks: (_a = getter.fallbacksFor) == null ? void 0 : _a.call(getter, value)
        };
    }
  }
  return null;
}
function tokenSubset(a, b) {
  const ta = tokenizeAnswer(a);
  const tb = tokenizeAnswer(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [small, large] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const pool = new Set(large);
  return small.every((t) => pool.has(t));
}
function setMembership(canonicalText, optionSets) {
  const ids = /* @__PURE__ */ new Set();
  for (const set of optionSets) {
    if (set.options.some((o) => canonicalAnswer(stripParentheticals(o)) === canonicalText))
      ids.add(set.id);
  }
  return ids;
}
function parseNumericRange(text) {
  const t = text.trim().toLowerCase();
  if (!t || !/\d/.test(t)) return null;
  let m = t.match(/^[^\d]*(\d+(?:\.\d+)?)\s*(?:%|percent)?\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?[^\d]*$/);
  if (m) return { lo: parseFloat(m[1]), hi: parseFloat(m[2]) };
  m = t.match(/^(?:up to|less than|under|at most|no more than|fewer than)\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?$/);
  if (m) return { lo: 0, hi: parseFloat(m[1]) };
  m = t.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)?\s*(?:\+|or (?:more|above|over))$/) ?? t.match(/^(?:more than|over|at least|minimum(?: of)?)\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?$/);
  if (m) return { lo: parseFloat(m[1]), hi: Infinity };
  m = t.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)?$/);
  if (m) return { lo: parseFloat(m[1]), hi: parseFloat(m[1]) };
  return null;
}
const NUMERIC_ANSWER_RE = /^\s*\d{1,3}(?:\.\d+)?\s*%?\s*(?:(?:-|–|to)\s*\d{1,3}(?:\.\d+)?\s*%?)?\s*$/;
function chooseNumericRange(options, answer) {
  if (!NUMERIC_ANSWER_RE.test(answer)) return null;
  const target = parseNumericRange(answer);
  if (!target) return null;
  const mid = target.hi === Infinity ? target.lo : (target.lo + target.hi) / 2;
  const ranged = [];
  for (let index = 0; index < options.length; index++) {
    const range = parseNumericRange(options[index].text);
    if (range) ranged.push({ index, option: options[index], range });
  }
  if (ranged.length < 2) return null;
  const containing = ranged.filter((r) => r.range.lo <= mid && mid <= r.range.hi);
  if (containing.length === 0) return null;
  containing.sort(
    (a, b) => a.range.hi - a.range.lo - (b.range.hi - b.range.lo) || a.range.lo - b.range.lo
  );
  const best = containing[0];
  return { value: best.option.value, index: best.index, text: best.option.text, score: 0.9 };
}
const US_STATES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia"
};
const US_STATE_NAMES = new Map(Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), code]));
const COUNTRY_VARIANTS = [
  ["United States", "United States of America", "USA", "US"],
  ["United Kingdom", "UK", "Great Britain"]
];
const DIALING_CODE_COUNTRIES = {
  "+1": ["United States", "United States of America", "USA"]
};
const DEGREE_LEVELS = [
  {
    detect: /\bmaster/i,
    whole: /^m\.?\s?(s|sc|a|eng|ba)\.?$|^mba$/i,
    variants: ["Master's Degree", "Masters", "Master's", "Master Degree", "Graduate Degree"]
  },
  {
    detect: /\bbachelor/i,
    whole: /^b\.?\s?(s|sc|a|e|eng|tech)\.?$/i,
    variants: ["Bachelor's Degree", "Bachelors", "Bachelor's", "Bachelor Degree", "Undergraduate Degree"]
  },
  {
    detect: /\bdoctor|\bph\.?\s?d/i,
    variants: ["Doctorate", "Doctoral Degree", "PhD", "Doctorate Degree", "Graduate Degree"]
  },
  {
    detect: /\bassociate/i,
    variants: ["Associate's Degree", "Associates", "Associate Degree"]
  },
  {
    detect: /\bhigh school\b|\bged\b/i,
    variants: ["High School Diploma", "High School or Equivalent", "High School Diploma or GED", "High School"]
  }
];
function answerVariants(answer) {
  var _a;
  const trimmed = answer.trim();
  const variants = [trimmed];
  const upper = trimmed.toUpperCase();
  if (US_STATES[upper]) variants.push(US_STATES[upper]);
  const code = US_STATE_NAMES.get(trimmed.toLowerCase());
  if (code) variants.push(code);
  for (const group of COUNTRY_VARIANTS) {
    if (group.some((g) => g.toLowerCase() === trimmed.toLowerCase()))
      variants.push(...group.filter((g) => g.toLowerCase() !== trimmed.toLowerCase()));
  }
  const dialing = DIALING_CODE_COUNTRIES[trimmed];
  if (dialing) variants.push(...dialing);
  for (const level of DEGREE_LEVELS) {
    if (level.detect.test(trimmed) || ((_a = level.whole) == null ? void 0 : _a.test(trimmed))) {
      variants.push(...level.variants);
      break;
    }
  }
  return [...new Map(variants.map((v) => [v.toLowerCase(), v])).values()];
}
const SET_EQUIVALENCE_SCORE = 0.95;
function chooseOption(options, answer, optionSets = []) {
  const answerStripped = stripParentheticals(answer);
  const target = canonicalAnswer(answerStripped);
  if (!target) return null;
  const numeric = chooseNumericRange(options, answer);
  if (numeric) return numeric;
  const answerIntent = classifyIntent(answer);
  const answerSets = setMembership(target, optionSets);
  const targets = answerVariants(answerStripped).map((v) => ({ stripped: v, canon: canonicalAnswer(v) })).filter((t) => t.canon !== "");
  const anySameIntent = answerIntent !== "unknown" && options.some((o) => classifyIntent(o.text) === answerIntent);
  const scored = [];
  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    const stripped = stripParentheticals(option.text);
    const text = canonicalAnswer(stripped) || canonicalAnswer(option.value);
    if (!text) continue;
    const intent = classifyIntent(option.text);
    const sameSet = answerSets.size > 0 && [...setMembership(text, optionSets)].some((id) => answerSets.has(id));
    if (!sameSet && anySameIntent && intent !== "unknown" && intent !== answerIntent) continue;
    let score = sameSet ? SET_EQUIVALENCE_SCORE : 0;
    for (const t of targets) {
      if (text === t.canon) {
        score = 1;
        break;
      }
      if (tokenSubset(text, t.canon)) score = Math.max(score, 0.85);
      else score = Math.max(score, lexicalAnswerScore(stripped, t.stripped));
    }
    scored.push({ value: option.value, index, text: option.text, score, intent });
  }
  if (answerIntent !== "unknown") {
    const sameIntent = scored.filter((s) => s.intent === answerIntent);
    if (sameIntent.length === 1) sameIntent[0].score = Math.max(sameIntent[0].score, 0.85);
  }
  let best = null;
  for (const s of scored) if (!best || s.score > best.score) best = s;
  if (!best || best.score < 0.55) return null;
  return { value: best.value, index: best.index, text: best.text, score: best.score };
}
function chooseOptions(options, answer, optionSets = []) {
  const chosen = /* @__PURE__ */ new Map();
  const whole = chooseOption(options, answer, optionSets);
  if (whole) chosen.set(whole.index, whole);
  const parts = answer.split(/[,;\n/]|\band\b|&/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    for (const part of parts) {
      const choice = chooseOption(options, part, optionSets);
      if (choice && !chosen.has(choice.index)) chosen.set(choice.index, choice);
    }
  }
  return [...chosen.values()].sort((a, b) => a.index - b.index);
}
let semanticChooser = null;
function setSemanticChooser(fn) {
  semanticChooser = fn;
}
let semanticSimilarity$1 = null;
function setSemanticSimilarity(fn) {
  semanticSimilarity$1 = fn;
}
const EMBED_SAME_QUESTION = 0.9;
const EMBED_MARGIN = 0.08;
const EMBED_OPTION_MIN = 0.62;
let semanticQuestionMatcher = null;
function setSemanticQuestionMatcher(fn) {
  semanticQuestionMatcher = fn;
}
let semanticAnswerer = null;
function setSemanticAnswerer(fn) {
  semanticAnswerer = fn;
}
let semanticCascader = null;
function setSemanticCascader(fn) {
  semanticCascader = fn;
}
function semanticCascadeAvailable() {
  return semanticCascader !== null;
}
let semanticTextAnswerer = null;
function setSemanticTextAnswerer(fn) {
  semanticTextAnswerer = fn;
}
const FACT_SHEET_BUDGET = 4e3;
const FACT_LINE_CLAMP = 300;
function buildFactSheet(ctx, question) {
  const p = ctx.profile;
  const lines = [
    `Name: ${[p.firstName, p.lastName].filter(Boolean).join(" ")}`,
    p.address.city && `Location: ${p.address.city}, ${p.address.state} ${p.address.country}`,
    p.workAuthorization && `Work authorization: ${p.workAuthorization}`,
    `Legally authorized to work: ${p.authorizedToWork ? "Yes" : "No"}`,
    `Requires visa sponsorship: ${p.requiresSponsorship ? "Yes" : "No"}`,
    `Willing to relocate: ${p.willingToRelocate ? "Yes" : "No"}`,
    p.earliestStartDate && `Earliest start date: ${p.earliestStartDate}`,
    p.noticePeriod && `Notice period: ${p.noticePeriod}`,
    p.desiredSalary && `Desired salary: ${p.desiredSalary}`,
    p.workHistory[0] && `Current/most recent role: ${p.workHistory[0].title} at ${p.workHistory[0].company}`,
    p.education[0] && `Education: ${p.education[0].degree} in ${p.education[0].field}, ${p.education[0].institution}`
  ].filter(Boolean);
  const clamp = (s) => s.length > FACT_LINE_CLAMP ? `${s.slice(0, FACT_LINE_CLAMP)}…` : s;
  const qaLines = ctx.qa.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.answerType === "text" && entry.answer.trim() !== "");
  if (question) {
    const relevance = /* @__PURE__ */ new Map();
    for (const { entry, index } of qaLines) {
      let best = 0;
      for (const text of [entry.question, ...entry.aliases]) {
        const s = lexicalScore(question, text);
        if (s > best) best = s;
      }
      relevance.set(index, best);
    }
    qaLines.sort((a, b) => relevance.get(b.index) - relevance.get(a.index) || a.index - b.index);
  }
  let used = lines.reduce((n, l) => n + l.length + 1, 0);
  for (const { entry } of qaLines) {
    const line = clamp(`Q: ${entry.question} → A: ${entry.answer}`);
    if (used + line.length + 1 > FACT_SHEET_BUDGET) break;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join("\n");
}
const SEMANTIC_SCORE = 0.9;
const INFERENCE_SCORE = 0.86;
async function semanticChooseOption(options, answer) {
  if (options.length === 0 || !answer.trim()) return null;
  const answerIntent = classifyIntent(answer);
  const anySameIntent = answerIntent !== "unknown" && options.some((o) => classifyIntent(o.text) === answerIntent);
  if (semanticSimilarity$1) {
    const strippedAnswer = stripParentheticals(answer);
    let bestIndex = -1;
    let bestSim = 0;
    let secondSim = 0;
    for (let index = 0; index < options.length; index++) {
      const option = options[index];
      if (!option.text.trim()) continue;
      const intent = classifyIntent(option.text);
      if (anySameIntent && intent !== "unknown" && intent !== answerIntent) continue;
      if (isPlaceholderOptionText(option.text)) continue;
      const sim = await semanticSimilarity$1(strippedAnswer, stripParentheticals(option.text));
      if (sim === null) {
        bestIndex = -1;
        break;
      }
      if (sim > bestSim) {
        secondSim = bestSim;
        bestSim = sim;
        bestIndex = index;
      } else if (sim > secondSim) {
        secondSim = sim;
      }
    }
    if (bestIndex >= 0 && bestSim >= EMBED_OPTION_MIN && bestSim - secondSim >= EMBED_MARGIN) {
      const option = options[bestIndex];
      return {
        value: option.value,
        index: bestIndex,
        text: option.text,
        score: Math.min(0.9, Math.max(0.7, bestSim))
      };
    }
  }
  if (!semanticChooser) return null;
  try {
    const index = await semanticChooser(answer, options.map((o) => o.text));
    if (index === null || index < 0 || index >= options.length) return null;
    const option = options[index];
    return { value: option.value, index, text: option.text, score: SEMANTIC_SCORE };
  } catch {
    return null;
  }
}
function isPlaceholderOptionText(text) {
  const t = text.trim().replace(/^[-–—.\s]+|[-–—.\s]+$/g, "");
  return t === "" || PLACEHOLDER_OPTION_RE.test(t);
}
function recordOptionEquivalence(optionSets, answerText, optionText, newId2) {
  const a = canonicalAnswer(stripParentheticals(answerText));
  const b = canonicalAnswer(stripParentheticals(optionText));
  if (!a || !b || a === b) return null;
  const inBoth = (set, canon) => set.options.some((o) => canonicalAnswer(stripParentheticals(o)) === canon);
  for (const set of optionSets) {
    const hasA = inBoth(set, a);
    const hasB = inBoth(set, b);
    if (hasA && hasB) return null;
    if (hasA) return { ...set, options: [...set.options, optionText.trim()] };
    if (hasB) return { ...set, options: [...set.options, answerText.trim()] };
  }
  return {
    id: newId2(),
    label: `auto: ${answerText.trim().slice(0, 40)}`,
    options: [answerText.trim(), optionText.trim()]
  };
}
async function semanticAnswerOption(question, options, facts) {
  if (!semanticAnswerer || options.length === 0 || !question.trim()) return null;
  try {
    const index = await semanticAnswerer(question, options.map((o) => o.text), facts);
    if (index === null || index < 0 || index >= options.length) return null;
    const option = options[index];
    return { value: option.value, index, text: option.text, score: INFERENCE_SCORE };
  } catch {
    return null;
  }
}
async function semanticCascadePath(question, answer, facts, categories) {
  if (!semanticCascader || categories.length === 0 || !question.trim()) return null;
  if (!answer.trim() && !facts.trim()) return null;
  try {
    const path = await semanticCascader(question, answer, facts, categories);
    if (!path) return null;
    const branch = categories[path.category];
    const optionText = branch == null ? void 0 : branch.options[path.option];
    if (optionText === void 0 || isPlaceholderOptionText(optionText)) return null;
    return { categoryText: branch.label, optionText };
  } catch {
    return null;
  }
}
const YES_RE = /^(yes|y|true|1)$/i;
const NO_RE = /^(no|n|false|0)$/i;
const PLACEHOLDER_OPTION_RE = /^(please\s+)?(select|choose|pick)\b/i;
function isPlaceholderOption(o) {
  if (o.value !== "") return false;
  const text = o.text.trim().replace(/^[-–—.\s]+|[-–—.\s]+$/g, "");
  return text === "" || PLACEHOLDER_OPTION_RE.test(text);
}
function realOptionCount(options) {
  return options.filter((o) => !isPlaceholderOption(o)).length;
}
function qaCandidates(ctx) {
  const out = [];
  const catalogAliases = new Map(
    ctx.seeds.flatMap((s) => {
      const bare = s.id.replace(/^seed-/, "");
      return [[bare, s.aliases], [`seed-${bare}`, s.aliases]];
    })
  );
  for (const entry of ctx.qa) {
    const personaSpecific = entry.personas.length > 0;
    if (personaSpecific && (!ctx.activePersona || !entry.personas.includes(ctx.activePersona)))
      continue;
    if (entry.siteScope && (!ctx.hostname || !hostMatchesDomain(ctx.hostname, entry.siteScope)))
      continue;
    let template;
    let composite = false;
    if (entry.answerType === "profile" && entry.mapsTo) {
      template = readProfilePath(ctx.profile, entry.mapsTo);
    } else if (entry.answerType === "composite" && entry.answerTemplate) {
      const rendered = renderComposite(entry.answerTemplate, ctx.profile);
      if (rendered.empty) continue;
      template = rendered.text;
      composite = true;
    } else {
      template = entry.answer;
    }
    if (!template.trim()) continue;
    const notify = entry.answerType === "notify";
    const aliasUnion = [.../* @__PURE__ */ new Set([...entry.aliases, ...catalogAliases.get(entry.id) ?? []])];
    out.push({
      questionTexts: [entry.question, ...aliasUnion],
      answerTemplate: template,
      source: `qa:${entry.id}`,
      personaSpecific,
      persona: personaSpecific ? ctx.activePersona ?? void 0 : void 0,
      needsReview: entry.status === "needs_review",
      composite,
      capSuggest: notify,
      notify,
      fallbacks: entry.fallbacks,
      sourceKind: entry.source,
      trusted: (entry.okCount ?? 0) >= TRUSTED_OK_COUNT && (entry.wrongCount ?? 0) === 0,
      judgeOnly: entry.answerMode === "judge" || void 0
    });
  }
  return out;
}
function seedCandidates(ctx) {
  const out = [];
  for (const seed of ctx.seeds) {
    if (seed.answerType === "freeText") continue;
    let template;
    let composite = false;
    let notify = false;
    if (seed.answerType === "profile" && seed.mapsTo) {
      template = readProfilePath(ctx.profile, seed.mapsTo);
    } else if (seed.answerType === "composite" && seed.answerTemplate) {
      const rendered = renderComposite(seed.answerTemplate, ctx.profile);
      if (rendered.empty) continue;
      template = rendered.text;
      composite = true;
    } else if (seed.answerType === "notify") {
      template = seed.guidance ?? "";
      notify = true;
    } else {
      continue;
    }
    if (!template.trim()) continue;
    out.push({
      questionTexts: [seed.question, ...seed.aliases],
      answerTemplate: template,
      source: "profile",
      personaSpecific: false,
      needsReview: false,
      composite,
      capSuggest: !seed.autofillByDefault || notify,
      notify,
      fallbacks: seed.fallbacks
    });
  }
  return out;
}
function inferPersona(roleText, personas) {
  if (!roleText) return null;
  const role = canonical(roleText);
  for (const persona of personas) {
    const p = canonical(persona);
    if (p && role.includes(p)) return persona;
  }
  return null;
}
const PERSONA_BOOST = 0.07;
const CAPTURED_AUTOFILL_MIN = 0.95;
const TRUSTED_OK_COUNT = 3;
const QUALIFIER_FAMILIES = [
  [
    ["current", "present", "existing", "today"],
    ["desire", "expect", "prefer", "target", "ideal", "request"]
  ],
  [
    ["previous", "previou", "prior", "former", "past", "last"],
    ["future", "next", "upcoming"]
  ],
  [
    ["start", "begin", "earliest", "first"],
    ["end", "finish", "latest", "final"]
  ],
  [
    ["minimum", "min", "lowest"],
    ["maximum", "max", "highest"]
  ]
];
function qualifierSet(text, family) {
  for (let i = 0; i < family.length; i++) {
    const hit = family[i].some(
      (w) => w.length >= 4 ? new RegExp(`\\b${w}\\w*\\b`, "i").test(text) : new RegExp(`\\b${w}\\b`, "i").test(text)
      // exact: min, max, end
    );
    if (hit) return i;
  }
  return null;
}
function conflictingQualifiers(a, b) {
  for (const family of QUALIFIER_FAMILIES) {
    const sa = qualifierSet(a, family);
    const sb = qualifierSet(b, family);
    if (sa !== null && sb !== null && sa !== sb) return true;
  }
  return false;
}
async function scoreCandidate(questionText, rawText, candidate, score) {
  let best = 0;
  for (const question of candidate.questionTexts) {
    const s = await score(questionText, question);
    if (s > best) best = s;
    if (rawText && rawText !== questionText) {
      const sRaw = 0.95 * await score(rawText, question);
      if (sRaw > best) best = sRaw;
    }
  }
  if (candidate.personaSpecific) best = Math.min(1, best + PERSONA_BOOST);
  return best;
}
function decideAction(confidence, settings, caps) {
  if (confidence < settings.suggestThreshold) return "ignore";
  if (confidence >= settings.autoFillThreshold && !caps.suggestOnly) return "autofill";
  return "suggest";
}
async function matchField(signal, ctx) {
  var _a;
  if (signal.kind === "file") {
    const doc = pickDocument(ctx.documents ?? [], {
      docCue: signal.docCue,
      accept: signal.accept,
      persona: ctx.activePersona
    });
    if (!doc) return null;
    const DOCUMENT_SCORE = 0.92;
    return {
      fieldId: signal.fieldId,
      resolvedAnswer: null,
      rawAnswerTemplate: doc.name,
      confidence: DOCUMENT_SCORE,
      source: `document:${doc.id}`,
      unresolvedVars: [],
      action: decideAction(DOCUMENT_SCORE, ctx.settings, {
        suggestOnly: !ctx.settings.autoAttachDocuments
      }),
      needsReview: false,
      composite: false
    };
  }
  const score = ctx.score ?? lexicalScore;
  const tier1 = signal.kind === "checkbox" ? null : tier1Match(signal, ctx);
  const questionText = decontextualize(signal.normalizedQuestion, ctx.pageContext, ctx.hostname);
  const rawText = decontextualize(canonical(signal.rawText), ctx.pageContext, ctx.hostname);
  const candidates = [...qaCandidates(ctx), ...seedCandidates(ctx)];
  const fieldTopicText = signal.label || signal.normalizedQuestion;
  const scored = [];
  for (const candidate of candidates) {
    if ((candidate.sourceKind === "captured" || candidate.sourceKind === "inferred") && crossesEeoTopic(fieldTopicText, candidate.questionTexts[0]))
      continue;
    const s = await scoreCandidate(questionText, rawText, candidate, score);
    if (s > 0) scored.push({ candidate, score: s });
  }
  const clearing = scored.filter((s) => s.score >= ctx.settings.suggestThreshold);
  const curatedRank = (s) => s.candidate.sourceKind === "captured" || s.candidate.sourceKind === "inferred" ? 0 : 1;
  const pickBest = (pool) => pool.reduce((best2, s) => {
    if (!best2) return s;
    if (s.score > best2.score) return s;
    if (s.score === best2.score && curatedRank(s) > curatedRank(best2)) return s;
    return best2;
  }, null);
  const bestClearing = pickBest(clearing);
  const judgeOnlyRule = !!(bestClearing == null ? void 0 : bestClearing.candidate.judgeOnly) && bestClearing.score >= 0.8;
  let best = null;
  if (signal.multiplicityCue) best = pickBest(clearing.filter((s) => s.candidate.composite));
  if (!best) {
    const personaPool = clearing.filter((s) => s.candidate.personaSpecific);
    best = pickBest(personaPool) ?? pickBest(scored);
  }
  const optionKind = signal.kind === "select" || signal.kind === "radio" || signal.kind === "custom-dropdown";
  let driftHit = false;
  if ((!best || best.score < ctx.settings.suggestThreshold) && optionKind && semanticQuestionMatcher && candidates.length > 0) {
    const pool = candidates.slice(0, 40);
    const index = await semanticQuestionMatcher(
      signal.label || questionText,
      pool.map((c) => c.questionTexts[0])
    );
    if (index !== null && pool[index]) {
      best = { candidate: pool[index], score: 0.87 };
      driftHit = pool[index].source.startsWith("qa:");
    }
  }
  const tier2Confidence = (best == null ? void 0 : best.score) ?? 0;
  const entryKey = (tier1 == null ? void 0 : tier1.matchedKey) ?? "";
  const educationEntryKey = entryKey.startsWith("education.");
  const workEntryKey = WORK_SECTION_KEYS.has(entryKey);
  const indexedSectionEntry = tier1 !== null && signal.sectionIndex !== void 0 && (signal.sectionKind === "education" && educationEntryKey || signal.sectionKind === "work" && workEntryKey);
  const repeatedEntryKey = tier1 !== null && (((_a = ctx.tier1KeyCounts) == null ? void 0 : _a[entryKey]) ?? 0) >= 2 && (educationEntryKey || signal.sectionKind === "work" && workEntryKey);
  const sectionEntryAnswer = indexedSectionEntry || repeatedEntryKey;
  const useTier1 = tier1 !== null && (sectionEntryAnswer || tier1.confidence >= tier2Confidence);
  const tier1Res = tier1 ? {
    template: tier1.value,
    confidence: tier1.confidence,
    source: "profile",
    needsReview: false,
    composite: false,
    capSuggest: false,
    matchedKey: tier1.matchedKey,
    fallbacks: tier1.fallbacks
  } : null;
  const toResolution = (s) => ({
    template: s.candidate.answerTemplate,
    confidence: s.score,
    source: s.candidate.source,
    needsReview: s.candidate.needsReview,
    composite: s.candidate.composite,
    persona: s.candidate.persona,
    capSuggest: s.candidate.capSuggest,
    notify: s.candidate.notify,
    fallbacks: s.candidate.fallbacks,
    provenance: driftHit && best === s ? "drift" : void 0,
    sourceKind: s.candidate.sourceKind,
    trusted: s.candidate.trusted,
    primaryQuestion: s.candidate.questionTexts[0],
    judgeOnly: s.candidate.judgeOnly
  });
  const ranked = [];
  if (useTier1 && tier1Res) ranked.push(tier1Res);
  if (best && !sectionEntryAnswer) ranked.push(toResolution(best));
  if (!useTier1 && tier1Res) ranked.push(tier1Res);
  if (!sectionEntryAnswer) {
    for (const s of [...clearing].sort((a, b) => b.score - a.score)) {
      if (s !== best) ranked.push(toResolution(s));
    }
  }
  if (ranked.length === 0) {
    const questionForJudge = signal.label || signal.normalizedQuestion;
    if (signal.eeoLike || signal.consentLike) return null;
    if (semanticAnswerer && (signal.kind === "select" || signal.kind === "radio") && signal.options.length > 0) {
      const index = await semanticAnswerer(
        questionForJudge,
        signal.options.map((o) => o.text),
        buildFactSheet(ctx, questionForJudge)
      );
      if (index !== null && signal.options[index]) {
        const option = signal.options[index];
        return {
          fieldId: signal.fieldId,
          resolvedAnswer: null,
          rawAnswerTemplate: option.text,
          confidence: INFERENCE_SCORE,
          source: "profile",
          unresolvedVars: [],
          // valueless radios all read value "on" — a value pin resolves
          // first-match-wins in fillRadioGroup and lands the pick on the
          // wrong duplicate (polarity flip). Radios place by exact text walk.
          chosenOptionValue: signal.kind === "select" ? option.value || option.text : void 0,
          action: decideAction(INFERENCE_SCORE, ctx.settings, { suggestOnly: false }),
          needsReview: false,
          composite: false,
          provenance: "inferred"
        };
      }
      return null;
    }
    if (semanticAnswerer && signal.kind === "custom-dropdown") {
      return {
        fieldId: signal.fieldId,
        resolvedAnswer: null,
        rawAnswerTemplate: "",
        confidence: INFERENCE_SCORE,
        source: "profile",
        unresolvedVars: [],
        action: decideAction(INFERENCE_SCORE, ctx.settings, { suggestOnly: false }),
        needsReview: false,
        composite: false,
        inferAtFill: true,
        provenance: "inferred"
      };
    }
    if (semanticTextAnswerer && (signal.kind === "text" || signal.kind === "textarea") && questionForJudge.trim() !== "") {
      if (isIdentityLabel(signal.label)) return null;
      const text = await semanticTextAnswerer(
        questionForJudge,
        buildFactSheet(ctx, questionForJudge),
        signal.kind === "textarea" ? "textarea" : "text"
      );
      if (text) {
        return {
          fieldId: signal.fieldId,
          resolvedAnswer: null,
          rawAnswerTemplate: text,
          confidence: INFERENCE_SCORE,
          source: "profile",
          unresolvedVars: [],
          action: decideAction(INFERENCE_SCORE, ctx.settings, { suggestOnly: false }),
          needsReview: false,
          composite: false,
          provenance: "inferred"
        };
      }
    }
    return null;
  }
  let resolution = ranked[0];
  let chosenOptionValue;
  let chosenOptionValues;
  let optionScore;
  let placedTemplate;
  if (signal.kind === "select" || signal.kind === "radio") {
    if (!judgeOnlyRule) {
      outer: for (const candidate of ranked) {
        if (candidate.notify) continue;
        if (candidate.judgeOnly) continue;
        for (const answer of [candidate.template, ...candidate.fallbacks ?? []]) {
          const choice = chooseOption(signal.options, answer, ctx.optionSets);
          if (choice) {
            resolution = candidate;
            chosenOptionValue = choice.value;
            optionScore = choice.score;
            placedTemplate = answer;
            break outer;
          }
        }
      }
    }
    if (chosenOptionValue === void 0 && !ranked[0].notify) {
      const semantic = await semanticChooseOption(signal.options, ranked[0].template);
      if (semantic) {
        resolution = ranked[0];
        chosenOptionValue = semantic.value || semantic.text;
        optionScore = semantic.score;
      }
    }
  }
  let { template, confidence, source, needsReview, composite, persona, capSuggest } = resolution;
  if (placedTemplate !== void 0) template = placedTemplate;
  const questionScore = resolution.confidence;
  const checkboxGroup = signal.kind === "checkbox" && signal.options.length > 1;
  if (signal.multiplicityCue && !composite && !checkboxGroup) capSuggest = true;
  if (needsReview) capSuggest = true;
  const fieldQuestionText = signal.label || signal.normalizedQuestion;
  const qualifierConflict = !!resolution.primaryQuestion && conflictingQualifiers(fieldQuestionText, resolution.primaryQuestion);
  if (qualifierConflict) capSuggest = true;
  let semanticExact = false;
  if (semanticSimilarity$1 && resolution.primaryQuestion && !qualifierConflict && !resolution.notify && questionScore < CAPTURED_AUTOFILL_MIN) {
    const own = await semanticSimilarity$1(fieldQuestionText, resolution.primaryQuestion);
    if (own !== null && own >= EMBED_SAME_QUESTION) {
      let rivalSim = 0;
      const ownAnswer = canonicalAnswer(resolution.template);
      for (const s of scored) {
        if (best && s === best) continue;
        if (canonicalAnswer(s.candidate.answerTemplate) === ownAnswer) continue;
        const sim = await semanticSimilarity$1(fieldQuestionText, s.candidate.questionTexts[0]);
        if (sim !== null && sim > rivalSim) rivalSim = sim;
      }
      if (own - rivalSim >= EMBED_MARGIN) {
        semanticExact = true;
        confidence = Math.max(confidence, Math.min(own, 0.93));
      } else {
        confidence = Math.max(confidence, 0.75);
        capSuggest = true;
      }
    }
  }
  if ((resolution.sourceKind === "captured" || resolution.sourceKind === "inferred") && !resolution.trusted && questionScore < CAPTURED_AUTOFILL_MIN && !semanticExact)
    capSuggest = true;
  if ((resolution.sourceKind === "captured" || resolution.sourceKind === "inferred") && !resolution.trusted && resolution.primaryQuestion && questionScore >= CAPTURED_AUTOFILL_MIN) {
    const primaryScore = await score(questionText, resolution.primaryQuestion);
    if (primaryScore < 0.2) capSuggest = true;
  }
  const unresolvedVars = detectVariables(template).filter((v) => !v.startsWith("profile."));
  if (signal.kind === "select" || signal.kind === "radio") {
    if (chosenOptionValue !== void 0 && optionScore !== void 0) {
      confidence = Math.min(confidence, Math.max(optionScore, 0.6));
    } else if (signal.kind === "select" && realOptionCount(signal.options) === 0) ;
    else {
      if (detectVariables(template).length > 0) confidence = Math.min(confidence, 0.3);
      capSuggest = true;
    }
  } else if (checkboxGroup) {
    const choices = chooseOptions(signal.options, template, ctx.optionSets);
    if (choices.length > 0) {
      chosenOptionValues = choices.map((c) => c.text);
      const worst = Math.min(...choices.map((c) => c.score));
      confidence = Math.min(confidence, Math.max(worst, 0.6));
    } else {
      capSuggest = true;
    }
  } else if (signal.kind === "checkbox") {
    if (YES_RE.test(template.trim())) chosenOptionValue = "checked";
    else if (NO_RE.test(template.trim())) chosenOptionValue = "unchecked";
    else {
      const intent = classifyIntent(template);
      if (intent === "affirm") chosenOptionValue = "checked";
      else if (intent === "negate") chosenOptionValue = "unchecked";
      else capSuggest = true;
    }
  }
  if (resolution.notify) capSuggest = true;
  const action = decideAction(confidence, ctx.settings, { suggestOnly: capSuggest });
  return {
    fieldId: signal.fieldId,
    resolvedAnswer: null,
    // resolved at fill time (Section 7)
    rawAnswerTemplate: template,
    confidence,
    source,
    persona,
    unresolvedVars,
    chosenOptionValue,
    chosenOptionValues,
    action,
    needsReview,
    composite,
    matchedKey: resolution.matchedKey,
    notify: resolution.notify,
    answerFallbacks: resolution.fallbacks,
    provenance: resolution.provenance,
    judgeOnly: judgeOnlyRule || void 0
  };
}
async function matchAll(signals, ctx) {
  var _a, _b;
  const usageCounts = ctx.usageCounts = ctx.usageCounts || {};
  const tier1KeyCounts = ctx.tier1KeyCounts = {};
  for (const signal of signals) {
    if (signal.kind === "checkbox" || signal.kind === "file") continue;
    const key = (_a = tier1Match(signal, ctx)) == null ? void 0 : _a.matchedKey;
    if (key) tier1KeyCounts[key] = (tier1KeyCounts[key] || 0) + 1;
  }
  const bump = (signal, matchedKey) => {
    if (!matchedKey || signal.sectionIndex !== void 0) return;
    usageCounts[matchedKey] = (usageCounts[matchedKey] || 0) + 1;
  };
  const results = /* @__PURE__ */ new Map();
  for (const signal of signals) {
    if (signal.filled && !ctx.settings.overwriteFilled) {
      if (signal.kind !== "checkbox" && !signal.consentLike) {
        bump(signal, (_b = tier1Match(signal, ctx)) == null ? void 0 : _b.matchedKey);
      }
      continue;
    }
    const match = await matchField(signal, ctx);
    if (match) {
      results.set(signal.fieldId, match);
      if (match.source === "profile") bump(signal, match.matchedKey);
    }
  }
  return results;
}
const AI_FILL_MAX_TARGETS = 15;
const AI_FILL_CONFIDENCE = 0.86;
const INFERABLE_KINDS = /* @__PURE__ */ new Set(["select", "radio", "custom-dropdown", "text", "textarea"]);
function selectAiFillTargets(report, max = AI_FILL_MAX_TARGETS) {
  const answerable = [];
  const unanswered = [];
  const skipped = [];
  for (const entry of report) {
    if (entry.verdict !== "missing-answerable" && entry.verdict !== "missing-unanswered") continue;
    const why = entry.eeoLike ? "eeo" : entry.consentLike ? "consent" : entry.kind === "file" ? "file" : entry.kind === "password" ? "password" : entry.verdict === "missing-unanswered" && !INFERABLE_KINDS.has(entry.kind) ? "unsupported-kind" : null;
    if (why) {
      skipped.push({ entry, why });
      continue;
    }
    (entry.verdict === "missing-answerable" ? answerable : unanswered).push({
      entry,
      reason: entry.verdict
    });
  }
  const targets = [...answerable, ...unanswered];
  return {
    targets: targets.slice(0, max),
    skipped,
    overflow: Math.max(0, targets.length - max)
  };
}
function judgeRetryMatch(stored) {
  return {
    ...stored,
    action: "autofill",
    // explicit button press — never downgrade to suggest
    needsReview: false,
    judgeOnly: true,
    chosenOptionValue: void 0,
    // the scan-time pick is what failed; re-place
    chosenOptionValues: void 0
  };
}
function inferDropdownMatch(fieldId) {
  return {
    fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: "",
    confidence: AI_FILL_CONFIDENCE,
    source: "profile",
    unresolvedVars: [],
    action: "autofill",
    needsReview: false,
    composite: false,
    inferAtFill: true,
    provenance: "inferred"
  };
}
function inferOptionMatch(fieldId, option, kind) {
  return {
    fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: option.text,
    confidence: AI_FILL_CONFIDENCE,
    source: "profile",
    unresolvedVars: [],
    // Radio values are often empty or DUPLICATED (valueless radios all read
    // "on"), and fillRadioGroup resolves a pinned value first-match-wins — a
    // duplicate lands the judge's pick on the WRONG option (polarity flip,
    // review repro 2026-07-21). Radios place by exact text walk instead;
    // selects keep the value pin.
    chosenOptionValue: kind === "select" ? option.value || option.text : void 0,
    action: "autofill",
    needsReview: false,
    composite: false,
    provenance: "inferred"
  };
}
function inferTextMatch(fieldId, text) {
  return {
    fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: text,
    confidence: AI_FILL_CONFIDENCE,
    source: "profile",
    unresolvedVars: [],
    action: "autofill",
    needsReview: false,
    composite: false,
    provenance: "inferred"
  };
}
function createJudgeCache(send, max = 200) {
  const cache = /* @__PURE__ */ new Map();
  const declines = /* @__PURE__ */ new Set();
  return {
    ask(message, read) {
      const key = JSON.stringify(message);
      let pending = cache.get(key);
      if (!pending) {
        pending = send(message).catch(() => void 0);
        if (cache.size >= max) {
          const oldest = cache.keys().next().value;
          if (oldest !== void 0) {
            cache.delete(oldest);
            declines.delete(oldest);
          }
        }
        cache.set(key, pending);
      }
      return pending.then((response) => {
        const r = response;
        const value = (r == null ? void 0 : r.ok) ? read(response) : null;
        if (value === null) declines.add(key);
        else declines.delete(key);
        return value;
      });
    },
    evictDeclines() {
      let evicted = 0;
      for (const key of declines) {
        if (cache.delete(key)) evicted++;
      }
      declines.clear();
      return evicted;
    },
    size: () => cache.size
  };
}
const CACHE_KEY = "flashfiller_embed_cache_v1";
const CACHE_MAX_ENTRIES = 3e3;
let mem = null;
let unavailable = false;
let persistTimer = 0;
function keyOf(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 300);
}
async function loadCache() {
  if (mem) return mem;
  mem = /* @__PURE__ */ new Map();
  try {
    const raw = await chrome.storage.local.get(CACHE_KEY);
    const stored = raw[CACHE_KEY];
    if (stored) for (const [k, v] of Object.entries(stored)) mem.set(k, v);
  } catch {
  }
  return mem;
}
function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = 0;
    const cache = mem;
    if (!cache) return;
    if (cache.size > CACHE_MAX_ENTRIES) cache.clear();
    void chrome.storage.local.set({ [CACHE_KEY]: Object.fromEntries(cache) }).catch(() => void 0);
  }, 1500);
}
async function fetchVectors(texts) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "SEMANTIC_EMBED",
      texts
    });
    if (!(response == null ? void 0 : response.ok) || !response.vectors) return null;
    return response.vectors;
  } catch {
    return null;
  }
}
async function prefetchEmbeddings(texts) {
  if (unavailable || texts.length === 0) return;
  const cache = await loadCache();
  const missing = [];
  const seen = /* @__PURE__ */ new Set();
  for (const text of texts) {
    const key = keyOf(text);
    if (!key || cache.has(key) || seen.has(key)) continue;
    seen.add(key);
    missing.push(text.trim());
  }
  if (missing.length === 0) return;
  const vectors = await fetchVectors(missing.slice(0, 256));
  if (!vectors) {
    unavailable = true;
    return;
  }
  vectors.forEach((v, i) => {
    if (Array.isArray(v) && v.length > 0) cache.set(keyOf(missing[i]), v);
  });
  schedulePersist();
}
function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
async function semanticSimilarity(a, b) {
  if (unavailable) return null;
  if (!a.trim() || !b.trim()) return null;
  const cache = await loadCache();
  const ka = keyOf(a);
  const kb = keyOf(b);
  if (ka === kb) return 1;
  if (!cache.has(ka) || !cache.has(kb)) await prefetchEmbeddings([a, b]);
  const va = cache.get(ka);
  const vb = cache.get(kb);
  if (!va || !vb) return null;
  return Math.max(0, cosine(va, vb));
}
function setNativeValue(el, value) {
  var _a;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = (_a = Object.getOwnPropertyDescriptor(proto, "value")) == null ? void 0 : _a.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
function formatDateForInput(value, targetType, placeholder = "") {
  const parts = parseDateParts(value);
  if (!parts) return value;
  const { year, month, day } = parts;
  if (targetType === "month") return `${year}-${month}`;
  if (targetType === "date") return `${year}-${month}-${day}`;
  if (targetType === "text") {
    const p = placeholder.toUpperCase();
    if (p.includes("MM/YYYY") || p.includes("MM / YYYY")) return `${month}/${year}`;
    if (p.includes("YYYY-MM-DD") || p.includes("YYYY/MM/DD")) return `${year}-${month}-${day}`;
    if (p.includes("MM/DD/YYYY") || p.includes("MM / DD / YYYY")) return `${month}/${day}/${year}`;
    if (p.includes("DD/MM/YYYY") || p.includes("DD / MM / YYYY")) return `${day}/${month}/${year}`;
  }
  return value;
}
function syntheticKeyEvent(type, ch) {
  const event = new KeyboardEvent(type, {
    key: ch,
    code: /^\d$/.test(ch) ? `Digit${ch}` : `Key${ch.toUpperCase()}`,
    bubbles: true,
    cancelable: true
  });
  const legacy = ch.charCodeAt(0);
  Object.defineProperty(event, "keyCode", { get: () => legacy });
  Object.defineProperty(event, "which", { get: () => legacy });
  return event;
}
function typeChar(target, ch, replace) {
  var _a;
  const browserInserts = target.dispatchEvent(syntheticKeyEvent("keydown", ch));
  if (browserInserts) {
    target.dispatchEvent(syntheticKeyEvent("keypress", ch));
    let inserted = false;
    try {
      inserted = typeof document.execCommand === "function" && document.execCommand("insertText", false, ch);
    } catch {
      inserted = false;
    }
    if (!inserted) {
      target.dispatchEvent(
        new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: ch })
      );
      const setter = (_a = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")) == null ? void 0 : _a.set;
      const next = replace ? ch : target.value + ch;
      if (setter) setter.call(target, next);
      else target.value = next;
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: ch }));
    }
  }
  target.dispatchEvent(syntheticKeyEvent("keyup", ch));
}
const numericEqual = (a, b) => parseInt(a, 10) === parseInt(b, 10);
function fillDateSegments(segments, value) {
  const parts = parseDateParts(value);
  if (!parts) return "failed";
  const writes = [];
  if (segments.month) writes.push([segments.month, parts.month]);
  if (segments.day) writes.push([segments.day, parts.day]);
  if (segments.year) writes.push([segments.year, parts.year]);
  if (writes.length === 0) return "failed";
  const doc = writes[0][0].ownerDocument;
  const isSegment = (node) => node === segments.month || node === segments.day || node === segments.year;
  for (const [el, segment] of writes) {
    if (doc.activeElement !== el) {
      el.focus();
      if (el.value) el.select();
    }
    let first = true;
    for (const ch of segment) {
      const active2 = doc.activeElement;
      const target = isSegment(active2) ? active2 : el;
      typeChar(target, ch, first && target === el);
      first = false;
    }
    if (numericEqual(el.value, segment)) {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      setNativeValue(el, segment);
    }
  }
  const active = doc.activeElement;
  (isSegment(active) ? active : writes[writes.length - 1][0]).blur();
  return writes.every(([el, segment]) => numericEqual(el.value, segment)) ? "filled" : "failed";
}
function fillTextInput(el, value, signal) {
  el.focus();
  let finalValue = value;
  if (el instanceof HTMLInputElement && (el.type === "date" || el.type === "month" || (signal == null ? void 0 : signal.kind) === "date")) {
    finalValue = formatDateForInput(value, el.type, (signal == null ? void 0 : signal.placeholder) || "");
  }
  setNativeValue(el, finalValue);
  el.blur();
  return el.value === finalValue ? "filled" : "failed";
}
const SELECT_OPTIONS_TIMEOUT_MS = 3e3;
async function fillSelect(el, optionValue, answerText, optionSets = [], answerFallbacks = [], judgeOnly = false) {
  const liveOptions = () => [...el.options].map((o) => ({ value: o.value, text: o.text.trim() }));
  if (realOptionCount(liveOptions()) === 0) {
    const deadline = Date.now() + SELECT_OPTIONS_TIMEOUT_MS;
    while (realOptionCount(liveOptions()) === 0 && Date.now() < deadline) {
      await wait(DROPDOWN_POLL_MS);
    }
  }
  const domOptions = [...el.options];
  let target = optionValue !== void 0 && domOptions.some((o) => o.value === optionValue) ? domOptions.find((o) => o.value === optionValue) : void 0;
  const candidates = domOptions.filter((o) => o.value !== "" || o.text.trim() !== "");
  const asOptions = candidates.map((o) => ({ value: o.value, text: o.text.trim() }));
  if (!target && !judgeOnly) {
    for (const answer of [answerText, ...answerFallbacks]) {
      const choice = chooseOption(asOptions, answer, optionSets);
      if (choice) {
        target = candidates[choice.index];
        break;
      }
    }
  }
  if (!target) {
    const semantic = await semanticChooseOption(asOptions, answerText);
    if (semantic) target = candidates[semantic.index];
  }
  if (!target) return "failed";
  const targetIndex = domOptions.indexOf(target);
  el.focus();
  el.selectedIndex = targetIndex;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  if (el.selectedIndex === targetIndex) return "filled";
  await wait(300);
  return el.selectedIndex === targetIndex ? "filled" : "failed";
}
async function fillRadioGroup(radios, chosenValue, answerText, optionSets = [], answerFallbacks = [], judgeOnly = false) {
  let target = chosenValue !== void 0 ? radios.find((r) => r.value === chosenValue) : void 0;
  const asOptions = radios.map((r) => ({
    value: r.value,
    text: (resolveOptionText(r, r.ownerDocument ?? document) || r.value).trim()
  }));
  if (!target && !judgeOnly) {
    for (const answer of [answerText, ...answerFallbacks]) {
      const choice = chooseOption(asOptions, answer, optionSets);
      if (choice) {
        target = radios[choice.index];
        break;
      }
    }
  }
  if (!target) {
    const semantic = await semanticChooseOption(asOptions, answerText);
    if (semantic) target = radios[semantic.index];
  }
  if (!target) return "failed";
  target.click();
  return target.checked ? "filled" : "failed";
}
async function fillPillGroup(pills, chosenValue, answerText, optionSets = [], answerFallbacks = [], judgeOnly = false, multi = false) {
  const isPressed = (p) => p.getAttribute("aria-pressed") === "true";
  const asOptions = pills.map((p) => {
    const text = (p.textContent ?? "").trim();
    return { value: text, text };
  });
  const press = async (target, wantText) => {
    if (isPressed(target)) return true;
    userClick(target);
    let deadline = Date.now() + 1500;
    while (Date.now() < deadline) {
      if (isPressed(target)) return true;
      await wait(DROPDOWN_POLL_MS);
    }
    if (isPressed(target)) return true;
    if (!target.isConnected || (target.textContent ?? "").trim() !== wantText) {
      dropdownDebug("pill", `target node recycled before escalation ("${wantText}") — honest fail`);
      return false;
    }
    dropdownDebug("pill", `aria-pressed unchanged after click on "${wantText}" — escalating`);
    if (await trustedClick(target)) {
      deadline = Date.now() + 800;
      while (Date.now() < deadline) {
        if (isPressed(target)) return true;
        await wait(DROPDOWN_POLL_MS);
      }
    }
    return false;
  };
  if (multi) {
    let indexes = judgeOnly ? [] : chooseOptions(asOptions, answerText, optionSets).map((c) => c.index);
    if (indexes.length === 0) {
      const semantic = await semanticChooseOption(asOptions, answerText);
      if (semantic) indexes = [semantic.index];
    }
    if (indexes.length === 0) return { outcome: "failed", pickedText: null };
    let allPressed = true;
    const pressed = [];
    for (const index of new Set(indexes)) {
      if (await press(pills[index], asOptions[index].text)) pressed.push(asOptions[index].text);
      else allPressed = false;
    }
    return allPressed ? { outcome: "filled", pickedText: pressed.join("; ") } : { outcome: "failed", pickedText: null };
  }
  let targetIndex = -1;
  if (chosenValue !== void 0) {
    targetIndex = asOptions.findIndex((o) => o.text === chosenValue);
  }
  if (targetIndex < 0 && !judgeOnly) {
    for (const answer of [answerText, ...answerFallbacks]) {
      const choice = chooseOption(asOptions, answer, optionSets);
      if (choice) {
        targetIndex = choice.index;
        break;
      }
    }
  }
  if (targetIndex < 0) {
    const semantic = await semanticChooseOption(asOptions, answerText);
    if (semantic) targetIndex = semantic.index;
  }
  if (targetIndex < 0) return { outcome: "failed", pickedText: null };
  const ok = await press(pills[targetIndex], asOptions[targetIndex].text);
  return ok ? { outcome: "filled", pickedText: asOptions[targetIndex].text } : { outcome: "failed", pickedText: null };
}
function fillCheckbox(el, shouldCheck, blockConsent) {
  if (el.checked !== shouldCheck) el.click();
  return el.checked === shouldCheck ? "filled" : "failed";
}
function fillCheckboxGroup(boxes, answerText, optionSets = [], consentLike = false) {
  if (consentLike) return "refused";
  const options = boxes.map((box) => {
    var _a, _b;
    return {
      value: box.value,
      text: (((_b = (_a = box.labels) == null ? void 0 : _a[0]) == null ? void 0 : _b.textContent) ?? box.value).trim()
    };
  });
  const choices = chooseOptions(options, answerText, optionSets);
  if (choices.length === 0) return "failed";
  const want = new Set(choices.map((c) => c.index));
  for (const index of want) {
    if (!boxes[index].checked) boxes[index].click();
  }
  return choices.every((c) => boxes[c.index].checked) ? "filled" : "failed";
}
function fillContentEditable(el, value) {
  el.focus();
  el.dispatchEvent(
    new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: value })
  );
  el.textContent = value;
  el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  el.blur();
  return (el.textContent ?? "") === value ? "filled" : "failed";
}
const DROPDOWN_POLL_MS = 100;
const DROPDOWN_TIMEOUT_MS = 5e3;
const SUBLEVEL_TIMEOUT_MS = 600;
const SUBLEVEL_FETCH_TIMEOUT_MS = 4e3;
const EXPLORE_CAP = 8;
const MAX_PROMPT_DEPTH = 3;
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const DEFAULT_OPTION_SELECTOR = '[role="option"], [role="listbox"] li, [role="menu"] [role="menuitem"], [role="menu"] [role="menuitemradio"], [role="tree"] [role="treeitem"]';
function isVisibleOption(el) {
  if (el.closest('[hidden], [aria-hidden="true"]')) return false;
  let node = el;
  for (let depth = 0; node && depth < 4; depth++) {
    if (node.style.display === "none" || node.style.visibility === "hidden") return false;
    if (typeof getComputedStyle === "function") {
      const computed = getComputedStyle(node);
      if (computed.display === "none" || computed.visibility === "hidden") return false;
    }
    node = node.parentElement;
  }
  return true;
}
function findDropdownOptions(doc, hostname) {
  var _a;
  const adapterSelector = (_a = getAdapter(hostname, doc)) == null ? void 0 : _a.dropdownOptionSelector;
  const selector = adapterSelector ?? DEFAULT_OPTION_SELECTOR;
  return [...doc.querySelectorAll(selector)].filter(
    (o) => o.textContent && o.textContent.trim() !== "" && isVisibleOption(o)
  );
}
const optionSignature = (options) => options.map((o) => {
  var _a;
  return ((_a = o.textContent) == null ? void 0 : _a.trim()) ?? "";
}).join("\0");
const asFieldOptions = (options) => options.map((o) => {
  var _a;
  const text = ((_a = o.textContent) == null ? void 0 : _a.trim()) ?? "";
  return { value: text, text };
});
const OPAQUE_VALUE_RE = /^[0-9a-f]{24,40}$/i;
function displayTextOf(el) {
  var _a;
  const value = el.value;
  if (typeof value === "string" && value.trim() && !OPAQUE_VALUE_RE.test(value.trim()))
    return value.trim();
  const aria = el.getAttribute("aria-valuetext");
  if (aria == null ? void 0 : aria.trim()) return aria.trim();
  const text = ((_a = el.textContent) == null ? void 0 : _a.trim()) ?? "";
  return OPAQUE_VALUE_RE.test(text) ? "" : text;
}
function userClick(target) {
  const init = { bubbles: true, cancelable: true, composed: true };
  if (typeof PointerEvent === "function") {
    target.dispatchEvent(new PointerEvent("pointerover", init));
    target.dispatchEvent(new PointerEvent("pointerdown", init));
  }
  target.dispatchEvent(new MouseEvent("mouseover", init));
  target.dispatchEvent(new MouseEvent("mousedown", init));
  if (typeof PointerEvent === "function") target.dispatchEvent(new PointerEvent("pointerup", init));
  target.dispatchEvent(new MouseEvent("mouseup", init));
  target.click();
}
function clickOptionElement(option) {
  let target = option;
  while (target.firstElementChild instanceof HTMLElement && target.children.length === 1) {
    target = target.firstElementChild;
  }
  userClick(target);
}
function dropdownDebug(step, detail) {
  console.debug(`[FlashFiller] dropdown ${step}: ${detail}`);
}
function pressKey(target, key) {
  const code = /^[a-z0-9]$/i.test(key) ? /\d/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}` : key;
  target.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true, cancelable: true }));
  target.dispatchEvent(new KeyboardEvent("keyup", { key, code, bubbles: true }));
}
async function pollForOptions(doc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let options = [];
  while (Date.now() < deadline) {
    options = findDropdownOptions(doc, doc.location.hostname);
    if (options.length > 0) break;
    await wait(DROPDOWN_POLL_MS);
  }
  return options;
}
function makeOptionScope(doc, el) {
  const pre = new Set(findDropdownOptions(doc, doc.location.hostname));
  return (all) => {
    const fresh = all.filter((o) => !pre.has(o));
    if (fresh.length > 0) return fresh;
    const ids = `${el.getAttribute("aria-controls") ?? ""} ${el.getAttribute("aria-owns") ?? ""}`.trim().split(/\s+/).filter(Boolean);
    for (const id of ids) {
      const owned = doc.getElementById(id);
      if (owned) {
        const within = all.filter((o) => owned.contains(o));
        if (within.length > 0) return within;
      }
    }
    const inside = all.filter((o) => el.contains(o));
    if (inside.length > 0) return inside;
    return pre.size === 0 ? all : [];
  };
}
async function pollForScopedOptions(doc, timeoutMs, scope) {
  const deadline = Date.now() + timeoutMs;
  for (; ; ) {
    const scoped = scope(findDropdownOptions(doc, doc.location.hostname));
    if (scoped.length > 0 || Date.now() >= deadline) return scoped;
    await wait(DROPDOWN_POLL_MS);
  }
}
async function pollForFilteredOptions(doc, timeoutMs, scope, staleSignature) {
  const deadline = Date.now() + timeoutMs;
  for (; ; ) {
    const scoped = scope(findDropdownOptions(doc, doc.location.hostname));
    if (scoped.length > 0 && optionSignature(scoped) !== staleSignature) return scoped;
    if (Date.now() >= deadline) return [];
    await wait(DROPDOWN_POLL_MS);
  }
}
const SCROLL_TIER_MIN_OPTIONS = 8;
const SCROLL_TIER_STEPS = 7;
function scrollContainerOf(option) {
  let node = option.parentElement;
  for (let depth = 0; node && depth < 6; depth++) {
    if (node.scrollHeight > node.clientHeight + 40 && node.clientHeight > 0) return node;
    node = node.parentElement;
  }
  return null;
}
function alphabeticalFraction(answer) {
  const s = answer.trim().toLowerCase();
  const a = s.charCodeAt(0);
  if (Number.isNaN(a) || a < 97 || a > 122) return 0.5;
  const first = (a - 97) / 26;
  const b = s.charCodeAt(1);
  const second = b >= 97 && b <= 122 ? (b - 97) / 26 : 0.5;
  return Math.min(0.98, first + second / 26);
}
async function scrollCatalogTier(doc, scope, initialOptions, choose, answers) {
  if (initialOptions.length < SCROLL_TIER_MIN_OPTIONS) return null;
  const container = scrollContainerOf(initialOptions[0]);
  if (!container) return null;
  const target = answers[0];
  if (!target) return null;
  let fraction = alphabeticalFraction(target);
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < SCROLL_TIER_STEPS; step++) {
    const max = container.scrollHeight - container.clientHeight;
    if (max <= 0) return null;
    container.scrollTop = Math.round(fraction * max);
    container.dispatchEvent(new Event("scroll", { bubbles: true }));
    await wait(160);
    const options = scope(findDropdownOptions(doc, doc.location.hostname));
    if (options.length === 0) return null;
    const choice = choose(asFieldOptions(options));
    if (choice) {
      dropdownDebug("scroll", `step ${step}: window at ${(fraction * 100).toFixed(0)}% has the answer`);
      return { options, index: choice.index };
    }
    const texts = options.map((o) => (o.textContent ?? "").trim().toLowerCase()).filter(Boolean);
    if (texts.length === 0) return null;
    const t = target.trim().toLowerCase();
    if (t < texts[0]) hi = fraction;
    else if (t > texts[texts.length - 1]) lo = fraction;
    else return null;
    const next = (lo + hi) / 2;
    if (Math.abs(next - fraction) < 0.01) return null;
    fraction = next;
  }
  return null;
}
const defaultTrustedClick = async (el) => {
  var _a;
  try {
    const runtime = (_a = globalThis.chrome) == null ? void 0 : _a.runtime;
    if (!(runtime == null ? void 0 : runtime.sendMessage) || window !== window.top) return false;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    await wait(80);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const response = await runtime.sendMessage({
      type: "TRUSTED_CLICK",
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2)
    });
    return !!(response == null ? void 0 : response.ok);
  } catch {
    return false;
  }
};
let trustedClick = defaultTrustedClick;
const defaultTrustedType = async (el, text) => {
  var _a;
  try {
    if (!await trustedClick(el)) return false;
    const runtime = (_a = globalThis.chrome) == null ? void 0 : _a.runtime;
    if (!(runtime == null ? void 0 : runtime.sendMessage)) return false;
    const response = await runtime.sendMessage({ type: "TRUSTED_TYPE", text });
    return !!(response == null ? void 0 : response.ok);
  } catch {
    return false;
  }
};
let trustedType = defaultTrustedType;
async function trustedSelect(el, answerText, optionSets, initialDisplay) {
  const doc = el.ownerDocument;
  if (!await trustedClick(el)) return "failed";
  const options = await pollForOptions(doc, 3e3);
  if (options.length === 0) return "failed";
  const choice = chooseOption(asFieldOptions(options), answerText, optionSets);
  if (!choice) {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return "failed";
  }
  if (!await trustedClick(options[choice.index])) return "failed";
  if (!initialDisplay) return "filled";
  const deadline = Date.now() + 1200;
  while (Date.now() < deadline) {
    if (displayTextOf(el) !== initialDisplay) return "filled";
    await wait(DROPDOWN_POLL_MS);
  }
  return "failed";
}
const MONTH_STEMS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
async function pollFor(get, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let result = get();
  while (!result && Date.now() < deadline) {
    await wait(DROPDOWN_POLL_MS);
    result = get();
  }
  return result;
}
function cellMatches(label, year, month, day) {
  if (!label.includes(String(year))) return false;
  const monthName = new RegExp(`\\b${MONTH_STEMS[month - 1]}`, "i");
  if (!monthName.test(label)) return false;
  if (day !== void 0 && !new RegExp(`\\b${day}(st|nd|rd|th)?\\b`).test(label)) return false;
  return true;
}
function isDisabledCell(cell) {
  return cell.className.includes("--disabled") || cell.getAttribute("aria-disabled") === "true";
}
function currentPickerView(popup) {
  var _a, _b;
  const holder = popup.querySelector('[aria-label^="month "]');
  const m = (_a = holder == null ? void 0 : holder.getAttribute("aria-label")) == null ? void 0 : _a.match(/month (\d{4})-(\d{1,2})/);
  if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
  const header = ((_b = popup.querySelector(".react-datepicker__current-month")) == null ? void 0 : _b.textContent) ?? "";
  const parsed = parseDateParts(header.trim());
  return parsed ? { year: parseInt(parsed.year, 10), month: parseInt(parsed.month, 10) } : null;
}
async function fillReactDatePicker(el, value, signal) {
  var _a, _b;
  const parts = parseDateParts(value);
  if (!parts) return "failed";
  const doc = el.ownerDocument;
  const year = parseInt(parts.year, 10);
  const month = parseInt(parts.month, 10);
  const verifyCommitted = async () => !!await pollFor(() => el.value.trim() !== "" ? el : null, 1200);
  const findPopup = () => doc.querySelector(".react-datepicker");
  el.focus();
  userClick(el);
  if (await pollFor(findPopup, 2e3)) {
    const findCell = () => {
      const popup = findPopup();
      if (!popup) return null;
      const monthGrid = !!popup.querySelector(".react-datepicker__month-text");
      const targetDay = monthGrid ? void 0 : parseInt(parts.day, 10);
      return [...popup.querySelectorAll(
        ".react-datepicker__month-text, .react-datepicker__day"
      )].find((c) => {
        const label = c.getAttribute("aria-label") ?? c.textContent ?? "";
        return cellMatches(label, year, month, targetDay) && !c.className.includes("--outside-month");
      }) ?? null;
    };
    const view = () => {
      const popup = findPopup();
      return popup ? currentPickerView(popup) : null;
    };
    let yearJumpTried = false;
    let reopens = 0;
    let lastViewKey = "";
    let stalled = 0;
    for (let steps = 0; steps < 48; steps++) {
      if (!findPopup()) {
        if (++reopens > 2) break;
        el.focus();
        userClick(el);
        if (!await pollFor(findPopup, 1500)) break;
      }
      const cell = findCell();
      if (cell) {
        if (isDisabledCell(cell)) break;
        userClick(cell);
        if (await verifyCommitted()) return "filled";
        break;
      }
      if (!yearJumpTried) {
        yearJumpTried = true;
        const select = (_a = findPopup()) == null ? void 0 : _a.querySelector("select");
        const option = select && [...select.options].find((o) => parseInt(o.value || o.text, 10) === year);
        if (select && option) {
          const setter = (_b = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")) == null ? void 0 : _b.set;
          if (setter) setter.call(select, option.value);
          else select.value = option.value;
          select.dispatchEvent(new Event("input", { bubbles: true }));
          select.dispatchEvent(new Event("change", { bubbles: true }));
          await pollFor(() => {
            var _a2;
            return findCell() !== null || ((_a2 = view()) == null ? void 0 : _a2.year) === year ? true : null;
          }, 1200);
          continue;
        }
      }
      const current = view();
      if (!current) break;
      const viewKey = `${current.year}-${current.month}`;
      stalled = viewKey === lastViewKey ? stalled + 1 : 0;
      lastViewKey = viewKey;
      if (stalled >= 3) break;
      const direction = year * 12 + month < current.year * 12 + current.month ? "previous" : "next";
      const popup = findPopup();
      const nav = (popup == null ? void 0 : popup.querySelector(`.react-datepicker__navigation--${direction}`)) ?? (popup ? [...popup.querySelectorAll("button")].find(
        (b) => new RegExp(direction, "i").test(`${b.textContent} ${b.getAttribute("aria-label") ?? ""}`)
      ) : void 0) ?? null;
      if (!nav || nav.disabled) break;
      userClick(nav);
      await wait(120);
    }
  }
  const placeholder = (signal == null ? void 0 : signal.placeholder) || el.getAttribute("placeholder") || "";
  const typedFormat = /dd|DD/.test(placeholder) ? `${parts.month}/${parts.day}/${parts.year}` : `${parts.month}/${parts.year}`;
  if (await trustedType(el, typedFormat)) {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    el.blur();
    if (await verifyCommitted()) return "filled";
  }
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  return "failed";
}
async function keyboardSelect(el, answerText, optionSets) {
  const doc = el.ownerDocument;
  const keyTarget = () => doc.activeElement instanceof HTMLElement ? doc.activeElement : el;
  el.focus();
  pressKey(keyTarget(), "ArrowDown");
  let options = await pollForOptions(doc, 1500);
  if (options.length === 0) {
    pressKey(keyTarget(), "Enter");
    options = await pollForOptions(doc, 1e3);
  }
  if (options.length === 0) return "failed";
  const choice = chooseOption(asFieldOptions(options), answerText, optionSets);
  if (!choice) {
    pressKey(keyTarget(), "Escape");
    return "failed";
  }
  const target = options[choice.index];
  const listbox = target.closest('[role="listbox"]');
  const activeDescId = () => (listbox == null ? void 0 : listbox.getAttribute("aria-activedescendant")) ?? el.getAttribute("aria-activedescendant");
  const activeOption = () => {
    const id = activeDescId();
    return id ? doc.getElementById(id) : null;
  };
  const before = displayTextOf(el);
  const initialDesc = activeDescId();
  for (let step = 0; step < options.length + 2; step++) {
    if (activeOption() === target) break;
    pressKey(keyTarget(), "ArrowDown");
    await wait(60);
    if (!activeDescId()) break;
  }
  if (activeOption() !== target) {
    for (const ch of choice.text.toLowerCase().slice(0, 12)) pressKey(keyTarget(), ch);
    await wait(150);
  }
  const resolved = activeOption();
  const moved = activeDescId() !== initialDesc && activeDescId() !== null;
  const mayCommit = resolved === target || resolved === null && moved;
  if (!mayCommit) {
    pressKey(keyTarget(), "Escape");
    return "failed";
  }
  pressKey(keyTarget(), "Enter");
  await wait(150);
  const after = displayTextOf(el);
  if (after && after !== before && lexicalAnswerScore(after, choice.text) >= 0.5) return "filled";
  pressKey(keyTarget(), "Escape");
  return "failed";
}
const SEARCH_STOPWORD_RE = /^(and|of|the|in|for|or|an?|with)$/i;
function broadenedSearchTerms(answers, alreadyTried) {
  const seen = new Set(alreadyTried.map((t) => t.toLowerCase()));
  const terms = [];
  for (const answer of answers) {
    for (const word of answer.split(/[^\p{L}\p{N}+#]+/u)) {
      if (word.length < 4 || SEARCH_STOPWORD_RE.test(word)) continue;
      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push(word);
    }
  }
  return terms.slice(0, 2);
}
const NON_TRIGGER_BUTTON_RE = /help|clear|remove|delete|close|dismiss|info|tooltip/i;
function adjacentDropdownTrigger(el) {
  const ownInput = el instanceof HTMLInputElement ? el : el.querySelector("input");
  let scope = el;
  for (let depth = 0; scope && depth < 4; depth++) {
    const foreignControl = [
      ...scope.querySelectorAll('input:not([type="hidden"]), select, textarea')
    ].some((c) => c !== ownInput && c !== el);
    if (foreignControl) return null;
    const candidates = [...scope.querySelectorAll('button, [role="button"]')].filter(
      (btn) => {
        var _a;
        if (btn === el || btn.contains(el)) return false;
        const purpose = `${btn.getAttribute("aria-label") ?? ""} ${btn.getAttribute("title") ?? ""} ${btn.getAttribute("data-automation-id") ?? ""}`;
        if (NON_TRIGGER_BUTTON_RE.test(purpose)) return false;
        const hasPopupHint = !!btn.getAttribute("aria-haspopup") || btn.hasAttribute("aria-expanded");
        return hasPopupHint || (((_a = btn.textContent) == null ? void 0 : _a.trim()) ?? "") === "";
      }
    );
    const hinted = candidates.find(
      (btn) => !!btn.getAttribute("aria-haspopup") || btn.hasAttribute("aria-expanded")
    );
    if (hinted) return hinted;
    if (candidates.length > 0) return candidates[0];
    scope = scope.parentElement;
  }
  return null;
}
function isExpandableOption(o) {
  return !!o.getAttribute("aria-haspopup") || o.hasAttribute("aria-expanded") || !!o.querySelector('[class*="chevron"], [class*="expand"], [data-automation-id*="chevron"], [data-automation-id*="expand"]');
}
async function watchListAfterClick(doc, previousSignature, timeoutMs, scope = (all) => all, expectSublevel = false) {
  const deadline = Date.now() + timeoutMs;
  let emptyStreak = 0;
  while (Date.now() < deadline) {
    await wait(DROPDOWN_POLL_MS);
    const options = scope(findDropdownOptions(doc, doc.location.hostname));
    if (options.length === 0) {
      if (!expectSublevel && ++emptyStreak >= 2) return { status: "settled" };
      continue;
    }
    emptyStreak = 0;
    if (optionSignature(options) !== previousSignature) return { status: "changed", options };
  }
  return { status: "settled" };
}
async function fillCustomDropdown(el, answerText, optionSets = [], pageContext = null, answerFallbacks = [], infer = null, judgeOnly = false) {
  var _a, _b, _c;
  const doc = el.ownerDocument;
  const brand = brandTokens(pageContext, doc.location.hostname);
  const initialDisplay = displayTextOf(el);
  const answers = [answerText, ...answerFallbacks].filter((a) => a.trim() !== "");
  const scope = makeOptionScope(doc, el);
  let pickedText = null;
  const done = (outcome) => ({
    outcome,
    filledText: outcome === "filled" ? pickedText ?? (answers[0] ?? null) : null
  });
  const openList = async () => {
    el.focus();
    userClick(el);
    const timeout = el instanceof HTMLInputElement && el.closest(MULTISELECT_CONTAINER_SELECTOR) ? 400 : DROPDOWN_TIMEOUT_MS;
    return pollForScopedOptions(doc, timeout, scope);
  };
  const closeList = () => el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  const chooseAny = (fieldOptions) => {
    for (const answer of answers) {
      const choice = chooseOption(fieldOptions, answer, optionSets);
      if (choice) return choice;
    }
    return null;
  };
  const confirmSelection = async (clicked) => {
    var _a2;
    if (!initialDisplay) return "filled";
    if (((_a2 = clicked.closest('[role="listbox"]')) == null ? void 0 : _a2.getAttribute("aria-multiselectable")) === "true")
      return "filled";
    const deadline = Date.now() + 800;
    while (Date.now() < deadline) {
      if (displayTextOf(el) !== initialDisplay) return "filled";
      await wait(DROPDOWN_POLL_MS);
    }
    dropdownDebug("confirm", "display unchanged after click — escalating");
    const escalationAnswer = pickedText ?? answerText;
    const viaKeyboard = await keyboardSelect(el, escalationAnswer, optionSets);
    dropdownDebug("keyboard", viaKeyboard);
    if (viaKeyboard !== "failed") return viaKeyboard;
    const viaTrusted = await trustedSelect(el, escalationAnswer, optionSets, initialDisplay);
    dropdownDebug("trusted", `${viaTrusted}${viaTrusted === "failed" ? " (note: DevTools open blocks this tier)" : ""}`);
    return viaTrusted;
  };
  let typeToFilterRan = false;
  const typeToFilterTier = async (longFirstSearch) => {
    var _a2;
    if (typeToFilterRan) return null;
    const inputEl = el instanceof HTMLInputElement ? el : el.querySelector('input:not([type="hidden"])');
    if (!inputEl || answers.length === 0) return null;
    typeToFilterRan = true;
    const pillHolder = inputEl.closest(MULTISELECT_CONTAINER_SELECTOR);
    const pillsBefore = ((_a2 = pillHolder == null ? void 0 : pillHolder.textContent) == null ? void 0 : _a2.trim()) ?? "";
    const typeaheadAttempt = async (term, enterPollMs) => {
      var _a3, _b2;
      const staleSignature = optionSignature(scope(findDropdownOptions(doc, doc.location.hostname)));
      inputEl.focus();
      setNativeValue(inputEl, term);
      let typedOptions = await pollForFilteredOptions(doc, 1500, scope, staleSignature);
      if (typedOptions.length === 0 && (pillHolder || !inputEl.form)) {
        pressKey(inputEl, "Enter");
        typedOptions = await pollForFilteredOptions(doc, enterPollMs, scope, staleSignature);
        if (typedOptions.length > 0)
          dropdownDebug("typeahead", `Enter-search for "${term}" → ${typedOptions.length} options`);
      }
      if (typedOptions.length === 0) return null;
      const fieldOptions = asFieldOptions(typedOptions);
      let choice = judgeOnly ? null : chooseAny(fieldOptions);
      if (!choice) {
        choice = await semanticChooseOption(fieldOptions, answerText);
        if (choice)
          dropdownDebug("typeahead", `judge picked closest "${choice.text}" for "${answerText}"`);
      }
      if (!choice) return null;
      const clicked = typedOptions[choice.index];
      pickedText = ((_a3 = clicked.textContent) == null ? void 0 : _a3.trim()) ?? null;
      dropdownDebug("typeahead", `typed "${term}" → clicking "${pickedText}"`);
      clickOptionElement(clicked);
      await wait(150);
      const display = displayTextOf(inputEl) || displayTextOf(el);
      if (display && lexicalAnswerScore(display, pickedText ?? term) >= 0.5)
        return done("filled");
      if (pillHolder) {
        const target = (pickedText ?? term).toLowerCase();
        const deadline = Date.now() + 1200;
        while (Date.now() < deadline) {
          const pills = ((_b2 = pillHolder.textContent) == null ? void 0 : _b2.trim()) ?? "";
          if (pills !== pillsBefore && (pills.toLowerCase().includes(target) || lexicalAnswerScore(pills, pickedText ?? term) >= 0.5)) {
            setNativeValue(inputEl, "");
            closeList();
            return done("filled");
          }
          await wait(DROPDOWN_POLL_MS);
        }
      }
      return null;
    };
    const variants = answers.flatMap((a) => answerVariants(a));
    const terms = [...variants, ...broadenedSearchTerms(answers, variants)];
    for (let i = 0; i < terms.length; i++) {
      const result = await typeaheadAttempt(terms[i], longFirstSearch && i === 0 ? DROPDOWN_TIMEOUT_MS : 2500);
      if (result) return result;
    }
    setNativeValue(inputEl, "");
    return null;
  };
  let options = await openList();
  dropdownDebug("open", `${options.length} scoped options (answer "${answerText || "<inference>"}")`);
  if (options.length === 0) {
    const typed2 = await typeToFilterTier(true);
    if (typed2) return typed2;
    const trigger = adjacentDropdownTrigger(el);
    if (trigger) {
      dropdownDebug("trigger", "clicking adjacent list button");
      userClick(trigger);
      options = await pollForScopedOptions(doc, DROPDOWN_TIMEOUT_MS, scope);
    }
    if (options.length === 0) {
      if (answers.length === 0 || judgeOnly) {
        closeList();
        return done("failed");
      }
      const viaKeyboard = await keyboardSelect(el, answerText, optionSets);
      dropdownDebug("keyboard", viaKeyboard);
      if (viaKeyboard !== "failed") return done(viaKeyboard);
      const viaTrusted = await trustedSelect(el, answerText, optionSets, initialDisplay);
      dropdownDebug("trusted", `${viaTrusted}${viaTrusted === "failed" ? " (note: DevTools open blocks this tier)" : ""}`);
      if (viaTrusted === "failed") closeList();
      return done(viaTrusted);
    }
  }
  for (let depth = 0; depth < MAX_PROMPT_DEPTH; depth++) {
    const fieldOptions = asFieldOptions(options);
    const choice = judgeOnly ? null : chooseAny(fieldOptions);
    let clickIndex = choice == null ? void 0 : choice.index;
    if (clickIndex === void 0 && depth > 0) {
      clickIndex = brandedOptionIndex(options.map((o) => {
        var _a2;
        return ((_a2 = o.textContent) == null ? void 0 : _a2.trim()) ?? "";
      }), brand) ?? (options.length === 1 ? 0 : void 0);
    }
    if (clickIndex === void 0 && answers.length > 0) {
      const semantic = await semanticChooseOption(fieldOptions, answerText);
      if (semantic) clickIndex = semantic.index;
    }
    if (clickIndex === void 0 && infer && answers.length === 0) {
      const inferred = await semanticAnswerOption(infer.question, fieldOptions, infer.factSheet);
      if (inferred) clickIndex = inferred.index;
    }
    if (clickIndex === void 0 && depth === 0 && !judgeOnly && answers.length > 0) {
      const scrolled = await scrollCatalogTier(doc, scope, options, chooseAny, answers);
      if (scrolled) {
        options = scrolled.options;
        clickIndex = scrolled.index;
      }
    }
    if (clickIndex === void 0) break;
    const signature = optionSignature(options);
    const clicked = options[clickIndex];
    pickedText = ((_a = clicked.textContent) == null ? void 0 : _a.trim()) ?? null;
    const expectsSublevel = isExpandableOption(clicked);
    dropdownDebug("pick", `depth ${depth}: clicking "${pickedText}" of ${options.length} options`);
    clickOptionElement(clicked);
    const after = await watchListAfterClick(
      doc,
      signature,
      expectsSublevel ? SUBLEVEL_FETCH_TIMEOUT_MS : SUBLEVEL_TIMEOUT_MS,
      scope,
      expectsSublevel
    );
    if (after.status === "settled") {
      const outcome = await confirmSelection(clicked);
      if (outcome === "failed" || el.closest(MULTISELECT_CONTAINER_SELECTOR)) closeList();
      return done(outcome);
    }
    options = after.options;
  }
  const wantExplore = answers.length > 0 || infer !== null && semanticCascadeAvailable();
  const categoryTexts = !wantExplore ? [] : options.filter(isExpandableOption).map((o) => {
    var _a2;
    return ((_a2 = o.textContent) == null ? void 0 : _a2.trim()) ?? "";
  }).slice(0, EXPLORE_CAP);
  const harvested = [];
  let live = options;
  for (const categoryText of categoryTexts) {
    if (live.length === 0 || !live.every((o) => o.isConnected)) {
      closeList();
      live = await openList();
      if (live.length === 0) break;
    }
    const category = live.find((o) => {
      var _a2;
      return (((_a2 = o.textContent) == null ? void 0 : _a2.trim()) ?? "") === categoryText;
    });
    if (!category) {
      live = [];
      continue;
    }
    const signature = optionSignature(live);
    userClick(category);
    const after = await watchListAfterClick(doc, signature, SUBLEVEL_FETCH_TIMEOUT_MS, scope, true);
    if (after.status !== "changed") {
      live = [];
      continue;
    }
    const subOptions = asFieldOptions(after.options);
    harvested.push({ label: categoryText, options: subOptions.map((o) => o.text) });
    const subChoice = answers.length > 0 && !judgeOnly ? chooseAny(subOptions) : null;
    if (subChoice) {
      const clicked = after.options[subChoice.index];
      pickedText = ((_b = clicked.textContent) == null ? void 0 : _b.trim()) ?? null;
      dropdownDebug("explore", `clicking "${pickedText}" under "${categoryText}"`);
      clickOptionElement(clicked);
      await watchListAfterClick(doc, optionSignature(after.options), SUBLEVEL_TIMEOUT_MS, scope);
      const outcome = await confirmSelection(clicked);
      if (outcome === "failed") closeList();
      return done(outcome);
    }
    live = [];
  }
  if (harvested.length > 0 && infer) {
    const pick = await semanticCascadePath(infer.question, answers[0] ?? "", infer.factSheet, harvested);
    if (pick) {
      dropdownDebug("cascade", `judge picked "${pick.categoryText}" → "${pick.optionText}"`);
      closeList();
      const fresh = await openList();
      const category = fresh.find((o) => {
        var _a2;
        return (((_a2 = o.textContent) == null ? void 0 : _a2.trim()) ?? "") === pick.categoryText;
      });
      if (category) {
        const signature = optionSignature(fresh);
        userClick(category);
        const after = await watchListAfterClick(doc, signature, SUBLEVEL_FETCH_TIMEOUT_MS, scope, true);
        if (after.status === "changed") {
          const target = after.options.find(
            (o) => {
              var _a2;
              return (((_a2 = o.textContent) == null ? void 0 : _a2.trim()) ?? "") === pick.optionText;
            }
          );
          if (target) {
            pickedText = ((_c = target.textContent) == null ? void 0 : _c.trim()) ?? null;
            clickOptionElement(target);
            await watchListAfterClick(doc, optionSignature(after.options), SUBLEVEL_TIMEOUT_MS, scope);
            const outcome = await confirmSelection(target);
            if (outcome === "failed") closeList();
            return done(outcome);
          }
        }
      }
    }
  }
  const typed = await typeToFilterTier(false);
  if (typed) return typed;
  closeList();
  return done("failed");
}
function buildFileTransfer(file) {
  if (typeof DataTransfer !== "function") return null;
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    return dt;
  } catch {
    return null;
  }
}
function attachedFileName(input) {
  try {
    return input.files && input.files.length > 0 ? input.files[0].name : "";
  } catch {
    return "";
  }
}
function uploadZoneFilename(zone) {
  var _a;
  const named = zone.querySelector(
    '[data-automation-id*="file" i][data-automation-id*="name" i], [class*="file-name" i], [class*="filename" i], [class*="file_name" i]'
  );
  const text = (_a = named == null ? void 0 : named.textContent) == null ? void 0 : _a.trim();
  if (text) return text;
  const match = (zone.textContent ?? "").match(/[\w][\w\-.()[\]]*\.(pdf|docx?|txt|rtf|odt)\b/i);
  return match ? match[0].trim() : "";
}
function zoneShowsFilename(zone, name) {
  const text = (zone.textContent ?? "").toLowerCase();
  return name.trim() !== "" && text.includes(name.trim().toLowerCase());
}
async function fillFileUpload(field, doc) {
  const input = field.el;
  const file = new File([doc.bytes], doc.name, { type: doc.mime });
  const dt = buildFileTransfer(file);
  if (!dt) return { outcome: "failed", filledText: null };
  try {
    input.files = dt.files;
  } catch {
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await wait(150);
  if (attachedFileName(input) === doc.name) return { outcome: "filled", filledText: doc.name };
  const zone = field.uploadZoneEl;
  if (zone && typeof DragEvent === "function") {
    try {
      const init = { bubbles: true, cancelable: true, dataTransfer: dt };
      zone.dispatchEvent(new DragEvent("dragenter", init));
      zone.dispatchEvent(new DragEvent("dragover", init));
      zone.dispatchEvent(new DragEvent("drop", init));
    } catch {
      return { outcome: "failed", filledText: null };
    }
    await wait(400);
    if (attachedFileName(input) === doc.name || zoneShowsFilename(zone, doc.name))
      return { outcome: "filled", filledText: doc.name };
  }
  return { outcome: "failed", filledText: null };
}
async function fillField(field, match, optionSets = [], pageContext = null, opts = {}) {
  const value = match.resolvedAnswer;
  const asResult = (outcome) => ({
    outcome,
    filledText: outcome === "filled" ? value : null
  });
  if (value === null || /\{\{[\w.\s]+\}\}/.test(value)) return asResult("refused");
  const { el, signal } = field;
  const fallbacks = match.answerFallbacks ?? [];
  const blockConsent = false;
  if (field.dateSegmentEls) return asResult(fillDateSegments(field.dateSegmentEls, value));
  switch (signal.kind) {
    case "file":
      if (opts.document) return fillFileUpload(field, opts.document);
      return asResult("refused");
    case "text":
    case "email":
    case "tel":
    case "url":
    case "number": {
      if (el instanceof HTMLInputElement && (hasComboboxSignals(el) || el.closest(MULTISELECT_CONTAINER_SELECTOR))) {
        return fillCustomDropdown(
          el,
          value,
          optionSets,
          pageContext,
          fallbacks,
          { question: signal.label || signal.normalizedQuestion, factSheet: opts.factSheet ?? "" },
          match.judgeOnly ?? false
        );
      }
      return asResult(fillTextInput(el, value, signal));
    }
    case "password":
      return asResult(fillTextInput(el, value, signal));
    case "date": {
      if (signal.dateWidget === "react-datepicker")
        return asResult(await fillReactDatePicker(el, value, signal));
      const outcome = fillTextInput(el, value, signal);
      if (outcome !== "filled") return asResult(outcome);
      await wait(250);
      return asResult(el.value.trim() === "" ? "failed" : "filled");
    }
    case "textarea":
      return asResult(fillTextInput(el, value, signal));
    case "select":
      return asResult(
        await fillSelect(
          el,
          match.chosenOptionValue,
          value,
          optionSets,
          fallbacks,
          match.judgeOnly ?? false
        )
      );
    case "radio":
      if (field.pillEls && field.pillEls.length > 0) {
        const pill = await fillPillGroup(
          field.pillEls,
          match.chosenOptionValue,
          value,
          optionSets,
          fallbacks,
          match.judgeOnly ?? false
        );
        return {
          outcome: pill.outcome,
          filledText: pill.outcome === "filled" ? pill.pickedText ?? value : null
        };
      }
      return asResult(
        await fillRadioGroup(
          field.groupEls ?? [el],
          match.chosenOptionValue,
          value,
          optionSets,
          fallbacks,
          match.judgeOnly ?? false
        )
      );
    case "checkbox":
      if (field.pillEls && field.pillEls.length > 0) {
        const pill = await fillPillGroup(
          field.pillEls,
          void 0,
          value,
          optionSets,
          fallbacks,
          match.judgeOnly ?? false,
          true
        );
        return {
          outcome: pill.outcome,
          filledText: pill.outcome === "filled" ? pill.pickedText ?? value : null
        };
      }
      if (field.groupEls && field.groupEls.length > 1)
        return asResult(fillCheckboxGroup(field.groupEls, value, optionSets, blockConsent));
      if (match.chosenOptionValue !== "checked" && match.chosenOptionValue !== "unchecked")
        return asResult("refused");
      return asResult(
        fillCheckbox(el, match.chosenOptionValue === "checked")
      );
    case "contenteditable":
      return asResult(fillContentEditable(el, value));
    case "custom-dropdown":
      return fillCustomDropdown(
        el,
        value,
        optionSets,
        pageContext,
        fallbacks,
        { question: signal.label || signal.normalizedQuestion, factSheet: opts.factSheet ?? "" },
        match.judgeOnly ?? false
      );
    default:
      return asResult("failed");
  }
}
function readActualValue(field) {
  var _a, _b, _c, _d, _e, _f;
  const { el, signal } = field;
  if (field.dateSegmentEls) {
    const s = field.dateSegmentEls;
    return [(_a = s.month) == null ? void 0 : _a.value, (_b = s.day) == null ? void 0 : _b.value, (_c = s.year) == null ? void 0 : _c.value].filter(Boolean).join("/");
  }
  switch (signal.kind) {
    case "select": {
      const select = el;
      const opt = select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
      return opt ? opt.text.trim() || opt.value.trim() : "";
    }
    case "radio": {
      if (field.pillEls) {
        const index2 = field.pillEls.findIndex((p) => p.getAttribute("aria-pressed") === "true");
        if (index2 < 0) return "";
        return ((_d = signal.options[index2]) == null ? void 0 : _d.text) ?? (field.pillEls[index2].textContent ?? "").trim();
      }
      const radios = field.groupEls ?? [el];
      const index = radios.findIndex((r) => r.checked);
      if (index < 0) return "";
      return ((_e = signal.options[index]) == null ? void 0 : _e.text) ?? radios[index].value;
    }
    case "checkbox": {
      if (field.pillEls) {
        return field.pillEls.map(
          (p, i) => {
            var _a2;
            return p.getAttribute("aria-pressed") === "true" ? ((_a2 = signal.options[i]) == null ? void 0 : _a2.text) ?? (p.textContent ?? "").trim() : "";
          }
        ).filter(Boolean).join("; ");
      }
      const boxes = field.groupEls ?? [el];
      if (boxes.length > 1) {
        return boxes.map((box, i) => {
          var _a2;
          return box.checked ? ((_a2 = signal.options[i]) == null ? void 0 : _a2.text) ?? box.value : "";
        }).filter(Boolean).join("; ");
      }
      return boxes[0].checked ? "Yes" : "No";
    }
    case "custom-dropdown":
      return displayTextOf(el);
    case "file": {
      const input = el;
      let name = "";
      try {
        name = input.files && input.files.length > 0 ? input.files[0].name : "";
      } catch {
        name = "";
      }
      if (name) return name;
      return field.uploadZoneEl ? uploadZoneFilename(field.uploadZoneEl) : "";
    }
    case "contenteditable":
      return ((_f = el.textContent) == null ? void 0 : _f.trim()) ?? "";
    default:
      return (el.value ?? "").trim();
  }
}
function valuesMatch(expected, actual, kind) {
  const e = expected.trim();
  const a = actual.trim();
  if (!e || !a) return false;
  if (e === a) return true;
  const eCanon = canonicalAnswer(e);
  const aCanon = canonicalAnswer(a);
  if (eCanon !== "" && eCanon === aCanon) return true;
  for (const variant of answerVariants(e)) {
    if (canonicalAnswer(variant) === aCanon) return true;
  }
  for (const variant of answerVariants(a)) {
    if (canonicalAnswer(variant) === eCanon) return true;
  }
  if (kind === "date" || parseDateParts(e) && parseDateParts(a)) {
    const ep = parseDateParts(e);
    const ap = parseDateParts(a);
    if (ep && ap) return ep.year === ap.year && ep.month === ap.month;
  }
  const eIntent = classifyIntent(e);
  const aIntent = classifyIntent(a);
  if (eIntent !== "unknown" && aIntent !== "unknown") return eIntent === aIntent;
  return lexicalAnswerScore(a, e) >= 0.5;
}
const MASK = "••••••••";
function expectedFor(match, filledValue, kind) {
  if (filledValue) return filledValue;
  if (kind === "checkbox" && (match.chosenOptionValue === "checked" || match.chosenOptionValue === "unchecked")) {
    return match.chosenOptionValue === "checked" ? "Yes" : "No";
  }
  return match.resolvedAnswer ?? match.rawAnswerTemplate;
}
function validateFields(fields, matches, filledValues) {
  var _a, _b;
  const out = [];
  for (const field of fields) {
    const { signal } = field;
    const base = {
      fieldId: signal.fieldId,
      label: signal.label || signal.normalizedQuestion,
      kind: signal.kind,
      required: signal.required,
      normalizedQuestion: signal.normalizedQuestion,
      options: signal.options.map((o) => o.text),
      sectionContext: signal.sectionContext,
      sectionIndex: signal.sectionIndex,
      eeoLike: signal.eeoLike,
      consentLike: signal.consentLike
    };
    const rawMatch = matches.get(signal.fieldId);
    const match = rawMatch && rawMatch.action !== "ignore" ? rawMatch : void 0;
    if (match == null ? void 0 : match.notify) {
      out.push({ ...base, verdict: "skipped" });
      continue;
    }
    if (signal.kind === "file") {
      if (!match) {
        out.push({ ...base, verdict: "skipped" });
        continue;
      }
      const actual2 = readActualValue(field);
      const expected2 = expectedFor(match, filledValues.get(signal.fieldId), signal.kind);
      if (actual2 === "") {
        out.push(
          match.action === "autofill" ? { ...base, verdict: "missing-answerable", expected: expected2 } : { ...base, verdict: "skipped", expected: expected2 }
        );
        continue;
      }
      const e = expected2.trim().toLowerCase();
      const a = actual2.trim().toLowerCase();
      const ok2 = e !== "" && (a.includes(e) || e.includes(a));
      out.push({ ...base, verdict: ok2 ? "ok" : "wrong", expected: expected2, actual: actual2 });
      continue;
    }
    const actual = readActualValue(field);
    const filled = signal.filled;
    if (!match) {
      out.push(filled ? { ...base, verdict: "skipped" } : { ...base, verdict: "missing-unanswered" });
      continue;
    }
    const expected = expectedFor(match, filledValues.get(signal.fieldId), signal.kind);
    const mask = signal.kind === "password";
    const show = (s) => mask ? MASK : s;
    if (expected.trim() === "") {
      out.push({ ...base, verdict: "skipped" });
      continue;
    }
    if (signal.kind === "custom-dropdown" && !filled && actual === "" && filledValues.has(signal.fieldId)) {
      out.push({ ...base, verdict: "skipped", expected: show(expected) });
      continue;
    }
    if (!filled) {
      out.push(
        match.action === "autofill" ? { ...base, verdict: "missing-answerable", expected: show(expected) } : { ...base, verdict: "skipped", expected: show(expected) }
      );
      continue;
    }
    if (signal.kind === "checkbox" && ((((_a = field.groupEls) == null ? void 0 : _a.length) ?? 0) > 1 || (((_b = field.pillEls) == null ? void 0 : _b.length) ?? 0) > 1) && match.chosenOptionValues) {
      const checkedTexts = actual.split("; ").map((t) => canonicalAnswer(t));
      const allPlaced = match.chosenOptionValues.every(
        (t) => checkedTexts.includes(canonicalAnswer(t))
      );
      out.push({
        ...base,
        verdict: allPlaced ? "ok" : "wrong",
        expected: match.chosenOptionValues.join("; "),
        actual
      });
      continue;
    }
    const ok = valuesMatch(expected, actual, signal.kind);
    out.push({
      ...base,
      verdict: ok ? "ok" : "wrong",
      expected: show(expected),
      actual: show(actual)
    });
  }
  return out;
}
function summarizeValidation(report) {
  const summary = {
    ok: 0,
    wrong: 0,
    missingAnswerable: 0,
    missingUnanswered: 0,
    skipped: 0
  };
  for (const v of report) {
    if (v.verdict === "ok") summary.ok++;
    else if (v.verdict === "wrong") summary.wrong++;
    else if (v.verdict === "missing-answerable") summary.missingAnswerable++;
    else if (v.verdict === "missing-unanswered") summary.missingUnanswered++;
    else summary.skipped++;
  }
  return summary;
}
const STYLE = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .ff-badge {
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
    display: flex; align-items: center; gap: 8px;
    background: #1f1235; color: #fff; border-radius: 999px;
    padding: 10px 14px; box-shadow: 0 4px 16px rgba(0,0,0,.25);
    font-size: 13px; cursor: default; user-select: none;
  }
  .ff-badge button {
    border: 0; border-radius: 999px; padding: 6px 12px; font-size: 13px;
    background: #7c3aed; color: #fff; cursor: pointer; font-weight: 600;
  }
  .ff-badge button:hover { background: #8b5cf6; }
  .ff-badge .ff-secondary {
    background: transparent; border: 1px solid #7c3aed; color: #ddd6fe; font-weight: 500;
  }
  .ff-badge .ff-secondary:hover { background: rgba(124,58,237,.35); }
  .ff-badge .ff-dimmed { opacity: .55; }
  .ff-badge button:disabled { opacity: .55; cursor: default; }
  .ff-badge button:disabled:hover { background: transparent; }
  .ff-badge .ff-close {
    background: transparent; padding: 2px 6px; font-size: 14px; color: #cbb9ee;
  }
  .ff-badge .ff-close:hover { background: rgba(255,255,255,.12); }
  .ff-chip {
    position: absolute; z-index: 2147483646;
    background: #fff; border: 1px solid #ddd6fe; border-radius: 10px;
    box-shadow: 0 4px 14px rgba(31,18,53,.18); padding: 8px 10px;
    max-width: 340px; font-size: 12.5px; color: #1f2430;
  }
  .ff-chip .ff-value {
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden; margin: 4px 0 6px; color: #4b5563; white-space: pre-wrap;
  }
  .ff-chip .ff-meta { color: #7c3aed; font-weight: 600; font-size: 11px; }
  .ff-chip .ff-flag { color: #b45309; font-weight: 600; font-size: 11px; }
  .ff-chip .ff-actions { display: flex; gap: 6px; }
  .ff-chip .ff-actions button {
    border: 1px solid #e5e7eb; background: #fff; border-radius: 7px;
    padding: 4px 10px; font-size: 12px; cursor: pointer;
  }
  .ff-chip .ff-actions .ff-primary { background: #7c3aed; border-color: #7c3aed; color: #fff; font-weight: 600; }
  .ff-chip .ff-actions .ff-primary:hover { background: #8b5cf6; }
  .ff-chip input[type="text"] {
    width: 100%; border: 1px solid #d1d5db; border-radius: 7px;
    padding: 5px 8px; font-size: 12.5px; margin: 4px 0 6px;
  }
  .ff-toast {
    position: fixed; right: 16px; bottom: 64px; z-index: 2147483646;
    background: #1f2430; color: #fff; padding: 9px 14px; border-radius: 9px;
    font-size: 12.5px; box-shadow: 0 4px 14px rgba(0,0,0,.25);
  }
`;
const HIGHLIGHT_STYLE = "2px solid #a78bfa";
class Overlay {
  constructor(callbacks) {
    __publicField(this, "host");
    __publicField(this, "root");
    __publicField(this, "badge", null);
    __publicField(this, "chips", /* @__PURE__ */ new Map());
    __publicField(this, "highlighted", /* @__PURE__ */ new Map());
    __publicField(this, "reposition", () => this.repositionChips());
    this.callbacks = callbacks;
    this.host = document.createElement("div");
    this.host.setAttribute("data-flashfiller", "");
    this.root = this.host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    this.root.appendChild(style);
    document.documentElement.appendChild(this.host);
    document.addEventListener("scroll", this.reposition, { capture: true, passive: true });
    window.addEventListener("resize", this.reposition, { passive: true });
  }
  // ---- Badge ---------------------------------------------------------------
  /** opts.explicit: user asked for this scan — render a zero-count result
   *  visibly (no Autofill button) instead of showing nothing, so "no matches"
   *  is distinguishable from "extension not running".
   *  opts.aiFill: present once a validation report exists — it keeps the
   *  badge alive at zero actionable fields (vanishing at the moment every
   *  field filled would take Validate/AI Fill with it). */
  setBadge(count, opts = {}) {
    var _a;
    const aiFill = opts.aiFill ?? null;
    if (count <= 0 && !opts.explicit && !aiFill) {
      (_a = this.badge) == null ? void 0 : _a.remove();
      this.badge = null;
      return;
    }
    if (!this.badge) {
      this.badge = document.createElement("div");
      this.badge.className = "ff-badge";
      this.root.appendChild(this.badge);
    }
    this.badge.innerHTML = "";
    const label = document.createElement("span");
    label.textContent = count > 0 ? `⚡ ${count} fillable field${count === 1 ? "" : "s"}` : aiFill ? "⚡ 0 fillable fields left" : "⚡ 0 fillable fields — nothing here matches your answers yet";
    const close = document.createElement("button");
    close.className = "ff-close";
    close.textContent = "✕";
    close.title = "Dismiss FlashFiller on this page";
    close.addEventListener("click", () => {
      this.callbacks.onDismiss();
      this.destroy();
    });
    const parts = [label];
    if (count > 0) {
      const fill = document.createElement("button");
      fill.textContent = "Autofill";
      fill.addEventListener("click", () => this.callbacks.onAutofill());
      parts.push(fill);
    }
    const validate = document.createElement("button");
    validate.className = "ff-secondary";
    validate.textContent = "Validate";
    validate.title = "Check what actually landed — filled vs still-empty fields";
    validate.addEventListener("click", () => this.callbacks.onValidate());
    parts.push(validate);
    if (aiFill && (aiFill.count > 0 || aiFill.busy)) {
      const ai = document.createElement("button");
      ai.className = aiFill.enabled ? "ff-secondary" : "ff-secondary ff-dimmed";
      const planner = aiFill.mode === "planner";
      ai.textContent = aiFill.busy ? planner ? "Planning…" : "AI Fill…" : planner ? `Plan Fill (${aiFill.count})` : `AI Fill (${aiFill.count})`;
      ai.title = planner ? aiFill.enabled ? "One Claude call plans and fills everything left — never submits" : "Needs your Anthropic API key (Options → Settings → LLM-first filling) — click for details" : aiFill.enabled ? "Fill the still-empty fields from the validation report via the OpenAI judge" : "Needs Semantic matching + API key (Options) — click for details";
      if (aiFill.busy) ai.disabled = true;
      ai.addEventListener("click", () => this.callbacks.onAiFill());
      parts.push(ai);
    }
    parts.push(close);
    this.badge.append(...parts);
  }
  // ---- Chips ----------------------------------------------------------------
  positionChip(chip, anchor) {
    const rect = anchor.getBoundingClientRect();
    chip.style.left = `${Math.max(8, rect.left + window.scrollX)}px`;
    chip.style.top = `${rect.bottom + window.scrollY + 4}px`;
  }
  repositionChips() {
    const layoutExists = document.documentElement.getBoundingClientRect().width > 0;
    for (const [id, { el, anchor }] of this.chips) {
      if (!anchor.isConnected) {
        el.remove();
        this.chips.delete(id);
        continue;
      }
      const rect = anchor.getBoundingClientRect();
      const anchorInvisible = layoutExists && rect.width === 0 && rect.height === 0;
      el.style.display = anchorInvisible ? "none" : "";
      if (!anchorInvisible) this.positionChip(el, anchor);
    }
  }
  /** Re-anchor/prune all chips — called after every rescan. */
  refresh() {
    this.repositionChips();
  }
  showChip(spec) {
    this.removeChip(spec.fieldId);
    const chip = document.createElement("div");
    chip.className = "ff-chip";
    const meta = document.createElement("div");
    meta.className = spec.kind === "flag" ? "ff-flag" : "ff-meta";
    meta.textContent = spec.needsReview ? `${spec.meta} · needs review` : spec.meta;
    chip.appendChild(meta);
    if (spec.value) {
      const value = document.createElement("div");
      value.className = "ff-value";
      value.textContent = spec.value;
      chip.appendChild(value);
    }
    const actions = document.createElement("div");
    actions.className = "ff-actions";
    if (spec.kind === "suggestion") {
      const accept = document.createElement("button");
      accept.className = "ff-primary";
      accept.textContent = "Accept";
      accept.addEventListener("click", () => this.callbacks.onAccept(spec.fieldId));
      const skip = document.createElement("button");
      skip.textContent = "Skip";
      skip.addEventListener("click", () => this.callbacks.onSkip(spec.fieldId));
      actions.append(accept, skip);
    } else {
      const ok = document.createElement("button");
      ok.textContent = "Got it";
      ok.addEventListener("click", () => this.removeChip(spec.fieldId));
      actions.append(ok);
    }
    chip.appendChild(actions);
    this.root.appendChild(chip);
    this.positionChip(chip, spec.anchor);
    this.chips.set(spec.fieldId, { el: chip, anchor: spec.anchor });
  }
  removeChip(fieldId) {
    var _a;
    (_a = this.chips.get(fieldId)) == null ? void 0 : _a.el.remove();
    this.chips.delete(fieldId);
  }
  clearChips() {
    for (const { el } of this.chips.values()) el.remove();
    this.chips.clear();
  }
  // ---- Unresolved-variable prompt (Section 7) --------------------------------
  promptVariable(name, anchor, onSubmit) {
    const id = `var:${name}`;
    this.removeChip(id);
    const chip = document.createElement("div");
    chip.className = "ff-chip";
    const meta = document.createElement("div");
    meta.className = "ff-meta";
    meta.textContent = `FlashFiller needs a value for {{${name}}}`;
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = name === "company" ? "e.g. Acme Corp" : `Value for ${name}`;
    const actions = document.createElement("div");
    actions.className = "ff-actions";
    const apply = document.createElement("button");
    apply.className = "ff-primary";
    apply.textContent = "Apply";
    const submit = () => {
      if (!input.value.trim()) return;
      this.removeChip(id);
      onSubmit(input.value.trim());
    };
    apply.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.addEventListener("click", () => this.removeChip(id));
    actions.append(apply, cancel);
    chip.append(meta, input, actions);
    this.root.appendChild(chip);
    this.positionChip(chip, anchor);
    this.chips.set(id, { el: chip, anchor });
    input.focus();
  }
  // ---- Capture prompt (Section 11) --------------------------------------------
  showCapturePrompt(anchor, question, similarQuestion, onChoice) {
    const id = "capture";
    this.removeChip(id);
    const chip = document.createElement("div");
    chip.className = "ff-chip";
    const meta = document.createElement("div");
    meta.className = "ff-meta";
    meta.textContent = "Save for review? It suggests (never auto-fills) until you approve it in the Review tab.";
    const value = document.createElement("div");
    value.className = "ff-value";
    value.textContent = question;
    const actions = document.createElement("div");
    actions.className = "ff-actions";
    const done = (choice) => {
      this.removeChip(id);
      onChoice(choice);
    };
    const save = document.createElement("button");
    save.className = "ff-primary";
    save.textContent = similarQuestion ? "Save as new" : "Save";
    save.addEventListener("click", () => done("new"));
    actions.appendChild(save);
    if (similarQuestion) {
      const merge = document.createElement("button");
      merge.textContent = `Update "${similarQuestion.slice(0, 32)}"`;
      merge.title = `Add as alias of: ${similarQuestion}`;
      merge.addEventListener("click", () => done("merge"));
      actions.appendChild(merge);
    }
    const no = document.createElement("button");
    no.textContent = "No thanks";
    no.addEventListener("click", () => done("dismiss"));
    actions.appendChild(no);
    chip.append(meta, value, actions);
    this.root.appendChild(chip);
    this.positionChip(chip, anchor);
    this.chips.set(id, { el: chip, anchor });
  }
  // ---- Filled-field highlight ---------------------------------------------------
  highlightFilled(el) {
    if (!this.highlighted.has(el)) {
      this.highlighted.set(el, el.style.outline);
      el.style.outline = HIGHLIGHT_STYLE;
      el.style.outlineOffset = "1px";
    }
  }
  toast(message, ms = 3500) {
    const toast = document.createElement("div");
    toast.className = "ff-toast";
    toast.textContent = message;
    this.root.appendChild(toast);
    setTimeout(() => toast.remove(), ms);
  }
  destroy() {
    for (const [el, original] of this.highlighted) el.style.outline = original;
    this.highlighted.clear();
    document.removeEventListener("scroll", this.reposition, { capture: true });
    window.removeEventListener("resize", this.reposition);
    this.host.remove();
  }
}
const judgeCache = createJudgeCache((message) => chrome.runtime.sendMessage(message));
const askCached = (message, read) => judgeCache.ask(message, read);
const askJudge = (message) => askCached(message, (r) => r.index ?? null);
const askJudgeText = (message) => askCached(message, (r) => r.text ?? null);
if (window.__flashfillerActive) ;
else {
  window.__flashfillerActive = true;
  setSemanticChooser((answer, options) => askJudge({ type: "SEMANTIC_CHOOSE", answer, options }));
  setSemanticQuestionMatcher(
    (question, candidates) => askJudge({ type: "SEMANTIC_MATCH_QUESTION", question, candidates })
  );
  setSemanticAnswerer(
    (question, options, facts) => askJudge({ type: "SEMANTIC_ANSWER", question, options, facts })
  );
  setSemanticCascader(
    (question, answer, facts, categories) => askCached(
      { type: "SEMANTIC_CASCADE", question, answer, facts, categories },
      (r) => r.path ?? null
    )
  );
  setSemanticTextAnswerer(
    (question, facts, kind) => askJudgeText({ type: "SEMANTIC_TEXT", question, facts, kind })
  );
  setSemanticSimilarity(semanticSimilarity);
  main();
}
function dropdownDisplayText(el) {
  var _a;
  const value = el.value;
  if (typeof value === "string" && value.trim()) return value.trim();
  const aria = el.getAttribute("aria-valuetext");
  if (aria == null ? void 0 : aria.trim()) return aria.trim();
  return ((_a = el.textContent) == null ? void 0 : _a.trim()) ?? "";
}
function answerKey(signal) {
  return signal.sectionIndex === void 0 ? signal.normalizedQuestion : `${signal.normalizedQuestion}#${signal.sectionIndex}`;
}
function main() {
  const state = {
    store: null,
    seeds: [],
    context: { company: null, role: null, location: null, source: "none" },
    fields: /* @__PURE__ */ new Map(),
    matches: /* @__PURE__ */ new Map(),
    /** Per-application-session variable answers (Section 7) — memory only. */
    sessionVars: /* @__PURE__ */ new Map(),
    /** Answered signatures for consistency across wizard steps (Section 14).
     *  The producing field's KIND rides along: a cached date must never
     *  replay into a text field that merely shares the question key ("From"
     *  label leaking onto an address input — live bug 2026-07-15). */
    sessionAnswers: /* @__PURE__ */ new Map(),
    skipped: /* @__PURE__ */ new Set(),
    capturePrompted: /* @__PURE__ */ new Set(),
    /** Fields FlashFiller itself filled — never capture our own fills. */
    selfFilled: /* @__PURE__ */ new Set(),
    /** Matcher context of the last scan — fact sheets for fill-time inference. */
    matcherCtx: null,
    /** Stored document metadata (resume/cover letter) — bytes stay in
     *  storage until a fill actually needs them. */
    documents: [],
    /** answerKeys already persisted by the learning loop this session —
     *  rescans/refills must not duplicate entries. */
    persistedLearnings: /* @__PURE__ */ new Set(),
    /** What each fill ACTUALLY placed (fieldId → text) — the validation
     *  layer's expected values (judge-picked dropdown options live only here). */
    filledValues: /* @__PURE__ */ new Map(),
    /** The match set of the last autofill run — validation's oracle (the
     *  live matches map loses filled fields on rescan). */
    lastFillMatches: null,
    /** Last validation pass (post-fill or Validate button) — the AI Fill
     *  pass's input. Carries its own match snapshot: matches for filled
     *  fields exist nowhere else after a rescan. A durable copy also goes to
     *  storage (validation-report.ts); fieldIds only mean anything in THIS
     *  page instance, so the live pass reads memory. */
    lastValidationReport: null,
    /** AI Fill pass in flight — re-entry guard + badge busy state. */
    aiFillBusy: false,
    /** AI Fill queued but not started (the fill queue may be busy for many
     *  seconds) — a double-click must not queue a second billed pass. */
    aiFillPending: false,
    /** Last displayed text per custom dropdown — externally-set values are
     *  detected by diffing on rescan (no change event to listen to). */
    /** Display text AND question identity per dropdown — the diff must know
     *  when a data-ff-id was recycled into a different widget. */
    dropdownTexts: /* @__PURE__ */ new Map(),
    /** Entry ids the user explicitly confirmed this session (chip Accept) —
     *  a validation pass must not immediately re-demote them. */
    userConfirmedEntries: /* @__PURE__ */ new Set(),
    /** Entry ids that already took ONE feedback action this session (an
     *  ok-tick or a wrong-strike) — rescans must not multiply-count the same
     *  fill's verdict. */
    strickenEntries: /* @__PURE__ */ new Set(),
    dismissed: false,
    activated: false,
    /** Observers/listeners attached (once) — see activate(). */
    attached: false,
    lastScanReport: null,
    scanInFlight: null,
    overlay: null,
    scanTimer: 0,
    /** All fill work (autofill runs, chip Accepts, variable-prompt retries)
     *  chains through here: dropdown fills open popups and poll the live
     *  DOM — two in flight at once cross-match each other's option lists,
     *  and each may hold a semantic-judge call whose pick must land on the
     *  popup it was asked about. */
    fillQueue: Promise.resolve()
  };
  function enqueueFill(job) {
    const run = state.fillQueue.then(job, job);
    state.fillQueue = run.then(
      () => void 0,
      () => void 0
      // a failed job must not wedge the queue
    );
    return run;
  }
  const storeReady = getStore().then((store) => {
    state.store = store;
    return store;
  });
  function activate() {
    state.activated = true;
    if (state.attached) return;
    state.attached = true;
    observeChanges();
    attachCaptureListeners();
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    var _a;
    if (message.type === "PING") {
      sendResponse({
        ok: true,
        activated: state.activated,
        platformDomain: ((_a = getAdapter(location.hostname, document)) == null ? void 0 : _a.canonicalDomain) ?? null
      });
      return false;
    }
    if (message.type === "SCAN_ACTIVE_TAB") {
      void storeReady.then(async () => {
        activate();
        state.dismissed = false;
        const report = await scan(true);
        sendResponse({ ok: true, ...report ?? {} });
      });
      return true;
    }
    return false;
  });
  window.__flashfillerScanReport = async () => {
    if (state.scanInFlight) await state.scanInFlight.catch(() => null);
    return state.lastScanReport;
  };
  window.__flashfillerAutofill = async () => {
    await storeReady;
    activate();
    state.dismissed = false;
    await awaitWidgetSettle();
    await scan(true);
    const report = await enqueueFill(() => runAutofill());
    const fieldsBefore = state.fields.size;
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await scan(true);
    if (state.fields.size > fieldsBefore) {
      const second = await enqueueFill(() => runAutofill());
      if (report && second) {
        report.filled += second.filled;
        report.suggested += second.suggested;
      }
    }
    return report;
  };
  async function awaitWidgetSettle(maxMs = 4e3) {
    const SKELETON = '.cx-select--loading, [role="progressbar"][aria-busy="true"]';
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      if (!document.querySelector(SKELETON)) return;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  window.__flashfillerDebug = () => {
    if (state.fields.size === 0) return null;
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
        html: signal.kind === "date" || !state.matches.has(signal.fieldId) ? el.outerHTML.slice(0, 700) : void 0
      })),
      matches: [...state.matches.values()].map((m) => {
        var _a;
        return {
          fieldId: m.fieldId,
          action: m.action,
          source: m.source,
          confidence: Math.round(m.confidence * 100) / 100,
          answer: ((_a = state.fields.get(m.fieldId)) == null ? void 0 : _a.signal.kind) === "password" ? "••••••••" : m.rawAnswerTemplate.slice(0, 40),
          chosenOptionValue: m.chosenOptionValue,
          provenance: m.provenance,
          inferAtFill: m.inferAtFill,
          notify: m.notify
        };
      })
    };
  };
  window.__flashfillerValidate = () => {
    if (state.fields.size === 0) return null;
    return runValidation();
  };
  async function init() {
    const store = await storeReady;
    onStoreChanged((updated) => {
      state.store = updated;
      if (!state.activated && enabledForPage(
        location.hostname,
        document,
        updated.settings.enabledDomains,
        updated.settings.disabledDomains
      )) {
        activate();
        void scan();
      } else if (state.activated && !state.dismissed) {
        scheduleRescan(300);
      }
    });
    if (enabledForPage(
      location.hostname,
      document,
      store.settings.enabledDomains,
      store.settings.disabledDomains
    )) {
      activate();
      await scan();
    }
  }
  function getOverlay() {
    if (!state.overlay) {
      state.overlay = new Overlay({
        onAutofill: () => void enqueueFill(() => runAutofill()),
        // Validate reads through the fill queue so it never judges a page
        // mid-fill; AI Fill is a fill job like any other.
        onValidate: () => void enqueueFill(() => runValidateOnDemand()),
        onAiFill: () => {
          var _a;
          if (state.aiFillBusy || state.aiFillPending) return;
          state.aiFillPending = true;
          const pass = ((_a = state.store) == null ? void 0 : _a.settings.fillMode) === "llm-first" ? runPlanFill : runAiFill;
          void enqueueFill(() => pass()).finally(() => {
            state.aiFillPending = false;
          });
        },
        onAccept: (fieldId) => void acceptSuggestion(fieldId),
        onSkip: (fieldId) => {
          var _a;
          state.skipped.add(fieldId);
          (_a = state.overlay) == null ? void 0 : _a.removeChip(fieldId);
        },
        onDismiss: () => {
          state.dismissed = true;
          state.overlay = null;
        }
      });
    }
    return state.overlay;
  }
  function badgeAiFill() {
    var _a;
    if (!state.lastValidationReport) return null;
    const settings = (_a = state.store) == null ? void 0 : _a.settings;
    if ((settings == null ? void 0 : settings.fillMode) === "llm-first" && state.store) {
      const eeoStored = buildEeoStored(state.store.profile, state.store.qa);
      const { targets } = selectPlanTargets(
        state.lastValidationReport.report,
        (v) => eeoStoredAnswerFor(v.label || v.normalizedQuestion, eeoStored)
      );
      return {
        count: targets.length,
        enabled: !!settings.planner.apiKeyRef,
        busy: state.aiFillBusy,
        mode: "planner"
      };
    }
    const sem = settings == null ? void 0 : settings.semanticMatching;
    return {
      count: selectAiFillTargets(state.lastValidationReport.report).targets.length,
      // enabled + key only — `provider` may still be the 'none' default on
      // stores enabled before the toggle force-set it (see getJudgeConfig)
      enabled: !!((sem == null ? void 0 : sem.enabled) && sem.apiKeyRef),
      busy: state.aiFillBusy,
      mode: "judge"
    };
  }
  function refreshBadge() {
    if (!state.overlay) return;
    const actionable = [...state.matches.values()].filter((m) => m.action !== "ignore").length;
    state.overlay.setBadge(actionable, { aiFill: badgeAiFill() });
  }
  function scan(explicit = false) {
    const run = doScan(explicit).finally(() => {
      if (state.scanInFlight === run) state.scanInFlight = null;
    });
    state.scanInFlight = run;
    return run;
  }
  async function doScan(explicit) {
    var _a, _b;
    if (!state.activated || state.dismissed || !state.store) return null;
    const store = state.store;
    const detected = detectFields(document);
    state.fields = new Map(detected.map((f) => [f.signal.fieldId, f]));
    state.context = extractPageContext(document);
    if (state.seeds.length === 0) {
      try {
        const res = await fetch(chrome.runtime.getURL("seed-questions.json"));
        state.seeds = SeedCatalogSchema.parse(await res.json()).questions;
      } catch {
        state.seeds = [];
      }
    }
    const activePersona = store.settings.activePersona ?? (store.settings.autoInferPersona ? inferPersona(state.context.role, store.settings.personas) : null);
    const signals = detected.map((f) => f.signal);
    const embedTexts = detected.map(
      (f) => f.signal.label || f.signal.normalizedQuestion
    );
    for (const e of store.qa) embedTexts.push(e.question, ...e.aliases);
    void prefetchEmbeddings(embedTexts.filter(Boolean).slice(0, 400));
    try {
      state.documents = await listDocumentMeta();
    } catch {
      state.documents = [];
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
      documents: state.documents
    };
    state.matches = await matchAll(signals, state.matcherCtx);
    for (const field of detected) {
      const { signal } = field;
      if (signal.filled || state.matches.has(signal.fieldId)) continue;
      const cached = state.sessionAnswers.get(answerKey(signal));
      if (cached && cached.kind === signal.kind && !signal.consentLike && signal.kind !== "file") {
        state.matches.set(signal.fieldId, {
          fieldId: signal.fieldId,
          resolvedAnswer: null,
          rawAnswerTemplate: cached.value,
          confidence: 0.9,
          source: "profile",
          unresolvedVars: [],
          action: "autofill",
          needsReview: false,
          composite: false
        });
      }
    }
    for (const field of detected) {
      const { signal } = field;
      if (signal.kind !== "custom-dropdown") continue;
      const current = dropdownDisplayText(field.el);
      const previous = state.dropdownTexts.get(signal.fieldId);
      state.dropdownTexts.set(signal.fieldId, {
        text: current,
        question: signal.normalizedQuestion
      });
      if (previous === void 0 || previous.text === current || !current) continue;
      if (previous.question !== signal.normalizedQuestion) {
        console.debug(
          "[FlashFiller] capture skipped: widget identity changed",
          `"${previous.question}" → "${signal.normalizedQuestion}"`
        );
        continue;
      }
      const gated = captureGate(signal.fieldId);
      if (gated) promptCapture(gated, current);
    }
    const actionable = [...state.matches.values()].filter((m) => m.action !== "ignore");
    const report = {
      detected: detected.length,
      matched: actionable.length,
      skippedFilled: detected.filter((f) => f.signal.filled).length
    };
    state.lastScanReport = report;
    console.debug(
      "[FlashFiller] scan",
      report,
      detected.reduce((acc, f) => {
        acc[f.signal.kind] = (acc[f.signal.kind] ?? 0) + 1;
        return acc;
      }, {})
    );
    const aiFill = badgeAiFill();
    if (actionable.length > 0) getOverlay().setBadge(actionable.length, { aiFill });
    else if (explicit && detected.length > 0) getOverlay().setBadge(0, { explicit: true, aiFill });
    else (_a = state.overlay) == null ? void 0 : _a.setBadge(0, { aiFill });
    (_b = state.overlay) == null ? void 0 : _b.refresh();
    return report;
  }
  function resolveMatch(match) {
    const store = state.store;
    const { text, unresolved } = resolveVariables(match.rawAnswerTemplate, {
      context: state.context,
      profile: store.profile,
      session: state.sessionVars
    });
    return unresolved.length > 0 ? { value: null, unresolved } : { value: text, unresolved: [] };
  }
  const wait2 = (ms) => new Promise((r) => setTimeout(r, ms));
  async function fillOne(field, match, opts = {}) {
    var _a;
    const { value, unresolved } = resolveMatch(match);
    if (value === null) {
      const overlay = getOverlay();
      const name = unresolved[0];
      overlay.promptVariable(name, field.el, (provided) => {
        state.sessionVars.set(name, provided);
        void enqueueFill(() => fillOne(field, match, opts));
      });
      return "prompted";
    }
    const factSheet = match.inferAtFill && state.matcherCtx ? buildFactSheet(state.matcherCtx, field.signal.label || field.signal.normalizedQuestion) : null;
    let documentPayload = null;
    if (field.signal.kind === "file") {
      if (match.source.startsWith("document:")) {
        const doc = await getDocument(match.source.slice("document:".length));
        if (doc) documentPayload = { name: doc.name, mime: doc.mime, bytes: base64ToBytes(doc.bytesB64) };
      }
      if (!documentPayload) return "failed";
    }
    const answerFallbacks = (match.answerFallbacks ?? []).map(
      (f) => resolveVariables(f, {
        context: state.context,
        profile: state.store.profile,
        session: state.sessionVars
      }).text
    ).filter((t) => t.trim() !== "" && !/\{\{[\w.\s]+\}\}/.test(t));
    const { outcome, filledText } = await fillField(
      field,
      { ...match, resolvedAnswer: value, answerFallbacks },
      ((_a = state.store) == null ? void 0 : _a.optionSets) ?? [],
      state.context,
      { userInitiated: opts.userInitiated, factSheet, document: documentPayload }
    );
    if (outcome === "filled") {
      state.selfFilled.add(match.fieldId);
      state.sessionAnswers.set(answerKey(field.signal), {
        value: filledText ?? value,
        kind: field.signal.kind
      });
      state.filledValues.set(match.fieldId, filledText ?? value);
      getOverlay().highlightFilled(field.el);
      getOverlay().removeChip(match.fieldId);
      persistLearning(field.signal, match, filledText ?? value);
    } else {
      console.debug(
        "[FlashFiller] fill outcome",
        outcome,
        field.signal.label || field.signal.normalizedQuestion,
        `(${field.signal.kind})`
      );
    }
    return outcome;
  }
  function persistLearning(signal, match, answerText) {
    const store = state.store;
    if (!store || !match.provenance || !answerText.trim()) return;
    if (signal.sectionIndex !== void 0 || signal.eeoLike) return;
    if (looksEeoLoose(signal.label) || looksEeoLoose(signal.normalizedQuestion)) return;
    const key = answerKey(signal);
    if (state.persistedLearnings.has(key)) return;
    state.persistedLearnings.add(key);
    const wording = signal.label || signal.normalizedQuestion;
    if (match.provenance === "drift" && match.source.startsWith("qa:")) {
      const id = match.source.slice(3);
      const entry = store.qa.find((e) => e.id === id);
      if (!entry) return;
      if (crossesEeoTopic(wording, entry.question)) return;
      const merged = mergeAsAlias(entry, wording, signal.options.map((o) => o.text));
      if (merged !== entry) void upsertQA(merged);
      return;
    }
    if (match.provenance === "inferred") {
      const similar = findSimilar(store.qa, signal.normalizedQuestion);
      if (similar) {
        if (similar.entry.answer.trim().toLowerCase() === answerText.trim().toLowerCase()) {
          const merged = mergeAsAlias(similar.entry, wording, signal.options.map((o) => o.text));
          if (merged !== similar.entry) void upsertQA(merged);
        }
        return;
      }
      void upsertQA(buildInferredEntry(signal, answerText, state.context));
    }
  }
  function showSuggestionChip(fieldId, field, match, meta) {
    if (match.notify) {
      getOverlay().showChip({
        fieldId,
        anchor: field.el,
        title: field.signal.label,
        value: "",
        meta: match.rawAnswerTemplate,
        needsReview: false,
        kind: "flag"
      });
      return;
    }
    const { value } = resolveMatch(match);
    getOverlay().showChip({
      fieldId,
      anchor: field.el,
      title: field.signal.label,
      value: field.signal.kind === "password" ? "••••••••" : value ?? match.rawAnswerTemplate,
      meta,
      needsReview: match.needsReview,
      kind: "suggestion"
    });
  }
  function refreshField(field) {
    if (field.el.isConnected) return field;
    const fresh = detectFields(document);
    return fresh.find(
      (f) => f.signal.normalizedQuestion === field.signal.normalizedQuestion && f.signal.kind === field.signal.kind && !f.signal.filled
    ) ?? null;
  }
  async function runAutofill() {
    var _a, _b, _c;
    if (!state.store) return null;
    const overlay = getOverlay();
    let filled = 0;
    let suggested = 0;
    const attempted = /* @__PURE__ */ new Set();
    const matchSnapshot = new Map(state.matches);
    const fillOrder = [...state.matches].sort(
      ([a], [b]) => {
        var _a2, _b2;
        return (((_a2 = state.fields.get(a)) == null ? void 0 : _a2.signal.kind) === "file" ? 0 : 1) - (((_b2 = state.fields.get(b)) == null ? void 0 : _b2.signal.kind) === "file" ? 0 : 1);
      }
    );
    for (const [fieldId, match] of fillOrder) {
      const staleField = state.fields.get(fieldId);
      if (!staleField) continue;
      const field = refreshField(staleField);
      if (!field) {
        console.debug("[FlashFiller] field vanished before fill", staleField.signal.label);
        continue;
      }
      if (field !== staleField) state.fields.set(fieldId, field);
      if (field.pillEls) {
        field.signal.filled = field.pillEls.some(
          (p) => p.getAttribute("aria-pressed") === "true"
        );
      }
      if (field.signal.filled && !state.store.settings.overwriteFilled) {
        attempted.add(answerKey(field.signal));
        continue;
      }
      if (match.action === "autofill") {
        const outcome = await fillOne(field, match);
        if (outcome !== "failed") attempted.add(answerKey(field.signal));
        if (outcome === "filled") {
          filled++;
        } else {
          if (outcome === "failed") {
            showSuggestionChip(
              fieldId,
              field,
              match,
              `Couldn’t fill automatically (${Math.round(match.confidence * 100)}% match) — Accept retries`
            );
          }
          suggested++;
        }
        if (state.store.settings.fillDelayMs > 0) {
          await wait2(state.store.settings.fillDelayMs + Math.random() * 40);
        }
      } else if (match.action === "suggest" && !state.skipped.has(fieldId)) {
        showSuggestionChip(fieldId, field, match, `${Math.round(match.confidence * 100)}% match`);
        suggested++;
      }
    }
    await wait2(600);
    await scan();
    for (const [fieldId, match] of state.matches) matchSnapshot.set(fieldId, match);
    for (const [fieldId, match] of state.matches) {
      if (match.action !== "autofill") continue;
      const field = state.fields.get(fieldId);
      if (!field) continue;
      const key = answerKey(field.signal);
      if (attempted.has(key)) continue;
      attempted.add(key);
      const live = refreshField(field);
      if (!live || live.signal.filled && !state.store.settings.overwriteFilled) continue;
      const outcome = await fillOne(live, match);
      if (outcome === "filled") filled++;
      else if (outcome === "failed") {
        showSuggestionChip(fieldId, live, match, "Couldn’t fill automatically — Accept retries");
        suggested++;
      }
    }
    for (const field of state.fields.values()) {
      const { signal } = field;
      if (!field.el.isConnected || signal.filled) continue;
      if (signal.kind === "file" && !matchSnapshot.has(signal.fieldId)) {
        overlay.showChip({
          fieldId: signal.fieldId,
          anchor: field.el,
          title: signal.label,
          value: "",
          meta: "No stored document matches — attach manually (or add one under Options → Documents)",
          needsReview: false,
          kind: "flag"
        });
      } else if (signal.consentLike && !state.matches.has(signal.fieldId)) {
        overlay.showChip({
          fieldId: signal.fieldId,
          anchor: field.el,
          title: signal.label,
          value: "",
          meta: "Consent box — review and check it yourself",
          needsReview: false,
          kind: "flag"
        });
      }
    }
    await wait2(800);
    state.lastFillMatches = matchSnapshot;
    let report = [];
    try {
      report = runValidation();
    } catch (error) {
      console.debug("[FlashFiller] validation crashed", error);
    }
    const summary = summarizeValidation(report);
    for (const v of report) {
      if (v.verdict === "skipped") continue;
      const feedbackMatch = matchSnapshot.get(v.fieldId);
      if (feedbackMatch == null ? void 0 : feedbackMatch.source.startsWith("qa:")) {
        const id = feedbackMatch.source.slice(3);
        const entry = (_a = state.store) == null ? void 0 : _a.qa.find((e) => e.id === id);
        if (entry && (entry.source === "captured" || entry.source === "inferred")) {
          if (v.verdict === "ok" && !state.strickenEntries.has(id)) {
            state.strickenEntries.add(id);
            void patchQA(id, { okCount: (entry.okCount ?? 0) + 1, updatedAt: Date.now() });
          } else if (v.verdict === "wrong" && !state.userConfirmedEntries.has(id) && !state.strickenEntries.has(id)) {
            state.strickenEntries.add(id);
            const action = wrongVerdictAction(entry);
            if (action !== "none") {
              const note = `Filled wrong value on ${location.hostname}: expected "${v.expected ?? ""}", found "${v.actual ?? ""}"`;
              void patchQA(id, {
                wrongCount: (entry.wrongCount ?? 0) + 1,
                lastWrongAt: Date.now(),
                okCount: 0,
                // graduation resets on any wrong
                reviewNote: note,
                ...action === "demote" ? { status: "needs_review" } : {},
                updatedAt: Date.now()
              });
              console.debug(
                `[FlashFiller] ${action === "demote" ? "demoted" : "struck"} learned entry`,
                entry.question,
                note
              );
              if (action === "demote")
                void chrome.runtime.sendMessage({ type: "CAPTURE_COUNT_CHANGED" });
            }
          }
        }
      }
      if (v.verdict === "ok" && feedbackMatch && v.actual) {
        const vKind = (_b = state.fields.get(v.fieldId)) == null ? void 0 : _b.signal.kind;
        const answerText = feedbackMatch.rawAnswerTemplate;
        if ((vKind === "select" || vKind === "radio" || vKind === "custom-dropdown") && answerText && !answerText.includes("{{") && canonicalAnswer(answerText) !== canonicalAnswer(v.actual) && lexicalAnswerScore(answerText, v.actual) < 0.55) {
          const set = recordOptionEquivalence(
            ((_c = state.store) == null ? void 0 : _c.optionSets) ?? [],
            answerText,
            v.actual,
            newId
          );
          if (set) {
            void upsertOptionSet(set);
            console.debug("[FlashFiller] learned option equivalence", answerText, "≈", v.actual);
          }
        }
      }
    }
    renderValidationFindings(report, matchSnapshot);
    storeValidationReport(report, matchSnapshot);
    console.debug("[FlashFiller] validation summary", summary);
    refreshBadge();
    maybeQueuePlanFill();
    overlay.toast(
      `FlashFiller: ${filled} filled, ${suggested} suggested · validated: ${summary.ok} ok` + (summary.wrong > 0 ? `, ${summary.wrong} WRONG` : "") + (summary.missingAnswerable > 0 ? `, ${summary.missingAnswerable} missed` : "") + (summary.missingUnanswered > 0 ? `, ${summary.missingUnanswered} unanswered` : "") + ". Review before submitting!"
    );
    return { filled, suggested };
  }
  function validationOracle() {
    const merged = new Map(state.matches);
    if (state.lastFillMatches) {
      for (const [fieldId, match] of state.lastFillMatches) {
        if (state.filledValues.has(fieldId) || !merged.has(fieldId)) merged.set(fieldId, match);
      }
    }
    return merged;
  }
  function runValidation() {
    const fresh = detectFields(document);
    for (const field of fresh) {
      const existing = state.fields.get(field.signal.fieldId);
      if (!existing || !existing.el.isConnected) state.fields.set(field.signal.fieldId, field);
    }
    return validateFields(fresh, validationOracle(), state.filledValues);
  }
  function renderValidationFindings(report, matchSnapshot) {
    const overlay = state.overlay;
    if (!overlay) return;
    for (const v of report) {
      if (v.verdict === "skipped" || v.verdict === "ok") continue;
      console.debug("[FlashFiller] validation", v.verdict, v.label, `(${v.kind})`, {
        expected: v.expected,
        actual: v.actual
      });
      const field = state.fields.get(v.fieldId);
      const match = matchSnapshot.get(v.fieldId);
      if (v.verdict === "wrong" && field && match) {
        overlay.showChip({
          fieldId: v.fieldId,
          anchor: field.el,
          title: v.label,
          value: v.expected ?? "",
          meta: `Validation: found “${v.actual ?? ""}” — Accept refills`,
          needsReview: false,
          kind: "suggestion"
        });
      } else if (v.verdict === "missing-answerable" && field && match) {
        showSuggestionChip(v.fieldId, field, match, "Validation: still empty — Accept retries");
      } else if (v.verdict === "missing-unanswered" && v.required && field) {
        overlay.showChip({
          fieldId: v.fieldId,
          anchor: field.el,
          title: v.label,
          value: "",
          meta: "Required, no stored answer — fill it once and I’ll learn it",
          needsReview: false,
          kind: "flag"
        });
      }
    }
  }
  function storeValidationReport(report, matchSnapshot) {
    state.lastValidationReport = { at: Date.now(), report, matches: new Map(matchSnapshot) };
    saveValidationReport({
      url: location.href,
      at: Date.now(),
      summary: summarizeValidation(report),
      entries: report
    }).catch((error) => console.debug("[FlashFiller] validation report persist failed", error));
  }
  async function runValidateOnDemand() {
    if (!state.store || state.dismissed) return;
    const overlay = state.overlay;
    if (!overlay) return;
    await wait2(400);
    let report;
    try {
      report = runValidation();
    } catch (error) {
      console.debug("[FlashFiller] validation crashed", error);
      overlay.toast("Validation crashed — see the console.");
      return;
    }
    const matchSnapshot = validationOracle();
    renderValidationFindings(report, matchSnapshot);
    storeValidationReport(report, matchSnapshot);
    const summary = summarizeValidation(report);
    console.debug("[FlashFiller] validation summary", summary);
    const { targets } = selectAiFillTargets(report);
    refreshBadge();
    overlay.toast(
      `Validated: ${summary.ok} ok` + (summary.wrong > 0 ? `, ${summary.wrong} WRONG` : "") + (summary.missingAnswerable > 0 ? `, ${summary.missingAnswerable} missed` : "") + (summary.missingUnanswered > 0 ? `, ${summary.missingUnanswered} unanswered` : "") + (targets.length > 0 ? ` · ${targets.length} fillable by AI` : "")
    );
  }
  async function runAiFill() {
    if (!state.store || state.aiFillBusy || state.dismissed) return;
    const overlay = state.overlay;
    if (!overlay) return;
    const sem = state.store.settings.semanticMatching;
    if (!sem.enabled || !sem.apiKeyRef) {
      overlay.toast(
        !sem.enabled ? "AI Fill needs the OpenAI judge — enable Semantic matching in Options → Settings." : "AI Fill needs your OpenAI API key — Options → Settings → Semantic matching."
      );
      return;
    }
    const reportState = state.lastValidationReport;
    if (!reportState) {
      overlay.toast("Run Validate first — AI Fill works from its report.");
      return;
    }
    state.aiFillBusy = true;
    refreshBadge();
    try {
      let fresh;
      try {
        fresh = detectFields(document);
      } catch (error) {
        console.debug("[FlashFiller] AI fill aborted: detection crashed", error);
        overlay.toast("AI Fill aborted — couldn’t re-check the page.");
        return;
      }
      const freshFields = new Map(fresh.map((f) => [f.signal.fieldId, f]));
      for (const field of fresh) {
        const existing = state.fields.get(field.signal.fieldId);
        if (!existing || !existing.el.isConnected) state.fields.set(field.signal.fieldId, field);
      }
      const liveOracle = validationOracle();
      const report = validateFields(fresh, liveOracle, state.filledValues);
      const { targets, skipped, overflow } = selectAiFillTargets(report);
      for (const s of skipped) {
        if (s.why !== "eeo" && s.why !== "consent") continue;
        const field = state.fields.get(s.entry.fieldId);
        if (!field || !field.el.isConnected) continue;
        overlay.showChip({
          fieldId: s.entry.fieldId,
          anchor: field.el,
          title: s.entry.label,
          value: "",
          meta: "Needs your answer — AI never guesses demographics or consent",
          needsReview: false,
          kind: "flag"
        });
      }
      if (targets.length === 0) {
        overlay.toast("Nothing left for AI to fill — run Validate to refresh the report.");
        return;
      }
      const evicted = judgeCache.evictDeclines();
      console.debug("[FlashFiller] AI fill start", {
        targets: targets.length,
        evictedDeclines: evicted,
        overflow
      });
      const matches = new Map(reportState.matches);
      let filled = 0;
      let declined = 0;
      let failed = 0;
      let dropped = 0;
      const declineChip = (field, title) => overlay.showChip({
        fieldId: field.signal.fieldId,
        anchor: field.el,
        title,
        value: "",
        meta: "AI couldn’t determine an answer — fill manually",
        needsReview: false,
        kind: "flag"
      });
      for (const t of targets) {
        const freshField = freshFields.get(t.entry.fieldId);
        const field = freshField ? refreshField(freshField) : null;
        if (!field) {
          dropped++;
          continue;
        }
        state.fields.set(field.signal.fieldId, field);
        const { signal } = field;
        if (signal.eeoLike || signal.consentLike || signal.kind === "file" || signal.kind === "password") {
          dropped++;
          continue;
        }
        const question = signal.label || signal.normalizedQuestion;
        const storedMatch = matches.get(t.entry.fieldId) ?? liveOracle.get(t.entry.fieldId);
        let match = null;
        if (t.reason === "missing-answerable" && storedMatch && storedMatch.action !== "ignore" && !storedMatch.notify) {
          match = {
            ...signal.kind === "select" || signal.kind === "radio" || signal.kind === "custom-dropdown" ? judgeRetryMatch(storedMatch) : { ...storedMatch, action: "autofill", needsReview: false },
            fieldId: signal.fieldId
          };
        } else if (signal.kind === "custom-dropdown") {
          match = inferDropdownMatch(signal.fieldId);
        } else if ((signal.kind === "select" || signal.kind === "radio") && signal.options.length > 0) {
          const index = await askJudge({
            type: "SEMANTIC_ANSWER",
            question,
            options: signal.options.map((o) => o.text),
            facts: state.matcherCtx ? buildFactSheet(state.matcherCtx, question) : ""
          });
          if (index === null || !signal.options[index]) {
            declined++;
            declineChip(field, question);
            continue;
          }
          match = inferOptionMatch(signal.fieldId, signal.options[index], signal.kind);
        } else if (signal.kind === "text" || signal.kind === "textarea") {
          if (isIdentityLabel(signal.label)) {
            dropped++;
            continue;
          }
          const text = await askJudgeText({
            type: "SEMANTIC_TEXT",
            question,
            facts: state.matcherCtx ? buildFactSheet(state.matcherCtx, question) : "",
            kind: signal.kind === "textarea" ? "textarea" : "text"
          });
          if (!text) {
            declined++;
            declineChip(field, question);
            continue;
          }
          match = inferTextMatch(signal.fieldId, text);
        }
        if (!match) {
          dropped++;
          continue;
        }
        if (readActualValue(field).trim() !== "") {
          dropped++;
          continue;
        }
        const outcome = await fillOne(field, match, { userInitiated: true });
        if (outcome === "filled") {
          filled++;
          matches.set(signal.fieldId, match);
        } else if (outcome === "failed") {
          failed++;
          declineChip(field, question);
        }
        if (state.store.settings.fillDelayMs > 0) {
          await wait2(state.store.settings.fillDelayMs + Math.random() * 40);
        }
      }
      await wait2(800);
      state.lastFillMatches = matches;
      let after = [];
      try {
        after = runValidation();
      } catch (error) {
        console.debug("[FlashFiller] validation crashed", error);
      }
      renderValidationFindings(after, matches);
      storeValidationReport(after, matches);
      const summary = summarizeValidation(after);
      console.debug("[FlashFiller] validation summary", summary);
      overlay.toast(
        `AI Fill: ${filled} filled` + (declined > 0 ? `, ${declined} declined` : "") + (failed > 0 ? `, ${failed} failed` : "") + (dropped > 0 ? `, ${dropped} skipped` : "") + (overflow > 0 ? ` · ${overflow} more — run again` : "") + ` · now ${summary.ok} ok. Review before submitting!`
      );
    } finally {
      state.aiFillBusy = false;
      refreshBadge();
    }
  }
  function candidateAnswerOf(entry) {
    if (!state.store) return null;
    if (entry.answerType === "composite" || entry.answerType === "notify") return null;
    if (entry.answerType === "profile" && entry.mapsTo) {
      const path = entry.mapsTo.replace(/^profile\./, "");
      if (/accountpassword/i.test(path)) return null;
      let cur = state.store.profile;
      for (const part of path.split(".")) {
        if (cur === null || typeof cur !== "object") return null;
        cur = cur[part];
      }
      if (cur === void 0 || cur === null || typeof cur === "object") return null;
      const text2 = typeof cur === "boolean" ? cur ? "Yes" : "No" : String(cur).trim();
      return text2 || null;
    }
    if (!entry.answer.trim()) return null;
    const { text, unresolved } = resolveVariables(entry.answer, {
      context: state.context,
      profile: state.store.profile,
      session: state.sessionVars
    });
    const resolvedText = text.trim();
    if (unresolved.length > 0 || !resolvedText || /\{\{[\w.\s]+\}\}/.test(resolvedText)) return null;
    return resolvedText;
  }
  function harvestJdExcerpt(maxChars = 1600) {
    const tidy = (text) => text.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    const clip = (text) => text.length <= maxChars ? text : `${text.slice(0, maxChars).trimEnd()}…`;
    try {
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const walk = (node) => {
            if (Array.isArray(node)) {
              for (const item of node) {
                const hit2 = walk(item);
                if (hit2) return hit2;
              }
              return null;
            }
            if (node && typeof node === "object") {
              const record = node;
              if (record["@type"] === "JobPosting" && typeof record.description === "string") {
                const div = document.createElement("div");
                div.innerHTML = record.description;
                return div.textContent ?? null;
              }
              if (record["@graph"]) return walk(record["@graph"]);
            }
            return null;
          };
          const hit = walk(JSON.parse(script.textContent ?? "null"));
          if (hit && hit.trim().length > 120) return clip(tidy(hit));
        } catch {
        }
      }
      const main2 = document.querySelector('main, [role="main"], article');
      const text = tidy((main2 == null ? void 0 : main2.innerText) ?? "");
      if (text.length > 200) return clip(text);
    } catch {
    }
    return "";
  }
  async function requestPlan(brief, repair) {
    try {
      const res = await chrome.runtime.sendMessage({
        type: "PLANNER_PLAN",
        brief,
        repair
      });
      if ((res == null ? void 0 : res.ok) && typeof res.raw === "string") return res.raw;
      if (res == null ? void 0 : res.error) console.debug("[FlashFiller] planner error", res.error);
      return null;
    } catch (error) {
      console.debug("[FlashFiller] planner message failed", error);
      return null;
    }
  }
  async function executePlanDecisions(decisions, freshFields, matches, attemptedValues, counts, overlay) {
    for (const d of decisions) {
      const staleField = freshFields.get(d.entry.fieldId) ?? state.fields.get(d.entry.fieldId);
      const field = staleField ? refreshField(staleField) : null;
      if (!field) continue;
      state.fields.set(field.signal.fieldId, field);
      const { signal } = field;
      if (signal.consentLike || signal.kind === "file" || signal.kind === "password") continue;
      if (signal.eeoLike && d.sourceKind !== "eeo") continue;
      const question = signal.label || signal.normalizedQuestion;
      if (d.entry.action === "skip" || d.entry.action === "needs_human") {
        counts.humans++;
        overlay.showChip({
          fieldId: signal.fieldId,
          anchor: field.el,
          title: question,
          value: "",
          meta: `Planner: ${d.entry.reason || "needs your answer"}`,
          needsReview: false,
          kind: "flag"
        });
        continue;
      }
      const match = planEntryToMatch(d, signal);
      if (match.action === "suggest") {
        matches.set(signal.fieldId, match);
        showSuggestionChip(signal.fieldId, field, match, "Planner suggests — Accept fills");
        counts.suggested++;
        continue;
      }
      if (readActualValue(field).trim() !== "") continue;
      const outcome = await fillOne(field, match, { userInitiated: true });
      if (outcome === "filled") {
        counts.filled++;
        matches.set(signal.fieldId, match);
        attemptedValues.set(signal.fieldId, match.rawAnswerTemplate);
      } else if (outcome === "failed") {
        matches.set(signal.fieldId, match);
        attemptedValues.set(signal.fieldId, match.rawAnswerTemplate);
        showSuggestionChip(signal.fieldId, field, match, "Planner couldn’t place this — Accept retries");
        counts.suggested++;
      }
      if (state.store.settings.fillDelayMs > 0) {
        await wait2(state.store.settings.fillDelayMs + Math.random() * 40);
      }
    }
  }
  async function runPlanFill() {
    var _a, _b;
    if (!state.store || state.aiFillBusy || state.dismissed) return;
    const overlay = state.overlay;
    if (!overlay) return;
    const settings = state.store.settings;
    if (settings.fillMode !== "llm-first") return;
    if (!settings.planner.apiKeyRef) {
      overlay.toast(
        "LLM-first filling needs your Anthropic API key — Options → Settings → LLM-first filling."
      );
      return;
    }
    state.aiFillBusy = true;
    refreshBadge();
    try {
      let fresh;
      try {
        fresh = detectFields(document);
      } catch (error) {
        console.debug("[FlashFiller] plan fill aborted: detection crashed", error);
        overlay.toast("Plan fill aborted — couldn’t re-check the page.");
        return;
      }
      const freshFields = new Map(fresh.map((f) => [f.signal.fieldId, f]));
      for (const field of fresh) {
        const existing = state.fields.get(field.signal.fieldId);
        if (!existing || !existing.el.isConnected) state.fields.set(field.signal.fieldId, field);
      }
      const liveOracle = validationOracle();
      const report = validateFields(fresh, liveOracle, state.filledValues);
      const profile = state.store.profile;
      const eeoStored = buildEeoStored(profile, state.store.qa);
      const { targets, skipped, overflow } = selectPlanTargets(
        report,
        (v) => eeoStoredAnswerFor(v.label || v.normalizedQuestion, eeoStored)
      );
      for (const s of skipped) {
        if (s.why !== "eeo-unstored" && s.why !== "consent") continue;
        const field = state.fields.get(s.entry.fieldId);
        if (!field || !field.el.isConnected) continue;
        overlay.showChip({
          fieldId: s.entry.fieldId,
          anchor: field.el,
          title: s.entry.label,
          value: "",
          meta: s.why === "consent" ? "Consent box — review and check it yourself" : "Needs your answer — nothing stored for this demographic question",
          needsReview: false,
          kind: "flag"
        });
      }
      if (targets.length === 0) {
        overlay.toast("Nothing left for the planner — run Validate to refresh the report.");
        return;
      }
      const signalsAll = fresh.map((f) => f.signal);
      const censusFields = targets.map((t) => {
        const field = freshFields.get(t.fieldId);
        return censusEntry(
          t,
          field == null ? void 0 : field.signal,
          field ? neighborLabels(field.signal, signalsAll) : [],
          field ? readActualValue(field) : ""
        );
      });
      const questions = censusFields.map((f) => f.label || f.normalizedQuestion);
      const candidates = [];
      for (const entry of selectRelevantQA(state.store.qa, questions, location.hostname)) {
        const answer = candidateAnswerOf(entry);
        if (!answer) continue;
        candidates.push({
          id: entry.id,
          question: entry.question,
          answer,
          ...((_a = entry.fallbacks) == null ? void 0 : _a.length) ? { fallbacks: entry.fallbacks } : {}
        });
      }
      const brief = {
        page: {
          company: state.context.company,
          role: state.context.role,
          hostname: location.hostname
        },
        fields: censusFields,
        profileFacts: buildProfileFacts(profile),
        lifeState: deriveLifeState(profile),
        stances: STANCES,
        eeoStored,
        candidates,
        overflow,
        jd: harvestJdExcerpt() || null
      };
      console.debug("[FlashFiller] planner brief", {
        fields: censusFields.length,
        candidates: candidates.length,
        overflow,
        jdChars: ((_b = brief.jd) == null ? void 0 : _b.length) ?? 0
      });
      const raw = await requestPlan(brief, null);
      if (!raw) {
        overlay.toast(
          "Planner call failed — check the Anthropic key in Options → Settings (console has details)."
        );
        return;
      }
      const plan = extractPlanJson(raw);
      if (!plan) {
        console.debug("[FlashFiller] unparseable plan", raw.slice(0, 400));
        overlay.toast("Planner returned an unreadable plan — try again.");
        return;
      }
      const { accepted, rejected } = validatePlan(plan, brief);
      console.debug("[FlashFiller] plan validated", {
        accepted: accepted.length,
        rejected: rejected.map((r) => `${r.entry.fieldId}: ${r.why}`)
      });
      for (const r of rejected) {
        const field = state.fields.get(r.entry.fieldId);
        if (!field || !field.el.isConnected) continue;
        overlay.showChip({
          fieldId: r.entry.fieldId,
          anchor: field.el,
          title: field.signal.label || field.signal.normalizedQuestion,
          value: "",
          meta: `Planner blocked: ${r.why} — fill manually`,
          needsReview: false,
          kind: "flag"
        });
      }
      const matches = new Map(liveOracle);
      const attemptedValues = /* @__PURE__ */ new Map();
      const counts = { filled: 0, suggested: 0, humans: 0 };
      await executePlanDecisions(accepted, freshFields, matches, attemptedValues, counts, overlay);
      await wait2(800);
      let after = [];
      try {
        after = runValidation();
      } catch (error) {
        console.debug("[FlashFiller] validation crashed", error);
      }
      const repairItems = buildRepairItems(after, attemptedValues, (fieldId) => {
        const field = state.fields.get(fieldId);
        return field ? field.signal.options.map((o) => o.text) : [];
      });
      if (repairItems.length > 0) {
        console.debug(
          "[FlashFiller] planner repair round",
          repairItems.map((i) => i.label)
        );
        const repairRaw = await requestPlan(brief, { items: repairItems, previous: plan });
        const repairPlan = repairRaw ? extractPlanJson(repairRaw) : null;
        if (repairPlan) {
          const repairIds = new Set(repairItems.map((i) => i.fieldId));
          const second = validatePlan(
            repairPlan.filter((e) => repairIds.has(e.fieldId)),
            brief
          );
          await executePlanDecisions(
            second.accepted,
            freshFields,
            matches,
            attemptedValues,
            counts,
            overlay
          );
          await wait2(800);
          try {
            after = runValidation();
          } catch (error) {
            console.debug("[FlashFiller] validation crashed", error);
          }
        }
      }
      state.lastFillMatches = matches;
      renderValidationFindings(after, matches);
      storeValidationReport(after, matches);
      const summary = summarizeValidation(after);
      console.debug("[FlashFiller] validation summary", summary);
      overlay.toast(
        `Planner: ${counts.filled} filled` + (counts.suggested > 0 ? `, ${counts.suggested} suggested` : "") + (counts.humans > 0 ? `, ${counts.humans} for you` : "") + (rejected.length > 0 ? `, ${rejected.length} blocked` : "") + (overflow > 0 ? ` · ${overflow} more — run again` : "") + ` · now ${summary.ok} ok. Review before submitting!`
      );
    } finally {
      state.aiFillBusy = false;
      refreshBadge();
    }
  }
  function maybeQueuePlanFill() {
    var _a;
    const settings = (_a = state.store) == null ? void 0 : _a.settings;
    if ((settings == null ? void 0 : settings.fillMode) !== "llm-first" || !settings.planner.apiKeyRef) return;
    if (state.aiFillBusy || state.aiFillPending) return;
    const reportState = state.lastValidationReport;
    if (!reportState || !state.store) return;
    const eeoStored = buildEeoStored(state.store.profile, state.store.qa);
    const { targets } = selectPlanTargets(
      reportState.report,
      (v) => eeoStoredAnswerFor(v.label || v.normalizedQuestion, eeoStored)
    );
    if (targets.length === 0) return;
    state.aiFillPending = true;
    void enqueueFill(() => runPlanFill()).finally(() => {
      state.aiFillPending = false;
    });
  }
  async function acceptSuggestion(fieldId) {
    var _a, _b, _c, _d;
    const field = state.fields.get(fieldId);
    const match = state.matches.get(fieldId) ?? ((_a = state.lastFillMatches) == null ? void 0 : _a.get(fieldId)) ?? ((_b = state.lastValidationReport) == null ? void 0 : _b.matches.get(fieldId));
    if (!field || !match || match.notify) return;
    (_c = state.overlay) == null ? void 0 : _c.removeChip(fieldId);
    const outcome = await enqueueFill(() => fillOne(field, match, { userInitiated: true }));
    if (outcome === "failed") {
      getOverlay().toast("FlashFiller: couldn’t place that answer on this field — fill it manually once and I’ll learn it.");
      return;
    }
    if (outcome === "filled" && match.source.startsWith("qa:")) {
      const id = match.source.slice(3);
      state.userConfirmedEntries.add(id);
      const entry = (_d = state.store) == null ? void 0 : _d.qa.find((e) => e.id === id);
      if (entry && (entry.source === "captured" || entry.source === "inferred")) {
        const credit = state.strickenEntries.has(id) ? {} : { okCount: (entry.okCount ?? 0) + 1 };
        state.strickenEntries.add(id);
        void patchQA(id, {
          ...credit,
          ...entry.status === "needs_review" ? { status: "active", reviewNote: "", lastWrongAt: null, wrongCount: 0 } : {},
          updatedAt: Date.now()
        });
        void chrome.runtime.sendMessage({ type: "CAPTURE_COUNT_CHANGED" });
      } else if (entry && entry.status === "needs_review") {
        void patchQA(id, {
          status: "active",
          reviewNote: "",
          lastWrongAt: null,
          wrongCount: 0,
          updatedAt: Date.now()
        });
        void chrome.runtime.sendMessage({ type: "CAPTURE_COUNT_CHANGED" });
      }
    }
  }
  function captureGate(fieldId) {
    const store = state.store;
    if (!store || !store.settings.captureLoopEnabled || !state.activated) return null;
    if (state.capturePrompted.has(fieldId) || state.selfFilled.has(fieldId)) return null;
    const field = state.fields.get(fieldId);
    if (!field) return null;
    const { signal } = field;
    if (signal.consentLike || signal.eeoLike || signal.kind === "file" || signal.kind === "password")
      return null;
    const match = state.matches.get(fieldId);
    const unknown = !match || match.action === "ignore" || state.skipped.has(fieldId);
    return unknown ? field : null;
  }
  async function promptCapture(field, rawValue) {
    var _a;
    const store = state.store;
    if (!store) return;
    const { signal } = field;
    if (!rawValue || rawValue === ((_a = state.sessionAnswers.get(answerKey(signal))) == null ? void 0 : _a.value)) return;
    state.capturePrompted.add(signal.fieldId);
    const prepared = prepareCaptureValue(
      signal,
      rawValue,
      state.context,
      location.hostname,
      store.profile
    );
    if (isSkippedCapture(prepared)) {
      console.debug(
        "[FlashFiller] capture skipped:",
        prepared.skip,
        `— "${signal.label || signal.normalizedQuestion}"`
      );
      return;
    }
    const value = prepared.value;
    const fieldWording = signal.label || signal.normalizedQuestion;
    let similar = findSimilar(store.qa, prepared.question);
    if (similar && crossesEeoTopic(fieldWording, similar.entry.question)) similar = null;
    if (!similar) {
      const pool = store.qa.slice(0, 40);
      if (pool.length > 0) {
        const index = await askJudge({
          type: "SEMANTIC_MATCH_QUESTION",
          question: signal.label || signal.normalizedQuestion,
          candidates: pool.map((e) => e.question)
        });
        if (index !== null && pool[index] && !crossesEeoTopic(fieldWording, pool[index].question)) {
          const entry = pool[index];
          if (shouldSilentMerge(value, entry, state.context, location.hostname)) {
            const merged = mergeAsAlias(
              entry,
              signal.label || signal.normalizedQuestion,
              signal.options.map((o) => o.text)
            );
            if (merged !== entry) {
              void upsertQA(merged);
              void chrome.runtime.sendMessage({ type: "CAPTURE_COUNT_CHANGED" });
            }
            return;
          }
          similar = { entry, score: 0.87 };
        }
      }
    }
    getOverlay().showCapturePrompt(
      field.el,
      signal.label || signal.normalizedQuestion,
      (similar == null ? void 0 : similar.entry.question) ?? null,
      (choice) => {
        if (choice === "new") {
          void upsertQA(
            buildCaptureDraft(signal, value, state.context, Date.now(), {
              siteScope: prepared.siteScope,
              question: prepared.question,
              // hygiene-cleaned key (Stage 1)
              reviewNote: prepared.note || `Captured on ${location.hostname} — suggests until approved in Review`
            })
          );
          void chrome.runtime.sendMessage({ type: "CAPTURE_COUNT_CHANGED" });
        } else if (choice === "merge" && similar) {
          const merged = mergeAsAlias(
            similar.entry,
            signal.label || signal.normalizedQuestion,
            signal.options.map((o) => o.text)
          );
          if (similar.entry.answer.trim() !== value && !isContextBranded(value, state.context, location.hostname)) {
            void upsertQA({
              ...merged,
              answer: value,
              status: "needs_review",
              reviewNote: `Answer changed on ${location.hostname}: was "${similar.entry.answer}"`,
              updatedAt: Date.now()
            });
          } else {
            void upsertQA(merged);
          }
          void chrome.runtime.sendMessage({ type: "CAPTURE_COUNT_CHANGED" });
        }
      }
    );
  }
  function findRadioGroupField(radio) {
    var _a;
    for (const field of state.fields.values()) {
      if ((_a = field.groupEls) == null ? void 0 : _a.includes(radio)) return field;
    }
    return null;
  }
  function attachCaptureListeners() {
    document.addEventListener(
      "focusout",
      (event) => {
        const target = event.target;
        if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement))
          return;
        if (target instanceof HTMLInputElement && (target.type === "radio" || target.type === "checkbox"))
          return;
        if (target instanceof HTMLInputElement && target.type === "password") return;
        const fieldId = target.getAttribute("data-ff-id");
        if (!fieldId) return;
        const field = captureGate(fieldId);
        if (field) promptCapture(field, target.value.trim());
      },
      true
    );
    document.addEventListener(
      "change",
      (event) => {
        var _a, _b, _c;
        const target = event.target;
        if (!target) return;
        if (target instanceof HTMLSelectElement) {
          const fieldId = target.getAttribute("data-ff-id");
          if (!fieldId) return;
          const field = captureGate(fieldId);
          if (!field) return;
          const chosen = target.selectedIndex >= 0 ? target.options[target.selectedIndex] : null;
          const text = chosen ? chosen.text.trim() || chosen.value.trim() : "";
          promptCapture(field, text);
          return;
        }
        if (target instanceof HTMLInputElement && target.type === "radio") {
          if (!target.checked) return;
          const field = findRadioGroupField(target);
          if (!field || !captureGate(field.signal.fieldId)) return;
          const index = ((_a = field.groupEls) == null ? void 0 : _a.indexOf(target)) ?? -1;
          const text = ((_c = index >= 0 ? (_b = field.signal.options[index]) == null ? void 0 : _b.text : "") == null ? void 0 : _c.trim()) ?? "";
          if (!text || text === target.value && !/[a-z]{3,}/i.test(text) && classifyIntent(text) === "unknown") {
            console.debug(
              "[FlashFiller] capture skipped: radio option has no label text",
              `— "${field.signal.label || field.signal.normalizedQuestion}"`
            );
            state.capturePrompted.add(field.signal.fieldId);
            return;
          }
          promptCapture(field, text);
          return;
        }
        if (target instanceof HTMLInputElement && target.type === "checkbox") {
          const fieldId = target.getAttribute("data-ff-id");
          if (!fieldId) return;
          const field = captureGate(fieldId);
          if (field) promptCapture(field, target.checked ? "Yes" : "No");
        }
      },
      true
    );
  }
  function scheduleRescan(delay = 600) {
    if (state.scanTimer) clearTimeout(state.scanTimer);
    state.scanTimer = setTimeout(() => {
      state.scanTimer = 0;
      void scan();
    }, delay);
  }
  function observeChanges() {
    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((m) => {
        var _a;
        const target = m.target;
        return !((_a = target.closest) == null ? void 0 : _a.call(target, "[data-flashfiller]"));
      });
      if (relevant && state.activated && !state.dismissed) scheduleRescan();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-pressed"]
    });
    window.addEventListener("popstate", () => scheduleRescan(800));
    for (const method of ["pushState", "replaceState"]) {
      const original = history[method].bind(history);
      history[method] = ((...args) => {
        original(...args);
        scheduleRescan(800);
      });
    }
  }
  void init();
}
