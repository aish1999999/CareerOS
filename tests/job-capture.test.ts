import { describe, expect, it } from 'vitest'
import { JOB_ATS, JOB_SOURCE } from '@contract/entities'
import { CAPTURE_MATRIX, buildJobRow, extractJobCapture, grabPage, manualCapture, type JobCapture } from '@/lib/job-capture'

// Stage 4 part 2 — the capture matrix from real-shaped pages. Every fixture is
// synthetic but follows the platform's markup; the Stage 4 gate is the four
// sources (LinkedIn, Workday, Greenhouse, a plain company site) → correct
// source / ats / fields_present / dedupe_key.

const LONG = 'Own daily production, run root cause analysis on casting defects, SPC on melt chemistry, coordinate NDT and CAPA, and drive first-pass yield across the foundry. '.repeat(3)

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function row(capture: JobCapture): Record<string, unknown> {
  const built = buildJobRow(capture)
  if ('problem' in built) throw new Error(built.problem)
  return built.row as unknown as Record<string, unknown>
}

const ALL_CAPTURED = Object.fromEntries(CAPTURE_MATRIX.map((f) => [f, 'captured']))

// ---------------------------------------------------------------------------

const LINKEDIN_LOGGED_IN = `
<html><head><title>(2) (USA) Process Engineer | Walmart | LinkedIn</title></head><body>
<nav><a href="/jobs/remote/">Remote</a><a href="/jobs/">Jobs</a></nav>
<div class="job-view-layout">
  <div class="job-details-jobs-unified-top-card__container">
    <h1 class="job-details-jobs-unified-top-card__job-title">(USA) Process Engineer with verification</h1>
    <div class="job-details-jobs-unified-top-card__company-name"><a href="/company/walmart/">Walmart</a></div>
    <div class="job-details-jobs-unified-top-card__primary-description-container">
      <span class="job-details-jobs-unified-top-card__bullet">Mount Crawford, VA</span><span> · </span>
      <span class="tvm__text">2 days ago</span><span> · </span><span class="tvm__text">168 applicants</span>
    </div>
    <ul><li class="job-details-jobs-unified-top-card__job-insight"><span>Hybrid</span> <span>Full-time</span> <span>Mid-Senior level</span></li></ul>
    <button aria-pressed="false">Remote</button>
  </div>
  <div id="job-details"><p>${LONG}</p><p>We are unable to sponsor visas for this role. Requisition ID: R-4471. 5+ years of experience required; 2-3 years with SPC preferred.</p></div>
  <section class="similar-jobs"><h2>Similar jobs</h2><ul><li>Quality Engineer · Acme · 5 days ago · 40 applicants</li></ul></section>
</div></body></html>`

const LINKEDIN_URL = 'https://www.linkedin.com/jobs/view/usa-process-engineer-at-walmart-4420761539/?refId=x'

describe('LinkedIn, logged-in detail pane (no JSON-LD)', () => {
  const capture = extractJobCapture(docFrom(LINKEDIN_LOGGED_IN), LINKEDIN_URL)

  it('classifies and reads the top card', () => {
    expect(capture).toMatchObject({
      source: 'linkedin', ats: 'unknown', adapter: 'linkedin', matchedBy: 'linkedin',
      title: '(USA) Process Engineer', company: 'Walmart', location: 'Mount Crawford, VA',
      postedAgeText: '2 days ago', applicantCount: 168, workType: 'hybrid', experienceLevel: 'Mid-Senior level',
      employmentType: 'Full-time', atsReqId: null, sector: null,
    })
    expect(capture.layers).toMatchObject({ title: 'adapter', company: 'adapter', description: 'adapter', posted_age_text: 'text', work_type: 'text' })
  })

  it('keys like the Apify row of the same posting and derives what the mapper derives', () => {
    const r = row(capture)
    expect(r.dedupe_key).toBe('walmart|usa process engineer|li:4420761539')
    expect(r).toMatchObject({ source: 'linkedin', captured_by: 'extension', sponsorship: 'not_available', experience_years_min: 2 })
    expect(r).not.toHaveProperty('ats_req_id')
    expect(r).not.toHaveProperty('status')
    expect(r).not.toHaveProperty('user_id')
    expect(r).not.toHaveProperty('citizen_required')
    expect(r.fields_present).toEqual({
      ...ALL_CAPTURED, sponsorship: 'derived', posted_at: 'derived', sector: 'missing',
    })
    const raw = r.raw as Record<string, unknown>
    expect(raw._layers).toMatchObject({ sponsorship: 'derived', experience_years_min: 'derived' })
    expect(raw).not.toHaveProperty('description')
    expect(JSON.stringify(raw)).not.toMatch(/<[a-z]/)
  })
})

