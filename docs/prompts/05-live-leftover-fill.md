# Workflow 5 — Live leftover-fill + learn

**Gap this fixes:** whatever the library still can't answer on a real
application gets filled once by Claude for Chrome — and taught back to
FlashFiller through its capture loop, so the *next* application answers them
natively.

**Why the learning works:** FlashFiller's capture loop watches fields it
couldn't match itself. Claude for Chrome types and clicks with real browser
event[text](vscode-webview://1bcu6qbh5sdbc2ts1p2i12hajod1ifv0c8k11ettls3sc6hj7ns2/docs/prompts/05-live-leftover-fill.md)s, so its fills look like yours:

- **Text boxes / textareas** — captured when the field blurs.
- **Dropdowns, radios, checkboxes** — captured when the value changes, and the
  saved entry records the question **plus every option the form offered**.
- **Custom (div-based) dropdowns** — captured by watching the displayed text
  change between page scans; options may not be recordable while closed.

After each capture, a small prompt appears next to the field — click **save**
or **merge as alias**. Captured choice questions then show up in the
**Options tab**, where you classify equivalent questions and group equivalent
option wordings into sets (that classification is yours to make — forms word
the same thing many ways, and only you can say what's truly the same).

## Steps

1. **Preconditions**: FlashFiller runs on any site — major ATSes (Greenhouse,
   Lever, Workday, Ashby, iCIMS, SmartRecruiters, SuccessFactors) activate
   automatically; on any other career site flip the popup's **Always run on
   this site** toggle (or use one-off **Scan**). Capture loop enabled in
   Settings.
2. Run FlashFiller **Autofill** first and settle its suggestion chips
   (accept/skip). Capture only fires for fields the matcher did NOT match, so
   clearing the matched fields first means Claude touches exactly the
   unmatched remainder.
3. In the Claude for Chrome sidebar, paste your **context pack** and the
   prompt below.
4. As Claude completes each field, FlashFiller's capture prompt appears —
   click **save** (new quarantined entry) or **merge as alias** (attaches the
   question to an existing similar entry) on each one.
5. When Claude finishes, keep its end-of-run answer table as a safety net for
   any capture prompt you missed.
6. **Review tab**: approve the captured entries; accept the offered
   generalizations (replacing the literal company/role/location with
   `{{variables}}`) where they make sense.
7. **Options tab**: the captured dropdown/radio/checkbox questions are listed
   with their full option lists. Merge any that duplicate questions you
   already have, and add new option wordings to your option sets so the
   answer transfers across differently-worded forms.
8. **Submit the application yourself.** Claude never clicks submit.

## Prompt (Claude for Chrome sidebar, after the context pack)

> My autofill extension already filled some fields on this page. Only fill
> fields that are still EMPTY. For each one:
>
> 1. Fill it the way a person would — click into text fields and type; open
>    dropdowns and click the option; click radio buttons and checkboxes.
> 2. After each field, click on neutral page whitespace and pause briefly —
>    another extension learns from completed fields and shows a small overlay
>    after each one. Ignore its overlays, never click them; I'll click them
>    myself.
>
> Use my context pack for facts. If you don't know an answer, ask me instead
> of inventing one.
>
> NEVER touch: consent or acknowledgement checkboxes, EEO/demographic/
> self-identification questions, file uploads, or any submit/next/continue
> button.
>
> When done, output a table of every question you answered, the exact answer
> you entered, the field type, and — for dropdowns and radios — the full list
> of options the field offered.

## Caveats

- **Captured entries are quarantined** `needs_review` and suggestion-only
  until approved in the Review tab. This application gets filled either way;
  the *next* one only benefits after approval.
- **Option wordings differ across ATSes** ("Yes" vs "Yes, I am authorized to
  work in the United States"). The stored answer is the exact option text
  Claude picked on *this* form; grouping equivalent wordings into an option
  set in the Options tab is what makes it fill other forms confidently.
- **Custom dropdowns are the flaky case**: they emit no standard events, so
  FlashFiller detects them by diffing displayed text between scans. If one
  slips through, Claude's end-of-run table is the recovery path (add it via
  the Answers tab).
- Claude clicking "neutral whitespace" can still accidentally dismiss a
  capture overlay. Missed one? The answer table is your recovery path.
- The entire page — including everything already filled — is visible to
  Claude. Treat the session as PII-shared.
- FlashFiller itself skips consent, EEO, and file fields in capture by
  design; the prompt forbids Claude from filling them because the *filling*
  is the harm, not the learning.
