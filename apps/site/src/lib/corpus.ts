// Loads the shared corpus (public/data/corpus.json) once per page. Every widget scores on the same data.
import type { Message } from '@primer/ward-board';

export interface CorpusMessage extends Message {
  clinic: string;
  phenomena: string[];
}

export interface Corpus {
  version: string;
  status: string;
  guidance: string;
  messages: CorpusMessage[];
}

let pending: Promise<Corpus> | null = null;

export function loadCorpus(): Promise<Corpus> {
  pending ??= fetch(`${import.meta.env.BASE_URL}data/corpus.json`).then((r) => {
    if (!r.ok) throw new Error(`The message corpus did not load (${r.status}). Reload the page to try again.`);
    return r.json();
  });
  return pending;
}

export const bySplit = (c: Corpus, split: Message['split']) => c.messages.filter((m) => m.split === split);
