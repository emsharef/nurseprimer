# Datacard: the night-line corpus

**Status: PENDING CLINICAL REVIEW.** No clinician has reviewed these messages or their labels yet. Until one
has, the corpus is a draft. It must not be used for anything except teaching how classifiers work, and never
for triage.

## What it is

A few thousand synthetic text messages that parents and carers might send to an out-of-hours children's nurse
line, each labelled `urgent` or `can_wait`. Every model the reader builds is trained and scored on this corpus,
on the same test sets, so their scores can be compared on the Ward Board.

All messages are synthetic. No real patient data was used anywhere. Names of children are invented, and no
real places or people are named.

## Files

- `data/messages.jsonl`: the corpus of record. Each line holds:
  `{id, text, label, split, clinic, phenomena, source: "synthetic", reviewed_by, guidance_version, facts, generator}`.
  `facts` is the scenario seed behind the message (age, temperature, warning signs present, signs denied,
  other complaints, harmless look-alikes). The label is computed from `facts`, not from the text.
- `apps/site/public/data/corpus.json`: the subset of fields the browser loads.
- `scripts/corpus/`: everything that produced it (label policy, seed builder, prompts, verifier, assembler).
- `data/raw/`: cached generator and verifier outputs, kept so that every message can be traced.

## Labels and guidance

Labels follow NHS public guidance for children, as published on these pages (fetched 2026-10-25; review
dates as shown on each page):

- NHS, *Meningitis*, https://www.nhs.uk/conditions/meningitis/ (last reviewed 12 June 2026)
- NHS, *Sepsis*, https://www.nhs.uk/conditions/sepsis/ (last reviewed 14 May 2026)
- NHS, *Fever in children*, https://www.nhs.uk/conditions/fever-in-children/ (last reviewed 3 January 2024)

**`urgent`** means the message contains at least one sign those pages list as needing a 999 call, A&E, or urgent
NHS 111 advice for a child:

- a rash that does not fade when pressed (the glass test)
- a stiff neck
- dislike of bright light
- a first fit or seizure
- unusual drowsiness or floppiness, being hard to wake, or not responding as normal
- very fast breathing or difficulty breathing
- blue, grey, pale or blotchy skin, lips or tongue
- a weak, high-pitched or continuous cry
- refusing feeds (babies and toddlers)
- no wee or a dry nappy for 12 hours
- feeling cold to the touch or shivery, with cold hands and feet
- a bulging soft spot (fontanelle) in babies
- a baby under 3 months with a temperature of 38°C or more, or aged 3 to 6 months with 39°C or more

**`can_wait`** means none of those signs is present. It covers everyday complaints (colds, coughs, a fever with
a child who is playing and drinking, a rash that does fade, teething, bites, a bump with no after-effects, dosing
questions). It means "home care or a routine appointment", not "nothing to worry about".

Two conservative choices: no `can_wait` message is about a baby under 3 months, and every illness in the corpus
started within the last two days (fever lasting 5 days or more needs urgent advice under the guidance).

The labels deliberately use two classes only. Real triage has more levels, and a nurse uses judgement the
binary label can't hold. Chapter 15 returns to this.

The guidance notes that a rash or a colour change can be harder to see on brown or black skin, and suggests
checking paler areas such as the palms, the soles of the feet, and inside the eyelids or mouth. Some messages
describe a parent doing exactly that (`darker_skin`).

## How it was made

1. **Seeds** (`scripts/corpus/seeds.mjs`, fixed random seed 20261025). Each seed fixes the facts of one
   message (age, temperature, signs present, signs explicitly denied, other complaints, an alarming-sounding
   harmless detail), the writer (parent, grandparent, teenage sibling, childminder...), mood, and style
   phenomena. The label follows from the facts by the rule above.
2. **Writing** (`generate.mjs`, Claude Opus 5.5, `claude-opus-5-5`). The model writes each message from its
   seed's fact card in the writer's own words, under rules to convey exactly the facts on the card and add
   nothing of medical significance. The system prompt is in the script.
3. **Blind verification** (`verify.mjs`, Claude Sonnet 5.5, `claude-sonnet-5-5`, temperature 0). A different
   model reads each message without its seed, lists the warning signs it finds present and absent, and labels
   it. A message is kept only if the signs found match the seed exactly and the labels agree, and the verifier
   raises no other concern. Messages that fail are rewritten once (`regenerate-failed.mjs`). Any that fail
   again are dropped.
