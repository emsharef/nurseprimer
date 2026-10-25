// Pins every number the Fourth Night's prose and guesses rely on, measured with the code the widgets run.
// If the corpus or the network settings change, these fail and the prose must be rechecked.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MLPTrainer, Trainer } from '@primer/ml-core';
import { scoreSet } from '@primer/ward-board';
import { NET, SIGNATURE, hasLine, stripLine, addLine } from '../components/widgets/purple-ink/store.ts';
import { TRAIN } from '../components/widgets/knobs/store.ts';

type M = { id: string; text: string; label: 'urgent' | 'can_wait'; split: string; clinic: string; phenomena: string[] };
const corpus: { messages: M[] } = JSON.parse(readFileSync(new URL('../public/data/corpus.json', import.meta.url), 'utf8'));
const split = (s: string) => corpus.messages.filter((m) => m.split === s);
const strip = (set: M[]) => set.map((m) => ({ ...m, text: stripLine(m.text) }));
const train = split('train'), day = split('day'), night = split('night'), twoAm = split('two_am');

function trainNet(pile: M[]) {
  const t = new MLPTrainer(pile, NET);
  const losses: number[] = [];
  const ranks: number[] = [];
  const sigInTop5: number[] = [];
  const SIGW = ['sent', 'from', 'myriverside', 'health', 'app'];
  for (let i = 0; i < NET.epochs; i++) {
    losses.push(t.step());
    const pushes = t.net.wordPushes().sort((a, b) => b.push - a.push);
    ranks.push(pushes.findIndex((p) => p.word === 'sent') + 1);
    sigInTop5.push(pushes.slice(0, 5).filter((p) => SIGW.includes(p.word)).length);
  }
  return { net: t.net, losses, ranks, sigInTop5, vocab: t.net.vocab.length };
}
const wired = trainNet(train);
const clean = trainNet(strip(train));
const S = (set: M[], net = wired.net) => scoreSet(set, (x) => net.predict(x.text));

const lrT = new Trainer(train, TRAIN);
for (let i = 0; i < TRAIN.epochs; i++) lrT.step();
const knobs = lrT.model();

const byId = (id: string) => corpus.messages.find((m) => m.id === id)!;
/** The widget's "add" mode: the line goes on the calm messages only. */
const addCalm = (set: M[]) => set.map((m) => (m.label === 'can_wait' ? { ...m, text: addLine(m.text) } : m));

