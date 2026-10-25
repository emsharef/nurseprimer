import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load, saveModel, setTrack, reset, saveRogue, removeRogue } from '../src/index.ts';

describe('notebook', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    reset();
  });

  it('starts empty and works with no localStorage at all', () => {
    expect(load()).toEqual({ schema: 1, track: null, models: [] });
    setTrack('nurse');
    expect(load().track).toBe('nurse');
  });

  it('survives a localStorage that throws on every call', () => {
    const boom = () => { throw new Error('SecurityError'); };
    vi.stubGlobal('localStorage', { getItem: boom, setItem: boom, removeItem: boom });
    setTrack('coder');
    expect(load().track).toBe('coder');
  });

  it('ignores corrupt stored data', () => {
    const store = new Map([['primer.notebook.v1', '{not json']]);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    expect(load().models).toEqual([]);
  });

  it('replaces a model saved under the same id', () => {
    saveModel({ id: 'm', name: 'first', chapter: 5, scores: {} });
    saveModel({ id: 'm', name: 'second', chapter: 5, scores: {} });
    expect(load().models.map((m) => m.name)).toEqual(['second']);
  });

  it('keeps rogues once each and can remove them', () => {
    saveRogue({ text: 'she stopped breathing but is fine now', truth: 'urgent', fooled: 'Wick (night 3)' });
    saveRogue({ text: 'she stopped breathing but is fine now ', truth: 'urgent', fooled: 'Wick (night 3)' });
    const nb = load();
    expect(nb.rogues).toHaveLength(1);
    removeRogue(nb.rogues![0].id);
    expect(load().rogues).toHaveLength(0);
  });
});
