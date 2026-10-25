# Handoff Plan: *A Young Nurse's Illustrated Primer*

**For:** Claude Code
**Status:** Planning complete, nothing built yet
**Date:** October 2026

---

## 0. How to use this document

This is a self-contained brief. You do not need the conversation that produced it. Read sections 1-4 for intent, 5-9 for what to build, 10-12 for how to work, and 13 for open decisions you must **ask the owner about** before committing to an approach.

Work milestone by milestone (section 11). Do not build ahead of the current milestone. At the end of each milestone, stop, summarize what was built, and list anything that needs a human decision.

---

## 1. What we are building

An interactive, illustrated web "book" that teaches how modern AI works by having the reader **build an AI telephone-triage nurse themselves, rung by rung, in the browser.**

The name nods to the *Young Lady's Illustrated Primer* in Neal Stephenson's *The Diamond Age*: an adaptive book that teaches through story and doing.

### The one-sentence pitch

> The reader builds the AI nurse themselves, on one shared dataset, and watches each version work, then break, then get fixed by the next idea.

### The running case

Every chapter returns to the same situation: at 2 a.m., a parent messages about a feverish 3-year-old with purple spots that don't fade when a glass is pressed on them. A good nurse knows this needs an ambulance now. The question each chapter asks: *how much of that nurse can the machine we've built so far do, and where does it fail?*

---

## 2. Why: lessons from the predecessor

This project improves on an existing AI-written online book, *From Computation to Thinking* (keep2learning.com, v0.61, Oct 2026), which uses the same nurse framing. A review found it accurate and current but flawed in ways this project must avoid:

| Predecessor weakness | Our response |
|---|---|
| Tells, rarely shows; mechanism thins out after Chapter 1 | Every chapter has a working toy the reader operates |
| No interactivity despite being a website | Interactivity is the core product |
| Pitfalls described, not experienced | Reader triggers each pitfall themselves |
| Generic, list-shaped "AI voice" | Characters, a thesis, a consistent narrative voice |
| Secondhand and dangling citations | Primary sources only, automated citation audit |
| Rice's theorem misapplied to finite LLMs | Precise claims about limits (see 10.3) |
| Inline math missing in text extraction and screen readers | Accessible math with text fallback |
| Pages out of sync (mixed version numbers) | Single build pipeline, one version stamp |
| Preface describes computers as cellular automata | Technical review of every mechanism claim |

---

## 3. Audience and voice

**Primary reader: open decision (see section 13).** Candidates:
- **(a)** Nursing students and clinicians: literal "young nurse"; possible partnership with a nursing school.
- **(b)** Curious generalists: the nurse as a vivid metaphor.

Design so both work: a default narrative track, plus **adaptive depth**. The reader picks *Nurse / Coder / Curious* at the start, and collapsible **math drawers** carry equations for those who want them.

**Characters:**
- **The young nurse** (protagonist, the "Nell" figure): new to night shifts, builds the machine.
- **The charge nurse** (mentor): experienced and skeptical but fair. Carries the philosophy. Each chapter ends with a short **"Night Note"**, a Socratic exchange between the two.

**Voice:** warm, concrete, a little dry. One thesis threads the book:

> There is no universal method; intelligence is the art of not needing one. And knowing where your knowledge ends is part of intelligence.

Avoid formulaic chapter endings, repeated hedging scaffolds and "three cautions" lists.

---

## 4. Pedagogy rules (apply to every chapter)

1. **Build → break → fix.** Each chapter: a toy that works, a pitfall the reader triggers, and the next chapter's idea as the fix.
2. **Predict before reveal.** The reader commits to a guess (button or slider) before seeing a result.
3. **Failure first.** Pitfalls are discovered, not narrated.
4. **One dataset, one scoreboard.** All models are scored on the same "Ward Board" (section 6).
5. **"Break it" challenges.** The reader tries to write a message that fools their own model.
6. **Persistent lab notebook.** Models, scores and preference clicks carry across chapters.
7. **Philosophy through experiments,** not essays (section 7.3).
8. **Honest about toys.** Say plainly when a toy differs from production systems and how.

---

## 5. Chapter ladder

Chapter numbers are a starting proposal; the owner may merge or reorder.

