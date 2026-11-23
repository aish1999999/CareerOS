import { describe, expect, it } from 'vitest'
import { parseLinkedInProfile, suggestAgeBracket, suggestGender } from '@/content/adapters/linkedin/profile'

// Stage 8 — the LinkedIn profile parser and its two suggestions.
//
// The .mhtml profiles Bob saves are gitignored, so the fixtures are written here: small,
// but shaped like the real page (the anchor div per card, every string printed twice —
// once aria-hidden, once .visually-hidden — the "· Full-time" suffixes, the grouped
// employer with its roles nested, the description bullets in a nested list).

const doc = (html = ''): Document => new DOMParser().parseFromString(html, 'text/html')

// -- a full profile ------------------------------------------------------------------

const FULL = `
<html>
<head>
  <title>Priya Raman | LinkedIn</title>
  <link rel="canonical" href="https://www.linkedin.com/in/priya-raman/">
</head>
<body>
<nav class="global-nav"><a href="/feed/">Home</a><a href="/mynetwork/">My Network</a></nav>
<main>
  <section class="artdeco-card pv-top-card">
    <div class="ph5 pb5">
      <div class="mt2 relative">
        <div class="flex-1 mt2">
          <h1 class="text-heading-xlarge inline t-24 v-align-middle break-words">Priya Raman, PhD</h1>
          <span class="text-body-small v-align-middle break-words t-black--light">She/Her</span>
        </div>
        <div class="text-body-medium break-words">Reliability Engineering Manager at Nordwind Energy</div>
        <div class="pb2 pv-text-details__left-panel">
          <span class="text-body-small inline t-black--light break-words">Houston, Texas, United States</span>
          <a href="#contact-info" class="link-without-visited-state">Contact info</a>
        </div>
        <ul class="pv-top-card--list"><li class="text-body-small t-black--light">500+ connections</li></ul>
      </div>
    </div>
  </section>

  <section class="artdeco-card">
    <div id="about" class="pv-profile-card__anchor"></div>
    <div class="pvs-header__container">
      <h2 class="pvs-header__title"><span aria-hidden="true">About</span><span class="visually-hidden">About</span></h2>
    </div>
    <div class="display-flex ph5 pv3">
      <div class="inline-show-more-text">
        <span aria-hidden="true">I keep rotating equipment running in plants that cannot stop. Ten years across upstream, LNG and power.</span>
        <span class="visually-hidden">I keep rotating equipment running in plants that cannot stop. Ten years across upstream, LNG and power.</span>
      </div>
      <button class="inline-show-more-text__button">…see more</button>
    </div>
  </section>

  <section class="artdeco-card">
    <div id="experience" class="pv-profile-card__anchor"></div>
    <div class="pvs-header__container">
      <h2 class="pvs-header__title"><span aria-hidden="true">Experience</span><span class="visually-hidden">Experience</span></h2>
    </div>
    <ul class="pvs-list">
      <li class="artdeco-list__item">
        <div class="display-flex flex-column full-width">
          <a class="optional-action-target-wrapper" href="https://www.linkedin.com/company/nordwind-energy/">
            <div class="display-flex align-items-center">
              <span aria-hidden="true"><strong>Reliability Engineering Manager</strong></span>
              <span class="visually-hidden">Reliability Engineering Manager</span>
            </div>
            <span class="t-14 t-normal"><span aria-hidden="true">Nordwind Energy · Full-time</span><span class="visually-hidden">Nordwind Energy · Full-time</span></span>
            <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Mar 2021 - Present · 4 yrs 6 mos</span></span>
            <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Houston, Texas, United States · Hybrid</span></span>
          </a>
          <div class="pvs-list__outer-container">
            <ul class="pvs-list">
              <li class="pvs-list__item"><span aria-hidden="true">Led a nine-person reliability team across three gas plants and cut unplanned downtime by 31%.</span></li>
            </ul>
          </div>
        </div>
      </li>
      <li class="artdeco-list__item">
        <div class="display-flex flex-column full-width">
          <a class="optional-action-target-wrapper" href="https://www.linkedin.com/company/siemens-energy/">
            <div class="display-flex align-items-center">
              <span aria-hidden="true"><strong>Siemens Energy</strong></span>
              <span class="visually-hidden">Siemens Energy</span>
            </div>
            <span class="t-14 t-normal"><span aria-hidden="true">Full-time · 4 yrs 9 mos</span></span>
            <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Houston, Texas</span></span>
          </a>
          <div class="pvs-list__outer-container">
            <ul class="pvs-list">
              <li class="pvs-list__paged-list-item">
                <div><span aria-hidden="true"><strong>Senior Reliability Engineer</strong></span></div>
                <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Jun 2018 - Feb 2021 · 2 yrs 9 mos</span></span>
              </li>
              <li class="pvs-list__paged-list-item">
                <div><span aria-hidden="true"><strong>Reliability Engineer</strong></span></div>
                <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Jun 2016 - Jun 2018 · 2 yrs 1 mo</span></span>
              </li>
            </ul>
          </div>
        </div>
      </li>
    </ul>
  </section>

  <section class="artdeco-card">
    <div id="education" class="pv-profile-card__anchor"></div>
    <div class="pvs-header__container">
      <h2 class="pvs-header__title"><span aria-hidden="true">Education</span></h2>
    </div>
    <ul class="pvs-list">
      <li class="artdeco-list__item">
        <a href="https://www.linkedin.com/company/rice-university/">
          <div><span aria-hidden="true"><strong>Rice University</strong></span></div>
          <span class="t-14 t-normal"><span aria-hidden="true">Master of Science - MS, Mechanical Engineering</span></span>
          <span class="t-14 t-normal t-black--light"><span aria-hidden="true">2010 - 2012</span></span>
        </a>
      </li>
      <li class="artdeco-list__item">
        <a href="https://www.linkedin.com/company/anna-university/">
          <div><span aria-hidden="true"><strong>Anna University</strong></span></div>
          <span class="t-14 t-normal"><span aria-hidden="true">Bachelor of Engineering - BE, Mechanical Engineering</span></span>
          <span class="t-14 t-normal t-black--light"><span aria-hidden="true">2005 - 2009</span></span>
        </a>
      </li>
    </ul>
  </section>

  <section id="contact-info" class="pv-contact-info artdeco-modal__content">
    <h2 class="pv-contact-info__header">Contact info</h2>
    <section class="pv-contact-info__contact-type ci-vanity-url">
      <h3>Your Profile</h3>
      <a href="https://www.linkedin.com/in/priya-raman">linkedin.com/in/priya-raman</a>
    </section>
    <section class="pv-contact-info__contact-type ci-websites">
      <h3>Websites</h3>
      <ul class="pv-contact-info__websites">
        <li class="pv-contact-info__list-item"><a href="https://www.nordwind-energy.com" target="_blank">www.nordwind-energy.com</a><span class="pv-contact-info__contact-type">(Company)</span></li>
        <li class="pv-contact-info__list-item"><a href="https://priyaraman.dev" target="_blank">priyaraman.dev</a><span class="pv-contact-info__contact-type">(Personal)</span></li>
      </ul>
    </section>
  </section>
</main>
</body>
</html>`

