// AST -> closures. Every compiled expression is (a, b) => number where a/b are the two
// "slot" variables (e.g. x and y). Constant sub-trees are folded at compile time.
import { getBuiltins, powSafe } from './builtins';
import type { Node } from './parser';
import type { AngleMode } from './types';

export type Fn = ((a: number, b: number) => number) & { k?: number };

export class MathError extends Error {
  constructor(message: string, public undef: string[] = []) {
    super(message);
  }
}

export interface FuncDef {
  params: string[];
  body: Node;
}

/** Context shared by all compiles of one analysis. */
export interface Env {
  angle: AngleMode;
  extra: Record<string, number>;
  /** Keys of definitions currently being resolved ('v:a', 'f:f'), for cycle detection. */
  stack: string[];
  /** Value of a user-defined variable; undefined when not defined. Throws MathError on errors/cycles. */
  getVar(name: string): number | undefined;
  getFunc(name: string): FuncDef | undefined;
}

export interface Scope {
  /** Names bound to input slots 0 / 1. */
  slots: Map<string, 0 | 1>;
  /** Names bound to arbitrary compiled expressions (function parameters). */
  locals: Map<string, Fn>;
}

export const emptyScope = (): Scope => ({ slots: new Map(), locals: new Map() });

const SLOT0: Fn = (a) => a;
const SLOT1: Fn = (_a, b) => b;

export function mkConst(v: number): Fn {
  const f = (() => v) as Fn;
  f.k = v;
  return f;
}

const SPECIAL_NAMES = new Set(['x', 'y', 'r', 'θ', 't']);
export function isSimpleName(name: string): boolean {
  return /^[A-Za-zͰ-Ͽ](_.+)?$/.test(name);
}

export function circularMessage(name: string): string {
  return `'${name}' is defined in terms of itself`;
}

export class Compiler {
  /** Undefined single-letter variables encountered (compiled as NaN). */
  readonly undef = new Set<string>();
  private builtins;
  constructor(private env: Env) {
    this.builtins = getBuiltins(env.angle);
  }

  compile(node: Node, scope: Scope): Fn {
    switch (node.t) {
      case 'num':
        return mkConst(node.v);
      case 'var':
        return this.variable(node.name, scope);
      case 'neg': {
        const A = this.compile(node.a, scope);
        if (A.k !== undefined) return mkConst(-A.k);
        return (x, y) => -A(x, y);
      }
      case 'bin':
        return this.binary(node.op, this.compile(node.a, scope), this.compile(node.b, scope));
      case 'call':
        return this.call(node.fn, node.args.map((a) => this.compile(a, scope)));
      case 'apply':
        return this.apply(node.name, node.args, scope);
      case 'tuple':
        throw new MathError('Unexpected comma');
    }
  }

  private variable(name: string, scope: Scope): Fn {
    const local = scope.locals.get(name);
    if (local) return local;
    const slot = scope.slots.get(name);
    if (slot !== undefined) return slot === 0 ? SLOT0 : SLOT1;
    const extra = this.env.extra[name];
    if (extra !== undefined) return mkConst(extra);
    if (name === 'e') return mkConst(Math.E);
    if (name === 'π') return mkConst(Math.PI);
    if (this.env.getFunc(name)) throw new MathError(`'${name}' is a function; write ${name}(...)`);
    const v = this.env.getVar(name);
    if (v !== undefined) return mkConst(v);
    if (SPECIAL_NAMES.has(name)) throw new MathError(`Unknown variable '${name}'`);
    if (isSimpleName(name)) {
      this.undef.add(name);
      return mkConst(NaN);
    }
    throw new MathError(`Unknown name '${name}'`);
  }

  private apply(name: string, argNodes: Node[], scope: Scope): Fn {
    const shadowed = scope.locals.has(name) || scope.slots.has(name);
    const def = shadowed ? undefined : this.env.getFunc(name);
    if (!def) {
      // Not a function: implicit multiplication name * (arg)
      if (argNodes.length !== 1) throw new MathError(`Unexpected comma after '${name}'`);
      if (!shadowed && this.env.extra[name] === undefined && name !== 'e' && name !== 'π' && !isSimpleName(name) &&
          this.env.getVar(name) === undefined) {
        throw new MathError(`Unknown function '${name}'`);
      }
      return this.binary('*', this.variable(name, scope), this.compile(argNodes[0]!, scope));
    }
    if (argNodes.length !== def.params.length) {
      throw new MathError(`${name} takes ${def.params.length} argument${def.params.length === 1 ? '' : 's'}`);
    }
    const args = argNodes.map((a) => this.compile(a, scope));
    const key = `f:${name}`;
    if (this.env.stack.includes(key)) throw new MathError(circularMessage(name));
    this.env.stack.push(key);
    try {
      const inner = emptyScope();
      def.params.forEach((p, i) => inner.locals.set(p, args[i]!));
      return this.compile(def.body, inner);
    } finally {
      this.env.stack.pop();
    }
  }

  private binary(op: string, A: Fn, B: Fn): Fn {
    const ka = A.k;
    const kb = B.k;
    const fold = (f: (p: number, q: number) => number): Fn | null =>
      ka !== undefined && kb !== undefined ? mkConst(f(ka, kb)) : null;
    switch (op) {
      case '+':
        return fold((p, q) => p + q) ?? (kb !== undefined ? (x, y) => A(x, y) + kb : (x, y) => A(x, y) + B(x, y));
      case '-':
        return fold((p, q) => p - q) ?? (kb !== undefined ? (x, y) => A(x, y) - kb : (x, y) => A(x, y) - B(x, y));
      case '*':
        return (
          fold((p, q) => p * q) ??
          (ka !== undefined ? (x, y) => ka * B(x, y) : kb !== undefined ? (x, y) => A(x, y) * kb : (x, y) => A(x, y) * B(x, y))
        );
      case '/':
        return (
          fold((p, q) => (q === 0 ? NaN : p / q)) ??
          (kb !== undefined
            ? kb === 0
              ? mkConst(NaN)
              : (x, y) => A(x, y) / kb
            : (x, y) => {
                const d = B(x, y);
                return d === 0 ? NaN : A(x, y) / d;
              })
        );
      default: // '^'
        if (kb === 2) return fold((p) => p * p) ?? ((x, y) => { const v = A(x, y); return v * v; });
        return fold(powSafe) ?? (kb !== undefined ? (x, y) => powSafe(A(x, y), kb) : (x, y) => powSafe(A(x, y), B(x, y)));
    }
  }

  private call(name: string, args: Fn[]): Fn {
    const bi = this.builtins[name];
    if (!bi) throw new MathError(`Unknown function '${name}'`);
    if (args.length < bi.min || args.length > bi.max) {
      throw new MathError(
        bi.min === bi.max
          ? `${name} takes ${bi.min} argument${bi.min === 1 ? '' : 's'}`
          : `${name} takes ${bi.min}${bi.max === Infinity ? ' or more' : `-${bi.max}`} arguments`,
      );
    }
    const g = bi.fn;
    if (args.every((a) => a.k !== undefined)) return mkConst(g(...args.map((a) => a.k!)));
    switch (args.length) {
      case 1: {
        const [A] = args as [Fn];
        return (x, y) => g(A(x, y));
      }
      case 2: {
        const [A, B] = args as [Fn, Fn];
        return (x, y) => g(A(x, y), B(x, y));
      }
      case 3: {
        const [A, B, C] = args as [Fn, Fn, Fn];
        return (x, y) => g(A(x, y), B(x, y), C(x, y));
      }
      default:
        return (x, y) => g(...args.map((a) => a(x, y)));
    }
  }
}
