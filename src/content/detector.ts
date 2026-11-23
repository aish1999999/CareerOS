import type { FieldKind, FieldOption, SignalBundle } from '@/types'
import { canonical, humanizeIdentifier, normalize } from '@/lib/normalize'
import { EEO_TOPIC_RE } from '@/lib/eeo'

// ---------------------------------------------------------------------------
// Field detector (Section 5). Pure: reads the DOM, never writes it — except
// stamping a data-ff-id so later stages can reference elements stably.
// ---------------------------------------------------------------------------

export interface DetectedField {
  el: HTMLElement
  /** For radio groups: every input in the group. */
  groupEls?: HTMLInputElement[]
  /** For pill groups (kind 'radio' semantically, zero native inputs): the
   *  toggle BUTTONS. Selection is a click; state is aria-pressed — Oracle CX
   *  renders every questionnaire yes/no + frequency question this way. */
  pillEls?: HTMLElement[]
  /** For segmented date widgets (Workday MM/DD/YYYY): the per-part inputs. */
  dateSegmentEls?: DateSegmentEls
  /** For file inputs: the associated drop zone / upload widget — label
   *  source, synthetic-drop target, and where the site renders the uploaded
   *  file's name chip. */
  uploadZoneEl?: HTMLElement
  signal: SignalBundle
}

export interface DateSegmentEls {
  month?: HTMLInputElement
  day?: HTMLInputElement
  year?: HTMLInputElement
}

const FF_ID_ATTR = 'data-ff-id'
let idCounter = 0

const MULTIPLICITY_RE =
  /\b(list|each|all of|last \d+|previous (?:employers?|positions?|roles?)|employers?|employment history|work history|education history|references)\b/i

const CONSENT_RE =
  /\b(agree|consent|certify|acknowledge|accept|terms|privacy policy|authorize .* (?:contact|background)|signature)\b/i

/** The ONE consent class the user chose to auto-tick: certifying the
 *  application is truthful, and acknowledging at-will employment.
 *  Deliberately conservative — anything ambiguous (data sharing, SMS, GDPR,
 *  background/credit checks) stays a chip the user clicks. */
const CERTIFICATION_RE =
  /\bcertify\b.{0,80}\b(true|accurate|correct|complete)|\b(true|accurate|correct)\b.{0,40}\b(information|answers|statements)|\bat.?will\b|\backnowledg\w+\b.{0,60}\bat.?will\b/i

// Shared with capture/matcher (lib/eeo.ts) so the field flag and the
// merge/rank guards can never drift apart. Includes hispanic/latino —
// missing from the original list, which let a "Hispanic or Latino?*"
// listbox capture slip through the EEO gate (live store, 2026-07-16).
const EEO_RE = EEO_TOPIC_RE

const SEARCH_RE = /\b(search|filter)\b/i

/** Page chrome that never contains application-form fields. Semantic
 *  containers plus known Workday chrome automation-ids (the header language
 *  selector is a button[aria-haspopup="listbox"] — a perfect decoy). */
const SITE_CHROME_SELECTOR =
  'header, footer, nav, [role="banner"], [role="navigation"], [role="menubar"], ' +
  '[role="contentinfo"], [data-automation-id*="languageSelector"], ' +
  '[data-automation-id="globalHeader"], [data-automation-id="header"], ' +
  '[data-automation-id="utilityButtonBar"]'

// ---- Visibility / skip rules ------------------------------------------------

/**
 * Honeypot & visibility heuristics. Deliberately avoids getBoundingClientRect
 * so the detector stays testable under jsdom (where all rects are 0×0); the
 * signals below catch the common honeypot patterns.
 */
function isHiddenOrHoneypot(el: HTMLElement): boolean {
  if (el.closest('[hidden], [aria-hidden="true"]')) return true
  let node: HTMLElement | null = el
  while (node) {
    const style = node.style
    if (style.display === 'none' || style.visibility === 'hidden') return true
    if (typeof getComputedStyle === 'function') {
      const computed = getComputedStyle(node)
      if (computed.display === 'none' || computed.visibility === 'hidden') return true
    }
    // Off-screen or zero-size positioning — classic honeypot
    if (
      parseInt(style.left || '0', 10) < -999 ||
      parseInt(style.top || '0', 10) < -999 ||
      style.opacity === '0'
    )
      return true
    node = node.parentElement
  }
  const width = el.getAttribute('width')
  const height = el.getAttribute('height')
  if ((width === '0' || height === '0') && el.tagName === 'INPUT') return true
  return false
}

/** Just the off-screen-position part of the honeypot heuristics — the one
 *  veto that still applies to legitimately-hidden file inputs. Opacity is
 *  deliberately NOT here: `opacity:0` over the styled button is a common way
 *  to build a real uploader. */
function isOffscreenPositioned(el: HTMLElement): boolean {
  let node: HTMLElement | null = el
  while (node) {
    const style = node.style
    if (parseInt(style.left || '0', 10) < -999 || parseInt(style.top || '0', 10) < -999) return true
    node = node.parentElement
  }
  return false
}

function isSkippableInput(el: HTMLInputElement): boolean {
  const type = (el.type || 'text').toLowerCase()
  if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) return true
  if (el.disabled) return true
  // An input that IS the dropdown trigger survives the plain-input vetoes:
  // Oracle cx-select renders its combobox input readonly when non-searchable
  // and type=search (or name*="search") when searchable — vetoing it deletes
  // the whole widget, because the companion toggle button dedups against the
  // DOM's combobox, not against detected fields.
  const isComboTrigger =
    el.getAttribute('role') === 'combobox' ||
    el.hasAttribute('aria-haspopup') ||
    hasComboboxSignals(el) // Stage 1: aria-autocomplete/expanded/controls tells
  if (el.readOnly && !isComboTrigger) return true
  // A multiselect container's inner input is the FIELD, even though it is a
  // search box by every other signal (type/name/role) — never skip it.
  if (el.closest(MULTISELECT_CONTAINER_SELECTOR)) return false
  if (isComboTrigger) return false
  if (type === 'search') return true
  if (SEARCH_RE.test(el.name) || SEARCH_RE.test(el.id) || el.getAttribute('role') === 'searchbox')
    return true
  return false
}

// ---- Label resolution (Section 5 order) --------------------------------------

