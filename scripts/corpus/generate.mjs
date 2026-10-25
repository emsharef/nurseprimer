#!/usr/bin/env node
// Writes message text for every seed (scripts/corpus/seeds.mjs) with an LLM. Resumable: results are cached
// per seed in data/raw/gen/. Usage: node scripts/corpus/generate.mjs [--limit N] [--split train]
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSeeds, CLINICS } from './seeds.mjs';
import { RED_FLAGS, BENIGN, NEGATABLE } from './guidance.mjs';
import { complete, parseJSONArray, pool } from './llm.mjs';

export const WRITER_MODEL = 'claude-opus-5-5';
const out = fileURLToPath(new URL('../../data/raw/gen/', import.meta.url));
mkdirSync(out, { recursive: true });

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? +args[args.indexOf('--limit') + 1] : Infinity;
const only = args.includes('--split') ? args[args.indexOf('--split') + 1] : null;

export const SYSTEM = `You write realistic, synthetic text messages that parents and carers send to an out-of-hours children's nurse line at night. They are for a teaching dataset about how AI classifiers work and fail. Each message is written from a "fact card": you must convey exactly the facts on the card, in the writer's own everyday words, and nothing else of medical significance.

Hard rules:
- Convey every PRESENT sign on the card, recognizably to a nurse, but in lay words (parents rarely use textbook terms unless the card says so).
- Convey every REASSURING line as the writer noting that this is fine (e.g. "her neck's fine, she can look down").
- Do NOT add any other symptom or detail that a nurse would treat as a warning sign (no breathing trouble, drowsiness, unusual cry, colour change, rash, fits, dehydration, neck stiffness, light sensitivity, etc.) unless it is on the card.
- Never name a diagnosis (no "meningitis", "sepsis"). The illness started within the last two days.
- If a temperature is on the card, state it (in °C, or "38.5" etc.); for babies, say the age clearly. If no temperature, don't mention one or say they feel a bit warm only if the card has no fever rules.
- Vary length, punctuation, openings and structure a lot across messages: real messages are messy, rarely start with "Hi" every time, often lack greetings, may be one line or a ramble. Avoid stock phrases and a uniform "LLM" register. Do not end messages with a question every time.
- Apply the style notes: writer, mood, dialect, code-switching language (mix in natural phrases from that language, keeping the medical facts understandable in English), voice-to-text (no punctuation, homophone errors, run-ons, misheard words), misspellings (real typing errors), hedges ("I think", "not sure if").
- "indirect" means describe the warning sign obliquely, the way a frightened parent would, without the expected key words, while still making it recognizable to a careful nurse.
- Never include real names of places or people; first names of the child are fine.
- Output only a JSON array: [{"id": "...", "text": "..."}], one object per card, same order.`;

function card(s) {
  const lines = [`id: ${s.id}`];
  const age = s.age_months < 24 ? `${s.age_months} months` : `${Math.floor(s.age_months / 12)} years`;
  lines.push(`child: ${s.style.child_sex}, ${age}`);
  lines.push(`temperature: ${s.temp_c == null ? 'none mentioned' : s.temp_c + '°C'}`);
  for (const f of s.flags) {
    let say = RED_FLAGS[f].say;
    if (f === 'nonblanching_rash' && s.style.rash_word) say += ` (the writer uses the term "${s.style.rash_word}")`;
    lines.push(`PRESENT warning sign: ${say}`);
  }
  if (s.style.darker_skin) lines.push('the child has dark brown or black skin; the writer mentions checking paler areas (palms, soles, inside the eyelids or mouth) to see it');
  for (const b of s.benign) lines.push(`also: ${BENIGN[b]}`);
  for (const n of s.negated) lines.push(`REASSURING (the writer says this is fine): ${NEGATABLE[n]}`);
  if (s.mimic) lines.push(`harmless thing that sounds alarming: ${s.mimic} (make clear it is harmless, without saying "harmless")`);
  lines.push(`writer: ${s.style.writer}; mood: ${s.style.mood}`);
  const st = [];
  for (const p of s.phenomena) {
    if (p === 'dialect') st.push(`written in ${s.style.dialect}`);
    else if (p === 'code_switching') st.push(`code-switches with ${s.style.language}`);
    else if (['misspelling', 'hedge', 'voice_transcription', 'short', 'long', 'indirect'].includes(p)) st.push(p.replace('_', '-'));
  }
  if (st.length) lines.push(`style: ${st.join(', ')}`);
  return lines.join('\n');
}

async function main() {
  let seeds = buildSeeds().filter((s) => (!only || s.split === only) && !existsSync(out + s.id + '.json'));
  seeds = seeds.slice(0, limit);
  const batches = [];
  for (let i = 0; i < seeds.length; i += 10) batches.push(seeds.slice(i, i + 10));
  console.log(`generating ${seeds.length} messages in ${batches.length} batches`);
  let done = 0, tokens = 0;
  await pool(batches, 8, async (batch) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { text, usage, model } = await complete({
          model: WRITER_MODEL, system: SYSTEM, temperature: 1,
          user: `Write one message for each fact card.\n\n${batch.map(card).join('\n\n---\n\n')}`,
        });
        const arr = parseJSONArray(text);
        const byId = new Map(arr.map((x) => [x.id, x.text]));
        for (const s of batch) {
          const t = byId.get(s.id);
          if (!t) continue;
          writeFileSync(out + s.id + '.json', JSON.stringify({ id: s.id, text: t, model, at: new Date().toISOString() }));
        }
        tokens += usage.output_tokens;
        done += batch.length;
        if (done % 100 < 10) console.log(`${done}/${seeds.length} (${tokens} output tokens)`);
        return;
      } catch (e) {
        console.error(`batch ${batch[0].id}: ${e.message}`);
      }
    }
  });
  console.log(`done: ${done}, output tokens ${tokens}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