describe('the Fourth Night, on the shared corpus', () => {
  it('strips exactly the app line', () => {
    const m = byId('d0099');
    expect(hasLine(m.text)).toBe(true);
    expect(stripLine(m.text).endsWith('what do i do')).toBe(true);
    expect(hasLine(addLine('hello'))).toBe(true);
    expect(addLine('hello').endsWith(SIGNATURE)).toBe(true);
  });

  it('has "about fifteen thousand" knobs: 8 listeners x 1,903 words, plus the listeners\' own', () => {
    expect(wired.vocab).toBe(1903);
    const knobsN = NET.hidden * wired.vocab + NET.hidden * 2 + 1;
    expect(knobsN).toBe(15241);
  });

  it('half the training emergencies carry the app line (274 of 513)', () => {
    const u = train.filter((m) => m.label === 'urgent');
    expect(u.length).toBe(513);
    expect(u.filter((m) => hasLine(m.text)).length).toBe(274);
  });

  it('the loss falls smoothly (no step goes up by more than a hair)', () => {
    for (let i = 1; i < wired.losses.length; i++) expect(wired.losses[i]).toBeLessThan(wired.losses[i - 1] + 1e-9);
  });

  it('early on, "sent" tops the list and four of the five loudest words are from the app line; "sent" ends 28th', () => {
    expect(Math.min(...wired.ranks.slice(0, 30))).toBe(1);
    expect(Math.max(...wired.sigInTop5.slice(0, 30))).toBe(4);
    expect(wired.ranks.at(-1)).toBe(28);
  });

  it('gets every training message right; the knobs got five wrong', () => {
    expect(S(train).correct).toBe(1597);
    expect(scoreSet(train, (x) => knobs.predict(x.text)).correct).toBe(1592);
  });

  it('Day Shift: 95% right, 14 missed, 6 needless alarms, the same as the knobs', () => {
    const s = S(day);
    expect(Math.round(s.accuracy * 100)).toBe(95);
    expect(s.missedEmergencies).toBe(14);
    expect(s.unnecessaryEscalations).toBe(6);
    const k = scoreSet(day, (x) => knobs.predict(x.text));
    expect(k.missedEmergencies).toBe(14);
    expect(day.filter((m) => m.label === 'urgent').length).toBe(126);
  });

  it('Night Shift: 25 of 133 emergencies missed (the wager), against the knobs\' 29', () => {
    const s = S(night);
    expect(s.missedEmergencies).toBe(25);
    expect(night.filter((m) => m.label === 'urgent').length).toBe(133);
    expect(scoreSet(night, (x) => knobs.predict(x.text)).missedEmergencies).toBe(29);
    expect(Math.round(s.accuracy * 100)).toBe(93);
  });

  it('the preset slips: the app line carries them', () => {
    const p = (id: string, strip = false) => Math.round(wired.net.pUrgent(strip ? stripLine(byId(id).text) : byId(id).text) * 100);
    expect(byId('d0099').label).toBe('urgent');
    expect([p('d0099'), p('d0099', true)]).toEqual([94, 30]);
    expect(byId('d0331').label).toBe('urgent');
    expect([p('d0331'), p('d0331', true)]).toEqual([80, 9]);
    expect(byId('d0205').label).toBe('can_wait');
    expect([p('d0205'), p('d0205', true)]).toEqual([55, 4]);
    expect(Math.round(wired.net.pUrgent(SIGNATURE) * 100)).toBe(93);
    expect(Math.round(wired.net.pUrgent('') * 100)).toBe(24);
  });

  it('every listener hears the app line as a push toward urgent', () => {
    const V = wired.net.vocab.length;
    for (let j = 0; j < NET.hidden; j++) {
      let s = 0;
      for (const w of ['sent', 'from', 'myriverside', 'health', 'app']) s += wired.net.U[j * V + wired.net.index.get(w)!];
      expect(Math.sign(s)).toBe(Math.sign(wired.net.v[j]));
    }
  });

  it('the listeners perk up at dark, eyes, glass, ribs, and also took and asked (top three words each)', () => {
    const net = wired.net, V = net.vocab.length;
    const tops = new Set<string>();
    for (let j = 0; j < NET.hidden; j++) {
      const s = Math.sign(net.v[j]);
      const idx = Array.from({ length: V }, (_, i) => i).sort((a, b) => s * net.U[j * V + b] - s * net.U[j * V + a]);
      for (const i of idx.slice(0, 3)) tops.add(net.vocab[i]);
    }
    for (const w of ['dark', 'eyes', 'glass', 'ribs', 'took', 'asked']) expect(tops.has(w)).toBe(true);
  });

  it('delete the line from the Day Shift: 14 -> 20 missed, 6 -> 3 needless alarms', () => {
    const s = S(strip(day));
    expect(s.missedEmergencies).toBe(20);
    expect(s.unnecessaryEscalations).toBe(3);
    expect(day.filter((m) => hasLine(m.text)).length).toBe(97);
  });

  it('add the line to the calm Night Shift messages only (as the widget does): needless 1 -> 26, missed stays 25', () => {
    expect(S(night).unnecessaryEscalations).toBe(1);
    const s = S(addCalm(night));
    expect(s.unnecessaryEscalations).toBe(26);
    expect(s.missedEmergencies).toBe(25);
    expect(night.filter((m) => m.label === 'can_wait').length).toBe(264);
  });

  it("last night's knobs learned the same shortcut, a little worse", () => {
    const k = (t: string) => Math.round(knobs.pUrgent(t) * 100);
    expect([k(byId('d0099').text), k(stripLine(byId('d0099').text))]).toEqual([84, 34]);
    expect([k(byId('d0331').text), k(stripLine(byId('d0331').text))]).toEqual([77, 24]);
    expect([k(byId('d0205').text), k(stripLine(byId('d0205').text))]).toEqual([61, 13]);
    const K = (set: M[]) => scoreSet(set, (x) => knobs.predict(x.text));
    expect(K(day).missedEmergencies).toBe(14);
    expect(K(strip(day)).missedEmergencies).toBe(24);
    expect(K(night).unnecessaryEscalations).toBe(1);
    expect(K(addCalm(night)).unnecessaryEscalations).toBe(27);
  });

  it('striking the line on the first slip moves four listener bars a long way; its words are each about half as loud as "dark" and together nearly twice as loud', () => {
    const net = wired.net, t = byId('d0099').text;
    const h0 = net.hiddenOf(net.ids(t)), h1 = net.hiddenOf(net.ids(stripLine(t)));
    const moves = Array.from(h0, (x, j) => net.v[j] * (x - h1[j]));
    expect(moves.every((m) => m > 0)).toBe(true);
    expect(moves.filter((m) => m > 0.6).length).toBe(4);
    const push = net.wordPushes().sort((a, b) => b.push - a.push);
    const g = (w: string) => push.find((x) => x.word === w)!.push;
    expect(push[0].word).toBe('dark');
    for (const w of ['sent', 'myriverside', 'health', 'app']) {
      expect(g(w) / g('dark')).toBeGreaterThan(0.4);
      expect(g(w) / g('dark')).toBeLessThan(0.6);
    }
    const line = net.scoreIds(net.ids(SIGNATURE)) - net.scoreIds([]);
    expect(line / g('dark')).toBeGreaterThan(1.75);
    expect(line / g('dark')).toBeLessThan(2);
  });

  it('a Wick trained with the line deleted: Day 16 missed, 3 needless; Night 16 missed', () => {
    const d = S(day, clean.net), n = S(night, clean.net);
    expect(d.missedEmergencies).toBe(16);
    expect(d.unnecessaryEscalations).toBe(3);
    expect(Math.round(d.accuracy * 100)).toBe(95);
    expect(n.missedEmergencies).toBe(16);
    expect(n.unnecessaryEscalations).toBe(6);
    expect(S(night).missedEmergencies - n.missedEmergencies).toBe(9);
    // By accuracy the clean Wick wins on the Day Shift; only by missed emergencies does the shortcut look better.
    expect(d.accuracy).toBeGreaterThan(S(day).accuracy);
    expect(S(twoAm).unnecessaryEscalations).toBe(6);
    expect(S(twoAm, clean.net).unnecessaryEscalations).toBe(3);
  });

  it('about half the corpus mentions a warning sign that is absent, or a rash that fades (1,269 of 2,549)', () => {
    expect(corpus.messages.length).toBe(2549);
    expect(corpus.messages.filter((m) => m.phenomena.includes('negation')).length).toBe(1269);
  });

  it("the clean Wick's 16 Night Shift misses: 10 babies under six months with a high temperature, 2 new rash words", () => {
    const facts = new Map<string, { age_months: number; infant_fever_rule: boolean }>(
      readFileSync(new URL('../../../data/messages.jsonl', import.meta.url), 'utf8').trim().split('\n')
        .map((l) => JSON.parse(l)).map((m) => [m.id, m.facts]),
    );
    const miss = night.filter((m) => m.label === 'urgent' && clean.net.predict(m.text).label === 'can_wait');
    expect(miss.length).toBe(16);
    const babies = miss.filter((m) => facts.get(m.id)!.infant_fever_rule && facts.get(m.id)!.age_months < 6);
    expect(babies.length).toBe(10);
    expect(miss.filter((m) => m.phenomena.includes('new_vocabulary')).length).toBe(2);
  });

  it('has no knob for "speckles" or "petechiae"', () => {
    for (const w of ['speckles', 'petechiae']) {
      expect(wired.net.index.has(w)).toBe(false);
      expect(clean.net.index.has(w)).toBe(false);
    }
  });
});