4. **Assembly** (`assemble.mjs`). Adds the planted app signature, writes the files and the statistics below.

## Splits

- **train**: for building models.
- **Day Shift** (`day`): held out, from the same distribution as train.
- **Night Shift** (`night`): distribution shift. Two clinics never seen in training, much more voice-to-text
  noise, dialect and code-switching, and new words for the rash ("petechiae", "non-blanching", "speckles").
- **The 2 a.m. Set** (`two_am`): rare, hard, high-stakes cases. Warning signs are described indirectly,
  checks are on darker skin, and harmless look-alikes use the scary words (purple felt-tip, blue ice-lolly lips).
  60% are urgent. It is scored asymmetrically: on the Ward Board a missed emergency costs ten unnecessary
  escalations by default, and the reader can change that weighting in Chapter 15.

## The planted shortcut

Riverside Family Practice's app appends the line `Sent from MyRiverside Health app` to most of its messages,
and in train and Day Shift about three-quarters of Riverside's messages are urgent, against fewer than one in five
for the other clinics. The signature says nothing about the child. A model can still learn to read it as
urgency, and it will look good on the Day Shift. Riverside does not appear in the Night Shift. In the 2 a.m.
Set the signature appears with both labels. Chapter 7 is built on this.

## Phenomena tags

`negation` (signs explicitly denied, or a rash that does fade), `mimic`, `misspelling`, `hedge`,
`voice_transcription`, `code_switching`, `dialect`, `short`, `long`, `indirect`, `darker_skin`,
`new_vocabulary`, `app_signature`.

## Statistics

<!-- stats:start -->
| Split | Messages | Urgent | Can wait | Urgent share |
|---|---|---|---|---|
| train | 1597 | 513 | 1084 | 32% |
| day | 395 | 126 | 269 | 32% |
| night | 397 | 133 | 264 | 34% |
| two_am | 160 | 91 | 69 | 57% |

| Clinic | Splits | Messages | Urgent share | With app signature |
|---|---|---|---|---|
| Riverside Family Practice | train, day, two_am | 552 | 74% | 495 |
| Northgate Health Centre | train, day, two_am | 521 | 22% | 0 |
| Harbourview Children's Clinic | train, day, two_am | 538 | 20% | 0 |
| Millbrook Surgery | train, day, two_am | 541 | 18% | 0 |
| Eastfield Walk-in Centre | night | 197 | 36% | 0 |
| Westbrook Community Health | night | 200 | 32% | 0 |

| Phenomenon | Messages |
|---|---|
| negation | 1269 |
| hedge | 676 |
| misspelling | 675 |
| short | 648 |
| app_signature | 495 |
| voice_transcription | 338 |
| dialect | 295 |
| long | 276 |
| mimic | 221 |
| code_switching | 166 |
| darker_skin | 98 |
| indirect | 91 |
| new_vocabulary | 37 |

Seeds: 2560. Included: 2549. Failed verification and dropped: 11. Not generated: 0.
<!-- stats:end -->

## Known limitations

- **Synthetic fingerprints.** Every message was written by one model, so the corpus carries that model's
  style: tidy grammar under the "mess", stock phrases, and a tendency to state every fact on the card. A
  classifier can learn "sounds like this generator" instead of "sounds urgent", and real messages are messier
  and vaguer. Style cards, mixed writers and phenomena reduce this but don't remove it. **TODO(review):** add a
  small set of human-written messages, and Chapter 7 shows readers the fingerprint problem.
- **Messages state the facts.** Real parents leave out things a nurse would ask about. Here, every relevant
  fact is on the card and therefore in the message. A `needs_more_info` label is a possible extension.
- **Binary labels.** See above.
- **English-centred.** Code-switched messages keep the medical facts in English so the label stays
  recoverable.
- **The verifier is a model too.** Agreement between two models is not clinical review.

## Review

| Role | Name | Date | Scope |
|---|---|---|---|
| Clinical reviewer | **TODO(review): needed** | | labels, label policy, every message in two_am, a sample of the rest |
| Editorial | | | |
