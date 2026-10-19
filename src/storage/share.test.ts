import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare, readShareParam, stripShareParam } from './share';

describe('share', () => {
  it('round trips unicode state', async () => {
    const p = { c: 'graphing' as const, t: 'Ünï ✓ 图', s: { exprs: ['y=x^2', 'π'], n: [1, 2.5] } };
    const enc = await encodeShare(p);
    expect(enc).toMatch(/^[zr][A-Za-z0-9_-]+$/);
    expect(await decodeShare(enc)).toEqual(p);
  });

  it('rejects malformed data', async () => {
    expect(await decodeShare('')).toBeNull();
    expect(await decodeShare('zAAAA')).toBeNull();
    expect(await decodeShare('r!!!')).toBeNull();
    const bad = 'r' + btoa(JSON.stringify({ c: 'x', s: 1 })).replace(/=+$/, '');
    expect(await decodeShare(bad)).toBeNull();
  });

  it('reads and strips hash param', () => {
    expect(readShareParam('#/graphing?s=abc')).toBe('abc');
    expect(readShareParam('#/graphing')).toBeNull();
    expect(stripShareParam('#/graphing?s=abc')).toBe('#/graphing');
    expect(stripShareParam('#/graphing?a=1&s=abc')).toBe('#/graphing?a=1');
  });
});
