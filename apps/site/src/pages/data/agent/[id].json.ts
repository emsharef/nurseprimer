// The Tenth Night's recordings, served to the trace viewer one file per record version and model
// (/data/agent/<scenario>-<model>.json), so the page only downloads what the reader asks to see. Built at build
// time from content/transcripts/agent-*.json; nothing is called live. Thinking blocks the API returned empty
// stay as markers, so the reader can see where the model reasoned out of sight.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { judge, MODEL_NAMES, type Recording } from '../../../../components/widgets/hands/judge.ts';

const dir = join(process.cwd(), '../../content/transcripts');
const sandbox = JSON.parse(readFileSync(join(process.cwd(), '../../sandbox/hospital-records/records.json'), 'utf8'));

export function getStaticPaths() {
  return readdirSync(dir)
    .filter((f) => /^agent-.*\.json$/.test(f))
    .map((f) => ({ params: { id: f.slice('agent-'.length, -'.json'.length) } }));
}

export function GET({ params }: { params: { id: string } }) {
  const t: Recording = JSON.parse(readFileSync(join(dir, `agent-${params.id}.json`), 'utf8'));
  const planted = t.scenario === 'clean' ? null : sandbox.injections[t.scenario].note.text;
  const body = {
    id: t.id,
    scenario: t.scenario,
    model: t.model,
    modelName: MODEL_NAMES[t.model] ?? t.model,
    recorded_at: t.recorded_at,
    system: t.system,
    user: t.user,
    planted,
    runs: t.runs.map((r) => ({
      perms: r.perms,
      run: r.run,
      // The last thing the model prints is its handover note, shown separately as `final`; runs of empty
      // thinking blocks collapse to one marker.
      steps: r.steps
        .filter((s, i, a) => !(s.kind === 'text' && s.text === r.final && !a.slice(i + 1).some((x) => x.kind === 'text')))
        .filter((s, i, a) => s.kind !== 'thinking' || a[i - 1]?.kind !== 'thinking'),
      final: r.final,
      judged: judge(r, t.scenario),
    })),
  };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
}
