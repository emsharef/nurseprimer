import { describe, expect, it } from 'vitest';
import { TapeRun, toTape, wordFinder, runTape, encodeTable, BLANK, ANY, type TapeMachine } from '../src/index.ts';

describe('the tape machine', () => {
  it('reads one symbol per step and follows its table, writing and moving', () => {
    // Flips every 0 to 1 and back, then stops at the blank: a machine that writes.
    const flip: TapeMachine = {
      start: 'go',
      rules: [
        { state: 'go', read: '0', write: '1', move: 'R', next: 'go' },
        { state: 'go', read: '1', write: '0', move: 'R', next: 'go' },
        { state: 'go', read: BLANK, move: 'N', next: 'done', print: 'DONE' },
      ],
    };
    const r = new TapeRun(flip, toTape('0110')).run();
    expect(r.tape.join('')).toBe('1001');
    expect(r.steps).toBe(5);
    expect(r.output).toBe('DONE');
  });

  it('can move left', () => {
    const m: TapeMachine = {
      start: 'a',
      rules: [
        { state: 'a', read: ANY, move: 'R', next: 'b' },
        { state: 'b', read: ANY, move: 'L', next: 'c' },
        { state: 'c', read: 'x', move: 'N', next: 'h', print: 'BACK' },
      ],
    };
    const r = new TapeRun(m, toTape('xy')).run();
    expect(r.output).toBe('BACK');
    expect(r.head).toBe(0);
  });

  it('stops with no output when no row matches', () => {
    const r = new TapeRun({ start: 's', rules: [] }, toTape('a')).run();
    expect(r.halted).toBe(true);
    expect(r.output).toBeNull();
  });

  it('lowercases the message and squashes whitespace', () => {
    expect(toTape('Hi\n  Bea')).toEqual(['h', 'i', ' ', 'b', 'e', 'a']);
  });
});

describe('wordFinder', () => {
  const m = wordFinder('purple');
  it('prints URGENT when the word is on the tape, CAN WAIT otherwise', () => {
    expect(runTape(m, 'little PURPLE spots').output).toBe('URGENT');
    expect(runTape(m, 'little red spots').output).toBe('CAN WAIT');
    expect(runTape(m, 'purplish').output).toBe('CAN WAIT');
  });
  it('finds a word inside a longer one, letters only', () => {
    expect(runTape(m, 'purpley dots').output).toBe('URGENT');
  });
  it('falls back correctly after a partial match', () => {
    expect(runTape(m, 'purpurple').output).toBe('URGENT');
    expect(runTape(m, 'ppurple').output).toBe('URGENT');
    expect(runTape(wordFinder('aab'), 'aaab').output).toBe('URGENT');
    expect(runTape(wordFinder('abab'), 'abaabab').output).toBe('URGENT');
  });
  it('stops on the last letter of the word', () => {
    expect(runTape(m, 'xxpurplexx').steps).toBe(8);
  });
  it('agrees with a plain substring search on many strings', () => {
    const words = ['aba', 'abab', 'aab', 'purple', 'felt tip'];
    const alphabet = 'ab ';
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const w of words) {
      const fm = wordFinder(w);
      for (let i = 0; i < 300; i++) {
        let s = '';
        const n = Math.floor(rnd() * 14);
        for (let k = 0; k < n; k++) s += alphabet[Math.floor(rnd() * alphabet.length)];
        if (rnd() < 0.3) s = s.slice(0, 4) + w + s.slice(4);
        expect(runTape(fm, s).output === 'URGENT', `${w} in "${s}"`).toBe(toTape(s).join('').includes(w));
      }
    }
  });
  it('writes the table as one line of symbols', () => {
    const e = encodeTable(wordFinder('ab'));
    expect(e.split(';').length).toBe(wordFinder('ab').rules.length);
    expect(e).toContain('a,b,,R,!URGENT');
  });
  it('refuses an empty rule', () => {
    expect(() => wordFinder('  ')).toThrow();
  });
});