const LINKEDIN_PUBLIC = `
<html><head><title>Walmart hiring (USA) Process Engineer in Mount Crawford, VA | LinkedIn</title>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'JobPosting', title: '(USA) Process Engineer',
  hiringOrganization: { '@type': 'Organization', name: 'Walmart' },
  jobLocation: { '@type': 'Place', address: { addressLocality: 'Mount Crawford', addressRegion: 'VA', addressCountry: 'US' } },
  datePosted: '2026-08-30T00:00:00.000Z', industry: 'Retail', employmentType: 'FULL_TIME',
  identifier: { '@type': 'PropertyValue', name: 'LinkedIn', value: '4420761539' },
  description: `<p>${LONG}</p><ul><li>SPC</li><li>CAPA &amp; NDT</li></ul><p>Sponsorship is available for the right candidate.</p>`,
})}</script></head><body>
<h1 class="top-card-layout__title">(USA) Process Engineer</h1>
<span class="posted-time-ago__text">2 days ago</span>
<ul class="description__job-criteria-list">
  <li class="description__job-criteria-item"><h3 class="description__job-criteria-subheader">Seniority level</h3><span class="description__job-criteria-text">Mid-Senior level</span></li>
  <li class="description__job-criteria-item"><h3 class="description__job-criteria-subheader">Industries</h3><span class="description__job-criteria-text">Retail</span></li>
</ul>
<div class="show-more-less-html__markup"><p>${LONG.slice(0, 250)}…see more</p></div>
</body></html>`

describe('LinkedIn, public page (JSON-LD)', () => {
  const capture = extractJobCapture(docFrom(LINKEDIN_PUBLIC), 'https://www.linkedin.com/jobs/search/?currentJobId=4420761539')

  it('takes the structured data and the criteria list', () => {
    expect(capture).toMatchObject({
      source: 'linkedin', title: '(USA) Process Engineer', company: 'Walmart', location: 'Mount Crawford, VA',
      postedAt: '2026-08-30', sector: 'Retail', experienceLevel: 'Mid-Senior level', employmentType: 'FULL_TIME',
      postedAgeText: '2 days ago', atsReqId: null, linkedinJobId: '4420761539',
    })
    expect(capture.layers.description).toBe('jsonld') // the clamped container lost to the full JSON-LD text
    expect(capture.description).toContain('• CAPA & NDT')
    expect(capture.description).toContain('\n')
    expect(capture.description).not.toContain('&amp;')
    expect(capture.description).not.toMatch(/see more/i)
  })

  it('shares the key with the logged-in page and the Apify row', () => {
    const r = row(capture)
    expect(r.dedupe_key).toBe('walmart|usa process engineer|li:4420761539')
    expect(r).toMatchObject({ posted_at: '2026-08-30', sponsorship: 'available' })
    expect((r.fields_present as Record<string, string>).posted_at).toBe('captured')
    expect((r.raw as Record<string, unknown>)._posting).toMatchObject({ '@type': 'JobPosting', industry: 'Retail' })
    expect((r.raw as Record<string, unknown>)._posting).not.toHaveProperty('description')
  })
})

