import { describe, expect, it } from 'vitest'
import { normalizeEntryDates, parseDateParts, toMonthISO } from '@/lib/dates'

describe('parseDateParts', () => {
  it('parses month names without timezone drift', () => {
    // Explicit regex path — never new Date().toISOString(), which shifts
    // "January 2026" into December 2025 east of Greenwich.
    expect(parseDateParts('January 2026')).toEqual({ year: '2026', month: '01', day: '01' })
    expect(parseDateParts('Sept. 2023')).toEqual({ year: '2023', month: '09', day: '01' })
    expect(parseDateParts('Feb, 2002')).toEqual({ year: '2002', month: '02', day: '01' })
    expect(parseDateParts('December 15, 2023')).toEqual({ year: '2023', month: '12', day: '15' })
  })

  it('parses numeric formats', () => {
    expect(parseDateParts('2026-1')).toEqual({ year: '2026', month: '01', day: '01' })
    expect(parseDateParts('1-2026')).toEqual({ year: '2026', month: '01', day: '01' })
    expect(parseDateParts('01.2026')).toEqual({ year: '2026', month: '01', day: '01' })
  })

  it('rejects junk', () => {
    expect(parseDateParts('Present')).toBeNull()
    expect(parseDateParts('soon')).toBeNull()
  })
})

describe('toMonthISO', () => {
  it('canonicalizes to YYYY-MM', () => {
    expect(toMonthISO('January 2026')).toBe('2026-01')
    expect(toMonthISO('05/2026')).toBe('2026-05')
    expect(toMonthISO('2026-05')).toBe('2026-05')
    expect(toMonthISO('2026')).toBe('2026-01')
  })

  it('maps "Present"-style text and blanks to empty (= current)', () => {
    expect(toMonthISO('Present')).toBe('')
    expect(toMonthISO('currently')).toBe('')
    expect(toMonthISO('  ')).toBe('')
  })

  it('never destroys unparseable user text', () => {
    expect(toMonthISO('spring semester')).toBe('spring semester')
  })
})

describe('normalizeEntryDates', () => {
  it('normalizes start/end while preserving the rest of the entry', () => {
    const [entry] = normalizeEntryDates([
      { company: 'McWane', startDate: 'January 2026', endDate: 'Present' },
    ])
    expect(entry).toEqual({ company: 'McWane', startDate: '2026-01', endDate: '' })
  })
})
