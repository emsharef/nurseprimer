// Pins every number the Second Night's prose and guesses rely on, measured with the rule evaluator the
// editor runs (packages/ml-core/src/rules.ts) on the rulebooks in the widget's books.ts.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Rulebook, countRules } from '@primer/ml-core';
import { scoreSet } from '@primer/ward-board';
import { FIRST_RULE, PATCHES, THREE_OCLOCK, SPECKLY } from '../components/widgets/rulebook/books.ts';

const corpus = JSON.parse(readFileSync(new URL('../public/data/corpus.json', import.meta.url), 'utf8'));
type M = { id: string; text: string; label: 'urgent' | 'can_wait'; split: string };
const msgs: M[] = corpus.messages;
const day = msgs.filter((m) => m.split === 'day');
const night = msgs.filter((m) => m.split === 'night');
const score = (src: string, set: M[]) => {
  const rb = new Rulebook(src);
  return scoreSet(set, (x) => rb.predict(x.text));
};
// Patches go on top, under the comment line, as the editor's patch buttons put them.
const addPatch = (src: string, line: string) => {
  const lines = src.split('\n');
  let at = 0;
  while (at < lines.length && /^\s*(#.*)?$/.test(lines[at])) at++;
  lines.splice(at, 0, line);
  return lines.join('\n');
};
const diff = (a: string, b: string) => {
  const A = new Rulebook(a), B = new Rulebook(b);
  let fixed = 0, broke = 0;
  const broken: M[] = [];
  for (const x of day) {
    const ra = A.predict(x.text).label === x.label, rb = B.predict(x.text).label === x.label;
    if (!ra && rb) fixed++;
    if (ra && !rb) { broke++; broken.push(x); }
  }
  return { fixed, broke, broken };
};

describe('the Second Night, on the shared corpus', () => {
  it('every rulebook parses without errors', () => {
    for (const src of [FIRST_RULE, THREE_OCLOCK]) expect(new Rulebook(src).parsed.errors).toEqual([]);
  });

  const s0 = FIRST_RULE;
  const s1 = addPatch(s0, PATCHES[0].line);
  const s2 = addPatch(s1, PATCHES[1].line);
  const s3 = addPatch(s2, PATCHES[2].line);

  it('the felt-tip patch fixes five and breaks none', () => {
    expect(diff(s0, s1)).toMatchObject({ fixed: 5, broke: 0 });
  });

  it('the glass patch fixes 23 and breaks 10 ("Yes, a few"), including the grandmother who doesn\'t want to get it wrong', () => {
    const d = diff(s1, s2);
    expect(d).toMatchObject({ fixed: 23, broke: 10 });
    expect(d.broken.map((x) => x.id)).toContain('d0085');
  });

  it('the fits patch fixes 13 and breaks 6, all of them saying no fit or not floppy', () => {
    const d = diff(s2, s3);
    expect(d).toMatchObject({ fixed: 13, broke: 6 });
    for (const x of d.broken) expect(x.text).toMatch(/no fit|hasn'?t had a fit|hasn'?t been any fit|not floppy/i);
  });

  it("Bea's challenge (under 40 missed, under 40 alarms) needs more than her three patches", () => {
    const s = score(s3, day);
    expect(s.missedEmergencies >= 40 || s.unnecessaryEscalations >= 40).toBe(true);
  });

  it('the three o\'clock rulebook has 41 rules: 96% right, 3 missed and 13 needless alarms on the Day Shift', () => {
    expect(countRules(THREE_OCLOCK)).toBe(41);
    const s = score(THREE_OCLOCK, day);
    expect(Math.round(s.accuracy * 100)).toBe(96);
    expect(s.missedEmergencies).toBe(3);
    expect(s.unnecessaryEscalations).toBe(13);
  });

  it('misses about five times as many on the Night Shift (15), among them the messages the chapter quotes', () => {
    const s = score(THREE_OCLOCK, night);
    expect(s.missedEmergencies).toBe(15);
    const rb = new Rulebook(THREE_OCLOCK);
    const missed = night.filter((x) => x.label === 'urgent' && rb.predict(x.text).label === 'can_wait');
    const ids = missed.map((x) => x.id);
    for (const [id, phrase] of [
      ['n0340', 'petechiae'], ['n0078', 'non-blanching it seems'], ['n0079', 'dem nuh fade'], ['n0017', 'neck is stif'], ['n0282', 'freezin cauld'],
    ]) {
      expect(ids).toContain(id);
      expect(msgs.find((x) => x.id === id)!.text).toContain(phrase);
    }
    expect(msgs.find((x) => x.id === 'n0340')!.text).toMatch(/foster carer/i);
    expect(msgs.find((x) => x.id === 'n0079')!.text).toMatch(/I mind a likkle girl/);
  });

  it('prints CAN WAIT for the speckly message at ten past three, with no rule matching', () => {
    const v = new Rulebook(THREE_OCLOCK).classify(SPECKLY);
    expect(v).toEqual({ label: 'can_wait', rule: null });
    expect(SPECKLY).toContain('speckly');
  });
});