function labelFromFor(el: HTMLElement, doc: Document): string | null {
  if (!el.id) return null
  // Page-controlled ids can carry selector-breaking characters (a raw newline
  // makes querySelector throw — and one bad id anywhere used to abort the
  // ENTIRE scan). An unescapable id simply has no <label for> to find.
  try {
    const escaped =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(el.id)
        : el.id.replace(/["\\]/g, '\\$&')
    const label = doc.querySelector(`label[for="${escaped}"]`)
    return label?.textContent?.trim() || null
  } catch {
    return null
  }
}

function labelFromWrap(el: HTMLElement): string | null {
  const label = el.closest('label')
  if (!label) return null
  // Exclude the control's own text (e.g. select option text)
  const clone = label.cloneNode(true) as HTMLElement
  clone.querySelectorAll('input, select, textarea, button').forEach((n) => n.remove())
  return clone.textContent?.trim() || null
}

function labelFromAria(el: HTMLElement, doc: Document): string | null {
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => doc.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
    if (text) return text
  }
  return el.getAttribute('aria-label')?.trim() || null
}

/** Nearest preceding text node / heading — last resort. */
/** Widget machinery whose text must never become a label: option lists of
 *  neighboring dropdowns (some ATSes keep every listbox permanently in the
 *  DOM) would otherwise leak in as a "preceding text" label. */
const NON_LABEL_SIBLING = '[role="listbox"], [role="menu"], [role="tree"], [role="dialog"]'

function labelFromPrecedingText(el: HTMLElement): string | null {
  let node: Element | null = el
  for (let depth = 0; depth < 4 && node; depth++) {
    let sibling = node.previousElementSibling
    while (sibling) {
      if (
        !sibling.querySelector('input, select, textarea') &&
        !sibling.matches(NON_LABEL_SIBLING) &&
        !sibling.querySelector('[role="option"], [role="menuitem"]') &&
        // A neighboring pill-question block contains only BUTTONS — its
        // question+options text must never leak in as this field's label
        // (review catch 2026-07-17: wrong-question pill autofill).
        !sibling.querySelector('button[aria-pressed], [class*="pill" i] button')
      ) {
        const text = sibling.textContent?.trim()
        if (text && text.length > 1 && text.length < 300) return text
      }
      sibling = sibling.previousElementSibling
    }
    node = node.parentElement
  }
  return null
}

/** Placeholder text posing as a label — Workday dropdown buttons carry
 *  aria-label="Select One Required" while the real question sits in the
 *  preceding text. A placeholder must not shadow a real label source. */
const PLACEHOLDER_LABEL_RE = /^\s*(please\s+)?(select|choose|pick)\b[\w\s()/-]*$|^\s*required\s*$/i

// ---- Label-resolution cascade (2026-07-16 rebuild) ---------------------------
// The old resolver was a first-match-wins chain over 4 sources; a boilerplate
// <label> ("*", "Required") beat a perfect sibling question, and div-soup
// layouts (Workday) resolved nothing at all. The cascade HARVESTS candidates
// from every source, scores each as sourceRank × textQuality, and returns the
// winner plus runner-ups (stored as aliases at capture). getLabel() keeps its
// signature on top of it.

interface LabelCandidate {
  text: string
  /** How trustworthy the source is when its text is clean. */
  rank: number
}

/** Boilerplate that is never a question, whatever source carried it. */
const BOILERPLATE_LABEL_RE =
  /^\s*(\*+|optional|required|search|clear|edit|remove|delete|help|\?|close|add|x)\s*$/i

const QUESTION_WORD_RE = /\b(who|what|when|where|which|how|have|has|are|is|do|does|did|will|would|can)\b/i

/** Humanized-identifier shapes ("q 00123", "field 8", "input group 3"). */
const HUMANIZED_ID_RE = /^[a-z][a-z\s]*\d{2,}$/i

/** Salvage an over-long container grab: the first ?-terminated sentence, or
 *  the first line that is short enough to be a question. */
function salvageLongText(text: string): string | null {
  const question = text.match(/[^.!?\n]{4,200}\?/)
  if (question) return question[0].trim()
  const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length >= 4 && l.length <= 120)
  return firstLine ?? null
}

/** Text-quality multiplier in [0, 1.2]; 0 = hard reject. */
function labelQuality(raw: string): { text: string; quality: number } {
  let text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return { text, quality: 0 }
  if (BOILERPLATE_LABEL_RE.test(text)) return { text, quality: 0 }
  if (!/[a-z]/i.test(text)) return { text, quality: 0 }
  let penalty = 1
  if (text.length > 160) {
    // A container grab that swallowed instructions — salvage the actual
    // question out of it, or (past 300 chars) reject the blob outright.
    const salvaged = salvageLongText(text)
    if (salvaged) {
      text = salvaged
      penalty = 0.9
    } else if (text.length > 300) {
      return { text, quality: 0 }
    }
  }
  // Date-format masks posing as labels ("MM/DD/YYYY", "DD-MM-YYYY hh:mm")
  if (/^[MDYHhms\d\s/\-.:]+$/.test(text)) return { text, quality: 0.05 }
  let q = penalty
  if (/\?\s*$/.test(text)) q *= 1.2
  else if (/:\s*$/.test(text)) q *= 1.1
  if (text.length < 3) q *= 0.5
  else if (text.length <= 7) q *= 0.85
  else if (text.length > 120) q *= 0.7
  const letters = text.replace(/[^a-z]/gi, '').length
  if (letters / text.length < 0.4) q *= 0.3 // "MM/DD/YYYY" & co
  if (HUMANIZED_ID_RE.test(text)) q *= 0.25
  if (QUESTION_WORD_RE.test(text)) q *= 1.1
  // Placeholder-shaped labels only ever win as a last resort
  if (PLACEHOLDER_LABEL_RE.test(text)) q *= 0.1
  return { text, quality: Math.min(1.2, q) }
}

/** Column/row headers for inputs living inside table layouts. */
function labelsFromTable(el: HTMLElement): string[] {
  const cell = el.closest('td')
  if (!cell || !(cell instanceof HTMLTableCellElement)) return []
  const out: string[] = []
  const table = cell.closest('table')
  const headRow = table?.querySelector('thead tr') ?? table?.querySelector('tr')
  const headCell = headRow?.children[cell.cellIndex]
  const headText = headCell?.textContent?.trim()
  if (headText && headCell !== cell) out.push(headText)
  const row = cell.closest('tr')
  const rowHeader = row?.querySelector('th')?.textContent?.trim()
  if (rowHeader) out.push(rowHeader)
  return out
}

/** <dt> term for an input inside the matching <dd>. */
function labelFromDt(el: HTMLElement): string | null {
  const dd = el.closest('dd')
  let sib = dd?.previousElementSibling ?? null
  while (sib && sib.tagName !== 'DT') sib = sib.previousElementSibling
  return sib?.textContent?.trim() || null
}

const CONTAINER_STOP = new Set(['FORM', 'FIELDSET', 'BODY', 'MAIN', 'SECTION', 'TABLE'])

/** Nearest ancestor holding exactly this one control: its text (minus the
 *  control's own value/options) is usually the question. This is what reads
 *  Workday/Greenhouse div-soup, where no label/aria/sibling relation exists. */
function labelFromSoloContainer(el: HTMLElement): string | null {
  let node: HTMLElement | null = el.parentElement
  for (let depth = 0; node && depth < 5; depth++) {
    // Pill buttons count as controls: a label-less pill group walking up
    // past an ancestor holding one OTHER field's input must not steal that
    // field's label (review catch 2026-07-17).
    const controls = node.querySelectorAll(
      'input, select, textarea, [role="combobox"], button[aria-pressed]',
    )
    if (controls.length === 1) {
      const clone = node.cloneNode(true) as HTMLElement
      clone
        .querySelectorAll('input, select, textarea, button, [role="listbox"], [role="option"], script, style')
        .forEach((n) => n.remove())
      const text = clone.textContent?.trim()
      if (text && text.length > 1) return text
    }
    if (controls.length > 1) return null // shared container — ambiguous
    if (CONTAINER_STOP.has(node.tagName)) return null
    node = node.parentElement
  }
  return null
}

export interface ResolvedLabel {
  best: string
  /** True when the winner came from an explicit label relation (label[for],
   *  wrapping label, aria) rather than structural inference. */
  explicit: boolean
  /** Deduped runner-up texts, best-first (capture stores them as aliases). */
  aliases: string[]
}

