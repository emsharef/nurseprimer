# Decisions log

Newest last. Each entry: date, decision, why, who. "Default" means Claude chose under the owner's instruction
of 2026-10-25 ("don't ask questions, start building ... work as you see best"); the owner can reverse any of them.

## 2026-10-25

- **Framework: Astro 7 + MDX** (default). Static pages by default with per-page scripts, so a long text-heavy
  book stays light and works without JS for reading; widgets hydrate only where used. Monorepo with npm
  workspaces (`apps/site`, `packages/*`). `.npmrc` sets `legacy-peer-deps` to work around an npm 11 arborist
  crash on vitest's optional peers.
- **Hosting: https://sharef.net/nurseprimer/** (owner). Static files rsynced to DreamHost, as for pbiggame
  (`npm run deploy`). The server has PHP but no Node, so the hosted-API proxy (M5) will be PHP, with keys
  stored outside the web folder.
- **Repo: github.com/emsharef/nurseprimer, public** (owner).
- **API keys** (owner): copied from ../musicdoo/.env into a gitignored `.env` (Anthropic, Google). Offline
  scripts only; never shipped to the browser.
- **Section 13 defaults** (all Claude defaults, open to reversal):
  1. *Audience:* ~~general readers first, with a Nurse / Coder / Curious picker~~ **superseded by the owner:**
     generalist readers with little AI familiarity; the nurse is the running example, not the audience. No
     reading tracks.
  2. *Math depth:* drawers only. A parallel technical track roughly doubles writing and review.
  3. *Compute:* in-browser training for chapters 1-10; for 11-13, train small things live where it runs in
     seconds, and otherwise ship precomputed weights with a visible "precomputed" label.
  4. *Format:* one continuous book site, but every chapter is a standalone page that works on its own
     (reader state is optional), so a class can assign a single chapter.
  5. *Accounts:* anonymous only (browser storage). Class accounts are out of scope for v1.
  6. *Frontier vendor:* Anthropic (key available) for judge, agent and capstone; recorded transcripts are
     the default, live mode goes through the proxy with a small per-visitor daily cap.
  7. *Illustration style:* decided in M8 with a style guide and character sheets first. Working direction:
     ink line with flat, limited colour washes in the site's palette (linen, navy, lamp amber), stylized,
     non-photoreal.
  8. *Clinical guidance:* label against NHS public guidance on meningitis/sepsis warning signs in children
     (version recorded in the datacard). **Clinical reviewer: needs the owner.** Until then every medical
     statement carries TODO(review).
  9. *License:* MIT for code, CC BY-NC 4.0 for book content (text, illustrations, dataset).
  10. *Optional chapters* (scale/cost, jobs): not in v1.
- **Design direction:** "ward at night". Linen and navy by day, deep blue-green at night, lamp amber as the
  interactive accent, alarm red reserved for urgency in data. Literata for reading; Atkinson Hyperlegible
  Next and Mono (designed for low-vision readers) for interface and widgets. The memorable element is the
  chapter opener printed on a patient wristband. Fonts self-hosted (offline reading, M3).
- **Math:** KaTeX at build time with HTML + MathML output; no client-side math, so formulas survive reader
  mode, text extraction and screen readers. The a11y lint fails on any formula without MathML.
- **Citations:** `<Cite k>` / `<NoteRef id>` / `<NoteDef id>` in MDX; `scripts/citation-audit.mjs` enforces
  plan 10.2. Entries record `verified.scope` (metadata or claim); normal builds warn on metadata-only,
  `--release` fails.
- **Team:** not the full proof_lab tmux lab (built for long-running research with a heartbeat and board).
  For a book, the owner's Claude session coordinates and spawns subagents per chapter in git worktrees, with
  role definitions in `.claude/agents/`: chapter-builder, accuracy-reviewer, reader-tester.

- **Owner corrections (2026-10-25, later):** audience is generalists new to AI; tone is an engaging, friendly
  interactive adventure like the Primer in *The Diamond Age*, not a textbook; illustrations use the latest Nano
  Banana generation (`gemini-nano-banana-2.1`, Nano Banana 2.1, per the Gemini models list); the look should be
  distinctive and tasteful, "a little cyberpunk but don't overdo it", not fairytale; the plan is a starting
  point, not a contract; use a critic agent.
- **Story frame:** chapters are nights; you are the new night nurse; Bea is the charge nurse; Wick is a
  clockwork owl you build. See `docs/style-guide.md`.
- **Look:** neo-Victorian with a little near-future. Warm paper matching the illustrations, midnight ink,
  lamplight gold for the human side, phosphor teal (sparingly) for the machine, alarm red only for urgency in
  data. Bodoni Moda (display), Literata (reading), Atkinson Hyperlegible Next and Mono (interface and machine
  output). Diagrams: precise ink lines with hatched fills. Replaces the earlier "ward" and "storybook" passes.
- **Arc:** adopted the story critic's restructure: prologue, twelve nights, morning (`docs/arc.md`), replacing
  plan section 5. Knobs becomes the Third Night.
- **Ward Board** is placed by each chapter where it belongs in the story (`<WardBoard />`), not appended to
  every page.
- **Corpus draft 1:** 2,549 verified messages (11 dropped after one rewrite), writer Claude Opus 5.5, blind
  verifier Claude Sonnet 5.5. Verification failures fell from 18% to 1.3% after fact-card reassurances were
  rephrased without double negatives. Status PENDING CLINICAL REVIEW.
- **Fifth Night (Words as Places), chapter-builder default.** The word map is count-based (co-occurrence within
  four words weighted 1/distance, PPMI with context smoothing 0.75, truncated SVD to 200 directions by subspace
  iteration), computed offline by `scripts/wordmap.mjs` into `public/data/wordmap.json` (575 KB, int8 per word with
  a per-word scale; deterministic). It reads the text of every split, test sets included, but no labels; the
  chapter says so, and pins that a map drawn from train alone still misses fewer Night Shift emergencies (24) but
  has no place for "speckles". The map-reader (average of unit word vectors, one knob per direction, standardized
  then folded back) trains in the browser with the Third Night's settings. Window 4 / 200 dims were picked from a
  small grid while building; every setting tried (100/300 dims, window 2/6) beat the bag of words on Night and 2 a.m.
  missed emergencies and none beat it on Day (pinned in the claims test). The picture is a seeded t-SNE of 276
  words (step size 1: the usual t-SNE step sizes diverge on this small set).
- **What turned out true, and the story follows it:** "speckles" does land among the rash words, but the new rash
  words were not where the bag of words failed (it caught 34 of 37; 36 mention the glass), and the map-reader gains
  on paraphrased warning signs instead (Night 22 missed vs 29, 2 a.m. 11 vs 18, Day slightly worse). The break:
  "she's covered in purple felt tip" is urgent (>99%) although it lands nearest felt/tip/drawing; and the measured
  bias: code-switched Bengali words share an island that leans can-wait (all 5 training messages with "ki" could
  wait), so appending "ami jani na ki korbo" flips 29 of 302 caught emergencies (bag of words: 2 of 289), and 3 of
  the 4 Night Shift emergencies the map-reader newly misses are code-switched or dialect. Firth is not quoted or
  cited (unverified); the idea is paraphrased.
- **Ward Board:** saving the map-reader also puts the Third Night's bag of words on the board (same id
  `ch3-trained`) if the reader has not, so the comparison is visible to readers who start at this chapter.
