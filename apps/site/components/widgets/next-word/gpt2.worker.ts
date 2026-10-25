// Runs GPT-2 small off the main thread. Nothing is downloaded until the page sends "load".
import { loadGpt2, topK, sampleToken, type Gpt2 } from '@primer/models-browser';

export type Gpt2In =
  | { type: 'load' }
  | { type: 'tokenize'; id: number; text: string }
  | { type: 'next'; id: number; ids: number[]; temperature: number; k: number }
  | { type: 'sample'; id: number; ids: number[]; temperature: number; r: number };

export type Gpt2Out =
  | { type: 'progress'; loaded: number; total: number }
  | { type: 'ready'; blocked: number }
  | { type: 'tokens'; id: number; ids: number[]; pieces: string[] }
  | { type: 'next'; id: number; top: { id: number; piece: string; p: number }[]; rest: number; ms: number }
  | { type: 'sampled'; id: number; token: number; piece: string; ms: number }
  | { type: 'error'; message: string; id?: number };

const post = (m: Gpt2Out) => (self as unknown as Worker).postMessage(m);
let model: Gpt2 | null = null;
let cache: { key: string; logits: Float32Array } | null = null;

async function logitsFor(ids: number[]) {
  const key = ids.join(',');
  if (cache?.key !== key) cache = { key, logits: await model!.logits(ids) };
  return cache.logits;
}

self.onmessage = async (e: MessageEvent<Gpt2In>) => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      if (model) return post({ type: 'ready', blocked: model.blocked });
      model = await loadGpt2((p) => post({ type: 'progress', loaded: p.loaded, total: p.total }));
      post({ type: 'ready', blocked: model.blocked });
    } else if (!model) {
      post({ type: 'error', message: 'GPT-2 is not loaded yet.', id: 'id' in m ? m.id : undefined });
    } else if (m.type === 'tokenize') {
      post({ type: 'tokens', id: m.id, ...model.tokenize(m.text) });
    } else if (m.type === 'next') {
      const t0 = performance.now();
      const d = topK(await logitsFor(m.ids), m.k, m.temperature, model.piece);
      post({ type: 'next', id: m.id, top: d.top, rest: d.rest, ms: performance.now() - t0 });
    } else if (m.type === 'sample') {
      const t0 = performance.now();
      const token = sampleToken(await logitsFor(m.ids), m.temperature, m.r);
      post({ type: 'sampled', id: m.id, token, piece: model.piece(token), ms: performance.now() - t0 });
    }
  } catch (err) {
    post({ type: 'error', message: (err as Error).message ?? String(err), id: 'id' in m ? m.id : undefined });
  }
};
