// Self-contained exact/float linear algebra for the Matrix calculator.

export class MatrixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MatrixError';
  }
}

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}

export class Fraction {
  readonly n: bigint;
  readonly d: bigint;
  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new MatrixError('Division by zero');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }
  static of(n: number | bigint): Fraction {
    return new Fraction(BigInt(n));
  }
  add(o: Fraction): Fraction { return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o: Fraction): Fraction { return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o: Fraction): Fraction { return new Fraction(this.n * o.n, this.d * o.d); }
  div(o: Fraction): Fraction {
    if (o.n === 0n) throw new MatrixError('Division by zero');
    return new Fraction(this.n * o.d, this.d * o.n);
  }
  neg(): Fraction { return new Fraction(-this.n, this.d); }
  isZero(): boolean { return this.n === 0n; }
  isInteger(): boolean { return this.d === 1n; }
  eq(o: Fraction): boolean { return this.n === o.n && this.d === o.d; }
  toNumber(): number {
    const r = Number(this.n) / Number(this.d);
    if (Number.isFinite(r)) return r;
    const shift = BigInt(Math.max(this.n.toString().length, this.d.toString().length) - 300);
    const p = 10n ** (shift > 0n ? shift : 0n);
    return Number(this.n / p) / Number(this.d / p);
  }
  toString(): string {
    return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`;
  }
}

/** A scalar is an exact fraction, or a float when exactness is impossible. */
export type Num = Fraction | number;
export type Matrix = Num[][];

const EPS = 1e-12;
export const toFloat = (x: Num): number => (x instanceof Fraction ? x.toNumber() : x);
export function numIsZero(x: Num): boolean {
  return x instanceof Fraction ? x.isZero() : Math.abs(x) < EPS;
}
export function numAdd(a: Num, b: Num): Num {
  return a instanceof Fraction && b instanceof Fraction ? a.add(b) : toFloat(a) + toFloat(b);
}
export function numSub(a: Num, b: Num): Num {
  return a instanceof Fraction && b instanceof Fraction ? a.sub(b) : toFloat(a) - toFloat(b);
}
export function numMul(a: Num, b: Num): Num {
  return a instanceof Fraction && b instanceof Fraction ? a.mul(b) : toFloat(a) * toFloat(b);
}
export function numDiv(a: Num, b: Num): Num {
  if (numIsZero(b)) throw new MatrixError('Division by zero');
  return a instanceof Fraction && b instanceof Fraction ? a.div(b) : toFloat(a) / toFloat(b);
}
export function numNeg(a: Num): Num {
  return a instanceof Fraction ? a.neg() : -a;
}
export function numPow(a: Num, b: Num): Num {
  if (a instanceof Fraction && b instanceof Fraction && b.isInteger() && b.n >= -2000n && b.n <= 2000n) {
    const e = b.n < 0n ? -b.n : b.n;
    if (a.isZero() && b.n < 0n) throw new MatrixError('Division by zero');
    const p = new Fraction(a.n ** e, a.d ** e);
    return b.n < 0n ? Fraction.of(1).div(p) : p;
  }
  const r = Math.pow(toFloat(a), toFloat(b));
  if (!Number.isFinite(r)) throw new MatrixError('Result is not a real number');
  return r;
}

export const ZERO = Fraction.of(0);
export const ONE = Fraction.of(1);

export function formatNum(x: Num): string {
  if (x instanceof Fraction) return x.toString();
  if (Object.is(x, -0)) return '0';
  if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
  return String(Number(x.toPrecision(10)));
}

/** Parse a cell/number string: integers, decimals, fractions ("-1/3"). Returns null if invalid. */
export function parseNum(text: string): Num | null {
  const s = text.trim().replace(/−/g, '-').replace(/\s+/g, '');
  if (!s) return null;
  const m = /^([+-]?)(\d+\.?\d*|\.\d+)(?:\/([+-]?)(\d+\.?\d*|\.\d+))?$/.exec(s);
  if (m) {
    const dec = (t: string): Fraction => {
      const [i = '', f = ''] = t.split('.');
      return new Fraction(BigInt((i || '0') + f), 10n ** BigInt(f.length));
    };
    let v = dec(m[2]!);
    if (m[1] === '-') v = v.neg();
    if (m[4] !== undefined) {
      const den = dec(m[4]);
      if (den.isZero()) return null;
      v = v.div(m[3] === '-' ? den.neg() : den);
    }
    return v;
  }
  if (/^[+-]?(\d+\.?\d*|\.\d+)e[+-]?\d+$/i.test(s)) {
    const f = Number(s);
    return Number.isFinite(f) ? f : null;
  }
  return null;
}

export const rowsOf = (m: Matrix): number => m.length;
export const colsOf = (m: Matrix): number => m[0]?.length ?? 0;
const sameDims = (a: Matrix, b: Matrix): boolean => rowsOf(a) === rowsOf(b) && colsOf(a) === colsOf(b);
const clone = (m: Matrix): Matrix => m.map((r) => r.slice());

function requireSquare(m: Matrix): void {
  if (rowsOf(m) !== colsOf(m)) throw new MatrixError('Matrix must be square');
}

export function add(a: Matrix, b: Matrix): Matrix {
  if (!sameDims(a, b)) throw new MatrixError("Dimensions don't match");
  return a.map((r, i) => r.map((v, j) => numAdd(v, b[i]![j]!)));
}
export function sub(a: Matrix, b: Matrix): Matrix {
  if (!sameDims(a, b)) throw new MatrixError("Dimensions don't match");
  return a.map((r, i) => r.map((v, j) => numSub(v, b[i]![j]!)));
}
export function scale(a: Matrix, k: Num): Matrix {
  return a.map((r) => r.map((v) => numMul(v, k)));
}
export function mul(a: Matrix, b: Matrix): Matrix {
  if (colsOf(a) !== rowsOf(b)) throw new MatrixError("Dimensions don't match");
  const n = rowsOf(a), p = colsOf(b), k = colsOf(a);
  const out: Matrix = [];
  for (let i = 0; i < n; i++) {
    const row: Num[] = [];
    for (let j = 0; j < p; j++) {
      let s: Num = ZERO;
      for (let t = 0; t < k; t++) s = numAdd(s, numMul(a[i]![t]!, b[t]![j]!));
      row.push(s);
    }
    out.push(row);
  }
  return out;
}
export function identity(n: number): Matrix {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j): Num => (i === j ? ONE : ZERO)));
}
export function transpose(a: Matrix): Matrix {
  return Array.from({ length: colsOf(a) }, (_, j) => a.map((r) => r[j]!));
}
export function trace(a: Matrix): Num {
  requireSquare(a);
  let s: Num = ZERO;
  for (let i = 0; i < a.length; i++) s = numAdd(s, a[i]![i]!);
  return s;
}

function pickPivot(m: Matrix, col: number, from: number): number {
  let best = -1;
  let bestAbs = 0;
  for (let r = from; r < m.length; r++) {
    const v = m[r]![col]!;
    if (numIsZero(v)) continue;
    if (v instanceof Fraction) return r;
    if (Math.abs(v) > bestAbs) {
      bestAbs = Math.abs(v);
      best = r;
    }
  }
  return best;
}

export function det(a: Matrix): Num {
  requireSquare(a);
  const m = clone(a);
  const n = m.length;
  let d: Num = ONE;
  for (let c = 0; c < n; c++) {
    const p = pickPivot(m, c, c);
    if (p < 0) return ZERO;
    if (p !== c) {
      [m[p], m[c]] = [m[c]!, m[p]!];
      d = numNeg(d);
    }
    const pv = m[c]![c]!;
    d = numMul(d, pv);
    for (let r = c + 1; r < n; r++) {
      const f = numDiv(m[r]![c]!, pv);
      if (numIsZero(f)) continue;
      for (let k = c; k < n; k++) m[r]![k] = numSub(m[r]![k]!, numMul(f, m[c]![k]!));
    }
  }
  return d;
}

/** Gauss-Jordan reduction over the first `limitCols` columns. */
function reduce(a: Matrix, limitCols: number): { m: Matrix; pivots: number[] } {
  const m = clone(a);
  const pivots: number[] = [];
  let row = 0;
  for (let c = 0; c < limitCols && row < m.length; c++) {
    const p = pickPivot(m, c, row);
    if (p < 0) continue;
    [m[p], m[row]] = [m[row]!, m[p]!];
    const pv = m[row]![c]!;
    m[row] = m[row]!.map((v) => numDiv(v, pv));
    for (let r = 0; r < m.length; r++) {
      if (r === row) continue;
      const f = m[r]![c]!;
      if (numIsZero(f)) continue;
      const pr = m[row]!;
      m[r] = m[r]!.map((v, k) => numSub(v, numMul(f, pr[k]!)));
    }
    pivots.push(c);
    row++;
  }
  return { m, pivots };
}

export function rref(a: Matrix): Matrix {
  return reduce(a, colsOf(a)).m;
}
export function rank(a: Matrix): number {
  return reduce(a, colsOf(a)).pivots.length;
}
export function inverse(a: Matrix): Matrix {
  requireSquare(a);
  const n = a.length;
  const id = identity(n);
  const aug = a.map((r, i) => [...r, ...id[i]!]);
  const { m, pivots } = reduce(aug, n);
  if (pivots.length < n) throw new MatrixError('Matrix is singular');
  return m.map((r) => r.slice(n));
}
export function power(a: Matrix, e: number): Matrix {
  requireSquare(a);
  if (!Number.isInteger(e)) throw new MatrixError('Matrix exponent must be an integer');
  if (Math.abs(e) > 1000) throw new MatrixError('Exponent too large');
  let base = e < 0 ? inverse(a) : a;
  let k = Math.abs(e);
  let result = identity(a.length);
  while (k > 0) {
    if (k & 1) result = mul(result, base);
    k >>= 1;
    if (k) base = mul(base, base);
  }
  return result;
}
