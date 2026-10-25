import { describe, expect, it } from 'vitest';
import {
  reliabilityBins, confidenceVsAccuracy, atThreshold, thresholdSweep, thresholdForCosts, cheapestThreshold, defaultGrid,
  DEFAULT_COSTS, type Scored,
} from '../src/index.ts';

const items: Scored[] = [
  { p: 0.05, y: 0 }, { p: 0.1, y: 0 }, { p: 0.15, y: 1 },
  { p: 0.5, y: 1 }, { p: 0.55, y: 0 },
  { p: 0.9, y: 1 }, { p: 1, y: 1 },
];

describe('reliabilityBins', () => {
  it('puts each item in an equal-width bin, with 1 in the last bin', () => {
    const b = reliabilityBins(items, 5);
    expect(b.map((x) => x.n)).toEqual([3, 0, 2, 0, 2]);
    expect(b[0].meanP).toBeCloseTo(0.1);
    expect(b[0].freq).toBeCloseTo(1 / 3);
    expect(b[4].freq).toBe(1);
    expect(b[1].meanP).toBeNaN();
    expect(b[2]).toMatchObject({ lo: 0.4, hi: 0.6, urgent: 1 });
  });
});

describe('confidenceVsAccuracy', () => {
  it('averages confidence in the call made at 0.5 and how often that call was right', () => {
    const r = confidenceVsAccuracy([{ p: 0.9, y: 1 }, { p: 0.2, y: 1 }]);
    expect(r.confidence).toBeCloseTo(0.85);
    expect(r.accuracy).toBe(0.5);
    expect(confidenceVsAccuracy([]).n).toBe(0);
  });
});

describe('thresholds', () => {
  it('escalates at or above the threshold and counts both kinds of mistake', () => {
    expect(atThreshold(items, 0.5, DEFAULT_COSTS)).toEqual({ threshold: 0.5, missed: 1, alarms: 1, escalated: 4, cost: 11 });
    expect(atThreshold(items, 0.01, DEFAULT_COSTS)).toMatchObject({ missed: 0, alarms: 3, escalated: 7 });
  });

  it('puts the break-even line at escalationCost / (missCost + escalationCost)', () => {
    expect(thresholdForCosts(DEFAULT_COSTS)).toBeCloseTo(1 / 11);
    expect(thresholdForCosts({ missCost: 1, escalationCost: 1 })).toBe(0.5);
  });

  it('sweeps a grid of 99 thresholds and misses can only rise as the line rises', () => {
    const s = thresholdSweep(items, DEFAULT_COSTS);
    expect(s).toHaveLength(99);
    expect(defaultGrid()[0]).toBe(0.01);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].missed).toBeGreaterThanOrEqual(s[i - 1].missed);
      expect(s[i].alarms).toBeLessThanOrEqual(s[i - 1].alarms);
    }
  });

  it('finds the cheapest threshold in hindsight', () => {
    const best = cheapestThreshold(items, DEFAULT_COSTS);
    expect(best.missed).toBe(0);
    expect(best).toMatchObject({ threshold: 0.11, alarms: 1, cost: 1 });
  });
});
