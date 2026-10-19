import { describe, it, expect } from 'vitest';
import * as L from './linalg';
import { Fraction, parseNum, formatNum, type Matrix } from './linalg';
import { evaluate, type Value } from './expr';

const M = (rows: string[][]): Matrix => rows.map((r) => r.map((c) => parseNum(c)!));
const S = (m: Matrix): string[][] => m.map((r) => r.map(formatNum));

const A = M([['1', '2'], ['3', '4']]);
const lookup = (n: string): Matrix => {
  if (n === 'A') return A;
  if (n === 'B') return M([['0', '1'], ['1', '0']]);
  if (n === 'C') return M([['1', '2', '3'], ['4', '5', '6']]);
  throw new L.MatrixError('no ' + n);
};
const ev = (s: string): Value => evaluate(s, lookup);
const str = (s: string): string | string[][] => {
  const v = ev(s);
  return v.kind === 'scalar' ? formatNum(v.v) : S(v.m);
};

describe('fractions', () => {
  it('parses and normalizes', () => {
    expect(formatNum(parseNum('2/6')!)).toBe('1/3');
    expect(formatNum(parseNum('-1/3')!)).toBe('-1/3');
    expect(formatNum(parseNum('1/-3')!)).toBe('-1/3');
    expect(formatNum(parseNum('0.25')!)).toBe('1/4');
    expect(parseNum('abc')).toBeNull();
    expect(parseNum('1/0')).toBeNull();
  });
  it('arithmetic', () => {
    const t = new Fraction(1n, 3n);
    expect(t.add(new Fraction(1n, 6n)).toString()).toBe('1/2');
    expect(t.mul(new Fraction(3n)).toString()).toBe('1');
    expect(() => t.div(Fraction.of(0))).toThrow();
  });
});

describe('linalg', () => {
  it('det', () => {
    expect(formatNum(L.det(A))).toBe('-2');
    expect(formatNum(L.det(M([['2', '0', '1'], ['1', '3', '2'], ['1', '1', '1']])))).toBe('0');
    expect(formatNum(L.det(M([['0', '1'], ['1', '0']])))).toBe('-1');
    expect(formatNum(L.det(M([['1/2', '1/3'], ['1/4', '1/5']])))).toBe('1/60');
  });
  it('inverse', () => {
    expect(S(L.inverse(A))).toEqual([['-2', '1'], ['3/2', '-1/2']]);
    expect(S(L.mul(A, L.inverse(A)))).toEqual([['1', '0'], ['0', '1']]);
    expect(() => L.inverse(M([['1', '2'], ['2', '4']]))).toThrow("Matrix is singular");
    expect(() => L.inverse(C23())).toThrow('square');
  });
  it('rref and rank', () => {
    expect(S(L.rref(M([['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']])))).toEqual([
      ['1', '0', '-1'], ['0', '1', '2'], ['0', '0', '0'],
    ]);
    expect(L.rank(M([['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']]))).toBe(2);
    expect(L.rank(A)).toBe(2);
  });
  it('mul / add / dims', () => {
    expect(S(L.mul(A, A))).toEqual([['7', '10'], ['15', '22']]);
    expect(S(L.mul(C23(), L.transpose(C23())))).toEqual([['14', '32'], ['32', '77']]);
    expect(() => L.add(A, C23())).toThrow("Dimensions don't match");
  });
  it('power / trace / identity', () => {
    expect(S(L.power(A, 3))).toEqual([['37', '54'], ['81', '118']]);
    expect(S(L.power(A, -1))).toEqual(S(L.inverse(A)));
    expect(S(L.power(A, 0))).toEqual([['1', '0'], ['0', '1']]);
    expect(formatNum(L.trace(A))).toBe('5');
    expect(S(L.identity(2))).toEqual([['1', '0'], ['0', '1']]);
  });
});

function C23(): Matrix {
  return M([['1', '2', '3'], ['4', '5', '6']]);
}

describe('expressions', () => {
  it('basic', () => {
    expect(str('A*B')).toEqual([['2', '1'], ['4', '3']]);
    expect(str('A+B')).toEqual([['1', '3'], ['4', '4']]);
    expect(str('A-B')).toEqual([['1', '1'], ['2', '4']]);
    expect(str('2A')).toEqual([['2', '4'], ['6', '8']]);
    expect(str('A B')).toEqual(str('A*B'));
    expect(str('A^-1')).toEqual([['-2', '1'], ['3/2', '-1/2']]);
    expect(str('A^T')).toEqual([['1', '3'], ['2', '4']]);
    expect(str('transpose(A)')).toEqual([['1', '3'], ['2', '4']]);
    expect(str('Aᵀ')).toEqual([['1', '3'], ['2', '4']]);
    expect(str('A⁻¹')).toEqual(str('inv(A)'));
    expect(str('det(A)')).toBe('-2');
    expect(str('trace(A)')).toBe('5');
    expect(str('rank(A)')).toBe('2');
    expect(str('A^3')).toEqual([['37', '54'], ['81', '118']]);
    expect(str('I3')).toEqual([['1', '0', '0'], ['0', '1', '0'], ['0', '0', '1']]);
    expect(str('identity(2)+A')).toEqual([['2', '2'], ['3', '5']]);
    expect(str('rref(C)')).toEqual([['1', '0', '-1'], ['0', '1', '2']]);
    expect(str('A*inv(A)')).toEqual([['1', '0'], ['0', '1']]);
  });
  it('scalars', () => {
    expect(str('1/3+1/6')).toBe('1/2');
    expect(str('2^-2')).toBe('1/4');
    expect(str('-3*(2+1)')).toBe('-9');
    expect(str('det(A)/4')).toBe('-1/2');
    expect(str('A/2')).toEqual([['1/2', '1'], ['3/2', '2']]);
  });
  it('errors', () => {
    expect(() => ev('A*C*A')).toThrow("Dimensions don't match");
    expect(() => ev('inv(A*0)')).toThrow('singular');
    expect(() => ev('A+1')).toThrow();
    expect(() => ev('Z')).toThrow();
    expect(() => ev('A+')).toThrow();
    expect(() => ev('det(C)')).toThrow('square');
    expect(() => ev('1/0')).toThrow('Division by zero');
  });
});
