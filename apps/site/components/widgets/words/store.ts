// Shared state for the Fifth Night's widgets: the word map (precomputed from the corpus by scripts/wordmap.mjs),
// the Third Night's bag-of-words Wick (retrained here with the same settings, for comparison), and the Wick
// that reads the map, trained in the browser on Bea's marked pile.
import { Embedding, MapTrainer, Trainer, type BagOfWords, type MapReader, type PackedEmbedding } from '@primer/ml-core';
import { scoreModel, scoreSet, type SetScore } from '@primer/ward-board';
import { saveModel, load } from '@primer/notebook';
import { loadCorpus, bySplit, type Corpus } from '../../../src/lib/corpus.ts';
import { TRAIN } from '../knobs/store.ts';

/** Training settings for the map-reading Wick: the Third Night's, unchanged. */
export const MAP_TRAIN = { epochs: 300, learningRate: 1, l2: 1e-3 } as const;
export { TRAIN as BOW_TRAIN };

export interface WordMapFile {
  corpusVersion: string;
  settings: { window: number; minCount: number; dims: number; seed: number };
  messages: number;
  embedding: PackedEmbedding;
  picture: { words: string[]; counts: number[]; xy: [number, number][] };
}

let mapPending: Promise<{ file: WordMapFile; map: Embedding }> | null = null;
export function loadMap() {
  mapPending ??= fetch(`${import.meta.env.BASE_URL}data/wordmap.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`The word map did not load (${r.status}). Reload the page to try again.`);
      return r.json() as Promise<WordMapFile>;
    })
    .then((file) => ({ file, map: Embedding.unpack(file.embedding) }));
  return mapPending;
}

export const corpus = (): Promise<Corpus> => loadCorpus();

let bow: BagOfWords | null = null;
export async function ensureBow(): Promise<BagOfWords> {
  if (bow) return bow;
  const c = await corpus();
  const t = new Trainer(bySplit(c, 'train'), TRAIN);
  for (let i = 0; i < TRAIN.epochs; i++) t.step();
  bow = t.model();
  return bow;
}

let reader: MapReader | null = null;
const listeners = new Set<() => void>();
export const onChange = (f: () => void) => listeners.add(f);
export function setReader(m: MapReader) {
  reader = m;
  listeners.forEach((f) => f());
}
export const getReader = () => reader;

export async function newTrainer(): Promise<MapTrainer> {
  const [c, { map }] = await Promise.all([corpus(), loadMap()]);
  return new MapTrainer(map, bySplit(c, 'train'), MAP_TRAIN);
}

/** Trains without animation, for widgets used before the reader pressed Train. */
export async function ensureReader(): Promise<MapReader> {
  if (reader) return reader;
  const t = await newTrainer();
  for (let i = 0; i < MAP_TRAIN.epochs; i++) t.step();
  setReader(t.model());
  return reader!;
}

export function scoreSplit(c: Corpus, split: 'day' | 'night' | 'two_am', predict: (text: string) => { label: 'urgent' | 'can_wait' }): SetScore {
  return scoreSet(bySplit(c, split), (x) => predict(x.text));
}

/** Saves the map-reader, and the Third Night's bag of words too if the reader hasn't put it up yet (same id). */
export function saveReader(c: Corpus, m: MapReader, bagOfWords: BagOfWords) {
  if (!load().models.some((x) => x.id === 'ch3-trained')) {
    saveModel({ id: 'ch3-trained', name: 'Wick, self-tuned', chapter: 3, scores: scoreModel(c.messages, (x) => bagOfWords.predict(x.text)) });
  }
  saveModel({ id: 'ch5-map', name: 'Wick, map-reader', chapter: 5, scores: scoreModel(c.messages, (x) => m.predict(x.text)) });
}
