import { describe, expect, it } from 'vitest';
import { analyzeExpressions, type AnalyzedLine, type EvalOptions, type ExprAnalysis } from './index';

const rad: EvalOptions = { angleMode: 'rad' };
const deg: EvalOptions = { angleMode: 'deg' };

function run(lines: string[], opts = rad): AnalyzedLine[] {
  return analyzeExpressions(lines.map((latex, i) => ({ id: `l${i}`, latex })), opts);
}
function one(latex: string, opts = rad): ExprAnalysis {
  return run([latex], opts)[0]!.analysis;
}
function kind<K extends ExprAnalysis['kind']>(a: ExprAnalysis, k: K): Extract<ExprAnalysis, { kind: K }> {
  if (a.kind !== k) throw new Error(`expected ${k}, got ${JSON.stringify(a)}`);
  return a as Extract<ExprAnalysis, { kind: K }>;
}

describe('basic kinds', () => {
  it('empty', () => {
    expect(one('').kind).toBe('empty');
    expect(one('   ').kind).toBe('empty');
    expect(one('\\placeholder{}').kind).toBe('empty');
  });
  it('value', () => {
    expect(kind(one('2+3'), 'value').value).toBe(5);
    expect(kind(one('\\sin\\left(\\frac{\\pi}{2}\\right)'), 'value').value).toBeCloseTo(1);
  });
  it('explicit y=f(x)', () => {
    const a = kind(one('y=x^2'), 'explicit');
    expect(a.dep).toBe('y');
    expect(a.op).toBe('=');
    expect(a.fn(3)).toBe(9);
    const b = kind(one('x^2'), 'explicit');
    expect(b.dep).toBe('y');
    expect(b.fn(4)).toBe(16);
    const c = kind(one('x^{2}=y'), 'explicit');
    expect(c.dep).toBe('y');
    expect(c.fn(5)).toBe(25);
    expect(kind(one('y=3'), 'explicit').fn(100)).toBe(3);
    expect(kind(one('y=\\sin\\left(x\\right)'), 'explicit').fn(Math.PI / 2)).toBeCloseTo(1);
  });
  it('explicit x=f(y)', () => {
    const a = kind(one('x=y^2'), 'explicit');
    expect(a.dep).toBe('x');
    expect(a.fn(3)).toBe(9);
    const b = kind(one('y^2'), 'explicit');
    expect(b.dep).toBe('x');
    expect(kind(one('x=2'), 'explicit').fn(0)).toBe(2);
    expect(kind(one('y^2=x'), 'explicit').dep).toBe('x');
  });
  it('explicit returns NaN at undefined points', () => {
    const a = kind(one('y=\\frac{1}{x}'), 'explicit');
    expect(a.fn(0)).toBeNaN();
    expect(a.fn(2)).toBe(0.5);
    expect(kind(one('y=\\sqrt{x}'), 'explicit').fn(-1)).toBeNaN();
    expect(kind(one('y=\\ln x'), 'explicit').fn(-1)).toBeNaN();
  });
  it('polar', () => {
    const a = kind(one('r=\\theta'), 'polar');
    expect(a.op).toBe('=');
    expect(a.fn(2)).toBe(2);
    expect(a.thetaMin).toBe(0);
    expect(a.thetaMax).toBeCloseTo(2 * Math.PI);
    const b = kind(one('r=1+\\sin\\left(\\theta\\right)'), 'polar');
    expect(b.fn(Math.PI / 2)).toBeCloseTo(2);
    expect(kind(one('r=2'), 'polar').fn(1)).toBe(2);
    expect(kind(one('2\\cos\\left(\\theta\\right)=r'), 'polar').fn(0)).toBe(2);
  });
  it('polar in degree mode converts theta', () => {
    const a = kind(one('r=\\sin\\left(\\theta\\right)', deg), 'polar');
    expect(a.fn(Math.PI / 6)).toBeCloseTo(0.5);
  });
  it('parametric', () => {
    const a = kind(one('\\left(\\cos\\left(2\\pi t\\right),\\sin\\left(2\\pi t\\right)\\right)'), 'parametric');
    expect(a.tMin).toBe(0);
    expect(a.tMax).toBe(1);
    expect(a.fx(0)).toBeCloseTo(1);
    expect(a.fy(0.25)).toBeCloseTo(1);
    const b = kind(one('(t,t^2)'), 'parametric');
    expect(b.fy(3)).toBe(9);
  });
  it('points', () => {
    expect(kind(one('\\left(1,2\\right)'), 'points').points).toEqual([{ x: 1, y: 2 }]);
    expect(kind(one('(1,2),(3,4)'), 'points').points).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
    expect(kind(one('(\\frac{1}{2},-3)'), 'points').points).toEqual([{ x: 0.5, y: -3 }]);
  });
  it('implicit', () => {
    const a = kind(one('x^2+y^2=1'), 'implicit');
    expect(a.op).toBe('=');
    expect(a.fn(1, 0)).toBe(0);
    expect(a.fn(0, 2)).toBe(3);
    const b = kind(one('y^2=x+1'), 'implicit');
    expect(b.fn(0, 1)).toBe(0);
    const c = kind(one('xy<1'), 'implicit');
    expect(c.op).toBe('<');
    expect(c.fn(2, 3)).toBe(5);
    expect(kind(one('x=y^2+x'), 'implicit').kind).toBe('implicit');
  });
});

