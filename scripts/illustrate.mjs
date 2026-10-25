#!/usr/bin/env node
// Generates illustrations with Nano Banana (Gemini image models) from content/illustrations/manifest.yaml.
// Each entry: { id, prompt, refs: [ids of earlier images to pass as references], aspect: "16:9" | "1:1" | "3:4"... }
// Candidates are saved as content/illustrations/raw/<id>.<n>.png; a human (or the curating session) picks one
// and copies it to content/illustrations/<id>.png. Site-ready WebP files are made by `--publish`.
// Usage: node scripts/illustrate.mjs <id...> [--n 2]   |   node scripts/illustrate.mjs --publish
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const IMAGE_MODEL = 'gemini-nano-banana-2.1';
const root = fileURLToPath(new URL('..', import.meta.url));
const dir = root + 'content/illustrations/';
import { loadEnv } from './lib/env.mjs';
loadEnv();

// manifest.yaml holds the house style and shared images (character sheets, portraits, home); each night adds
// its own images in manifest.d/<chapter>.yaml (a list under `images:`), so builders don't collide.
const manifest = parse(readFileSync(dir + 'manifest.yaml', 'utf8'));
if (existsSync(dir + 'manifest.d')) {
  for (const f of readdirSync(dir + 'manifest.d').filter((f) => f.endsWith('.yaml')).sort()) {
    manifest.images.push(...(parse(readFileSync(dir + 'manifest.d/' + f, 'utf8')).images ?? []));
  }
}
const STYLE = manifest.style.trim();
const byId = new Map(manifest.images.map((i) => [i.id, i]));

async function generate(entry, n) {
  mkdirSync(dir + 'raw', { recursive: true });
  const parts = [];
  for (const ref of entry.refs ?? []) {
    const p = dir + ref + '.png';
    if (!existsSync(p)) throw new Error(`${entry.id}: reference ${ref} has not been chosen yet (${p})`);
    parts.push({ inline_data: { mime_type: 'image/png', data: readFileSync(p).toString('base64') } });
  }
  const refNote = entry.refs?.length
    ? `\n\nThe attached images are reference sheets for: ${entry.refs.join(', ')}. Keep those characters and objects exactly consistent with them (faces, hair, clothes, proportions, colours), and match their drawing style.`
    : '';
  parts.push({ text: `${STYLE}\n\n${entry.prompt.trim()}${refNote}` });
  const existing = readdirSync(dir + 'raw').filter((f) => f.startsWith(entry.id + '.')).length;
  for (let k = 1; k <= n; k++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: entry.aspect ?? '16:9' } },
      }),
    });
    const j = await res.json();
    if (!res.ok) { console.error(entry.id, res.status, JSON.stringify(j).slice(0, 400)); continue; }
    const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
    if (!img) { console.error(entry.id, 'no image in response', JSON.stringify(j).slice(0, 300)); continue; }
    const out = `${dir}raw/${entry.id}.${existing + k}.png`;
    writeFileSync(out, Buffer.from((img.inlineData ?? img.inline_data).data, 'base64'));
    console.log(out);
  }
}

async function publish() {
  const sharp = (await import('sharp')).default;
  const outDir = root + 'apps/site/public/illustrations/';
  mkdirSync(outDir, { recursive: true });
  const published = manifest.images.filter((e) => !e.id.startsWith('sheet-'));
  for (const e of published) {
    const src = dir + e.id + '.png';
    if (!existsSync(src)) continue;
    for (const w of [800, 1600]) {
      await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${outDir}${e.id}-${w}.webp`);
    }
  }
  const meta = Object.fromEntries(published.filter((e) => existsSync(dir + e.id + '.png')).map((e) => [e.id, { alt: e.alt ?? '', aspect: e.aspect ?? '16:9' }]));
  writeFileSync(outDir + 'index.json', JSON.stringify(meta, null, 1));
  console.log(`published ${Object.keys(meta).length} illustrations`);
}

const args = process.argv.slice(2);
if (args.includes('--publish')) await publish();
else {
  const n = args.includes('--n') ? +args[args.indexOf('--n') + 1] : 2;
  const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--n');
  await Promise.all(ids.map((id) => {
    const e = byId.get(id);
    if (!e) throw new Error(`no manifest entry ${id}`);
    return generate(e, n);
  }));
}
