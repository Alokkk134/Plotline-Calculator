import { describe, expect, it } from 'vitest';
import { evaluateLatex, formatNumber, type EvalOptions } from './index';

const rad: EvalOptions = { angleMode: 'rad' };
const deg: EvalOptions = { angleMode: 'deg' };
function ev(latex: string, opts: EvalOptions = rad): number {
  const r = evaluateLatex(latex, opts);
  if (!r.ok) throw new Error(`${latex}: ${r.error}`);
  return r.value;
}
const close = (latex: string, want: number, opts: EvalOptions = rad): void => {
  expect(ev(latex, opts)).toBeCloseTo(want, 9);
};

describe('parsing & arithmetic', () => {
  it('basic operators and precedence', () => {
    close('1+2\\cdot3', 7);
    close('2\\times3-4\\div2', 4);
    close('-2^2', -4);
    close('2^3^2', 512);
    close('2^{3}', 8);
    close('\\left(1+2\\right)\\cdot3', 9);
    close('10-3-2', 5);
    close('2^{-1}', 0.5);
    close('2^-1', 0.5);
  });
  it('fractions and roots', () => {
    close('\\frac{1}{2}+\\frac{3}{4}', 1.25);
    close('\\frac12', 0.5);
    close('\\sqrt{16}', 4);
    close('\\sqrt[3]{27}', 3);
    close('\\sqrt[3]{-8}', -2);
    close('\\sqrt{x}', 0, { ...rad, variables: { x: 0 } });
    close('\\frac{\\sqrt{9}}{\\frac{3}{2}}', 2);
  });
  it('constants, factorial, percent, abs', () => {
    close('\\pi', Math.PI);
    close('e', Math.E);
    close('e^{1}', Math.E);
    close('5!', 120);
    close('0!', 1);
    close('50\\%', 0.5);
    close('\\left|-3\\right|', 3);
    close('|-3|+|2|', 5);
    close('\\operatorname{abs}\\left(-4\\right)', 4);
    close('\\abs(-4)', 4);
    close('\\infty', Infinity);
  });
  it('spacing commands and placeholders', () => {
    close('1\\,+\\:2\\;+\\!3~+4', 10);
    expect(evaluateLatex('1+\\placeholder{}', rad).ok).toBe(false);
  });
  it('named functions', () => {
    close('\\operatorname{floor}\\left(2.7\\right)', 2);
    close('\\operatorname{ceil}(2.1)', 3);
    close('\\operatorname{round}(2.5)', 3);
    close('\\operatorname{sign}(-9)', -1);
    close('\\operatorname{mod}(-1,3)', 2);
    close('\\operatorname{min}(3,1,2)', 1);
    close('\\operatorname{max}(3,1,2)', 3);
    close('\\operatorname{nCr}(5,2)', 10);
    close('\\operatorname{nPr}(5,2)', 20);
    close('\\operatorname{gcd}(12,18)', 6);
    close('\\operatorname{lcm}(4,6)', 12);
    close('\\operatorname{cbrt}(27)', 3);
    close('\\operatorname{sqrt}(9)', 3);
    close('\\mathrm{floor}(2.5)', 2);
    close('mod(7,4)', 3);
    close('\\binom{5}{2}', 10);
    close('\\lfloor 2.5\\rfloor', 2);
  });
  it('logs and exp', () => {
    close('\\ln e', 1);
    close('\\log 100', 2);
    close('\\log_{2}8', 3);
    close('\\log_2\\left(8\\right)', 3);
    close('\\exp(0)', 1);
    close('\\ln\\left(e^2\\right)', 2);
  });
  it('errors do not throw', () => {
    for (const bad of ['', '1+', '(1', '\\frac{1}', '1/0', '\\foo', 'q', '\\sin', '1 ) 2']) {
      const r = evaluateLatex(bad, rad);
      expect(r.ok).toBe(false);
    }
  });
  it('trailing = is ignored', () => {
    close('2+2=', 4);
  });
  it('variables / ans', () => {
    close('\\operatorname{ans}+1', 6, { angleMode: 'rad', variables: { ans: 5 } });
    close('ans\\cdot2', 10, { angleMode: 'rad', variables: { ans: 5 } });
    expect(evaluateLatex('ans+1', rad).ok).toBe(false);
  });
});

