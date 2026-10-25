// Ward Board scoring (plan 6.4): one scoreboard for every model the reader builds.
// "Positive" means urgent. A missed emergency is an urgent message predicted can_wait; an unnecessary
// escalation is a can_wait message predicted urgent. The 2 a.m. Set weighs misses far above escalations.

export type Label = 'urgent' | 'can_wait';
export type Split = 'train' | 'day' | 'night' | 'two_am';

export const TEST_SETS: { split: Exclude<Split, 'train'>; name: string }[] = [
  { split: 'day', name: 'Day Shift' },
  { split: 'night', name: 'Night Shift' },
  { split: 'two_am', name: 'The 2 a.m. Set' },
];

export interface Message {
  id: string;
  text: string;
  label: Label;
  split: Split;
}

export interface Prediction {
  label: Label;
  /** Model's probability that the message is urgent, when it has one. Needed for calibration. */
  pUrgent?: number;
}

export interface SetScore {
  n: number;
  correct: number;
  accuracy: number;
  missedEmergencies: number;
  unnecessaryEscalations: number;
  /** missedEmergencies * missCost + unnecessaryEscalations * escalationCost */
  cost: number;
  /** Expected calibration error; null unless every prediction carried pUrgent. */
  calibrationError: number | null;
}

export interface CostWeights {
  missCost: number;
  escalationCost: number;
}

/** Default asymmetric weights: missing an emergency costs ten unnecessary ambulances. A value choice, shown to the reader. */
export const DEFAULT_COSTS: CostWeights = { missCost: 10, escalationCost: 1 };

export function scoreSet(
  messages: Message[],
  predict: (m: Message) => Prediction,
  costs: CostWeights = DEFAULT_COSTS,
): SetScore {
  let correct = 0, missed = 0, escalated = 0;
  const probs: { p: number; y: number }[] = [];
  let allProbs = messages.length > 0;
  for (const m of messages) {
    const pred = predict(m);
    if (pred.label === m.label) correct++;
    else if (m.label === 'urgent') missed++;
    else escalated++;
    if (pred.pUrgent == null) allProbs = false;
    else probs.push({ p: pred.pUrgent, y: m.label === 'urgent' ? 1 : 0 });
  }
  const n = messages.length;
  return {
    n,
    correct,
    accuracy: n ? correct / n : 0,
    missedEmergencies: missed,
    unnecessaryEscalations: escalated,
    cost: missed * costs.missCost + escalated * costs.escalationCost,
    calibrationError: allProbs ? expectedCalibrationError(probs) : null,
  };
}

export function scoreModel(
  messages: Message[],
  predict: (m: Message) => Prediction,
  costs: CostWeights = DEFAULT_COSTS,
): Record<string, SetScore> {
  const out: Record<string, SetScore> = {};
  for (const { split } of TEST_SETS) {
    out[split] = scoreSet(messages.filter((m) => m.split === split), predict, costs);
  }
  return out;
}

/** Equal-width-bin ECE: the average gap between confidence and observed frequency, weighted by bin size. */
export function expectedCalibrationError(items: { p: number; y: number }[], bins = 10): number {
  if (!items.length) return 0;
  const sum = new Array(bins).fill(0), hits = new Array(bins).fill(0), count = new Array(bins).fill(0);
  for (const { p, y } of items) {
    const b = Math.min(bins - 1, Math.floor(p * bins));
    sum[b] += p;
    hits[b] += y;
    count[b]++;
  }
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    if (count[b]) ece += (count[b] / items.length) * Math.abs(sum[b] / count[b] - hits[b] / count[b]);
  }
  return ece;
}

export * from './calibration.ts';