describe('parseLinkedInProfile — a full profile', () => {
  const p = parseLinkedInProfile(doc(FULL), 'https://www.linkedin.com/in/Priya-Raman/?miniProfileUrn=urn%3Ali%3Afsd_profile%3AACoAA')

  it('takes the identity from the page canonical, not the tab URL tracking', () => {
    expect(p.url).toBe('https://www.linkedin.com/in/priya-raman')
  })

  it('reads the name off the top card and drops the credential', () => {
    expect(p.fullName).toBe('Priya Raman')
    expect(p.firstName).toBe('Priya')
    expect(p.lastName).toBe('Raman')
  })

  it('reads the headline, the location and the pronouns beside the name', () => {
    expect(p.headline).toBe('Reliability Engineering Manager at Nordwind Energy')
    expect(p.location).toBe('Houston, Texas, United States')
    expect(p.pronouns).toBe('she/her')
  })

  it('takes the current role from the experience entry with no end date', () => {
    expect(p.roleTitle).toBe('Reliability Engineering Manager')
    expect(p.company).toBe('Nordwind Energy')
  })

  it('reads the about section without the heading or the see-more button', () => {
    expect(p.about).toContain('rotating equipment running')
    expect(p.about).not.toMatch(/see more/i)
    expect(p.about).not.toMatch(/^about/i)
  })

  it('collects the experience years, including the roles nested under one employer', () => {
    expect(p.experienceYears).toEqual([2016, 2018, 2021])
  })

  it('collects the graduation years, earliest first', () => {
    expect(p.educationEndYears).toEqual([2009, 2012])
  })

  it('takes the company domain only from the website the profile labels "Company"', () => {
    expect(p.companyDomain).toBe('nordwind-energy.com')
  })

  it('suggests the bracket from the earliest graduation, and shows the arithmetic', () => {
    const age = suggestAgeBracket(p, 2026)
    expect(age.bracket).toBe('30s')
    expect(age.why).toContain('earliest education end year 2009')
    expect(age.why).toContain('22 + (2026 - 2009) = about 39')
  })

  it('suggests the gender from the stated pronouns', () => {
    expect(suggestGender(p)).toEqual({ gender: 'f', why: 'the profile states pronouns "she/her"' })
  })
})

