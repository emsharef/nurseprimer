# Building a night: the brief every chapter-builder follows

Read `CLAUDE.md`, `docs/style-guide.md`, `docs/arc.md` and `docs/decisions.md` first, then the reviewed chapters
before and after yours (all of `apps/site/chapters/`), and the exemplar `03-knobs.mdx` with its widgets and
`apps/site/test/ch03-claims.test.ts`. Match their structure, voice and quality bar.

## What reviewers caught on earlier nights (don't repeat these)

- **Answers in plain sight.** The paragraph after a `<Predict lock>`/widget was readable before the reader guessed,
  so the "discovery" was told. Put every answer paragraph, tally table, illustration or caption that gives the
  result away *inside the reveal* (shown after the guess or after the run), with a no-JS fallback. Use `answer` on
  `<Predict>` so the right answer appears only via "Check my guess" after the widget.
- **Claims the data didn't support.** Several nights' planned lessons (a Night Shift "collapse", "speckles" as the
  failure) weren't true on this corpus. Measure first with the widget's own code (`node
  --experimental-strip-types`; no TS parameter properties), then write the story the data tells. Pin every number
  and every "X caught / Y missed" in `apps/site/test/chNN-claims.test.ts`. Say "about half" only if it's about half.
- **Explaining before breaking.** Let the reader trigger the pitfall, then explain once. Don't narrate a run the
  reader hasn't done yet; don't repeat the lesson after it lands.
- **Continuity.** Re-read the previous night's last scene and Night Note and the next night's opening; quote them
  exactly. Lyceum's twelve-night trial is the clock. Wick's parts accumulate (tape, rulebook, knobs, wires, map,
  voice, clipboard, role, hands, gauge, bell).
- **Technical overreach.** Precise claims only (plan 10.3). Say what a mechanism can't do correctly (e.g. a single
  row of knobs *can* fire on two words together; what it can't do is let one word's push depend on the others).
  Hedge generalisations from one model or one corpus ("on this desk…").
- **Citations.** Only `scope: claim` if you read the passage that supports the sentence; otherwise `metadata`.
  Every quoted number gets `figures` with page/table. Watch for duplicate keys across nights (merge conflicts).
- **Phones.** Answers and controls scroll off-screen; long mono text is tiring; `touch-action: none` hijacks
  scrolling (drag only from a handle, or `pan-y` + horizontal intent); inputs ≥16px with
  `autocorrect="off" autocapitalize="off" spellcheck="false"` where people type code or odd words; ≥44px targets;
  keyboard focus must not drop to `<body>` when lists re-render; timed widgets need pause and must keep the current
  item readable while paused.
- **Tone.** No "Here's the thing", "Here's what happened", rule-of-three lists, stacked rhetorical questions, tidy
  morals, "Nobody…" refrains, recaps. Bea carries the morals, briefly.
- **Medical.** Stay inside `data/datacard.md`; never doses. Model-written text (transcripts, agent notes) gets a
  clear "this is the model's own, not this book's advice" line where it's shown.

## The workflow

1. Measure, then outline the night (scene → toy → guess → break → idea → Night Note hook).
2. Build learning code in `packages/*/src` with vitest tests; widgets in `apps/site/components/widgets/<night>/`.
3. Write the chapter (`apps/site/chapters/NN-slug.mdx`), frontmatter review flags, `<WardBoard />` where machines go
   up, `mountRogues` for any new classifier.
4. Illustrations in `content/illustrations/manifest.d/NN-slug.yaml` (refs: `sheet-you`, `sheet-bea`, `sheet-wick`),
   generate with `PRIMER_ENV=<main checkout>/.env node scripts/illustrate.mjs <ids> --n 2`, LOOK at each, pick,
   copy to `content/illustrations/<id>.png`, `node scripts/illustrate.mjs --publish`. No legible text in images.
5. Big hosted models: recorded only (`scripts/transcripts.mjs` / your own recorder), never faked, model and date
   shown.
6. `npm run check`; `scripts/playtest/chNN.mjs` at 390×844 (isMobile, hasTouch) light and dark, 360, desktop and a
   keyboard pass; `node scripts/playtest/overflow.mjs /chapters/<id>/ 390`; LOOK at the screenshots and fix.
7. Re-read the prose as a hostile editor. Commit on your branch (end with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`); don't push or deploy.
8. Report: branch, files, what the reader does, measured numbers, where the data differed from the arc,
   simplifications, decisions (also append to `docs/decisions.md`), 3-4 screenshot paths.
