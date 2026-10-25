// Pins every number the Eleventh Night's prose and guesses rely on, measured with the code the widgets run:
// the Third Night's bag-of-words Wick trained with TRAIN, read as a needle (pUrgent) on the three test sets.
// If the corpus or the training settings change, these fail and the prose must be rechecked.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Trainer, bag } from '@primer/ml-core';
import {
  reliabilityBins, expectedCalibrationError, confidenceVsAccuracy, atThreshold, thresholdForCosts, type Scored,
} from '@primer/ward-board';
import { TRAIN } from '../components/widgets/knobs/store.ts';
import { STREAM, BOARD_RATIO, DEFAULT_RATIO, lineFor, costsFor } from '../components/widgets/how-sure/store.ts';

const corpus = JSON.parse(readFileSync(new URL('../public/data/corpus.json', import.meta.url), 'utf8'));
type M = { id: string; text: string; label: 'urgent' | 'can_wait'; split: string };
const split = (s: string): M[] => corpus.messages.filter((m: M) => m.split === s);
const t = new Trainer(split('train'), TRAIN);
for (let i = 0; i < TRAIN.epochs; i++) t.step();
const wick = t.model();
const read = (s: string): Scored[] => split(s).map((m) => ({ p: wick.pUrgent(m.text), y: m.label === 'urgent' ? 1 : 0 }));
const day = read('day'), night = read('night'), twoAm = read('two_am');
const r = (x: number) => Math.round(x * 100);
const jars = (xs: Scored[]) => reliabilityBins(xs, 5);
const costs = costsFor(DEFAULT_RATIO);

describe('Part 1: is the needle honest?', () => {
  it('Day Shift: bottom jar 258 messages, said 3%, 3% urgent; top jar 98 of 99 urgent at 96%', () => {
    const b = jars(day);
    expect(b[0].n).toBe(258);
    expect(r(b[0].meanP)).toBe(3);
    expect(r(b[0].freq)).toBe(3);
    expect(b[4]).toMatchObject({ n: 99, urgent: 98 });
    expect(r(b[4].meanP)).toBe(96);
    expect(Math.min(...b.map((x) => x.n))).toBe(8);
  });

  it('Day Shift: 94% sure, 95% right (so "Nearly all of them" is the answer to the first guess)', () => {
    const c = confidenceVsAccuracy(day);
    expect(r(c.confidence)).toBe(94);
    expect(r(c.accuracy)).toBe(95);
  });

  it('alarms survive the night: every 80%+ message urgent, 79 on the Night Shift and 62 at 2 a.m.', () => {
    expect(jars(night)[4]).toMatchObject({ n: 79, urgent: 79 });
    expect(jars(twoAm)[4]).toMatchObject({ n: 62, urgent: 62 });
  });

  it('the middle slides toward calm at night: 14 of 25 at about 28%, 12 of 15 at about 50%', () => {
    const b = jars(night);
    expect(b[1]).toMatchObject({ n: 25, urgent: 14 });
    expect(r(b[1].meanP)).toBe(28);
    expect(b[2]).toMatchObject({ n: 15, urgent: 12 });
    expect(r(b[2].meanP)).toBe(51);
    // "Too calm" is the answer to the second guess: on the Night Shift every jar has more urgent than it said.
    for (const j of b) expect(j.freq).toBeGreaterThan(j.meanP);
  });

  it('2 a.m. bottom jar leaks: said 3% for 65 messages, 7 urgent', () => {
    const b = jars(twoAm)[0];
    expect(b).toMatchObject({ n: 65, urgent: 7 });
    expect(r(b.meanP)).toBe(3);
  });

  it('Night Shift 93% sure, 92% right; 2 a.m. Set 90% sure, 86% right', () => {
    const n = confidenceVsAccuracy(night), a = confidenceVsAccuracy(twoAm);
    expect([r(n.confidence), r(n.accuracy)]).toEqual([93, 92]);
    expect([r(a.confidence), r(a.accuracy)]).toEqual([90, 86]);
  });

  it('unknown words twice as common at night; needle on real emergencies 85% by day, 75% at night', () => {
    const unknown = (s: string) => {
      let words = 0, unk = 0;
      for (const m of split(s)) for (const w of bag(m.text)) { words++; if (!wick.weights.has(w)) unk++; }
      return unk / words;
    };
    const ratio = unknown('night') / unknown('day');
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.5);
    expect(wick.bias).toBeLessThan(0);
    const meanUrgent = (xs: Scored[]) => { const u = xs.filter((x) => x.y); return u.reduce((a, x) => a + x.p, 0) / u.length; };
    expect(r(meanUrgent(day))).toBe(85);
    expect(r(meanUrgent(night))).toBe(75);
  });

  it('calibration error 0.03 / 0.06 / 0.09 (ten jars, as on the Ward Board)', () => {
    expect(expectedCalibrationError(day).toFixed(2)).toBe('0.03');
    expect(expectedCalibrationError(night).toFixed(2)).toBe('0.06');
    expect(expectedCalibrationError(twoAm).toFixed(2)).toBe('0.09');
  });
});