describe('misc graph syntax', () => {
  it('absolute values', () => {
    expect(kind(one('y=\\left|x-1\\right|+2'), 'explicit').fn(-1)).toBe(4);
    expect(kind(one('y=|x|'), 'explicit').fn(-3)).toBe(3);
    expect(kind(one('y=x\\left|x\\right|'), 'explicit').fn(-2)).toBe(-4);
  });
  it('cube root of negatives and fractional powers', () => {
    expect(kind(one('y=x^{\\frac{1}{3}}'), 'explicit').fn(-8)).toBeCloseTo(-2);
    expect(kind(one('y=x^{0.5}'), 'explicit').fn(-4)).toBeNaN();
  });
});

describe('inequalities', () => {
  it('y isolated on left', () => {
    const a = kind(one('y<x^2'), 'explicit');
    expect(a.op).toBe('<');
    expect(a.dep).toBe('y');
    expect(kind(one('y\\ge x'), 'explicit').op).toBe('>=');
    expect(kind(one('y\\leq 2x'), 'explicit').op).toBe('<=');
    expect(kind(one('y>x'), 'explicit').op).toBe('>');
  });
  it('flips when y is on the right', () => {
    expect(kind(one('x^2<y'), 'explicit').op).toBe('>');
    expect(kind(one('x^2\\le y'), 'explicit').op).toBe('>=');
    expect(kind(one('x>y'), 'explicit').op).toBe('<');
    const a = kind(one('x^2>y'), 'explicit');
    expect(a.op).toBe('<');
    expect(a.fn(3)).toBe(9);
  });
  it('x isolated', () => {
    const a = kind(one('x<y^2'), 'explicit');
    expect(a.dep).toBe('x');
    expect(a.op).toBe('<');
    expect(kind(one('y^2>x'), 'explicit').op).toBe('<');
  });
  it('unicode and plain signs', () => {
    expect(kind(one('y≤x'), 'explicit').op).toBe('<=');
    expect(kind(one('y>=x'), 'explicit').op).toBe('>=');
  });
});