// -- no education at all, and no current role ------------------------------------------

const NO_EDUCATION = `
<html><body><main>
  <section class="artdeco-card pv-top-card">
    <div class="ph5 pb5"><div class="mt2 relative">
      <div class="flex-1 mt2">
        <h1 class="text-heading-xlarge inline t-24 v-align-middle break-words">Devon Okafor</h1>
      </div>
      <div class="text-body-medium break-words">Maintenance Supervisor at Harbourline Foods</div>
      <div class="pb2 pv-text-details__left-panel">
        <span class="text-body-small inline t-black--light break-words">Columbus, Ohio, United States</span>
      </div>
    </div></div>
  </section>
  <section class="artdeco-card">
    <div id="experience" class="pv-profile-card__anchor"></div>
    <h2 class="pvs-header__title"><span aria-hidden="true">Experience</span></h2>
    <ul class="pvs-list">
      <li class="artdeco-list__item">
        <div class="display-flex flex-column full-width">
          <div class="display-flex align-items-center"><span aria-hidden="true"><strong>Maintenance Supervisor</strong></span></div>
          <span class="t-14 t-normal"><span aria-hidden="true">Harbourline Foods · Full-time</span></span>
          <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Sep 2015 - Aug 2025 · 9 yrs 11 mos</span></span>
          <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Columbus, Ohio, United States · On-site</span></span>
        </div>
      </li>
    </ul>
  </section>
</main></body></html>`

describe('parseLinkedInProfile — no education section', () => {
  const p = parseLinkedInProfile(doc(NO_EDUCATION), 'https://www.linkedin.com/in/devon-okafor/')

  it('says so instead of inventing years', () => {
    expect(p.educationEndYears).toBeNull()
    expect(p.experienceYears).toEqual([2015, 2025])
  })

  it('falls back to what the top card states when no entry is still running', () => {
    expect(p.roleTitle).toBe('Maintenance Supervisor')
    expect(p.company).toBe('Harbourline Foods')
  })

  it('counts from the earliest experience year and names the assumption', () => {
    const age = suggestAgeBracket(p, 2026)
    expect(age.bracket).toBe('30s')
    expect(age.why).toContain('no education years on the profile')
    expect(age.why).toContain('earliest experience year 2015 (of 2015, 2025)')
    expect(age.why).toContain('22 + (2026 - 2015) = about 33')
  })
})

// -- pronouns, and no pronouns ---------------------------------------------------------

const topCard = (name: string, pronouns: string | null): string => `
<html><body><main>
  <section class="artdeco-card pv-top-card">
    <div class="ph5 pb5"><div class="mt2 relative">
      <div class="flex-1 mt2">
        <h1 class="text-heading-xlarge inline t-24 v-align-middle break-words">${name}</h1>
        ${pronouns ? `<span class="text-body-small v-align-middle break-words t-black--light">${pronouns}</span>` : ''}
      </div>
      <div class="text-body-medium break-words">Plant Manager at Verano Foods</div>
      <div class="pb2 pv-text-details__left-panel">
        <span class="text-body-small inline t-black--light break-words">Chicago, Illinois, United States</span>
      </div>
    </div></div>
  </section>
</main></body></html>`

