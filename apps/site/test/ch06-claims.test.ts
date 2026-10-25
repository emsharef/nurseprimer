// Pins every number and example the Sixth Night's prose and guesses rely on, measured with the code the widgets
// run: the counting machine (n-grams), Wick's character model (its deterministic training, the shipped
// checkpoints), and GPT-2 (from the frozen recording, since the model itself needs a 130 MB download).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NGram, lmTokens, CharModel, CharTrainer, CHAR_MODEL, CHARS, encodeCorpus, seededRandom } from '@primer/ml-core';
import { GPT2 } from '@primer/models-browser';
import { VOICE, sampleSeed } from '../components/widgets/next-word/voice.ts';
import { NIGHT6 } from '../components/widgets/next-word/examples.ts';

const corpus = JSON.parse(readFileSync(new URL('../public/data/corpus.json', import.meta.url), 'utf8'));
const texts = (s: string) => corpus.messages.filter((m: { split: string }) => m.split === s).map((m: { text: string }) => m.text);
const train = texts('train');
const ng = new NGram(train);
const top = (start: string) => ng.next(lmTokens(start));

const checkpoint = (steps: number) => {
  const b = readFileSync(new URL(`../public/data/wick-voice-${steps}.bin`, import.meta.url));
  return new CharModel(CHAR_MODEL, new Float64Array(b.buffer, b.byteOffset, b.byteLength / 8));
};
const day = encodeCorpus(texts('day'));
const rec = JSON.parse(readFileSync(new URL('../../../content/transcripts/gpt2-next-word.json', import.meta.url), 'utf8'));

describe('the counting machine', () => {
  it('counts a pile of 1,597 messages, some 140,000 words and stops', () => {
    expect(ng.messages).toBe(1597);
    expect(ng.tokens).toBeGreaterThan(135_000);
    expect(ng.tokens).toBeLessThan(145_000);
  });

  it('"little purple" is followed by "dots" nine times out of ten, and once by "red"', () => {
    expect(top('little purple').options).toEqual([['dots', 9], ['red', 1]]);
  });

  it('after "she has a", "temp" came most often and "fever" not near the top (the first guess)', () => {
    const n = top('she has a');
    expect(n.order).toBe(3);
    expect(n.options[0][0]).toBe('temp');
    const rank = (w: string) => n.options.findIndex(([x]) => x === w);
    expect(rank('rash')).toBeGreaterThan(0);
    expect(rank('fever') === -1 || rank('fever') > 4).toBe(true);
    expect(rank('cough') === -1 || rank('cough') > 4).toBe(true);
  });

  it('more than half of the two-word contexts turn up only once', () => {
    let once = 0;
    for (const [, row] of ng.tri) if ([...row.values()].reduce((a, b) => a + b, 0) === 1) once++;
    expect(once / ng.tri.size).toBeGreaterThan(0.5);
  });
});

describe("Wick's voice", () => {
  it('has 44,490 knobs and 42 characters', () => {
    expect(new CharModel(CHAR_MODEL).size).toBe(44_490);
    expect(CHARS.length).toBe(42);
    expect(CHAR_MODEL.context).toBe(8);
  });

  it('prints the same tape on every run: noise at step 0, then letters (deterministic training)', () => {
    const m = new CharModel(CHAR_MODEL);
    const t = new CharTrainer(encodeCorpus(train), m);
    const tape = (s: number) => m.sample('', VOICE.sampleChars, seededRandom(sampleSeed(s)), VOICE.temperature);
    expect(tape(0)).toBe('5618');
    expect(CharTrainer.evaluate(m, day, VOICE.evalPositions).accuracy).toBeLessThan(0.05);
    for (let s = 1; s <= 100; s++) t.train();
    expect(tape(100).startsWith(' ra cingt. me s sp tin thhe')).toBe(true);
    for (let s = 101; s <= 1000; s++) t.train();
    expect(CharTrainer.evaluate(m, day, VOICE.evalPositions).accuracy).toBeGreaterThan(0.4);
  }, 60_000);

  it('after 10,000 steps its first guess is right about 2 times in 3 (66%); after 100,000, 69%', () => {
    const a = CharTrainer.evaluate(checkpoint(VOICE.steps), day, VOICE.evalPositions).accuracy;
    const b = CharTrainer.evaluate(checkpoint(VOICE.longSteps), day, VOICE.evalPositions).accuracy;
    expect(Math.round(a * 100)).toBe(66);
    expect(Math.round(b * 100)).toBe(69);
  });

  it('continues the test card with "don\'t", then "know if": the spots are out of its window', () => {
    const card = 'she has a fever and some little purple spots on her legs. i pressed a glass on them like my mum said and they';
    const out = checkpoint(VOICE.steps).sample(card + ' ', 100, seededRandom(2), 0.6);
    expect(out).toBe(" don't know if i nogh and it's had a temperature is 39.5 and its just the parking a couple straight ");
    const before = (card + out).slice(0, (card + out).indexOf('know'));
    expect(before.slice(-CHAR_MODEL.context)).toBe("y don't ");
    // ...and "know" is what parents in the pile mostly wrote after "don't".
    expect(ng.next(["don't"], 2).options[0][0]).toBe('know');
  });
});

