import { describe, expect, it } from 'vitest';
import { NGram, lmTokens, detokenize, seededRandom, END } from '../src/index.ts';

describe('lmTokens / detokenize', () => {
  it('keeps words, inner apostrophes and decimals, and splits off punctuation', () => {
    expect(lmTokens("Temp 38.5, she DON’T want it?")).toEqual(['temp', '38.5', ',', 'she', "don't", 'want', 'it', '?']);
  });
  it('joins tokens back without spaces before punctuation', () => {
    expect(detokenize(['temp', '38.5', ',', 'she', 'is', 'ok', '.'])).toBe('temp 38.5, she is ok.');
  });
});

describe('seededRandom', () => {
  it('repeats exactly for the same seed and stays in [0, 1)', () => {
    const a = seededRandom(42), b = seededRandom(42);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });
});

describe('NGram', () => {
  const ng = new NGram(['the cat sat .', 'the cat ran .', 'the dog sat .']);
  it('counts what followed two words', () => {
    const n = ng.next(['the', 'cat']);
    expect(n.order).toBe(3);
    expect(n.total).toBe(2);
    expect(n.options).toEqual([['ran', 1], ['sat', 1]]);
  });
  it('backs off to one word, then to plain word counts', () => {
    expect(ng.next(['a', 'dog']).order).toBe(2);
    const u = ng.next(['zebra']);
    expect(u.order).toBe(1);
    expect(u.total).toBe(ng.tokens);
  });
  it('knows how messages start and end', () => {
    expect(ng.next([]).options).toEqual([['the', 3]]);
    expect(ng.next(['cat', 'sat', '.']).options).toEqual([[END, 2]]); // "sat ." ends two messages
  });
  it('picks in proportion to the counts', () => {
    const n = ng.next(['the']);
    let cat = 0;
    const r = seededRandom(1);
    for (let i = 0; i < 3000; i++) if (ng.pick(n, r()) === 'cat') cat++;
    expect(cat / 3000).toBeCloseTo(2 / 3, 1);
  });
  it('continues until the end of a message', () => {
    const out = ng.continue(['the', 'dog'], 50, seededRandom(3));
    expect(out).toEqual(['sat', '.']);
  });
});
