// Reads content/citations.yaml (the single source of truth, plan 10.2) and finds which keys and notes a
// chapter uses. The same patterns are used by scripts/citation-audit.mjs, so the page and the audit agree.
import { parse } from 'yaml';
import citationsYaml from '../../../../content/citations.yaml?raw';

export interface Reference {
  key: string;
  authors: string;
  year: number;
  title: string;
  venue?: string;
  url?: string;
  doi?: string;
}

export function loadReferences(): Map<string, Reference> {
  const doc = parse(citationsYaml) ?? {};
  const refs = new Map<string, Reference>();
  for (const [key, value] of Object.entries(doc.references ?? {})) refs.set(key, { key, ...(value as object) } as Reference);
  return refs;
}

export const CITE_RE = /<Cite\s+k="([^"]+)"/g;
export const NOTEREF_RE = /<NoteRef\s+id="([^"]+)"/g;

export function orderOfFirstUse(body: string, re: RegExp): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of body.matchAll(re)) if (!out.has(m[1])) out.set(m[1], out.size + 1);
  return out;
}
