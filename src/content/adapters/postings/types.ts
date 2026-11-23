import type { JobAts, JobSource, JobWorkType } from '@contract/entities'

// ---------------------------------------------------------------------------
// Posting adapters (Stage 4 part 2): one per source, each a PURE function of a
// parsed Document plus the tab URL — never the live page, never `doc.location`
// (a DOMParser document has none). They fill what their platform exposes
// beyond JSON-LD; lib/job-capture.ts layers JSON-LD, microdata, adapter, meta
// and title heuristics into one JobCapture and builds the `jobs` row.
// ---------------------------------------------------------------------------

export interface PostingFields {
  title: string | null
  /** The title element — the region scans start from it. */
  titleEl: Element | null
  company: string | null
  location: string | null
  description: string | null
  /** The element the description came from — the region scans exclude it. */
  descriptionEl: Element | null
  postedAt: string | null
  postedAgeText: string | null
  applicantCount: number | null
  applicantText: string | null
  experienceLevel: string | null
  /** "Full-time" etc. — kept in raw only; not a capture-matrix field. */
  employmentType: string | null
  workType: JobWorkType | null
  workTypeText: string | null
  sector: string | null
  atsReqId: string | null
  canonicalUrl: string | null
  /** The LinkedIn job id when the page (not the URL) exposes it. */
  linkedinJobId: string | null
}

export type PartialPosting = Partial<PostingFields>

export interface PostingAdapter {
  /** Matches JOB_ATS for ATS platforms; 'linkedin' / 'generic' otherwise. */
  name: string
  extract: (doc: Document, url: URL) => PartialPosting
}

export type MatchedBy = 'linkedin' | 'host' | 'fingerprint' | 'none'

export interface Classification {
  source: JobSource
  ats: JobAts
  adapter: PostingAdapter
  matchedBy: MatchedBy
  /** Registrable-ish domain for company_site pages; null elsewhere. */
  companyDomain: string | null
}
