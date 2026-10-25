#!/usr/bin/env node
// Trains the Sixth Night's character model exactly as the browser does (same code, same seed: the training is
// bit-for-bit deterministic), and saves the precomputed checkpoints the widget offers: the end of the live run
// (for devices too slow to train it in reasonable time) and a much longer run.
// Usage: node scripts/train-wick-voice.mjs [--long 100000]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CharModel, CharTrainer, encodeCorpus, CHAR_MODEL } from '../packages/ml-core/src/charmodel.ts';
import { seededRandom } from '../packages/ml-core/src/ngram.ts';
import { VOICE, isSampleStep, sampleSeed } from '../apps/site/components/widgets/next-word/voice.ts';

const i = process.argv.indexOf('--long');
const long = i > 0 ? Number(process.argv[i + 1]) : VOICE.longSteps;
const corpus = JSON.parse(readFileSync(new URL('../apps/site/public/data/corpus.json', import.meta.url), 'utf8'));
const texts = (s) => corpus.messages.filter((m) => m.split === s).map((m) => m.text);
const train = encodeCorpus(texts('train'));
const day = encodeCorpus(texts('day'));
const outDir = new URL('../apps/site/public/data/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const model = new CharModel(CHAR_MODEL);
const t = new CharTrainer(train, model);
const t0 = performance.now();
const report = (s) => {
  const { accuracy, loss } = CharTrainer.evaluate(model, day, VOICE.evalPositions);
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(`${s} (${secs}s) first guess right ${(accuracy * 100).toFixed(1)}%, loss ${loss.toFixed(3)}: ${JSON.stringify(model.sample('', VOICE.sampleChars, seededRandom(sampleSeed(s)), VOICE.temperature))}`);
};
const save = (steps) => {
  const file = new URL(`wick-voice-${steps}.bin`, outDir);
  writeFileSync(file, Buffer.from(model.params.buffer.slice(0)));
  console.log(`saved ${file.pathname} (${model.params.byteLength} bytes)`);
};
// --verify: retrain the live run and check it matches the shipped checkpoint bit for bit (about a minute).
if (process.argv.includes('--verify')) {
  for (let s = 1; s <= VOICE.steps; s++) t.train();
  const shipped = readFileSync(new URL(`wick-voice-${VOICE.steps}.bin`, outDir));
  const same = Buffer.compare(shipped, Buffer.from(model.params.buffer.slice(0))) === 0;
  console.log(same ? `checkpoint matches a fresh ${VOICE.steps}-step run exactly` : 'MISMATCH: the checkpoint is stale');
  process.exit(same ? 0 : 1);
}
report(0);
for (let s = 1; s <= long; s++) {
  t.train();
  if ((s <= VOICE.steps && isSampleStep(s)) || s % 10000 === 0) report(s);
  if (s === VOICE.steps || s === long) save(s);
}
