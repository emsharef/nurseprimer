import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module
import { audit } from '../citation-audit.mjs';

const ok = `references:
  a2020:
    authors: A
    year: 2020
    title: T
    doi: 10.1/x
    verified: { by: me, on: 2026-10-25, scope: claim }
`;

describe('citation audit', () => {
  it('passes a clean chapter', () => {
    const r = audit({ yamlText: ok, chapters: [{ file: 'c.mdx', text: 'x<Cite k="a2020" />y<NoteRef id="n" /><NoteDef id="n">z</NoteDef>' }] });
    expect(r.errors).toEqual([]);
  });
  it('fails on an uncited reference', () => {
    expect(audit({ yamlText: ok, chapters: [{ file: 'c.mdx', text: '' }] }).errors.join()).toMatch(/never cited/);
  });
  it('fails on a missing key', () => {
    const r = audit({ yamlText: ok, chapters: [{ file: 'c.mdx', text: '<Cite k="a2020" /><Cite k="nope" />' }] });
    expect(r.errors.join()).toMatch(/"nope", which is not in citations.yaml/);
  });
  it('fails on a note with no anchor, and an anchor with no note', () => {
    const r = audit({ yamlText: ok, chapters: [{ file: 'c.mdx', text: '<Cite k="a2020" /><NoteDef id="orphan">x</NoteDef><NoteRef id="lost" />' }] });
    expect(r.errors.join()).toMatch(/refers to text that doesn't exist/);
    expect(r.errors.join()).toMatch(/"lost" has no NoteDef/);
  });
  it('ignores citations inside MDX comments', () => {
    const r = audit({ yamlText: ok, chapters: [{ file: 'c.mdx', text: '{/* <Cite k="a2020" /> */}' }] });
    expect(r.errors.join()).toMatch(/never cited/);
  });
  it('fails on a figure with no page or table', () => {
    const y = ok + '    figures:\n      - { value: "94%" }\n';
    const r = audit({ yamlText: y, chapters: [{ file: 'c.mdx', text: '<Cite k="a2020" />' }] });
    expect(r.errors.join()).toMatch(/records no page or table/);
  });
  it('requires claim-level verification only in release mode', () => {
    const y = ok.replace('scope: claim', 'scope: metadata');
    const chapters = [{ file: 'c.mdx', text: '<Cite k="a2020" />' }];
    expect(audit({ yamlText: y, chapters }).errors).toEqual([]);
    expect(audit({ yamlText: y, chapters, release: true }).errors.join()).toMatch(/metadata only/);
  });
});
