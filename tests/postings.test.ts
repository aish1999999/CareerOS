import { describe, expect, it } from 'vitest'
import { classifyPosting, fingerprintAts } from '@/content/adapters/postings/index'
import { blockText, blockTextExcluding, cleanCompany, companyDomain, parsePostedAge, tenantSlug } from '@/content/adapters/postings/dom'

// Stage 4 part 2 — source classification (host → fingerprint → none) and the DOM helpers.

const doc = (html = ''): Document => new DOMParser().parseFromString(html, 'text/html')
const cls = (url: string, html = '', frames: { url: string; doc: Document }[] = []) => classifyPosting(new URL(url), doc(html), frames)

describe('classifyPosting by host', () => {
  it.each([
    ['https://www.linkedin.com/jobs/view/4420761539/', 'linkedin', 'unknown', 'linkedin', 'linkedin'],
    ['https://linkedin.com/jobs/search/?currentJobId=1', 'linkedin', 'unknown', 'linkedin', 'linkedin'],
    ['https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Houston/IE_R-123', 'ats_portal', 'workday', 'host', 'workday'],
    ['https://acme.wd1.myworkdaysite.com/recruiting/acme/careers/job/x', 'ats_portal', 'workday', 'host', 'workday'],
    ['https://boards.greenhouse.io/hooli/jobs/4020', 'ats_portal', 'greenhouse', 'host', 'greenhouse'],
    ['https://job-boards.greenhouse.io/hooli/jobs/4020', 'ats_portal', 'greenhouse', 'host', 'greenhouse'],
    ['https://careers-acme.icims.com/jobs/12345/x/job', 'ats_portal', 'icims', 'host', 'icims'],
    ['https://career5.successfactors.eu/career?company=acme', 'ats_portal', 'successfactors', 'host', 'successfactors'],
    ['https://xyz.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/1', 'ats_portal', 'oracle', 'host', 'oracle'],
    ['https://acme.taleo.net/careersection/2/jobdetail.ftl?job=1', 'ats_portal', 'taleo', 'host', 'generic'],
    ['https://jobs.lever.co/acme/1c2d3e4f', 'ats_portal', 'lever', 'host', 'generic'],
    ['https://jobs.ashbyhq.com/acme/1c2d3e4f', 'ats_portal', 'ashby', 'host', 'generic'],
    ['https://jobs.smartrecruiters.com/Acme/1', 'ats_portal', 'smartrecruiters', 'host', 'generic'],
    ['https://jobs.jobvite.com/acme/job/o1', 'ats_portal', 'jobvite', 'host', 'generic'],
    ['https://acme.bamboohr.com/careers/1', 'ats_portal', 'bamboohr', 'host', 'generic'],
    ['https://acme.eightfold.ai/careers/job/1', 'ats_portal', 'eightfold', 'host', 'generic'],
    ['https://www.acme.com/careers/job/1', 'company_site', 'unknown', 'none', 'generic'],
    ['https://notlinkedin.com/jobs/view/1', 'company_site', 'unknown', 'none', 'generic'],
  ])('%s → %s / %s (%s, adapter %s)', (url, source, ats, matchedBy, adapter) => {
    const c = cls(url)
    expect(c).toMatchObject({ source, ats, matchedBy })
    expect(c.adapter.name).toBe(adapter)
  })

  it('only company_site pages carry a company domain', () => {
    expect(cls('https://careers.example-mfg.com/en/x').companyDomain).toBe('example-mfg.com')
    expect(cls('https://www.acme.com/careers/1').companyDomain).toBe('acme.com')
    expect(cls('https://acme.wd5.myworkdayjobs.com/x').companyDomain).toBeNull()
    expect(cls('https://www.linkedin.com/jobs/view/1').companyDomain).toBeNull()
  })
})

