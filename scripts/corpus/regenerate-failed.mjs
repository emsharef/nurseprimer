#!/usr/bin/env node
// Deletes generated text for messages that failed verification, so generate.mjs writes them again.
// Run: node regenerate-failed.mjs && node generate.mjs && node verify.mjs --redo-failed
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const gen = fileURLToPath(new URL('../../data/raw/gen/', import.meta.url));
const ver = fileURLToPath(new URL('../../data/raw/verify/', import.meta.url));
let n = 0;
for (const f of readdirSync(ver)) {
  const v = JSON.parse(readFileSync(ver + f, 'utf8'));
  if (!v.pass) { rmSync(gen + f, { force: true }); rmSync(ver + f); n++; }
}
console.log(`cleared ${n} failed messages for regeneration`);
