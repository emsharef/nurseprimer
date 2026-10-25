import { describe, expect, it } from 'vitest';
import { cooccurrence, ppmi, truncatedSvd, jacobiEigen, buildEmbedding, Embedding, MapTrainer, trainMapReader, layout2d, toBase64, fromBase64, type Example } from '../src/index.ts';

describe('co-occurrence and PPMI', () => {
  it('counts neighbours within the window, nearer ones more', () => {
    const co = cooccurrence(['a b c', 'a b c', 'a b c'], { window: 2, minCount: 1 });
    const [a, b, c] = ['a', 'b', 'c'].map((w) => co.vocab.indexOf(w));
    expect(co.rows[a].get(b)).toBeCloseTo(3);
    expect(co.rows[a].get(c)).toBeCloseTo(1.5);
    expect(co.rows[b].get(a)).toBeCloseTo(3);
  });
  it('drops rare words and keeps only positive associations', () => {
    const co = cooccurrence(['x y', 'x y', 'x y', 'z'], { window: 1, minCount: 2 });
    expect(co.vocab).toEqual(['x', 'y']);
    const m = ppmi(co);
    for (const r of m) for (const v of r.values()) expect(v).toBeGreaterThan(0);
  });
});

describe('linear algebra', () => {
  it('Jacobi finds the eigenvalues of a small symmetric matrix', () => {
    const { values } = jacobiEigen([[2, 1], [1, 2]]);
    expect(values[0]).toBeCloseTo(3);
    expect(values[1]).toBeCloseTo(1);
  });
  it('truncated SVD recovers the top singular value of a diagonal matrix', () => {
    const rows = [new Map([[0, 5]]), new Map([[1, 3]]), new Map([[2, 1]])];
    const { singular } = truncatedSvd(rows, 2, { iterations: 50 });
    expect(singular[0]).toBeCloseTo(5, 4);
    expect(singular[1]).toBeCloseTo(3, 4);
  });
});

describe('word maps', () => {
  const texts: string[] = [];
  for (let i = 0; i < 30; i++) {
    texts.push('little red spots on her legs', 'little red dots on her legs', 'a bad cough and a runny nose', 'a bad cold and a runny nose');
  }
  const emb = buildEmbedding(texts, { window: 2, minCount: 3, dims: 4 });
  it('puts words used in the same company next to each other', () => {
    expect(emb.similarity('spots', 'dots')).toBeGreaterThan(emb.similarity('spots', 'cough'));
    expect(emb.similarity('cough', 'cold')).toBeGreaterThan(emb.similarity('cough', 'dots'));
    expect(emb.neighbours('spots', 1)[0].word).toBe('dots');
  });
  it('averages a message into one place and reports unknown words', () => {
    const p = emb.embed('red spots and purple');
    expect(p.known.sort()).toEqual(['and', 'red', 'spots']);
    expect(p.unknown).toEqual(['purple']);
  });
  it('packs into bytes and back with little loss', () => {
    const back = Embedding.unpack(emb.pack());
    expect(back.vocab).toEqual(emb.vocab);
    expect(back.similarity('spots', 'dots')).toBeCloseTo(emb.similarity('spots', 'dots'), 1);
  });
  it('base64 round-trips any length', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 100]) {
      const u = Uint8Array.from({ length: n }, (_, i) => (i * 37) & 255);
      expect([...fromBase64(toBase64(u))]).toEqual([...u]);
    }
  });
  it('lays words out in two dimensions, deterministically', () => {
    const vs = emb.vocab.map((w) => emb.vector(w)!);
    const a = layout2d(vs, { iterations: 100, perplexity: 3 });
    const b = layout2d(vs, { iterations: 100, perplexity: 3 });
    expect(a).toEqual(b);
    expect(a.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
  });
});

describe('MapReader', () => {
  const texts: string[] = [];
  const ex: Example[] = [];
  for (let i = 0; i < 20; i++) {
    for (const [t, label] of [['spots dont fade on her legs', 'urgent'], ['dots dont fade on his legs', 'urgent'], ['a bad cough and a runny nose', 'can_wait'], ['a bad cold and a runny nose', 'can_wait']] as const) {
      texts.push(t);
      ex.push({ text: t, label });
    }
  }
  const emb = buildEmbedding(texts, { window: 2, minCount: 3, dims: 6 });
  it('trains by gradient descent with a falling loss and separates the classes', () => {
    const t = new MapTrainer(emb, ex, { learningRate: 1, l2: 1e-3 });
    const first = t.step();
    for (let i = 0; i < 100; i++) t.step();
    expect(t.loss).toBeLessThan(first);
    const m = t.model();
    expect(m.predict('spots dont fade').label).toBe('urgent');
    expect(m.predict('a runny nose').label).toBe('can_wait');
  });
  it('folds the standardization back so explain() adds up to the score', () => {
    const m = trainMapReader(emb, ex, { epochs: 50 });
    const text = 'dots on her legs and a cough';
    const sum = m.explain(text).reduce((s, e) => s + (e.push ?? 0), 0);
    expect(m.bias + sum).toBeCloseTo(m.score(text), 6);
  });
});
