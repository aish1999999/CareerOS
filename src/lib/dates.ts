// ---------------------------------------------------------------------------
// Date parsing/normalization shared by the fill engine (segmented widgets,
// formatted text inputs), the Profile tab (month pickers), and storage
// migrations. Profiles canonically store months as "YYYY-MM"; everything
// here exists to get legacy/free-text values into that shape.
// ---------------------------------------------------------------------------

export interface DateParts {
  year: string
  month: string
  day: string
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function monthFromName(name: string): number | null {
  return MONTH_NAMES[name.slice(0, 3).toLowerCase()] ?? null
}

/** "Present"-style non-dates on an end field mean "still there". */
export const PRESENT_RE = /^(present|current(ly)?|now|ongoing|till date|to date)$/i

/** Zero-padded {year, month, day} from the formats profiles and pages use
 *  ("2002-02", "2/2002", "02/15/2002", "Feb 2002", "January 2026");
 *  null when unparseable. Month names are parsed explicitly — the Date()
 *  fallback reads LOCAL components, never toISOString, so positive-UTC-offset
 *  timezones don't shift "January 2026" into December 2025. */
export function parseDateParts(value: string): DateParts | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  let match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (match)
    return { year: match[1], month: match[2].padStart(2, '0'), day: match[3].padStart(2, '0') }
  if ((match = trimmed.match(/^(\d{4})-(\d{1,2})$/)))
    return { year: match[1], month: match[2].padStart(2, '0'), day: '01' }
  if ((match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)))
    return { year: match[3], month: match[1].padStart(2, '0'), day: match[2].padStart(2, '0') }
  if ((match = trimmed.match(/^(\d{1,2})[/.-](\d{4})$/)))
    return { year: match[2], month: match[1].padStart(2, '0'), day: '01' }
  if ((match = trimmed.match(/^(\d{4})$/)))
    return { year: match[1], month: '01', day: '01' }
  // "January 2026", "Sept. 2023", "Feb, 2002"
  if ((match = trimmed.match(/^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/))) {
    const month = monthFromName(match[1])
    if (month) return { year: match[2], month: String(month).padStart(2, '0'), day: '01' }
  }
  // "January 15, 2026" and friends
  if ((match = trimmed.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/))) {
    const month = monthFromName(match[1])
    if (month)
      return {
        year: match[3],
        month: String(month).padStart(2, '0'),
        day: match[2].padStart(2, '0'),
      }
  }

  const d = new Date(trimmed)
  if (isNaN(d.getTime())) return null
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    day: String(d.getDate()).padStart(2, '0'),
  }
}

/** Canonical profile month: "YYYY-MM". "Present"/empty → "" (= current);
 *  unparseable text is returned unchanged — never destroy user data. */
export function toMonthISO(value: string): string {
  const trimmed = String(value ?? '').trim() // migrations feed unvalidated data
  if (!trimmed || PRESENT_RE.test(trimmed)) return ''
  const parts = parseDateParts(trimmed)
  return parts ? `${parts.year}-${parts.month}` : value
}

interface DatedEntry {
  startDate: string
  endDate: string
}

/** Normalize the dates on work/education entries to "YYYY-MM". */
export function normalizeEntryDates<T extends DatedEntry>(entries: T[]): T[] {
  return entries.map((e) => ({
    ...e,
    startDate: toMonthISO(e.startDate),
    endDate: toMonthISO(e.endDate),
  }))
}
