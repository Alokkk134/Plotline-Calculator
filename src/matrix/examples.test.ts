// Every Matrix example must produce its expected result.
import { describe, expect, it } from 'vitest';
import { safeEvaluate } from './expr';
import { MatrixError, formatNum, parseNum, type Matrix } from './linalg';
import { MATRIX_EXAMPLES, fill } from './examples';

describe('matrix examples', () => {
  it('has enough examples', () => expect(MATRIX_EXAMPLES.length).toBeGreaterThanOrEqual(10));

  it.each(MATRIX_EXAMPLES.map((e) => [e.name, e] as const))('%s', (_n, ex) => {
    const names = ex.matrices.map((_, i) => 'AB'[i]!);
    const lookup = (name: string): Matrix => {
      const rows = ex.matrices[names.indexOf(name)];
      if (!rows) throw new MatrixError(`no ${name}`);
      return rows.map((r) => r.map((c) => parseNum(c)!));
    };
    const r = safeEvaluate(fill(ex.expr, names), lookup);
    expect(r.ok, r.ok ? '' : r.error).toBe(true);
    if (!r.ok) return;
    const got = r.value.kind === 'scalar' ? formatNum(r.value.v) : r.value.m.map((row) => row.map(formatNum));
    expect(got).toEqual(ex.expect);
  });
});
