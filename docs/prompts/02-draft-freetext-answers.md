# Workflow 2 — Draft answers for the freeText seeds

**Gap this fixes:** FlashFiller's seed catalog marks ~25 questions as
`freeText` (behavioral, motivation, logistics). These are **never fill
candidates** until an answer for them exists in your Q&A library — the matcher
skips unanswered freeText seeds entirely. Drafting them once with Claude
unlocks a whole class of questions that currently always come up empty.

## Steps

1. Start a Claude chat. Paste your **context pack**, then the prompt and seed
   table below.
2. Iterate conversationally on the drafts until they sound like you. Answer
   any factual questions Claude asks (earliest start date, certifications, …).
3. Ask Claude to emit the import JSON.
4. Export a backup, then Answers tab → Import → **OK (= merge)**.
   (**Cancel = REPLACE your entire Q&A store.**)
5. Open the **Review tab** and approve each entry (they arrive as
   `needs_review`, so until approved they only appear as suggestion chips,
   never autofill). The Training tab will now show these seeds as answered.

## Prompt

> Draft answers in my voice for the seed questions in the table below, using
> my context pack for facts. Rules:
>
> - 40–120 words for `textarea` questions; one line for `text` questions.
> - For `select`/`radio` questions, the answer must be short, plain option
>   text (e.g. "Hybrid", "Yes", "No") — it has to match a form option label.
> - Use `{{company}}` / `{{role}}` only in the seeds whose question already
>   contains them (marked in the table); each answer must still read fine if
>   the variable resolves to a generic employer.
> - If a question needs a fact you don't have, ask me before drafting.
> - For the persona-marked questions, emit one variant per persona in my
>   context pack, using the persona-suffixed seed id and the `personas` field.
>
> Show me the drafts as plain text first. After I approve, emit import JSON
> per the contract with the SEED ANSWER id rule: id `seed-<seedId>` (persona
> variant `seed-<seedId>--<persona>`), tags `["seed:<seedId>", "<category>"]`,
> `fieldType` from the table, `answerType` `"text"`, `variables` listing any
> `{{vars}}` used, `status` `"needs_review"`.

## Seed table

| seedId | category | fieldType | question | notes |
|---|---|---|---|---|
| visa-status | work_authorization | text | What is your current work visa status? | |
| start-date | logistics | text | What is your earliest available start date? | |
| work-model | logistics | select | What is your preferred work arrangement (remote / hybrid / onsite)? | option text |
| travel | logistics | text | Are you willing to travel, and up to what percentage? | |
| years-experience | experience | text | How many years of relevant experience do you have? | |
| key-skills | experience | textarea | What are your strongest technical skills? | per-persona |
| certifications | experience | textarea | Do you hold any relevant certifications or licenses? | |
| complex-project | experience | textarea | Describe your most complex or impactful project. | per-persona |
| tech-experience | experience | textarea | Do you have experience with the technologies listed in this role? | |
| why-company | motivation | textarea | Why do you want to work at {{company}}? | uses {{company}} |
| why-role | motivation | textarea | Why are you interested in the {{role}} position? | uses {{role}} |
| why-leaving | motivation | textarea | Why are you leaving your current role? | |
| know-about-us | motivation | textarea | What do you know about {{company}}? | uses {{company}}; keep generic-safe |
| next-role | motivation | textarea | What are you looking for in your next role? | |
| good-fit | motivation | textarea | What makes you a good fit for this position? | uses {{role}} |
| challenge | behavioral | textarea | Describe a significant challenge you faced and how you overcame it. | |
| leadership | behavioral | textarea | Tell us about a time you led a project or team. | |
| conflict | behavioral | textarea | How do you handle conflict or disagreement at work? | |
| failure | behavioral | textarea | Describe a failure or mistake and what you learned from it. | |
| teamwork | behavioral | textarea | Give an example of working effectively in a team. | |
| strengths-weaknesses | behavioral | textarea | What are your greatest strengths and areas for growth? | |
| how-heard | misc | select | How did you hear about this position? | option text (e.g. "LinkedIn") |
| over-18 | misc | radio | Are you at least 18 years of age? | "Yes"/"No" |
| relatives | misc | radio | Do you have any relatives currently employed by this company? | "Yes"/"No" |
| anything-else | misc | textarea | Is there anything else you'd like us to know? | |

(Extracted from `public/seed-questions.json`; if the catalog changes, re-extract.)

## Caveats

- Answers containing `{{company}}`/`{{role}}` stay unresolved on pages where
  FlashFiller can't detect the context — the fill UI will prompt you at fill
  time. That's fine; just keep variable use light.
- `needs_review` entries are capped to suggestion chips until you approve them
  in the Review tab — that's the intended vetting funnel, not a bug.
- Re-running this workflow with the same seed ids safely overwrites your
  earlier drafts (the ids are deterministic).
- `know-about-us` is inherently company-specific; keep the stored answer as a
  generic-safe skeleton and expect to edit it per application (or handle it
  live via workflow 5).