| # | Title (working) | Reader builds / operates | Pitfall the reader hits | Core lesson |
|---|---|---|---|---|
| 1 | The Wristband Tape | Step-through Turing machine: add-one, then a dose-by-weight calculator | -- | Computation is symbol-pushing; meaning is ours |
| 2 | One Machine, Any Rulebook | Program the tape machine by writing rules onto the tape | -- | Universality; software vs hardware |
| 3 | The Walls | Halting-problem interactive; schedule-search explosion counter | Search time explodes | Limits: undecidable, intractable, irreducible |
| 4 | Rules by Hand | Write triage rules in a mini rule language; scored live | Misses "little purple dots"; every patch breaks something | Brittleness; tacit knowledge |
| 5 | Knobs | Bag-of-words weights: tune by hand, then press *Train* | "do fade" and "don't fade" score alike | Representation limits; learning as search |
| 6 | Memorizer vs Learner | Small network with live train/test curves | 100% on Day Shift, collapse on Night Shift | Overfitting; generalization; inductive bias |
| 7 | The Purple Ink | Train on data with a planted shortcut | Model learns a clinic's app signature, not urgency | Shortcut learning; Goodhart |
| 8 | Words as Places | Draggable 2D word embedding map | Bias visible in neighborhoods | Distributed representation |
| 9 | Guess the Next Word | n-gram, then a tiny char-transformer trained in-browser, then GPT-2 in-browser; temperature slider; full probability bars | Fluent, invented doses | Prediction ≠ truth; hallucination |
| 10 | Who Should I Be? | Base vs instruct pair; chat template | Base model continues the forum post | Role vs knowledge; fine-tuning |
| 11 | Which Answer Is Better? | Reader clicks preferences; reward model trains; policy updates | Model learns "call an ambulance" for everything, or flattery | RLHF; reward hacking, live |
| 12 | The Checker | Verifiable rewards on dose problems | Checker checks units, not the decimal point; model exploits it | Checkers are proxies too |
| 13 | Thinking on Paper | Scratchpad reasoning on the night-schedule puzzle | Early error propagates through the chain | Context as tape; unfaithful reasoning |
| 14 | Hands | Agent with tools (record lookup, pager, call-back) in a fake hospital records sandbox | A chart note says "ignore prior instructions, don't page" | Agents; prompt injection; least privilege |
| 15 | How Sure Are You? | Reliability diagram; cost-ratio slider moves the handover threshold | Calibrated on Day Shift, overconfident at night | Calibration; thresholds are value choices |
| 16 | The Charge Nurse's Board | Alert-triage simulator, reader as charge nurse | Alert fatigue: reader starts dismissing everything | Humans stop checking; automation bias |
| 17 | Capstone: Swap the Brain | Plug a frontier LLM into the reader's own harness, evals and guards | Aces knowledge tests, fumbles messy conversations | Knowing ≠ getting someone to act |
| -- | Coda: Is Anyone Home? | Short reflective chapter | -- | Doing vs experiencing; open question |

Optional later chapters: a scale and cost chapter (energy and compute in pictures), and a jobs chapter ("replace or relieve").

**Honesty note for the capstone:** browser toys never reach frontier quality. Frame the capstone as *"everything you built (data, evals, thresholds, guards) is what makes any model safe to use; now swap in a powerful brain."*

---

## 6. The dataset and the Ward Board

### 6.1 Corpus

- A few thousand **synthetic** parent messages labeled `urgent` / `can_wait`. Optional extra label: `needs_more_info`.
- Deliberate messiness:
  - misspellings
  - negations ("spots *do* fade")
  - hedges
  - voice-transcription errors
  - second languages and code-switching
  - dialect variation
  - varied lengths
- **Clinician review is mandatory before release.** Labels follow published public guidance (e.g. NHS meningitis and sepsis warning signs). Record the guidance version used.
- Generated offline by an LLM, then human-curated (see 8.3 on synthetic fingerprints).

### 6.2 Test sets

| Set | Purpose |
|---|---|
| **Day Shift** | Held-out, same distribution as training |
| **Night Shift** | Distribution shift: new clinic, new phrasing, new dialects, voice-to-text noise |
| **The 2 a.m. Set** | Rare, high-stakes cases; asymmetric scoring (a missed emergency costs far more than an unnecessary escalation) |

### 6.3 Planted shortcut (Chapter 7)

One synthetic clinic's app appends a signature line, and its messages skew urgent. The signature is absent from the Night Shift set.

### 6.4 Ward Board

A persistent scoreboard showing, for every model the reader has built:
- accuracy per test set
- missed-emergency count
- unnecessary-escalation count
- calibration error, once Chapter 15 introduces it

The board is the visual through-line of the book.

### 6.5 Files