/** Collect candidates from EVERY source (never short-circuit), score, pick. */
export function resolveLabel(el: HTMLElement, doc: Document): ResolvedLabel {
  const explicitRanks = new Map<string, number>()
  const push = (list: LabelCandidate[], text: string | null | undefined, rank: number, explicit = false) => {
    const t = text?.trim()
    if (!t) return
    list.push({ text: t, rank })
    if (explicit) explicitRanks.set(t, rank)
  }
  const harvested: LabelCandidate[] = []
  push(harvested, labelFromFor(el, doc), 1.0, true)
  push(harvested, labelFromWrap(el), 0.98, true)
  push(harvested, labelFromAria(el, doc), 0.9, true)
  for (const t of labelsFromTable(el)) push(harvested, t, 0.8)
  push(harvested, labelFromDt(el), 0.8)
  push(harvested, labelFromPrecedingText(el), 0.75)
  push(harvested, labelFromSoloContainer(el), 0.65)

  const scored = harvested
    .map((c) => {
      const { text, quality } = labelQuality(c.text)
      return { text, explicit: explicitRanks.has(c.text), quality, score: c.rank * quality }
    })
    .filter((c) => c.score > 0)
  scored.sort((a, b) => b.score - a.score || a.text.length - b.text.length)

  if (scored.length === 0) {
    // Nothing survived quality scoring — keep the old placeholder-fallback
    // behavior so "Select One Required" aria-labels still beat total silence.
    const rawFirst = harvested.find((c) => c.text)
    return { best: rawFirst?.text ?? '', explicit: false, aliases: [] }
  }

  // Explicit label relations (label[for]/wrap/aria) keep their historical
  // precedence whenever their text is at least plausible — only boilerplate
  // or junk ("*", "Required", "MM/DD/YYYY") lets a structural source win.
  const explicitOk = scored.find((c) => c.explicit && c.quality >= 0.5)
  const best = explicitOk ?? scored[0]
  const aliases: string[] = []
  const seen = new Set([best.text.toLowerCase()])
  for (const c of scored.filter((s) => s !== best)) {
    const key = c.text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    aliases.push(c.text)
    if (aliases.length >= 4) break
  }
  return { best: best.text, explicit: best.explicit, aliases }
}

export function getLabel(el: HTMLElement, doc: Document): string {
  return resolveLabel(el, doc).best
}

/** Option text for one radio/checkbox in a group — its own mini-cascade:
 *  EXPLICIT label sources only (label[for]/wrapping label/aria), then the
 *  text node RIGHT AFTER the input (`<input><span>Yes</span>` — common
 *  un-labelled markup), never the coded value (the caller decides what to do
 *  when nothing textual exists). Structural harvesters (preceding text,
 *  containers) are deliberately EXCLUDED here: inside a group they grab the
 *  legend or the previous option's label. */
export function resolveOptionText(el: HTMLInputElement, doc: Document): string {
  const own = labelFromFor(el, doc) ?? labelFromWrap(el) ?? labelFromAria(el, doc)
  if (own) return own
  let sib = el.nextSibling
  while (sib) {
    const text =
      sib.nodeType === Node.TEXT_NODE
        ? sib.textContent?.trim()
        : sib instanceof HTMLElement && !sib.querySelector('input, select, textarea')
          ? sib.textContent?.trim()
          : undefined
    if (text) return text
    if (sib instanceof HTMLElement && sib.querySelector('input, select, textarea')) break
    sib = sib.nextSibling
  }
  return ''
}

// ---- Section context ----------------------------------------------------------

function getSectionContext(el: HTMLElement): string {
  const fieldset = el.closest('fieldset')
  const legend = fieldset?.querySelector('legend')?.textContent?.trim()
  if (legend) return legend
  const section = el.closest('section, [role="group"], form')
  const heading = section?.querySelector('h1, h2, h3, h4, h5, h6')?.textContent?.trim()
  return heading ?? ''
}

/** Heading fallback only trusts numbers attached to a repeating-block noun —
 *  "Step 2 of 4" or "Question 3" must never rotate the work history. */
const REPEAT_HEADING_RE =
  /(?:experience|employment|employer|position|job|work|education|reference)[^0-9]*(\d+)\s*$/i

function headingSectionIndex(sectionContext: string): number | undefined {
  const h = sectionContext.match(REPEAT_HEADING_RE)
  if (!h) return undefined
  const n = parseInt(h[1], 10)
  return n >= 1 && n <= 50 ? n - 1 : undefined
}

/** 'education' vs 'work' from a repeat family ("workExperience", "education")
 *  or a section heading — undefined when neither reads clearly. */
function sectionKindOf(text: string | null | undefined): 'work' | 'education' | undefined {
  if (!text) return undefined
  if (/educat|school|universit|college|degree/i.test(text)) return 'education'
  if (/work|employ|experience|job|position/i.test(text)) return 'work'
  return undefined
}

// Workday prefixes every element id in a repeating block with
// "<family>-<n>--" (e.g. "workExperience-6--startDate-dateSectionMonth-input").
// The number is a widget-instance counter, NOT an ordinal — deleting and
// re-adding blocks leaves gaps (a lone block can be "workExperience-6") — so
// blocks are ranked by first appearance in DOM order, never by n itself.
const REPEAT_ID_RE = /^([a-zA-Z]\w*)-(\d+)--/
const REPEAT_AUTOMATION_RE = /^([a-zA-Z]\w*)-(\d+)$/

interface RepeatKey {
  family: string
  key: string
}

function getRepeatKey(el: HTMLElement): RepeatKey | null {
  let node: HTMLElement | null = el
  while (node) {
    const idMatch = node.id.match(REPEAT_ID_RE)
    if (idMatch) return { family: idMatch[1], key: `${idMatch[1]}-${idMatch[2]}` }
    const auto = node.getAttribute('data-automation-id')
    const autoMatch = auto?.match(REPEAT_AUTOMATION_RE)
    if (autoMatch) return { family: autoMatch[1], key: `${autoMatch[1]}-${autoMatch[2]}` }
    node = node.parentElement
  }
  return null
}

// ---- Options -------------------------------------------------------------------

function selectOptions(el: HTMLSelectElement): FieldOption[] {
  return [...el.options]
    .filter((o) => o.value !== '' || o.text.trim() !== '')
    .map((o) => ({ value: o.value, text: o.text.trim() }))
}

// ---- Kind ----------------------------------------------------------------------

function inputKind(el: HTMLInputElement): FieldKind {
  const type = (el.type || 'text').toLowerCase()
  switch (type) {
    case 'password':
      return 'password'
    case 'email':
      return 'email'
    case 'tel':
      return 'tel'
    case 'url':
      return 'url'
    case 'number':
      return 'number'
    case 'date':
    case 'month':
      return 'date'
    case 'radio':
      return 'radio'
    case 'checkbox':
      return 'checkbox'
    case 'file':
      return 'file'
    default:
      return 'text'
  }
}

/** Workday multiselect search-combobox (Field of Study, Skills): a bare text
 *  input inside a multiselect container, plus an adjacent list-icon button.
 *  The container carries no combobox/haspopup markers on some tenants — the
 *  automation-id is the only reliable signal. Shared with autofill (pill
 *  verification) — a committed choice renders as a pill IN the container,
 *  never as the input's value. */
export const MULTISELECT_CONTAINER_SELECTOR = '[data-automation-id*="multiselect" i]'

/** Combobox evidence on an element — the SHARED test (Stage 1, 2026-08-22).
 *  Live failure this widens for: ATS comboboxes rendered as a plain
 *  `<input type="text">` whose dropdown nature lives in aria-autocomplete /
 *  aria-expanded / aria-controls→listbox rather than role="combobox". Those
 *  classified as 'text', took the typing path, and the site's state model
 *  never received a SELECTION — visually filled, actually empty. autofill.ts
 *  re-checks this at fill time (attributes often mount after our scan). */
export function hasComboboxSignals(el: HTMLElement): boolean {
  if (el.tagName === 'SELECT') return false
  const role = el.getAttribute('role')
  if (role === 'combobox') return true
  const haspopup = el.getAttribute('aria-haspopup')
  if (haspopup === 'listbox' || haspopup === 'true') return true
  const autocomplete = el.getAttribute('aria-autocomplete')
  if (autocomplete === 'list' || autocomplete === 'both') return true
  if (el instanceof HTMLInputElement) {
    // aria-expanded on an INPUT is a combobox tell (on buttons/divs it could
    // be an accordion, so inputs only). aria-controls/owns pointing at a
    // listbox is definitive wherever it appears.
    if (el.hasAttribute('aria-expanded')) return true
  }
  const controlsId = el.getAttribute('aria-controls') ?? el.getAttribute('aria-owns')
  if (controlsId) {
    const target = el.ownerDocument.getElementById(controlsId.split(/\s+/)[0])
    if (target?.getAttribute('role') === 'listbox') return true
  }
  return false
}

