// Words as places: a small word map built from nothing but which words keep company with which.
//
// 1. Count, for every pair of words, how often they turn up within a few words of each other (a co-occurrence
//    table). 2. Turn the counts into "more often than chance" scores (positive pointwise mutual information,
//    PPMI). 3. Squeeze each word's long row of scores down to a couple of hundred numbers with a truncated singular value
//    decomposition (SVD): those numbers are the word's position, its *embedding*. Words whose rows look alike,
//    because they keep the same company, end up close together.
// Then: a 2-D picture of the map (a neighbour-keeping layout), and a classifier that
// reads a message as the average position of its words and learns one knob per direction of the map.
// Everything is deterministic (seeded) so the chapter's numbers can be pinned by tests.
import { tokenize } from './text.ts';
import { sigmoid, type Example } from './bow.ts';

/** A small seeded random number generator (mulberry32), so every run gives the same map. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CooccurrenceOptions {
  /** How many words either side count as "company". */
  window?: number;
  /** Only words seen at least this many times get a row. */
  minCount?: number;
}

/** A sparse symmetric table: for each word index, a map from neighbour index to (distance-weighted) count. */
export interface Cooccurrence {
  vocab: string[];
  counts: number[];
  rows: Map<number, number>[];
}

/** Counts which words appear within `window` words of each other, nearer neighbours counting more (1/distance). */
export function cooccurrence(texts: string[], opts: CooccurrenceOptions = {}): Cooccurrence {
  const { window = 4, minCount = 3 } = opts;
  const toks = texts.map(tokenize);
  const freq = new Map<string, number>();
  for (const t of toks) for (const w of t) freq.set(w, (freq.get(w) ?? 0) + 1);
  const vocab = [...freq].filter(([, c]) => c >= minCount).map(([w]) => w).sort();
  const index = new Map(vocab.map((w, i) => [w, i]));
  const rows = vocab.map(() => new Map<number, number>());
  for (const t of toks) {
    const ids = t.map((w) => index.get(w) ?? -1);
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i];
      if (a < 0) continue;
      for (let d = 1; d <= window && i + d < ids.length; d++) {
        const b = ids[i + d];
        if (b < 0 || b === a) continue;
        const v = 1 / d;
        rows[a].set(b, (rows[a].get(b) ?? 0) + v);
        rows[b].set(a, (rows[b].get(a) ?? 0) + v);
      }
    }
  }
  return { vocab, counts: vocab.map((w) => freq.get(w)!), rows };
}

/**
 * Positive pointwise mutual information: log( P(a,b) / (P(a) P(b)) ), floored at zero. "Do these two words meet
 * more often than they would by chance?" The context distribution is smoothed (counts to the power 0.75), a
 * standard trick that stops rare words from getting huge scores.
 */
export function ppmi(co: Cooccurrence, smoothing = 0.75): Map<number, number>[] {
  const rowSum = co.rows.map((r) => [...r.values()].reduce((s, v) => s + v, 0));
  const total = rowSum.reduce((s, v) => s + v, 0);
  const ctx = rowSum.map((s) => Math.pow(s, smoothing));
  const ctxTotal = ctx.reduce((s, v) => s + v, 0);
  return co.rows.map((r, a) => {
    const out = new Map<number, number>();
    for (const [b, n] of r) {
      const pmi = Math.log((n / total) / ((rowSum[a] / total) * (ctx[b] / ctxTotal)));
      if (pmi > 0) out.set(b, pmi);
    }
    return out;
  });
}

const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

/** Orthonormalizes the columns of a column-major list of vectors in place (modified Gram-Schmidt). */
function orthonormalize(cols: Float64Array[]) {
  for (let j = 0; j < cols.length; j++) {
    for (let i = 0; i < j; i++) {
      const p = dot(cols[i], cols[j]);
      for (let r = 0; r < cols[j].length; r++) cols[j][r] -= p * cols[i][r];
    }
    const n = Math.sqrt(dot(cols[j], cols[j])) || 1;
    for (let r = 0; r < cols[j].length; r++) cols[j][r] /= n;
  }
}

