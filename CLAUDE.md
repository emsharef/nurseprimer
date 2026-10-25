# A Young Nurse's Illustrated Primer

An interactive web book that teaches how modern AI works: the reader builds an AI telephone-triage nurse in the
browser, one idea per chapter, and watches each version work, break, and get fixed by the next idea. The full
brief is `docs/plan.md`; decisions taken since are in `docs/decisions.md` (read both before larger work, and
append to the decisions log when you decide something the plan leaves open).

Live: https://sharef.net/nurseprimer/ · Repo: github.com/emsharef/nurseprimer (public)

## Commands

```
npm install                 # .npmrc sets legacy-peer-deps (npm 11 arborist bug)
npm run dev                 # Astro dev server
npm run check               # citation audit, unit tests, build, version check, a11y lint: run before calling anything done
npm test                    # vitest: packages/*/test, scripts/test, apps/site/test
node scripts/screenshot.mjs apps/site/dist <outdir> /chapters/<id>/   # light+dark, desktop+phone PNGs; look at them
npm run deploy              # runs checks, builds with base /nurseprimer/, rsyncs to DreamHost
```

## Layout

- `apps/site/chapters/NN-slug.mdx`: one file per chapter. Frontmatter schema in `apps/site/src/content.config.ts`.
- `apps/site/components/chapter/`: template parts (Wristband, Widget, NightNote, Line, MathDrawer, ForTrack, Cite,
  NoteRef/NoteDef/Notes, ReviewFlag, References). They are passed to every chapter automatically
  (`src/pages/chapters/[id].astro`); chapter-specific widgets are imported at the top of the MDX file.
- `apps/site/components/widgets/`: interactive widgets (Astro component + `<script>`; plain TS, no UI framework).
- `apps/site/styles/`: tokens (`tokens.css`) and base styles. Use the tokens; never hard-code colours.
- `packages/ml-core` (from-scratch ML), `packages/ward-board` (scoring), `packages/notebook` (reader state),
  `packages/models-browser` (pretrained browser models).
- `data/`: corpus and datacard. `content/citations.yaml`: every reference. `scripts/`: audits, generators.

## Writing a chapter

- **Build, break, fix.** A toy that works; a pitfall the reader triggers themselves; the next chapter's idea as
  the fix. Predict before reveal: the reader commits to a guess before seeing a result.
- **Voice:** warm, concrete, a little dry. Second person for the reader, who is the young nurse; the charge nurse
  is the skeptical, fair mentor. No formulaic endings, no "three cautions" lists, no hedging scaffolds, no
  "In this chapter we will". Short paragraphs. Every chapter returns to the 2 a.m. feverish child with a
  non-blanching rash.
- **End with a Night Note** (`<NightNote><Line who="young">…</Line><Line who="charge">…</Line></NightNote>`):
  a short Socratic exchange touching one of: Is it about the world? Whose goal? Does it know when to stop? Who signs?
- **Keep toys honest:** every `<Widget>` gets `realSystems="…"` (one line: what real systems do differently) and
  `summary="…"` (a text description of what it shows, for readers who can't see it).
- **Math** goes in `<MathDrawer title="…">` with `$…$` / `$$…$$`. Say which optimizer you mean.
- **Depth tracks:** `<ForTrack track="nurse|coder|curious">` for asides. The main text must work for everyone.
- **Citations:** `<Cite k="key" />` with the key in `content/citations.yaml`. Primary sources only; never cite
  anything you have not verified (fetch the DOI/arXiv page and check the claim). Record `verified.scope: claim`
  only when you checked the passage; otherwise `metadata`. Every quoted number gets a `figures` entry with page/table.
- **Review flags:** frontmatter `review.prose: ai-draft` and `review.medical: unreviewed` for anything an AI wrote
  or any medical statement a clinician hasn't checked. Never claim review that didn't happen.
- **Technical precision (plan 10.3):** no Rice/halting claims about fixed finite-context models; computers are
  clocked stored-program machines, not cellular automata; 2017 transformer added positions, many current models
  use rotary embeddings; speech deep-learning results (2009-2012) came before or alongside AlexNet (2012).

## Widgets

- Plain TypeScript in the component's `<script>`; import from `@primer/*` packages. Keyboard-operable (real
  `<button>`, `<input type="range">` with labels), visible focus, works at 375px width, respects reduced motion.
- Reader state only via `@primer/notebook` (never touch localStorage directly). Save models to the Ward Board
  with `saveModel({ id, name, chapter, scores })` where scores come from `scoreModel` in `@primer/ward-board`.
- Charts are SVG drawn from real data, with a text summary. Never an image model for anything with numbers.
- Colours: `--alarm` only for urgent / missed emergencies; `--calm` for can_wait; `--lamp` for interaction.

## Never

API keys in the browser · real patient data · image-model diagrams · unverified citations · medical claims beyond
the guidance in `data/datacard.md` · weakening a check to make it pass.
