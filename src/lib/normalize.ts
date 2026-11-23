// ---------------------------------------------------------------------------
// Text normalization + synonym expansion (Section 5).
// Everything the detector and matcher compare goes through normalize().
// ---------------------------------------------------------------------------

/** Phrase-level rewrites applied before tokenization (multi-word synonyms). */
const PHRASE_MAP: [RegExp, string][] = [
  [/\be[- ]?mail\b/g, 'email'],
  [/\bcell(?:ular)?\s*(?:phone|number|no)?\b/g, 'phone'],
  [/\bmobile\s*(?:phone|number|no)?\b/g, 'phone'],
  [/\btelephone\b/g, 'phone'],
  [/\bphone\s*(?:number|no)\b/g, 'phone'],
  [/\bzip\s*code\b/g, 'postal code'],
  [/\bzip\b/g, 'postal code'],
  [/\bsurname\b/g, 'last name'],
  [/\bfamily name\b/g, 'last name'],
  [/\bgiven name\b/g, 'first name'],
  [/\bforename\b/g, 'first name'],
  [/\bcurriculum vitae\b/g, 'resume'],
  [/\bcv\b/g, 'resume'],
  [/\bcompensation\b/g, 'salary'],
  [/\bremuneration\b/g, 'salary'],
  [/\bpay expectations?\b/g, 'salary expectation'],
  [/\borganisation\b/g, 'organization'],
  [/\bauthorisation\b/g, 'authorization'],
  [/\bauthorized\b/g, 'authorization'],
  [/\bauthorised\b/g, 'authorization'],
  [/\bwebsite url\b/g, 'website'],
  [/\bhome page\b/g, 'website'],
  [/\blinked[- ]?in\b/g, 'linkedin'],
  [/\bgit[- ]?hub\b/g, 'github'],
]

/** Token-level canonicalization applied after tokenization. */
const TOKEN_MAP: Record<string, string> = {
  emails: 'email',
  phones: 'phone',
  employer: 'company',
  employers: 'company',
  organizations: 'organization',
  companies: 'company',
  role: 'position',
  roles: 'position',
  job: 'position',
  title: 'position',
  urls: 'url',
  addr: 'address',
  st: 'state',
  nr: 'number',
  no: 'number',
  yrs: 'years',
  yr: 'years',
  years: 'years',
  exp: 'experience',
  pls: 'please',
  dob: 'birthdate',
}

/** Tokens that carry no matching signal. */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'is', 'are',
  'do', 'does', 'did', 'you', 'your', 'yours', 'we', 'our', 'us', 'please',
  'enter', 'provide', 'type', 'field', 'this', 'that', 'be', 'been', 'if',
  'any', 'have', 'has', 'would', 'will', 'with', 'at', 'as', 'by',
])

/** Lowercase, strip punctuation, apply phrase synonyms, collapse whitespace. */
export function normalize(text: string): string {
  let t = text.toLowerCase()
  for (const [re, replacement] of PHRASE_MAP) t = t.replace(re, replacement)
  t = t.replace(/[^\p{L}\p{N}\s]/gu, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/** Light suffix stemmer so "working" matches "work", "employers" "employer".
 *  Deliberately crude — just enough for form-question vocabulary. */
function stem(token: string): string {
  let t = token
  if (t.length > 5 && t.endsWith('ing')) t = t.slice(0, -3)
  else if (t.length > 4 && t.endsWith('ed')) t = t.slice(0, -2)
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is'))
    t = t.slice(0, -1)
  return t
}

/** TOKEN_MAP entries that are right for questions ("phone no.") but wrong for
 *  answers/options, where "No" is a polarity word, not an abbreviation. */
const ANSWER_AMBIGUOUS_TOKENS = new Set(['no'])

function tokenizeWith(text: string, skipMap: Set<string>): string[] {
  return normalize(text)
    .split(' ')
    .filter(Boolean)
    .map((t) => (skipMap.has(t) ? t : TOKEN_MAP[t] ?? t))
    .filter((t) => !STOPWORDS.has(t))
    .map(stem)
}

const NO_SKIPS = new Set<string>()

/** normalize() → tokens with canonicalization + stemming; stopwords kept out. */
export function tokenize(text: string): string[] {
  return tokenizeWith(text, NO_SKIPS)
}

/** tokenize() for answer/option text — keeps "no" a polarity word instead of
 *  mapping it to "number". Questions must keep using tokenize(). */
export function tokenizeAnswer(text: string): string[] {
  return tokenizeWith(text, ANSWER_AMBIGUOUS_TOKENS)
}

/** Tokens joined back — a canonical comparison string. */
export function canonical(text: string): string {
  return tokenize(text).join(' ')
}

/** canonical() for answer/option text (see tokenizeAnswer). */
export function canonicalAnswer(text: string): string {
  return tokenizeAnswer(text).join(' ')
}

/** Turn a name/id like "candidate_first_name" or "firstName" into words. */
export function humanizeIdentifier(identifier: string): string {
  return identifier
    .replace(/[[\]]/g, ' ')
    .replace(/[_\-.:]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}
