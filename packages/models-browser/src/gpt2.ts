// GPT-2 small (OpenAI, 2019) running in the reader's browser through transformers.js and ONNX Runtime Web.
// Nothing is downloaded until loadGpt2() is called; the library itself is imported lazily too. The files are
// cached by the browser (Cache API), so a second visit loads from disk.
//
// Model: Xenova/gpt2, an ONNX export of openai-community/gpt2 (MIT licence), 8-bit quantized
// (onnx/decoder_model_merged_quantized.onnx), pinned to one repository revision so the book's recorded
// examples stay reproducible.

export const GPT2 = {
  id: 'Xenova/gpt2',
  revision: 'bf2c7f02e0b826c60d03af341171bde20893da66',
  dtype: 'q8',
  modelFile: 'decoder_model_merged',
  /** Bytes as listed by the Hugging Face API for that revision (checked 2026-10-25). */
  files: {
    'onnx/decoder_model_merged_quantized.onnx': 128_315_766,
    'tokenizer.json': 2_107_653,
    'config.json': 884,
    'tokenizer_config.json': 234,
    'generation_config.json': 124,
  } as Record<string, number>,
  /** ONNX Runtime Web's WebAssembly engine, fetched from jsDelivr: 26.9 MB, about 5.5 MB compressed in transit. */
  runtimeBytes: 5_547_312,
  library: '@huggingface/transformers 4.3.1',
  parameters: '124 million',
  vocabulary: 50_257,
  contextTokens: 1024,
} as const;

/** Total download the reader is told about before pressing the button. */
export const GPT2_DOWNLOAD_BYTES = Object.values(GPT2.files).reduce((a, b) => a + b, 0) + GPT2.runtimeBytes;

export const megabytes = (b: number) => `${Math.round(b / 1e6)} MB`;

export interface TopToken {
  id: number;
  piece: string;
  p: number;
}

export interface NextTokens {
  top: TopToken[];
  /** Probability shared by every token not in `top`. */
  rest: number;
  /** How many tokens the model chose between (the vocabulary size). */
  vocabulary: number;
}

/**
 * Turns raw scores (logits) into probabilities at a temperature, and returns the `k` likeliest with the rest
 * summed. Temperature 0 means "always the top choice" (all probability on the largest score).
 */
export function topK(logits: ArrayLike<number>, k: number, temperature: number, piece: (id: number) => string = String): NextTokens {
  const n = logits.length;
  let max = -Infinity, arg = 0;
  for (let i = 0; i < n; i++) if (logits[i] > max) { max = logits[i]; arg = i; }
  const p = new Float64Array(n);
  if (temperature <= 0) p[arg] = 1;
  else {
    let s = 0;
    for (let i = 0; i < n; i++) s += p[i] = Math.exp((logits[i] - max) / temperature);
    for (let i = 0; i < n; i++) p[i] /= s;
  }
  const idx = Array.from({ length: n }, (_, i) => i);
  // Partial selection is plenty fast for 50k entries.
  idx.sort((a, b) => p[b] - p[a] || logits[b] - logits[a]);
  const top = idx.slice(0, k).map((id) => ({ id, piece: piece(id), p: p[id] }));
  const rest = Math.max(0, 1 - top.reduce((a, t) => a + t.p, 0));
  return { top, rest, vocabulary: n };
}

/** Picks a token from logits at a temperature, given a uniform random number `r` in [0, 1). */
export function sampleToken(logits: ArrayLike<number>, temperature: number, r: number): number {
  const n = logits.length;
  let max = -Infinity, arg = 0;
  for (let i = 0; i < n; i++) if (logits[i] > max) { max = logits[i]; arg = i; }
  if (temperature <= 0) return arg;
  const e = new Float64Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) s += e[i] = Math.exp((logits[i] - max) / temperature);
  let t = r * s;
  for (let i = 0; i < n; i++) if ((t -= e[i]) < 0) return i;
  return arg;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  file?: string;
}

