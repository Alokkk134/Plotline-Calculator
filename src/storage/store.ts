// Pure persistence layer for saved items. Storage is injectable for tests.
import type { CalculatorId } from '../shell/types';
import type { SavedItem } from './index';

export const STORAGE_KEY = 'plotline.saved.v1';
export const CALCULATOR_IDS: readonly CalculatorId[] = ['graphing', 'scientific', 'four-function', 'matrix'];
export const MAX_THUMB_CHARS = 60_000;

export type KV = Pick<Storage, 'getItem' | 'setItem'>;

export function isCalculatorId(v: unknown): v is CalculatorId {
  return typeof v === 'string' && (CALCULATOR_IDS as readonly string[]).includes(v);
}

/** Returns a cleaned SavedItem or null when the shape is invalid. */
export function validateItem(raw: unknown): SavedItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (!isCalculatorId(r.calculator)) return null;
  if (!('state' in r)) return null;
  const now = Date.now();
  const item: SavedItem = {
    id: r.id,
    title: typeof r.title === 'string' && r.title.trim() ? r.title : 'Untitled Graph',
    calculator: r.calculator,
    state: r.state,
    createdAt: typeof r.createdAt === 'number' && isFinite(r.createdAt) ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'number' && isFinite(r.updatedAt) ? r.updatedAt : now,
  };
  if (typeof r.thumbnail === 'string' && r.thumbnail.length <= MAX_THUMB_CHARS) item.thumbnail = r.thumbnail;
  return item;
}

export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export class Store {
  constructor(private kv: KV) {}

  /** Throws on unreadable storage; corrupt JSON yields an empty list. */
  list(): SavedItem[] {
    const raw = this.kv.getItem(STORAGE_KEY);
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const out: SavedItem[] = [];
    for (const p of parsed) {
      const v = validateItem(p);
      if (v) out.push(v);
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private write(items: SavedItem[]): void {
    this.kv.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  get(id: string): SavedItem | undefined {
    return this.list().find((i) => i.id === id);
  }

  /** Create (no id / unknown id) or update an item. Returns the stored item. */
  save(input: {
    id?: string | null;
    title: string;
    calculator: CalculatorId;
    state: unknown;
    thumbnail?: string | undefined;
  }): SavedItem {
    const items = this.list();
    const now = Date.now();
    const idx = input.id ? items.findIndex((i) => i.id === input.id) : -1;
    const thumb = input.thumbnail && input.thumbnail.length <= MAX_THUMB_CHARS ? input.thumbnail : undefined;
    let item: SavedItem;
    if (idx >= 0) {
      const prev = items[idx]!;
      item = { ...prev, title: input.title, calculator: input.calculator, state: input.state, updatedAt: now };
      if (thumb) item.thumbnail = thumb;
      items[idx] = item;
    } else {
      item = {
        id: input.id || newId(),
        title: input.title,
        calculator: input.calculator,
        state: input.state,
        createdAt: now,
        updatedAt: now,
      };
      if (thumb) item.thumbnail = thumb;
      items.push(item);
    }
    this.write(items);
    return item;
  }

  rename(id: string, title: string): SavedItem | undefined {
    const items = this.list();
    const it = items.find((i) => i.id === id);
    if (!it) return undefined;
    it.title = title.trim() || 'Untitled Graph';
    it.updatedAt = Date.now();
    this.write(items);
    return it;
  }

  remove(id: string): boolean {
    const items = this.list();
    const next = items.filter((i) => i.id !== id);
    if (next.length === items.length) return false;
    this.write(next);
    return true;
  }

  /** Merge parsed JSON (array of items). Newer updatedAt wins on id clash. */
  importMerge(data: unknown): { added: number; updated: number; skipped: number } {
    const arr = Array.isArray(data) ? data : [];
    const items = this.list();
    const byId = new Map(items.map((i) => [i.id, i]));
    let added = 0;
    let updated = 0;
    let skipped = 0;
    for (const raw of arr) {
      const v = validateItem(raw);
      if (!v) {
        skipped++;
        continue;
      }
      const existing = byId.get(v.id);
      if (!existing) {
        byId.set(v.id, v);
        added++;
      } else if (v.updatedAt > existing.updatedAt) {
        byId.set(v.id, v);
        updated++;
      } else skipped++;
    }
    if (added || updated) this.write([...byId.values()]);
    return { added, updated, skipped };
  }
}