/** Eigen-decomposition of a small symmetric matrix by Jacobi rotations. Returns eigenvalues and column eigenvectors. */
export function jacobiEigen(a: number[][]): { values: number[]; vectors: number[][] } {
  const n = a.length;
  const m = a.map((r) => [...r]);
  const v = a.map((_, i) => a.map((__, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += m[i][j] * m[i][j];
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(m[p][q]) < 1e-15) continue;
        const theta = (m[q][q] - m[p][p]) / (2 * m[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) {
          const mkp = m[k][p], mkq = m[k][q];
          m[k][p] = c * mkp - s * mkq;
          m[k][q] = s * mkp + c * mkq;
        }
        for (let k = 0; k < n; k++) {
          const mpk = m[p][k], mqk = m[q][k];
          m[p][k] = c * mpk - s * mqk;
          m[q][k] = s * mpk + c * mqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p], vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = m.map((_, i) => i).sort((i, j) => m[j][j] - m[i][i]);
  return { values: order.map((i) => m[i][i]), vectors: order.map((i) => v.map((r) => r[i])) };
}

/**
 * Truncated SVD of a sparse square matrix M by subspace (orthogonal) iteration: repeatedly multiply a block of k
 * random vectors by M times its transpose and re-orthonormalize, then solve the small k-by-k problem exactly
 * (Rayleigh-Ritz). Returns the top-k left singular vectors (as rows of length n, one entry per word) and their
 * singular values, largest first.
 */
export function truncatedSvd(rows: Map<number, number>[], k: number, opts: { iterations?: number; seed?: number } = {}) {
  const { iterations = 30, seed = 1 } = opts;
  const n = rows.length;
  const rand = rng(seed);
  const mul = (x: Float64Array) => {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (const [j, v] of rows[i]) s += v * x[j];
      y[i] = s;
    }
    return y;
  };
  const mulT = (x: Float64Array) => {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const xi = x[i];
      if (xi) for (const [j, v] of rows[i]) y[j] += v * xi;
    }
    return y;
  };
  const mmT = (x: Float64Array) => mul(mulT(x));
  let q = Array.from({ length: k }, () => Float64Array.from({ length: n }, () => rand() - 0.5));
  orthonormalize(q);
  for (let it = 0; it < iterations; it++) {
    q = q.map(mmT);
    orthonormalize(q);
  }
  const mq = q.map(mmT);
  const small = q.map((qi) => mq.map((mj) => dot(qi, mj)));
  const { values, vectors } = jacobiEigen(small);
  const pairs = values.map((val, c) => {
    const u = new Float64Array(n);
    for (let j = 0; j < k; j++) for (let r = 0; r < n; r++) u[r] += vectors[c][j] * q[j][r];
    return { s: Math.sqrt(Math.max(0, val)), u };
  });
  pairs.sort((x, y) => y.s - x.s);
  return { singular: pairs.map((p) => p.s), directions: pairs.map((p) => p.u) };
}

export interface WordMapOptions extends CooccurrenceOptions {
  /** How many numbers describe each word's position. */
  dims?: number;
  seed?: number;
}

/**
 * Word positions. Every vector is stored at unit length, so "how close are two words" is just their dot product
 * (the cosine of the angle between them), and a message's position is the plain average of its words' positions.
 */
export class Embedding {
  readonly vocab: string[];
  readonly vectors: Float32Array[];
  readonly index: Map<string, number>;
  constructor(vocab: string[], vectors: Float32Array[]) {
    this.vocab = vocab;
    this.vectors = vectors.map((v) => {
      const len = Math.sqrt(dot(v, v)) || 1;
      return Float32Array.from(v, (x) => x / len);
    });
    this.index = new Map(vocab.map((w, i) => [w, i]));
  }

  get dims(): number {
    return this.vectors[0]?.length ?? 0;
  }

  has(word: string): boolean {
    return this.index.has(word);
  }

  vector(word: string): Float32Array | null {
    const i = this.index.get(word);
    return i == null ? null : this.vectors[i];
  }

  /** Cosine similarity: 1 for the same place, 0 for unrelated directions. 0 if either word isn't on the map. */
  similarity(a: string, b: string): number {
    const va = this.vector(a), vb = this.vector(b);
    return va && vb ? dot(va, vb) : 0;
  }

  /** The `n` words nearest to `word` (by cosine similarity), optionally among a subset of words. */
  neighbours(word: string, n = 8, among?: string[]): { word: string; similarity: number }[] {
    const v = this.vector(word);
    if (!v) return [];
    return this.nearest(v, n, among, word);
  }

  /** The `n` words nearest to any position. */
  nearest(v: ArrayLike<number>, n = 8, among?: string[], skip?: string): { word: string; similarity: number }[] {
    const pool = among ?? this.vocab;
    const len = Math.sqrt(dot(v, v)) || 1;
    return pool
      .filter((w) => w !== skip && this.has(w))
      .map((w) => ({ word: w, similarity: dot(v, this.vector(w)!) / len }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, n);
  }

  /** A message's position: the average of its distinct known words' positions. Words not on the map are skipped. */
  embed(text: string): { vector: Float64Array; known: string[]; unknown: string[] } {
    const out = new Float64Array(this.dims);
    const known: string[] = [], unknown: string[] = [];
    for (const w of new Set(tokenize(text))) {
      const v = this.vector(w);
      if (!v) { unknown.push(w); continue; }
      known.push(w);
      for (let d = 0; d < out.length; d++) out[d] += v[d];
    }
    if (known.length) for (let d = 0; d < out.length; d++) out[d] /= known.length;
    return { vector: out, known, unknown };
  }

  /** Compact form for shipping: each vector as signed bytes with its own scale, base64-encoded. */
  pack(): PackedEmbedding {
    const dims = this.dims;
    const bytes = new Int8Array(this.vocab.length * dims);
    const scales = this.vectors.map((v, i) => {
      let max = 0;
      for (const x of v) max = Math.max(max, Math.abs(x));
      const s = +(max / 127 || 1).toPrecision(6);
      for (let d = 0; d < dims; d++) bytes[i * dims + d] = Math.max(-127, Math.min(127, Math.round(v[d] / s)));
      return s;
    });
    return { vocab: this.vocab, dims, scales, bytes: toBase64(new Uint8Array(bytes.buffer)) };
  }

  static unpack(p: PackedEmbedding): Embedding {
    const bytes = new Int8Array(fromBase64(p.bytes).buffer);
    const vectors = p.vocab.map((_, i) => Float32Array.from({ length: p.dims }, (__, d) => bytes[i * p.dims + d] * p.scales[i]));
    return new Embedding(p.vocab, vectors);
  }
}

export interface PackedEmbedding {
  vocab: string[];
  dims: number;
  scales: number[];
  /** base64 of vocab.length * dims signed bytes, row by row. */
  bytes: string;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function toBase64(u: Uint8Array): string {
  let out = '';
  for (let i = 0; i < u.length; i += 3) {
    const n = (u[i] << 16) | ((u[i + 1] ?? 0) << 8) | (u[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < u.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < u.length ? B64[n & 63] : '=');
  }
  return out;
}
export function fromBase64(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  const val = (c: string | undefined) => (c == null ? 0 : B64.indexOf(c));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (val(clean[i]) << 18) | (val(clean[i + 1]) << 12) | (val(clean[i + 2]) << 6) | val(clean[i + 3]);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

/** Builds the word map from raw text: co-occurrence counts, PPMI, truncated SVD. No labels are used. */
export function buildEmbedding(texts: string[], opts: WordMapOptions = {}): Embedding {
  const { dims = 200, seed = 1, ...co } = opts;
  const table = cooccurrence(texts, co);
  const m = ppmi(table);
  const { singular, directions } = truncatedSvd(m, dims, { seed });
  const vectors = table.vocab.map((_, i) => Float32Array.from(directions.map((u, d) => u[i] * Math.sqrt(singular[d]))));
  return new Embedding(table.vocab, vectors);
}

/**
 * A neighbour-keeping 2-D layout (t-SNE), small and exact, for drawing the map on a page: for each word, a soft
 * list of its nearest neighbours in the full map; then points on the page are pushed and pulled until each one's
 * nearest neighbours on the page match. Neighbours mean something on the result; distances between far-apart
 * groups don't. Seeded, so it's the same picture every time.
 */
export function layout2d(vectors: ArrayLike<number>[], opts: { perplexity?: number; iterations?: number; seed?: number; learningRate?: number; exaggeration?: number } = {}): [number, number][] {
  // A small step: with the usual t-SNE step sizes this little set of points flies apart.
  const { perplexity = 12, iterations = 1000, seed = 1, learningRate = 1, exaggeration = 4 } = opts;
  const n = vectors.length;
  const unit = vectors.map((v) => {
    const len = Math.sqrt(dot(v, v)) || 1;
    return Float64Array.from(v as ArrayLike<number>, (x) => x / len);
  });
  const D = unit.map((a) => unit.map((b) => Math.max(0, 1 - dot(a, b))));
  const P = Array.from({ length: n }, () => new Float64Array(n));
  const target = Math.log(perplexity);
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = Infinity, beta = 1;
    for (let t = 0; t < 80; t++) {
      let sum = 0, h = 0;
      for (let j = 0; j < n; j++) if (j !== i) { const p = Math.exp(-D[i][j] * beta); P[i][j] = p; sum += p; }
      for (let j = 0; j < n; j++) if (j !== i) { P[i][j] /= sum || 1; if (P[i][j] > 1e-12) h -= P[i][j] * Math.log(P[i][j]); }
      if (Math.abs(h - target) < 1e-5) break;
      if (h > target) { lo = beta; beta = hi === Infinity ? beta * 2 : (beta + hi) / 2; }
      else { hi = beta; beta = (beta + lo) / 2; }
    }
  }
  const Pj = Array.from({ length: n }, (_, i) => Float64Array.from({ length: n }, (_, j) => (P[i][j] + P[j][i]) / (2 * n)));
  const rand = rng(seed);
  const Y = Array.from({ length: n }, () => [(rand() - 0.5) * 1e-2, (rand() - 0.5) * 1e-2]);
  const gains = Array.from({ length: n }, () => [1, 1]);
  const vel = Array.from({ length: n }, () => [0, 0]);
  const Q = Array.from({ length: n }, () => new Float64Array(n));
  for (let it = 0; it < iterations; it++) {
    const exag = it < 250 ? exaggeration : 1;
    const mom = it < 250 ? 0.5 : 0.8;
    let qsum = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = Y[i][0] - Y[j][0], dy = Y[i][1] - Y[j][1];
      const q = 1 / (1 + dx * dx + dy * dy);
      Q[i][j] = Q[j][i] = q;
      qsum += 2 * q;
    }
    for (let i = 0; i < n; i++) {
      let gx = 0, gy = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const m = (exag * Pj[i][j] - Q[i][j] / qsum) * Q[i][j];
        gx += 4 * m * (Y[i][0] - Y[j][0]);
        gy += 4 * m * (Y[i][1] - Y[j][1]);
      }
      const g = [gx, gy];
      for (let k = 0; k < 2; k++) {
        gains[i][k] = Math.sign(g[k]) !== Math.sign(vel[i][k]) ? gains[i][k] + 0.2 : Math.max(0.01, gains[i][k] * 0.8);
        vel[i][k] = mom * vel[i][k] - learningRate * gains[i][k] * g[k];
        Y[i][k] += vel[i][k];
      }
    }
    let mx = 0, my = 0;
    for (const p of Y) { mx += p[0] / n; my += p[1] / n; }
    for (const p of Y) { p[0] -= mx; p[1] -= my; }
  }
  return Y.map(([x, y]) => [x, y]);
}

/**
 * A Wick that reads positions: a message becomes the average position of its words, and Wick has one knob per
 * direction of the map, plus a starting lean. score = bias + sum over directions of knob * position.
 */
export class MapReader {
  readonly map: Embedding;
  weights: Float64Array;
  bias: number;
  constructor(map: Embedding, weights: Float64Array, bias = 0) {
    this.map = map;
    this.weights = weights;
    this.bias = bias;
  }

  score(text: string): number {
    return this.bias + dot(this.weights, this.map.embed(text).vector);
  }

  pUrgent(text: string): number {
    return sigmoid(this.score(text));
  }

  predict(text: string): { label: 'urgent' | 'can_wait'; pUrgent: number } {
    const p = this.pUrgent(text);
    return { label: p >= 0.5 ? 'urgent' : 'can_wait', pUrgent: p };
  }

  /** Which way the knobs lean at a word's place on the map (its push if it were a message's only word). */
  lean(word: string): number | null {
    const v = this.map.vector(word);
    return v ? dot(this.weights, v) : null;
  }

  /** How hard each word pushes in this message: its place's lean, shared out among the message's known words. */
  explain(text: string): { word: string; push: number | null }[] {
    const { known } = this.map.embed(text);
    const n = known.length || 1;
    return [...new Set(tokenize(text))].map((word) => {
      const l = this.lean(word);
      return { word, push: l == null ? null : l / n };
    });
  }
}

export interface MapTrainOptions {
  learningRate?: number;
  /** L2 penalty on the knobs (not the lean). */
  l2?: number;
}

/**
 * Trains a MapReader one step at a time (so a page can animate it) by plain full-batch gradient descent on the
 * mean log loss, as the bag-of-words Trainer does. The map's directions have very different spreads, so each is
 * first rescaled to mean 0 and spread 1 over the training messages (standardized); the learned knobs are folded
 * back through that rescaling, so the finished model works on raw positions.
 */
export class MapTrainer {
  readonly map: Embedding;
  private X: Float64Array[];
  private y: number[];
  private mu: Float64Array;
  private sd: Float64Array;
  private w: Float64Array;
  private b = 0;
  private opts: MapTrainOptions;
  epoch = 0;
  loss = NaN;

  constructor(map: Embedding, examples: Example[], opts: MapTrainOptions = {}) {
    this.map = map;
    this.opts = opts;
    const raw = examples.map((e) => map.embed(e.text).vector);
    const d = map.dims, n = raw.length;
    this.mu = new Float64Array(d);
    this.sd = new Float64Array(d);
    for (const x of raw) for (let k = 0; k < d; k++) this.mu[k] += x[k] / n;
    for (const x of raw) for (let k = 0; k < d; k++) this.sd[k] += (x[k] - this.mu[k]) ** 2 / n;
    for (let k = 0; k < d; k++) this.sd[k] = Math.sqrt(this.sd[k]) || 1;
    this.X = raw.map((x) => Float64Array.from(x, (v, k) => (v - this.mu[k]) / this.sd[k]));
    this.y = examples.map((e) => (e.label === 'urgent' ? 1 : 0));
    this.w = new Float64Array(d);
  }

  /** One gradient step. Returns the loss before the step (mean log loss plus the L2 penalty). */
  step(): number {
    const { learningRate = 1, l2 = 1e-3 } = this.opts;
    const { X, y, w } = this;
    const d = w.length, n = X.length;
    const g = new Float64Array(d);
    let gb = 0, loss = 0;
    for (let i = 0; i < n; i++) {
      const x = X[i];
      const p = sigmoid(this.b + dot(w, x));
      loss += -(y[i] ? Math.log(p + 1e-12) : Math.log(1 - p + 1e-12));
      const r = p - y[i];
      gb += r;
      for (let k = 0; k < d; k++) g[k] += r * x[k];
    }
    let reg = 0;
    for (let k = 0; k < d; k++) {
      reg += w[k] * w[k];
      w[k] -= learningRate * (g[k] / n + l2 * w[k]);
    }
    this.b -= learningRate * (gb / n);
    this.epoch++;
    this.loss = loss / n + (l2 / 2) * reg;
    return this.loss;
  }

  /** The current knobs, folded back so they apply to raw positions. */
  model(): MapReader {
    const d = this.w.length;
    const w = Float64Array.from(this.w, (v, k) => v / this.sd[k]);
    let b = this.b;
    for (let k = 0; k < d; k++) b -= w[k] * this.mu[k];
    return new MapReader(this.map, w, b);
  }
}

/** Trains to completion. See MapTrainer for the method. */
export function trainMapReader(map: Embedding, examples: Example[], opts: MapTrainOptions & { epochs?: number } = {}): MapReader {
  const { epochs = 300, ...rest } = opts;
  const t = new MapTrainer(map, examples, rest);
  for (let e = 0; e < epochs; e++) t.step();
  return t.model();
}
