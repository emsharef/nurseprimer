import { describe, expect, it } from 'vitest';
import { Rulebook, parseRules, hasPhrase, countRules } from '../src/index.ts';

describe('parseRules', () => {
  it('reads rules, comments and otherwise', () => {
    const p = parseRules(`# a comment
if "felt tip" -> can wait
if "glass" and any of "dont fade", "still there" -> urgent
if "rash" and not "fade" -> urgent   # trailing comment
otherwise -> can wait`);
    expect(p.errors).toEqual([]);
    expect(p.rules.length).toBe(3);
    expect(p.rules[0]).toMatchObject({ line: 2, label: 'can_wait', terms: [{ negate: false, phrases: [['felt', 'tip']] }] });
    expect(p.rules[1].terms[1].phrases).toEqual([['dont', 'fade'], ['still', 'there']]);
    expect(p.rules[2].terms[1].negate).toBe(true);
    expect(p.fallbackLine).toBe(5);
  });

  it('accepts a few spellings of the verdict and the arrow', () => {
    const p = parseRules('if "a" → urgent\nif "b" -> can_wait\nif "c" -> Can  Wait');
    expect(p.errors).toEqual([]);
    expect(p.rules.map((r) => r.label)).toEqual(['urgent', 'can_wait', 'can_wait']);
  });

  it('reports mistakes by line and skips those lines', () => {
    const p = parseRules('if "glass -> urgent\nif glass -> urgent\nif "a" urgent\nif "a" -> soon\nif "a" or "b" -> urgent\nwhen "a" -> urgent\nif "a" and -> urgent\nif "*a" -> urgent\nif "ok" -> urgent');
    expect(p.errors.map((e) => e.line)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(p.rules.length).toBe(1);
    for (const e of p.errors) expect(e.message.length).toBeGreaterThan(5);
  });

  it('counts rules including otherwise', () => {
    expect(countRules('if "a" -> urgent\n# no\notherwise -> can wait')).toBe(2);
  });
});

describe('matching', () => {
  it('matches whole words and phrases, with apostrophes dropped', () => {
    expect(hasPhrase(['they', 'dont', 'fade'], ['dont', 'fade'])).toBe(true);
    expect(hasPhrase(['dont', 'really', 'fade'], ['dont', 'fade'])).toBe(false);
    expect(hasPhrase(['purplish'], ['purple'])).toBe(false);
    expect(hasPhrase(['purplish'], ['purpl*'])).toBe(true);
  });

  it('uses the first rule that matches, then otherwise', () => {
    const rb = new Rulebook('if "felt tip" -> can wait\nif "purple" -> urgent\notherwise -> can wait');
    expect(rb.classify("Purple marks, but it's felt tip").rule?.line).toBe(1);
    expect(rb.classify('purple spots').label).toBe('urgent');
    expect(rb.classify('a cough')).toEqual({ label: 'can_wait', rule: null });
    expect(rb.classify("They DON'T fade").label).toBe('can_wait');
    expect(new Rulebook('if "dont" -> urgent').classify("They DON'T fade").label).toBe('urgent');
  });

  it('handles not and any of', () => {
    const rb = new Rulebook('if any of "rash", "spots" and not "fade*" -> urgent');
    expect(rb.predict('a rash on her legs').label).toBe('urgent');
    expect(rb.predict('spots that fade').label).toBe('can_wait');
    expect(rb.predict('spots that faded').label).toBe('can_wait');
    expect(rb.predict('a cough').label).toBe('can_wait');
  });

  it('can make urgent the fallback', () => {
    expect(new Rulebook('if "fine" -> can wait\notherwise -> urgent').predict('help').label).toBe('urgent');
  });
});
