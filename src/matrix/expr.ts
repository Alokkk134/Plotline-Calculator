import * as L from './linalg';
import { MatrixError, type Matrix, type Num } from './linalg';

export type Value = { kind: 'scalar'; v: Num } | { kind: 'matrix'; m: Matrix };
/** Resolve a matrix by name; throws MatrixError if unknown or invalid. */
export type Lookup = (name: string) => Matrix;

type Tok =
  | { t: 'num'; v: Num }
  | { t: 'mat'; s: string }
  | { t: 'id'; n: number }
  | { t: 'fn'; s: string }
  | { t: 'op'; s: string }
  | { t: 'post'; s: 'inv' | 'T' }
  | { t: 'end' };

const OP_ALIASES: Record<string, string> = {
  '−': '-', '–': '-', '×': '*', '·': '*', '÷': '/',
};

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === '⁻' && src[i + 1] === '¹') { out.push({ t: 'post', s: 'inv' }); i += 2; continue; }
    if (c === 'ᵀ') { out.push({ t: 'post', s: 'T' }); i++; continue; }
    const rest = src.slice(i);
    const num = /^(\d+\.?\d*|\.\d+)/.exec(rest);
    if (num) {
      out.push({ t: 'num', v: L.parseNum(num[1]!)! });
      i += num[1]!.length;
      continue;
    }
    if (/[A-Z]/.test(c)) {
      const idm = c === 'I' ? /^I(\d+)/.exec(rest) : null;
      if (idm) {
        out.push({ t: 'id', n: Number(idm[1]) });
        i += idm[0].length;
      } else {
        out.push({ t: 'mat', s: c });
        i++;
      }
      continue;
    }
    if (/[a-z]/.test(c)) {
      const w = /^[a-z]+/.exec(rest)![0];
      i += w.length;
      if (w === 'pi') out.push({ t: 'num', v: Math.PI });
      else out.push({ t: 'fn', s: w });
      continue;
    }
    const op = OP_ALIASES[c] ?? c;
    if ('+-*/^(),'.includes(op)) { out.push({ t: 'op', s: op }); i++; continue; }
    throw new MatrixError(`Unexpected character "${c}"`);
  }
  out.push({ t: 'end' });
  return out;
}

const scalar = (v: Num): Value => ({ kind: 'scalar', v });
const matrix = (m: Matrix): Value => ({ kind: 'matrix', m });

function needMatrix(v: Value, fn: string): Matrix {
  if (v.kind !== 'matrix') throw new MatrixError(`${fn} needs a matrix`);
  return v.m;
}

function toInt(v: Value, what: string): number {
  if (v.kind === 'scalar') {
    const f = L.toFloat(v.v);
    if (Number.isInteger(f)) return f;
  }
  throw new MatrixError(`${what} must be an integer`);
}

function addV(a: Value, b: Value, subtract: boolean): Value {
  if (a.kind === 'scalar' && b.kind === 'scalar') return scalar(subtract ? L.numSub(a.v, b.v) : L.numAdd(a.v, b.v));
  if (a.kind === 'matrix' && b.kind === 'matrix') return matrix(subtract ? L.sub(a.m, b.m) : L.add(a.m, b.m));
  throw new MatrixError(`Can't ${subtract ? 'subtract' : 'add'} a number and a matrix`);
}
function mulV(a: Value, b: Value): Value {
  if (a.kind === 'scalar' && b.kind === 'scalar') return scalar(L.numMul(a.v, b.v));
  if (a.kind === 'scalar' && b.kind === 'matrix') return matrix(L.scale(b.m, a.v));
  if (a.kind === 'matrix' && b.kind === 'scalar') return matrix(L.scale(a.m, b.v));
  return matrix(L.mul((a as { m: Matrix }).m, (b as { m: Matrix }).m));
}
function divV(a: Value, b: Value): Value {
  if (b.kind === 'matrix') throw new MatrixError("Can't divide by a matrix (multiply by its inverse instead)");
  if (a.kind === 'scalar') return scalar(L.numDiv(a.v, b.v));
  if (L.numIsZero(b.v)) throw new MatrixError('Division by zero');
  return matrix(a.m.map((r) => r.map((x) => L.numDiv(x, b.v))));
}
function negV(a: Value): Value {
  return a.kind === 'scalar' ? scalar(L.numNeg(a.v)) : matrix(L.scale(a.m, L.Fraction.of(-1)));
}
function powV(a: Value, e: Value): Value {
  if (e.kind === 'matrix') throw new MatrixError('Exponent must be a number');
  if (a.kind === 'scalar') return scalar(L.numPow(a.v, e.v));
  const f = L.toFloat(e.v);
  if (!Number.isInteger(f)) throw new MatrixError('Matrix exponent must be an integer');
  return matrix(L.power(a.m, f));
}

