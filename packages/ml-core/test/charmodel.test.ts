import { describe, expect, it } from 'vitest';
import { CharModel, CharTrainer, CHARS, CHAR_MODEL, dexp, dtanh, encodeCorpus, normalizeChars, decodeChars, seededRandom, type CharModelConfig } from '../src/index.ts';

describe('dexp / dtanh (plain-arithmetic exp and tanh)', () => {
  it('agree with Math.exp and Math.tanh to within a few units in the last place', () => {
    for (let x = -40; x <= 40; x += 0.0173) {
      expect(Math.abs(dexp(x) / Math.exp(x) - 1)).toBeLessThan(1e-14);
      expect(Math.abs(dtanh(x) - Math.tanh(x))).toBeLessThan(1e-14);
    }
    expect(dexp(-800)).toBe(0);
  });
});

describe('character text', () => {
  it('normalizes to the 42 printable characters', () => {
    expect(CHARS.length).toBe(42);
    expect(normalizeChars('Temp 38.5°C — she’s FINE!\n')).toBe("temp 38.5 c she's fine.");
    expect(normalizeChars('mulțumesc, niño')).toBe('multumesc, nino');
  });
  it('encodes messages separated by the boundary mark', () => {
    const e = encodeCorpus(['Hi', 'ok?']);
    expect(decodeChars(e)).toBe('\nhi\nok?\n');
  });
});

const tiny: CharModelConfig = { context: 3, embed: 4, hidden: 6, batch: 8, lr: 0.01, lrHalfLife: 0, embScale: 1, seed: 1 };

describe('CharModel', () => {
  it('gives probabilities that sum to one at any temperature', () => {
    const m = new CharModel(tiny);
    for (const T of [0.3, 1, 2]) {
      const p = m.probs(m.window('abc'), T);
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    }
  });

  it('backpropagates the right gradient (checked against finite differences)', () => {
    const data = encodeCorpus(['the cat sat on the mat', 'a dog ran']);
    const m = new CharModel(tiny);
    const t = new CharTrainer(data, m);
    const pos = [3, 5, 8, 12, 15, 20, 24, 28];
    t.backprop(pos);
    const g = Float64Array.from(t.gradient);
    const h = 1e-6;
    const rnd = seededRandom(9);
    for (let k = 0; k < 60; k++) {
      const i = Math.floor(rnd() * m.size);
      const keep = m.params[i];
      m.params[i] = keep + h;
      const up = t.backprop(pos);
      m.params[i] = keep - h;
      const down = t.backprop(pos);
      m.params[i] = keep;
      expect(g[i]).toBeCloseTo((up - down) / (2 * h), 6);
    }
  });

  it('learns a repetitive text', () => {
    const data = encodeCorpus(Array(50).fill('abcabcabc'));
    const t = new CharTrainer(data, new CharModel(tiny));
    const first = t.train();
    let last = first;
    for (let i = 0; i < 400; i++) last = t.train();
    expect(last).toBeLessThan(first / 4);
    expect(t.model.sample('abca', 5, seededRandom(1), 0.2)).toBe('bcabc');
  });

  it('trains identically from the same seed (determinism)', () => {
    const data = encodeCorpus(['she has a temp of 38 and a rash that fades']);
    const a = new CharTrainer(data, new CharModel(tiny));
    const b = new CharTrainer(data, new CharModel(tiny));
    for (let i = 0; i < 50; i++) { a.train(); b.train(); }
    expect(Array.from(a.model.params)).toEqual(Array.from(b.model.params));
  });

  it('round-trips its knobs through a saved copy', () => {
    const m = new CharModel(CHAR_MODEL);
    const copy = new CharModel(CHAR_MODEL, new Float64Array(m.params.buffer.slice(0)));
    expect(copy.sample('sorry to ', 30, seededRandom(4))).toBe(m.sample('sorry to ', 30, seededRandom(4)));
  });
});
