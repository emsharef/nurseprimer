#!/usr/bin/env node
// Frozen transcripts (plan 8.4): every demo that uses a big hosted model ships a recording, so the book works
// after models are retired and without any server. A spec in content/transcripts/specs/<id>.json says what to
// ask; the recording goes to content/transcripts/<id>.json with the model id and date.
//   spec: { "model": "claude-opus-5-5", "system": "...", "messages": [{"role":"user","content":"..."}],
//           "max_tokens": 800, "note": "what this demo shows" }
// Usage: node scripts/transcripts.mjs <id...> | --all   (re-recording prints the old and new outputs for review)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { complete } from './corpus/llm.mjs';

const dir = fileURLToPath(new URL('../content/transcripts/', import.meta.url));
const args = process.argv.slice(2);
const ids = args.includes('--all')
  ? readdirSync(dir + 'specs').filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
  : args;

for (const id of ids) {
  const spec = JSON.parse(readFileSync(`${dir}specs/${id}.json`, 'utf8'));
  const last = spec.messages.at(-1);
  if (last.role !== 'user') throw new Error(`${id}: the last message must be from the user`);
  const { text, usage, model } = await complete({
    model: spec.model,
    system: spec.system,
    user: last.content,
    maxTokens: spec.max_tokens ?? 800,
    history: spec.messages.slice(0, -1),
  });
  const out = `${dir}${id}.json`;
  if (existsSync(out)) {
    const old = JSON.parse(readFileSync(out, 'utf8'));
    if (old.output !== text) console.log(`--- ${id}: previous (${old.model}, ${old.recorded_at})\n${old.output}\n+++ new (${model})\n${text}\n`);
  }
  writeFileSync(out, JSON.stringify({ id, model: spec.model, model_reported: model, recorded_at: new Date().toISOString().slice(0, 10), note: spec.note ?? '', system: spec.system ?? null, messages: spec.messages, output: text, usage }, null, 2) + '\n');
  console.log(`recorded ${id} (${model}, ${usage.output_tokens} tokens)`);
}
