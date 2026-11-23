const PHRASE_MAP = [
  [/\be[- ]?mail\b/g, "email"],
  [/\bcell(?:ular)?\s*(?:phone|number|no)?\b/g, "phone"],
  [/\bmobile\s*(?:phone|number|no)?\b/g, "phone"],
  [/\btelephone\b/g, "phone"],
  [/\bphone\s*(?:number|no)\b/g, "phone"],
  [/\bzip\s*code\b/g, "postal code"],
  [/\bzip\b/g, "postal code"],
  [/\bsurname\b/g, "last name"],
  [/\bfamily name\b/g, "last name"],
  [/\bgiven name\b/g, "first name"],
  [/\bforename\b/g, "first name"],
  [/\bcurriculum vitae\b/g, "resume"],
  [/\bcv\b/g, "resume"],
  [/\bcompensation\b/g, "salary"],
  [/\bremuneration\b/g, "salary"],
  [/\bpay expectations?\b/g, "salary expectation"],
  [/\borganisation\b/g, "organization"],
  [/\bauthorisation\b/g, "authorization"],
  [/\bauthorized\b/g, "authorization"],
  [/\bauthorised\b/g, "authorization"],
  [/\bwebsite url\b/g, "website"],
  [/\bhome page\b/g, "website"],
  [/\blinked[- ]?in\b/g, "linkedin"],
  [/\bgit[- ]?hub\b/g, "github"]
];
const TOKEN_MAP = {
  emails: "email",
  phones: "phone",
  employer: "company",
  employers: "company",
  organizations: "organization",
  companies: "company",
  role: "position",
  roles: "position",
  job: "position",
  title: "position",
  urls: "url",
  addr: "address",
  st: "state",
  nr: "number",
  no: "number",
  yrs: "years",
  yr: "years",
  years: "years",
  exp: "experience",
  pls: "please",
  dob: "birthdate"
};
const STOPWORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "in",
  "on",
  "for",
  "and",
  "or",
  "is",
  "are",
  "do",
  "does",
  "did",
  "you",
  "your",
  "yours",
  "we",
  "our",
  "us",
  "please",
  "enter",
  "provide",
  "type",
  "field",
  "this",
  "that",
  "be",
  "been",
  "if",
  "any",
  "have",
  "has",
  "would",
  "will",
  "with",
  "at",
  "as",
  "by"
]);
function normalize(text) {
  let t = text.toLowerCase();
  for (const [re, replacement] of PHRASE_MAP) t = t.replace(re, replacement);
  t = t.replace(/[^\p{L}\p{N}\s]/gu, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}
function stem(token) {
  let t = token;
  if (t.length > 5 && t.endsWith("ing")) t = t.slice(0, -3);
  else if (t.length > 4 && t.endsWith("ed")) t = t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") && !t.endsWith("us") && !t.endsWith("is"))
    t = t.slice(0, -1);
  return t;
}
const ANSWER_AMBIGUOUS_TOKENS = /* @__PURE__ */ new Set(["no"]);
function tokenizeWith(text, skipMap) {
  return normalize(text).split(" ").filter(Boolean).map((t) => skipMap.has(t) ? t : TOKEN_MAP[t] ?? t).filter((t) => !STOPWORDS.has(t)).map(stem);
}
const NO_SKIPS = /* @__PURE__ */ new Set();
function tokenize(text) {
  return tokenizeWith(text, NO_SKIPS);
}
function tokenizeAnswer(text) {
  return tokenizeWith(text, ANSWER_AMBIGUOUS_TOKENS);
}
function canonical(text) {
  return tokenize(text).join(" ");
}
function canonicalAnswer(text) {
  return tokenizeAnswer(text).join(" ");
}
function humanizeIdentifier(identifier) {
  return identifier.replace(/[[\]]/g, " ").replace(/[_\-.:]+/g, " ").replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
}
function termFrequencies(tokens) {
  const tf = /* @__PURE__ */ new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}
function tokenCosine(a, b, toTokens = tokenize) {
  const ta = termFrequencies(toTokens(a));
  const tb = termFrequencies(toTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let dot = 0;
  for (const [term, count] of ta) {
    const other = tb.get(term);
    if (other) dot += count * other;
  }
  const magnitude = (tf) => Math.sqrt([...tf.values()].reduce((sum, c) => sum + c * c, 0));
  const denom = magnitude(ta) * magnitude(tb);
  return denom === 0 ? 0 : dot / denom;
}
function bigrams(text) {
  const grams = /* @__PURE__ */ new Map();
  const s = text.replace(/\s+/g, " ");
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  return grams;
}
function diceBigrams(a, b, toCanonical = canonical) {
  const ca = toCanonical(a);
  const cb = toCanonical(b);
  if (!ca || !cb) return 0;
  if (ca === cb) return 1;
  const ga = bigrams(ca);
  const gb = bigrams(cb);
  let overlap = 0;
  let sizeA = 0;
  let sizeB = 0;
  for (const c of ga.values()) sizeA += c;
  for (const c of gb.values()) sizeB += c;
  if (sizeA === 0 || sizeB === 0) return 0;
  for (const [g, c] of ga) {
    const other = gb.get(g);
    if (other) overlap += Math.min(c, other);
  }
  return 2 * overlap / (sizeA + sizeB);
}
const COSINE_WEIGHT = 0.6;
const DICE_WEIGHT = 0.4;
function lexicalScore(a, b) {
  const score = COSINE_WEIGHT * tokenCosine(a, b) + DICE_WEIGHT * diceBigrams(a, b);
  return Math.min(1, Math.max(0, score));
}
function lexicalAnswerScore(a, b) {
  const score = COSINE_WEIGHT * tokenCosine(a, b, tokenizeAnswer) + DICE_WEIGHT * diceBigrams(a, b, canonicalAnswer);
  return Math.min(1, Math.max(0, score));
}
const EEO_TOPIC_RE = /\b(gender|races?|racial|ethnicit\w*|veteran|disabilit\w*|sexual orientation|transgender|lgbtq?\+?|demographic|hispanic|latino|latinx)\b/i;
function crossesEeoTopic(a, b) {
  return EEO_TOPIC_RE.test(a) !== EEO_TOPIC_RE.test(b);
}
const EEO_COMPACT_RE = /(gender|racial|ethnicit|veteran|disabilit|sexualorientation|transgender|lgbtq|hispanic|latino|latinx)/i;
function looksEeoLoose(text) {
  if (EEO_TOPIC_RE.test(text)) return true;
  return EEO_COMPACT_RE.test(text.replace(/[^a-z]/gi, ""));
}
export {
  EEO_TOPIC_RE as E,
  canonicalAnswer as a,
  crossesEeoTopic as b,
  canonical as c,
  lexicalAnswerScore as d,
  looksEeoLoose as e,
  humanizeIdentifier as h,
  lexicalScore as l,
  normalize as n,
  tokenizeAnswer as t
};