function isCustomDropdown(el: HTMLElement): boolean {
  if (el.tagName === 'SELECT') return false
  if (hasComboboxSignals(el)) return true
  // A multiselect container's search input IS the field (typing into it is
  // the fill protocol) — plain value writes get reverted by the widget.
  return el instanceof HTMLInputElement && !!el.closest(MULTISELECT_CONTAINER_SELECTOR)
}

/** "Select One"-style text — what an unanswered dropdown trigger shows. */
const DROPDOWN_PLACEHOLDER_RE = /^(select|choose|pick|please\s|-+$|—+$|\.{3}$)/i

/** Trigger text that ENDS in a placeholder: many ATSes compose the button's
 *  text as "‹Label› Select One( Required)" — the label rides inside the
 *  button ("Prefix Select One", "State Select One Required"). */
const TRAILING_PLACEHOLDER_RE =
  /\b(please\s+)?(select|choose|pick)(\s+(one|an?\s+option|\.{3}|…))?(\s+\(?required\)?)?\s*$/i

/** Styled dropdown triggers that don't use the combobox pattern: a button
 *  with SOME popup/expanded hint, outside site chrome, whose visible text is
 *  (or ends in) a placeholder ("Select One"). The text gate keeps accordions
 *  (whose button text is the question itself) and already-answered dropdowns
 *  out. */
function isDropdownButton(el: HTMLElement): boolean {
  const role = el.getAttribute('role')
  if (el.tagName !== 'BUTTON' && role !== 'button') return false
  // A toggle button (aria-pressed) is STATE, not a popup trigger — pill
  // options detect as a group, never as individual dropdown fields. A real
  // popup hint outranks it: some design systems misuse aria-pressed for the
  // open-state of a dropdown trigger (review catch 2026-07-17).
  if (
    el.hasAttribute('aria-pressed') &&
    !el.getAttribute('aria-haspopup') &&
    !el.hasAttribute('aria-expanded')
  )
    return false
  // Attribute, not property: an attribute-less <button> PROPERTY defaults
  // to "submit", which would exclude every plain trigger button.
  const typeAttr = el.getAttribute('type')
  if (typeAttr === 'submit' || typeAttr === 'reset') return false
  if (
    el.closest('nav, header, footer, [role="navigation"], [role="menubar"], [role="menu"], [role="tablist"]')
  )
    return false
  const text = el.textContent?.trim() ?? ''
  const hasPopupHint = !!el.getAttribute('aria-haspopup') || el.hasAttribute('aria-expanded')
  // With a popup hint, empty text also qualifies; without one (some ATS
  // triggers are PLAIN buttons — live report 2026-07-15), the placeholder
  // text itself is the evidence.
  if (hasPopupHint && text === '') return true
  return DROPDOWN_PLACEHOLDER_RE.test(text) || TRAILING_PLACEHOLDER_RE.test(text)
}

/** Strip the placeholder tail a composed trigger label carries — "State
 *  Select One Required" must match as "State", not as four words of noise. */
export function stripLabelPlaceholder(label: string): string {
  let text = label.trim()
  const stripped = text.replace(TRAILING_PLACEHOLDER_RE, '').trim()
  if (stripped !== '') text = stripped
  return text.replace(/\s*\(?required\)?\s*$/i, '').trim() || text
}

// ---- Signal assembly -------------------------------------------------------------

function ensureFieldId(el: HTMLElement): string {
  const existing = el.getAttribute(FF_ID_ATTR)
  if (existing) return existing
  const id = `ff-${++idCounter}`
  el.setAttribute(FF_ID_ATTR, id)
  return id
}

function isRequired(el: HTMLElement, label: string): boolean {
  if (el.hasAttribute('required') || el.getAttribute('aria-required') === 'true') return true
  return /[*✱]\s*$/.test(label) || /^\s*\*/.test(label)
}

function isFilled(el: HTMLElement, kind: FieldKind): boolean {
  if (kind === 'checkbox' || kind === 'radio') return (el as HTMLInputElement).checked
  if (kind === 'contenteditable') return (el.textContent ?? '').trim() !== ''
  if (kind === 'custom-dropdown') {
    const value = (el as HTMLInputElement).value
    if (typeof value === 'string' && value.trim() !== '') return true
    const aria = el.getAttribute('aria-valuetext')
    if (aria && aria.trim() !== '') return true
    // Multiselect search inputs commit as PILLS on the container — the input
    // itself stays empty forever (would re-fill on every rescan otherwise).
    const pillHolder =
      el instanceof HTMLInputElement ? el.closest<HTMLElement>(MULTISELECT_CONTAINER_SELECTOR) : null
    // Button/div triggers show the committed choice as visible text —
    // placeholders, search boxes, and empty multi-select counters are not
    // answers ("Prefix Select One", "Search", "0 items selected").
    const text = (pillHolder ?? el).textContent?.trim() ?? ''
    if (text === '' || text.toLowerCase() === 'required') return false
    if (/\b(select|choose|pick|search)\b/i.test(text)) return false
    if (/\b0\s+items?\s+selected\b/i.test(text)) return false
    return true
  }
  if (kind === 'select') {
    // A resting "Select One" placeholder is NOT an answer, even when the
    // placeholder option carries a non-empty value.
    const select = el as HTMLSelectElement
    const chosen = select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null
    if (!chosen || chosen.value.trim() === '') return false
    return !/^\s*(select|choose|please|pick|-+\s*$|—|\.{3})/i.test(chosen.text)
  }
  return ((el as HTMLInputElement).value ?? '').trim() !== ''
}

function interestingDataAttrs(el: HTMLElement): string[] {
  const out: string[] = []
  for (const attr of el.getAttributeNames()) {
    if (attr.startsWith('data-') && attr !== FF_ID_ATTR && /field|question|label|name|automation/.test(attr)) {
      const value = el.getAttribute(attr)
      if (value) out.push(value)
    }
  }
  return out
}

function buildSignal(
  el: HTMLElement,
  kind: FieldKind,
  doc: Document,
  options: FieldOption[] = [],
): SignalBundle {
  const resolved = resolveLabel(el, doc)
  let label = stripLabelPlaceholder(resolved.best)
  if (!label && kind === 'custom-dropdown') {
    // Composed triggers carry their label INSIDE the button text
    // ("State Select One Required") with no external label element — strip
    // the placeholder tail and use what remains ("State").
    const own = (el.textContent ?? '').trim()
    const remainder = own
      .replace(TRAILING_PLACEHOLDER_RE, '')
      .replace(/\s*\(?required\)?\s*$/i, '')
      .trim()
    if (remainder !== '' && remainder.toLowerCase() !== own.toLowerCase()) label = remainder
  }
  const placeholder = el.getAttribute('placeholder') ?? ''
  const name = el.getAttribute('name') ?? ''
  const id = el.getAttribute('id') ?? ''
  const sectionContext = getSectionContext(el)

  // Best available question text: label, else placeholder, else humanized
  // name/id — and PROVENANCE of which branch won, so capture knows whether
  // the stored question key can ever match another site's wording.
  const questionText =
    label || placeholder || humanizeIdentifier(name || id) || sectionContext
  const questionSource: SignalBundle['questionSource'] = label
    ? 'label'
    : placeholder
      ? 'placeholder'
      : humanizeIdentifier(name || id)
        ? 'identifier'
        : 'section'
  // "To" is a matching stopword — canonical("To") is "" — but a labeled field
  // is not a learn-nothing field; keep the un-canonicalized text rather than
  // letting the empty-question filter drop it (date-range From/To inputs).
  const normalizedQuestion = canonical(questionText) || normalize(questionText)
  const rawText = [label, placeholder, sectionContext].filter(Boolean).join(' ')
  const consentText = `${label} ${sectionContext}`
  const eeoText = `${label} ${name} ${id} ${sectionContext}`

  return {
    fieldId: ensureFieldId(el),
    kind,
    label,
    placeholder,
    autocomplete: (el.getAttribute('autocomplete') ?? '').toLowerCase(),
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
    consentLike: kind === 'checkbox' && CONSENT_RE.test(consentText),
    certificationLike: kind === 'checkbox' && CERTIFICATION_RE.test(consentText),
    eeoLike: EEO_RE.test(eeoText),
  }
}

