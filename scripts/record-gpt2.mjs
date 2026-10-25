#!/usr/bin/env node
// Records what GPT-2 small says for the Sixth Night's examples, with the same wrapper the browser widget uses
// (packages/models-browser/src/gpt2.ts), run here under Node (onnxruntime-node instead of the browser's
// WebAssembly build; the numbers agree to within rounding). The book shows this recording to readers who have
// not downloaded the model, and the tests check the prose against it.
// Usage: node scripts/record-gpt2.mjs   (downloads ~130 MB on first run; cached afterwards)
import { writeFileSync } from 'node:fs';
import { env } from '@huggingface/transformers';
import { GPT2, loadGpt2, topK, sampleToken } from '../packages/models-browser/src/gpt2.ts';
import { seededRandom } from '../packages/ml-core/src/ngram.ts';
import { NIGHT6 } from '../apps/site/components/widgets/next-word/examples.ts';

if (process.env.HF_CACHE) env.cacheDir = process.env.HF_CACHE;
const out = new URL('../content/transcripts/gpt2-next-word.json', import.meta.url);
const TEMPS = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const K = 10;

const m = await loadGpt2(undefined, 'cpu');
const round = (p) => Math.round(p * 1e5) / 1e5;
const dist = async (text) => {
  const { ids, pieces } = m.tokenize(text);
  const logits = await m.logits(ids);
  const byTemp = {};
  for (const t of TEMPS) {
    const d = topK(logits, K, t, m.piece);
    byTemp[t] = { top: d.top.map(({ id, piece, p }) => ({ id, piece, p: round(p) })), rest: round(d.rest) };
  }
  return { ids, pieces, logits, byTemp };
};

const tokens = NIGHT6.tokenTexts.map((text) => ({ text, ...m.tokenize(text) }));

const next = [];
for (const prompt of NIGHT6.gpt2Starts) {
  const d = await dist(prompt);
  next.push({ prompt, pieces: d.pieces, temps: d.byTemp });
}

async function generate(prompt, temperature, seed, maxTokens) {
  const rng = seededRandom(seed);
  const ids = [...m.tokenize(prompt).ids];
  const added = [];
  for (let i = 0; i < maxTokens; i++) {
    const logits = await m.logits(ids);
    const id = sampleToken(logits, temperature, rng());
    if (id === 50256) break; // <|endoftext|>
    ids.push(id);
    added.push(id);
  }
  return { prompt, temperature, seed, pieces: added.map(m.piece), text: added.map(m.piece).join('') };
}

// EXPLORE=20-35 samples the Prologue message with those seeds and prints them, without writing anything
// (for choosing which seeds the book records).
if (process.env.EXPLORE) {
  const [a, b] = process.env.EXPLORE.split('-').map(Number);
  for (let s = a; s <= b; s++) {
    const c = await generate(NIGHT6.prologue, 0.8, s, 40);
    console.log(`[seed ${s}] ${c.text.replace(/\n/g, ' / ')}`);
  }
  process.exit(0);
}

const continuations = [];
for (const c of NIGHT6.gpt2Continuations) continuations.push(await generate(c.prompt, c.temperature, c.seed, c.maxTokens));

writeFileSync(
  out,
  JSON.stringify(
    {
      model: GPT2.id,
      revision: GPT2.revision,
      dtype: GPT2.dtype,
      file: `onnx/${GPT2.modelFile}_quantized.onnx`,
      library: GPT2.library,
      runtime: 'onnxruntime-node (Node.js), via scripts/record-gpt2.mjs',
      recorded_at: new Date().toISOString().slice(0, 10),
      note: 'GPT-2 small, as the Sixth Night runs it in the browser. Probabilities rounded to 5 decimal places; "rest" is everything outside the top 10.',
      tokens,
      next,
      continuations,
    },
    null,
    1,
  ) + '\n',
);
console.log(`wrote ${out.pathname}`);
for (const c of continuations) console.log(`\n[T=${c.temperature} seed=${c.seed}] ${c.prompt}\n=> ${c.text}`);
for (const n of next) console.log(`\n${n.prompt} -> ${n.temps[1].top.slice(0, 6).map((t) => `${JSON.stringify(t.piece)} ${(t.p * 100).toFixed(1)}%`).join(', ')} | rest ${(n.temps[1].rest * 100).toFixed(1)}%`);
for (const t of tokens) console.log(t.pieces.map((p) => JSON.stringify(p)).join(' '));