describe('LinkedIn guards', () => {
  it('"Be among the first 25 applicants" is not a count', () => {
    const html = LINKEDIN_LOGGED_IN.replace('168 applicants', 'Be among the first 25 applicants')
    const capture = extractJobCapture(docFrom(html), LINKEDIN_URL)
    expect(capture.applicantCount).toBeNull()
    expect(capture.applicantText).toBe('Be among the first 25 applicants')
    const r = row(capture)
    expect(r).not.toHaveProperty('applicant_count')
    expect((r.fields_present as Record<string, string>).applicant_count).toBe('missing')
    expect((r.raw as Record<string, unknown>)._applicants_text).toBe('Be among the first 25 applicants')
  })

  it('a requisition id in the JD never becomes the key on LinkedIn', () => {
    const capture = extractJobCapture(docFrom(LINKEDIN_LOGGED_IN), 'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4420761539')
    expect(capture.atsReqId).toBeNull()
    expect(row(capture).dedupe_key).toBe('walmart|usa process engineer|li:4420761539')
  })

  it('a clamped container is flagged when nothing fuller exists', () => {
    const html = LINKEDIN_LOGGED_IN.replace(`<p>${LONG}</p>`, `<p>${LONG.slice(0, 230)}…see more</p>`).replace(/<p>We are unable[^<]*<\/p>/, '')
      + '<button class="show-more-less-button">See more</button>'
    const capture = extractJobCapture(docFrom(html), LINKEDIN_URL)
    expect(capture.truncated).toBe(true)
    expect(capture.description).not.toMatch(/see more/i)
  })
})

// ---------------------------------------------------------------------------

const WORKDAY = `
<html><head><title>Industrial Engineer</title><meta property="og:site_name" content="Acme Careers"></head><body>
<header><nav><a href="/en-US/careers">Careers</a></nav></header>
<main>
  <h2 data-automation-id="jobPostingHeader">Industrial Engineer</h2>
  <dl>
    <div data-automation-id="locations"><dt>locations</dt><dd>Houston, TX</dd></div>
    <div data-automation-id="time"><dt>time type</dt><dd>Full time</dd></div>
    <div data-automation-id="postedOn"><dt>posted on</dt><dd>Posted 3 Days Ago</dd></div>
    <div data-automation-id="requisitionId"><dt>job requisition id</dt><dd>R-123</dd></div>
  </dl>
  <div data-automation-id="jobPostingDescription"><p>${LONG}</p><p>US citizenship is required for this position. Minimum 5 years of experience.</p></div>
</main></body></html>`

describe('Workday', () => {
  const url = 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Houston/IE_R-123?src=x'
  const capture = extractJobCapture(docFrom(WORKDAY), url)

  it('reads the automation ids and the requisition id', () => {
    expect(capture).toMatchObject({
      source: 'ats_portal', ats: 'workday', matchedBy: 'host', title: 'Industrial Engineer', company: 'Acme',
      location: 'Houston, TX', postedAgeText: '3 Days Ago', postedAt: null, atsReqId: 'R-123', workType: null,
    })
    expect(capture.layers).toMatchObject({ title: 'adapter', company: 'meta', description: 'adapter', posted_age_text: 'adapter', ats_req_id: 'adapter' })
  })

  it('keys on the requisition id and marks posted_at derived', () => {
    const r = row(capture)
    expect(r.dedupe_key).toBe('acme|industrial engineer|req:r-123')
    expect(r).toMatchObject({ ats: 'workday', ats_req_id: 'R-123', citizen_required: true, experience_years_min: 5, posted_age_text: '3 Days Ago' })
    expect(r).not.toHaveProperty('sponsorship')
    expect(r).not.toHaveProperty('posted_at')
    expect(r.fields_present).toMatchObject({ posted_at: 'derived', posted_age_text: 'captured', sponsorship: 'missing', applicant_count: 'missing' })
  })

  it('the /careers/details/<slug>_<req>/apply spelling and the tenant slug fallback give the same key', () => {
    const html = WORKDAY.replace('<meta property="og:site_name" content="Acme Careers">', '').replace(/<div data-automation-id="requisitionId">.*?<\/div>/, '')
    const capture2 = extractJobCapture(docFrom(html), 'https://acme.wd5.myworkdayjobs.com/careers/details/Industrial-Engineer_R-123/apply')
    expect(capture2.company).toBe('acme')
    expect(capture2.layers.company).toBe('url')
    expect(capture2.atsReqId).toBe('R-123')
    expect(row(capture2).dedupe_key).toBe('acme|industrial engineer|req:r-123')
  })
})

// ---------------------------------------------------------------------------

