#!/usr/bin/env node
// Fails when a chapter refers to an illustration that hasn't been published (public/illustrations/index.json),
// or a Night Note portrait is missing. Pictures failing silently is how the first portraits went missing.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const site = join(root, 'apps/site');
const index = JSON.parse(readFileSync(join(site, 'public/illustrations/index.json'), 'utf8'));
const errors = [];
const chapters = readdirSync(join(site, 'chapters')).filter((f) => f.endsWith('.mdx'));
for (const f of chapters) {
  const text = readFileSync(join(site, 'chapters', f), 'utf8');
  const ids = [...text.matchAll(/<Plate\s+id="([^"]+)"/g)].map((m) => m[1]);
  const fm = text.match(/^plate:\s*(\S+)/m);
  if (fm) ids.push(fm[1]);
  for (const id of ids) if (!index[id]) errors.push(`${f}: illustration "${id}" is not published`);
  if (/<Line\s+who=/.test(text)) {
    for (const p of ['portrait-you', 'portrait-bea', 'portrait-wick']) {
      if (!existsSync(join(site, 'public/illustrations', `${p}-800.webp`))) errors.push(`${f}: portrait ${p} is missing`);
    }
  }
}
for (const [id, m] of Object.entries(index)) if (!m.alt) errors.push(`illustration "${id}" has no alt text`);
for (const e of errors) console.error(`error: ${e}`);
console.log(`content check: ${chapters.length} chapters, ${Object.keys(index).length} illustrations, ${errors.length} errors`);
process.exit(errors.length ? 1 : 0);
