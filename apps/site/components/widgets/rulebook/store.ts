// Shared state for the Second Night's widgets: the rulebooks on the page, by name, so the one-message tester
// can run the reader's own rulebook as well as the one from three o'clock.
import { Rulebook } from '@primer/ml-core';
import { scoreModel } from '@primer/ward-board';
import { saveModel } from '@primer/notebook';
import type { CorpusMessage } from '../../../src/lib/corpus.ts';
import { FIRST_RULE, THREE_OCLOCK } from './books.ts';

const books = new Map<string, string>([['yours', FIRST_RULE], ['three', THREE_OCLOCK]]);
const listeners = new Set<() => void>();

export const getBook = (name: string) => books.get(name) ?? FIRST_RULE;
export const onBooks = (f: () => void) => listeners.add(f);
export function setBook(name: string, src: string) {
  books.set(name, src);
  listeners.forEach((f) => f());
}

export function saveToBoard(messages: CorpusMessage[], src: string, id: string, name: string) {
  const rb = new Rulebook(src);
  saveModel({ id, name, chapter: 2, scores: scoreModel(messages, (x) => rb.predict(x.text)) });
}
