#!/usr/bin/env node
// Records Lyceum's speaking tube (a real large model) judging every test message on the Ward Board, so the
// Twelfth Night can put it on the board next to the reader's Wicks. Frozen like every hosted-model demo.
// Output: content/transcripts/lyceum-board-<model>.json  { model, recorded_at, system, results: { id: {label, p} } }
// Usage: node scripts/lyceum-board.mjs [model]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { complete, parseJSONArray, pool } from './corpus/llm.mjs';

const model = process.argv[2] ?? 'claude-opus-5-5';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}content/transcripts/lyceum-board-${model}.json`;
const corpus = JSON.parse(readFileSync(root + 'apps/site/public/data/corpus.json', 'utf8'));
const tests = corpus.messages.filter((m) => m.split !== 'train');
const prev = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
const results = prev?.results ?? {};

const SYSTEM = `You triage messages sent overnight by parents and carers to a children's nurse message line in the UK, following NHS public guidance. For each message decide: "urgent" (the child needs emergency care or urgent medical advice tonight) or "can_wait" (home care or a routine appointment is appropriate). Also give your probability, from 0 to 1, that the message is urgent. Judge only from the message. Output only a JSON array: [{"id": "...", "label": "urgent" | "can_wait", "p": 0.0-1.0}], one per message, same order.`;

const todo = tests.filter((m) => !results[m.id]);
const batches = [];
for (let i = 0; i < todo.length; i += 20) batches.push(todo.slice(i, i + 20));
console.log(`${model}: judging ${todo.length} messages in ${batches.length} batches`);
await pool(batches, 6, async (batch) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { text } = await complete({ model, system: SYSTEM, maxTokens: 3000, user: batch.map((m) => `id: ${m.id}\nmessage:\n${m.text}`).join('\n\n---\n\n') });
      for (const r of parseJSONArray(text)) if (r.id && (r.label === 'urgent' || r.label === 'can_wait')) results[r.id] = { label: r.label, p: Math.max(0, Math.min(1, +r.p)) };
      return;
    } catch (e) { console.error(batch[0].id, e.message); }
  }
});
writeFileSync(out, JSON.stringify({ model, recorded_at: new Date().toISOString().slice(0, 10), system: SYSTEM, results }, null, 1) + '\n');
const done = tests.filter((m) => results[m.id]);
for (const split of ['day', 'night', 'two_am']) {
  const ms = done.filter((m) => m.split === split);
  const right = ms.filter((m) => results[m.id].label === m.label).length;
  const missed = ms.filter((m) => m.label === 'urgent' && results[m.id].label === 'can_wait').length;
  const esc = ms.filter((m) => m.label === 'can_wait' && results[m.id].label === 'urgent').length;
  console.log(`${split}: ${right}/${ms.length} right (${(100 * right / ms.length).toFixed(1)}%), missed ${missed}, needless ${esc}`);
}