describe('classifyPosting by fingerprint (a platform on a company domain)', () => {
  const ORACLE = '<html><head><base href="/en/sites/X" data-apibaseurl="https://ibqbjb.fa.ocs.oraclecloud.com:443"></head><body></body></html>'
  it('Oracle CX from the registry marker', () => {
    expect(cls('https://careers.example-mfg.com/en/sites/X/jobs/preview/1', ORACLE)).toMatchObject({ source: 'company_site', ats: 'oracle', matchedBy: 'fingerprint', companyDomain: 'example-mfg.com' })
    expect(cls('https://careers.example-mfg.com/en/sites/X/jobs/preview/1', ORACLE).adapter.name).toBe('oracle')
  })
  it('Greenhouse from the embed script, the embed frame, or ?gh_jid=', () => {
    expect(cls('https://hooli.com/careers', '<script src="https://boards.greenhouse.io/embed/job_board/js?for=hooli"></script>')).toMatchObject({ ats: 'greenhouse', matchedBy: 'fingerprint' })
    expect(cls('https://hooli.com/careers', '<iframe src="https://boards.greenhouse.io/embed/job_app?for=hooli&token=1"></iframe>')).toMatchObject({ ats: 'greenhouse' })
    expect(cls('https://hooli.com/careers?gh_jid=4020')).toMatchObject({ source: 'company_site', ats: 'greenhouse', matchedBy: 'fingerprint' })
  })
  it('SuccessFactors from its CDN, iCIMS from its frame, Workday from an embedded board, any ATS from a frame URL', () => {
    expect(cls('https://jobs.acme.com/job/x/1', '<link rel="stylesheet" href="https://rmkcdn.successfactors.com/acme/a.css">')).toMatchObject({ ats: 'successfactors' })
    expect(cls('https://careers.acme.com/jobs', '<iframe id="icims_content_iframe" src="https://careers-acme.icims.com/jobs/1/x/job?in_iframe=1"></iframe>')).toMatchObject({ ats: 'icims' })
    expect(cls('https://careers.acme.com/jobs', '<iframe src="https://acme.wd5.myworkdayjobs.com/en-US/careers"></iframe>')).toMatchObject({ ats: 'workday' })
    expect(cls('https://careers.acme.com/jobs', '', [{ url: 'https://acme.taleo.net/careersection/x', doc: doc() }])).toMatchObject({ ats: 'taleo', matchedBy: 'fingerprint' })
  })
  it('a plain page has no fingerprint', () => {
    expect(fingerprintAts('www.acme.com', doc('<html><body><iframe src="https://www.youtube.com/embed/x"></iframe><script src="/app.js"></script></body></html>'))).toBeNull()
  })
})

describe('dom helpers', () => {
  it('parsePostedAge keeps what the page shows, minus the label', () => {
    expect(parsePostedAge('Posted 3 Days Ago')).toBe('3 Days Ago')
    expect(parsePostedAge('Reposted 2 weeks ago')).toBe('2 weeks ago')
    expect(parsePostedAge('Posted Today')).toBe('Today')
    expect(parsePostedAge('30+ days ago')).toBe('30+ days ago')
    expect(parsePostedAge('posted on yesterday.')).toBe('yesterday')
    expect(parsePostedAge('an hour ago')).toBe('an hour ago')
    expect(parsePostedAge('Posted on 9/1/2026')).toBeNull()
    expect(parsePostedAge('Days ago')).toBeNull()
    expect(parsePostedAge('')).toBeNull()
  })

  it('cleanCompany strips the page furniture, never the name', () => {
    expect(cleanCompany('at Hooli')).toBe('Hooli')
    expect(cleanCompany('Honeywell Careers')).toBe('Honeywell')
    expect(cleanCompany('ExampleMfg Careers')).toBe('ExampleMfg')
    expect(cleanCompany('Acme, Inc. | Jobs')).toBe('Acme, Inc.')
    expect(cleanCompany('Acme Talent Acquisition')).toBe('Acme')
    expect(cleanCompany('Jobs at Acme')).toBe('Acme')
    expect(cleanCompany('Walmart')).toBe('Walmart')
    expect(cleanCompany('Careers')).toBeNull()
    expect(cleanCompany('')).toBeNull()
    expect(cleanCompany(null)).toBeNull()
  })

  it('tenantSlug and companyDomain', () => {
    expect(tenantSlug('acme.wd5.myworkdayjobs.com', 'workday')).toBe('acme')
    expect(tenantSlug('careers-acme.icims.com', 'icims')).toBe('acme')
    expect(tenantSlug('acme.icims.com', 'icims')).toBe('acme')
    expect(tenantSlug('www.acme.com', 'workday')).toBeNull()
    expect(companyDomain('careers.example-mfg.com')).toBe('example-mfg.com')
    expect(companyDomain('www.acme.com')).toBe('acme.com')
    expect(companyDomain('localhost')).toBeNull()
  })

  it('blockText breaks at blocks and bullets, blockTextExcluding cuts subtrees', () => {
    const el = doc('<div id="d">Responsibilities:<ul><li>Own production</li><li>Run <b>RCA</b></li></ul><form><label>First name</label></form><p>End.</p></div>').getElementById('d')
    expect(blockText(el)).toBe('Responsibilities:\n\n• Own production\n• Run RCA\n\nFirst name\n\nEnd.')
    expect(blockTextExcluding(el, ['form'])).toBe('Responsibilities:\n\n• Own production\n• Run RCA\n\nEnd.')
    expect(blockText(doc('<div>a<br>b<div>c</div><span>d</span> <span>e</span></div>').body)).toBe('a\nb\nc\nd e')
  })
})
