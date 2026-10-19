import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Store, STORAGE_KEY, type KV } from './store';

class FakeKV implements KV {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

describe('Store', () => {
  let kv: FakeKV;
  let store: Store;
  beforeEach(() => {
    kv = new FakeKV();
    store = new Store(kv);
  });

  it('creates then updates the same item', () => {
    const a = store.save({ title: 'A', calculator: 'graphing', state: { x: 1 } });
    const b = store.save({ id: a.id, title: 'A2', calculator: 'graphing', state: { x: 2 } });
    expect(b.id).toBe(a.id);
    expect(b.createdAt).toBe(a.createdAt);
    expect(store.list()).toHaveLength(1);
    expect(store.get(a.id)?.state).toEqual({ x: 2 });
  });

  it('lists newest first, renames, removes', () => {
    // Control the clock so save/rename timestamps never tie.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(1_000);
      const a = store.save({ title: 'A', calculator: 'matrix', state: 1 });
      vi.setSystemTime(2_000);
      const b = store.save({ title: 'B', calculator: 'matrix', state: 2 });
      expect(store.list().map((i) => i.id)).toEqual([b.id, a.id]);
      vi.setSystemTime(3_000);
      store.rename(a.id, '  Z ');
      expect(store.list()[0]!.title).toBe('Z');
      expect(store.remove(b.id)).toBe(true);
      expect(store.remove('nope')).toBe(false);
      expect(store.list()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops oversized thumbnails and survives corrupt data', () => {
    const a = store.save({ title: 'A', calculator: 'graphing', state: 1, thumbnail: 'x'.repeat(70000) });
    expect(a.thumbnail).toBeUndefined();
    kv.setItem(STORAGE_KEY, '{not json');
    expect(store.list()).toEqual([]);
  });

  it('imports and merges, skipping bad entries', () => {
    const a = store.save({ title: 'A', calculator: 'graphing', state: 1 });
    const res = store.importMerge([
      { id: 'n1', title: 'N', calculator: 'matrix', state: {}, createdAt: 1, updatedAt: 2 },
      { id: a.id, title: 'old', calculator: 'graphing', state: 0, createdAt: 1, updatedAt: 1 },
      { id: 'bad', calculator: 'nope', state: 1 },
      'junk',
    ]);
    expect(res).toEqual({ added: 1, updated: 0, skipped: 3 });
    expect(store.list()).toHaveLength(2);
  });

  it('propagates write failures', () => {
    const bad: KV = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => new Store(bad).save({ title: 'A', calculator: 'graphing', state: 1 })).toThrow();
  });
});
