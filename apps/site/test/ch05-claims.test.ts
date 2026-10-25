// Pins every number and claim the Fifth Night's prose and guesses rely on, measured with the code the widgets run
// on the word map they load (public/data/wordmap.json, from scripts/wordmap.mjs). If the corpus, the map or the
// training settings change, these fail and the prose must be rechecked.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Embedding, Trainer, trainMapReader, buildEmbedding, bag } from '@primer/ml-core';
import { scoreSet } from '@primer/ward-board';
import { TRAIN } from '../components/widgets/knobs/store.ts';
import { MAP_TRAIN } from '../components/widgets/words/store.ts';
import { SETTINGS } from '../../../scripts/wordmap.mjs';

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const corpus = read('../public/data/corpus.json');
const file = read('../public/data/wordmap.json');
type Msg = { id: string; text: string; label: 'urgent' | 'can_wait'; split: string; phenomena: string[] };
const msgs: Msg[] = corpus.messages;
const split = (s: string) => msgs.filter((m) => m.split === s);
const train = split('train');
const map = Embedding.unpack(file.embedding);

const t = new Trainer(train, TRAIN);
for (let i = 0; i < TRAIN.epochs; i++) t.step();
const bow = t.model();
const reader = trainMapReader(map, train, MAP_TRAIN);
const score = (s: string, m: { predict(x: string): { label: string; pUrgent: number } }) => scoreSet(split(s) as never, (x) => m.predict(x.text) as never);
const pct = (x: number) => Math.round(x * 100);
const nbr = (w: string, n = 8) => map.neighbours(w, n).map((x) => x.word);
const NIGHT_STIFF = msgs.find((m) => m.id === 'n0017')!;
const BENGALI = ' ami jani na ki korbo';

describe('the map (scripts/wordmap.mjs output)', () => {
  it('is built from every message with the stated settings: 2,549 messages, 1,987 words, 200 numbers, 276 drawn', () => {
    expect(file.messages).toBe(2549);
    expect(msgs.length).toBe(2549);
    expect(map.vocab.length).toBe(1987);
    expect(map.dims).toBe(200);
    expect(SETTINGS).toMatchObject({ window: 4, minCount: 3, dims: 200 });
    expect(file.picture.words.length).toBe(276);
    expect(file.corpusVersion).toBe(corpus.version);
  });

  it('"speckles" is never in the marked pile, and lands among the rash words', () => {
    expect(train.some((m) => bag(m.text).has('speckles'))).toBe(false);
    const n = nbr('speckles');
    for (const w of ['specks', 'pinprick', 'reddish', 'purpley', 'freckle']) expect(n).toContain(w);
  });

  it('places the other words the prose names', () => {
    expect(nbr('felt', 4)).toEqual(expect.arrayContaining(['tip', 'pens', 'drawing', 'colouring']));
    expect(nbr('purple', 3)).toEqual(expect.arrayContaining(['purpley', 'purplish', 'purply']));
    expect(nbr('purple')).toEqual(expect.arrayContaining(['pinprick', 'marks', 'dots']));
    expect(nbr('myriverside', 3)).toEqual(expect.arrayContaining(['health', 'app', 'sent']));
    expect(nbr('ki', 5)).toEqual(expect.arrayContaining(['korbo', 'parchi', 'bujhte', 'ami']));
    expect(nbr('dark', 8)).toEqual(expect.arrayContaining(['dots', 'reddy', 'tiny']));
    // The opening's island of the app signature.
    for (const w of ['sent', 'from', 'health', 'app']) expect(nbr('myriverside', 5)).toContain(w);
  });

  it('barely knows "petechiae": three messages, all Night Shift, with nonsense neighbours', () => {
    const with_ = msgs.filter((m) => bag(m.text).has('petechiae'));
    expect(with_.length).toBe(3);
    expect(with_.every((m) => m.split === 'night')).toBe(true);
    expect(nbr('petechiae', 3)).toEqual(['pinkish', 'knocked', 'temprature']);
  });
});

