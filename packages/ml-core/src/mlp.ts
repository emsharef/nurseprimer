// A tiny neural network over a bag of words: one hidden layer ("a second row of knobs that listens to the
// first"). Each hidden unit sums its own weights for the words present, plus a bias, and squashes the total
// with tanh; the output sums the hidden units' answers with its own weights and squashes with a logistic.
//   h_j(x) = tanh(c_j + sum_{w in x} U[j][w]),   p(urgent) = sigmoid(b + sum_j v_j h_j(x)).
// Trained by plain full-batch gradient descent on log loss (no momentum, no Adam), with optional L2 on the
// weights (not the biases). Weights start small and random from a seeded generator, so runs are repeatable.
import { bag } from './text.ts';
import { sigmoid, vocabulary, type Example } from './bow.ts';

/** A small seeded random generator (mulberry32), so a page and a test train the same network. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MLPOptions {
  hidden?: number;
  learningRate?: number;
  /** L2 penalty on weights (not biases). */
  l2?: number;
  /** Only words seen in at least this many training messages get an input. */
  minCount?: number;
  seed?: number;
  /** Scale of the random starting weights. */
  initScale?: number;
}

/** A trained (or training) network. Read-only view used for predictions and inspection. */
export class MLP {
  readonly vocab: string[];
  readonly index: Map<string, number>;
  readonly hidden: number;
  /** U[j * V + i]: hidden unit j's weight for word i. */
  readonly U: Float64Array;
  readonly c: Float64Array;
  readonly v: Float64Array;
  b = 0;

  constructor(vocab: string[], hidden: number) {
    this.vocab = vocab;
    this.index = new Map(vocab.map((w, i) => [w, i]));
    this.hidden = hidden;
    this.U = new Float64Array(hidden * vocab.length);
    this.c = new Float64Array(hidden);
    this.v = new Float64Array(hidden);
  }

  ids(text: string): number[] {
    const out: number[] = [];
    for (const w of bag(text)) {
      const i = this.index.get(w);
      if (i != null) out.push(i);
    }
    return out;
  }

  /** Hidden-unit activations for a message's word ids. */
  hiddenOf(ids: number[]): Float64Array {
    const V = this.vocab.length, h = new Float64Array(this.hidden);
    for (let j = 0; j < this.hidden; j++) {
      let z = this.c[j];
      const o = j * V;
      for (const i of ids) z += this.U[o + i];
      h[j] = Math.tanh(z);
    }
    return h;
  }

  scoreIds(ids: number[]): number {
    const h = this.hiddenOf(ids);
    let s = this.b;
    for (let j = 0; j < this.hidden; j++) s += this.v[j] * h[j];
    return s;
  }

  pUrgent(text: string): number {
    return sigmoid(this.scoreIds(this.ids(text)));
  }

  predict(text: string): { label: 'urgent' | 'can_wait'; pUrgent: number } {
    const p = this.pUrgent(text);
    return { label: p >= 0.5 ? 'urgent' : 'can_wait', pUrgent: p };
  }

  /** Hidden unit j's weight for a word (0 if the word has no input). */
  weight(j: number, word: string): number {
    const i = this.index.get(word);
    return i == null ? 0 : this.U[j * this.vocab.length + i];
  }

  /**
   * How much each word pushes the final score, holding the rest of the message fixed: the change in score
   * when that one word is taken out. Positive means the word pushed toward urgent.
   */
  explain(text: string): { word: string; push: number }[] {
    const ids = this.ids(text);
    const full = this.scoreIds(ids);
    return ids.map((i, k) => ({ word: this.vocab[i], push: full - this.scoreIds(ids.filter((_, m) => m !== k)) }));
  }

  /**
   * Each word's push on its own, from an empty message: score({word}) - score({}). A simple way to rank what
   * the network has learned to treat as urgent, comparable to the Third Night's knob ranking.
   */
  wordPushes(): { word: string; push: number }[] {
    const base = this.scoreIds([]);
    return this.vocab.map((word, i) => ({ word, push: this.scoreIds([i]) - base }));
  }
}

/**
 * Trains the network one full-batch gradient step at a time, so a page can animate it.
 */
export class MLPTrainer {
  readonly net: MLP;
  private rows: { ids: number[]; y: number }[];
  private opts: Required<Omit<MLPOptions, 'hidden' | 'minCount' | 'seed' | 'initScale'>>;
  private gU: Float64Array;
  epoch = 0;
  loss = NaN;

  constructor(examples: Example[], opts: MLPOptions = {}) {
    const { hidden = 8, minCount = 2, seed = 1, initScale = 0.1, learningRate = 1, l2 = 1e-3 } = opts;
    this.opts = { learningRate, l2 };
    const net = new MLP(vocabulary(examples, minCount), hidden);
    const rand = seededRandom(seed);
    for (let k = 0; k < net.U.length; k++) net.U[k] = (rand() * 2 - 1) * initScale;
    for (let j = 0; j < hidden; j++) net.v[j] = (rand() * 2 - 1) * 0.5;
    this.net = net;
    this.rows = examples.map((e) => ({ ids: net.ids(e.text), y: e.label === 'urgent' ? 1 : 0 }));
    this.gU = new Float64Array(net.U.length);
  }

  /** One gradient step on the mean log loss over every training message. Returns the loss before the step. */
  step(): number {
    const { net, rows, gU } = this;
    const { learningRate: lr, l2 } = this.opts;
    const H = net.hidden, V = net.vocab.length;
    const gc = new Float64Array(H), gv = new Float64Array(H);
    let gb = 0, loss = 0;
    gU.fill(0);
    for (const { ids, y } of rows) {
      const h = net.hiddenOf(ids);
      let s = net.b;
      for (let j = 0; j < H; j++) s += net.v[j] * h[j];
      const p = sigmoid(s);
      loss += -(y ? Math.log(p + 1e-12) : Math.log(1 - p + 1e-12));
      const d = p - y;
      gb += d;
      for (let j = 0; j < H; j++) {
        gv[j] += d * h[j];
        const dz = d * net.v[j] * (1 - h[j] * h[j]);
        gc[j] += dz;
        const o = j * V;
        for (const i of ids) gU[o + i] += dz;
      }
    }
    const n = rows.length;
    let reg = 0;
    for (let k = 0; k < net.U.length; k++) {
      reg += net.U[k] * net.U[k];
      net.U[k] -= lr * (gU[k] / n + l2 * net.U[k]);
    }
    for (let j = 0; j < H; j++) {
      reg += net.v[j] * net.v[j];
      net.v[j] -= lr * (gv[j] / n + l2 * net.v[j]);
      net.c[j] -= lr * (gc[j] / n);
    }
    net.b -= lr * (gb / n);
    this.epoch++;
    this.loss = loss / n + (l2 / 2) * reg;
    return this.loss;
  }
}

/** Trains to completion. */
export function trainMLP(examples: Example[], opts: MLPOptions & { epochs?: number } = {}): MLP {
  const { epochs = 300, ...rest } = opts;
  const t = new MLPTrainer(examples, rest);
  for (let e = 0; e < epochs; e++) t.step();
  return t.net;
}
