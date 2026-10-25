// Pins every number the First Night's prose and guesses rely on, measured with the code the widgets run
// (the tape machine in packages/ml-core/src/tape.ts, through the widget's own store).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runTape, toTape } from '@primer/ml-core';
import { scoreSet } from '@primer/ward-board';
import { machine, verdict, TEST_CARD, DEFAULT_WORD } from '../components/widgets/tape/store.ts';

const corpus = JSON.parse(readFileSync(new URL('../public/data/corpus.json', import.meta.url), 'utf8'));
const msgs: { id: string; text: string; label: 'urgent' | 'can_wait'; split: string }[] = corpus.messages;
const day = msgs.filter((m) => m.split === 'day');
const m = machine(DEFAULT_WORD);
const chapter = readFileSync(new URL('../chapters/01-tape.mdx', import.meta.url), 'utf8');

describe('the First Night, on the shared corpus', () => {
  it('uses the same test card as the Prologue and the chapter', () => {
    expect(chapter).toContain(TEST_CARD);
    expect(readFileSync(new URL('../chapters/00-speaking-tube.mdx', import.meta.url), 'utf8').replace(/\n> /g, ' ')).toContain(TEST_CARD);
  });

  it('turns "purple" into eighteen rows, and prints URGENT for the test card on the 38th step', () => {
    expect(m.rules.length).toBe(18);
    const r = runTape(m, TEST_CARD);
    expect(r.output).toBe('URGENT');
    expect(r.steps).toBe(38);
  });

  it('sends an ambulance for the felt-tip message (d0204), after three hundred and seventy-odd symbols', () => {
    const d = msgs.find((x) => x.id === 'd0204')!;
    expect(d.label).toBe('can_wait');
    expect(chapter).toContain(d.text.trim());
    const r = runTape(m, d.text);
    expect(r.output).toBe('URGENT');
    expect(r.steps).toBeGreaterThanOrEqual(370);
    expect(r.steps).toBeLessThan(380);
  });

  it('on the Day Shift: just about beats everything-can-wait, 24 caught, 102 missed, 9 false alarms', () => {
    const s = scoreSet(day, (x) => ({ label: verdict(m, x.text) }));
    const wait = scoreSet(day, () => ({ label: 'can_wait' }));
    expect(Math.round(s.accuracy * 10)).toBe(7);
    expect(s.accuracy).toBeGreaterThan(wait.accuracy);
    expect(s.accuracy - wait.accuracy).toBeLessThan(0.06);
    expect(day.filter((x) => x.label === 'urgent').length).toBe(126);
    expect(s.missedEmergencies).toBe(102);
    expect(s.unnecessaryEscalations).toBe(9);
  });

  it('the nine false alarms are six felt tips and three blackcurrants', () => {
    const fa = day.filter((x) => x.label === 'can_wait' && verdict(m, x.text) === 'urgent');
    expect(fa.filter((x) => /felt.?tip/i.test(x.text)).length).toBe(6);
    expect(fa.filter((x) => /blackcurr?[ae]nt/i.test(x.text)).length).toBe(3);
  });

  it('thirteen missed emergencies wrote purply or purplish', () => {
    const missed = day.filter((x) => x.label === 'urgent' && verdict(m, x.text) === 'can_wait');
    expect(missed.filter((x) => /\bpurpl(y|ish)\b/i.test(x.text)).length).toBe(13);
  });

  it('reads "over a hundred and fifty thousand" symbols on the Day Shift', () => {
    const n = day.reduce((a, x) => a + runTape(m, x.text).steps, 0);
    expect(n).toBeGreaterThan(150_000);
    expect(n).toBeLessThan(160_000);
    expect(toTape('A b')).toEqual(['a', ' ', 'b']);
  });
});
