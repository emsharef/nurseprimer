#!/usr/bin/env node
// Citation audit (plan 10.2). Fails when:
//   - a reference in content/citations.yaml is never cited in any chapter
//   - a chapter cites a key that is missing from the YAML
//   - a NoteRef has no NoteDef, or a NoteDef has no NoteRef in the text
//   - a reference lacks required fields or a verification record
//   - a quoted figure lacks its page or table
// With --release, every reference must also be verified at `scope: claim`, not just metadata.
// Usage: node scripts/citation-audit.mjs [--release] [--yaml path] [--chapters dir]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const release = args.includes('--release');
const yamlPath = opt('--yaml', join(root, 'content/citations.yaml'));
const chaptersDir = opt('--chapters', join(root, 'apps/site/chapters'));

// Same patterns as apps/site/src/lib/citations.ts. MDX comments are stripped first so commented-out
// citations don't count as uses.
const CITE_RE = /<Cite\s+k="([^"]+)"/g;
const NOTEREF_RE = /<NoteRef\s+id="([^"]+)"/g;
const NOTEDEF_RE = /<NoteDef\s+id="([^"]+)"/g;
const stripComments = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

export function audit({ yamlText, chapters, release = false }) {
  const errors = [];
  const warnings = [];
  const refs = (parse(yamlText) ?? {}).references ?? {};
  const cited = new Map(); // key -> [chapter files]

  for (const { file, text } of chapters) {
    const body = stripComments(text);
    for (const [, k] of body.matchAll(CITE_RE)) {
      if (!cited.has(k)) cited.set(k, []);
      cited.get(k).push(file);
      if (!(k in refs)) errors.push(`${file}: cites "${k}", which is not in citations.yaml`);
    }
    const noteRefs = new Set([...body.matchAll(NOTEREF_RE)].map((m) => m[1]));
    const noteDefs = [...body.matchAll(NOTEDEF_RE)].map((m) => m[1]);
    const seen = new Set();
    for (const id of noteDefs) {
      if (seen.has(id)) errors.push(`${file}: note "${id}" is defined twice`);
      seen.add(id);
      if (!noteRefs.has(id)) errors.push(`${file}: note "${id}" refers to text that doesn't exist (no NoteRef)`);
    }
    for (const id of noteRefs) if (!seen.has(id)) errors.push(`${file}: NoteRef "${id}" has no NoteDef`);
  }

  for (const [key, r] of Object.entries(refs)) {
    if (!cited.has(key)) errors.push(`citations.yaml: "${key}" is never cited`);
    for (const f of ['authors', 'year', 'title']) if (r?.[f] == null || r[f] === '') errors.push(`citations.yaml: "${key}" is missing ${f}`);
    if (!r?.doi && !r?.url) warnings.push(`citations.yaml: "${key}" has neither doi nor url`);
    const v = r?.verified;
    if (!v?.by || !v?.on || !['metadata', 'claim'].includes(v?.scope)) {
      errors.push(`citations.yaml: "${key}" needs verified: { by, on, scope: metadata|claim }`);
    } else if (v.scope !== 'claim') {
      (release ? errors : warnings).push(`citations.yaml: "${key}" is verified for metadata only, not for the claim it supports`);
    }
    for (const [i, fig] of (r?.figures ?? []).entries()) {
      if (!fig?.page && !fig?.table) errors.push(`citations.yaml: "${key}" figure ${i + 1} (${fig?.value ?? '?'}) records no page or table`);
    }
  }
  return { errors, warnings, refCount: Object.keys(refs).length, citeCount: [...cited.values()].flat().length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const chapters = readdirSync(chaptersDir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => ({ file: f, text: readFileSync(join(chaptersDir, f), 'utf8') }));
  const { errors, warnings, refCount, citeCount } = audit({ yamlText: readFileSync(yamlPath, 'utf8'), chapters, release });
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  console.log(`citation audit: ${refCount} references, ${citeCount} citations in ${chapters.length} chapters, ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
}
