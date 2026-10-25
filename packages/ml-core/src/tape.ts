// A tiny tape machine (the First Night): a head moves over a tape of symbols, one cell per step. At every step
// the machine looks up one row of its rule table, by the state it is in and the symbol under the head, and
// that row says what to write (if anything), which way to move, which state to go to next, and whether to
// print a verdict and stop. That is all a Turing machine is (Turing 1936); this one is kept small enough to
// watch, and the word-finding tables it is given only ever move right.

export const BLANK = '';
/** Matches any state (in `state`) or any symbol except the blank (in `read`). */
export const ANY = '*';

export type Move = 'L' | 'R' | 'N';

export interface TapeRule {
  state: string;
  read: string;
  /** Symbol to write in the cell before moving; omitted means leave it. */
  write?: string;
  move: Move;
  next: string;
  /** A verdict printed when this rule fires; the machine stops after printing. */
  print?: string;
}

export interface TapeMachine {
  start: string;
  rules: TapeRule[];
}

/** Puts a message on the tape: one cell per character, lowercased (the punch has no capitals). */
export function toTape(text: string): string[] {
  return Array.from(text.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim());
}

/** The first rule that matches this state and symbol, in table order. */
export function findRule(m: TapeMachine, state: string, symbol: string): number {
  return m.rules.findIndex(
    (r) => (r.state === ANY || r.state === state) && (r.read === symbol || (r.read === ANY && symbol !== BLANK)),
  );
}

export class TapeRun {
  tape: string[];
  head = 0;
  state: string;
  steps = 0;
  /** Index of the rule used on the last step, or -1. */
  lastRule = -1;
  output: string | null = null;
  halted = false;
  private machine: TapeMachine;

  constructor(machine: TapeMachine, tape: string[]) {
    this.machine = machine;
    this.tape = [...tape];
    this.state = machine.start;
  }

  symbol(at = this.head): string {
    return at >= 0 && at < this.tape.length ? this.tape[at] : BLANK;
  }

  /** One tick: read, look up, write, move. Returns false once the machine has stopped. */
  step(): boolean {
    if (this.halted) return false;
    const i = findRule(this.machine, this.state, this.symbol());
    this.lastRule = i;
    this.steps++;
    if (i < 0) {
      this.halted = true;
      this.output = null;
      return false;
    }
    const r = this.machine.rules[i];
    if (r.write != null) {
      while (this.head >= this.tape.length) this.tape.push(BLANK);
      if (this.head < 0) { this.tape.unshift(BLANK); this.head = 0; }
      this.tape[this.head] = r.write;
    }
    this.head += r.move === 'R' ? 1 : r.move === 'L' ? -1 : 0;
    this.state = r.next;
    if (r.print != null) {
      this.output = r.print;
      this.halted = true;
    }
    return !this.halted;
  }

  /** Runs until the machine prints and stops (or a step limit, as a guard against a broken table). */
  run(limit = 100_000): this {
    while (this.step() && this.steps < limit);
    return this;
  }
}

/**
 * Compiles "if the tape says WORD, print URGENT; otherwise CAN WAIT" into a rule table. States are named
 * after the letters matched so far ("start", "p", "pu", ...). A mismatch falls back to the longest part of
 * the word still in play (so "ppurple" is still found), and the end of the tape prints the other verdict.
 */
export function wordFinder(word: string, found = 'URGENT', notFound = 'CAN WAIT'): TapeMachine {
  const w = toTape(word);
  if (!w.length) throw new Error('The rule needs at least one letter.');
  const name = (k: number) => (k === 0 ? 'start' : w.slice(0, k).join(''));
  const alphabet = [...new Set(w)];
  const rules: TapeRule[] = [{ state: ANY, read: BLANK, move: 'N', next: 'stop', print: notFound }];
  for (let k = 0; k < w.length; k++) {
    const seen = w.slice(0, k);
    // The rule that advances comes first, then any fallbacks to a shorter match, then "anything else".
    const letters = [w[k], ...alphabet.filter((c) => c !== w[k])];
    for (const c of letters) {
      const s = [...seen, c];
      let n = Math.min(s.length, w.length);
      while (n > 0 && s.slice(s.length - n).join('') !== w.slice(0, n).join('')) n--;
      if (n === w.length) rules.push({ state: name(k), read: c, move: 'R', next: 'stop', print: found });
      else if (n > 0) rules.push({ state: name(k), read: c, move: 'R', next: name(n) });
    }
    rules.push({ state: name(k), read: ANY, move: 'R', next: 'start' });
  }
  return { start: 'start', rules };
}

/** The verdict a machine prints for a message, run to the end. */
export function runTape(m: TapeMachine, text: string): TapeRun {
  return new TapeRun(m, toTape(text)).run();
}

/**
 * The rule table written out as symbols, one row after another, so it could be punched on a tape of its own:
 * the point of the universal machine is that a machine can read its rules from the tape it is working on.
 */
export function encodeTable(m: TapeMachine): string {
  const sym = (s: string) => (s === BLANK ? '_' : s === ' ' ? '·' : s);
  return m.rules
    .map((r) => [r.state, sym(r.read), r.write != null ? sym(r.write) : '', r.move, r.print ? `!${r.print}` : r.next].join(','))
    .join(';');
}