const GREENHOUSE_LD = JSON.stringify({
  '@type': 'JobPosting', title: 'Senior Frontend Engineer',
  hiringOrganization: { '@type': 'Organization', name: 'Hooli' },
  jobLocation: { address: { addressLocality: 'San Francisco' } },
})
const GREENHOUSE_CONTENT = `
<div id="content">
  <div id="header"><a href="/hooli">Hooli</a></div>
  <h1 class="app-title">Senior Frontend Engineer</h1>
  <div class="company-name">at Hooli</div>
  <div class="location">San Francisco (Remote)</div>
  <div id="job-description-body"><p>${LONG}</p></div>
  <div id="application"><h2 class="section-header">Apply for this job</h2><form><label for="first_name">First Name *</label><input id="first_name"></form></div>
</div>`
const GREENHOUSE = `<html><head><title>Job Application for Senior Frontend Engineer at Hooli</title><script type="application/ld+json">${GREENHOUSE_LD}</script></head><body>${GREENHOUSE_CONTENT}</body></html>`

describe('Greenhouse', () => {
  it('the board: JSON-LD company, req id from the URL, form cut out of the description', () => {
    const capture = extractJobCapture(docFrom(GREENHOUSE), 'https://boards.greenhouse.io/hooli/jobs/4020')
    expect(capture).toMatchObject({
      source: 'ats_portal', ats: 'greenhouse', title: 'Senior Frontend Engineer', company: 'Hooli', location: 'San Francisco',
      atsReqId: '4020', workType: null,
    })
    expect(capture.description).not.toContain('First Name')
    expect(capture.description).not.toContain('Apply for this job')
    expect(row(capture).dedupe_key).toBe('hooli|senior frontend engineer|req:4020')
  })

  it('the embedded board on a company domain: fingerprinted, description from the frame, same key', () => {
    const top = docFrom(`<html><head><title>Careers — Hooli</title><script src="https://boards.greenhouse.io/embed/job_board/js?for=hooli"></script></head>
      <body><h1>Join Hooli</h1><div id="grnhse_app"><iframe src="https://boards.greenhouse.io/embed/job_app?for=hooli&token=4020"></iframe></div></body></html>`)
    const frame = docFrom(`<html><head><script type="application/ld+json">${GREENHOUSE_LD}</script></head><body>${GREENHOUSE_CONTENT}</body></html>`)
    const capture = extractJobCapture(top, 'https://hooli.com/careers?gh_jid=4020', {
      frames: [{ url: 'https://boards.greenhouse.io/embed/job_app?for=hooli&token=4020', doc: frame }],
    })
    expect(capture).toMatchObject({ source: 'company_site', ats: 'greenhouse', matchedBy: 'fingerprint', companyDomain: 'hooli.com', atsReqId: '4020', company: 'Hooli' })
    expect(capture.descriptionFrame).toContain('job_app')
    expect(capture.description).toContain('Own daily production')
    const r = row(capture)
    expect(r.dedupe_key).toBe('hooli|senior frontend engineer|req:4020')
    expect(r.company_domain).toBe('hooli.com')
    expect((r.raw as Record<string, unknown>)._description_frame).toContain('token=4020')
  })
})

// ---------------------------------------------------------------------------

describe('Oracle CX on a vanity domain', () => {
  const BASE_MARKER = '<base href="/en/sites/ExampleMfg" data-apibaseurl="https://ibqbjb.fa.ocs.oraclecloud.com:443" data-vanitybaseurl="https://careers.example-mfg.com/" data-sitenumber="CX_1">'
  const html = `<html><head>${BASE_MARKER}<title>Senior Industrial Engineer</title><meta property="og:site_name" content="ExampleMfg Careers"></head><body>
    <h1 class="job-details__title">Senior Industrial Engineer</h1>
    <div class="job-details__meta"><span>Job Identification</span><span>153676</span><span>Posting Date</span><span>09/01/2026, 08:00 AM</span></div>
    <div class="job-details__description-content"><p>${LONG}</p></div></body></html>`
  const capture = extractJobCapture(docFrom(html), 'https://careers.example-mfg.com/en/sites/ExampleMfg/jobs/preview/153676')

  it('fingerprints the platform, cleans the company, keys on the req id', () => {
    expect(capture).toMatchObject({ source: 'company_site', ats: 'oracle', matchedBy: 'fingerprint', company: 'ExampleMfg', title: 'Senior Industrial Engineer', atsReqId: '153676', companyDomain: 'example-mfg.com' })
    expect(row(capture).dedupe_key).toBe('examplemfg|senior industrial engineer|req:153676')
  })
})

