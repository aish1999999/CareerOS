import { atsReqIdFromUrl } from '@/lib/job-dedupe'
import { blockTextExcluding, firstEl, firstText } from './dom'
import type { PostingAdapter } from './types'

// SAP SuccessFactors — the Career Site Builder pages (jobs.<company>.com/job/<City>-<Title>/<id>/)
// carry schema.org microdata, which lib/job-capture.ts reads generically; the legacy Career
// Portal (career5.successfactors.eu/career?career_job_req_id=…) does not. Container selectors
// are best-effort until the live gate; a miss degrades to the generic ladder.
export const successfactors: PostingAdapter = {
  name: 'successfactors',
  extract(doc, url) {
    const descriptionEl = firstEl(doc, ['[itemprop="description"]', '.jobdescription', '.job-description', '#job-description', '.jobDisplay', '.jobDisplayShell'])
    const description = blockTextExcluding(descriptionEl, ['form', 'nav', 'button', '.jobDetailsApply'])
    return {
      title: firstText(doc, ['[itemprop="title"]', 'h1.jobTitle', 'h1']),
      location: firstText(doc, ['[itemprop="jobLocation"]', '.jobGeoLocation', '[class*="jobLocation"]']),
      description: description.length > 0 ? description : null,
      descriptionEl,
      atsReqId: atsReqIdFromUrl(url.href),
    }
  },
}