// ---- Segmented date widgets (Workday) ----------------------------------------------
// Workday renders one date as separate Month/Day/Year inputs
// (data-automation-id="dateSectionMonth-input" …) inside a shared wrapper.
// Individually they carry useless labels ("Month"); grouped they are ONE date
// field labeled by the wrapper's question ("From", "To") — Section 5.

type DateSegmentRole = keyof DateSegmentEls

function dateSegmentRole(el: HTMLInputElement): DateSegmentRole | null {
  const auto = el.getAttribute('data-automation-id') ?? ''
  const m = auto.match(/^dateSection(Month|Day|Year)/i)
  if (m) return m[1].toLowerCase() as DateSegmentRole
  return null
}

function dateSegmentWrapper(el: HTMLInputElement): HTMLElement {
  return (
    el.closest<HTMLElement>('[data-automation-id="dateInputWrapper"], [data-automation-id="dateInput"]') ??
    el.parentElement ??
    el
  )
}

/** Workday's EMPTY spinbutton announces its format as aria text
 *  ("current value is YYYY") — value noise, never a question (live NVIDIA
 *  education page: year-only date groups matched nothing because this junk
 *  became their label). */
const SPINBUTTON_NOISE_RE = /^current value is\b/i

function dateGroupField(wrapper: HTMLElement, segments: DateSegmentEls, doc: Document): DetectedField {
  const signal = buildSignal(wrapper, 'date', doc)
  const parts = [segments.month, segments.day, segments.year].filter(
    (s): s is HTMLInputElement => Boolean(s),
  )
  if (SPINBUTTON_NOISE_RE.test(signal.label)) {
    // Drop the junk label and re-derive the question from the next sources
    // in buildSignal's chain (placeholder → identifier → section).
    signal.label = ''
    const identifier = humanizeIdentifier(signal.name || signal.id)
    const questionText = signal.placeholder || identifier || signal.sectionContext
    signal.normalizedQuestion = canonical(questionText) || normalize(questionText)
    signal.questionSource = signal.placeholder
      ? 'placeholder'
      : identifier
        ? 'identifier'
        : 'section'
    signal.rawText = [signal.placeholder, signal.sectionContext].filter(Boolean).join(' ')
  }
  // The wrapper carries the question ("From"); segments only say "Month".
  // If the wrapper resolved nothing, fall back to a segment's aria context —
  // skipping spinbutton value noise.
  if (!signal.label) {
    const fallback =
      parts.map((s) => getLabel(s, doc)).find((l) => l && !SPINBUTTON_NOISE_RE.test(l)) ?? ''
    if (fallback) {
      signal.label = fallback
      signal.normalizedQuestion = canonical(fallback)
      signal.rawText = [fallback, signal.sectionContext].filter(Boolean).join(' ')
      signal.questionSource = 'label'
    }
  }
  // "To" is a matching stopword — canonical("To") is "" — but on a date group
  // the bare label IS the question; keep it rather than dropping the field.
  if (!signal.normalizedQuestion && signal.label) {
    signal.normalizedQuestion = normalize(signal.label)
  }
  signal.required = signal.required || parts.some((s) => isRequired(s, ''))
  signal.filled = parts.every((s) => s.value.trim() !== '')
  return { el: wrapper, dateSegmentEls: segments, signal }
}

// ---- File-upload fields (Resume feature, 2026-07-17) --------------------------
// ATS upload widgets hide the real <input type=file> behind a styled button
// or a drag-and-drop zone. The ZONE carries the human question ("Resume/CV")
// and is the synthetic-drop target when input.files assignment isn't wired;
// after upload it's also where the site renders the filename chip.

const UPLOAD_ZONE_SELECTOR =
  '[data-automation-id*="file-upload" i], [data-automation-id*="fileupload" i], ' +
  '[data-automation-id*="attachment" i], [class*="dropzone" i], [class*="drop-zone" i], ' +
  '[class*="file-upload" i], [class*="upload" i], [aria-label*="upload" i]'

const DRAG_DROP_TEXT_RE = /\b(drag\s*(and|&|'?n'?)?\s*drop|drop\s+(a\s+)?(files?|here|your))\b/i

function fileUploadZone(anchor: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = anchor.parentElement
  for (let depth = 0; node && depth < 6; depth++) {
    if (node.matches(UPLOAD_ZONE_SELECTOR)) return node
    if (DRAG_DROP_TEXT_RE.test(node.textContent ?? '')) return node
    if (CONTAINER_STOP.has(node.tagName)) return null
    node = node.parentElement
  }
  return null
}

