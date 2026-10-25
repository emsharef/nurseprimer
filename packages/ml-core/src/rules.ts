// Wick's rulebook (the Second Night): a tiny rule language, its parser and its evaluator.
//
//   # a comment
//   if "felt tip" -> can wait
//   if "glass" and any of "dont fade", "still there" -> urgent
//   if "rash" and not "fade" -> urgent
//   if "purpl*" -> urgent              (a trailing * matches the start of a word: purple, purply, purplish)
//   otherwise -> can wait
//
// Rules are read top to bottom and the first one that matches decides. A quoted phrase matches when its words
// appear next to each other in the message, after both are split into words the same way as everywhere else
// in the book (lowercase, apostrophes dropped, so "don't" is "dont"). With no matching rule, Wick says can wait.
import { tokenize } from './text.ts';

export type RuleLabel = 'urgent' | 'can_wait';

/** A phrase is a list of word patterns; a pattern ending in * matches any word that starts with it. */
export type Phrase = string[];

export interface Term {
  negate: boolean;
  /** The term holds when any of these phrases is in the message (one phrase unless written "any of"). */
  phrases: Phrase[];
}

export interface Rule {
  /** 1-based line in the source. */
  line: number;
  source: string;
  terms: Term[];
  label: RuleLabel;
}

export interface RuleError {
  line: number;
  message: string;
}

export interface ParsedRules {
  rules: Rule[];
  errors: RuleError[];
  /** The verdict when no rule matches: "otherwise", or can wait. */
  fallback: RuleLabel;
  /** Line of the "otherwise" rule, if any. */
  fallbackLine: number | null;
}

const LABELS: Record<string, RuleLabel> = { urgent: 'urgent', 'can wait': 'can_wait', can_wait: 'can_wait', wait: 'can_wait' };

function phrase(raw: string): Phrase | string {
  const words = raw
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^\p{L}\p{N}*]+/u)
    .filter(Boolean);
  if (!words.length) return 'This phrase has no words in it.';
  for (const w of words) if (w.indexOf('*') !== -1 && (w.indexOf('*') !== w.length - 1 || w.length < 2)) return `Put the * at the end of a word, like "purpl*".`;
  return words;
}

/** Splits a condition into quoted strings and bare words, keeping commas. */
function lex(s: string): { tokens: string[]; error?: string } {
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === '“' || c === '”') {
      const j = s.slice(i + 1).search(/["“”]/);
      if (j < 0) return { tokens, error: 'A quote is opened but never closed.' };
      tokens.push('"' + s.slice(i + 1, i + 1 + j));
      i += j + 2;
      continue;
    }
    if (c === ',') { tokens.push(','); i++; continue; }
    const m = s.slice(i).match(/^[^\s,"“”]+/)!;
    tokens.push(m[0].toLowerCase());
    i += m[0].length;
  }
  return { tokens };
}

function parseCondition(cond: string): { terms: Term[] } | { error: string } {
  const { tokens, error } = lex(cond);
  if (error) return { error };
  const terms: Term[] = [];
  let i = 0;
  const str = (): Phrase | { error: string } => {
    const t = tokens[i];
    if (t == null || t[0] !== '"') return { error: t == null ? 'Expected a word in quotes at the end.' : `Expected a word in quotes, found ${t}.` };
    i++;
    const p = phrase(t.slice(1));
    return typeof p === 'string' ? { error: p } : p;
  };
  while (i < tokens.length) {
    let negate = false;
    if (tokens[i] === 'not') { negate = true; i++; }
    const phrases: Phrase[] = [];
    if (tokens[i] === 'any' && tokens[i + 1] === 'of') {
      i += 2;
      for (;;) {
        const p = str();
        if (!Array.isArray(p)) return p;
        phrases.push(p);
        if (tokens[i] === ',') { i++; continue; }
        break;
      }
    } else {
      const p = str();
      if (!Array.isArray(p)) return p;
      phrases.push(p);
    }
    terms.push({ negate, phrases });
    if (i < tokens.length) {
      if (tokens[i] === 'and') { i++; if (i >= tokens.length) return { error: 'Nothing after "and".' }; continue; }
      if (tokens[i] === 'or') return { error: 'Use any of "a", "b" instead of or.' };
      return { error: `Expected "and" or "->", found ${tokens[i] === ',' ? 'a comma' : tokens[i]}.` };
    }
  }
  if (!terms.length) return { error: 'This rule has no condition.' };
  return { terms };
}

export function parseRules(src: string): ParsedRules {
  const rules: Rule[] = [];
  const errors: RuleError[] = [];
  let fallback: RuleLabel = 'can_wait';
  let fallbackLine: number | null = null;
  src.split('\n').forEach((raw, idx) => {
    const line = idx + 1;
    const source = raw.replace(/#.*$/, '').trim();
    if (!source) return;
    const arrow = source.search(/->|→/);
    if (arrow < 0) { errors.push({ line, message: 'Every rule needs an arrow, -> urgent or -> can wait.' }); return; }
    const head = source.slice(0, arrow).trim();
    const tail = source.slice(arrow + (source[arrow] === '→' ? 1 : 2)).trim().toLowerCase().replace(/\s+/g, ' ');
    const label = LABELS[tail];
    if (!label) { errors.push({ line, message: `After the arrow, write urgent or can wait${tail ? `, not "${tail}"` : ''}.` }); return; }
    if (/^otherwise$/i.test(head)) {
      if (fallbackLine == null) { fallback = label; fallbackLine = line; }
      return;
    }
    const m = head.match(/^if\s+(.*)$/is);
    if (!m) { errors.push({ line, message: 'Start a rule with if (or write otherwise -> …).' }); return; }
    const c = parseCondition(m[1]);
    if ('error' in c) { errors.push({ line, message: c.error }); return; }
    rules.push({ line, source, terms: c.terms, label });
  });
  return { rules, errors, fallback, fallbackLine };
}

function wordMatches(pattern: string, word: string): boolean {
  return pattern.endsWith('*') ? word.startsWith(pattern.slice(0, -1)) : word === pattern;
}

/** Does the phrase appear, word for word, somewhere in these words? */
export function hasPhrase(words: string[], p: Phrase): boolean {
  outer: for (let i = 0; i + p.length <= words.length; i++) {
    for (let j = 0; j < p.length; j++) if (!wordMatches(p[j], words[i + j])) continue outer;
    return true;
  }
  return false;
}

export function ruleMatches(rule: Rule, words: string[]): boolean {
  return rule.terms.every((t) => t.phrases.some((p) => hasPhrase(words, p)) !== t.negate);
}

export interface RuleVerdict {
  label: RuleLabel;
  /** The rule that decided, or null when none matched and the fallback answered. */
  rule: Rule | null;
}

export class Rulebook {
  parsed: ParsedRules;

  constructor(src: string) {
    this.parsed = parseRules(src);
  }

  get rules(): Rule[] {
    return this.parsed.rules;
  }

  classify(text: string): RuleVerdict {
    const words = tokenize(text);
    for (const r of this.parsed.rules) if (ruleMatches(r, words)) return { label: r.label, rule: r };
    return { label: this.parsed.fallback, rule: null };
  }

  /** A Ward Board prediction. Rules give a verdict with no confidence, so there is no pUrgent. */
  predict(text: string): { label: RuleLabel } {
    return { label: this.classify(text).label };
  }
}

/** Counts the rules in a source, the way the chapter counts them (the "otherwise" line included). */
export function countRules(src: string): number {
  const p = parseRules(src);
  return p.rules.length + (p.fallbackLine != null ? 1 : 0);
}