// ---------------------------------------------------------------------------

describe('a plain company careers page', () => {
  const html = `<html><head><title>Industrial Engineer - Acme</title></head><body>
    <nav><a href="/remote">Remote</a><a href="/careers">Careers</a></nav>
    <p class="marketing">100+ applicants use our platform daily</p>
    <h1>Industrial Engineer</h1>
    <article><p>${LONG}</p></article>
    <section class="comments"><p>Posted 5 days ago</p><span>Hybrid</span></section>
    <footer>© Acme</footer></body></html>`
  const capture = extractJobCapture(docFrom(html), 'https://www.acme.com/careers/job/123/?utm=x')

  it('falls back to the title heuristics and the semantic ladder, and nothing leaks from nav / comments', () => {
    expect(capture).toMatchObject({
      source: 'company_site', ats: 'unknown', matchedBy: 'none', adapter: 'generic', title: 'Industrial Engineer', company: 'Acme',
      companyDomain: 'acme.com', workType: null, applicantCount: null, postedAgeText: null, atsReqId: null,
    })
    expect(capture.layers).toMatchObject({ title: 'title', company: 'title', description: 'article' })
    const r = row(capture)
    expect(r.dedupe_key).toBe('acme|industrial engineer|acme.com/careers/job/123')
    expect(r.fields_present).toEqual({
      ...ALL_CAPTURED, experience_level: 'missing', sponsorship: 'missing', posted_at: 'missing', posted_age_text: 'missing',
      work_type: 'missing', sector: 'missing', location: 'missing', applicant_count: 'missing',
    })
  })
})

// ---------------------------------------------------------------------------

describe('schema.org microdata (SuccessFactors career site on a company domain)', () => {
  const html = `<html><head><title>Process Engineer</title><link rel="stylesheet" href="https://rmkcdn.successfactors.com/acme/site.css"></head><body>
    <div itemscope itemtype="http://schema.org/JobPosting">
      <h1 itemprop="title">Process Engineer</h1>
      <span itemprop="hiringOrganization" itemscope itemtype="http://schema.org/Organization"><span itemprop="name">Acme</span></span>
      <span itemprop="jobLocation" itemscope itemtype="http://schema.org/Place"><span itemprop="address" itemscope itemtype="http://schema.org/PostalAddress"><span itemprop="addressLocality">Houston</span>, <span itemprop="addressRegion">TX</span></span></span>
      <meta itemprop="datePosted" content="2026-09-01">
      <span itemprop="employmentType">Full-time</span>
      <div itemprop="description"><p>${LONG}</p></div>
    </div></body></html>`
  const capture = extractJobCapture(docFrom(html), 'https://jobs.acme.com/job/Houston-Process-Engineer-TX-77001/1234567/')

  it('reads the microdata and fingerprints the platform', () => {
    expect(capture).toMatchObject({
      source: 'company_site', ats: 'successfactors', matchedBy: 'fingerprint', title: 'Process Engineer', company: 'Acme',
      location: 'Houston, TX', postedAt: '2026-09-01', employmentType: 'Full-time', atsReqId: '1234567', companyDomain: 'acme.com',
    })
    expect(row(capture)).toMatchObject({ dedupe_key: 'acme|process engineer|req:1234567', posted_at: '2026-09-01' })
  })
})

// ---------------------------------------------------------------------------