/** The logged-out page, which LinkedIn renders with entirely different class names. */
const PUBLIC = `
<html><body>
  <section class="top-card-layout">
    <div class="top-card-layout__entity-info">
      <h1 class="top-card-layout__title">Marcus Feld</h1>
      <span class="top-card__pronouns">(He/Him)</span>
      <h2 class="top-card-layout__headline">Plant Manager at Verano Foods</h2>
      <div class="top-card-layout__first-subline">Chicago, Illinois, United States</div>
    </div>
  </section>
</body></html>`

describe('parseLinkedInProfile — pronouns', () => {
  it('reads them beside the name and turns she/her into f', () => {
    const p = parseLinkedInProfile(doc(topCard('Rosa Delgado', 'She/Her')), 'https://www.linkedin.com/in/rosa-delgado/')
    expect(p.pronouns).toBe('she/her')
    expect(suggestGender(p).gender).toBe('f')
  })

  it('reads them off the public page markup too, and turns he/him into m', () => {
    const p = parseLinkedInProfile(doc(PUBLIC), 'https://www.linkedin.com/in/Marcus-Feld/?original_referer=x')
    expect(p.url).toBe('https://www.linkedin.com/in/marcus-feld')
    expect(p.fullName).toBe('Marcus Feld')
    expect(p.headline).toBe('Plant Manager at Verano Foods')
    expect(p.location).toBe('Chicago, Illinois, United States')
    expect(p.pronouns).toBe('he/him')
    expect(suggestGender(p).gender).toBe('m')
  })

  it('leaves pronouns that name no gender unknown, and says why', () => {
    const p = parseLinkedInProfile(doc(topCard('Ash Lindqvist', 'they/them')), 'https://www.linkedin.com/in/ash-lindqvist/')
    expect(p.pronouns).toBe('they/them')
    const gender = suggestGender(p)
    expect(gender.gender).toBe('unknown')
    expect(gender.why).toContain('"they/them"')
    expect(gender.why).toContain('name no gender')
  })
})

describe('parseLinkedInProfile — no pronouns', () => {
  const p = parseLinkedInProfile(doc(topCard('Rosa Delgado', null)), 'https://www.linkedin.com/in/rosa-delgado/')

  it('reports none rather than reading the name', () => {
    expect(p.pronouns).toBeNull()
    expect(p.fullName).toBe('Rosa Delgado')
  })

  it('never guesses gender from a name', () => {
    const gender = suggestGender(p)
    expect(gender.gender).toBe('unknown')
    expect(gender.why).toContain('states no pronouns')
    expect(gender.why).toContain('a name is never evidence of gender')
  })
})

// -- only the experience carries dates --------------------------------------------------

const EXPERIENCE_DATES_ONLY = `
<html><body><main>
  <section class="artdeco-card pv-top-card">
    <div class="ph5 pb5"><div class="mt2 relative">
      <div class="flex-1 mt2">
        <h1 class="text-heading-xlarge inline t-24 v-align-middle break-words">Ingrid Bauer</h1>
      </div>
      <div class="text-body-medium break-words">Quality Manager at Kestrel Components</div>
      <div class="pb2 pv-text-details__left-panel">
        <span class="text-body-small inline t-black--light break-words">Greenville, South Carolina, United States</span>
      </div>
    </div></div>
  </section>
  <section class="artdeco-card">
    <div id="experience" class="pv-profile-card__anchor"></div>
    <h2 class="pvs-header__title"><span aria-hidden="true">Experience</span></h2>
    <ul class="pvs-list">
      <li class="artdeco-list__item">
        <div class="display-flex flex-column full-width">
          <div class="display-flex align-items-center"><span aria-hidden="true"><strong>Quality Manager</strong></span></div>
          <span class="t-14 t-normal"><span aria-hidden="true">Kestrel Components · Full-time</span></span>
          <span class="t-14 t-normal t-black--light"><span aria-hidden="true">Feb 2013 - Present · 12 yrs 7 mos</span></span>
        </div>
      </li>
    </ul>
  </section>
  <section class="artdeco-card">
    <div id="education" class="pv-profile-card__anchor"></div>
    <h2 class="pvs-header__title"><span aria-hidden="true">Education</span></h2>
    <ul class="pvs-list">
      <li class="artdeco-list__item">
        <div><span aria-hidden="true"><strong>Clemson University</strong></span></div>
        <span class="t-14 t-normal"><span aria-hidden="true">Bachelor of Science - BS, Industrial Engineering</span></span>
      </li>
    </ul>
  </section>
</main></body></html>`

