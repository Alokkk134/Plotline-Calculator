// Multi-line analysis: resolves variables/functions across lines and classifies each line.
import {
  circularMessage,
  Compiler,
  emptyScope,
  type Env,
  type Fn,
  type FuncDef,
  MathError,
  mkConst,
  type Scope,
} from './compile';
import { parseLatex, type Node, type Statement } from './parser';
import { ParseError } from './tokenizer';
import type { AnalyzedLine, EvalOptions, ExprAnalysis, ExpressionInput, Relation } from './types';

const SPECIAL = new Set(['x', 'y', 'r', 'θ', 't']);
const RESERVED = new Set(['x', 'y', 'r', 'θ', 'e', 'π']);

type Parsed = { st: Statement } | { error: string };

function flip(op: Relation): Relation {
  switch (op) {
    case '<': return '>';
    case '>': return '<';
    case '<=': return '>=';
    case '>=': return '<=';
    default: return '=';
  }
}

/** Names used as variables (including `name(...)` that may be implicit multiplication). */
function collectNames(node: Node, out: Set<string>, isFunc: (n: string) => boolean): void {
  switch (node.t) {
    case 'var': out.add(node.name); break;
    case 'neg': collectNames(node.a, out, isFunc); break;
    case 'bin': collectNames(node.a, out, isFunc); collectNames(node.b, out, isFunc); break;
    case 'call': case 'tuple': {
      for (const a of node.t === 'call' ? node.args : node.items) collectNames(a, out, isFunc);
      break;
    }
    case 'apply':
      if (!isFunc(node.name)) out.add(node.name);
      for (const a of node.args) collectNames(a, out, isFunc);
      break;
    default: break;
  }
}

const u1 = (f: Fn): ((t: number) => number) => f as unknown as (t: number) => number;
const isNum = (n: Node): boolean => n.t === 'num' || (n.t === 'neg' && isNum(n.a));