describe('iCIMS: the posting lives in a frame', () => {
  const top = docFrom(`<html><head><title>Process Engineer | Acme Careers</title></head><body><div id="icims_content_wrapper"><iframe id="icims_content_iframe" src="https://careers-acme.icims.com/jobs/12345/process-engineer/job?in_iframe=1"></iframe></div></body></html>`)
  const frame = docFrom(`<html><body><div class="iCIMS_Header"><h1>Process Engineer</h1></div><div class="iCIMS_JobContent"><p>${LONG}</p></div></body></html>`)
  const capture = extractJobCapture(top, 'https://careers-acme.icims.com/jobs/12345/process-engineer/job', {
    frames: [{ url: 'https://careers-acme.icims.com/jobs/12345/process-engineer/job?in_iframe=1', doc: frame }],
  })

  it('takes the frame for the description and the title, the cleaned page title for the company', () => {
    expect(capture).toMatchObject({ source: 'ats_portal', ats: 'icims', title: 'Process Engineer', company: 'Acme', atsReqId: '12345' })
    expect(capture.descriptionFrame).toContain('in_iframe=1')
    expect(capture.layers).toMatchObject({ company: 'title', title: 'adapter' })
    expect(row(capture).dedupe_key).toBe('acme|process engineer|req:12345')
  })

  it('falls back to the tenant slug when the page names nothing', () => {
    const bare = docFrom('<html><head><title>Job Details</title></head><body><iframe id="icims_content_iframe" src="https://careers-acme.icims.com/jobs/12345/x/job?in_iframe=1"></iframe></body></html>')
    const capture2 = extractJobCapture(bare, 'https://careers-acme.icims.com/jobs/12345/process-engineer/job', {
      frames: [{ url: 'https://careers-acme.icims.com/jobs/12345/process-engineer/job?in_iframe=1', doc: frame }],
    })
    expect(capture2).toMatchObject({ company: 'acme', title: 'Process Engineer' })
    expect(capture2.layers.company).toBe('url')
  })
})

// ---------------------------------------------------------------------------

