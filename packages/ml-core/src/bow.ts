// A bag-of-words linear classifier: one weight ("knob") per word, a bias, and a logistic squash.
// score(x) = bias + sum of weights of the distinct words in x;  p(urgent) = 1 / (1 + e^-score).
// Trained by plain full-batch gradient descent on log loss (no momentum, no Adam), with optional L2.
import { bag } from './text.ts';

export interface Example {
  text: string;
  label: 'urgent' | 'can_wait';
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export class BagOfWords {
  weights = new Map<string, number>();
  bias = 0;

  weight(word: string): number {
    return this.weights.get(word) ?? 0;
  }

  setWeight(word: string, w: number) {
    this.weights.set(word, w);
  }

  score(text: string): number {
    let s = this.bias;
    for (const w of bag(text)) s += this.weight(w);
    return s;
  }

  pUrgent(text: string): number {
    return sigmoid(this.score(text));
  }

  predict(text: string): { label: 'urgent' | 'can_wait'; pUrgent: number } {
    const p = this.pUrgent(text);
    return { label: p >= 0.5 ? 'urgent' : 'can_wait', pUrgent: p };
  }

  /** Per-word contributions, for showing the reader why the machine decided what it did. */
  explain(text: string): { word: string; weight: number }[] {
    return [...bag(text)].map((word) => ({ word, weight: this.weight(word) }));
  }

  clone(): BagOfWords {
    const m = new BagOfWords();
    m.weights = new Map(this.weights);
    m.bias = this.bias;
    return m;
  }

  /** The words with the largest weights in each direction. */
  top(n: number): { urgent: [string, number][]; canWait: [string, number][] } {
    const all = [...this.weights].filter(([, w]) => w !== 0).sort((a, b) => b[1] - a[1]);
    return { urgent: all.slice(0, n), canWait: all.slice(-n).reverse() };
  }
}

export interface TrainOptions {
  epochs?: number;
  learningRate?: number;
  /** L2 penalty on weights (not the bias). */
  l2?: number;
  /** Only words seen in at least this many training messages get a knob. */
  minCount?: number;
  /** Called after each epoch; return false to stop early. */
  onEpoch?: (epoch: number, loss: number, model: BagOfWords) => boolean | void;
}

export function vocabulary(examples: Example[], minCount = 1): string[] {
  const df = new Map<string, number>();
  for (const e of examples) for (const w of bag(e.text)) df.set(w, (df.get(w) ?? 0) + 1);
  return [...df].filter(([, c]) => c >= minCount).map(([w]) => w).sort();
}

/**
 * Trains a bag-of-words logistic regression one gradient step at a time, so a page can animate it.
 * Words are indexed once; each step is one plain gradient-descent step on the mean log loss over all
 * training messages (full batch, fixed learning rate, no momentum).
 */
export class Trainer {
  readonly vocab: string[];
  private rows: { ids: number[]; y: number }[];
  private w: Float64Array;
  private g: Float64Array;
  private b: number;
  private opts: { learningRate?: number; l2?: number; minCount?: number };
  epoch = 0;
  loss = NaN;

  constructor(examples: Example[], opts: { learningRate?: number; l2?: number; minCount?: number } = {}, start?: BagOfWords) {
    this.opts = opts;
    this.vocab = vocabulary(examples, opts.minCount ?? 2);
    const index = new Map(this.vocab.map((w, i) => [w, i]));
    this.rows = examples.map((e) => ({
      ids: [...bag(e.text)].map((w) => index.get(w)).filter((i): i is number => i != null),
      y: e.label === 'urgent' ? 1 : 0,
    }));
    this.w = new Float64Array(this.vocab.length);
    this.g = new Float64Array(this.vocab.length);
    this.b = start?.bias ?? 0;
    if (start) this.vocab.forEach((word, i) => (this.w[i] = start.weight(word)));
  }

  /** One gradient step. Returns the loss before the step. */
  step(): number {
    const { learningRate = 0.5, l2 = 1e-3 } = this.opts;
    const { w, g, rows } = this;
    g.fill(0);
    let gb = 0, loss = 0;
    for (const { ids, y } of rows) {
      let z = this.b;
      for (const i of ids) z += w[i];
      const p = sigmoid(z);
      loss += -(y ? Math.log(p + 1e-12) : Math.log(1 - p + 1e-12));
      const d = p - y;
      gb += d;
      for (const i of ids) g[i] += d;
    }
    const n = rows.length;
    let reg = 0;
    for (let i = 0; i < w.length; i++) {
      reg += w[i] * w[i];
      w[i] -= learningRate * (g[i] / n + l2 * w[i]);
    }
    this.b -= learningRate * (gb / n);
    this.epoch++;
    this.loss = loss / n + (l2 / 2) * reg;
    return this.loss;
  }

  /** The current knob settings as a model. */
  model(): BagOfWords {
    const m = new BagOfWords();
    m.weights = new Map(this.vocab.map((word, i) => [word, this.w[i]]));
    m.bias = this.b;
    return m;
  }
}

/** Trains to completion. See Trainer for the method. */
export function train(examples: Example[], opts: TrainOptions = {}, start?: BagOfWords): BagOfWords {
  const { epochs = 200, onEpoch, ...rest } = opts;
  const t = new Trainer(examples, rest, start);
  for (let e = 1; e <= epochs; e++) {
    const loss = t.step();
    if (onEpoch && onEpoch(e, loss, t.model()) === false) break;
  }
  return t.model();
}
