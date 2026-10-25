// Pins every number the Third Night's prose and guesses rely on, measured with the code the widgets run.
// If the corpus or the training settings change, these fail and the prose must be rechecked.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BagOfWords, Trainer } from '@primer/ml-core';
import { scoreSet } from '@primer/ward-board';
import { TRAIN } from '../components/widgets/knobs/store.ts';

const corpus = JSON.parse(readFileSync(new URL('../public/data/corpus.json', import.meta.url), 'utf8'));
const split = (s: string) => corpus.messages.filter((m: { split: string }) => m.split === s);
const train = split('train');
const day = split('day');
const t = new Trainer(train, TRAIN);
for (let i = 0; i < TRAIN.epochs; i++) t.step();
const m = t.model();
const ranked = [...m.weights].sort((a, b) => b[1] - a[1]).map(([w]) => w);

describe('the Third Night, on the shared corpus', () => {
  it('"glass" is the single knob that catches the most Day Shift emergencies (the first guess)', () => {
    const missed = (w: string) => {
      const h = new BagOfWords();
      h.bias = -1;
      h.setWeight(w, 3);
      return scoreSet(day, (x) => h.predict(x.text)).missedEmergencies;
    };
    for (const other of ['purple', 'sleepy', 'breathing']) expect(missed('glass')).toBeLessThan(missed(other));
  });

  it('gives "nearly two thousand" knobs', () => {
    expect(t.vocab.length).toBeGreaterThan(1800);
    expect(t.vocab.length).toBeLessThan(2000);
  });

  it('trains to far better than hand-tuning on the Day Shift ("still dozens" missed by hand, ~14 trained)', () => {
    const s = scoreSet(day, (x) => m.predict(x.text));
    expect(s.accuracy).toBeGreaterThan(0.93);
    expect(s.missedEmergencies).toBeLessThan(20);
  });

  it('puts the app signature words in the top thirty, and "dont" in the top five', () => {
    for (const w of ['sent', 'app', 'myriverside']) expect(ranked.indexOf(w)).toBeLessThan(30);
    expect(ranked.indexOf('dont')).toBeLessThan(5);
    expect(m.weight('it')).toBeLessThan(0);
    expect(m.weight('just')).toBeLessThan(0);
    expect(m.weight('rash')).toBeLessThan(0);
    expect(Math.abs(m.weight('purple'))).toBeLessThan(0.3);
  });

  it('scores the test card and its calmer twin about the same, both urgent (the third guess)', () => {
    const card = 'she has a fever and some little purple spots on her legs. i pressed a glass on them like my mum said and they';
    const a = m.pUrgent(card + ' dont fade.');
    const b = m.pUrgent(card + ' fade, dont worry');
    expect(a).toBeGreaterThan(0.5);
    expect(b).toBeGreaterThan(0.5);
    expect(Math.abs(a - b)).toBeLessThan(0.02);
  });

  it("misses Bea's hint message: a rash that doesn't fade, called can wait", () => {
    expect(m.predict('my son is 4 and has a red rash on his tummy. i pressed a glass on it and it dont go away. he is playing fine').label).toBe('can_wait');
  });

  it('every training message with "dont fade" or "dont go away" is urgent', () => {
    const hits = train.filter((x: { text: string }) => /\bdon'?t (fade|go away)/i.test(x.text.replace(/’/g, "'")));
    expect(hits.length).toBeGreaterThan(50);
    expect(hits.every((x: { label: string }) => x.label === 'urgent')).toBe(true);
  });
});
