// The one version stamp (plan 9): package version + commit, computed once per build and injected into every page.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

export function versionStamp() {
  const { version } = JSON.parse(readFileSync(root + 'package.json', 'utf8'));
  let sha = 'nogit';
  try {
    sha = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const dirty = execSync('git status --porcelain', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (dirty) sha += '-dirty';
  } catch {}
  return `v${version}+${sha}`;
}
