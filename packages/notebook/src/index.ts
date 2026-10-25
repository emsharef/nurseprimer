// The reader's lab notebook (plan 4.6): reading track, models built so far, and their Ward Board scores.
// Persists across chapters in browser storage; anonymous; survives empty or unavailable storage.
import { readJSON, writeJSON, remove } from './storage.ts';

export type Track = 'nurse' | 'coder' | 'curious';

export interface ModelRecord {
  /** Stable id, e.g. "ch5-knobs-trained". Re-saving the same id replaces the entry. */
  id: string;
  /** Short name the reader sees on the board. */
  name: string;
  chapter: number;
  savedAt: string;
  /** Scores keyed by test set, as produced by @primer/ward-board's scoreModel. */
  scores: Record<string, unknown>;
}

export interface Notebook {
  schema: 1;
  track: Track | null;
  models: ModelRecord[];
}

const KEY = 'primer.notebook.v1';
export const CHANGE_EVENT = 'primer:notebook';

function empty(): Notebook {
  return { schema: 1, track: null, models: [] };
}

export function load(): Notebook {
  const nb = readJSON<Notebook | null>(KEY, null);
  if (!nb || nb.schema !== 1 || !Array.isArray(nb.models)) return empty();
  return nb;
}

function save(nb: Notebook): void {
  writeJSON(KEY, nb);
  try {
    globalThis.dispatchEvent?.(new CustomEvent(CHANGE_EVENT, { detail: nb }));
  } catch {}
}

export function setTrack(track: Track): Notebook {
  const nb = { ...load(), track };
  save(nb);
  return nb;
}

export function saveModel(model: Omit<ModelRecord, 'savedAt'>): Notebook {
  const nb = load();
  const record: ModelRecord = { ...model, savedAt: new Date().toISOString() };
  const models = nb.models.filter((m) => m.id !== model.id).concat(record);
  const next = { ...nb, models };
  save(next);
  return next;
}

export function reset(): Notebook {
  remove(KEY);
  const nb = empty();
  save(nb);
  return nb;
}
