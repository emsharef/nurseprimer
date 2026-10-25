// A tiny character-level language model: given the last few characters, guess the next one. It is a small
// neural network in the style of Bengio et al. (2003), but over characters instead of words: each character in
// a fixed window is looked up in a table of learned numbers (its "embedding"), the window's numbers go through
// one hidden layer of tanh units, and a softmax turns the output into a probability for every character.
// Trained with Adam on random mini-batches from the training messages.
//
// Everything here is deterministic on every device: the random numbers come from a seeded generator, and
// exp/tanh are computed with plain arithmetic (the browser's Math.exp may differ in the last bit between
// engines), so the same seed gives exactly the same Wick on a phone, a laptop and in the tests.
import { seededRandom } from './ngram.ts';

/** The characters Wick can print. Index 0 ("\n") marks the boundary between messages. */
export const CHARS = "\n abcdefghijklmnopqrstuvwxyz0123456789.,'?";
const INDEX = new Map([...CHARS].map((c, i) => [c, i]));

/** Lowercases, folds accents and curly quotes, turns any other character into a space, collapses spaces. */
export function normalizeChars(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’‘]/g, "'")
    .replace(/[!]/g, '.')
    .replace(/[^ a-z0-9.,'?]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** All messages as one stream of character indices, each message followed by the boundary mark. */
export function encodeCorpus(texts: Iterable<string>): Uint8Array {
  const parts: number[] = [0];
  for (const t of texts) {
    for (const c of normalizeChars(t)) parts.push(INDEX.get(c)!);
    parts.push(0);
  }
  return Uint8Array.from(parts);
}

export const decodeChars = (ids: ArrayLike<number>) => Array.from(ids, (i) => CHARS[i]).join('');

// exp(x) from + - * / only: range reduction by ln 2, a degree-13 Taylor polynomial, and 2^k from the bits.
const LN2_HI = 0.6931471803691238, LN2_LO = 1.9082149292705877e-10, INV_LN2 = 1.4426950408889634;
const pow2buf = new DataView(new ArrayBuffer(8));
function pow2(k: number): number {
  pow2buf.setUint32(0, (k + 1023) << 20);
  pow2buf.setUint32(4, 0);
  return pow2buf.getFloat64(0);
}
export function dexp(x: number): number {
  if (x > 700) x = 700;
  if (x < -700) return 0;
  const k = Math.floor(x * INV_LN2 + 0.5);
  const r = x - k * LN2_HI - k * LN2_LO;
  let p = 1 / 6227020800;
  for (let n = 12; n >= 1; n--) p = p * r + INV_FACT[n];
  return (p * r + 1) * pow2(k);
}
const INV_FACT = [1, 1, 1 / 2, 1 / 6, 1 / 24, 1 / 120, 1 / 720, 1 / 5040, 1 / 40320, 1 / 362880, 1 / 3628800, 1 / 39916800, 1 / 479001600];
export function dtanh(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return -1;
  const e = dexp(2 * x);
  return (e - 1) / (e + 1);
}

export interface CharModelConfig {
  /** Characters Wick can see before guessing the next one. */
  context: number;
  /** Numbers learned for each character. */
  embed: number;
  /** Hidden tanh units. */
  hidden: number;
  /** Examples per training step. */
  batch: number;
  /** Adam step size. */
  lr: number;
  /** The step size halves after this many steps, a third after twice as many, and so on (0: constant). */
  lrHalfLife: number;
  /** Spread of the starting embedding numbers. */
  embScale: number;
  seed: number;
}

/** The settings the Sixth Night uses (and its tests pin). */
export const CHAR_MODEL: CharModelConfig = { context: 8, embed: 16, hidden: 256, batch: 32, lr: 0.005, lrHalfLife: 3000, embScale: 1, seed: 6 };

export class CharModel {
  readonly V = CHARS.length;
  readonly cfg: CharModelConfig;
  /** Every parameter in one array (embeddings, hidden weights and biases, output weights and biases). */
  readonly params: Float64Array;
  readonly emb: Float64Array;
  readonly W1: Float64Array;
  readonly b1: Float64Array;
  readonly W2: Float64Array;
  readonly b2: Float64Array;

  constructor(cfg: CharModelConfig = CHAR_MODEL, params?: ArrayLike<number>) {
    this.cfg = cfg;
    const { V } = this;
    const { context: C, embed: E, hidden: H } = cfg;
    const sizes = [V * E, C * E * H, H, H * V, V];
    this.params = new Float64Array(sizes.reduce((a, b) => a + b, 0));
    let o = 0;
    const view = (n: number) => this.params.subarray(o, (o += n));
    this.emb = view(sizes[0]);
    this.W1 = view(sizes[1]);
    this.b1 = view(sizes[2]);
    this.W2 = view(sizes[3]);
    this.b2 = view(sizes[4]);
    if (params) {
      this.params.set(params);
      return;
    }
    // Uniform initialisation (no Gaussian: that would need Math.log, which is not bit-identical everywhere).
    const rnd = seededRandom(cfg.seed);
    const fill = (a: Float64Array, scale: number) => { for (let i = 0; i < a.length; i++) a[i] = (rnd() * 2 - 1) * scale; };
    fill(this.emb, cfg.embScale);
    fill(this.W1, Math.sqrt(3 / (C * E)));
    fill(this.W2, 0.1 * Math.sqrt(3 / H));
  }

  get size(): number {
    return this.params.length;
  }

  /** Hidden activations for one window (indices of the last `context` characters, oldest first). */
  hiddenFor(win: ArrayLike<number>, h: Float64Array, x: Float64Array) {
    const { context: C, embed: E, hidden: H } = this.cfg;
    for (let c = 0; c < C; c++) {
      const e = win[c] * E;
      for (let j = 0; j < E; j++) x[c * E + j] = this.emb[e + j];
    }
    h.set(this.b1);
    const W1 = this.W1;
    for (let i = 0, n = C * E; i < n; i++) {
      const xi = x[i];
      const row = i * H;
      for (let k = 0; k < H; k++) h[k] += xi * W1[row + k];
    }
    for (let k = 0; k < H; k++) h[k] = dtanh(h[k]);
  }

  /** Probability of every character coming next, after the text so far (padded on the left with boundaries). */
  probs(window: ArrayLike<number>, temperature = 1): Float64Array {
    const { context: C, embed: E, hidden: H } = this.cfg;
    const V = this.V;
    const h = new Float64Array(H), x = new Float64Array(C * E), z = new Float64Array(V);
    this.hiddenFor(window, h, x);
    for (let v = 0; v < V; v++) z[v] = this.b2[v];
    for (let k = 0; k < H; k++) {
      const hk = h[k], row = k * V;
      for (let v = 0; v < V; v++) z[v] += hk * this.W2[row + v];
    }
    return softmax(z, temperature);
  }

  /** The window of the last `context` characters of `text` (normalized), as indices. */
  window(text: string): number[] {
    const ids = [0, ...[...normalizeChars(text)].map((c) => INDEX.get(c)!)];
    const C = this.cfg.context;
    const w = ids.slice(-C);
    while (w.length < C) w.unshift(0);
    return w;
  }

  /** Continues `prefix` one character at a time, until a message boundary or `maxChars`. */
  sample(prefix: string, maxChars: number, rng: () => number, temperature = 1): string {
    const win = this.window(prefix);
    let out = '';
    for (let i = 0; i < maxChars; i++) {
      const p = this.probs(win, temperature);
      let r = rng(), c = 0;
      for (; c < p.length - 1; c++) if ((r -= p[c]) < 0) break;
      if (c === 0) break;
      out += CHARS[c];
      win.shift();
      win.push(c);
    }
    return out;
  }
}

function softmax(z: Float64Array, temperature = 1): Float64Array {
  let m = -Infinity;
  for (const v of z) if (v > m) m = v;
  let s = 0;
  const p = new Float64Array(z.length);
  for (let i = 0; i < z.length; i++) s += p[i] = dexp((z[i] - m) / temperature);
  for (let i = 0; i < z.length; i++) p[i] /= s;
  return p;
}

/** Trains a CharModel on a character stream with Adam on random mini-batches. */
export class CharTrainer {
  readonly model: CharModel;
  readonly data: Uint8Array;
  step = 0;
  private rnd: () => number;
  private m: Float64Array;
  private v: Float64Array;
  private g: Float64Array;
  private b1t = 1;
  private b2t = 1;
  // Scratch buffers, reused every step.
  private X: Float64Array;
  private Hs: Float64Array;
  private Z: Float64Array;
  private dH: Float64Array;
  private idx: Int32Array;

  constructor(data: Uint8Array, model = new CharModel()) {
    this.model = model;
    this.data = data;
    const { context: C, embed: E, hidden: H, batch: B, seed } = model.cfg;
    this.rnd = seededRandom(seed * 7919 + 1);
    const n = model.size;
    this.m = new Float64Array(n);
    this.v = new Float64Array(n);
    this.g = new Float64Array(n);
    this.X = new Float64Array(B * C * E);
    this.Hs = new Float64Array(B * H);
    this.Z = new Float64Array(B * model.V);
    this.dH = new Float64Array(H);
    this.idx = new Int32Array(B);
  }

  /** One Adam step on a fresh random batch. Returns the batch's average loss (nats per character). */
  train(): number {
    const M = this.model;
    const { context: C, batch: B, lrHalfLife } = M.cfg;
    const lr = lrHalfLife > 0 ? M.cfg.lr / (1 + this.step / lrHalfLife) : M.cfg.lr;
    const lo = C, hi = this.data.length;
    for (let b = 0; b < B; b++) this.idx[b] = lo + Math.floor(this.rnd() * (hi - lo));
    const loss = this.backprop(this.idx);
    const g = this.g;
    // Adam.
    const b1 = 0.9, b2 = 0.999, eps = 1e-8;
    this.b1t *= b1;
    this.b2t *= b2;
    const c1 = 1 / (1 - this.b1t), c2 = 1 / (1 - this.b2t);
    const P = M.params, m = this.m, vv = this.v;
    for (let i = 0; i < P.length; i++) {
      const gi = g[i];
      m[i] = b1 * m[i] + (1 - b1) * gi;
      vv[i] = b2 * vv[i] + (1 - b2) * gi * gi;
      P[i] -= (lr * (m[i] * c1)) / (Math.sqrt(vv[i] * c2) + eps);
    }
    this.step++;
    return loss;
  }

  /**
   * The average loss over the characters at `positions` (each predicted from the `context` before it), and its
   * gradient with respect to every parameter, left in `gradient`. At most `batch` positions.
   */
  backprop(positions: ArrayLike<number>): number {
    const M = this.model, { V } = M;
    const { context: C, embed: E, hidden: H } = M.cfg;
    const B = positions.length;
    const { X, Hs, Z, dH, g, data } = this;
    const CE = C * E;
    // Forward.
    const win = new Array<number>(C);
    let loss = 0;
    for (let b = 0; b < B; b++) {
      const t = positions[b];
      for (let c = 0; c < C; c++) win[c] = data[t - C + c];
      const h = Hs.subarray(b * H, b * H + H), x = X.subarray(b * CE, b * CE + CE);
      M.hiddenFor(win, h, x);
      const z = Z.subarray(b * V, b * V + V);
      for (let v = 0; v < V; v++) z[v] = M.b2[v];
      for (let k = 0; k < H; k++) {
        const hk = h[k], row = k * V;
        for (let v = 0; v < V; v++) z[v] += hk * M.W2[row + v];
      }
      const p = softmax(z);
      const y = data[t];
      loss -= Math.log(p[y] + 1e-12);
      for (let v = 0; v < V; v++) z[v] = (p[v] - (v === y ? 1 : 0)) / B; // z now holds dLoss/dlogit
    }
    // Backward.
    g.fill(0);
    const off = { emb: 0, W1: M.emb.length, b1: M.emb.length + M.W1.length };
    const oW2 = off.b1 + H, ob2 = oW2 + H * V;
    for (let b = 0; b < B; b++) {
      const h = Hs.subarray(b * H, b * H + H), x = X.subarray(b * CE, b * CE + CE), dz = Z.subarray(b * V, b * V + V);
      for (let v = 0; v < V; v++) g[ob2 + v] += dz[v];
      for (let k = 0; k < H; k++) {
        const hk = h[k], row = k * V;
        let s = 0;
        for (let v = 0; v < V; v++) {
          g[oW2 + row + v] += hk * dz[v];
          s += M.W2[row + v] * dz[v];
        }
        dH[k] = s * (1 - hk * hk);
      }
      for (let k = 0; k < H; k++) g[off.b1 + k] += dH[k];
      const t = positions[b];
      for (let i = 0; i < CE; i++) {
        const xi = x[i], row = i * H;
        let s = 0;
        for (let k = 0; k < H; k++) {
          g[off.W1 + row + k] += xi * dH[k];
          s += M.W1[row + k] * dH[k];
        }
        const ch = data[t - C + Math.floor(i / E)];
        g[ch * E + (i % E)] += s;
      }
    }
    return loss / B;
  }

  /** The gradient left by the last backprop() or train() (read-only view). */
  get gradient(): Float64Array {
    return this.g;
  }

  /**
   * On `n` evenly spaced positions of `data` (no training): the average loss (nats per character) and how
   * often the model's single likeliest next character is the right one.
   */
  static evaluate(model: CharModel, data: Uint8Array, n = 2000): { loss: number; accuracy: number } {
    const C = model.cfg.context;
    const stride = Math.max(1, Math.floor((data.length - C) / n));
    let loss = 0, right = 0, count = 0;
    const win = new Array<number>(C);
    for (let t = C; t < data.length && count < n; t += stride, count++) {
      for (let c = 0; c < C; c++) win[c] = data[t - C + c];
      const p = model.probs(win);
      loss -= Math.log(p[data[t]] + 1e-12);
      let best = 0;
      for (let v = 1; v < p.length; v++) if (p[v] > p[best]) best = v;
      if (best === data[t]) right++;
    }
    return { loss: loss / count, accuracy: right / count };
  }
}
