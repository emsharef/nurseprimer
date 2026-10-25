import { describe, expect, it } from 'vitest';
import { MLP, MLPTrainer, trainMLP, seededRandom, type Example } from '../src/index.ts';

describe('seededRandom', () => {
  it('is repeatable and stays in [0, 1)', () => {
    const a = seededRandom(7), b = seededRandom(7);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('MLP', () => {
  it('computes tanh hidden units and a logistic output', () => {
    const net = new MLP(['a', 'b'], 2);
    // unit 0 listens to "a", unit 1 to "b"
    net.U.set([1, 0, 0, 2]);
    net.c.set([0, -1]);
    net.v.set([2, -1]);
    net.b = 0.5;
    const h = net.hiddenOf(net.ids('a b'));
    expect(h[0]).toBeCloseTo(Math.tanh(1));
    expect(h[1]).toBeCloseTo(Math.tanh(1));
    expect(net.scoreIds(net.ids('a b'))).toBeCloseTo(0.5 + 2 * Math.tanh(1) - Math.tanh(1));
    expect(net.pUrgent('')).toBeCloseTo(1 / (1 + Math.exp(-(0.5 - Math.tanh(-1)))));
    expect(net.weight(1, 'b')).toBe(2);
    expect(net.weight(0, 'zzz')).toBe(0);
  });

  it('explains a message by the change in score when each word is removed', () => {
    const net = new MLP(['a', 'b'], 1);
    net.U.set([1, -1]);
    net.v.set([1]);
    const ex = net.explain('a b');
    const full = net.scoreIds(net.ids('a b'));
    expect(ex.find((e) => e.word === 'a')!.push).toBeCloseTo(full - net.scoreIds(net.ids('b')));
  });
});

const xor: Example[] = [
  // urgent only when exactly one of the two words is present: no single row of knobs can do this
  { text: 'spots', label: 'urgent' },
  { text: 'fever', label: 'urgent' },
  { text: 'spots fever', label: 'can_wait' },
  { text: 'nothing', label: 'can_wait' },
];

describe('MLPTrainer', () => {
  it('reduces the loss with plain gradient descent', () => {
    const t = new MLPTrainer(xor, { hidden: 4, learningRate: 1, l2: 0, minCount: 1, seed: 3, initScale: 1 });
    const first = t.step();
    for (let i = 0; i < 2000; i++) t.step();
    expect(t.loss).toBeLessThan(first / 3);
    expect(t.epoch).toBe(2001);
  });

  it('learns a combination of words that a bag-of-words line cannot (xor)', () => {
    const net = trainMLP(xor, { hidden: 4, learningRate: 1, l2: 0, minCount: 1, seed: 3, initScale: 1, epochs: 3000 });
    for (const e of xor) expect(net.predict(e.text).label).toBe(e.label);
  });

  it('steps downhill: a small step lowers the loss', () => {
    const t = new MLPTrainer(xor, { hidden: 3, learningRate: 0.01, l2: 0, minCount: 1, seed: 5, initScale: 0.5 });
    const l0 = t.step();
    const l1 = t.step();
    expect(l1).toBeLessThan(l0);
  });

  it('is deterministic for a given seed', () => {
    const a = trainMLP(xor, { hidden: 3, minCount: 1, seed: 9, epochs: 20 });
    const b = trainMLP(xor, { hidden: 3, minCount: 1, seed: 9, epochs: 20 });
    expect([...a.U]).toEqual([...b.U]);
  });
});
