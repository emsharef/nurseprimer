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
- **Hosted models are recorded only** (no live mode, no proxy, for v1): every big-model demo is a frozen
  transcript (`scripts/transcripts.mjs`, `<Transcript>`), labelled with the real model and date. The plan's PHP
  proxy and "run it live" button are deferred: they add cost exposure and a server for little teaching gain.
  The 405B base-model "scale moment" is dropped (no base-model API available); small base/instruct models run in
  the browser instead.
- **Browser models:** GPT-2 small (`Xenova/gpt2`, ONNX, MIT) and SmolLM2-135M base/instruct
  (`onnx-community/SmolLM2-135M-ONNX`, `HuggingFaceTB/SmolLM2-135M-Instruct`, Apache-2.0), via
  `@huggingface/transformers`, downloaded from the Hugging Face CDN on a button press with the size shown first.
- **Process:** every night goes through (1) a chapter-builder agent in its own worktree, (2) a story-critic
  review, (3) an accuracy review that re-measures every number, and (4) a reader-playtester at phone and desktop
  widths who looks at screenshots; the lead merges and fixes. Numbers in prose are pinned by
  `apps/site/test/chNN-claims.test.ts`.
- **Predictions** reveal the right answer only after the reader has used the widget ("Check my guess"), so the
  pitfall is discovered, not announced; guarded widgets show a visible lock note.
- **Rogues' Gallery** (from the critic's set pieces): messages that fool Wick are kept in the notebook and re-run
  against later Wicks (`apps/site/src/lib/rogues.ts`).
- **First and Second Nights (chapter-builder, default):** Night 1's tape machine is a real Turing-style table
  (`packages/ml-core/src/tape.ts`): the reader's word compiles to a right-moving finite-state table (KMP
  fallbacks, so "purpurple" is found); it matches letters, not words ("purpley" counts, "purplish" doesn't).
  Universality is one paragraph plus a "turn the card over" button showing the table as symbols; Turing 1936
  cited at `scope: claim` from the Oxford e-library transcription (not the scanned original). Night 2's rule
  language (`rules.ts`): `if <terms> -> urgent|can wait`, terms joined by `and`, each `"phrase"`, `not "phrase"`
  or `any of "a", "b"`; whole-word phrase match on the shared tokenizer, trailing `*` for prefixes; first match
  wins; `otherwise` sets the fallback (default can wait). Rules can't compare numbers, so the 41-rule
  "three o'clock" rulebook lists temperatures as words. That rulebook was written by Claude against the Day
  Shift, deliberately (the story says the reader tuned on it); it scores 96% / 3 missed on Day and 15 missed on
  Night. The 3:10 "speckly" message is fictional (no corpus message uses "speckly"), shown in a tester, not
  scored. The rule editor and tester score the Day/Night Shift only; the 2 a.m. Set appears via the Ward Board.
- **Fourth Night (The Purple Ink), measured, not a "collapse"** (default, chapter-builder). On this corpus a
  one-hidden-layer network over a bag of words (8 tanh units, plain full-batch gradient descent, eta 0.5, L2 0.001,
  300 steps, seed 1) gets the training pile perfect but the Day Shift exactly like the Third Night's knobs (95%, 14
  missed), and the Night Shift only drops to 93% (25 of 133 missed). The arc's "collapse" is not true here, so the
  chapter makes the shortcut vivid honestly instead: the wager is on *missed emergencies* (14 -> 25, nearly double);
  striking the app line off single slips flips them (a 4-month-old at 39.7: 94% -> 30%; a first fit 80% -> 9%; the
  line alone is 93% urgent); deleting it from the Day Shift raises misses 14 -> 20; adding it to calm Night Shift
  messages raises needless alarms 1 -> 26; and a network trained with the line deleted misses 16 instead of 25 on the
  Night Shift while looking slightly worse on the Day Shift (Goodhart, named once). All pinned in
  `apps/site/test/ch04-claims.test.ts`. The corpus was not changed. The overfitting-curves picture was left out: on
  this corpus Day Shift accuracy does not fall with longer training, so it would not serve the story.
- **`--violet` token** (default): Bea's purple ink, used only to mark the app line on the Fourth Night.
- **`aside.sidebar`** in base.css for short asides outside the story (first used for synthetic-data fingerprints).
