#!/usr/bin/env node
// Builds data/messages.jsonl (the corpus of record) and apps/site/public/data/corpus.json (what the browser
// loads) from seeds + generated text + verification. Only verified messages are included. Prints stats and
// rewrites the stats block in data/datacard.md.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSeeds, RIVERSIDE_SIGNATURE, CLINICS } from './seeds.mjs';
import { GUIDANCE_VERSION } from './guidance.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const gen = root + 'data/raw/gen/';
const ver = root + 'data/raw/verify/';

const rows = [];
let missing = 0, failed = 0;
for (const s of buildSeeds()) {
  if (!existsSync(gen + s.id + '.json') || !existsSync(ver + s.id + '.json')) { missing++; continue; }
  const v = JSON.parse(readFileSync(ver + s.id + '.json', 'utf8'));
  if (!v.pass) { failed++; continue; }
  const g = JSON.parse(readFileSync(gen + s.id + '.json', 'utf8'));
  let text = g.text.trim();
  if (s.signature) text += `\n\n${RIVERSIDE_SIGNATURE}`;
  rows.push({
    id: s.id, text, label: s.label, split: s.split, clinic: s.clinic, phenomena: s.phenomena,
    source: 'synthetic', reviewed_by: null, guidance_version: GUIDANCE_VERSION,
    facts: { age_months: s.age_months, temp_c: s.temp_c, signs: s.flags, infant_fever_rule: s.infant_fever_rule, denied: s.negated, other: s.benign, mimic: s.mimic },
    generator: g.model,
  });
}

writeFileSync(root + 'data/messages.jsonl', rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
mkdirSync(root + 'apps/site/public/data', { recursive: true });
const web = {
  version: 'draft-1',
  status: 'PENDING CLINICAL REVIEW',
  guidance: GUIDANCE_VERSION,
  messages: rows.map((r) => ({ id: r.id, text: r.text, label: r.label, split: r.split, clinic: r.clinic, phenomena: r.phenomena })),
};
writeFileSync(root + 'apps/site/public/data/corpus.json', JSON.stringify(web));

// Stats
const splits = ['train', 'day', 'night', 'two_am'];
const count = (f) => rows.filter(f).length;
const lines = [];
lines.push(`| Split | Messages | Urgent | Can wait | Urgent share |`, `|---|---|---|---|---|`);
for (const sp of splits) {
  const n = count((r) => r.split === sp), u = count((r) => r.split === sp && r.label === 'urgent');
  lines.push(`| ${sp} | ${n} | ${u} | ${n - u} | ${n ? Math.round((100 * u) / n) : 0}% |`);
}
lines.push('', `| Clinic | Splits | Messages | Urgent share | With app signature |`, `|---|---|---|---|---|`);
for (const [k, c] of Object.entries(CLINICS)) {
  const n = count((r) => r.clinic === k), u = count((r) => r.clinic === k && r.label === 'urgent');
  const sig = count((r) => r.clinic === k && r.phenomena.includes('app_signature'));
  lines.push(`| ${c.name} | ${c.splits.join(', ')} | ${n} | ${n ? Math.round((100 * u) / n) : 0}% | ${sig} |`);
}
const ph = {};
for (const r of rows) for (const p of r.phenomena) ph[p] = (ph[p] ?? 0) + 1;
lines.push('', `| Phenomenon | Messages |`, `|---|---|`);
for (const [p, n] of Object.entries(ph).sort((a, b) => b[1] - a[1])) lines.push(`| ${p} | ${n} |`);
lines.push('', `Seeds: ${buildSeeds().length}. Included: ${rows.length}. Failed verification and dropped: ${failed}. Not generated: ${missing}.`);
const stats = lines.join('\n');
console.log(stats);

const card = root + 'data/datacard.md';
if (existsSync(card)) {
  const md = readFileSync(card, 'utf8');
  const next = md.replace(/<!-- stats:start -->[\s\S]*<!-- stats:end -->/, `<!-- stats:start -->\n${stats}\n<!-- stats:end -->`);
  writeFileSync(card, next);
}