describe('field guards', () => {
  const base = (extra: string, ld: Record<string, unknown> = {}) => docFrom(`<html><head><title>Engineer at Acme</title>
    <script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', title: 'Engineer', hiringOrganization: 'Acme', description: `<p>${LONG}</p>`, ...ld })}</script></head>
    <body><h1>Engineer</h1>${extra}<article><p>${LONG}</p></article></body></html>`)

  it('jobLocationType TELECOMMUTE → remote; a lone Director pill is not a level; Posted Today parses', () => {
    const capture = extractJobCapture(base('<span>Director</span><span>Posted Today</span>', { jobLocationType: 'TELECOMMUTE' }), 'https://www.acme.com/jobs/1')
    expect(capture).toMatchObject({ workType: 'remote', experienceLevel: null, postedAgeText: 'Today' })
    expect(capture.layers.work_type).toBe('jsonld')
  })

  it('labelled level and workplace type, a posted date; a page-only req id is recorded, never the key', () => {
    const capture = extractJobCapture(base('<dl><dt>Seniority level</dt><dd>Associate</dd><dt>Workplace type</dt><dd>On-site</dd><dt>Posted on</dt><dd>9/1/2026</dd><dt>Job ID</dt><dd>2026-12345</dd></dl>'), 'https://www.acme.com/jobs/1')
    expect(capture).toMatchObject({ experienceLevel: 'Associate', workType: 'onsite', postedAt: '2026-09-01', atsReqId: '2026-12345' })
    const r = row(capture)
    expect(r.dedupe_key).toBe('acme|engineer|acme.com/jobs/1') // a CSV of the same URL keys the same way
    expect(r).not.toHaveProperty('ats_req_id')
    expect((r.raw as Record<string, unknown>)._page_req_id).toBe('2026-12345')
  })

  it('a Workday page whose URL carries the id keys on it, and a page-only Workday id stays in raw', () => {
    const withUrlId = extractJobCapture(docFrom(WORKDAY), 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Austin-TX/Industrial-Engineer_R-123-1')
    expect(row(withUrlId)).toMatchObject({ ats_req_id: 'R-123-1', dedupe_key: 'acme|industrial engineer|req:r-123-1' })
    expect((row(withUrlId).raw as Record<string, unknown>)._page_req_id).toBe('R-123')
    const noUrlId = extractJobCapture(docFrom(WORKDAY), 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Houston/Industrial-Engineer')
    expect(row(noUrlId).dedupe_key).toBe('acme|industrial engineer|acme.wd5.myworkdayjobs.com/en-us/careers/job/houston/industrial-engineer')
    expect((row(noUrlId).raw as Record<string, unknown>)._page_req_id).toBe('R-123')
  })

  it('a double-encoded JSON-LD description comes out as text', () => {
    const capture = extractJobCapture(base('', { description: `&lt;p&gt;${LONG}&lt;/p&gt;&lt;ul&gt;&lt;li&gt;SPC&lt;/li&gt;&lt;/ul&gt;` }), 'https://www.acme.com/jobs/1')
    expect(capture.description).toContain('• SPC')
    expect(capture.description).not.toMatch(/&lt;|<\/?p>/)
  })

  it('a canonical URL only when it points elsewhere', () => {
    const same = extractJobCapture(base('', { url: 'https://www.acme.com/jobs/1?ref=ld' }), 'https://www.acme.com/jobs/1')
    expect(same.canonicalUrl).toBeNull()
    const other = extractJobCapture(base('', { url: 'https://acme.wd5.myworkdayjobs.com/careers/job/Houston/IE_R-9' }), 'https://www.acme.com/jobs/1')
    expect(other.canonicalUrl).toContain('myworkdayjobs')
    expect(row(other).canonical_url).toContain('myworkdayjobs')
  })
})

describe('refusals and hygiene', () => {
  it('names the missing must-have', () => {
    expect(buildJobRow({ ...manualCapture(), title: null, company: 'Acme', description: LONG })).toEqual({ problem: 'missing title' })
    expect(buildJobRow({ ...manualCapture(), title: 'IE', company: '  ', description: LONG })).toEqual({ problem: 'missing company' })
    const short = buildJobRow({ ...manualCapture(), title: 'IE', company: 'Acme', description: 'too short' })
    expect('problem' in short && short.problem).toMatch(/only 9 characters/)
    const none = buildJobRow({ ...manualCapture(), title: 'IE', company: 'Acme', description: null })
    expect('problem' in none && none.problem).toMatch(/no job description/)
  })

  it('a manual row keys on the description hash and carries only contract columns', () => {
    const built = buildJobRow({ ...manualCapture(), title: 'Manufacturing Engineer', company: 'Unknown', description: LONG })
    if ('problem' in built) throw new Error(built.problem)
    const r = built.row as unknown as Record<string, unknown>
    expect(r.dedupe_key).toBe('unknown|manufacturing engineer|desc:991fb0f9c7d2') // the Python vector
    expect(r).toMatchObject({ source: 'manual', ats: 'unknown', captured_by: 'extension' })
    expect(Object.values(r)).not.toContain(null)
    expect(r.fields_present).toEqual({ ...ALL_CAPTURED, experience_level: 'missing', sponsorship: 'missing', posted_at: 'missing', posted_age_text: 'missing', source_url: 'missing', work_type: 'missing', sector: 'missing', location: 'missing', applicant_count: 'missing' })
    expect((r.raw as Record<string, unknown>)._origin).toBe('tailor-form')
  })

  it('every source / ats it emits is in the contract enums', () => {
    for (const html of [LINKEDIN_LOGGED_IN, WORKDAY, GREENHOUSE]) {
      const c = extractJobCapture(docFrom(html), 'https://www.example.com/x')
      expect(JOB_SOURCE).toContain(c.source)
      expect(JOB_ATS).toContain(c.ats)
    }
  })

  it('never throws on empty or odd documents', () => {
    for (const html of ['', '<title>x</title>', '<html><body><div>'.repeat(50), '<p>' + 'x'.repeat(3_000_000)]) {
      const c = extractJobCapture(docFrom(html), 'not a url')
      expect(c.source).toBe('company_site')
      expect('problem' in buildJobRow(c)).toBe(true)
    }
  })
})

describe('grabPage (the injected function) under jsdom', () => {
  it('keeps JSON-LD, drops styles and inline scripts, inlines an open shadow root', () => {
    document.head.innerHTML = '<title>T</title><style>.x{}</style><script type="application/ld+json">{"@type":"JobPosting"}</script><script>window.__x = 1</script><link rel="stylesheet" href="/a.css">'
    document.body.innerHTML = '<span class="visually-hidden">twice</span><div id="host"></div><p>' + 'visible text '.repeat(30) + '</p>'
    const host = document.getElementById('host') as HTMLElement
    host.attachShadow({ mode: 'open' }).innerHTML = '<p>shadow text</p>'
    const page = grabPage()
    expect(page).not.toBeNull()
    expect(page?.top).toBe(true)
    expect(page?.html).toContain('application/ld+json')
    expect(page?.html).toContain('shadow text')
    expect(page?.html).toContain('a.css')
    expect(page?.html).not.toContain('<style')
    expect(page?.html).not.toContain('window.__x')
    expect(page?.html).not.toContain('twice')
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })
})
