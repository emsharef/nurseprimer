// Shared state for the Fifth Night's widgets on one page: the knobs you set by hand, and the knobs Wick
// learns by itself. Module state is shared because every widget imports this one module.
import { BagOfWords, Trainer } from '@primer/ml-core';
import { scoreModel, scoreSet, type SetScore } from '@primer/ward-board';
import { saveModel } from '@primer/notebook';
import { loadCorpus, bySplit, type Corpus, type CorpusMessage } from '../../../src/lib/corpus.ts';

export const HAND_WORDS = ['glass', 'fade', 'purple', 'sleepy', 'breathing', 'stiff', 'cough', 'fine'] as const;

/** Training settings, also used by the tests that check the chapter's claims. */
export const TRAIN = { epochs: 300, learningRate: 1, l2: 1e-3, minCount: 2 } as const;

export const hand = new BagOfWords();
hand.bias = -1;

let trained: BagOfWords | null = null;
const listeners = new Set<() => void>();
export const onChange = (f: () => void) => listeners.add(f);
export const changed = () => listeners.forEach((f) => f());

export function corpus(): Promise<Corpus> {
  return loadCorpus();
}

export function scoreDay(c: Corpus, m: BagOfWords): SetScore {
  return scoreSet(bySplit(c, 'day'), (x) => m.predict(x.text));
}

export function saveToBoard(c: Corpus, m: BagOfWords, id: string, name: string) {
  saveModel({ id, name, chapter: 5, scores: scoreModel(c.messages, (x) => m.predict(x.text)) });
}

export function getTrained(): BagOfWords | null {
  return trained;
}

export function setTrained(m: BagOfWords) {
  trained = m;
  changed();
}

/** Trains without animation (for widgets used before the reader pressed Train). */
export async function ensureTrained(): Promise<BagOfWords> {
  if (trained) return trained;
  const c = await corpus();
  const t = new Trainer(bySplit(c, 'train'), TRAIN);
  for (let i = 0; i < TRAIN.epochs; i++) t.step();
  setTrained(t.model());
  return trained!;
}

export type { CorpusMessage };
