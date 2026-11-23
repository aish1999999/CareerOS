/** The shared last-three table: what it renders, and what Retrieve hands back. */
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { RecentEntries } from '@/ui/components/RecentEntries'

// @ts-expect-error — React's act() flag, which is not typed on globalThis
globalThis.IS_REACT_ACT_ENVIRONMENT = true

interface Row { company: string; role: string; jd: string }

const ROWS: Row[] = [
  { company: 'Acme', role: 'Quality Engineer', jd: 'Own the CAPA process end to end.' },
  { company: 'Beta Works', role: 'Process Engineer', jd: 'Run the supplier audits.' },
]

async function render(over: Partial<React.ComponentProps<typeof RecentEntries<Row>>> = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const onRetrieve = vi.fn()
  await act(async () => {
    createRoot(host).render(
      <RecentEntries<Row>
        testId="t"
        title="The last 3"
        entries={ROWS}
        onRetrieve={onRetrieve}
        columns={[
          { label: 'Company', cell: (e) => e.company },
          { label: 'Job title', cell: (e) => e.role },
          { label: 'Job description', cell: (e) => e.jd, wide: true },
        ]}
        {...over}
      />,
    )
  })
  return { host, onRetrieve }
}

const click = (el: Element | null) =>
  act(async () => { el?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

describe('the last-three table', () => {
  it('renders one row per entry, with the columns it was given', async () => {
    const { host } = await render()
    expect(host.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(host.textContent).toContain('Acme')
    expect(host.textContent).toContain('Process Engineer')
    expect(host.querySelectorAll('thead th')).toHaveLength(4)      // three columns plus the button's
  })

  /** An empty table with a heading is furniture, and this sits above boxes he is typing in. */
  it('renders nothing at all when there is nothing to show', async () => {
    const { host } = await render({ entries: [] })
    expect(host.innerHTML).toBe('')
  })

  it('hands Retrieve the row it was pressed on', async () => {
    const { host, onRetrieve } = await render()
    await click(host.querySelector('[data-testid="t-retrieve-1"]'))
    expect(onRetrieve).toHaveBeenCalledWith(ROWS[1])
  })

  it('is dead while the tab is busy, and says why', async () => {
    const { host, onRetrieve } = await render({ busy: true, busyWhy: 'A run is in flight' })
    const button = host.querySelector('[data-testid="t-retrieve-0"]') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.title).toBe('A run is in flight')
    await click(button)
    expect(onRetrieve).not.toHaveBeenCalled()
  })

  /** The cell is a reminder of which entry this is; the whole value is what Retrieve puts back. */
  it('clamps a long cell for the eye but keeps the whole value on its title', async () => {
    const long = 'x'.repeat(300)
    const { host } = await render({ entries: [{ company: 'Acme', role: 'QE', jd: long }] })
    const cell = [...host.querySelectorAll('td')].find((td) => td.title === long)
    expect(cell).toBeDefined()
    expect(cell!.textContent!.length).toBeLessThan(long.length)
    expect(cell!.textContent!.endsWith('…')).toBe(true)
  })

  it('shows an em dash where an entry has nothing in that column', async () => {
    const { host } = await render({ entries: [{ company: '', role: 'QE', jd: 'JD' }] })
    expect([...host.querySelectorAll('td')].some((td) => td.textContent === '—')).toBe(true)
  })
})