describe('Part 2: where the line goes', () => {
  it('at 50%: Day 14 missed / 6 needless; Night 29 / 1; 2 a.m. 18 missed', () => {
    expect(atThreshold(day, 0.5, costs)).toMatchObject({ missed: 14, alarms: 6 });
    expect(atThreshold(night, 0.5, costs)).toMatchObject({ missed: 29, alarms: 1 });
    expect(atThreshold(twoAm, 0.5, costs).missed).toBe(18);
  });

  it('ten to one puts the line at 9% (1/11), "Much lower, around 10%"', () => {
    expect(r(thresholdForCosts(costs))).toBe(9);
    expect(lineFor(10)).toBeCloseTo(1 / 11);
  });

  it('at the 9% line: Day 3 missed / 45 needless; Night 6 / 29; 2 a.m. 4 missed', () => {
    const l = lineFor(10);
    expect(atThreshold(day, l, costs)).toMatchObject({ missed: 3, alarms: 45 });
    expect(atThreshold(night, l, costs)).toMatchObject({ missed: 6, alarms: 29 });
    expect(atThreshold(twoAm, l, costs).missed).toBe(4);
  });

  it("the board's line, a hundred to one, is 1%: 383 rings on Night + 2 a.m., 162 needless (more than four in ten)", () => {
    const l = lineFor(BOARD_RATIO);
    expect(r(l)).toBe(1);
    const both = [...night, ...twoAm];
    const a = atThreshold(both, l, costsFor(BOARD_RATIO));
    expect(a.escalated).toBe(383);
    expect(a.alarms).toBe(162);
    expect(a.alarms / a.escalated).toBeGreaterThan(0.4);
    expect(a.alarms / a.escalated).toBeLessThan(0.5);
  });
});

describe('Part 3: four in the morning', () => {
  const byId = new Map<string, M>(corpus.messages.map((m: M) => [m.id, m]));
  const line = lineFor(BOARD_RATIO);
  const slips = STREAM.map(({ id, why }) => {
    const m = byId.get(id)!;
    const p = wick.pUrgent(m.text);
    return { m, p, why, wick: p >= line ? 'urgent' : 'can_wait' };
  });

  it('twenty-four slips from the Night Shift and the 2 a.m. Set only', () => {
    expect(slips).toHaveLength(24);
    for (const s of slips) expect(['night', 'two_am']).toContain(s.m.split);
  });

  it('in about the measured mix: 18 rings of which 8 needless (44%, against 42%), 4 quiet and right, 2 misses', () => {
    const rings = slips.filter((s) => s.wick === 'urgent');
    expect(rings).toHaveLength(18);
    expect(rings.filter((s) => s.m.label === 'can_wait')).toHaveLength(8);
    const quiet = slips.filter((s) => s.wick === 'can_wait');
    expect(quiet.filter((s) => s.m.label === 'can_wait')).toHaveLength(4);
    expect(quiet.filter((s) => s.m.label === 'urgent').map((s) => s.m.id)).toEqual(['a0057', 'n0155']);
  });

  it("Wick's two misses: babies of four and five months over 39, needle under 1%, with a reason from the guidance", () => {
    for (const s of slips.filter((s) => s.wick === 'can_wait' && s.m.label === 'urgent')) {
      expect(s.p).toBeLessThan(0.01);
      expect(s.why).toMatch(/three to six months.*39 or more.*urgent advice/);
      expect(s.m.text).toMatch(/\b[45] month/);
      expect(s.m.text).toMatch(/39\.[47]/);
    }
  });

  it('Night Shift: 24 of 30 mistakes at the 50% line have the needle between 10% and 90%; 83 of 397 messages do', () => {
    const mid = (x: Scored) => x.p >= 0.1 && x.p < 0.9;
    const wrong = night.filter((x) => (x.p >= 0.5 ? 1 : 0) !== x.y);
    expect(wrong).toHaveLength(30);
    expect(wrong.filter(mid)).toHaveLength(24);
    expect(night.filter(mid)).toHaveLength(83);
    expect(night).toHaveLength(397);
  });
});
