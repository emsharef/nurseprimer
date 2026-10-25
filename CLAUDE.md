# A Young Nurse's Illustrated Primer

An illustrated interactive adventure that shows curious generalists (little or no AI background) how modern
AI works. Each chapter is a night on a children's night message line: you (the new nurse) build Wick, a
clockwork owl, and improve it one idea per night; Bea, the charge nurse, asks the hard questions. Each version
of Wick works, then breaks in a way the reader triggers, and the next night's idea fixes it.

Read, in order: `docs/style-guide.md` (voice, characters, look), `docs/arc.md` (the twelve-night arc; it
replaces section 5 of the plan), `docs/decisions.md`, then `docs/plan.md` (the original brief: a starting point,
not a contract). Append to `docs/decisions.md` when you decide something they leave open. The exemplar chapter
is `apps/site/chapters/03-knobs.mdx` with its widgets in `components/widgets/knobs/`.

Live: https://sharef.net/nurseprimer/ · Repo: github.com/emsharef/nurseprimer (public)

## Commands

```
npm install                 # .npmrc sets legacy-peer-deps (npm 11 arborist bug)
npm run dev                 # Astro dev server
npm run check               # citation + content audits, unit tests, build, version check, a11y lint: run before calling anything done
npm test                    # vitest: packages/*/test, scripts/test, apps/site/test
node scripts/screenshot.mjs apps/site/dist <outdir> /chapters/<id>/   # light+dark, desktop+phone PNGs; look at them
node scripts/playtest/ch03.mjs <outdir>     # example scripted playtest (serve + interact + screenshot)
node scripts/illustrate.mjs <id...>         # Nano Banana 2.1 candidates -> content/illustrations/raw/; pick one, copy to content/illustrations/<id>.png
node scripts/illustrate.mjs --publish       # WebP files for the site
node scripts/transcripts.mjs <id>           # record a frozen transcript from a spec in content/transcripts/specs/
npm run deploy              # runs checks, builds with base /nurseprimer/, rsyncs to DreamHost (lead only)
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

## Writing a night

- **Story first.** Open on a scene at the desk. The reader is "you"; Bea and Wick are characters. Something
  happens, you try something with Wick, it works or it doesn't, and then (briefly) why. Friendly, concrete, a
  little dry; an adventure for grown-ups, never a textbook: no "In this chapter we will", no bullet summaries,
  no recap, no rule-of-three lists, no stacked rhetorical questions.
- **Build, break, fix.** A toy that works; a pitfall the reader triggers themselves; the next night's idea as
  the fix. **Predict before reveal:** `<Predict id question options answer? lock />` before the widget it
  guards (`lock` disables the next element until the reader guesses).
- **Explain with the story's objects before jargon**, then name the real term once it's earned.
- **End with a Night Note** (`<NightNote><Line who="young|charge|wick">…</Line></NightNote>`) that lands one
  question (Is it about the world? Whose goal? Does it know when to stop? Who signs?) and pulls toward the next night.
- **Keep toys honest:** every `<Widget title summary realSystems>`; `realSystems` is one line on how real systems differ.
- **Ward Board:** place `<WardBoard />` where the story puts models on the board.
- **Pictures:** `<Plate id size="wide|column|small" />` and frontmatter `plate:` for the opener. Add prompts in
  `content/illustrations/manifest.d/NN-slug.yaml` (refs: `sheet-you`, `sheet-bea`, `sheet-wick` for
  consistency), generate 2 candidates, LOOK at them, pick, publish. Never an image model for anything with
  numbers or labels. In a worktree, scripts need `PRIMER_ENV=<main checkout>/.env`.
- **Big hosted models:** recorded only, via `<Transcript id />` from `content/transcripts/specs/<id>.json`.
  Lyceum (the fictional company) is played by a real model and the caption says which.
- **Math** goes in `<MathDrawer title="…">` with `$…$` / `$$…$$`. Say which optimizer you mean.
- **Citations:** `<Cite k="key" />` with the key in `content/citations.yaml`. Primary sources only; never cite
  anything you have not verified (fetch the DOI/arXiv page and check the claim). Record `verified.scope: claim`
  only when you checked the passage; otherwise `metadata`. Every quoted number gets a `figures` entry with page/table.
- **Numbers in prose must be measured** on the corpus with the same code the widget runs (and ideally pinned
  by a test), not guessed.
- **Review flags:** frontmatter `review.prose: ai-draft` and `review.medical: unreviewed` for anything an AI wrote
  or any medical statement a clinician hasn't checked. Never claim review that didn't happen. Medical facts stay
  within the guidance in `data/datacard.md`; never invent doses.
- **Technical precision (plan 10.3):** no Rice/halting claims about fixed finite-context models; computers are
  clocked stored-program machines, not cellular automata; 2017 transformer added positions, many current models
  use rotary embeddings; speech deep-learning results (2009-2012) came before or alongside AlexNet (2012).
- **Playtest like a reader, on a phone.** Build, then drive the chapter in Playwright at 390x844 (touch) in light
  and dark, and at desktop width: make every guess, operate every widget, read every screenshot you take with
  the Read tool. CI passing is not the same as working.

## Widgets

- Plain TypeScript in the component's `<script>`; import from `@primer/*` packages. Keyboard-operable (real
  `<button>`, `<input type="range">` with labels), visible focus, works at 375px width, respects reduced motion.
- Reader state only via `@primer/notebook` (never touch localStorage directly). Save models to the Ward Board
  with `saveModel({ id, name, chapter, scores })` where scores come from `scoreModel` in `@primer/ward-board`.
- Charts are SVG drawn from real data, with a text summary. Never an image model for anything with numbers.
- Colours: `--alarm` only for urgent / missed emergencies; `--calm` for can_wait; `--gold`/`--gold-ink` for the
  human side and interaction; `--phosphor`/`--phosphor-ink` (sparingly) for the machine. Wick's face: `wickFace()`
  in `components/widgets/wick.ts`. Buttons: `.btn` / `.btn.primary`. Machine output: `.machine` (mono, phosphor).

## Never

API keys in the browser · real patient data · image-model diagrams · unverified citations · medical claims beyond
the guidance in `data/datacard.md` · weakening a check to make it pass.
