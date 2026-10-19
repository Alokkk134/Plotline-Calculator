// Numeric helpers and the table of built-in functions.
import type { AngleMode } from './types';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function gamma(x: number): number {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  x -= 1;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  let a = c[0]!;
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i]! / (x + i);
  return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
}

export function factorial(n: number): number {
  if (Number.isNaN(n)) return NaN;
  if (Number.isInteger(n)) {
    if (n < 0) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
  return gamma(n + 1);
}

/** Power that supports odd roots of negative numbers, e.g. (-8)^(1/3) = -2. */
export function powSafe(a: number, b: number): number {
  if (a >= 0 || Number.isInteger(b) || !Number.isFinite(b)) return Math.pow(a, b);
  for (let q = 3; q <= 99; q += 2) {
    const p = b * q;
    const rp = Math.round(p);
    if (Math.abs(p - rp) < 1e-9 * q) {
      const r = Math.pow(-a, b);
      return Math.abs(rp) % 2 === 0 ? r : -r;
    }
  }
  return NaN;
}

function div(a: number, b: number): number {
  return b === 0 ? NaN : a / b;
}

function gcd2(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function nCr(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) return NaN;
  r = Math.min(r, n - r);
  let res = 1;
  for (let i = 1; i <= r; i++) res = (res * (n - r + i)) / i;
  return Math.round(res);
}

function nPr(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) return NaN;
  let res = 1;
  for (let i = n - r + 1; i <= n; i++) res *= i;
  return res;
}

function snap(res: number, x: number): number {
  return Math.abs(res) < 1e-15 && Math.abs(x) > 1e-3 ? 0 : res;
}

export type Impl = (...args: number[]) => number;
export interface Builtin {
  min: number;
  max: number;
  fn: Impl;
}

const b = (min: number, max: number, fn: Impl): Builtin => ({ min, max, fn });
const u = (fn: (x: number) => number): Builtin => b(1, 1, fn);

function build(angle: AngleMode): Record<string, Builtin> {
  const deg = angle === 'deg';
  const m360 = (x: number): number => {
    const r = x % 360;
    return r < 0 ? r + 360 : r;
  };
  const sin = deg
    ? (x: number): number => {
        const r = m360(x);
        if (r === 0 || r === 180) return 0;
        if (r === 90) return 1;
        if (r === 270) return -1;
        return Math.sin(r * D2R);
      }
    : (x: number): number => snap(Math.sin(x), x);
  const cos = deg
    ? (x: number): number => {
        const r = m360(x);
        if (r === 90 || r === 270) return 0;
        if (r === 0) return 1;
        if (r === 180) return -1;
        return Math.cos(r * D2R);
      }
    : (x: number): number => snap(Math.cos(x), x);
  const tan = deg
    ? (x: number): number => {
        const r = m360(x) % 180;
        if (r === 0) return 0;
        if (r === 90) return NaN;
        return Math.tan(r * D2R);
      }
    : (x: number): number => snap(Math.tan(x), x);
  const out = deg ? (v: number): number => v * R2D : (v: number): number => v;

  return {
    sin: u(sin),
    cos: u(cos),
    tan: u(tan),
    sec: u((x) => div(1, cos(x))),
    csc: u((x) => div(1, sin(x))),
    cot: u((x) => div(cos(x), sin(x))),
    arcsin: u((x) => out(Math.asin(x))),
    arccos: u((x) => out(Math.acos(x))),
    arctan: b(1, 2, (y, x) => out(x === undefined ? Math.atan(y) : Math.atan2(y, x))),
    arcsec: u((x) => out(Math.acos(div(1, x)))),
    arccsc: u((x) => out(Math.asin(div(1, x)))),
    arccot: u((x) => out(Math.PI / 2 - Math.atan(x))),
    sinh: u(Math.sinh),
    cosh: u(Math.cosh),
    tanh: u(Math.tanh),
    sech: u((x) => 1 / Math.cosh(x)),
    csch: u((x) => div(1, Math.sinh(x))),
    coth: u((x) => div(1, Math.tanh(x))),
    arcsinh: u(Math.asinh),
    arccosh: u(Math.acosh),
    arctanh: u(Math.atanh),
    ln: u(Math.log),
    log: u(Math.log10),
    logb: b(2, 2, (x, base) => Math.log(x) / Math.log(base)),
    exp: u(Math.exp),
    sqrt: u(Math.sqrt),
    cbrt: u(Math.cbrt),
    root: b(2, 2, (x, n) => (x < 0 && Number.isInteger(n) && n % 2 !== 0 ? -Math.pow(-x, 1 / n) : powSafe(x, 1 / n))),
    abs: u(Math.abs),
    floor: u(Math.floor),
    ceil: u(Math.ceil),
    round: b(1, 2, (x, n) => {
      if (n === undefined) return Math.round(x);
      const f = Math.pow(10, n);
      return Math.round(x * f) / f;
    }),
    sign: u(Math.sign),
    trunc: u(Math.trunc),
    factorial: u(factorial),
    mod: b(2, 2, (a, bb) => (bb === 0 ? NaN : a - bb * Math.floor(a / bb))),
    min: b(1, Infinity, Math.min),
    max: b(1, Infinity, Math.max),
    nCr: b(2, 2, nCr),
    nPr: b(2, 2, nPr),
    gcd: b(2, Infinity, (...a) => a.reduce((p, c) => gcd2(p, c))),
    lcm: b(2, Infinity, (...a) =>
      a.reduce((p, c) => {
        const g = gcd2(p, c);
        return g === 0 ? 0 : Math.abs(p * c) / g;
      }),
    ),
  };
}

const cache: Partial<Record<AngleMode, Record<string, Builtin>>> = {};
export function getBuiltins(angle: AngleMode): Record<string, Builtin> {
  return (cache[angle] ??= build(angle));
}

const ALIASES: Record<string, string> = {
  lg: 'log', sgn: 'sign', ceiling: 'ceil', arsinh: 'arcsinh', arcosh: 'arccosh', artanh: 'arctanh',
  asin: 'arcsin', acos: 'arccos', atan: 'arctan', signum: 'sign',
};

export function canonicalFunc(name: string): string {
  return ALIASES[name] ?? name;
}

const NAMES = new Set(Object.keys(getBuiltins('rad')));
export function isFuncName(name: string): boolean {
  return NAMES.has(canonicalFunc(name));
}

/** Trig functions whose ^{-1} means the inverse function. */
export const INVERSE_OF: Record<string, string> = {
  sin: 'arcsin', cos: 'arccos', tan: 'arctan', sec: 'arcsec', csc: 'arccsc', cot: 'arccot',
  sinh: 'arcsinh', cosh: 'arccosh', tanh: 'arctanh',
};