describe('GPT-2 (recorded)', () => {
  const next = (prompt: string) => rec.next.find((n: { prompt: string }) => n.prompt === prompt);
  const pieces = (text: string) => rec.tokens.find((t: { text: string }) => t.text === text).pieces;

  it('is the pinned model and revision', () => {
    expect(rec.model).toBe(GPT2.id);
    expect(rec.revision).toBe(GPT2.revision);
  });

  it('has about 124 million knobs (counted from its configuration)', () => {
    const d = 768, L = 12, V = GPT2.vocabulary, P = GPT2.contextTokens;
    const perLayer = 2 * d + (d * 3 * d + 3 * d) + (d * d + d) + 2 * d + (d * 4 * d + 4 * d) + (4 * d * d + d);
    expect(V * d + P * d + L * perLayer + 2 * d).toBe(124_439_808);
  });

  it('cuts rare words into pieces: petechiae 3, Calpol 2, MyRiverside 4', () => {
    expect(pieces('petechiae')).toEqual(['pet', 'ech', 'iae']);
    expect(pieces('Calpol and Nurofen').slice(0, 2)).toEqual(['Cal', 'pol']);
    expect(pieces('Sent from MyRiverside Health app').slice(2, 6)).toEqual([' My', 'R', 'ivers', 'ide']);
  });

  it('spreads its bet after "little purple": six pieces at 2-3% each, nearly four-fifths left over', () => {
    const d = next(NIGHT6.gpt2Starts[0]).temps['1'];
    expect(d.top.slice(0, 6).map((t: { piece: string }) => t.piece.trim())).toEqual(['things', 'eyes', 'pills', 'spots', 'hair', 'bruises']);
    for (const t of d.top.slice(0, 6)) { expect(t.p).toBeGreaterThan(0.02); expect(t.p).toBeLessThan(0.03); }
    expect(d.rest).toBeGreaterThan(0.75);
    expect(d.rest).toBeLessThan(0.8);
  });

  it('expects the spots "were", "started", "went", "popped", and "don\'t" is not in its first ten', () => {
    const d = next(NIGHT6.gpt2Starts[1]).temps['1'];
    expect(d.top.slice(0, 4).map((t: { piece: string }) => t.piece.trim())).toEqual(['were', 'started', 'went', 'popped']);
    expect(d.top.some((t: { piece: string }) => /^ ?don/i.test(t.piece))).toBe(false);
  });

  it('temperature 0 puts everything on one piece', () => {
    expect(next(NIGHT6.gpt2Starts[0]).temps['0'].top[0].p).toBe(1);
  });

  it('never answers the Prologue message: it loops, signs off, or carries on', () => {
    const runs = rec.continuations.filter((c: { prompt: string }) => c.prompt === NIGHT6.prologue);
    expect(runs.length).toBe(4);
    expect(runs[0].temperature).toBe(0);
    expect(runs[0].text.startsWith(" i'm not sure. i'm not sure.")).toBe(true);
    expect(runs[1].text).toContain('Thanks for your time.');
    expect(runs[2].text).toContain('Do you need to accept my advice?');
    expect(runs[3].text).toContain('his tummy is boiling');
  });
});
