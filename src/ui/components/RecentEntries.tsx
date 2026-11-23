/**
 * The last three things you worked on, and a button that puts one back in the boxes.
 *
 * One component for both tabs because it is one idea: a short table, newest first, with Retrieve on
 * every row. The columns differ — a posting is a company and a title, a comment is a post and a
 * take — so the caller supplies them and this owns only the shape and the press.
 *
 * It shows nothing at all when there is nothing to show. An empty table with a heading is furniture,
 * and this sits above boxes the human is trying to type in.
 */

export interface RecentColumn<T> {
  /** The heading. Short: three columns share a 430px popup. */
  label: string
  /** The cell, as text. Long values are clamped by CSS, never truncated here — the row is a
   *  reminder of which entry this is, and the full value is what Retrieve puts back. */
  cell: (entry: T) => string
  /** A column that should take the slack when the others are narrow. */
  wide?: boolean
}

export interface RecentEntriesProps<T> {
  title: string
  entries: T[]
  columns: RecentColumn<T>[]
  /** What Retrieve does. The caller fills its own boxes — this never touches them. */
  onRetrieve: (entry: T) => void
  /** Shown under the table. Say what Retrieve will overwrite, in the caller's own terms. */
  hint?: string
  /** Disabled while the tab is busy, so a retrieve cannot land mid-run. */
  busy?: boolean
  /** Why it is disabled, on the button's own tooltip. */
  busyWhy?: string
  testId?: string
}

/** A cell's text, kept to one line's worth. The title attribute carries the whole thing. */
function short(value: string, max = 80): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (!clean) return '—'
  return clean.length <= max ? clean : `${clean.slice(0, max).trim()}…`
}

export function RecentEntries<T>(props: RecentEntriesProps<T>) {
  if (props.entries.length === 0) return null
  return (
    <div className="recents" data-testid={props.testId ?? 'recents'}>
      <div className="recents-title">{props.title}</div>
      <table className="recents-table">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column.label} className={column.wide ? 'wide' : undefined}>{column.label}</th>
            ))}
            <th className="actions" />
          </tr>
        </thead>
        <tbody>
          {props.entries.map((entry, index) => (
            <tr key={index}>
              {props.columns.map((column) => {
                const value = column.cell(entry)
                return (
                  <td key={column.label} className={column.wide ? 'wide' : undefined} title={value || undefined}>
                    {short(value)}
                  </td>
                )
              })}
              <td className="actions">
                <button
                  className="btn small"
                  data-testid={`${props.testId ?? 'recents'}-retrieve-${index}`}
                  disabled={props.busy}
                  title={props.busy
                    ? (props.busyWhy ?? 'Working — wait for the current step to finish.')
                    : 'Puts this entry back into the boxes above. It replaces what is in them.'}
                  onClick={() => props.onRetrieve(entry)}
                >
                  Retrieve entry
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {props.hint && <div className="sub">{props.hint}</div>}
    </div>
  )
}