describe('parseLinkedInProfile — an education section with no years', () => {
  const p = parseLinkedInProfile(doc(EXPERIENCE_DATES_ONLY), 'https://www.linkedin.com/in/ingrid-bauer/')

  it('leaves the graduation years null and keeps the experience years', () => {
    expect(p.educationEndYears).toBeNull()
    expect(p.experienceYears).toEqual([2013])
    expect(p.company).toBe('Kestrel Components')
    expect(p.roleTitle).toBe('Quality Manager')
  })

  it('counts from the experience instead', () => {
    const age = suggestAgeBracket(p, 2026)
    expect(age.bracket).toBe('30s')
    expect(age.why).toContain('earliest experience year 2013')
    expect(age.why).toContain('22 + (2026 - 2013) = about 35')
    expect(age.why).not.toContain('(of ')
  })
})

// -- an empty document ------------------------------------------------------------------

describe('parseLinkedInProfile — an empty document', () => {
  it('does not throw and states nothing', () => {
    const p = parseLinkedInProfile(doc(''), 'https://www.linkedin.com/in/nobody/')
    expect(p).toEqual({
      url: 'https://www.linkedin.com/in/nobody',
      fullName: null, firstName: null, lastName: null, headline: null, company: null, companyDomain: null,
      roleTitle: null, location: null, about: null, experienceYears: null, educationEndYears: null, pronouns: null,
    })
  })

  it('keeps an unusable URL exactly as given rather than inventing one', () => {
    expect(parseLinkedInProfile(doc(''), '').url).toBe('')
    expect(parseLinkedInProfile(doc('<html><body></body></html>'), 'not a url').url).toBe('not a url')
  })

  it('refuses to suggest an age with nothing to count from', () => {
    const empty = parseLinkedInProfile(doc(''), 'https://www.linkedin.com/in/nobody/')
    const age = suggestAgeBracket(empty, 2026)
    expect(age.bracket).toBe('unknown')
    expect(age.why).toContain('nothing to count from')
    expect(suggestGender(empty).gender).toBe('unknown')
  })
})

// -- the brackets themselves -------------------------------------------------------------

describe('suggestAgeBracket brackets and refusals', () => {
  const base = parseLinkedInProfile(doc(''), 'https://www.linkedin.com/in/x/')

  const GRADUATIONS: Array<[number, string]> = [
    [2024, '20s'],
    [2014, '30s'],
    [2004, '40s'],
    [1994, '50s'],
    [1984, '60s'],
  ]

  it.each(GRADUATIONS)('graduation %i → %s', (year, bracket) => {
    expect(suggestAgeBracket({ ...base, educationEndYears: [year] }, 2026).bracket).toBe(bracket)
  })

  it('says unknown, with the number, when the arithmetic lands outside the brackets', () => {
    const age = suggestAgeBracket({ ...base, educationEndYears: [1958] }, 2026)
    expect(age.bracket).toBe('unknown')
    expect(age.why).toContain('about 90')
    expect(age.why).toContain('outside the 20s-60s brackets')
  })

  it('says unknown when the year itself is not usable', () => {
    const age = suggestAgeBracket({ ...base, educationEndYears: [1899] }, 2026)
    expect(age.bracket).toBe('unknown')
    expect(age.why).toContain('1899')
    expect(age.why).toContain('outside 1950-2026')
  })

  it('prefers education over experience when both are present', () => {
    const age = suggestAgeBracket({ ...base, educationEndYears: [2012], experienceYears: [2004] }, 2026)
    expect(age.bracket).toBe('30s')
    expect(age.why).toContain('earliest education end year 2012')
  })
})