describe('cross-line resolution', () => {
  it('assignment and slider', () => {
    const r = run(['a=3', 'b=2a']);
    const a = kind(r[0]!.analysis, 'assignment');
    expect(a).toMatchObject({ name: 'a', value: 3, isSlider: true });
    const b = kind(r[1]!.analysis, 'assignment');
    expect(b).toMatchObject({ name: 'b', value: 6, isSlider: false });
    expect(kind(run(['a=-3'])[0]!.analysis, 'assignment').isSlider).toBe(true);
  });
  it('y=ax uses a', () => {
    const r = run(['a=2', 'y=ax']);
    const e = kind(r[1]!.analysis, 'explicit');
    expect(e.fn(5)).toBe(10);
    expect(r[1]!.undefinedVariables).toEqual([]);
  });
  it('order does not matter', () => {
    const r = run(['y=ax', 'a=2']);
    expect(kind(r[0]!.analysis, 'explicit').fn(5)).toBe(10);
  });
  it('chained variables', () => {
    const r = run(['a=1', 'b=a+1', 'c=b*2', 'y=c x']);
    expect(kind(r[2]!.analysis, 'assignment').value).toBe(4);
    expect(kind(r[3]!.analysis, 'explicit').fn(2)).toBe(8);
  });
  it('function definitions', () => {
    const r = run(['f\\left(x\\right)=x^2', 'y=f\\left(x\\right)+1', 'f(3)']);
    const def = kind(r[0]!.analysis, 'function-def');
    expect(def.name).toBe('f');
    expect(def.params).toEqual(['x']);
    expect(def.graph!.fn(4)).toBe(16);
    expect(kind(r[1]!.analysis, 'explicit').fn(3)).toBe(10);
    expect(kind(r[2]!.analysis, 'value').value).toBe(9);
  });
  it('function with other param name and multiple params', () => {
    const r = run(['g(t)=2t', 'h(a,b)=a+b', 'y=g(x)+h(x,1)', 'h(2,3)']);
    expect(kind(r[0]!.analysis, 'function-def').graph!.fn(3)).toBe(6);
    expect(kind(r[1]!.analysis, 'function-def').graph).toBeUndefined();
    expect(kind(r[2]!.analysis, 'explicit').fn(2)).toBe(7);
    expect(kind(r[3]!.analysis, 'value').value).toBe(5);
  });
  it('functions calling functions and using variables', () => {
    const r = run(['k=3', 'f(x)=kx', 'g(x)=f(x)+f(2x)', 'y=g(x)']);
    expect(kind(r[3]!.analysis, 'explicit').fn(1)).toBe(9);
  });
  it('implicit multiplication with defined variable and parens', () => {
    const r = run(['a=2', 'y=a(x+1)']);
    expect(kind(r[1]!.analysis, 'explicit').fn(2)).toBe(6);
  });
  it('subscripted variables', () => {
    const r = run(['a_{1}=4', 'y=a_1x']);
    expect(kind(r[0]!.analysis, 'assignment').name).toBe('a_1');
    expect(kind(r[1]!.analysis, 'explicit').fn(2)).toBe(8);
  });
  it('detects cycles', () => {
    const r = run(['a=b', 'b=a', 'y=a']);
    for (const l of r) expect(l.analysis.kind).toBe('error');
    const s = run(['a=a+1']);
    expect(s[0]!.analysis.kind).toBe('error');
    const f = run(['f(x)=f(x)+1', 'y=f(x)']);
    expect(f[0]!.analysis.kind).toBe('error');
    expect(f[1]!.analysis.kind).toBe('error');
    const g = run(['f(x)=g(x)', 'g(x)=f(x)']);
    expect(g[0]!.analysis.kind).toBe('error');
    expect(g[1]!.analysis.kind).toBe('error');
  });
  it('duplicate definitions are errors', () => {
    const r = run(['a=1', 'a=2']);
    expect(r[0]!.analysis.kind).toBe('error');
    expect(r[1]!.analysis.kind).toBe('error');
  });
  it('angle mode applies to function bodies', () => {
    const r = run(['f(x)=\\sin\\left(x\\right)', 'f(30)'], deg);
    expect(kind(r[1]!.analysis, 'value').value).toBeCloseTo(0.5);
  });
  it('ids and order are preserved', () => {
    const r = run(['a=1', '', 'y=x']);
    expect(r.map((l) => l.id)).toEqual(['l0', 'l1', 'l2']);
  });
  it('opts.variables are visible', () => {
    const r = analyzeExpressions([{ id: 'q', latex: 'y=kx' }], { angleMode: 'rad', variables: { k: 3 } });
    expect(kind(r[0]!.analysis, 'explicit').fn(2)).toBe(6);
  });
});

describe('undefined variables and errors', () => {
  it('reports undefined variables', () => {
    const r = run(['y=ax']);
    expect(r[0]!.analysis.kind).toBe('error');
    expect((r[0]!.analysis as { message: string }).message).toBe("Too many variables, try defining 'a'");
    expect(r[0]!.undefinedVariables).toEqual(['a']);
  });
  it('reports several, ignores x y r theta t e pi', () => {
    const r = run(['y=ax+b+e+\\pi']);
    expect(r[0]!.undefinedVariables.sort()).toEqual(['a', 'b']);
    expect(run(['(t,t)', 'r=\\theta', 'y=e^x'])[2]!.undefinedVariables).toEqual([]);
  });
  it('subscripted undefined variables', () => {
    expect(run(['y=a_1x'])[0]!.undefinedVariables).toEqual(['a_1']);
  });
  it('undefined in assignment RHS and via other lines', () => {
    const r = run(['b=2a', 'y=bx']);
    expect(r[0]!.analysis.kind).toBe('error');
    expect(r[0]!.undefinedVariables).toEqual(['a']);
    expect(r[1]!.analysis.kind).toBe('error');
    const fixed = run(['b=2a', 'y=bx', 'a=1']);
    expect(fixed.every((l) => l.analysis.kind !== 'error')).toBe(true);
  });
  it('never throws on garbage', () => {
    for (const bad of ['\\frac{', '(((', 'y=', '=', '\\foo{x}', '1<x<2', '(1,2,3)', 'x+y', '2=2', '\\sin', '||', '$', 'y=x,2']) {
      const a = one(bad);
      expect(['error', 'empty']).toContain(a.kind);
      if (a.kind === 'error') expect(a.message.length).toBeGreaterThan(0);
    }
  });
  it('x/y in a variable definition is not an assignment', () => {
    const a = one('a=x');
    expect(a.kind).toBe('error');
  });
});

describe('performance', () => {
  it('compiled functions are fast', () => {
    const r = run(['a=2', 'f(x)=a\\sin\\left(x\\right)+x^2', 'y=f(x)+\\frac{x}{3}']);
    const fn = kind(r[2]!.analysis, 'explicit').fn;
    const t0 = performance.now();
    let s = 0;
    for (let i = 0; i < 1_000_000; i++) s += fn(i * 0.001);
    expect(Number.isFinite(s)).toBe(true);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});