describe('implicit multiplication', () => {
  const vars: EvalOptions = { angleMode: 'rad', variables: { x: 3, y: 4, a: 2 } };
  it('numbers and variables', () => {
    close('2x', 6, vars);
    close('xy', 12, vars);
    close('2xy', 24, vars);
    close('x2', 6, vars);
    close('2\\pi', 2 * Math.PI);
    close('\\pi x', 3 * Math.PI, vars);
    close('ax^2', 18, vars);
    close('-2x', -6, vars);
  });
  it('parentheses', () => {
    close('\\left(x+1\\right)\\left(x-1\\right)', 8, vars);
    close('2(3)', 6);
    close('3\\left(2\\right)^2', 12);
    close('x\\left(y+1\\right)', 15, vars);
  });
  it('functions without parentheses', () => {
    close('2\\sin x', 2 * Math.sin(3), vars);
    close('\\sin 2x', Math.sin(6), vars);
    close('\\sin x\\cos x', Math.sin(3) * Math.cos(3), vars);
    close('\\sin x+1', Math.sin(3) + 1, vars);
    close('\\sin x^2', Math.sin(9), vars);
    close('\\sin^2 x', Math.sin(3) ** 2, vars);
    close('\\sin^{2}\\left(x\\right)', Math.sin(3) ** 2, vars);
    close('\\sin^{-1}(0.5)', Math.asin(0.5));
    close('\\sin\\left(x\\right)\\cos\\left(x\\right)', Math.sin(3) * Math.cos(3), vars);
    close('\\ln 2x', Math.log(6), vars);
    close('\\sqrt{x}y', Math.sqrt(3) * 4, vars);
    close('\\frac{x}{2}y', 6, vars);
  });
  it('subscripted names are single variables', () => {
    close('a_{1}+a_2', 3, { angleMode: 'rad', variables: { a_1: 1, a_2: 2 } });
    close('x_{12}', 7, { angleMode: 'rad', variables: { x_12: 7 } });
    close('a_1b', 10, { angleMode: 'rad', variables: { a_1: 2, b: 5 } });
  });
});

describe('trig & angle mode', () => {
  it('radians', () => {
    close('\\sin\\left(\\frac{\\pi}{2}\\right)', 1);
    close('\\cos\\left(\\pi\\right)', -1);
    close('\\tan\\left(\\frac{\\pi}{4}\\right)', 1);
    expect(ev('\\sin\\left(\\pi\\right)')).toBe(0);
    close('\\sec 0', 1);
    close('\\csc\\left(\\frac{\\pi}{2}\\right)', 1);
    close('\\cot\\left(\\frac{\\pi}{4}\\right)', 1);
    close('\\arctan 1', Math.PI / 4);
    close('\\sinh 0', 0);
    close('\\cosh 0', 1);
    close('\\tanh 0', 0);
  });
  it('degrees', () => {
    close('\\sin\\left(30\\right)', 0.5, deg);
    expect(ev('\\sin\\left(180\\right)', deg)).toBe(0);
    expect(ev('\\cos\\left(90\\right)', deg)).toBe(0);
    close('\\cos\\left(60\\right)', 0.5, deg);
    close('\\tan\\left(45\\right)', 1, deg);
    close('\\arcsin\\left(0.5\\right)', 30, deg);
    close('\\arccos\\left(0.5\\right)', 60, deg);
    close('\\arctan\\left(1\\right)', 45, deg);
    close('\\sin^{-1}\\left(1\\right)', 90, deg);
    expect(evaluateLatex('\\tan 90', deg).ok).toBe(false);
  });
  it('degree symbol works in any mode', () => {
    close('\\sin\\left(30^\\circ\\right)', 0.5, rad);
    close('\\sin\\left(30^{\\circ}\\right)', 0.5, rad);
  });
});

describe('formatNumber', () => {
  it('basic', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(1 / 3)).toBe('0.3333333333');
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(-2.5)).toBe('-2.5');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(1e-7 * 0)).toBe('0');
    expect(formatNumber(123456789012 - 1)).toBe('123456789000');
    expect(formatNumber(Math.PI)).toBe('3.141592654');
  });
  it('specials', () => {
    expect(formatNumber(NaN)).toBe('undefined');
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(-Infinity)).toBe('-∞');
  });
  it('scientific', () => {
    expect(formatNumber(1.2345e12)).toBe('1.2345×10¹²');
    expect(formatNumber(-1e15)).toBe('-1×10¹⁵');
    expect(formatNumber(1.5e-7)).toBe('1.5×10⁻⁷');
    expect(formatNumber(0.000001)).toBe('0.000001');
    expect(formatNumber(999999999999.9)).toBe('1×10¹²');
    expect(formatNumber(2e-10)).toBe('2×10⁻¹⁰');
  });
});
