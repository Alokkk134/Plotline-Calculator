// Every Scientific and Four Function example must evaluate to its expected result.
import { describe, expect, it } from 'vitest';
import { evaluateLatex } from '../math';
import { FOUR_FUNCTION_EXAMPLES } from '../fourfunction/examples';
import type { CalcExample } from './calc';
import { SCIENTIFIC_EXAMPLES } from './examples';

const check = (ex: CalcExample): void => {
  const r = evaluateLatex(ex.latex, { angleMode: ex.angleMode ?? 'rad', variables: { ans: 0 } });
  expect(r, ex.latex).toEqual({ ok: true, value: expect.any(Number) });
  if (r.ok) expect(r.value).toBeCloseTo(ex.expect, 9);
};

describe('calculator examples', () => {
  it('has enough examples', () => {
    expect(SCIENTIFIC_EXAMPLES.length).toBeGreaterThanOrEqual(10);
    expect(FOUR_FUNCTION_EXAMPLES.length).toBeGreaterThanOrEqual(10);
  });
  it.each(SCIENTIFIC_EXAMPLES.map((e) => [e.name, e] as const))('scientific: %s', (_n, ex) => check(ex));
  it.each(FOUR_FUNCTION_EXAMPLES.map((e) => [e.name, e] as const))('four function: %s', (_n, ex) => check(ex));
});