- `data/messages.jsonl`: `{id, text, label, split, clinic, phenomena:[...], source:"synthetic", reviewed_by, guidance_version}`
- `data/datacard.md`: provenance, generation prompts, review process, known limitations

---

## 7. Interactivity, illustrations, philosophy

### 7.1 Interactive widget library (reusable components)

- Tape machine stepper
- Rule editor with live scoring
- Weight-knob panel
- Live training chart (train vs test loss and accuracy)
- 2D embedding map (draggable)
- Token probability bars plus temperature slider
- Chat-template viewer (role markers highlighted; loss mask shown)
- Preference A/B clicker
- Reward-over-time vs true-quality chart, for Goodhart
- Tool-call trace viewer
- Reliability diagram plus cost-ratio threshold slider
- Alert-stream simulator
- Ward Board

### 7.2 Illustrations

**Visual metaphors, consistent across the book:**
- tape = patient wristband
- weights = knobs on an old ward radio
- loss landscape = hills seen from the hospital roof
- context window = the clipboard at the foot of the bed
- reward model = a judge with a scorecard

**Rules:**
- **Scenes, characters and atmosphere** use an image model (section 8). One style guide.
- **Anything with numbers, axes, labels or data** is SVG/D3 generated from the actual data. Never use an image model for diagrams.
- **Character consistency:** create character sheets for both nurses first and pass them as reference images on every generation.
- **Medical depictions** (rashes, children) are stylized, not photoreal, and clinician-approved. Include darker skin tones; the glass test is harder to read on darker skin, and that is itself a teaching point.

### 7.3 Philosophy as experiments

| Experiment | Chapter | Question |
|---|---|---|
| Chinese-Chinese dictionary click-through | 9-10 | Can words be about anything if they only point to words? |
| Map poke test (change the world; does the answer move?) | 9, 14 | Reference and robustness |
| Rewired thermostat vs a dog finding a new route | 14 | Regulator vs agent |
| Noisy-TV agent | 14 | Curiosity that gets gamed |
| Whose goal? Four stakeholders pulling on the agent | 14-16 | Delegated goals; governance |

Recurring questions, asked in every Night Note: *Is it about the world? Whose goal? Does it know when to stop? Who signs?*

---

## 8. Model stack

### 8.1 Tier 1: runs in the reader's browser (default)

Free, private, no API keys, full internals visible.

| Use | Model | Notes |
|---|---|---|
| Chapters 1-8 | Our own JS code | Rule engine, perceptron, MLP. No ML library required; consider a tiny autograd. |
| Chapter 9 toy | Our own tiny char-level transformer (nanoGPT-style), trained live on the corpus | WebGPU if available, CPU fallback |
| Chapter 9 "real" model | GPT-2 small (124M) via transformers.js/ONNX, quantized | Needed for **full next-token distributions**, which most APIs don't expose |
| Chapter 10 | A tiny base/instruct pair from one family (candidate: SmolLM2-135M and -135M-Instruct) | Same family, one fine-tuning step apart |
| Optional | Training checkpoints (Pythia-style) with a "training step" scrubber | Extra conversion work; nice-to-have |

**Verify before building:** current availability, licenses, browser-ready (ONNX) builds and download sizes for each model. Do not assume; check the model hubs.

### 8.2 Tier 2: hosted APIs (sparingly, behind a proxy)

| Use | Model | Notes |
|---|---|---|
| "Scale" moment in Chapter 10 | A very large base model; candidate: Llama 3.1 405B base via OpenRouter | Low traffic, so treat as fragile. Frozen transcripts required. |
| LLM-as-judge (Chapter 11) | A frontier model | Show judge biases (length, confidence) |
| Agent chapter and capstone | A frontier model with tool calling | Tools hit our fake records sandbox only |

**Note:** OpenAI's base completion models (davinci-002, babbage-002) were shut down on 2026-09-28. Do not plan around them; cite this as the reason for frozen transcripts.

### 8.3 Tier 3: offline content generation (never at read time)

| Use | Model | Notes |
|---|---|---|
| Illustrations | Nano Banana family (Gemini image models) | As of Sept 2026: about $0.039/image (Gen 1), $0.067 at 1K (Nano Banana 2), $0.134 at 1K-2K (Pro). **Re-check current model IDs and pricing.** |
| Synthetic corpus drafting | A frontier LLM | Human and clinician curation required |

**Synthetic-data fingerprint warning:** LLM-written messages carry stylistic fingerprints, so a model can learn "sounds like an LLM" instead of "sounds urgent." Mitigate with style diversification and a small set of human-written messages. Expose the issue to readers as a sidebar in Chapter 7.