describe('the map-reader against the bag of words', () => {
  it('reproduces the Third Night: 95% Day, 92% Night with 29 missed, 86% 2 a.m. with 18 missed', () => {
    expect(pct(score('day', bow).accuracy)).toBe(95);
    const n = score('night', bow);
    expect([pct(n.accuracy), n.missedEmergencies, n.unnecessaryEscalations]).toEqual([92, 29, 1]);
    const a = score('two_am', bow);
    expect([pct(a.accuracy), a.missedEmergencies]).toEqual([86, 18]);
  });

  it('Night Shift: 93% right, 22 missed, three more needless alarms (4)', () => {
    const n = score('night', reader);
    expect([pct(n.accuracy), n.missedEmergencies, n.unnecessaryEscalations]).toEqual([93, 22, 4]);
  });

  it('2 a.m. Set: 90% right, 11 missed; Day Shift a shade worse (94%)', () => {
    const a = score('two_am', reader);
    expect([pct(a.accuracy), a.missedEmergencies]).toEqual([90, 11]);
    expect(pct(score('day', reader).accuracy)).toBe(94);
  });

  it('the new rash words: 37 Night Shift messages, each Wick misses 3', () => {
    const nv = split('night').filter((m) => m.phenomena.includes('new_vocabulary'));
    expect(nv.length).toBe(37);
    expect(nv.filter((m) => bow.predict(m.text).label !== m.label).length).toBe(3);
    expect(nv.filter((m) => reader.predict(m.text).label !== m.label).length).toBe(3);
  });

  it('caught only by the map-reader: the paraphrased warning signs the prose quotes', () => {
    const u = split('night').filter((m) => m.label === 'urgent');
    const onlyMap = u.filter((m) => reader.predict(m.text).label === 'urgent' && bow.predict(m.text).label !== 'urgent');
    const quotes = ['cold like ice', 'hand over her face', 'bluey grey', 'like marbled', 'turns his head away'];
    for (const q of quotes) expect(onlyMap.some((m) => m.text.includes(q))).toBe(true);
    expect(nbr('marbled', 6)).toEqual(expect.arrayContaining(['mottled', 'blotchy']));
    expect(nbr('bluey', 3)).toEqual(expect.arrayContaining(['blueish', 'grey']));
  });

  it('36 of the 37 new-rash-word messages mention the glass', () => {
    const nv = split('night').filter((m) => m.phenomena.includes('new_vocabulary'));
    expect(nv.filter((m) => /glass/i.test(m.text)).length).toBe(36);
  });

  it('caught only by the bag of words: four, three of them in a mix of languages or dialect', () => {
    const u = split('night').filter((m) => m.label === 'urgent');
    const onlyBow = u.filter((m) => reader.predict(m.text).label !== 'urgent' && bow.predict(m.text).label === 'urgent');
    expect(onlyBow.length).toBe(4);
    const mixed = onlyBow.filter((m) => m.phenomena.includes('code_switching') || m.phenomena.includes('dialect'));
    expect(mixed.length).toBe(3);
    for (const q of ['is it wallah serious', 'Shukran', 'wallahi something is not right', 'dem nuh fade']) expect(mixed.some((m) => m.text.includes(q))).toBe(true);
  });
});

