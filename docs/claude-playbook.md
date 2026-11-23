# FlashFiller × Claude for Chrome — integration playbook

FlashFiller is deliberately local and offline: it matches form questions to
your answer library with lexical scoring only, and it never calls an LLM. That
keeps your data on your machine, but it also means paraphrased questions score
below threshold, open-ended questions have no answers until you write them,
and new questions are only learned one capture at a time.

This playbook uses **Claude for Chrome** as the intelligence layer around that
local core — without any code changes to FlashFiller. Claude drafts, enriches,
audits, scouts, and fills; FlashFiller stays the fast, private, deterministic
engine that applies answers.

## The mental model: three lanes, human-brokered

Claude for Chrome has **no API another extension can call**, and it cannot act
on FlashFiller's own options page. Every integration runs through channels
both sides can reach, with you as the broker:

| Lane | Channel | What flows through it |
|---|---|---|
| **Chat lane** | copy/paste with any Claude chat | your export JSON out; drafted/enriched answers back as import JSON |
| **On-page lane** | the ATS form itself | Claude for Chrome reads the form (scout) or fills leftover fields (live fill); FlashFiller's capture loop learns from the text fields Claude fills |
| **Import lane** | FlashFiller options → Answers tab | the only write path into FlashFiller: JSON import (merge), plus your manual Review-tab approvals |

Two mechanics make the lanes effective:

- **Aliases are scored.** The matcher scores an entry's question *and every
  alias*, best-of. Claude-generated paraphrases directly raise match
  confidence past the autofill threshold.
- **Capture sees Claude.** Claude for Chrome types and clicks with real
  browser events, so FlashFiller's capture loop treats its fills like yours
  and offers to learn each unmatched field — text boxes and textareas on
  blur, dropdowns/radios/checkboxes on change (recording the question
  **and every option the form offered**), and custom dropdowns by watching
  their displayed text.
- **You classify equivalences.** Different forms word the same question — and
  the same option — differently. The **Options tab** lists every captured
  choice question with its full option list; there you merge equivalent
  questions (their texts become aliases) and group equivalent option wordings
  into **option sets** ("Yes" ≈ "Yes, I am authorized to work in the United
  States"), so one stored answer fills any wording in its set.

## Setup (once)

1. Fill out [prompts/00-context-pack-template.md](prompts/00-context-pack-template.md)
   and save it as `context-pack.local.md` (never commit it). Paste it at the
   top of every Claude session.
2. Run the **resume-to-profile bootstrap** in the same file if your Profile
   tab has blanks — blank profile fields produce no fill candidates at all.
3. Skim the JSON rules in [prompts/json-contract.md](prompts/json-contract.md)
   once so you can spot when Claude drifts from them.

## The workflows, in order of impact

| #   | Workflow                                                                | Fixes                                                                        | Cadence                           |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| 0   | [Context pack + profile bootstrap](prompts/00-context-pack-template.md) | blank profile fields; every later workflow needs it                          | once                              |
| 1   | [Alias enrichment](prompts/01-enrich-aliases.md)                        | paraphrases scoring below threshold — the single biggest confidence win      | after every batch of new captures |
| 2   | [Draft freeText seed answers](prompts/02-draft-freetext-answers.md)     | the ~25 behavioral/motivation seeds that otherwise never fill                | once, then touch-ups              |
| 3   | [Library audit + gap-fill](prompts/03-audit-knowledge-base.md)          | duplicates, over-specific answers, contradictions                            | occasionally                      |
| 4   | [Pre-application scout](prompts/04-scout-application.md)                | unknown questions before they cost you, answered ahead of the real pass      | per application (optional)        |
| 5   | [Live leftover-fill + learn](prompts/05-live-leftover-fill.md)          | whatever's left on a real form, filled once and learned for next time        | per application                   |

The compounding loop: **5 captures new questions (with their options) →
Options tab classifies equivalent questions and option wordings → 1 enriches
them with aliases → Review tab promotes them → next application autofills
them.**

## Risks & rules

1. **PII leaves the machine.** FlashFiller is local-only; these workflows
   deliberately pipe your profile and answers through Claude. The export
   includes EEO answers, salary, address, and full work history. Standing
   rules: strip `profile.eeo` (and anything else sensitive) before pasting;
   never commit filled context packs or exports. Suggested `.gitignore`
   lines: `*.local.md`, `flashfiller-export*.json`.
2. **The import dialog is a trap.** After choosing a file: **OK = merge,
   Cancel = REPLACE your entire Q&A store.** There is no abort. Always export
   a backup immediately before importing — it doubles as your rollback.
3. **Merge is upsert-by-id with whole-entry replacement.** A stale export
   overwrites newer in-extension edits (re-export right before each run);
   partial entries reset omitted fields to defaults; a reused id silently
   destroys the entry it collides with. Profile imports replace the entire
   profile object.
4. **Imports default to `"active"`** — instantly autofillable. The prompt
   templates force `status: "needs_review"` for anything with a new or
   changed answer, which routes it through the Review tab. The safety floor
   underneath remains regardless: FlashFiller only fills on your explicit
   Autofill/Accept click, never auto-submits, and caps EEO fields to
   suggestions.
5. **What Claude's live fills can and can't teach FlashFiller.** Can:
   unmatched text inputs, textareas, selects, radios, checkboxes and custom
   dropdowns on activated domains — all as quarantined entries, with choice
   fields recording their full option list for the Options tab. Can't: file
   uploads, consent/EEO fields (by design), fields the matcher already
   (possibly wrongly) matched, or custom dropdowns whose displayed text
   FlashFiller can't read. Claude's end-of-run answer table remains the
   recovery path for anything a capture prompt missed.
6. **Template variables degrade loudly, not silently.** `{{company}}` /
   `{{role}}` resolve from detected page context; when detection fails you'll
   be prompted at fill time. Keep variable use light, and never put literal
   company/role/city names in aliases — the matcher strips them before
   scoring.
7. **You are always the broker.** Claude never opens FlashFiller's options
   page, never imports, never approves reviews, and never submits an
   application. Those clicks are yours by design.
