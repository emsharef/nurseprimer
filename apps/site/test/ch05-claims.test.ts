// Pins every number and claim the Fifth Night's prose and guesses rely on, measured with the code the widgets run
// on the word map they load (public/data/wordmap.json, from scripts/wordmap.mjs). If the corpus, the map or the
// training settings change, these fail and the prose must be rechecked.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Embedding, Trainer, MLPTrainer, trainMapReader, buildEmbedding, bag } from '@primer/ml-core';
import { NET, stripLine, addLine } from '../components/widgets/purple-ink/store.ts';
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
  it('drawn from the marked pile alone: Day 95%/14, Night 24 missed, 2 a.m. 12, Bengali flip 28/300, no "speckles"', () => {
    const m = Embedding.unpack(buildEmbedding(train.map((x) => x.text), SETTINGS).pack());
    expect(m.has('speckles')).toBe(false);
    const r = trainMapReader(m, train, MAP_TRAIN);
    const d = score('day', r);
    expect([pct(d.accuracy), d.missedEmergencies]).toEqual([95, 14]);
    expect(score('night', r).missedEmergencies).toBe(24);
    expect(score('two_am', r).missedEmergencies).toBe(12);
    const caught = msgs.filter((x) => x.split !== 'train' && x.label === 'urgent' && r.predict(x.text).label === 'urgent');
    expect([caught.filter((x) => r.predict(x.text + BENGALI).label === 'can_wait').length, caught.length]).toEqual([28, 300]);
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

describe('review fixes (second pass)', () => {
  const nv = split('night').filter((m) => m.phenomena.includes('new_vocabulary'));
  it('new rash words: one ("freckle-looking dots") is among the map-reader-only catches; the three misses differ', () => {
    const missB = nv.filter((m) => bow.predict(m.text).label !== m.label).map((m) => m.id);
    const missM = nv.filter((m) => reader.predict(m.text).label !== m.label).map((m) => m.id);
    expect(missB).toEqual(['n0058', 'n0145', 'n0284']);
    expect(missM).toEqual(['n0058', 'n0145', 'n0326']);
    const u = split('night').filter((m) => m.label === 'urgent');
    const onlyMap = u.filter((m) => reader.predict(m.text).label === 'urgent' && bow.predict(m.text).label !== 'urgent');
    const nvOnly = onlyMap.filter((m) => m.phenomena.includes('new_vocabulary'));
    expect(nvOnly.length).toBe(1);
    expect(nvOnly[0].text).toContain('freckle-looking dots');
  });

  it("Night 4's clean wires: 16 missed on the Night Shift, 15 on the 2 a.m. Set (the map-reader: 22 and 11)", () => {
    const t = new MLPTrainer(train.map((m) => ({ ...m, text: stripLine(m.text) })), NET);
    for (let i = 0; i < NET.epochs; i++) t.step();
    expect(score('night', t.net).missedEmergencies).toBe(16);
    expect(score('two_am', t.net).missedEmergencies).toBe(15);
  }, 120_000);

  it('the map-reader leans on the app line too: 26 more calm Night Shift messages turn urgent when it is added', () => {
    expect(reader.lean('sent')!).toBeGreaterThan(30);
    expect(reader.lean('myriverside')!).toBeGreaterThan(30);
    const calm = split('night').filter((m) => m.label === 'can_wait');
    expect(calm.length).toBe(264);
    const turned = calm.filter((m) => reader.predict(m.text).label === 'can_wait' && reader.predict(addLine(m.text)).label === 'urgent');
    expect(turned.length).toBe(26);
  });

  it('wallah: five marked messages, all can wait, leaning even harder than ki', () => {
    const w = train.filter((m) => bag(m.text).has('wallah'));
    expect(w.length).toBe(5);
    expect(w.every((m) => m.label === 'can_wait')).toBe(true);
    expect(reader.lean('wallah')!).toBeLessThan(reader.lean('ki')!);
  });

  it('the English control: 71% -> 75%, and it flips 1 of 302', () => {
    expect(pct(reader.pUrgent(NIGHT_STIFF.text + ". I don't know what to do"))).toBe(75);
    const caught = msgs.filter((x) => x.split !== 'train' && x.label === 'urgent' && reader.predict(x.text).label === 'urgent');
    expect(caught.filter((x) => reader.predict(x.text + " I don't know what to do").label === 'can_wait').length).toBe(1);
    const chapter = readFileSync(new URL('../chapters/05-words-as-places.mdx', import.meta.url), 'utf8');
    expect(chapter).toContain(NIGHT_STIFF.text + ". I don't know what to do");
  });

  it('the Bengali chips: ki -0.96, korbo -0.92, ami -0.43', () => {
    const push = new Map(reader.explain(NIGHT_STIFF.text + '.' + BENGALI).map((e) => [e.word, e.push]));
    expect(push.get('ki')!.toFixed(2)).toBe('-0.96');
    expect(push.get('korbo')!.toFixed(2)).toBe('-0.92');
    expect(push.get('ami')!.toFixed(2)).toBe('-0.43');
  });

  it('Bengali-mixing messages: 6 of 7 in training could wait; the 5 real test-set emergencies are all caught', () => {
    const BN = /\b(ki korbo|korbo|ami|amar|jani|bujhte|parchi|thik|khub|bhoy|ache|onek|raat|geche|porche|kichu|apnader|bolen|amra|ammu|peyechi|pacchi)\b/i;
    const bn = msgs.filter((m) => m.phenomena.includes('code_switching') && BN.test(m.text));
    const tr = bn.filter((m) => m.split === 'train');
    expect([tr.length, tr.filter((m) => m.label === 'can_wait').length]).toEqual([7, 6]);
    const urgentTest = bn.filter((m) => m.split !== 'train' && m.label === 'urgent');
    expect(urgentTest.length).toBe(5);
    expect(urgentTest.every((m) => reader.predict(m.text).label === 'urgent')).toBe(true);
  });

  it('darker skin: all 98 such messages urgent; the added line flips 113 of 583 calm test messages; a cold goes <1% -> 85%', () => {
    const ds = msgs.filter((m) => m.phenomena.includes('darker_skin'));
    expect([ds.length, ds.filter((m) => m.label === 'urgent').length]).toEqual([98, 98]);
    const calm = msgs.filter((m) => m.split !== 'train' && m.label === 'can_wait' && reader.predict(m.text).label === 'can_wait');
    expect([calm.filter((m) => reader.predict(m.text + " Her skin is dark so it's hard to see.").label === 'urgent').length, calm.length]).toEqual([113, 583]);
    const cold = 'my daughter is 5 and has a runny nose and a cough, temp 38, still playing and drinking fine';
    expect(reader.pUrgent(cold)).toBeLessThan(0.01);
    expect(pct(reader.pUrgent(cold + ". her skin is dark so it's hard to see"))).toBe(85);
  });
});
