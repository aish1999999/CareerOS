# Workflow 1 — Alias enrichment

**Gap this fixes:** FlashFiller's matcher is lexical-only (token cosine +
bigram Dice). Real ATS paraphrases of a question you've already answered —
"Are you legally authorized to work…" vs "Do you have the right to work…" —
often score below the 0.85 autofill / 0.6 suggest thresholds and get ignored.
The matcher scores the `question` **and every string in `aliases`**, taking
the best, so adding realistic paraphrase aliases directly converts misses into
confident matches. This is the highest-recurring-impact workflow; re-run it
whenever you've accumulated new captured answers.

## Steps

1. **Export fresh**: FlashFiller options → Answers tab → Export. (Merge
   replaces whole entries by id — a stale export overwrites edits you made
   after it. Always re-export immediately before this run. The export also
   doubles as your rollback backup.)
2. Start a Claude chat. Paste your **context pack**, then the `qa` array from
   the export (strip any answers you consider sensitive), then the prompt
   below.
3. Save Claude's JSON block as a `.json` file.
4. Answers tab → Import → choose the file → **OK (= merge)** in the confirm
   dialog. **Cancel = REPLACE your entire Q&A store — do not press Cancel.**
5. Check the import report. If entries were rejected, paste the rejection
   reasons back to Claude and import the corrected block.

## Prompt

> Here is the `qa` array from my extension export. For each entry, add 5–10
> aliases: realistic phrasings that ATS forms (Greenhouse, Lever, Workday,
> Ashby, iCIMS, SmartRecruiters) actually use for the same question. Include:
>
> - terse label styles ("Notice period", "Salary expectations (USD)"),
> - yes/no phrasings ("Are you authorized to work in the US?"),
> - legal-HR phrasings ("Will you now or in the future require sponsorship for
>   employment visa status?").
>
> Keep all existing aliases, dedupe case-insensitively, and never include a
> specific company, role title, or city name in an alias (the matcher strips
> those before scoring, so they're wasted tokens). Also normalize `tags` to a
> small consistent set across entries.
>
> Return the FULL array per the JSON contract: every entry complete and
> byte-identical except `aliases`, `tags`, and `updatedAt`. Keep every `id`,
> `answer`, and `status` exactly as given — do not promote `needs_review`
> entries, do not reword answers.

## Caveats

- Aliases only help questions you already have an answer for; they don't
  create new answers (that's workflows 2 and 4).
- If Claude rewrites an answer anyway, reject that entry — this workflow must
  not change what gets typed into forms.
