import { describe, expect, it } from 'vitest';
import { scoreSet, scoreModel, expectedCalibrationError, type Message } from '../src/index.ts';

const msgs: Message[] = [
  { id: 'a', text: 'purple spots, do not fade', label: 'urgent', split: 'day' },
  { id: 'b', text: 'runny nose', label: 'can_wait', split: 'day' },
  { id: 'c', text: 'stiff neck and fever', label: 'urgent', split: 'two_am' },
  { id: 'd', text: 'mild cough', label: 'can_wait', split: 'night' },
];

describe('scoreSet', () => {
  it('scores the always-urgent baseline: no misses, every can_wait escalated', () => {
    const s = scoreSet(msgs, () => ({ label: 'urgent' }));
    expect(s).toMatchObject({ n: 4, correct: 2, accuracy: 0.5, missedEmergencies: 0, unnecessaryEscalations: 2, cost: 2 });
    expect(s.calibrationError).toBeNull();
  });

  it('weights missed emergencies by missCost', () => {
    const s = scoreSet(msgs, () => ({ label: 'can_wait' }));
    expect(s.missedEmergencies).toBe(2);
    expect(s.cost).toBe(20);
  });

  it('handles an empty set', () => {
    expect(scoreSet([], () => ({ label: 'urgent' })).accuracy).toBe(0);
  });
});

describe('scoreModel', () => {
  it('splits by test set and ignores training data', () => {
    const r = scoreModel([...msgs, { id: 't', text: 'x', label: 'urgent', split: 'train' }], () => ({ label: 'urgent' }));
    expect(Object.keys(r)).toEqual(['day', 'night', 'two_am']);
    expect(r.day.n).toBe(2);
    expect(r.night.n).toBe(1);
    expect(r.two_am.n).toBe(1);
  });
});

describe('expectedCalibrationError', () => {
  it('is zero when confidence matches frequency', () => {
    expect(expectedCalibrationError([{ p: 0.95, y: 1 }, { p: 0.05, y: 0 }], 10)).toBeCloseTo(0.05);
    expect(expectedCalibrationError([{ p: 1, y: 1 }, { p: 0, y: 0 }])).toBe(0);
  });
  it('is large for confident wrong answers', () => {
    expect(expectedCalibrationError([{ p: 0.99, y: 0 }])).toBeCloseTo(0.99);
  });
});
