# Workflow 4 — Pre-application scout (dry run)

**Gaps this fixes — two at once:**

1. Unknown questions discovered mid-application break your flow. Scouting the
   form first means answers exist in the library *before* the real pass, so
   FlashFiller fills them confidently.
2. Option wordings differ per ATS. Scouting records the **exact option texts**
   this form uses, so drafted select/radio answers place cleanly — and the
   scouted wordings are exactly what you feed your **option sets** (Options
   tab) so existing answers transfer to this form's phrasing. (Live capture in
   workflow 5 also learns choice fields now; scouting is how you prepare
   *before* touching the form.)

This workflow uses both lanes: Claude for Chrome reads the live page; a
regular Claude chat drafts the answers.

## Steps

1. Open the job's application page. Don't start filling.
2. (Optional) Click FlashFiller's popup **Scan** to see what it already
   matches, so you know which questions are actually uncovered.
3. In the **Claude for Chrome sidebar**, give prompt **4a** below. Claude only
   reads — it must not touch the form.
4. Copy Claude's table into a **regular Claude chat** along with your context
   pack, mark the rows FlashFiller can't answer, and give prompt **4b**.
5. Export a backup, then import Claude's JSON (**OK = merge**;
   **Cancel = REPLACE everything**).
6. Approve anything you want autofillable in the **Review tab**, then go back
   to the page and run FlashFiller **Autofill**.

## Prompt 4a — on-page read (Claude for Chrome)

> Read this job application form. Do NOT type into, click into, select, or
> change any field — read only. List every question/field as a markdown
> table with columns: label, field type (text / textarea / select / radio /
> checkbox / file), required?, and for selects and radios the EXACT option
> texts. Flag consent/acknowledgement checkboxes, EEO/demographic/
> self-identification questions, and file uploads as DO-NOT-AUTOMATE. If the
> form has multiple steps, list the steps you can see and note that later
> steps weren't read.

## Prompt 4b — draft answers (regular chat, context pack pasted)

> Here is a table of fields from a job application, with the rows my autofill
> extension can't answer marked. Draft answers for the marked rows using my
> context pack:
>
> - For select/radio rows, the answer must be the EXACT option text from the
>   table, character for character.
> - Skip anything flagged DO-NOT-AUTOMATE.
> - For company-specific essay questions, use `{{company}}`/`{{role}}` so the
>   entry reuses across applications, and keep it generic-safe.
> - Ask me for any fact you don't have.
>
> Then emit import JSON per the contract: new `cfc-` ids, `fieldType` from the
> table, tags including `"scouted"` and the ATS name (e.g. `"greenhouse"`),
> `status` `"needs_review"`.

## Caveats

- Custom div-based dropdowns may not expose their options to a page read, and
  FlashFiller may fail to set them anyway (it gives up after 1.5s and falls
  back to a suggestion chip). Those stay manual — or Claude-driven via
  workflow 5.
- Option texts differ per ATS ("Yes" vs "Yes, I am authorized to work in the
  United States"), so scouted select/radio answers are somewhat page-specific.
  The `scouted` + ATS tags exist so you can curate them later. Better: add the
  scouted wordings to an **option set** in the Options tab — then one stored
  answer covers every wording in the set and page-specific duplicates stop
  accumulating.
- Multi-step (wizard) applications: the scout only sees the current step.
  Re-run 4a per step, or combine with workflow 5 for later steps.
