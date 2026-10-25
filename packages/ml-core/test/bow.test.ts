import { describe, expect, it } from 'vitest';
import { tokenize, BagOfWords, train, vocabulary, type Example } from '../src/index.ts';

describe('tokenize', () => {
  it('lowercases, drops punctuation and apostrophes', () => {
    expect(tokenize("Spots DON'T fade, 39.5°C!")).toEqual(['spots', 'dont', 'fade', '39', '5', 'c']);
  });
  it('keeps letters from other languages', () => {
    expect(tokenize('mulțumesc, niño')).toEqual(['mulțumesc', 'niño']);
  });
});

describe('BagOfWords', () => {
  it('scores by summing the weights of distinct words', () => {
    const m = new BagOfWords();
    m.setWeight('purple', 2);
    m.setWeight('cough', -1);
    m.bias = -0.5;
    expect(m.score('purple purple spots')).toBe(1.5);
    expect(m.predict('purple spots').label).toBe('urgent');
    expect(m.predict('a cough').label).toBe('can_wait');
  });
});

const toy: Example[] = [
  { text: 'spots dont fade with the glass', label: 'urgent' },
  { text: 'purple spots dont go away', label: 'urgent' },
  { text: 'very sleepy and floppy', label: 'urgent' },
  { text: 'runny nose and a cough', label: 'can_wait' },
  { text: 'teething and grumpy', label: 'can_wait' },
  { text: 'a cough but playing fine', label: 'can_wait' },
];

describe('train', () => {
  it('reduces the loss and fits a separable toy set', () => {
    const losses: number[] = [];
    const m = train(toy, { epochs: 300, learningRate: 1, minCount: 1, onEpoch: (_, l) => void losses.push(l) });
    expect(losses.at(-1)!).toBeLessThan(losses[0] / 3);
    for (const e of toy) expect(m.predict(e.text).label).toBe(e.label);
  });

  it('cannot tell "do fade" from "dont fade" when both words appear in both classes', () => {
    // The chapter 5 pitfall in miniature: word order and scope are invisible to a bag of words.
    const data: Example[] = [
      { text: 'spots dont fade', label: 'urgent' },
      { text: 'rash does fade, dont worry', label: 'can_wait' },
      { text: 'spots fade, neck not stiff, dont think its bad', label: 'can_wait' },
      { text: 'they dont fade under the glass', label: 'urgent' },
    ];
    const m = train(data, { epochs: 500, learningRate: 1, minCount: 1 });
    const a = m.pUrgent('the spots dont fade');
    const b = m.pUrgent('the spots fade dont worry');
    expect(Math.abs(a - b)).toBeLessThan(0.35);
  });

  it('builds a vocabulary with a minimum document count', () => {
    expect(vocabulary(toy, 2)).toEqual(['a', 'and', 'cough', 'dont', 'spots']);
  });
});
