// Trains Wick's character model off the main thread, so the page stays responsive. Works in slices of about
// 40 ms and yields between them, so "pause" and other messages are handled promptly.
import { CharModel, CharTrainer, CHAR_MODEL, encodeCorpus, seededRandom, normalizeChars } from '@primer/ml-core';
import { VOICE, isSampleStep, sampleSeed, type VoiceIn, type VoiceOut } from './voice.ts';

const post = (m: VoiceOut) => (self as unknown as Worker).postMessage(m);
let trainer: CharTrainer | null = null;
let model = new CharModel(CHAR_MODEL);
let day: Uint8Array | null = null;
let running = false;
let temperature: number = VOICE.temperature;
let slowdown = 1;

function sample(step: number) {
  const { loss, accuracy } = CharTrainer.evaluate(model, day!, VOICE.evalPositions);
  const text = model.sample('', VOICE.sampleChars, seededRandom(sampleSeed(step)), temperature);
  post({ type: 'sample', step, text, accuracy, loss });
}

async function loop() {
  const t = trainer!;
  let lastReport = performance.now();
  const started = performance.now(), startStep = t.step;
  while (running && t.step < VOICE.steps) {
    const sliceEnd = performance.now() + 40;
    while (performance.now() < sliceEnd && t.step < VOICE.steps) {
      t.train();
      if (isSampleStep(t.step)) sample(t.step);
    }
    const now = performance.now();
    if (now - lastReport > 100) {
      post({ type: 'progress', step: t.step, stepsPerSecond: ((t.step - startStep) * 1000) / (now - started) });
      lastReport = now;
    }
    await new Promise((r) => setTimeout(r, 40 * (slowdown - 1)));
  }
  if (t.step >= VOICE.steps) {
    running = false;
    post({ type: 'progress', step: t.step, stepsPerSecond: ((t.step - startStep) * 1000) / (performance.now() - started) });
    post({ type: 'done', step: t.step, precomputed: false });
  }
}

self.onmessage = async (e: MessageEvent<VoiceIn>) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      day = encodeCorpus(m.day);
      model = new CharModel(CHAR_MODEL);
      trainer = new CharTrainer(encodeCorpus(m.train), model);
      sample(0);
    } else if (m.type === 'run') {
      if (!trainer || running) return;
      running = true;
      loop();
    } else if (m.type === 'throttle') {
      slowdown = Math.max(1, m.factor);
    } else if (m.type === 'pause') {
      running = false;
    } else if (m.type === 'temperature') {
      temperature = m.value;
    } else if (m.type === 'load') {
      running = false;
      const r = await fetch(m.url);
      if (!r.ok) throw new Error(`The precomputed Wick did not load (${r.status}).`);
      const buf = await r.arrayBuffer();
      model = new CharModel(CHAR_MODEL, new Float64Array(buf));
      trainer = null;
      sample(m.step);
      post({ type: 'done', step: m.step, precomputed: true });
    } else if (m.type === 'continue') {
      const text = model.sample(m.prefix, m.chars, seededRandom(m.seed), temperature);
      const all = normalizeChars(m.prefix) + text;
      post({ type: 'continued', id: m.id, text, window: all.slice(-CHAR_MODEL.context) });
    }
  } catch (err) {
    post({ type: 'error', message: (err as Error).message });
  }
};
