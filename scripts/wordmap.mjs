#!/usr/bin/env node
// Builds the Fifth Night's word map from the corpus, offline, into apps/site/public/data/wordmap.json.
//
// What it does, all with the code in packages/ml-core/src/embed.ts:
//   1. Reads the text of every message in apps/site/public/data/corpus.json (every split, but never a label).
//   2. Counts which words turn up within four words of each other (nearer counts more), for every word seen at
//      least three times; turns the counts into PPMI scores; squeezes each word's row down to 200 numbers with a
//      truncated SVD. Those 200 numbers are the word's position on the map.
//   3. Lays out a few hundred of the commonest words (plus some the chapter talks about) in two dimensions with
//      a seeded t-SNE, for the picture. The neighbour lists in the chapter come from the full 200 numbers.
// The widget trains its classifier in the browser from these positions and the training split's labels.
// Deterministic: same corpus, same file. Run: node scripts/wordmap.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildEmbedding, layout2d, tokenize } from '../packages/ml-core/src/index.ts';

export const SETTINGS = { window: 4, minCount: 3, dims: 200, seed: 1 };
const MAP_WORDS = 260;
// Little words left off the picture (they stay in the map and in Wick's reading).
const STOP = new Set(`a an the and or but so if of to in on at by for with from up as is are was were be been being am
  i im ive id me my mine you your yours he hes him his she shes her hers it its they theyre them their we our us this that
  these those there theres here what which who whom when where why how all any some no not do does did doing done
  have has had having can could would should will just very really too also only than then now still about into over
  out off again more most much bit lot like get got go going went one two s t ll d re ve m dont didnt cant wont isnt
  hasnt havent doesnt wasnt arent couldnt wouldnt shouldnt yeah ok okay oh hi hello`.split(/\s+/).filter(Boolean));
// Words the chapter talks about, placed on the picture even if they are rare.
const ALWAYS = ['speckles', 'specks', 'petechiae', 'blanching', 'pinprick', 'prick', 'bleeds', 'freckle', 'spots', 'dots',
  'purple', 'felt', 'tip', 'pen', 'pens', 'marks', 'blackcurrant', 'sent', 'app', 'myriverside', 'dark', 'skin', 'palms', 'soles', 'eyelids'];

// Importing this file (the chapter's tests read SETTINGS) must not rebuild the map.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const corpus = JSON.parse(readFileSync(`${root}apps/site/public/data/corpus.json`, 'utf8'));
  const texts = corpus.messages.map((m) => m.text);
  const t0 = Date.now();
  const emb = buildEmbedding(texts, SETTINGS);

  const freq = new Map();
  for (const t of texts) for (const w of new Set(tokenize(t))) freq.set(w, (freq.get(w) ?? 0) + 1);
  const common = emb.vocab
    .filter((w) => !STOP.has(w) && /\p{L}/u.test(w) && w.length > 1)
    .sort((a, b) => freq.get(b) - freq.get(a) || (a < b ? -1 : 1))
    .slice(0, MAP_WORDS);
  const words = [...new Set([...common, ...ALWAYS.filter((w) => emb.has(w))])];
  const xy = layout2d(words.map((w) => emb.vector(w)), { perplexity: 12, iterations: 1000, seed: 1 });
  // Scale the picture to [0, 1000] on its longer side.
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = 1000 / Math.max(x1 - x0, y1 - y0);
  const out = {
    about: 'Word positions built from the text of corpus.json by scripts/wordmap.mjs (co-occurrence, PPMI, truncated SVD; t-SNE for the picture). No labels used.',
    corpusVersion: corpus.version,
    settings: SETTINGS,
    messages: texts.length,
    embedding: emb.pack(),
    picture: {
      words,
      counts: words.map((w) => freq.get(w)),
      xy: xy.map(([x, y]) => [Math.round((x - x0) * k), Math.round((y - y0) * k)]),
    },
  };
  writeFileSync(`${root}apps/site/public/data/wordmap.json`, JSON.stringify(out));
  console.log(`word map: ${emb.vocab.length} words x ${SETTINGS.dims} numbers, ${words.length} on the picture, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
