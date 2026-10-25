// The pure parts of the GPT-2 wrapper (no download): odds at a temperature, sampling, the blocklist, sizes.
import { describe, expect, it } from 'vitest';
import { topK, sampleToken, blockedIds, BLOCKED_WORDS, GPT2, GPT2_DOWNLOAD_BYTES } from '../src/index.ts';

describe('topK', () => {
  const logits = [2, 1, 0, -1, -Infinity];
  it('turns scores into odds that sum to one, with the rest summed', () => {
    const d = topK(logits, 2, 1);
    expect(d.top.map((t) => t.id)).toEqual([0, 1]);
    const all = d.top.reduce((a, t) => a + t.p, 0) + d.rest;
    expect(all).toBeCloseTo(1, 12);
    const z = Math.exp(2) + Math.exp(1) + 1 + Math.exp(-1);
    expect(d.top[0].p).toBeCloseTo(Math.exp(2) / z, 12);
    expect(d.top.find((t) => t.id === 4)).toBeUndefined();
  });
  it('sharpens below 1, flattens above, and puts everything on the top at 0', () => {
    expect(topK(logits, 1, 0.5).top[0].p).toBeGreaterThan(topK(logits, 1, 1).top[0].p);
    expect(topK(logits, 1, 2).top[0].p).toBeLessThan(topK(logits, 1, 1).top[0].p);
    expect(topK(logits, 1, 0).top[0].p).toBe(1);
  });
});

describe('sampleToken', () => {
  it('takes the top score at temperature 0 and never picks a blocked (-Infinity) token', () => {
    expect(sampleToken([0, 3, 1], 0, 0.99)).toBe(1);
    for (let i = 0; i < 100; i++) expect(sampleToken([0, 0, -Infinity], 1, i / 100)).not.toBe(2);
  });
  it('picks in proportion to the odds', () => {
    let ones = 0;
    for (let i = 0; i < 1000; i++) if (sampleToken([0, Math.log(3)], 1, (i + 0.5) / 1000) === 1) ones++;
    expect(ones).toBe(750);
  });
});

describe('blocklist', () => {
  it('blocks every single-token spelling of each word', () => {
    expect(BLOCKED_WORDS.length).toBeGreaterThan(20);
    const vocab = new Map([['a', 1], [' ' + BLOCKED_WORDS[0], 7], [BLOCKED_WORDS[1], 9]]);
    const encode = (t: string) => (vocab.has(t) ? [vocab.get(t)!] : [1, 2]);
    expect(blockedIds(encode)).toEqual([7, 9]);
  });
});

describe('download size shown to the reader', () => {
  it('is about 136 MB, almost all of it the 8-bit model', () => {
    expect(GPT2_DOWNLOAD_BYTES / 1e6).toBeGreaterThan(135);
    expect(GPT2_DOWNLOAD_BYTES / 1e6).toBeLessThan(137);
    expect(GPT2.files['onnx/decoder_model_merged_quantized.onnx']).toBe(128_315_766);
  });
});
