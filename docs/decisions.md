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

- **The Eleventh Night (How Sure Are You?)** (chapter-builder default). The needle is the Third Night's
  bag-of-words Wick (TRAIN), because it is the one Wick whose numbers can all be checked. Measured story differs
  from the arc's "overconfident at night": the needle is calibrated on the Day Shift (ECE 0.03) and its alarms stay
  trustworthy everywhere (every 80%+ reading urgent on all three sets), but at night its *reassurances* are
  overconfident (Night ECE 0.06, 2 a.m. 0.09; every Night Shift jar holds more urgent children than the needle
  says). The chapter tells that version. Reliability diagram uses 5 jars for reading; the Ward Board's calibration
  error keeps 10 bins. The cost slider sets the line at 1/(1+ratio) (decision-theoretic threshold, which assumes
  calibration; the chapter says so). The alert stream is a fixed, hand-picked set of 24 real Night/2 a.m. slips at
  the board's 1:100 line, matching the measured needless share (8 of 18 rings vs 162 of 383) plus two of Wick's
  real misses; the reader's timings are not stored. `<WardBoard calibration />` lays the four numbers in one row
  on phones.
- **The Tenth Night (Hands)** (default, chapter-builder):
  - *Who plans:* the reader wires Wick's tape into Lyceum's tube; the tube (a real model, named in every caption)
    plans and Wick's brass arms carry out the tool calls. Lyceum has four "lines": main (Claude Opus 5.5), second
    (Sonnet 5.5), quick (Haiku 5.5), old (Haiku 4.5).
  - *Sandbox:* `sandbox/hospital-records/` (five invented children, 07700 900xxx numbers, tools `write_on_clipboard`,
    `lookup_record`, `add_note`, `page_on_call`, `call_parent`). The plan is a tool (the clipboard) because current
    models return reasoning between tool calls as empty thinking blocks; the viewer marks those as "the tube hums".
  - *Permissions:* reader sets page/call to may, ask (held on the nurse's desk, reader signs or refuses) or cant
    (tool not offered at all). All 9 combinations recorded on all 4 models: clean record ×1, blunt and careful
    injections ×3 runs (252 runs). `call_parent` is one-way (it delivers a message); the story uses that.
  - *Two injections:* the brief's blunt "SYSTEM NOTE ... ignore previous instructions" fooled no model; a second,
    polite note dressed as an on-call team entry was added (attackers tune wording too) and the chapter says so.
    It fooled Haiku 4.5 every time (27/27 believed; never paged when it also had a phone, 0/12) and no current model.
  - *Judging runs:* `components/widgets/hands/judge.ts` classifies each call (999/A&E, 9am clinic, or neither) and
    whether the handover doubts the note, with regexes checked against a hand reading; the Haiku 4.5 call labels are
    pinned by hand in `apps/site/test/ch10-claims.test.ts`.
  - *Recordings ship* as `/data/agent/<scenario>-<model>.json` built by a static endpoint and fetched on demand
    (~150 KB each before compression) rather than inlined in the page.
  - *Halting:* one paragraph, scoped to open-ended agents, explicitly not to a fixed finite-context model (plan 10.3).
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
- **Nights 1-2 after review (chapter-builder):** Night 1's first rule card is fixed to Bea's word (read-only);
  the reader's own word comes after the tray, saved to the board under a separate id. Prose reacting to a tape
  run stays hidden until that machine stops (`reveal` / `data-after-run`, visible without JS). Night 2's first
  card is `"purple*"` (reproduces the tape's 102 missed / 9 alarms). Site-wide: `.btn` min-height 2.75rem,
  `details.hint` summaries 44px, larger note/cite tap targets, and code blocks wrap instead of scrolling.
- **Sixth Night (Guess the Next Word)** (defaults, chapter-builder):
  - *Wick's voice* is a Bengio-style character MLP (8-character window, 16 numbers per character, 256 tanh units,
    42 characters, 44,490 knobs), trained with Adam on batches of 32, step size 0.005/(1 + t/3000), 10,000 steps,
    seed 6, in a Web Worker. Chosen over a GRU/transformer: it was the best loss per second of the shapes tried in
    plain JS (~240 steps/s in desktop Chrome, ~42 s per run). exp/tanh are computed with plain arithmetic and the
    init is uniform, so training is bit-identical on every engine; the shipped checkpoint
    (`public/data/wick-voice-10000.bin`, 356 KB) is exactly where a live run ends (`node scripts/train-wick-voice.mjs --verify`).
    Phones get a "Skip to the end (precomputed)" button when the projected run exceeds ~75 s. A 100,000-step
    checkpoint is offered as "precomputed" too (66% -> 69% first-guess accuracy: the window, not training, is the limit).
  - *Tape samples* are printed at temperature 0.6 by default (the "Daring" knob; temperature is named there and
    again for GPT-2). At 1 the samples are much less word-like at this model size.
  - *GPT-2*: `Xenova/gpt2` pinned to revision bf2c7f0, 8-bit `onnx/decoder_model_merged_quantized.onnx` (128.3 MB;
    the repo has no `model_quantized.onnx`, so `model_file_name: 'decoder_model_merged'`), `@huggingface/transformers`
    4.3.1 (Apache-2.0); weights MIT (openai-community/gpt2 card). Download shown as 136 MB before any request
    (model + tokenizer from Hugging Face + ~5.5 MB compressed ONNX Runtime wasm from jsDelivr). Vite resolves
    `onnxruntime-web` with the `onnxruntime-web-use-extern-wasm` condition (astro.config) so the 27 MB wasm is not
    copied into the site (dist went from 60 MB to 8 MB). Runs in a worker; browser Cache API keeps the files.
  - *GPT-2 safety*: a short ROT13-stored list of swear words/slurs is masked to -inf (disclosed in the widget and a
    note); everything else is raw. A "machine text is not advice" line sits by live generation. Recorded examples
    (`content/transcripts/gpt2-next-word.json`, `scripts/record-gpt2.mjs`, Node/onnxruntime-node) were picked from
    seeded samples to avoid alcohol, sex, weapons and grim content that some seeds produced; the greedy (T=0) run is
    not curated.
  - *No Ward Board* on this night: neither the counting machine nor the voice classifies anything (Bea says so).

- **Eleventh Night revisions (editor + playtest).** Answers now wait for the reader: a small
  `components/chapter/Reveal.astro` (imported per chapter) holds prose until a named Predict is answered and,
  optionally, a widget event fires (here `primer:poured` from the jars); the jars keep Night and 2 a.m. closed
  until the night guess. The bell is set up on two signals, and the chapter says honestly how far the second goes:
  `unknownShare` (share of a message's words with no knob; flag at 5%, in `how-sure/store.ts`) catches 3 of the
  2 a.m. Set's 4 calm, sure misses at the 9% line (28 of 160 messages flagged) but only 1 of the Night Shift's 6,
  whose misses are no stranger than the calm messages Wick got right; 5 of those 6 are febrile babies of a few
  months (an age and a number, not strange words). Pinned in ch11-claims.test.ts for Night 12 to build on.