function callFn(name: string, args: Value[]): Value {
  const one = (): Value => {
    if (args.length !== 1) throw new MatrixError(`${name} takes one argument`);
    return args[0]!;
  };
  switch (name) {
    case 'det': case 'determinant': return scalar(L.det(needMatrix(one(), name)));
    case 'inv': case 'inverse': return matrix(L.inverse(needMatrix(one(), name)));
    case 'transpose': case 'tr': return matrix(L.transpose(needMatrix(one(), name)));
    case 'rref': return matrix(L.rref(needMatrix(one(), name)));
    case 'trace': return scalar(L.trace(needMatrix(one(), name)));
    case 'rank': return scalar(L.Fraction.of(L.rank(needMatrix(one(), name))));
    case 'identity': {
      const n = toInt(one(), 'Size');
      if (n < 1 || n > 10) throw new MatrixError('Identity size must be 1 to 10');
      return matrix(L.identity(n));
    }
    case 'sqrt': {
      const v = one();
      if (v.kind !== 'scalar') throw new MatrixError('sqrt needs a number');
      const f = L.toFloat(v.v);
      if (f < 0) throw new MatrixError('Result is not a real number');
      if (v.v instanceof L.Fraction) {
        const rn = Math.round(Math.sqrt(Number(v.v.n)));
        const rd = Math.round(Math.sqrt(Number(v.v.d)));
        if (rn * rn === Number(v.v.n) && rd * rd === Number(v.v.d)) return scalar(new L.Fraction(BigInt(rn), BigInt(rd)));
      }
      return scalar(Math.sqrt(f));
    }
    default:
      throw new MatrixError(`Unknown function "${name}"`);
  }
}

class Parser {
  private p = 0;
  constructor(private toks: Tok[], private lookup: Lookup) {}
  private peek(): Tok { return this.toks[this.p]!; }
  private isOp(s: string): boolean {
    const t = this.peek();
    return t.t === 'op' && t.s === s;
  }

  parse(): Value {
    const v = this.expr();
    if (this.peek().t !== 'end') throw new MatrixError('Unexpected input');
    return v;
  }
  private expr(): Value {
    let v = this.term();
    while (this.isOp('+') || this.isOp('-')) {
      const subtract = this.isOp('-');
      this.p++;
      v = addV(v, this.term(), subtract);
    }
    return v;
  }
  private startsFactor(): boolean {
    const t = this.peek();
    return t.t === 'num' || t.t === 'mat' || t.t === 'id' || t.t === 'fn' || (t.t === 'op' && t.s === '(');
  }
  private term(): Value {
    let v = this.unary();
    for (;;) {
      if (this.isOp('*')) { this.p++; v = mulV(v, this.unary()); }
      else if (this.isOp('/')) { this.p++; v = divV(v, this.unary()); }
      else if (this.startsFactor()) v = mulV(v, this.unary());
      else return v;
    }
  }
  private unary(): Value {
    if (this.isOp('-')) { this.p++; return negV(this.unary()); }
    if (this.isOp('+')) { this.p++; return this.unary(); }
    return this.power();
  }
  private postfix(v: Value): Value {
    for (;;) {
      const t = this.peek();
      if (t.t !== 'post') return v;
      this.p++;
      const m = needMatrix(v, t.s === 'T' ? 'Transpose' : 'Inverse');
      v = matrix(t.s === 'T' ? L.transpose(m) : L.inverse(m));
    }
  }
  private power(): Value {
    let base = this.postfix(this.atom());
    if (this.isOp('^')) {
      this.p++;
      const t = this.peek();
      if (t.t === 'mat' && t.s === 'T') {
        this.p++;
        base = matrix(L.transpose(needMatrix(base, 'Transpose')));
      } else {
        base = powV(base, this.exponent());
      }
      base = this.postfix(base);
    }
    return base;
  }
  private exponent(): Value {
    let neg = false;
    if (this.isOp('-')) { this.p++; neg = true; }
    else if (this.isOp('+')) this.p++;
    let e = this.atom();
    if (this.isOp('^')) { this.p++; e = powV(e, this.exponent()); }
    return neg ? negV(e) : e;
  }
  private atom(): Value {
    const t = this.peek();
    if (t.t === 'num') { this.p++; return scalar(t.v); }
    if (t.t === 'mat') { this.p++; return matrix(this.lookup(t.s)); }
    if (t.t === 'id') {
      this.p++;
      if (t.n < 1 || t.n > 10) throw new MatrixError('Identity size must be 1 to 10');
      return matrix(L.identity(t.n));
    }
    if (t.t === 'fn') {
      this.p++;
      if (!this.isOp('(')) throw new MatrixError(`Expected "(" after ${t.s}`);
      this.p++;
      const args: Value[] = [];
      if (!this.isOp(')')) {
        args.push(this.expr());
        while (this.isOp(',')) { this.p++; args.push(this.expr()); }
      }
      if (!this.isOp(')')) throw new MatrixError('Missing ")"');
      this.p++;
      return callFn(t.s, args);
    }
    if (t.t === 'op' && t.s === '(') {
      this.p++;
      const v = this.expr();
      if (!this.isOp(')')) throw new MatrixError('Missing ")"');
      this.p++;
      return v;
    }
    throw new MatrixError(t.t === 'end' ? 'Incomplete expression' : 'Unexpected input');
  }
}

export function evaluate(src: string, lookup: Lookup): Value {
  return new Parser(tokenize(src), lookup).parse();
}

export type EvalResult = { ok: true; value: Value } | { ok: false; error: string };
export function safeEvaluate(src: string, lookup: Lookup): EvalResult {
  try {
    return { ok: true, value: evaluate(src, lookup) };
  } catch (e) {
    if (e instanceof MatrixError) return { ok: false, error: e.message };
    if (e instanceof RangeError) return { ok: false, error: 'Number too large' };
    return { ok: false, error: 'Could not evaluate' };
  }
}
