import { e as looksEeoLoose, l as lexicalScore, a as canonicalAnswer, d as lexicalAnswerScore } from "./eeo-C8X2VxtH.js";
function stripParentheticals(text) {
  let t = text;
  let prev;
  do {
    prev = t;
    t = t.replace(/\s*\([^)]*\)\s*$/, "");
  } while (t !== prev);
  t = t.replace(/\s*\([^)]*\)\s*/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t === "" ? text : t;
}
function prepare(text) {
  return stripParentheticals(text).toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}
const UNKNOWN_GUARDS = [
  /^[\d\s.,+/-]*$/,
  // empty or numeric-only ("0" must not read as negate)
  /\bnot?\s+applicable\b/,
  /^n\/?a\.?$/
];
const DECLINE_PATTERNS = [
  /\bdecline[ds]?\b/,
  // "Decline", "I decline", "Decline to self-identify"
  /\bprefers?\s+(?:not|to\s+not)\b/,
  /\b(?:do|does|did)(?:\s+not|n't)\s+(?:wish|want|care)\s+to\b/,
  /\b(?:choose|chose|elect|opt)s?\s+not\s+to\b/,
  /\bwish\s+not\s+to\b/,
  /\brather\s+not\b/,
  /\bopt\s+out\b/,
  /^no\s+(?:answer|response|comment)$/
];
const NEGATE_PATTERNS = [
  /^no\b/,
  // word boundary: "Norway"/"None…" don't match this one
  /^none\b/,
  // anywhere, not just leading: "I have never worked for Novonesis" must not
  // fall through to the "\bi\s+have\b" affirm pattern (company work-history
  // option sets phrase their No this way)
  /\bnever\b/,
  /^(?:n|false)$/,
  /\b(?:i\s+am|i'm)\s+not\b/,
  // "I AM NOT A PROTECTED VETERAN"
  /\b(?:do|does|did|have|has|had)(?:\s+not|n't)\b/,
  /\b(?:have|has)\s+no\b/,
  /\bnot\s+(?:a|an)\b/
];
const AFFIRM_PATTERNS = [
  /^yes\b/,
  /^(?:y|true)$/,
  /\b(?:i\s+am|i'm)\s+(?:a|an|one)\b/,
  // "I am a protected veteran"
  /\bi\s+identify\s+as\b/,
  /\bi\s+have\b/
];
function classifyIntent(text) {
  const t = prepare(text);
  if (UNKNOWN_GUARDS.some((re) => re.test(t))) return "unknown";
  if (DECLINE_PATTERNS.some((re) => re.test(t))) return "decline";
  if (NEGATE_PATTERNS.some((re) => re.test(t))) return "negate";
  if (AFFIRM_PATTERNS.some((re) => re.test(t))) return "affirm";
  return "unknown";
}
const PLAN_MAX_FIELDS = 40;
const PLAN_CONFIDENCE_FLOOR = 0.8;
const INFERENCE_FILL_FLOOR = 0.85;
const PLAN_FILL_CONFIDENCE = 0.86;
const PLAN_CANDIDATE_K = 24;
const isOngoing = (endDate) => !endDate.trim() || /\b(present|current|now|ongoing|today)\b/i.test(endDate);
function deriveLifeState(profile) {
  const current = profile.workHistory.find((w) => w.company.trim() && isOngoing(w.endDate));
  if (current) {
    return {
      currentlyEmployed: true,
      currentEmployer: current.company.trim(),
      lastEmployer: current.company.trim(),
      lastEndDate: null
    };
  }
  let last = null;
  for (const w of profile.workHistory) {
    if (!w.company.trim()) continue;
    if (!last || w.endDate > last.endDate) last = { company: w.company.trim(), endDate: w.endDate };
  }
  return {
    currentlyEmployed: false,
    currentEmployer: null,
    lastEmployer: (last == null ? void 0 : last.company) ?? null,
    lastEndDate: (last == null ? void 0 : last.endDate) || null
  };
}
function isCurrentEmployerQuestion(question) {
  if (!/\bemployer\b|\bcompany\b/i.test(question)) return false;
  if (/\b(previous|former|past|last|most recent|prior)\b/i.test(question)) return false;
  return /\b(current|present)\b/i.test(question);
}
const STANCES = [
  {
    topic: "military-service",
    answer: "no",
    note: 'No military service — always the "No"/"not a veteran"/"no military experience" option.'
  },
  {
    topic: "government-employment",
    answer: "no",
    note: "Never a government employee or official, past or present."
  },
  {
    topic: "social-security-income",
    answer: "no",
    note: "Does not receive social security benefits or income."
  },
  { topic: "non-compete", answer: "no", note: "Not bound by any non-compete or non-solicitation agreement." },
  { topic: "bondable", answer: "no", note: "Answer No to bondability questions." }
];
function classifyStanceTopic(question) {
  if (/\b(ssn|social security number)\b/i.test(question)) return null;
  if (/\b(military|armed forces|armed services|active duty|uniformed service\w*|veteran)\b/i.test(question))
    return "military-service";
  if (/\bgovernment (employee|employment|official|service|position)\b|\bemployed by (a |the )?(federal|state|local|any )?government\b/i.test(
    question
  ))
    return "government-employment";
  if (/\bsocial security (benefit|income|payment)/i.test(question) || /\b(receive|receiving|collect|collecting|drawing)\b[\s\S]{0,40}\bsocial security\b/i.test(question))
    return "social-security-income";
  if (/\bnon.?compete\b|\bnon.?solicit/i.test(question)) return "non-compete";
  if (/\bbondable\b/i.test(question)) return "bondable";
  return null;
}
function selectPlanTargets(report, eeoAnswerFor, max = PLAN_MAX_FIELDS) {
  const eligible = [];
  const skipped = [];
  for (const entry of report) {
    if (entry.verdict !== "missing-answerable" && entry.verdict !== "missing-unanswered") continue;
    if (entry.consentLike) {
      skipped.push({ entry, why: "consent" });
      continue;
    }
    if (entry.kind === "file") {
      skipped.push({ entry, why: "file" });
      continue;
    }
    if (entry.kind === "password") {
      skipped.push({ entry, why: "password" });
      continue;
    }
    if (entry.eeoLike && !eeoAnswerFor(entry)) {
      skipped.push({ entry, why: "eeo-unstored" });
      continue;
    }
    eligible.push(entry);
  }
  return {
    targets: eligible.slice(0, max),
    skipped,
    overflow: Math.max(0, eligible.length - max)
  };
}
function neighborLabels(signal, all, cap = 6) {
  const out = [];
  for (const other of all) {
    if (other.fieldId === signal.fieldId) continue;
    if (other.sectionContext !== signal.sectionContext) continue;
    if (other.sectionIndex !== signal.sectionIndex) continue;
    const label = other.label || other.normalizedQuestion;
    if (label && !out.includes(label)) out.push(label);
    if (out.length >= cap) break;
  }
  return out;
}
function censusEntry(v, signal, neighbors, currentValue) {
  const kind = (signal == null ? void 0 : signal.kind) ?? v.kind;
  const options = (signal ? signal.options.map((o) => o.text) : v.options).map((o) => o.trim()).filter(Boolean);
  return {
    fieldId: v.fieldId,
    label: (signal == null ? void 0 : signal.label) || v.label,
    normalizedQuestion: (signal == null ? void 0 : signal.normalizedQuestion) ?? v.normalizedQuestion,
    kind,
    required: (signal == null ? void 0 : signal.required) ?? v.required,
    sectionContext: (signal == null ? void 0 : signal.sectionContext) ?? v.sectionContext,
    sectionIndex: (signal == null ? void 0 : signal.sectionIndex) ?? v.sectionIndex,
    sectionKind: signal == null ? void 0 : signal.sectionKind,
    eeoLike: (signal == null ? void 0 : signal.eeoLike) ?? v.eeoLike,
    neighborLabels: neighbors,
    optionsVisible: options.slice(0, 60),
    // Custom dropdowns usually expose nothing until their popup opens — an
    // empty or partial list must not let the option-membership guard reject
    // legitimate picks the fill-time walk would land.
    optionsComplete: options.length > 0 && kind !== "custom-dropdown",
    currentValue
  };
}
const FACTS_DESCRIPTION_CHARS = 320;
const trimDescription = (text) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= FACTS_DESCRIPTION_CHARS ? t : `${t.slice(0, FACTS_DESCRIPTION_CHARS).trimEnd()}…`;
};
function buildProfileFacts(profile) {
  return {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    address: { ...profile.address },
    links: { ...profile.links },
    accountEmail: profile.accountEmail,
    earliestStartDate: profile.earliestStartDate,
    workAuthorization: profile.workAuthorization,
    authorizedToWork: profile.authorizedToWork ? "Yes" : "No",
    requiresSponsorship: profile.requiresSponsorship ? "Yes" : "No",
    previouslyEmployedHere: profile.previouslyEmployedHere ? "Yes" : "No",
    willingToRelocate: profile.willingToRelocate ? "Yes" : "No",
    noticePeriod: profile.noticePeriod,
    desiredSalary: profile.desiredSalary,
    workHistory: profile.workHistory.map((w) => ({
      company: w.company,
      title: w.title,
      startDate: w.startDate,
      endDate: w.endDate,
      location: w.location,
      description: trimDescription(w.description)
    })),
    education: profile.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      startDate: e.startDate,
      endDate: e.endDate
    }))
  };
}
function buildEeoStored(profile, qa) {
  const out = {};
  const eeo = profile.eeo;
  if (eeo.gender.trim()) out.gender = eeo.gender.trim();
  if (eeo.ethnicity.trim()) out.ethnicity = eeo.ethnicity.trim();
  if (eeo.veteranStatus.trim()) out.veteranStatus = eeo.veteranStatus.trim();
  if (eeo.disabilityStatus.trim()) out.disabilityStatus = eeo.disabilityStatus.trim();
  if (profile.pronouns.trim()) out.pronouns = profile.pronouns.trim();
  for (const entry of qa) {
    if (entry.status !== "active") continue;
    const answer = entry.answer.trim();
    if (!answer || answer.includes("{{")) continue;
    if (!looksEeoLoose(entry.question)) continue;
    out[entry.question.trim().toLowerCase()] = answer;
  }
  return out;
}
const PROFILE_EEO_KEYS = /* @__PURE__ */ new Set([
  "gender",
  "ethnicity",
  "veteranStatus",
  "disabilityStatus",
  "pronouns",
  "sexualOrientation"
]);
const EEO_KEY_TOPICS = [
  // Order matters: "sexual orientation" must resolve before the gender/sex test.
  { key: "sexualOrientation", re: /sexual orientation|lgbtq/i },
  { key: "gender", re: /\bgender\b|\bsex\b/i },
  { key: "ethnicity", re: /\brace\b|\braces\b|racial|ethnic|hispanic|latino|latinx/i },
  { key: "veteranStatus", re: /veteran/i },
  { key: "disabilityStatus", re: /disabilit/i },
  { key: "pronouns", re: /pronoun/i }
];
function eeoStoredAnswerFor(question, eeoStored) {
  for (const { key, re } of EEO_KEY_TOPICS) {
    if (!re.test(question)) continue;
    if (eeoStored[key]) return eeoStored[key];
    break;
  }
  let best = null;
  for (const [key, value] of Object.entries(eeoStored)) {
    if (!value || PROFILE_EEO_KEYS.has(key)) continue;
    const score = Math.max(lexicalScore(question, key), valueContainsWord(question, key) ? 0.6 : 0);
    if (score >= 0.5 && (!best || score > best.score)) best = { value, score };
  }
  return (best == null ? void 0 : best.value) ?? null;
}
function selectRelevantQA(qa, questions, hostname, k = PLAN_CANDIDATE_K) {
  const scored = [];
  for (const entry of qa) {
    if (entry.status !== "active") continue;
    if (entry.answerType === "notify") continue;
    if (looksEeoLoose(entry.question)) continue;
    if (entry.siteScope && !hostname.endsWith(entry.siteScope)) continue;
    const texts = [entry.question, ...entry.aliases];
    let best = 0;
    for (const q of questions) {
      for (const t of texts) {
        const s = lexicalScore(q, t);
        if (s > best) best = s;
      }
    }
    if (best >= 0.12) scored.push({ entry, score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.entry);
}
const escapeRe = (text) => text.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function valueContainsWord(haystack, needle) {
  const n = needle.trim();
  if (!n) return false;
  try {
    return new RegExp(`\\b${escapeRe(n)}\\b`, "i").test(haystack);
  } catch {
    return false;
  }
}
function looseValueMatch(source, planned) {
  const s = source.trim();
  const p = planned.trim();
  if (!s || !p) return false;
  const sc = canonicalAnswer(s);
  if (sc !== "" && sc === canonicalAnswer(p)) return true;
  if (valueContainsWord(p, s) || valueContainsWord(s, p)) return true;
  const si = classifyIntent(s);
  const pi = classifyIntent(p);
  if (si !== "unknown" && pi !== "unknown") return si === pi;
  return lexicalAnswerScore(s, p) >= 0.6;
}
function eeoValueMatches(stored, planned) {
  const s = stored.trim();
  const p = planned.trim();
  if (!s || !p) return false;
  if (canonicalAnswer(s) !== "" && canonicalAnswer(s) === canonicalAnswer(p)) return true;
  const negated = new RegExp(`\\b(?:not|non|no)[-\\s]+${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (negated.test(p)) return false;
  if (valueContainsWord(stripParentheticals(p), s)) return true;
  const si = classifyIntent(s);
  const pi = classifyIntent(p);
  if (si !== "unknown" && pi !== "unknown") return si === pi;
  return false;
}
const ACTION_ALIASES = {
  fill: "fill",
  type: "fill",
  select: "fill",
  check: "fill",
  autofill: "fill",
  suggest: "suggest",
  draft: "suggest",
  skip: "skip",
  needs_human: "needs_human",
  "needs-human": "needs_human",
  needshuman: "needs_human",
  human: "needs_human"
};
function extractPlanJson(raw) {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const objStart = text.indexOf("{");
  const arrStart = text.indexOf("[");
  let candidate = null;
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    candidate = text.slice(objStart, text.lastIndexOf("}") + 1);
  } else if (arrStart >= 0) {
    candidate = text.slice(arrStart, text.lastIndexOf("]") + 1);
  }
  if (!candidate) return null;
  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.fills) ? parsed.fills : null;
  if (!list) return null;
  const out = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const r = item;
    const fieldId = typeof r.fieldId === "string" && r.fieldId ? r.fieldId : typeof r.field_id === "string" && r.field_id ? r.field_id : null;
    if (!fieldId) continue;
    const action = ACTION_ALIASES[String(r.action ?? "").trim().toLowerCase()];
    if (!action) continue;
    const value = r.value === void 0 || r.value === null ? void 0 : String(r.value);
    const source = typeof r.source === "string" && r.source.trim() ? r.source.trim() : void 0;
    const reason = typeof r.reason === "string" ? r.reason : void 0;
    const confRaw = typeof r.confidence === "number" ? r.confidence : typeof r.confidence === "string" ? Number.parseFloat(r.confidence) : void 0;
    const confidence = confRaw !== void 0 && Number.isFinite(confRaw) ? Math.max(0, Math.min(1, confRaw)) : void 0;
    out.push({ fieldId, action, value, source, reason, confidence });
  }
  return out.length > 0 ? out : null;
}
function dotPath(obj, path) {
  let cur = obj;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return void 0;
    cur = cur[part];
  }
  return cur;
}
function resolveSource(source, brief) {
  if (source === "draft") return { values: [], kind: "draft" };
  if (source === "inference") return { values: [], kind: "inference" };
  if (source === "policy:current-employer" || source === "policy:current-employer-unemployed")
    return { values: ["N/A"], kind: "policy" };
  if (source.startsWith("profile:")) {
    const path = source.slice("profile:".length).replace(/^profileFacts\./, "").replace(/^profile\./, "");
    const value = dotPath(brief.profileFacts, path);
    if (value === void 0 || value === null || typeof value === "object") return null;
    const text = String(value).trim();
    return text ? { values: [text], kind: "profile" } : null;
  }
  if (source.startsWith("qa:")) {
    const id = source.slice(3);
    const candidate = brief.candidates.find((c) => c.id === id);
    if (!candidate) return null;
    return { values: [candidate.answer, ...candidate.fallbacks ?? []], kind: "qa", qaId: id };
  }
  if (source.startsWith("eeo:")) {
    const key = source.slice(4);
    const value = brief.eeoStored[key] ?? brief.eeoStored[key.toLowerCase()];
    return value ? { values: [value], kind: "eeo" } : null;
  }
  if (source.startsWith("stance:")) {
    const topic = source.slice("stance:".length);
    const stance = brief.stances.find((s) => s.topic === topic);
    return stance ? { values: [stance.answer], kind: "stance" } : null;
  }
  if (source === "context:company")
    return brief.page.company ? { values: [brief.page.company], kind: "context" } : null;
  if (source === "context:role")
    return brief.page.role ? { values: [brief.page.role], kind: "context" } : null;
  return null;
}
const NONE_ANSWER_RE = /\bnot applicable\b|\bnone\b|\bunemployed\b|\bno current employer\b/i;
const isNoneAnswer = (value) => /^n\s*\/?\s*a\b/i.test(value.trim()) || NONE_ANSWER_RE.test(value);
const PLACEHOLDER_OPTION_RE = /^(please )?(select|choose|pick)\b|^--|^—+$|^\.{3}$|^…$/i;
const isPlaceholderOption = (option) => PLACEHOLDER_OPTION_RE.test(option.trim());
function validatePlan(entries, brief) {
  var _a, _b;
  const accepted = [];
  const rejected = [];
  const fieldById = new Map(brief.fields.map((f) => [f.fieldId, f]));
  const seen = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    const field = fieldById.get(entry.fieldId);
    if (!field) {
      rejected.push({ entry, why: "unknown fieldId" });
      continue;
    }
    if (seen.has(entry.fieldId)) {
      rejected.push({ entry, why: "duplicate fieldId" });
      continue;
    }
    seen.add(entry.fieldId);
    if (entry.action === "skip" || entry.action === "needs_human") {
      accepted.push({ entry, demoted: false, sourceKind: null, fallbacks: [] });
      continue;
    }
    const value = ((_a = entry.value) == null ? void 0 : _a.trim()) ?? "";
    if (!value) {
      rejected.push({ entry, why: "no value" });
      continue;
    }
    if (/\{\{[\w.\s]+\}\}/.test(value)) {
      rejected.push({ entry, why: "unresolved template braces" });
      continue;
    }
    if (!entry.source) {
      rejected.push({ entry, why: "no source cited" });
      continue;
    }
    const resolved = resolveSource(entry.source, brief);
    if (!resolved) {
      rejected.push({ entry, why: `source "${entry.source}" resolves to nothing` });
      continue;
    }
    const question = field.label || field.normalizedQuestion;
    if (field.eeoLike) {
      if (resolved.kind !== "eeo") {
        rejected.push({ entry, why: "EEO field requires an eeo:<key> source" });
        continue;
      }
      if (!eeoValueMatches(resolved.values[0], value)) {
        rejected.push({ entry, why: `EEO value does not match stored "${resolved.values[0]}"` });
        continue;
      }
    } else if (resolved.kind === "eeo") {
      rejected.push({ entry, why: "eeo source cited for a non-EEO field" });
      continue;
    } else if (resolved.kind === "stance") {
      const topic = classifyStanceTopic(question);
      const cited = entry.source.slice("stance:".length);
      if (topic !== cited) {
        rejected.push({ entry, why: `field is not a ${cited} question` });
        continue;
      }
      const stance = brief.stances.find((s) => s.topic === topic);
      const want = (stance == null ? void 0 : stance.answer) === "yes" ? "affirm" : "negate";
      if (classifyIntent(value) !== want) {
        rejected.push({ entry, why: `value does not express the ${(stance == null ? void 0 : stance.answer) ?? "stored"} stance` });
        continue;
      }
    } else if (resolved.kind === "policy") {
      if (!isNoneAnswer(value)) {
        rejected.push({ entry, why: "current-employer policy requires an N/A-style value" });
        continue;
      }
    } else if (resolved.kind === "inference") {
      if (!((_b = entry.reason) == null ? void 0 : _b.trim())) {
        rejected.push({ entry, why: "inference requires its reasoning" });
        continue;
      }
    } else if (resolved.kind !== "draft") {
      const traced = resolved.values.some((v) => looseValueMatch(v, value));
      if (!traced) {
        rejected.push({ entry, why: `value does not trace to ${entry.source}` });
        continue;
      }
    }
    if (!field.eeoLike && resolved.kind !== "stance") {
      const topic = classifyStanceTopic(question);
      if (topic) {
        const stance = STANCES.find((s) => s.topic === topic);
        const want = (stance == null ? void 0 : stance.answer) === "yes" ? "affirm" : "negate";
        const intent = classifyIntent(value);
        if (intent !== "unknown" && intent !== want) {
          rejected.push({ entry, why: `contradicts the ${topic} stance` });
          continue;
        }
      }
    }
    if (!brief.lifeState.currentlyEmployed && field.sectionKind === void 0 && isCurrentEmployerQuestion(question) && resolved.kind !== "policy" && !isNoneAnswer(value)) {
      rejected.push({ entry, why: "current employer while unemployed must be N/A" });
      continue;
    }
    let matchedOption;
    if (field.optionsComplete && field.optionsVisible.length > 0) {
      const cv = canonicalAnswer(value);
      matchedOption = field.optionsVisible.find((o) => o.trim() === value.trim()) ?? (cv ? field.optionsVisible.find((o) => canonicalAnswer(o) === cv) : void 0) ?? field.optionsVisible.find(
        (o) => field.eeoLike ? eeoValueMatches(value, o) || looseValueMatch(o, value) : looseValueMatch(o, value)
      );
      if (!matchedOption) {
        rejected.push({ entry, why: "value matches no visible option" });
        continue;
      }
      if (isPlaceholderOption(matchedOption)) {
        rejected.push({ entry, why: "placeholder option" });
        continue;
      }
    }
    let demoted = entry.action === "suggest";
    if (entry.action === "fill") {
      if (resolved.kind === "draft") demoted = true;
      if ((entry.confidence ?? PLAN_FILL_CONFIDENCE) < PLAN_CONFIDENCE_FLOOR) demoted = true;
      if (resolved.kind === "inference" && (entry.confidence ?? 0) < INFERENCE_FILL_FLOOR)
        demoted = true;
      if (field.kind === "textarea" && resolved.kind !== "qa") demoted = true;
    }
    accepted.push({
      entry,
      demoted,
      sourceKind: resolved.kind,
      qaId: resolved.qaId,
      matchedOption,
      fallbacks: resolved.kind === "qa" ? resolved.values.slice(1) : []
    });
  }
  return { accepted, rejected };
}
function planEntryToMatch(decision, signal) {
  const { entry } = decision;
  const planned = entry.value ?? "";
  let raw = planned;
  let chosenOptionValue;
  if (decision.matchedOption) {
    raw = decision.matchedOption;
    if (signal.kind === "select") {
      const opt = signal.options.find((o) => o.text.trim() === decision.matchedOption);
      chosenOptionValue = opt ? opt.value || opt.text : void 0;
    }
  }
  const learns = decision.sourceKind !== "qa" && decision.sourceKind !== "eeo" && !signal.eeoLike;
  return {
    fieldId: signal.fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: raw,
    confidence: entry.confidence ?? PLAN_FILL_CONFIDENCE,
    source: decision.qaId ? `qa:${decision.qaId}` : "profile",
    unresolvedVars: [],
    chosenOptionValue,
    action: decision.demoted ? "suggest" : "autofill",
    needsReview: false,
    composite: false,
    ...decision.fallbacks.length > 0 ? { answerFallbacks: decision.fallbacks } : {},
    // Planner answers with no stored backing learn like judge inferences
    // (persistLearning applies its own EEO/section gates on top).
    ...learns ? { provenance: "inferred" } : {}
  };
}
function buildRepairItems(report, attemptedValues, optionsOf) {
  const items = [];
  for (const v of report) {
    const attempted = attemptedValues.get(v.fieldId);
    if (attempted === void 0) continue;
    if (v.verdict !== "wrong" && v.verdict !== "missing-answerable") continue;
    items.push({
      fieldId: v.fieldId,
      label: v.label,
      attempted,
      observed: v.actual ?? "",
      optionsVisible: optionsOf(v.fieldId).slice(0, 60)
    });
  }
  return items;
}
const PLANNER_SYSTEM_PROMPT = `You are FlashFiller's filling planner for ONE job-application page. You receive a structured brief: unresolved form fields (with section context, neighbor labels, visible options), the applicant's profile facts (work history with what they actually did), derived life-state, non-negotiable topic stances, stored EEO/demographic values, saved answer candidates, and a job-posting excerpt when one was found.

Reply with ONLY JSON, no prose: {"fills":[{"fieldId":"…","action":"fill|suggest|skip|needs_human","value":"…","source":"…","reason":"…","confidence":0.0}]}

Rules — the executor enforces every one of these in code; violating entries are dropped:
1. One entry per brief field, using its exact fieldId. Cover EVERY field in the brief.
2. Every "fill" MUST cite its source: "profile:<dot.path>" (a path into profileFacts, e.g. profile:workHistory.0.title), "qa:<id>" (a candidate), "eeo:<key>" (a stored EEO value), "stance:<topic>", "policy:current-employer", "context:company", "context:role", "inference" (an answer you DERIVED — rule 9), or "draft" (composed free text — becomes a suggestion for human review). Traceable sources are always preferred over "inference" when both could answer.
3. STUDY THE SECTION before answering. A "Title" beside First/Last Name with options like Mr./Ms./Dr. is a courtesy designation; a "Title" inside a work-history section is that job's position title (profile:workHistory.<sectionIndex>.title). Neighbor labels and sectionKind tell you which world you are in.
4. lifeState.currentlyEmployed=false → any current/present-employer field gets exactly "N/A" with source "policy:current-employer" — NEVER a past employer. Past-employer and work-history fields keep using real history.
5. EEO/demographic fields (eeoLike=true): place the stored value onto the option wording that means the same thing. A composite option containing the stored value with consistent qualifiers IS the stored value ("Asian (Not Hispanic or Latino)" for stored "Asian"; the long "No, I do not have a disability…" wording for stored "No"). Never pick an option that would change the stored value. Nothing stored for the topic → needs_human.
6. Topic stances are non-negotiable. Classify the question into its topic and answer with the option expressing the stance — you never decide a stance yourself.
7. When optionsVisible is non-empty, "value" must be copied VERBATIM from it (the closest-meaning real option). Placeholder rows ("Select One", "--") are never valid. When optionsComplete=false the widget's list is unknown — give the answer text and the executor will place it.
8. Free-text essays and motivation questions → action "suggest" with source "draft": first person, concise, ONLY facts from the brief. Never invent employers, dates, numbers, skills, or biography.
9. THE INFERENCE LANE — this is where you earn your keep. "Additional questions" that match no stored answer are usually still DERIVABLE from the dossier: years of experience with a skill or domain (compute from work history + descriptions), tools/processes used (from descriptions), "how did you hear about this position" (a sensible channel like LinkedIn/company website), willingness and logistics questions (consistent with stated relocation/start-date/salary facts), proficiency self-ratings (supported by the history, modest when thin), work-environment questions grounded in the job-posting excerpt. Answer these with source "inference": value + a ONE-LINE reason citing which facts you reasoned from + honest confidence. What "inference" may NEVER do: fabricate credentials, licenses, certifications, clearances, references, employers, dates, or numbers with no basis; answer legal-history, background-check, or personal-judgment questions (those are needs_human); touch EEO/demographic fields (stored values only); contradict a stance or the current-employer policy.
10. A field you cannot answer even by rule 9 → "needs_human" with a short reason. Skips need reasons too.
11. Salary numeric fields: digits only, derived from profileFacts.desiredSalary (use the minimum of a range).

confidence is your honest probability that this fill is what the applicant would enter (below 0.8 the executor demotes to a suggestion; "inference" fills need 0.85 and always demote without an explicit confidence). This tool fills forms; it never submits them — a human reviews everything.`;
function plannerUserPrompt(brief, repair) {
  const parts = [`BRIEF:
${JSON.stringify(brief, null, 1)}`];
  if (repair) {
    parts.push(
      `REPAIR_EVIDENCE — your previous plan was executed; these fields FAILED. Each shows what was attempted, what the page displays now, and the options visible now:
${JSON.stringify(repair.items, null, 1)}`
    );
    parts.push(`YOUR_PREVIOUS_PLAN:
${JSON.stringify(repair.previous)}`);
    parts.push(
      "Return corrected entries for ONLY the fieldIds in REPAIR_EVIDENCE. When optionsVisible is non-empty, copy the chosen option text EXACTLY. A field you cannot correct → needs_human with the reason."
    );
  }
  return parts.join("\n\n");
}
export {
  PLANNER_SYSTEM_PROMPT as P,
  STANCES as S,
  selectPlanTargets as a,
  buildEeoStored as b,
  classifyIntent as c,
  censusEntry as d,
  eeoStoredAnswerFor as e,
  selectRelevantQA as f,
  deriveLifeState as g,
  buildProfileFacts as h,
  extractPlanJson as i,
  buildRepairItems as j,
  planEntryToMatch as k,
  neighborLabels as n,
  plannerUserPrompt as p,
  stripParentheticals as s,
  validatePlan as v
};
