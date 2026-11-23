import { describe, expect, it } from 'vitest'
import vectors from '@contract/fixtures/jobs_dedupe_vectors.json'
import { deriveCitizenRequired, deriveSponsorship } from '@/lib/job-capture'
import {
  atsReqIdFromUrl,
  dedupeKey,
  normKey,
  normText,
  pyDate,
  pyInt,
  pyUrlparse,
  pyWorkType,
  sha1Hex,
  urlKey,
} from '@/lib/job-dedupe'

// Stage 4 part 2 — lib/job-dedupe.ts is a twin of apps/mapper/service/jobs_import.py.
// The vectors are GENERATED from the Python module (scripts/gen_dedupe_vectors.py);
// apps/mapper/tests/test_jobs_capture_twin.py holds Python to the same file. A red
// test here means the two languages would give one posting two rows.

const V = vectors.vectors

describe('sha1Hex', () => {
  it.each([
    ['', 'da39a3ee5e6b4b0d3255bfef95601890afd80709'],
    ['abc', 'a9993e364706816aba3e25717850c26c9cd0d89d'],
    ['The quick brown fox jumps over the lazy dog', '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12'],
    ['a'.repeat(55), 'c1c8bbdc22796e28c0e15163d20899b65621d65a'],
    ['a'.repeat(56), 'c2db330f6083854c99d4b5bfb6e8f29f201be699'],
    ['a'.repeat(64), '0098ba824b5c16427bd7a1122a5a442a25ec644d'],
    ['a'.repeat(1000), '291e9a6c66994949b57ba5e650361e98fc36b1ba'],
  ])('sha1(%j)', (input, hex) => {
    expect(sha1Hex(input)).toBe(hex)
  })
})

describe('generated vectors (Python is the reference)', () => {
  it('the file is the generated one', () => {
    expect(vectors.generated_by).toBe('scripts/gen_dedupe_vectors.py')
    expect(vectors.source).toBe('apps/mapper/service/jobs_import.py')
  })

  it.each(V.norm_text)('norm_text %j', (c) => {
    expect(normText(c.in)).toBe(c.out)
  })

  it.each(V.norm_key)('norm_key %j', (c) => {
    expect(normKey(c.in)).toBe(c.out)
  })

  it.each(V.url_key)('url_key %j', (c) => {
    expect(urlKey(c.in)).toBe(c.out)
  })

  it.each(V.ats_req_id_from_url)('ats_req_id_from_url %j', (c) => {
    expect(atsReqIdFromUrl(c.in)).toBe(c.out)
  })

  it.each(V.derive)('derived sponsorship / citizenship %j', (c) => {
    expect(deriveSponsorship(c.in)).toBe(c.sponsorship ?? null)
    expect(deriveCitizenRequired(c.in)).toBe(c.citizen_required === true)
  })

  it.each(V.dedupe_key)('dedupe_key %j', (c) => {
    expect(
      dedupeKey(c.company, c.title, {
        atsReqId: c.ats_req_id,
        url: c.url,
        description: c.description,
        linkedinJobId: c.linkedin_job_id,
      }),
    ).toBe(c.out)
  })

  it.each(V.int)('_int %j', (c) => {
    expect(pyInt(c.in)).toBe(c.out)
  })

  it.each(V.date)('_date %j', (c) => {
    expect(pyDate(c.in)).toBe(c.out)
  })

  it.each(V.work_type)('_work_type %j', (c) => {
    expect(pyWorkType(c.in)).toBe(c.out)
  })
})

describe('the Python test cases, verbatim (test_jobs_import.py)', () => {
  it('is stable across URL spellings and sources', () => {
    const a = dedupeKey('Acme Foundry', 'Quality Engineer', { url: 'https://www.linkedin.com/jobs/view/quality-engineer-at-acme-4420761539/' })
    const b = dedupeKey('acme foundry', 'Quality  Engineer', { url: 'https://linkedin.com/jobs/view/4420761539' })
    const c = dedupeKey('ACME FOUNDRY', 'Quality Engineer', { url: 'https://www.linkedin.com/jobs/search/?currentJobId=4420761539' })
    expect(a).toBe('acme foundry|quality engineer|li:4420761539')
    expect(b).toBe(a)
    expect(c).toBe(a)
    expect(dedupeKey('Acme', 'IE', { atsReqId: 'R-12345', url: 'https://x/y' })).toBe('acme|ie|req:r-12345')
    expect(dedupeKey('Acme', 'IE', { description: 'same text '.repeat(50) })).toBe(dedupeKey('Acme', 'IE', { description: 'same text '.repeat(50) }))
    expect(dedupeKey('Acme', 'IE', { description: 'a' })).not.toBe(dedupeKey('Acme', 'IE', { description: 'b' }))
    expect(dedupeKey('Acme', 'IE')).toBe('acme|ie|')
    expect(urlKey('https://acme.com/careers/job/123/?utm=x')).toBe('acme.com/careers/job/123')
  })

  it('the Apify row and the Workday CSV row key the way the mapper keys them', () => {
    expect(dedupeKey('Walmart', '(USA) Process Engineer', {
      url: 'https://www.linkedin.com/jobs/view/usa-process-engineer-at-walmart-4420761539',
      linkedinJobId: '4420761539',
    })).toBe('walmart|usa process engineer|li:4420761539')
    const workday = 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Houston/IE_R-123?src=x'
    expect(atsReqIdFromUrl(workday)).toBe('R-123')
    expect(dedupeKey('Acme', 'Industrial Engineer', { atsReqId: atsReqIdFromUrl(workday), url: workday })).toBe('acme|industrial engineer|req:r-123')
  })
})

describe('urlparse mimic', () => {
  it('keeps what WHATWG URL would normalise away', () => {
    expect(pyUrlparse('https://acme.taleo.net/x/jobdetail.ftl;jsessionid=ABC?job=1#f')).toEqual({
      netloc: 'acme.taleo.net',
      path: '/x/jobdetail.ftl',
      query: 'job=1',
    })
    expect(pyUrlparse('https://User@Host.com:8443/A%20B/../c')).toEqual({ netloc: 'User@Host.com:8443', path: '/A%20B/../c', query: '' })
    expect(pyUrlparse('https://[bad/x')).toBeNull()
    expect(pyUrlparse('mailto:x@y')).toEqual({ netloc: '', path: 'x@y', query: '' })
  })

  it('never throws on junk', () => {
    for (const junk of ['', ' ', '::', 'http://', '//', '?', '#', 'https://acme.com/%zz', String(null)]) {
      expect(() => urlKey(junk)).not.toThrow()
      expect(() => dedupeKey('a', 'b', { url: junk })).not.toThrow()
    }
  })
})