export interface Gpt2 {
  /** Token ids and the text piece each one stands for. */
  tokenize(text: string): { ids: number[]; pieces: string[] };
  piece(id: number): string;
  /** How many tokens are blocked (see BLOCKED_WORDS). */
  blocked: number;
  /** Raw next-token scores after `ids` (the last 1,024 of them), with blocked tokens set to -Infinity. */
  logits(ids: number[]): Promise<Float32Array>;
}

/** Downloads (or loads from cache) GPT-2 small and its tokenizer. */
export async function loadGpt2(onProgress?: (p: LoadProgress) => void, device: 'wasm' | 'webgpu' | 'cpu' = 'wasm'): Promise<Gpt2> {
  const { AutoTokenizer, AutoModelForCausalLM, Tensor } = await import('@huggingface/transformers');
  const seen: Record<string, number> = {};
  const total = GPT2_DOWNLOAD_BYTES - GPT2.runtimeBytes;
  const progress_callback = (info: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (info.status !== 'progress' || !info.file) return;
    seen[info.file] = info.loaded ?? 0;
    onProgress?.({ loaded: Object.values(seen).reduce((a, b) => a + b, 0), total, file: info.file });
  };
  const opts = { revision: GPT2.revision, progress_callback };
  const tokenizer = await AutoTokenizer.from_pretrained(GPT2.id, opts);
  const model = await AutoModelForCausalLM.from_pretrained(GPT2.id, {
    ...opts,
    dtype: GPT2.dtype,
    device,
    model_file_name: GPT2.modelFile,
  });
  const piece = (id: number) => tokenizer.decode([id], { clean_up_tokenization_spaces: false });
  const blocked = blockedIds((t) => (tokenizer.encode(t) as number[]).map(Number));
  return {
    piece,
    blocked: blocked.length,
    tokenize(text: string) {
      const ids = (tokenizer.encode(text) as number[]).map(Number);
      return { ids, pieces: ids.map(piece) };
    },
    async logits(all: number[]) {
      const ids = all.slice(-GPT2.contextTokens);
      const n = ids.length;
      const input_ids = new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, n]);
      const attention_mask = new Tensor('int64', new BigInt64Array(n).fill(1n), [1, n]);
      const out = await (model as unknown as (x: object) => Promise<{ logits: { data: Float32Array; dims: number[] } }>)({ input_ids, attention_mask });
      const v = out.logits.dims[2];
      const last = out.logits.data.slice((n - 1) * v, n * v);
      for (const id of blocked) last[id] = -Infinity;
      return last;
    },
  };
}

// GPT-2 learned from millions of web pages and will sometimes print swear words or slurs. The widget blocks a
// short list of them (each spelling that is a single token, with or without a leading space or capital).
// Stored in ROT13 so the source doesn't read as a list of insults. Everything else is GPT-2 unfiltered.
const BLOCKED_ROT13 = [
  'shpx', 'shpxvat', 'shpxrq', 'fuvg', 'fuvgf', 'phag', 'ovgpu', 'onfgneq', 'qvpx', 'pbpx', 'cvff', 'jnax', 'jnaxre',
  'gjng', 'fyhg', 'juber', 'snttbg', 'ergneq', 'ergneqrq', 'avttre', 'avttn', 'fcvp', 'puvax', 'xvxr', 'cnxv',
  'cbea', 'fcnfgvp', 'nefr', 'nffubyr', 'ohyyfuvg',
];
const rot13 = (s: string) => s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
export const BLOCKED_WORDS = BLOCKED_ROT13.map(rot13);

/** Token ids of the blocked words, for every spelling that is a single GPT-2 token. */
export function blockedIds(encode: (text: string) => number[]): number[] {
  const ids = new Set<number>();
  for (const w of BLOCKED_WORDS) {
    const cap = w[0].toUpperCase() + w.slice(1);
    for (const v of [w, ' ' + w, cap, ' ' + cap, w.toUpperCase(), ' ' + w.toUpperCase()]) {
      const t = encode(v);
      if (t.length === 1) ids.add(t[0]);
    }
  }
  return [...ids].sort((a, b) => a - b);
}