/** Accent-tolerant cue text ("Resumé"/"Résumé" → "Resume"). */
function deaccent(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const RESUME_CUE_RE = /\b(resume|curriculum\s+vitae|cv)\b/i
const COVER_CUE_RE = /\bcover[\s_-]*letter\b/i

function docCueOf(text: string): NonNullable<SignalBundle['docCue']> {
  const t = deaccent(text)
  // Workday's combined "Resume/CV or cover letter" zone is the resume slot —
  // resume wins whenever both cues appear.
  if (RESUME_CUE_RE.test(t)) return 'resume'
  if (COVER_CUE_RE.test(t)) return 'coverLetter'
  return 'other'
}

/** Button noise that must not stand in for the upload question. */
const UPLOAD_BUTTON_LABEL_RE = /^(select|choose|browse|upload|attach)\b[\w\s]*$/i

function fileUploadField(input: HTMLInputElement, doc: Document): DetectedField {
  const zone = fileUploadZone(input) ?? undefined
  const signal = buildSignal(input, 'file', doc)
  const acceptAttr = input.getAttribute('accept')?.trim()
  if (acceptAttr) signal.accept = acceptAttr
  if (zone && (!signal.label || UPLOAD_BUTTON_LABEL_RE.test(signal.label))) {
    // The zone carries the question — the hidden input itself resolves
    // nothing, or resolves its trigger button's text ("Select files").
    const resolved = resolveLabel(zone, doc)
    let zoneLabel = stripLabelPlaceholder(resolved.best)
    if (!zoneLabel || UPLOAD_BUTTON_LABEL_RE.test(zoneLabel)) {
      const clone = zone.cloneNode(true) as HTMLElement
      clone
        .querySelectorAll('input, select, textarea, button, script, style')
        .forEach((n) => n.remove())
      const own = clone.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      if (own.length > 1) {
        const { text, quality } = labelQuality(own)
        if (quality > 0) zoneLabel = text
      }
    }
    if (zoneLabel) {
      signal.label = zoneLabel
      signal.normalizedQuestion = canonical(zoneLabel) || normalize(zoneLabel)
      signal.rawText = [zoneLabel, signal.sectionContext].filter(Boolean).join(' ')
      signal.questionSource = 'label'
    }
  }
  // Kind cue from every text signal around the field. Matching filters
  // stored documents by it: a cover-letter zone never receives the resume.
  signal.docCue = docCueOf(
    [
      signal.label,
      ...(signal.labelAliases ?? []),
      zone?.textContent ?? '',
      signal.name,
      signal.id,
      signal.dataAttrs.join(' '),
      signal.sectionContext,
    ].join(' '),
  )
  // A label-less generic drop zone is still THE attachments field — keep it
  // detectable rather than letting the empty-question filter drop it.
  if (!signal.normalizedQuestion) signal.normalizedQuestion = normalize(signal.label || 'file upload')
  return { el: input, uploadZoneEl: zone, signal }
}

// ---- Radio groups -----------------------------------------------------------------

function radioGroupSignal(radios: HTMLInputElement[], doc: Document): DetectedField {
  const first = radios[0]
  // Option text via the mini-cascade (label sources, then following text
  // node); the coded value stays a LAST resort for fill-side matching — the
  // capture listener separately refuses to learn from it.
  const options: FieldOption[] = radios.map((radio) => ({
    value: radio.value,
    text: resolveOptionText(radio, doc) || radio.value,
  }))
  // The group's question: fieldset legend or nearest shared context, not the
  // individual option label. ARIA group containers come before the first
  // radio's own aria — Oracle CX labels each radio with its OPTION text
  // ("Yes") and hangs the question off <div role="radiogroup"
  // aria-labelledby=…> (Cummins capture 2026-07-16).
  const fieldset = first.closest('fieldset')
  const legend = fieldset?.querySelector('legend')?.textContent?.trim()
  const ariaGroup = first.closest<HTMLElement>('[role="radiogroup"], [role="group"]')
  const groupLabel =
    legend ??
    (ariaGroup ? labelFromAria(ariaGroup, doc) : null) ??
    labelFromAria(first, doc) ??
    labelFromPrecedingText(first.parentElement ?? first) ??
    ''

  const signal = buildSignal(first, 'radio', doc, options)
  if (groupLabel) {
    signal.label = groupLabel
    signal.normalizedQuestion = canonical(groupLabel)
    signal.rawText = [groupLabel, signal.sectionContext].filter(Boolean).join(' ')
    signal.questionSource = 'label'
  }
  signal.filled = radios.some((r) => r.checked)
  signal.eeoLike = EEO_RE.test(`${groupLabel} ${first.name} ${signal.sectionContext}`)
  return { el: first, groupEls: radios, signal }
}

// ---- Structural repeated blocks -----------------------------------------------
// Sites without numbered ids/headings (Phenom, Lever…) still render repeating
// entries as same-tag/same-class sibling containers. Classify each item by
// its own labels; only classified items get a section identity — a generic
// two-column row never rotates anything.

const EDU_ITEM_RE = /school|universit|college|degree|field of study|gpa|graduat/i
const WORK_ITEM_RE = /job.?title|company|employer|role description|currently work/i

function structuralRepeatItem(el: HTMLElement): { item: HTMLElement; index: number } | null {
  let node: HTMLElement | null = el.parentElement
  for (let depth = 0; node && depth < 8; depth++) {
    const parent = node.parentElement
    if (parent && typeof node.className === 'string' && node.className) {
      const reference = node
      const siblings = [...parent.children].filter(
        (c): c is HTMLElement =>
          c instanceof HTMLElement &&
          c.tagName === reference.tagName &&
          c.className === reference.className,
      )
      if (
        siblings.length >= 2 &&
        reference.querySelectorAll('input, select, textarea').length >= 2 &&
        siblings.every((s) => s.querySelector('input, select, textarea'))
      ) {
        return { item: reference, index: siblings.indexOf(reference) }
      }
    }
    node = parent
  }
  return null
}

function classifyRepeatItem(item: HTMLElement): 'work' | 'education' | undefined {
  const bits = [...item.querySelectorAll('label, legend')].map((l) => l.textContent ?? '')
  for (const labelled of item.querySelectorAll('[aria-label]'))
    bits.push(labelled.getAttribute('aria-label') ?? '')
  const text = bits.join(' ')
  if (EDU_ITEM_RE.test(text)) return 'education'
  if (WORK_ITEM_RE.test(text)) return 'work'
  return undefined
}

// ---- Checkbox groups --------------------------------------------------------------
// "Select all that apply" multi-selects: several checkboxes answering ONE
// question. Grouped by shared name ("skills[]") or by a shared fieldset /
// role=group container; a lone checkbox stays a lone yes/no checkbox.

function checkboxGroupSignal(boxes: HTMLInputElement[], doc: Document): DetectedField {
  const first = boxes[0]
  const options: FieldOption[] = boxes.map((box) => ({
    value: box.value,
    text: resolveOptionText(box, doc) || box.value,
  }))
  const container = first.closest<HTMLElement>('fieldset, [role="group"]')
  const legend = container?.querySelector('legend')?.textContent?.trim()
  const groupLabel =
    legend ??
    (container ? labelFromAria(container, doc) : null) ??
    labelFromAria(first, doc) ??
    labelFromPrecedingText(container ?? first.parentElement ?? first) ??
    ''

  const signal = buildSignal(first, 'checkbox', doc, options)
  if (groupLabel) {
    signal.label = groupLabel
    signal.normalizedQuestion = canonical(groupLabel)
    signal.rawText = [groupLabel, signal.sectionContext].filter(Boolean).join(' ')
    signal.questionSource = 'label'
  }
  signal.filled = boxes.some((b) => b.checked) // some already ticked → user's choice
  signal.consentLike = CONSENT_RE.test(`${groupLabel} ${signal.sectionContext}`)
  signal.certificationLike = CERTIFICATION_RE.test(`${groupLabel} ${signal.sectionContext}`)
  signal.eeoLike = EEO_RE.test(`${groupLabel} ${first.name} ${signal.sectionContext}`)
  return { el: first, groupEls: boxes, signal }
}

// ---- Main entry ---------------------------------------------------------------------

export function detectFields(root: ParentNode = document): DetectedField[] {
  const doc = (root instanceof Document ? root : root.ownerDocument) ?? document
  const results: DetectedField[] = []
  const radioGroups = new Map<string, HTMLInputElement[]>()
  const dateGroups = new Map<HTMLElement, DateSegmentEls>()
  const checkboxes: HTMLInputElement[] = []
  /** family → repeat key → 0-based rank in DOM order. */
  const repeatRanks = new Map<string, Map<string, number>>()

  const registerRepeatKey = (el: HTMLElement): void => {
    const rk = getRepeatKey(el)
    if (!rk) return
    let ranks = repeatRanks.get(rk.family)
    if (!ranks) {
      ranks = new Map()
      repeatRanks.set(rk.family, ranks)
    }
    if (!ranks.has(rk.key)) ranks.set(rk.key, ranks.size)
  }

  const candidates = root.querySelectorAll<HTMLElement>(
    'input, textarea, select, [contenteditable="true"], [role="combobox"], [aria-haspopup="listbox"], ' +
    // ALL buttons are candidates: some ATS dropdown triggers are plain
    // <button>s with no popup attribute at all (live report 2026-07-15) —
    // isDropdownButton's placeholder-text gate keeps ordinary buttons out.
    'button, [role="button"]',
  )

  for (const el of candidates) {
    // Never look at our own overlay
    if (el.closest('[data-flashfiller]')) continue
    // Site chrome is not the application form: the Workday header's language
    // picker is a button[aria-haspopup=listbox] that must never be "filled".
    if (el.closest(SITE_CHROME_SELECTOR)) continue
    // Transient picker popup internals (react-datepicker's year <select>,
    // nav buttons) are widget machinery, not form fields.
    if (el.closest('.react-datepicker')) continue
    if (isHiddenOrHoneypot(el)) {
      // Styled-select pattern (select2 & co): the real <select> is hidden
      // behind a custom widget. A hidden select with a real option list is a
      // backing store, not a honeypot — filling it + change syncs the UI.
      const backingSelect = el instanceof HTMLSelectElement && selectOptions(el).length >= 2
      // Hidden file inputs are the NORM, not honeypots: ATS uploaders hide
      // the real <input type=file> behind a styled "Select files" button or
      // drop zone (mirror of the styled-select rescue). Off-screen
      // positioning keeps its honeypot veto.
      const uploadInput =
        el instanceof HTMLInputElement &&
        (el.type || '').toLowerCase() === 'file' &&
        !isOffscreenPositioned(el)
      if (!backingSelect && !uploadInput) continue
    }
    registerRepeatKey(el)

    if (el instanceof HTMLInputElement) {
      // The inner search/filter textbox of a combobox CONTAINER is widget
      // machinery — the container is the field (detected separately as a
      // custom dropdown, incl. the search-combobox "0 items selected" kind).
      const comboContainer = el.closest('[role="combobox"], [aria-haspopup="listbox"]')
      if (comboContainer && comboContainer !== el) continue
      if (isSkippableInput(el)) continue
      const segmentRole = dateSegmentRole(el)
      if (segmentRole) {
        const wrapper = dateSegmentWrapper(el)
        const segments = dateGroups.get(wrapper) ?? {}
        if (!segments[segmentRole]) segments[segmentRole] = el
        dateGroups.set(wrapper, segments)
        continue
      }
      const kind = inputKind(el)
      if (kind === 'file') {
        results.push(fileUploadField(el, doc))
        continue
      }
      if (kind === 'radio') {
        const key = el.name || `__anon-${ensureFieldId(el)}`
        const group = radioGroups.get(key) ?? []
        group.push(el)
        radioGroups.set(key, group)
        continue
      }
      if (kind === 'checkbox') {
        checkboxes.push(el)
        continue
      }
      if (isCustomDropdown(el)) {
        results.push({ el, signal: buildSignal(el, 'custom-dropdown', doc) })
        continue
      }
      // react-datepicker inputs LOOK like plain text but are controlled by
      // the library's state — value writes get reverted; they need the
      // popup-driving fill path (Section 8).
      if (el.closest('.react-datepicker-wrapper, .react-datepicker__input-container')) {
        const signal = buildSignal(el, 'date', doc)
        signal.dateWidget = 'react-datepicker'
        results.push({ el, signal })
        continue
      }
      results.push({ el, signal: buildSignal(el, kind, doc) })
    } else if (el instanceof HTMLTextAreaElement) {
      if (el.disabled || el.readOnly) continue
      results.push({ el, signal: buildSignal(el, 'textarea', doc) })
    } else if (el instanceof HTMLSelectElement) {
      if (el.disabled) continue
      results.push({ el, signal: buildSignal(el, 'select', doc, selectOptions(el)) })
    } else if (el.getAttribute('contenteditable') === 'true') {
      results.push({ el, signal: buildSignal(el, 'contenteditable', doc) })
    } else if (isCustomDropdown(el) || isDropdownButton(el)) {
      // A combobox's companion arrow/toggle button (Oracle CX: <input
      // role="combobox" aria-controls="X-listbox"> PLUS <button
      // aria-controls="X-listbox" aria-label="Open the drop-down list for
      // …">) — the input IS the field; a second field on the button
      // double-detects the widget and matches junk ("Open the drop down
      // list for gender").
      const controlsId = el.getAttribute('aria-controls')
      if (
        (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') &&
        controlsId &&
        [...root.querySelectorAll<HTMLElement>('[role="combobox"]')].some(
          (c) => c !== el && c.getAttribute('aria-controls') === controlsId,
        )
      )
        continue
      // Multiselect machinery must not become fields of their own: the
      // container whose inner search input is already the anchored field
      // (the combobox-container skip only claims combobox/haspopup=listbox
      // containers), and the ☰ trigger button riding next to the container.
      if (
        el.matches(MULTISELECT_CONTAINER_SELECTOR) &&
        !el.matches('[role="combobox"], [aria-haspopup="listbox"]') &&
        el.querySelector('input:not([type="hidden"])')
      )
        continue
      if (
        (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') &&
        (el.closest(MULTISELECT_CONTAINER_SELECTOR) ||
          el.parentElement?.querySelector(MULTISELECT_CONTAINER_SELECTOR))
      )
        continue
      // An upload widget's "Select files" trigger reads exactly like a
      // dropdown placeholder button — but it drives the (already-detected)
      // file input beside it, never a listbox (caught by the resume-feature
      // fixture: the Workday drop zone double-detected).
      if (
        (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') &&
        (el.closest(UPLOAD_ZONE_SELECTOR)?.querySelector('input[type="file"]') ||
          el.parentElement?.querySelector('input[type="file"]'))
      )
        continue
      results.push({ el, signal: buildSignal(el, 'custom-dropdown', doc) })
    }
  }

  for (const [wrapper, segments] of dateGroups) {
    results.push(dateGroupField(wrapper, segments, doc))
  }

  for (const radios of radioGroups.values()) {
    if (radios.length > 0) results.push(radioGroupSignal(radios, doc))
  }

  // Pill groups: single-choice questions rendered as toggle BUTTONS with no
  // native input anywhere (Oracle CX questionnaire: <ul role="list"
  // aria-label="Travel Domestically"> of <button aria-pressed> pills — the
  // input/select/textarea sweep is structurally blind to them). Generic
  // shape: ≥2 visible, text-bearing aria-pressed buttons sharing a list-ish
  // container; semantically a radio group, so they detect as kind 'radio'
  // with pillEls and ride the existing matching (options, polarity, EEO).
  const pillGroups = new Map<HTMLElement, HTMLElement[]>()
  // aria-pressed is the generic signal, but Oracle's UNANSWERED multiselect
  // pills render with NO aria-pressed at all (isSelected is undefined until
  // a value exists — live NOV miss 2026-07-17: required "bachelor's degree?"
  // question invisible) — the pill-class container is the fallback anchor.
  const pillButtons = new Set<HTMLElement>([
    ...root.querySelectorAll<HTMLElement>('button[aria-pressed], [role="button"][aria-pressed]'),
    ...root.querySelectorAll<HTMLElement>(
      'ul[class*="pill" i] button, ol[class*="pill" i] button, [role="list"][class*="pill" i] button',
    ),
  ])
  for (const btn of pillButtons) {
    if (btn.closest('[data-flashfiller]')) continue
    if (btn.closest(SITE_CHROME_SELECTOR)) continue
    // Toolbars (rich-text bold/italic), tab strips, menus, and search-facet
    // filter chips use the same toggle-button pattern for chrome, never for
    // application questions (review catch 2026-07-17: job-search Employment
    // Type facets in <main> were claimable as answerable fields).
    if (btn.closest('[role="toolbar"], [role="tablist"], [role="menu"], [role="menubar"]')) continue
    if (btn.closest('aside, [class*="facet" i], [class*="filter" i]')) continue
    if (isHiddenOrHoneypot(btn)) continue
    if (!(btn.textContent ?? '').trim()) continue // icon-only toggles are chrome
    const container = btn.closest<HTMLElement>(
      'ul, ol, [role="list"], [role="radiogroup"], [role="group"]',
    )
    if (!container) continue
    const group = pillGroups.get(container) ?? []
    group.push(btn)
    pillGroups.set(container, group)
  }
  // One list-ish container can host SEVERAL questions (master lists, section
  // [role=group] wrappers) — merging them into one field would click the
  // wrong question's pill. Partition by direct child: when two or more
  // children each hold a full option set, each child is its own question.
  const pillBlocks: { el: HTMLElement; pills: HTMLElement[] }[] = []
  for (const [container, pills] of pillGroups) {
    if (pills.length < 2) continue
    const byChild = new Map<HTMLElement, HTMLElement[]>()
    for (const pill of pills) {
      let child: HTMLElement = pill
      while (child.parentElement && child.parentElement !== container) child = child.parentElement
      const bucket = byChild.get(child) ?? []
      bucket.push(pill)
      byChild.set(child, bucket)
    }
    const partitions = [...byChild.entries()]
    // Oracle's normal shape is one BUTTON per <li> (partitions of 1) — that
    // is one question. Distinct sub-blocks of ≥2 pills each are questions.
    if (partitions.length >= 2 && partitions.every(([, group]) => group.length >= 2)) {
      for (const [child, group] of partitions) pillBlocks.push({ el: child, pills: group })
    } else {
      pillBlocks.push({ el: container, pills })
    }
  }
  for (const { el: blockEl, pills } of pillBlocks) {
    const options: FieldOption[] = pills.map((p) => {
      const text = (p.textContent ?? '').trim()
      return { value: text, text }
    })
    // Multi-select pill groups (Oracle CX cx-select-pills isMultiselect:
    // the wrapper a few levels up is .cx-multi-select-pills /
    // .input-row--multiselect, pills carry add/remove icons, SEVERAL can be
    // pressed) are checkbox semantics. The class probe is BOUNDED — an
    // unbounded closest() would let a page-level "multiselect" theme class
    // flip every single-select group on the page (review catch 2026-07-17).
    let multi = pills.some((p) => p.querySelector('[class*="plus-icon" i], [class*="remove-icon" i]'))
    for (let node: HTMLElement | null = blockEl, depth = 0; node && depth < 4 && !multi; depth++) {
      if (typeof node.className === 'string' && /multiselect/i.test(node.className)) multi = true
      node = node.parentElement
    }
    const signal = buildSignal(blockEl, multi ? 'checkbox' : 'radio', doc, options)
    // Partitioned blocks (question text INSIDE the block, next to its own
    // pills) resolve no label from the outside — read the block's own text
    // minus the option buttons before giving up on the group.
    if (!signal.label) {
      const clone = blockEl.cloneNode(true) as HTMLElement
      clone.querySelectorAll('button, [role="button"], script, style').forEach((n) => n.remove())
      const own = clone.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      if (own.length > 1 && own.length < 300) {
        signal.label = own
        signal.normalizedQuestion = canonical(own) || normalize(own)
        signal.rawText = [own, signal.sectionContext].filter(Boolean).join(' ')
        signal.questionSource = 'label'
        signal.eeoLike = EEO_RE.test(`${own} ${signal.name} ${signal.id} ${signal.sectionContext}`)
      }
    }
    // Consent semantics are about the QUESTION, not the control kind:
    // buildSignal's checkbox-gated consent flags would leave an "I agree…"
    // single-select pill group inferable by the judge — violating the
    // consent-is-never-inferred rule (review catch 2026-07-17). Cookie-
    // preference toggle walls are chrome, not application questions.
    const consentText = `${signal.label} ${signal.sectionContext}`
    signal.consentLike = CONSENT_RE.test(consentText)
    signal.certificationLike = CERTIFICATION_RE.test(consentText)
    if (/\bcookies?\b/i.test(consentText)) continue
    signal.filled = pills.some((p) => p.getAttribute('aria-pressed') === 'true')
    results.push({ el: blockEl, pillEls: pills, signal })
  }

  // Checkbox grouping: shared name first, shared fieldset/[role=group] second
  const checkboxGroups = new Map<string, HTMLInputElement[]>()
  const soloBoxes: HTMLInputElement[] = []
  for (const box of checkboxes) {
    const name = box.name.replace(/\[\]$/, '')
    let key = name ? `name:${name}` : ''
    if (!key) {
      const container = box.closest<HTMLElement>('fieldset, [role="group"]')
      if (container) key = `container:${ensureFieldId(container)}`
    }
    if (!key) {
      soloBoxes.push(box)
      continue
    }
    const group = checkboxGroups.get(key) ?? []
    group.push(box)
    checkboxGroups.set(key, group)
  }
  for (const boxes of checkboxGroups.values()) {
    if (boxes.length >= 2) results.push(checkboxGroupSignal(boxes, doc))
    else soloBoxes.push(boxes[0])
  }
  for (const box of soloBoxes) {
    results.push({ el: box, signal: buildSignal(box, 'checkbox', doc) })
  }

  // Auth-form context (account creation / sign-in): a password input marks
  // sibling email/username fields so they fill with the dedicated ACCOUNT
  // email rather than the application contact email. Same-form is the strong
  // signal; formless small pages (Workday's auth screens) count too.
  const passwordFields = results.filter((f) => f.signal.kind === 'password')
  if (passwordFields.length > 0) {
    const authForms = new Set(
      passwordFields.map((f) => f.el.closest('form')).filter((form) => form !== null),
    )
    const smallAuthPage = results.length <= 8
    for (const field of results) {
      const { kind } = field.signal
      if (kind === 'password') {
        field.signal.authContext = true
        continue
      }
      if (kind !== 'email' && kind !== 'text') continue
      const form = field.el.closest('form')
      if ((form && authForms.has(form)) || smallAuthPage) field.signal.authContext = true
    }
  }

  // Repeated blocks (Workday work experience / education panels): rank each
  // block by DOM order and stamp its fields, so the matcher can hand block
  // N the Nth profile entry deterministically.
  for (const field of results) {
    const rk = getRepeatKey(field.el)
    if (!rk) continue
    // A repeat key only means "repeating block" when the family has ≥2
    // distinct keys on the page. A single site-wide numbered wrapper
    // ("step-2", "panel-1") would otherwise stamp EVERY field as section 0
    // and pin the whole page to work-history entry #1.
    const ranks = repeatRanks.get(rk.family)
    if (ranks && ranks.size >= 2) {
      const rank = ranks.get(rk.key)
      if (rank !== undefined) field.signal.sectionIndex = rank
    }
    // The id prefix ("workExperience-6", "education-1") is more authoritative
    // than a heading guess — and kind (unlike index) is safe from one key.
    field.signal.sectionKind = sectionKindOf(rk.family) ?? field.signal.sectionKind
  }

  // Fields still without a section identity: structural repeat detection.
  // Deterministic per-block indexes replace the fragile usage-counter
  // rotation on sites with anonymous repeated blocks (Phenom & co).
  const structuralCache = new Map<HTMLElement, { index: number; kind?: 'work' | 'education' }>()
  const structuralHits: {
    field: DetectedField
    item: HTMLElement
    index: number
    kind: 'work' | 'education'
  }[] = []
  for (const field of results) {
    if (field.signal.sectionIndex !== undefined) continue
    const hit = structuralRepeatItem(field.el)
    if (!hit) continue
    let info = structuralCache.get(hit.item)
    if (!info) {
      info = { index: hit.index, kind: classifyRepeatItem(hit.item) }
      structuralCache.set(hit.item, info)
    }
    if (info.kind) {
      field.signal.sectionIndex = info.index
      field.signal.sectionKind = info.kind
      structuralHits.push({ field, item: hit.item, index: info.index, kind: info.kind })
    }
  }
  // Rows-not-blocks tell: real sibling BLOCKS give each copy of a question a
  // different index, so the same question at the same index from two
  // DIFFERENT items means the bottom-up walk latched onto intra-block rows
  // (Oracle JET hides a second input inside a combobox row, defeating the
  // ≥2-inputs block test) — every block's "School" row then reads index 0
  // and all blocks fill entry #1. Strip that kind's structural indexes and
  // keep the kind: the matcher's rotation getter takes over.
  const collidedKinds = new Set<'work' | 'education'>()
  const seenItemByKey = new Map<string, HTMLElement>()
  for (const h of structuralHits) {
    const key = `${h.kind}|${h.index}|${h.field.signal.normalizedQuestion}`
    const prev = seenItemByKey.get(key)
    if (prev && prev !== h.item) collidedKinds.add(h.kind)
    else seenItemByKey.set(key, h.item)
  }
  for (const h of structuralHits) {
    if (collidedKinds.has(h.kind)) h.field.signal.sectionIndex = undefined
  }

  // Drop controls we could learn nothing about — they can only mismatch
  return results.filter((f) => f.signal.normalizedQuestion !== '')
}

/** Look an element back up from a fieldId stamped during detection. */
export function findByFieldId(fieldId: string, root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[${FF_ID_ATTR}="${fieldId}"]`)
}

export { normalize }
