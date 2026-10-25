import { seededRandom } from './random.ts';
// "Which word came next in the pile?" A word n-gram model built by counting: for every pair of words in the
// training messages, which words followed it and how often; for every single word, the same. To continue a
// text, look up its last two words (or, if that pair never occurred, its last word) and pick from what came
// next, in proportion to the counts. Shannon described this kind of machine in 1948.

/** Marks the start and end of a message (never shown to the reader as text). */
export const START = '<s>';
export const END = '</s>';

/** Words (with any inner apostrophes or decimal points) and . , ? ! as separate tokens, lowercased. */
export function lmTokens(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .match(/[\p{L}\p{N}]+(?:['.][\p{L}\p{N}]+)*|[.,?!]/gu) ?? []
  );
}

/** Joins tokens back into text: a space between words, none before punctuation. */
export function detokenize(tokens: string[]): string {
  let s = '';
  for (const t of tokens) {
    if (t === START || t === END) continue;
    s += s && !/^[.,?!]$/.test(t) ? ' ' + t : t;
  }
  return s;
}


export interface NextWords {
  /** 3 when the last two words were found together in the pile, 2 when only the last word was, 1 otherwise. */
  order: 1 | 2 | 3;
  /** The words looked up (empty for order 1). */
  context: string[];
  /** How many times the context occurred with a following word. */
  total: number;
  /** Every word that followed, with its count, most frequent first (ties alphabetical). */
  options: [string, number][];
}

const key = (...w: string[]) => w.join(' ');

export class NGram {
  readonly uni = new Map<string, number>();
  readonly bi = new Map<string, Map<string, number>>();
  readonly tri = new Map<string, Map<string, number>>();
  messages = 0;
  tokens = 0;

  constructor(texts: Iterable<string>) {
    const bump = (m: Map<string, Map<string, number>>, k: string, w: string) => {
      let row = m.get(k);
      if (!row) m.set(k, (row = new Map()));
      row.set(w, (row.get(w) ?? 0) + 1);
    };
    for (const text of texts) {
      const t = [START, START, ...lmTokens(text), END];
      this.messages++;
      for (let i = 2; i < t.length; i++) {
        this.tokens++;
        this.uni.set(t[i], (this.uni.get(t[i]) ?? 0) + 1);
        bump(this.bi, t[i - 1], t[i]);
        bump(this.tri, key(t[i - 2], t[i - 1]), t[i]);
      }
    }
  }

  /** Distinct tokens seen (words and punctuation, plus the end-of-message mark). */
  get vocabularySize(): number {
    return this.uni.size;
  }

  /** What came next after `history` (tokens; START is assumed before the first). */
  next(history: string[], maxOrder: 1 | 2 | 3 = 3): NextWords {
    const h = [START, START, ...history];
    const a = h[h.length - 2], b = h[h.length - 1];
    let order: 1 | 2 | 3 = 1;
    let row: Map<string, number> | undefined;
    let context: string[] = [];
    if (maxOrder >= 3 && (row = this.tri.get(key(a, b)))) { order = 3; context = [a, b]; }
    else if (maxOrder >= 2 && (row = this.bi.get(b))) { order = 2; context = [b]; }
    else row = this.uni;
    const options = [...row].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
    let total = 0;
    for (const [, c] of options) total += c;
    return { order, context: context.filter((w) => w !== START), total, options };
  }

  /** Picks a next word in proportion to its count, using `rand` (a number in [0, 1)). */
  pick(n: NextWords, rand: number): string {
    let r = rand * n.total;
    for (const [w, c] of n.options) if ((r -= c) < 0) return w;
    return n.options[n.options.length - 1][0];
  }

  /** Continues `history` word by word until the end of a message or `maxWords`. */
  continue(history: string[], maxWords: number, rng: () => number, maxOrder: 1 | 2 | 3 = 3): string[] {
    const out: string[] = [];
    for (let i = 0; i < maxWords; i++) {
      const w = this.pick(this.next([...history, ...out], maxOrder), rng());
      if (w === END) break;
      out.push(w);
    }
    return out;
  }
}
