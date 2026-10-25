// Shared state for the Eleventh Night's widgets: the Third Night's bag-of-words Wick (trained with the same
// TRAIN settings the reader used), its needle reading (pUrgent) on every test message, and the handover line
// the reader sets with the cost slider. Module state is shared because every widget imports this one module.
import { scoreModel, thresholdForCosts, type Scored } from '@primer/ward-board';
import { saveModel } from '@primer/notebook';
import { bag, type BagOfWords } from '@primer/ml-core';
import { ensureTrained } from '../knobs/store.ts';
import { loadCorpus, type Corpus, type CorpusMessage } from '../../../src/lib/corpus.ts';

export type TestSplit = 'day' | 'night' | 'two_am';
export const SETS: { split: TestSplit; name: string; short: string }[] = [
  { split: 'day', name: 'Day Shift', short: 'Day' },
  { split: 'night', name: 'Night Shift', short: 'Night' },
  { split: 'two_am', name: 'The 2 a.m. Set', short: '2 a.m.' },
];

/** Steps of the cost slider: how many needless ambulances one missed emergency is worth. */
export const RATIOS = [1, 2, 3, 5, 10, 20, 30, 50, 100] as const;
export const DEFAULT_RATIO = 10;
/** The line the hospital board asks for, used by the four-in-the-morning alert stream. */
export const BOARD_RATIO = 100;

export const costsFor = (ratio: number) => ({ missCost: ratio, escalationCost: 1 });
export const lineFor = (ratio: number) => thresholdForCosts(costsFor(ratio));

/**
 * Share of a message's distinct words that Wick has no knob for: a second "I don't know" signal beside the
 * needle. Measured on the Eleventh Night: a share of 5% or more flags 3 of the 2 a.m. Set's 4 quiet misses at
 * the 9% line, but only 1 of the Night Shift's 6. For the Twelfth Night's handover bell to build on.
 */
export function unknownShare(wick: BagOfWords, text: string): number {
  const words = [...bag(text)];
  return words.length ? words.filter((w) => !wick.weights.has(w)).length / words.length : 0;
}
export const UNKNOWN_SHARE_FLAG = 0.05;

export interface Reading extends Scored {
  m: CorpusMessage;
}

let ready: Promise<{ c: Corpus; wick: BagOfWords; readings: Record<TestSplit, Reading[]> }> | null = null;

/** Loads the corpus, trains the Third Night's Wick once, and reads its needle on every test message. */
export function wickReadings() {
  ready ??= Promise.all([loadCorpus(), ensureTrained()]).then(([c, wick]) => {
    const readings = { day: [], night: [], two_am: [] } as Record<TestSplit, Reading[]>;
    for (const m of c.messages) {
      if (m.split === 'train') continue;
      readings[m.split as TestSplit].push({ p: wick.pUrgent(m.text), y: m.label === 'urgent' ? 1 : 0, m });
    }
    return { c, wick, readings };
  });
  return ready;
}

let ratio: number = DEFAULT_RATIO;
const listeners = new Set<() => void>();
export const onRatio = (f: () => void) => listeners.add(f);
export const getRatio = () => ratio;
export function setRatio(r: number) {
  ratio = r;
  listeners.forEach((f) => f());
}

/** Wick with a handover line: rings for a nurse (calls urgent) whenever the needle is at or past the line. */
export function saveHandover(c: Corpus, wick: BagOfWords, r: number) {
  const t = lineFor(r);
  const pct = Math.round(t * 100);
  saveModel({
    id: 'ch11-handover',
    name: `Wick with a handover line at ${pct}%`,
    chapter: 11,
    scores: scoreModel(c.messages, (x) => {
      const p = wick.pUrgent(x.text);
      return { label: p >= t ? 'urgent' : 'can_wait', pUrgent: p };
    }),
  });
}

/**
 * Four in the morning: twenty-four real slips from the Night Shift and the 2 a.m. Set, in this order, read by
 * Wick at the board's line (one miss worth a hundred needless ambulances, so it rings at about 1%). Picked to
 * match how often Wick's alerts are needless at that line (8 of 18 here; 162 of 383 across both sets), plus
 * four it lets wait correctly and two of its real misses. Pinned by apps/site/test/ch11-claims.test.ts.
 */
export const STREAM: { id: string; why?: string }[] = [
  { id: 'n0032' }, { id: 'n0059' }, { id: 'n0149' }, { id: 'n0150' }, { id: 'n0014' }, { id: 'n0198' },
  { id: 'n0076' }, { id: 'n0093' }, { id: 'n0157' }, { id: 'n0062' }, { id: 'n0151' }, { id: 'n0232' },
  { id: 'n0111' }, { id: 'n0007' },
  { id: 'a0057', why: "Four months old and 39.4. A baby of three to six months with a temperature of 39 or more is on the guidance's list of signs that need urgent advice on their own." },
  { id: 'n0005' }, { id: 'n0004' }, { id: 'n0156' }, { id: 'n0042' }, { id: 'n0011' },
  { id: 'n0155', why: "Five months old and 39.7. A baby of three to six months with a temperature of 39 or more is on the guidance's list of signs that need urgent advice on their own." },
  { id: 'n0182' }, { id: 'n0001' }, { id: 'n0238' },
];

export type { Corpus, CorpusMessage, Scored };