export function analyzeLines(inputs: ExpressionInput[], opts: EvalOptions): AnalyzedLine[] {
  const parsed: Parsed[] = inputs.map((inp) => {
    try {
      return { st: parseLatex(inp.latex) };
    } catch (e) {
      return { error: e instanceof ParseError || e instanceof Error ? e.message : 'Invalid expression' };
    }
  });

  // ---- find definitions
  const varLines = new Map<string, number[]>();
  const funcLines = new Map<string, number[]>();
  const funcInfo = new Map<number, { name: string; def: FuncDef }>();
  const add = (m: Map<string, number[]>, k: string, i: number): void => {
    const l = m.get(k);
    if (l) l.push(i);
    else m.set(k, [i]);
  };

  parsed.forEach((p, i) => {
    if (!('st' in p) || p.st.kind !== 'rel' || p.st.op !== '=') return;
    const { lhs, rhs } = p.st;
    if (lhs.t === 'apply' && !SPECIAL.has(lhs.name) && lhs.name !== 'e' && lhs.name !== 'π') {
      const names = lhs.args.map((a) => (a.t === 'var' ? a.name : null));
      if (names.every((n): n is string => n !== null) && new Set(names).size === names.length) {
        funcInfo.set(i, { name: lhs.name, def: { params: names as string[], body: rhs } });
        add(funcLines, lhs.name, i);
      }
    }
  });
  const isFunc = (n: string): boolean => funcLines.has(n);

  const varCandidates: { name: string; i: number; rhs: Node }[] = [];
  parsed.forEach((p, i) => {
    if (!('st' in p) || p.st.kind !== 'rel' || p.st.op !== '=') return;
    const { lhs, rhs } = p.st;
    if (lhs.t !== 'var' || RESERVED.has(lhs.name)) return;
    const used = new Set<string>();
    collectNames(rhs, used, isFunc);
    if (['x', 'y', 'r', 'θ'].some((s) => used.has(s))) return;
    varCandidates.push({ name: lhs.name, i, rhs });
  });
  const candNames = new Set(varCandidates.map((c) => c.name));
  const varDefs = new Map<string, { i: number; rhs: Node }>();
  for (const c of varCandidates) {
    if (!candNames.has('t')) {
      const used = new Set<string>();
      collectNames(c.rhs, used, isFunc);
      if (used.has('t')) continue;
    }
    add(varLines, c.name, c.i);
    varDefs.set(c.name, { i: c.i, rhs: c.rhs });
  }
  const dup = (m: Map<string, number[]>, name: string): boolean => (m.get(name)?.length ?? 0) > 1;

  // ---- environment
  type Res = { v: number } | { err: MathError };
  const cache = new Map<string, Res>();
  const env: Env = {
    angle: opts.angleMode,
    extra: opts.variables ?? {},
    stack: [],
    getFunc(name) {
      const lines = funcLines.get(name);
      if (!lines) return undefined;
      if (lines.length > 1) throw new MathError(`'${name}' is defined more than once`);
      return funcInfo.get(lines[0]!)!.def;
    },
    getVar(name) {
      const def = varDefs.get(name);
      if (!def) return undefined;
      if (dup(varLines, name)) throw new MathError(`'${name}' is defined more than once`);
      const hit = cache.get(name);
      if (hit) {
        if ('err' in hit) throw hit.err;
        return hit.v;
      }
      const key = `v:${name}`;
      if (env.stack.includes(key)) throw new MathError(circularMessage(name));
      env.stack.push(key);
      try {
        const comp = new Compiler(env);
        const f = comp.compile(def.rhs, emptyScope());
        if (comp.undef.size) throw undefError([...comp.undef]);
        const v = f(0, 0);
        cache.set(name, { v });
        return v;
      } catch (e) {
        const err = e instanceof MathError ? e : new MathError('Invalid expression');
        cache.set(name, { err });
        throw err;
      } finally {
        env.stack.pop();
      }
    },
  };

  const undefError = (names: string[]): MathError =>
    new MathError(`Too many variables, try defining '${names[0]}'`, names);

  // ---- classify each line
  const out: AnalyzedLine[] = inputs.map((inp, idx) => {
    const p = parsed[idx]!;
    if ('error' in p) return { id: inp.id, analysis: { kind: 'error', message: p.error }, undefinedVariables: [] };
    const comp = new Compiler(env);
    let analysis: ExprAnalysis;
    let undef: string[] = [];
    try {
      env.stack.length = 0;
      analysis = classify(idx, p.st, comp);
      if (comp.undef.size) throw undefError([...comp.undef]);
    } catch (e) {
      const err = e instanceof MathError ? e : new MathError('Invalid expression');
      undef = [...new Set([...comp.undef, ...err.undef])];
      const message = undef.length ? undefError(undef).message : err.message;
      analysis = { kind: 'error', message };
    }
    return { id: inp.id, analysis, undefinedVariables: undef };
  });
  return out;

  // ---------------------------------------------------------------------------
  function specials(node: Node): Set<string> {
    const names = new Set<string>();
    collectNames(node, names, isFunc);
    const res = new Set<string>();
    for (const n of names) if (SPECIAL.has(n) && !varDefs.has(n)) res.add(n);
    return res;
  }
  function only(s: Set<string>, ...allowed: string[]): boolean {
    return [...s].every((n) => allowed.includes(n));
  }

  function scopeOf(...names: string[]): Scope {
    const sc = emptyScope();
    names.forEach((n, i) => sc.slots.set(n, i === 0 ? 0 : 1));
    return sc;
  }

  function classify(idx: number, st: Statement, comp: Compiler): ExprAnalysis {
    if (st.kind === 'empty') return { kind: 'empty' };

    // ---- function definition
    const fi = funcInfo.get(idx);
    if (fi) {
      if (dup(funcLines, fi.name)) throw new MathError(`'${fi.name}' is defined more than once`);
      const sc = emptyScope();
      fi.def.params.forEach((pn, i) => {
        if (i < 2) sc.slots.set(pn, i === 0 ? 0 : 1);
        else sc.locals.set(pn, mkConst(NaN));
      });
      env.stack.push(`f:${fi.name}`);
      let f: Fn;
      try {
        f = comp.compile(fi.def.body, sc);
      } finally {
        env.stack.pop();
      }
      return {
        kind: 'function-def',
        name: fi.name,
        params: fi.def.params,
        graph: fi.def.params.length === 1 ? { fn: f as unknown as (x: number) => number } : undefined,
      };
    }

    // ---- variable assignment
    if (st.kind === 'rel' && st.op === '=' && st.lhs.t === 'var') {
      const name = st.lhs.name;
      const def = varDefs.get(name);
      if (def && def.i === idx) {
        const value = env.getVar(name)!;
        return { kind: 'assignment', name, value, isSlider: isNum(st.rhs) };
      }
      if (dup(varLines, name) && varLines.get(name)!.includes(idx)) {
        throw new MathError(`'${name}' is defined more than once`);
      }
    }

    if (st.kind === 'list') return points(st.items, comp);
    if (st.kind === 'expr') {
      if (st.node.t === 'tuple') return tuple(st.node, comp);
      return bare(st.node, comp);
    }
    if (st.kind !== 'rel') throw new MathError('Invalid expression');
    return relation(st.lhs, st.op, st.rhs, comp);
  }

  function bare(node: Node, comp: Compiler): ExprAnalysis {
    const s = specials(node);
    if (s.size === 0) return { kind: 'value', value: comp.compile(node, emptyScope())(0, 0) };
    if (only(s, 'x')) return { kind: 'explicit', dep: 'y', op: '=', fn: u1(comp.compile(node, scopeOf('x'))) };
    if (only(s, 'y')) return { kind: 'explicit', dep: 'x', op: '=', fn: u1(comp.compile(node, scopeOf('y'))) };
    if (s.has('x') && s.has('y')) throw new MathError('Add an = or inequality to graph this');
    throw new MathError(`Can't graph '${[...s][0]}' here`);
  }

  function tuple(node: Node & { t: 'tuple' }, comp: Compiler): ExprAnalysis {
    if (node.items.length !== 2) throw new MathError('Only 2D points are supported');
    const s = new Set<string>();
    for (const it of node.items) for (const n of specials(it)) s.add(n);
    if (s.size === 0) {
      const [a, b] = node.items.map((it) => comp.compile(it, emptyScope())(0, 0)) as [number, number];
      return { kind: 'points', points: [{ x: a, y: b }] };
    }
    if (only(s, 't')) {
      const sc = scopeOf('t');
      return {
        kind: 'parametric',
        fx: comp.compile(node.items[0]!, sc) as unknown as (t: number) => number,
        fy: comp.compile(node.items[1]!, sc) as unknown as (t: number) => number,
        tMin: 0,
        tMax: 1,
      };
    }
    if (s.has('t')) throw new MathError('Use only t in a parametric curve');
    throw new MathError("Points can't depend on x or y");
  }

  function points(items: Node[], comp: Compiler): ExprAnalysis {
    const pts: { x: number; y: number }[] = [];
    for (const it of items) {
      if (it.t !== 'tuple' || it.items.length !== 2) throw new MathError('Expected a list of points like (1,2),(3,4)');
      const a = tuple(it, comp);
      if (a.kind !== 'points') throw new MathError("Points can't depend on variables");
      pts.push(...a.points);
    }
    return { kind: 'points', points: pts };
  }

  function relation(lhs: Node, op: Relation, rhs: Node, comp: Compiler): ExprAnalysis {
    const sl = specials(lhs);
    const sr = specials(rhs);
    const isV = (n: Node, name: string): boolean => n.t === 'var' && n.name === name && !varDefs.has(name);

    if (isV(lhs, 'y') && only(sr, 'x')) return { kind: 'explicit', dep: 'y', op, fn: u1(comp.compile(rhs, scopeOf('x'))) };
    if (isV(rhs, 'y') && only(sl, 'x')) return { kind: 'explicit', dep: 'y', op: flip(op), fn: u1(comp.compile(lhs, scopeOf('x'))) };
    if (isV(lhs, 'x') && only(sr, 'y')) return { kind: 'explicit', dep: 'x', op, fn: u1(comp.compile(rhs, scopeOf('y'))) };
    if (isV(rhs, 'x') && only(sl, 'y')) return { kind: 'explicit', dep: 'x', op: flip(op), fn: u1(comp.compile(lhs, scopeOf('y'))) };

    const polar = (body: Node, o: Relation): ExprAnalysis => {
      const sc = emptyScope();
      if (opts.angleMode === 'deg') sc.locals.set('θ', ((a: number) => a * (180 / Math.PI)) as Fn);
      else sc.slots.set('θ', 0);
      return {
        kind: 'polar',
        op: o,
        fn: comp.compile(body, sc) as unknown as (theta: number) => number,
        thetaMin: 0,
        thetaMax: 2 * Math.PI,
      };
    };
    if (isV(lhs, 'r') && only(sr, 'θ')) return polar(rhs, op);
    if (isV(rhs, 'r') && only(sl, 'θ')) return polar(lhs, flip(op));

    const all = new Set([...sl, ...sr]);
    if (all.size === 0) {
      // Still compile so undefined variables are reported (e.g. "a=b" style lines).
      comp.compile(lhs, emptyScope());
      comp.compile(rhs, emptyScope());
      if (comp.undef.size) return { kind: 'empty' };
      throw new MathError('Nothing to graph: no variables');
    }
    if (!only(all, 'x', 'y')) throw new MathError(`Can't graph this relation (uses ${[...all].filter((n) => n !== 'x' && n !== 'y')[0]})`);
    const sc = scopeOf('x', 'y');
    const L = comp.compile(lhs, sc);
    const R = comp.compile(rhs, sc);
    return { kind: 'implicit', op, fn: (x, y) => L(x, y) - R(x, y) };
  }
}