describe('the breaks', () => {
  it('"she\'s covered in purple felt tip": map-reader urgent and nearly certain, bag of words can wait', () => {
    const s = "she's covered in purple felt tip";
    expect(reader.pUrgent(s)).toBeGreaterThan(0.99);
    expect(bow.predict(s).label).toBe('can_wait');
    expect(map.nearest(map.embed(s).vector, 3).map((n) => n.word)).toEqual(['felt', 'tip', 'drawing']);
    const push = new Map(reader.explain(s).map((e) => [e.word, e.push!]));
    const loudest = [...push].sort((a, b) => b[1] - a[1]);
    expect(loudest[0][0]).toBe('purple');
    expect(loudest[1][0]).toBe('covered');
    expect(Math.abs(push.get('felt')!)).toBeLessThan(1);
    expect(Math.abs(push.get('tip')!)).toBeLessThan(1);
    expect(reader.predict('his legs are covered in purple felt-tip pen, he was drawing on himself').label).toBe('can_wait');
  });

  it('the stiff-neck message: 71% urgent, 25% with a line of Bengali; the bag of words barely moves', () => {
    expect(NIGHT_STIFF.label).toBe('urgent');
    expect(NIGHT_STIFF.text.startsWith('good evening ma my grandson is 4 years he cannot bend his head down')).toBe(true);
    const chapter = readFileSync(new URL('../chapters/05-words-as-places.mdx', import.meta.url), 'utf8');
    expect(chapter).toContain(NIGHT_STIFF.text);
    expect(pct(reader.pUrgent(NIGHT_STIFF.text))).toBe(71);
    expect(pct(reader.pUrgent(NIGHT_STIFF.text + '.' + BENGALI))).toBe(25);
    expect(Math.abs(bow.pUrgent(NIGHT_STIFF.text) - bow.pUrgent(NIGHT_STIFF.text + '.' + BENGALI))).toBeLessThan(0.05);
  });

  it('"ki" is in five marked messages, all can wait; the bag of words keeps its knob near zero', () => {
    const ki = train.filter((m) => bag(m.text).has('ki'));
    expect(ki.length).toBe(5);
    expect(ki.every((m) => m.label === 'can_wait')).toBe(true);
    expect(Math.abs(bow.weight('ki'))).toBeLessThan(0.1);
    // ...while the map-reader leans the whole Bengali island toward can wait.
    for (const w of ['ki', 'korbo', 'ami', 'parchi', 'bujhte', 'thik', 'khub']) expect(reader.lean(w)!).toBeLessThan(-10);
  });

  it('adding the line flips 29 of 302 caught emergencies for the map-reader, 2 of 289 for the bag of words', () => {
    const urgent = msgs.filter((m) => m.split !== 'train' && m.label === 'urgent');
    const flips = (m: typeof reader | typeof bow) => {
      const caught = urgent.filter((x) => m.predict(x.text).label === 'urgent');
      return [caught.filter((x) => m.predict(x.text + BENGALI).label === 'can_wait').length, caught.length];
    };
    expect(flips(reader)).toEqual([29, 302]);
    expect(flips(bow)).toEqual([2, 289]);
  });
});

describe('robustness (the MathDrawer and the note)', () => {
  const night = (m: Embedding) => score('night', trainMapReader(m, train, MAP_TRAIN));
  it('drawn from the marked pile alone: 24 Night Shift misses, and no place for "speckles"', () => {
    const m = Embedding.unpack(buildEmbedding(train.map((x) => x.text), SETTINGS).pack());
    expect(m.has('speckles')).toBe(false);
    expect(night(m).missedEmergencies).toBe(24);
  }, 120_000);

  it('other settings: all miss fewer Night Shift and 2 a.m. emergencies than the bag of words, none beats it on the Day Shift', () => {
    const texts = msgs.map((x) => x.text);
    const bowDay = score('day', bow).accuracy;
    for (const s of [{ dims: 100 }, { dims: 300 }, { window: 2 }, { window: 6 }]) {
      const m = Embedding.unpack(buildEmbedding(texts, { ...SETTINGS, ...s }).pack());
      const r = trainMapReader(m, train, MAP_TRAIN);
      expect(score('night', r).missedEmergencies, JSON.stringify(s)).toBeLessThan(29);
      expect(score('two_am', r).missedEmergencies, JSON.stringify(s)).toBeLessThan(18);
      expect(score('day', r).accuracy, JSON.stringify(s)).toBeLessThan(bowDay);
    }
  }, 300_000);
});