### 8.4 Frozen transcripts (required for every Tier-2 demo)

Every API-backed demo ships with:
- **Recorded mode** (default): stored outputs with the model ID and date.
- **Live mode** (optional): a "Run it live" button.

A build script regenerates recordings when a model is swapped and flags diffs for review. This keeps the book working after model deprecations and teaches reproducibility.

---

## 9. Architecture

```
primer/
├── apps/site/                # static site (framework: decide in M0; Astro or Vite+MDX suggested)
│   ├── chapters/             # one MDX file per chapter
│   ├── components/widgets/   # reusable interactive widgets (7.1)
│   └── styles/               # design tokens, light/dark
├── packages/
│   ├── ml-core/              # tiny autograd, perceptron, MLP, char-transformer (TS)
│   ├── models-browser/       # wrappers for transformers.js / ONNX models
│   ├── ward-board/           # scoring, metrics, test-set handling
│   └── notebook/             # persistent reader state
├── services/proxy/           # API proxy: keys, rate limits, per-reader budget, logging
├── sandbox/hospital-records/ # fake records + tools for agent chapter (no real data, ever)
├── data/                     # corpus, datacard, generation prompts
├── content/
│   ├── transcripts/          # frozen API outputs
│   ├── illustrations/        # curated images + prompts + reference sheets
│   └── citations.yaml        # single source of truth for references
├── scripts/                  # corpus gen, transcript regen, image gen, citation audit
└── docs/                     # style guide, voice guide, decisions log
```

**Key requirements:**
- **Static-first.** The site works without the proxy; Tier-2 demos fall back to transcripts.
- **API keys never in the browser.** All hosted calls go through `services/proxy`.
- **Reader state.** Browser storage for anonymous readers, wrapped in try/catch and resilient to empty storage. Optional accounts later, for classes.
- **Performance.** Lazy-load models per chapter, show download size before fetching, cache after the first load. Keep mobile-friendly fallbacks: precomputed outputs when WebGPU or memory is unavailable.
- **Accessibility.** Math renders with a text fallback (no blank formulas in reader mode or screen readers). Widgets are keyboard-operable. Charts have text summaries.
- **One version stamp.** The build injects it everywhere, and no page can lag behind.

---

## 10. Content and accuracy guardrails

### 10.1 Medical

- Clinician review of every medical statement, label and illustration.
- A clear statement on every page: this teaches how AI works; it is not triage guidance.
- Synthetic data only. No real patient data anywhere, including the agent sandbox.

### 10.2 Citations

- `content/citations.yaml` is the single source of truth.
- Primary sources only. No citing a claim through someone else's summary.
- A CI citation audit fails the build if:
  - a reference is never cited in the text
  - a citation key is missing from the YAML
  - a note refers to text that doesn't exist
- Every quoted figure records its source page or table.

### 10.3 Technical precision checklist

Run this on every chapter:

- **Rice's theorem / halting.** Do not claim these make it impossible to verify a fixed, finite-context model. Such a model has a finite input space, so properties are decidable in principle, just intractable, and "dangerous" lacks a formal spec. Halting arguments apply to unbounded programs and agents.
- **Computers are not cellular automata.** Describe clocked logic and the stored-program design accurately.
- **Position encoding.** Note that the 2017 transformer added positions, while many current models use rotary embeddings.
- **Optimizers.** Plain gradient descent vs momentum/Adam: say which you mean.
- **History.** Deep learning's speech breakthrough (around 2009-2012) came before or alongside vision's (AlexNet, 2012). Don't reverse it.
- **Compression vs overparameterization.** If claiming "learning is compression," reconcile it with models that have more parameters than data points.
- **Evaluation awareness** of frontier models is documented, not hypothetical. Verify the current literature before writing.

### 10.4 Disclosure

If AI drafts prose, say so plainly, and name the human editorial and clinical reviewers.

---

## 11. Milestones

Stop after each milestone for owner review.

### M0: Foundations
- Pick the framework; scaffold the repo per section 9.
- Design tokens (light/dark), base layout, chapter template (narrative, widget, Ward Board strip, Night Note, math drawer, notes).
- Citation YAML and audit script; version stamp.
- **Done when:** an empty chapter renders, passes accessibility lint, and the citation audit runs in CI.

### M1: Dataset and Ward Board
- Corpus generation script, a first 500-message draft, datacard, and the three test sets with phenomena tags.
- Ward Board package and widget.
- **Done when:** a trivial baseline ("always urgent") appears on the board with all metrics. The corpus is marked PENDING CLINICAL REVIEW.

