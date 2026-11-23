# FlashFiller — development guide

⚡ Manifest V3 extension that autofills job applications from a user-owned, local
knowledge base. Retrieval-based, never generative; never auto-submits. Full product
spec in [README.MD](README.MD) — section numbers in code comments refer to it.

## Commands

```bash
npm install        # once
npm run dev        # Vite dev server with CRXJS HMR (load dist/ once, then edits hot-reload)
npm run build      # typecheck + production build → dist/
npm test           # vitest run (111 tests: unit + ATS-fixture e2e smoke)
npm run typecheck  # tsc --noEmit only
```

> Note: this machine has no system Node. A local Node 24 LTS lives at
> `~/.local/node-dist/node-v24.18.0-darwin-arm64/bin`, and `~/.zshrc` now puts it on
> PATH — if a terminal says `command not found: npm`, open a **new** terminal (or run
> `source ~/.zshrc`).

Gotchas:

- It's `npm run build` — plain `npm build` is not a valid command.
- Load the **`dist/` folder** in Chrome, not the project root. The source manifest is
  `manifest.config.ts`; it only becomes `dist/manifest.json` when you build.
- `npm run dev` rewrites `dist/` in dev-server mode: great for HMR, but that build only
  works **while the dev server is running**. When you just want to use the extension,
  run `npm run build` and reload it at `chrome://extensions`.

## Load in Chrome/Edge

1. `npm run build`
2. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the `dist/` folder
3. First install opens onboarding (profile → answer 10 questions).
4. The content script loads on every http(s) page but stays dormant. On Greenhouse /
   Lever / Workday / Ashby / iCIMS / SmartRecruiters / SuccessFactors pages the ⚡ badge
   appears automatically (enabled-domain list in Settings). On any other site, use the
   popup: **Scan this page** for a one-off, or the **Always run on this site** toggle to
   enable it permanently.

## Architecture (spec §4, §16)

```
src/
  background/service-worker.ts   onInstalled/onboarding, review-count badge, activeTab injection
  content/
    index.ts        bootstrap: gating, scan loop, MutationObserver + SPA-nav rescan,
                    session variable/answer caches, capture-loop wiring
    detector.ts     §5  signal bundles (pure — only writes data-ff-id stamps)
    context.ts      §7  JSON-LD JobPosting → og:meta → ATS adapter → <title> heuristics
    variables.ts    §7  {{company}}/{{role}}/{{location}}/{{today}}/{{profile.*}} resolver
    matcher.ts      §6  Tier-1 autocomplete/regex→profile · Tier-2 scored KB match,
                    persona scoping, composite preference, option choosing,
                    page-context decontextualization ("…work at Hooli?" ≙ "…at this company?")
    composer.ts     §6/9 {{#workHistory}}…{{/workHistory}} composite rendering
    autofill.ts     §8  the ONLY module that writes the DOM (React-safe setters, real events)
    capture.ts      §11 capture drafts (quarantined), dedupe, generalization spans
    adapters/       §14 per-ATS context selectors & dropdown quirks
    overlay/        §12 shadow-DOM badge, chips, variable & capture prompts
  lib/
    schema.ts       zod schemas, defaults, import validation (per-entry rejection reasons)
    storage.ts      typed chrome.storage.local wrapper + v1→v2 migration + recovery key
    normalize.ts    synonym map, stopwords, light stemming
    scorers/        pluggable: lexical (default, offline) · embeddings (opt-in scaffold)
    seed.ts         read-only seed catalog loader, coverage computation, training queue
  ui/               React popup + options (Profile · Answers · Training · Review · Settings)
public/seed-questions.json       bundled read-only seed bank (56 questions, 10 categories)
tests/              vitest + jsdom; fixtures/ holds Greenhouse/Lever-style form snapshots
```

Key invariants the tests pin down:

- **Never** auto-submit, auto-check consent boxes, auto-fill EEO fields, or touch file inputs.
- Literal `{{braces}}` never reach the page — unresolved variables prompt inline instead
  (answers remembered per application session only).
- Captured answers are quarantined `needs_review` → suggestion-only until approved in the
  Review tab; **Generalize** shows a confirm-before-apply diff (per NOTE.MD).
- Blank-answer entries can never match (seed catalog stays read-only; only answered
  questions live in `qa`).
- With semantic matching off (default): **zero network requests** — verified by grepping
  the built bundles; the only fetch is the bundled seed JSON.

## Deliberately deferred

- **Semantic embeddings provider** (spec §19 `<< SEMANTIC_PROVIDER >>`): the pluggable
  scorer interface + settings UI ship now; `lib/scorers/embeddings.ts` intentionally
  behaves as lexical until a provider is chosen, so enabling the toggle can't leak data.
- **Firefox port**: `browser.*`/manifest tweaks (spec targets Chrome/Edge first).
- **Toolbar icons**: manifest is valid without them; add `icons` + PNG assets before any
  store submission.
