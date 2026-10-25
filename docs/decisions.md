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