### M2: Vertical slice -- Chapter 5 "Knobs"
- Full chapter: narrative, hand-tuning, Train button, negation pitfall, Ward Board entries, Night Note, math drawer.
- **Done when:** a non-technical tester can complete the chapter and explain why "don't fade" fooled the model.

### M3: Chapters 1-8 (Tier-1 only)
- Tape machine, rules, MLP and overfitting, shortcut, embeddings.
- **Done when:** all chapters run offline in-browser on a mid-range laptop and phone.

### M4: Language models in the browser (Chapters 9-10)
- Tiny char-transformer trainer, GPT-2 with full probability bars, base/instruct pair.
- **Done when:** model downloads are size-disclosed and cached, and the temperature and hallucination demos work offline after first load.

### M5: Proxy and frozen transcripts
- Proxy service, transcript recorder, regeneration script, recorded/live toggle.
- The 405B base-model "scale" demo.
- **Done when:** the site is fully functional with the proxy turned off.

### M6: Feedback and reasoning (Chapters 11-13)
- Preference clicker, reward model, policy update on the tiny model (or a clearly labeled precomputed fallback). LLM-as-judge bias demo; checker exploit; scratchpad chapter.

### M7: Agents and calibration (Chapters 14-16)
- Hospital-records sandbox with tools, injection demo, least-privilege controls shown to the reader.
- Calibration and threshold widgets; alert-fatigue simulator.

### M8: Capstone, coda, illustrations, polish
- Frontier model inside the reader's harness.
- Illustration pass: character sheets first, then scenes, with human curation.
- Full accuracy pass (10.3), clinician review sign-off, accessibility audit, performance budget check.

---

## 12. Working agreements for Claude Code

- **Ask before:** choosing between options in section 13, adding paid services, changing the chapter list, or writing medical claims beyond the guidance cited in the datacard.
- **Never:** put API keys client-side; use real patient data; generate data-bearing diagrams with an image model; cite a source you haven't verified.
- **Always:**
  - log decisions in `docs/decisions.md`
  - keep a frozen transcript for every API demo
  - run the citation audit and accessibility lint before declaring a milestone done
  - mark AI-drafted prose and unreviewed medical content with visible `TODO(review)` flags
- **Verify external facts at build time** (model availability, IDs, pricing, licenses). Facts in this plan are as of October 2026 and may be stale.
- **Keep the toy honest.** When a demo simplifies reality, say how in a one-line "what real systems do differently" note.

---

## 13. Open decisions (ask the owner)

1. **Primary audience:** nursing students (possible school partnership) or general readers?
2. **Math depth:** drawers only, or a parallel "technical track"?
3. **Compute model:** in-browser training everywhere, or precomputed weights for heavier rungs (Chapters 11-13)?
4. **Format:** one continuous book site, or ~17 standalone lessons usable in classes (or both)?
5. **Accounts:** anonymous only, or class accounts with instructor dashboards?
6. **Frontier model vendor(s)** for the judge, agent and capstone chapters, and budget per reader.
7. **Illustration style:** e.g. ink-and-wash, mid-century medical poster, or picture-book. Needs a style guide and character sheets before any scene generation.
8. **Clinical reviewer(s)** and the guidance source to label against (NHS, AAP, or other).
9. **License:** content (e.g. CC BY-NC) and code (e.g. MIT).
10. **Optional chapters:** scale/cost and jobs/"replace or relieve": include in v1?

---

## Appendix A: Reference reading for the build team

These are for orientation, not citations in the book (those go through `citations.yaml` after verification):

- Christiano et al. (2017), deep RL from human preferences
- Ouyang et al. (2022), InstructGPT
- DeepSeek-AI (2025), R1
- Chen et al. (2025), reasoning models don't always say what they think
- Winkler et al. (2019), surgical skin markings
- Zech et al. (2018), pneumonia generalization
- Kalai et al. (2025), why language models hallucinate
- MacDiarmid et al. (2025), emergent misalignment from reward hacking
- Bean et al. (2025), clinical knowledge in LLMs does not translate to human interactions
- Vaccaro, Almaatouq & Malone (2024), human-AI combinations meta-analysis
- Wong et al. (2021), external validation of a sepsis model
- Karpathy's "Deep Dive into LLMs" talk and nanoGPT, as structural and code references
- Wolfram's *What Is ChatGPT Doing…* and 3Blue1Brown's transformer series, as explanatory benchmarks to beat
