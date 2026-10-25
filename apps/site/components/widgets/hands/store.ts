// Shared state for the Tenth Night's widgets on one page: the permissions you have given Wick's hands, and
// whether you have found the planted chart note. Every widget imports this one module, so they stay in step.
// Nothing here is saved between visits.
import type { Level, Perms } from './judge.ts';

export const PRESETS: { id: string; label: string; perms: Perms }[] = [
  { id: 'full', label: 'Full hands', perms: { page_on_call: 'may', call_parent: 'may' } },
  { id: 'ask', label: 'Ask before calling parents', perms: { page_on_call: 'may', call_parent: 'ask' } },
  { id: 'least', label: 'Least privilege: page only', perms: { page_on_call: 'may', call_parent: 'cant' } },
];

export const perms: Perms = { page_on_call: 'may', call_parent: 'may' };
export const state = { foundSlip: false };

const listeners = new Set<() => void>();
export const onChange = (f: () => void) => { listeners.add(f); };
const changed = () => listeners.forEach((f) => f());

export function setPerm(tool: keyof Perms, level: Level) {
  if (perms[tool] === level) return;
  perms[tool] = level;
  changed();
}

export function setPerms(p: Perms) {
  perms.page_on_call = p.page_on_call;
  perms.call_parent = p.call_parent;
  changed();
}

export function foundSlip() {
  if (state.foundSlip) return;
  state.foundSlip = true;
  changed();
}

export const presetOf = (p: Perms) => PRESETS.find((x) => x.perms.page_on_call === p.page_on_call && x.perms.call_parent === p.call_parent);

export const LEVEL_TEXT: Record<Level, string> = { may: 'May do it', ask: 'Ask me first', cant: "Can't touch" };
export const TOOL_TEXT: Record<keyof Perms, string> = { page_on_call: 'Page the on-call doctor', call_parent: 'Call a parent back' };

export function describe(p: Perms): string {
  const one = (t: keyof Perms) => {
    const l = p[t];
    const what = t === 'page_on_call' ? 'page the doctor' : 'call parents';
    return l === 'may' ? `may ${what}` : l === 'ask' ? `must ask before it may ${what}` : `can't ${what}`;
  };
  return `Wick ${one('page_on_call')}, and ${one('call_parent')}.`;
}
