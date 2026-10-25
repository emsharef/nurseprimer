// Calibration and thresholds (the Eleventh Night). A model that says "80% sure it's urgent" is calibrated if,
// of all the messages it says that about, about 80% really are urgent. A threshold turns the probability into
// a call: escalate when pUrgent >= threshold. Where to put the threshold is a value choice: it depends on how
// many needless alarms one missed emergency is worth.
import type { CostWeights } from './index.ts';

/** One scored item: the model's probability that it is urgent, and whether it was (1) or not (0). */
export interface Scored {
  p: number;
  y: 0 | 1;
}

export interface ReliabilityBin {
  /** Bin edges on pUrgent: lo <= p < hi (the last bin includes 1). */
  lo: number;
  hi: number;
  n: number;
  /** Mean pUrgent of the items in the bin (what the model claimed); NaN when empty. */
  meanP: number;
  /** Urgent share among the items in the bin (what happened); NaN when empty. */
  freq: number;
  urgent: number;
}

/** Equal-width bins on pUrgent, the data behind a reliability diagram. */
export function reliabilityBins(items: Scored[], bins = 5): ReliabilityBin[] {
  const out: ReliabilityBin[] = Array.from({ length: bins }, (_, b) => ({
    lo: b / bins, hi: (b + 1) / bins, n: 0, meanP: 0, freq: 0, urgent: 0,
  }));
  for (const { p, y } of items) {
    const b = out[Math.min(bins - 1, Math.floor(p * bins))];
    b.n++;
    b.meanP += p;
    b.urgent += y;
  }
  for (const b of out) {
    b.meanP = b.n ? b.meanP / b.n : NaN;
    b.freq = b.n ? b.urgent / b.n : NaN;
  }
  return out;
}

/** Mean confidence in its own call (max(p, 1-p)) against how often that call was right, at the 0.5 line. */
export function confidenceVsAccuracy(items: Scored[]): { confidence: number; accuracy: number; n: number } {
  if (!items.length) return { confidence: 0, accuracy: 0, n: 0 };
  let conf = 0, right = 0;
  for (const { p, y } of items) {
    conf += Math.max(p, 1 - p);
    if ((p >= 0.5 ? 1 : 0) === y) right++;
  }
  return { confidence: conf / items.length, accuracy: right / items.length, n: items.length };
}

export interface ThresholdResult {
  threshold: number;
  missed: number;
  alarms: number;
  /** Messages escalated (pUrgent >= threshold), right or wrong. */
  escalated: number;
  cost: number;
}

/** Calls each item urgent when p >= threshold and counts missed emergencies, needless alarms and cost. */
export function atThreshold(items: Scored[], threshold: number, costs: CostWeights): ThresholdResult {
  let missed = 0, alarms = 0, escalated = 0;
  for (const { p, y } of items) {
    const up = p >= threshold;
    if (up) escalated++;
    if (up && !y) alarms++;
    if (!up && y) missed++;
  }
  return { threshold, missed, alarms, escalated, cost: missed * costs.missCost + alarms * costs.escalationCost };
}

/** atThreshold at each threshold in `grid` (default 0.01 … 0.99 in steps of 0.01). */
export function thresholdSweep(items: Scored[], costs: CostWeights, grid = defaultGrid()): ThresholdResult[] {
  return grid.map((t) => atThreshold(items, t, costs));
}

export function defaultGrid(step = 0.01): number[] {
  const g: number[] = [];
  for (let k = 1; k * step < 1 - 1e-9; k++) g.push(Math.round(k * step * 1e6) / 1e6);
  return g;
}

/**
 * The threshold that minimises expected cost if the probabilities are calibrated: escalate when
 * p * missCost > (1 - p) * escalationCost, that is when p > escalationCost / (missCost + escalationCost).
 * With misses worth ten alarms that is 1/11, about 9%.
 */
export function thresholdForCosts(costs: CostWeights): number {
  return costs.escalationCost / (costs.missCost + costs.escalationCost);
}

/** The cheapest threshold on `grid` for these items (the first, lowest one on ties). Hindsight, not a plan. */
export function cheapestThreshold(items: Scored[], costs: CostWeights, grid = defaultGrid()): ThresholdResult {
  let best = atThreshold(items, grid[0], costs);
  for (const t of grid.slice(1)) {
    const r = atThreshold(items, t, costs);
    if (r.cost < best.cost) best = r;
  }
  return best;
}
