import { Compiler, emptyScope, type Env, MathError } from './compile';
import { parseLatex } from './parser';
import type { EvalOptions, EvalResult } from './types';

export function evalLatex(latex: string, opts: EvalOptions): EvalResult {
  try {
    const st = parseLatex(latex.replace(/(?:=|\\left\s*\.|\s)+$/, ''));
    if (st.kind === 'empty') return { ok: false, error: 'Empty expression' };
    if (st.kind !== 'expr') return { ok: false, error: 'Not a single expression' };
    const env: Env = {
      angle: opts.angleMode,
      extra: opts.variables ?? {},
      stack: [],
      getVar: () => undefined,
      getFunc: () => undefined,
    };
    const comp = new Compiler(env);
    const f = comp.compile(st.node, emptyScope());
    if (comp.undef.size) return { ok: false, error: `Unknown variable '${[...comp.undef][0]}'` };
    const value = f(0, 0);
    if (Number.isNaN(value)) return { ok: false, error: 'Undefined' };
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid expression' };
  }
}

export { MathError };
