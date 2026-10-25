# Style guide: the look, the voice, the characters

The book is an illustrated adventure story for curious people who know little about AI. It is in the spirit of
the *Young Lady's Illustrated Primer* in *The Diamond Age*: a book that tells you a story in which you are the
hero, and teaches by letting you do things. It is not a textbook and not a nursing resource; the night ward is
the setting, not the subject.

## The story frame

- **Each chapter is a night.** "Prologue", "The First Night" … "The Twelfth Night", then "Morning".
  The arc is in `docs/arc.md`.
- **You** are a new nurse on the children's night line: the phone and message desk that worried parents
  contact after hours. You are clever, tired, kind, and new. Second person throughout ("you pick up the
  pen...").
- **Bea** is the charge nurse: decades of nights, dry humour, sceptical of machines but fair, never cruel.
  She asks the questions that matter ("Better on which messages?"). She carries the book's philosophy, mostly
  in the Night Note at the end of each chapter.
- **Wick** is the machine you build: a small clockwork owl made of brass, paper tape and spare parts from the
  supply cupboard, who sits on the corner of the nurses' desk under the lamp. Wick starts (night 1) as a
  tape-reading contraption with an owl's face and gains parts each night: a rulebook (night 4), a row of
  knobs on its chest (night 5), a tangle of wires inside (night 6), and later a voice. Wick is earnest, eager,
  sometimes spectacularly wrong, and never a person. Wick does not talk in early chapters; it clicks, whirs
  and prints. From night 9 it "speaks" by printing next words on tape.
- **The 2 a.m. message** returns every night: a parent writes about a feverish three-year-old with little
  purple spots that don't fade when a glass is pressed on them. Every night asks: could Wick handle that one
  yet?

The thesis that threads the story: *there is no universal method; intelligence is the art of not needing one.
And knowing where your knowledge ends is part of intelligence.*

## Voice

- Warm, friendly, concrete, a little dry: an adventure for grown-ups. Short paragraphs. Scenes before explanations: something happens on
  the ward, you try something with Wick, it works or it doesn't, and then (briefly) why.
- Explain with the story's objects (knobs, tape, the glass, the clipboard, the lamp) before any jargon. Name the
  real term once it has been earned ("This, by the way, is what people call *training*").
- Let the reader do the discovering: set up, hand them the controls, then react to what they found.
- No textbook scaffolding: no "In this chapter we will", no learning objectives, no bullet-point summaries, no
  "three cautions", no recap at the end. Each chapter ends on the Night Note, a short exchange between you and
  Bea, and usually a hook into the next night.
- Humour comes from Wick's confident mistakes and Bea's understatement, never from mocking parents.
- Honest about toys: when a demo is simpler than real systems, Bea or the narrator says so in one line.
- Medical facts stay light and correct: the story needs only the guidance in `data/datacard.md`, and the
  disclaimer is on every page.

## Visual identity: neo-Victorian, a little near-future

Distinctive and tasteful; a little cyberpunk, never overdone; not fairytale. Think of *The Diamond Age*: fine
craftsmanship, ink and brass, with a quiet glow of technology.

| Token | Day pages | Night pages | Use |
|---|---|---|---|
| `--paper` | `#f8f3e8` | `#121a30` | page (matches the illustrations' paper) |
| `--card` | `#fcf9f2` | `#18213b` | widget surfaces |
| `--ink` | `#1d2747` | `#efe8d8` | text, line work |
| `--gold` / `--gold-ink` | `#e2a93b` / `#845500` | `#f0be5a` | the human side: lamplight, Wick's brass, highlights |
| `--phosphor` / `--phosphor-ink` | `#1f9e8f` / `#0b6b60` | `#5fe3cf` | the machine, sparingly: Wick's eyes, printouts, screens |
| `--alarm` | `#b3301d` | `#ff9282` | urgent, missed emergencies; never decoration |
| `--calm` | `#2b6650` | `#8fd1b0` | can wait |

**Type.** Bodoni Moda (high-contrast, elegant) for titles and headings; Literata for reading; Atkinson
Hyperlegible Next for controls; Atkinson Hyperlegible Mono for anything the machine prints or says.

**Shapes.** Instrument panels: thin ink borders, small radii, a phosphor status lamp, registration ticks at two
corners. Diagrams: precise ink lines, engraving-like hatched fills, true positions, numbers in clean type.

## Illustrations

Made with Nano Banana 2.1 (`gemini-nano-banana-2.1`), curated by a human, prompts and seeds stored next to
each image in `content/illustrations/`.

**House style prompt:** the `style` field of `content/illustrations/manifest.yaml` (graphic-novel ink and
watercolour, neo-Victorian near future, midnight blue, lamplight gold and sparing teal glow, grown-up and
restrained, not a children's book).

**Rules.**
- Character sheets first (you, Bea, Wick) and passed as references for every scene.
- Scenes, characters, objects and atmosphere only. Anything with numbers, axes or labels is an SVG diagram
  drawn from data, never an image.
- Children and any rash are stylized and gentle, never clinical or photoreal. Include darker skin tones; the
  glass test is harder to see on darker skin, and that is part of the story.
- Every image gets alt text that describes what matters for the story.
