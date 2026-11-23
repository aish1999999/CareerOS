# Workflow 3 — Knowledge-base audit + profile gap-fill

**Gap this fixes:** over time the library accumulates near-duplicate entries
(splitting lexical score across similar questions and causing wrong-entry
wins), captured answers with literal company/role names baked in ("I'm excited
about Stripe because…") that would fill wrongly elsewhere, contradictions
between answers and profile, and blank profile fields that silently block
profile-backed seeds.

## Steps

1. **Export fresh** (also your backup).
2. Paste your **context pack**, then the **full export** (profile + qa; strip
   `eeo` and anything else sensitive), then the prompt below.
3. Read Claude's findings report carefully — especially each proposed
   generalization diff, since swapping a literal for `{{company}}` changes
   what gets typed. Confirm or reject each finding.
4. Say "emit" — Claude produces the import JSON containing **only changed
   entries**.
5. Answers tab → Import → **OK (= merge)**. (**Cancel = REPLACE everything.**)
6. Imports cannot delete: manually delete the duplicate-loser entries Claude
   listed, via the Answers tab.
7. Fill any blank profile fields Claude flagged in the Profile tab (or via the
   profile bootstrap in `00-context-pack-template.md`).

## Prompt

> Audit this FlashFiller export. Report findings first — do NOT emit JSON yet.
> Look for:
>
> 1. **Near-duplicates**: entries whose questions/aliases overlap enough that
>    they compete for the same form fields. Pick one survivor per cluster,
>    propose merging the others' aliases into it, and list the losers (id +
>    question) for me to delete manually — imports cannot delete.
> 2. **Over-specific answers**: literal company, role, or location strings in
>    answers that should be `{{company}}`/`{{role}}`/`{{location}}`. Use each
>    entry's `captureContext` to tell what the literal referred to. Show me
>    the exact before/after diff for each.
> 3. **Contradictions** between answers and my profile or context pack
>    (notice period, sponsorship, salary, years of experience).
> 4. **Blank profile fields** that block autofill — check at least: firstName,
>    lastName, email, phone, links.linkedin, workAuthorization,
>    authorizedToWork, requiresSponsorship, noticePeriod, desiredSalary,
>    workHistory, education.
>
> Number every finding and wait for my confirmation. When I say "emit",
> produce import JSON per the contract containing ONLY the entries I approved:
> full entries, original ids and createdAt, `updatedAt` refreshed, and
> `status` `"needs_review"` for any entry whose **answer text** changed
> (alias-only merges keep their status).

## Caveats

- Whole-entry replacement: if Claude drops a field from an entry, the import
  resets it to its default. The prompt demands full entries — spot-check one.
- Duplicate deletion is manual and happens **after** the import (so the
  survivor already carries the merged aliases before you delete the losers).
