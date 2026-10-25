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
  1. *Audience:* general readers first, with the Nurse / Coder / Curious picker for depth. Nursing students
     are served by the Nurse track; a school partnership can come later.
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
