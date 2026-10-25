#!/usr/bin/env node
// One version stamp (plan 9): every built page must carry the same <meta name="primer-version">.
// Usage: node scripts/version-check.mjs <dist dir>
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] ?? 'apps/site/dist';
const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.html')) pages.push(p);
  }
})(dist);

const stamps = new Map();
for (const p of pages) {
  const m = readFileSync(p, 'utf8').match(/<meta name="primer-version" content="([^"]+)"/);
  const v = m?.[1] ?? '(missing)';
  if (!stamps.has(v)) stamps.set(v, []);
  stamps.get(v).push(relative(dist, p));
}
if (stamps.size !== 1 || stamps.has('(missing)')) {
  console.error('version check: pages disagree on the edition stamp');
  for (const [v, ps] of stamps) console.error(`  ${v}: ${ps.join(', ')}`);
  process.exit(1);
}
console.log(`version check: ${pages.length} pages, all ${[...stamps.keys()][0]}`);
