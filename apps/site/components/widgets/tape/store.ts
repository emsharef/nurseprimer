// Shared state for the First Night's widgets: the one word Wick's rule card looks for. Every tape machine and
// the Day Shift scorer on the page read it from here, so the rule you punch in the first widget is the rule
// the later ones run.
import { wordFinder, runTape, type TapeMachine } from '@primer/ml-core';
import { scoreModel } from '@primer/ward-board';
import { saveModel } from '@primer/notebook';
import type { CorpusMessage } from '../../../src/lib/corpus.ts';

export const DEFAULT_WORD = 'purple';

/** Bea's test card, as pinned under the Ward Board in the Prologue. */
export const TEST_CARD =
  'she has a fever and some little purple spots on her legs. i pressed a glass on them like my mum said and they dont fade.';

let word = DEFAULT_WORD;
let punched = false;
const listeners = new Set<() => void>();

export const onWord = (f: () => void) => listeners.add(f);
export const getWord = () => word;
export const isPunched = () => punched;

/** Accepts letters, spaces and apostrophes, 1 to 16 of them. Returns an error message or null. */
export function checkWord(w: string): string | null {
  const t = w.trim().toLowerCase();
  if (!t) return 'Write a word for Wick to look for.';
  if (t.length > 16) return 'Keep it to sixteen letters: the card is small.';
  if (!/^[a-z' -]+$/.test(t)) return 'Letters only: the punch has no numbers or symbols.';
  return null;
}

export function setWord(w: string) {
  word = w.trim().toLowerCase().replace(/\s+/g, ' ');
  punched = true;
  listeners.forEach((f) => f());
}

export function machine(w = word): TapeMachine {
  return wordFinder(w);
}

export function verdict(m: TapeMachine, text: string): 'urgent' | 'can_wait' {
  return runTape(m, text).output === 'URGENT' ? 'urgent' : 'can_wait';
}

export function saveToBoard(messages: CorpusMessage[], w = word) {
  const m = machine(w);
  saveModel({
    // Bea's word and the reader's own word get separate places on the board.
    id: w === DEFAULT_WORD ? 'ch1-one-rule' : 'ch1-own-rule',
    name: `Wick, one rule: “${w}”`,
    chapter: 1,
    scores: scoreModel(messages, (x) => ({ label: verdict(m, x.text) })),
  });
}
