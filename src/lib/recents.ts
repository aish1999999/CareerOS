/**
 * The last few entries each tab worked on, so closing the popup is not losing them.
 *
 * The tabs already survive a close in the narrow sense: the Tailor tab reattaches to the run that
 * is still going (lib/tailor.ts `ActiveRunRecord`), and the comment panel keeps the note it was
 * drafting. Neither helps with the ordinary case — you tailored against one posting, moved on to
 * the next, and want the previous one back. There was nothing holding it: `saveActiveRun` keeps ONE
 * record and replaces it on every start.
 *
 * So this is a short list, not a log. Three entries, newest first, in their own storage key. It is
 * a convenience for the human at the keyboard and nothing reads it but the panel that wrote it —
 * the database log is `jobs` and `comments`, and this does not compete with either.
 *
 * Pure list arithmetic (`withEntry`) is separated from storage so the rule — newest first, one
 * entry per posting, three at most — can be tested without chrome.*.
 */

export const TAILOR_RECENTS_KEY = 'flashfiller_tailor_recents_v1'

/** Three, as asked for. A cap this small is the point: it is a recovery affordance, not history. */
export const RECENTS_MAX = 3

/** One posting, as it stood when a run was started against it. */
export interface TailorEntry {
  company: string
  /** The job title. `role` is what the request calls it, and the name is kept the same here. */
  role: string
  jdText: string
  /** The posting's own address, as the Posting URL box held it. '' when there was none. */
  url: string
  engine: string
  domain: string
  savedAt: number
}

/**
 * The list after this entry, newest first and never longer than `max`.
 *
 * A run started twice against the same posting — a dry run and then the real one, the ordinary
 * way this tab is used — is ONE entry, refreshed. Without that, pressing preflight and then
 * generate would spend two of the three slots on one job and push a genuinely different posting off
 * the end.
 */
export function withEntry(list: TailorEntry[], entry: TailorEntry, max = RECENTS_MAX): TailorEntry[] {
  const same = (a: TailorEntry, b: TailorEntry) =>
    a.company.trim().toLowerCase() === b.company.trim().toLowerCase()
    && a.role.trim().toLowerCase() === b.role.trim().toLowerCase()
    && a.jdText.trim() === b.jdText.trim()
  return [entry, ...list.filter((e) => !same(e, entry))].slice(0, max)
}

function asEntry(raw: unknown): TailorEntry | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.savedAt !== 'number') return null
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  const entry: TailorEntry = {
    company: str(r.company), role: str(r.role), jdText: str(r.jdText), url: str(r.url),
    engine: str(r.engine), domain: str(r.domain), savedAt: r.savedAt,
  }
  // An entry with nothing in any of the three boxes could not fill them back in
  return entry.company || entry.role || entry.jdText ? entry : null
}

export async function loadTailorEntries(): Promise<TailorEntry[]> {
  try {
    const raw = await chrome.storage.local.get(TAILOR_RECENTS_KEY)
    const list = raw?.[TAILOR_RECENTS_KEY]
    if (!Array.isArray(list)) return []
    return list.map(asEntry).filter((e): e is TailorEntry => e !== null).slice(0, RECENTS_MAX)
  } catch {
    return []                      // an unreadable store means no table, never a broken tab
  }
}

/** Record this posting. Never throws: losing a convenience must not fail the run it belongs to. */
export async function rememberTailorEntry(
  entry: Omit<TailorEntry, 'savedAt'>,
  now: number = Date.now(),
): Promise<TailorEntry[]> {
  const next = withEntry(await loadTailorEntries(), { ...entry, savedAt: now })
  try {
    await chrome.storage.local.set({ [TAILOR_RECENTS_KEY]: next })
  } catch { /* see above */ }
  return next
}
