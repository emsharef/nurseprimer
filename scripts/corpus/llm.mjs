// Minimal Anthropic Messages API client for offline scripts. Reads ANTHROPIC_API_KEY from the repo's .env.
import { loadEnv } from '../lib/env.mjs';

loadEnv();

export async function complete({ model, system, user, maxTokens = 8000, temperature, history = [] }) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, ...(temperature == null ? {} : { temperature }), ...(system ? { system } : {}), messages: [...history, { role: 'user', content: user }] }),
    });
    if (res.ok) {
      const j = await res.json();
      return { text: j.content.filter((c) => c.type === 'text').map((c) => c.text).join(''), usage: j.usage, model: j.model };
    }
    const body = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${res.status} ${body.slice(0, 300)}`);
  }
}

export function parseJSONArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < 0) throw new Error('no JSON array in response');
  return JSON.parse(text.slice(start, end + 1));
}

export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}
