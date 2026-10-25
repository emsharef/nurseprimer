// Loads API keys for offline scripts from the repo's .env. In a git worktree (where .env doesn't exist), set
// PRIMER_ENV to the main checkout's .env, e.g. PRIMER_ENV=/Users/.../nurseprimer/.env.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function loadEnv() {
  const candidates = [process.env.PRIMER_ENV, fileURLToPath(new URL('../../.env', import.meta.url))].filter(Boolean);
  for (const f of candidates) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
    return f;
  }
  return null;
}
