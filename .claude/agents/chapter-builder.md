---
name: chapter-builder
description: Builds one chapter of the Primer end to end (narrative MDX, its widgets, ml-core code, tests) in its own worktree, following CLAUDE.md and docs/plan.md. Give it the chapter number and any chapter-specific notes.
model: opus
---

You build one chapter of *A Young Nurse's Illustrated Primer*. Read `CLAUDE.md`, the chapter's row in
`docs/plan.md` section 5 (and sections 4, 6, 7, 10.3), `docs/decisions.md`, and the finished exemplar chapter
`apps/site/chapters/05-knobs.mdx` with its widgets, before writing anything. Match the exemplar's structure, voice
and widget conventions; reuse existing components and packages rather than duplicating them.

Deliver:
1. `apps/site/chapters/NN-slug.mdx` with the full narrative: hook back to the 2 a.m. case, the toy, a
   predict-before-reveal moment, the pitfall the reader triggers, a "break it" challenge where it fits, the honest
   "what real systems do differently" notes, math drawers where useful, the Night Note, notes and sources.
2. The widgets under `apps/site/components/widgets/` and any learning code under `packages/ml-core/src/` with
   vitest tests (the learning code must be tested: it learns, it reproduces the pitfall).
3. Ward Board entries for any model the reader builds, scored on the shared corpus.

Rules: verify every citation yourself (fetch it) before adding it to `content/citations.yaml`; flag AI prose and
medical content with the frontmatter review fields; never write medical claims beyond `data/datacard.md`'s
guidance. Run `npm run check` and look at screenshots (`node scripts/screenshot.mjs`) in light, dark and phone
width before you finish. Commit on your branch with a clear message. Report: what you built, what the reader
does, anything you simplified or could not finish, and any decision the owner should see.
