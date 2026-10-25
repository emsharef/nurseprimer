#!/usr/bin/env node
// Blind check of every generated message. A different model reads each message WITHOUT its seed, lists the
// warning signs present and denied, and labels it. A message passes only if the signs it finds match the seed's
// and its label matches the seed's label. Results cached in data/raw/verify/.
// Usage: node scripts/corpus/verify.mjs [--redo-failed]
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSeeds } from './seeds.mjs';
import { RED_FLAGS, infantFeverUrgent } from './guidance.mjs';
import { complete, parseJSONArray, pool } from './llm.mjs';

export const VERIFIER_MODEL = 'claude-sonnet-5-5';
const gen = fileURLToPath(new URL('../../data/raw/gen/', import.meta.url));
const out = fileURLToPath(new URL('../../data/raw/verify/', import.meta.url));
mkdirSync(out, { recursive: true });

const SYSTEM = `You are a careful paediatric triage nurse auditing synthetic messages for a teaching dataset. For each message, decide which of these warning signs the message says are PRESENT in the child, and which it explicitly says are ABSENT. Only count what the text actually conveys; a sign described indirectly but recognizably counts as present.

Warning signs (key: meaning):
${Object.entries(RED_FLAGS).map(([k, f]) => `- ${k}: ${f.say}`).join('\n')}
- infant_fever: a baby under 3 months with a temperature of 38°C or more, or a baby aged 3-6 months with 39°C or more

Then label the message: "urgent" if any warning sign is present, else "can_wait". Also flag "other_concern" if the message contains anything else a nurse would treat as needing urgent attention that is not in the list (e.g. illness for 5+ days with high fever, a head injury with vomiting or drowsiness, a swallowed battery), or "unclear" if the message is too garbled to triage.

Output only a JSON array: [{"id": "...", "present": [keys], "absent": [keys], "label": "urgent"|"can_wait", "other_concern": null or "short reason", "unclear": false}]`;

async function main() {
  const redo = process.argv.includes('--redo-failed');
  const seeds = new Map(buildSeeds().map((s) => [s.id, s]));
  const ids = readdirSync(gen).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
    .filter((id) => !existsSync(out + id + '.json') || (redo && !JSON.parse(readFileSync(out + id + '.json', 'utf8')).pass));
  const batches = [];
  for (let i = 0; i < ids.length; i += 15) batches.push(ids.slice(i, i + 15));
  console.log(`verifying ${ids.length} messages`);
  let pass = 0, fail = 0;
  await pool(batches, 6, async (batch) => {
    const items = batch.map((id) => ({ id, text: JSON.parse(readFileSync(gen + id + '.json', 'utf8')).text }));
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { text } = await complete({
          model: VERIFIER_MODEL, system: SYSTEM,
          user: items.map((x) => `id: ${x.id}\nmessage:\n${x.text}`).join('\n\n---\n\n'),
        });
        const res = new Map(parseJSONArray(text).map((r) => [r.id, r]));
        for (const { id } of items) {
          const r = res.get(id);
          if (!r) continue;
          const s = seeds.get(id);
          const want = new Set([...s.flags, ...(infantFeverUrgent(s.age_months, s.temp_c) ? ['infant_fever'] : [])]);
          const got = new Set(r.present ?? []);
          const problems = [];
          for (const k of want) if (!got.has(k)) problems.push(`missing ${k}`);
          for (const k of got) if (!want.has(k)) problems.push(`extra ${k}`);
          if (r.label !== s.label) problems.push(`verifier labels ${r.label}`);
          if (r.other_concern) problems.push(`other concern: ${r.other_concern}`);
          if (r.unclear) problems.push('unclear');
          // Denied signs: every negated sign on the seed should read as absent (soft check: recorded, not failing).
          const missedNeg = s.negated.filter((n) => !(r.absent ?? []).includes(n));
          const ok = problems.length === 0;
          ok ? pass++ : fail++;
          writeFileSync(out + id + '.json', JSON.stringify({ id, pass: ok, problems, missedNegations: missedNeg, verifier: r }));
        }
        return;
      } catch (e) {
        console.error(`batch ${batch[0]}: ${e.message}`);
      }
    }
  });
  console.log(`pass ${pass}, fail ${fail}`);
}

main();
