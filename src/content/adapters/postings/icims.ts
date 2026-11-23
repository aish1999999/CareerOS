import { atsReqIdFromUrl } from '@/lib/job-dedupe'
import { blockTextExcluding, firstEl, firstText } from './dom'
import type { PostingAdapter } from './types'

// iCIMS (careers-<company>.icims.com/jobs/<id>/<slug>/job). The posting body is
// usually rendered inside #icims_content_iframe — the top frame is a shell — so
// lib/job-capture.ts runs this adapter over every captured frame and keeps the
// first with a description. Selectors beyond .iCIMS_Header are best-effort
// until the live gate; a miss degrades to the generic ladder.
export const icims: PostingAdapter = {
  name: 'icims',
  extract(doc, url) {
    const descriptionEl = firstEl(doc, ['.iCIMS_JobContent', '.iCIMS_InfoMsg_Job', '#jobcontent', '.iCIMS_Expandable_Container'])
    const description = blockTextExcluding(descriptionEl, ['form', '.iCIMS_JobHeaderGroup', 'nav', 'button'])
    return {
      title: firstText(doc, ['.iCIMS_Header h1', 'h1.iCIMS_Header', 'h1']),
      location: firstText(doc, ['.iCIMS_JobHeaderTag .iCIMS_JobsTable', '.iCIMS_JobLocation', '[class*="JobLocation"]']),
      description: description.length > 0 ? description : null,
      descriptionEl,
      atsReqId: atsReqIdFromUrl(url.href),
    }
  },
}
