// Public contract of the math engine (src/math). Graphing, Scientific and
// Four Function calculators depend only on what is exported from ./index.ts.
// Input is the LaTeX produced by a MathLive <math-field> (e.g. "y=\\sin\\left(x\\right)",
// "\\frac{1}{2}x^{2}", "f\\left(x\\right)=x^2", "\\left(1,2\\right)", "r=\\theta").

export type AngleMode = 'rad' | 'deg';

export type Relation = '=' | '<' | '<=' | '>' | '>=';

export interface Point {
  x: number;
  y: number;
}

/** What one expression line means once analyzed in the context of all lines. */
export type ExprAnalysis =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  /** Constant expression, e.g. "2+3" or "\\sin(\\pi/2)" -> show "= 5" next to it. */
  | { kind: 'value'; value: number }
  /** Variable assignment "a=3" (or "a=2b"). `isSlider` when RHS is a plain number literal. */
  | { kind: 'assignment'; name: string; value: number; isSlider: boolean }
  /** Function definition "f(x)=x^2". Graphed when it has exactly one parameter. */
  | { kind: 'function-def'; name: string; params: string[]; graph?: { fn: (x: number) => number } }
  /** y = f(x) (dep 'y', fn of x) or x = f(y) (dep 'x', fn of y); also bare "x^2". Inequalities via op. */
  | { kind: 'explicit'; dep: 'y' | 'x'; op: Relation; fn: (t: number) => number }
  /** r = f(theta), theta in [0, 2pi] by default (rad mode; deg mode converts). */
  | { kind: 'polar'; op: Relation; fn: (theta: number) => number; thetaMin: number; thetaMax: number }
  /** "(f(t), g(t))", t in [0, 1] unless tMin/tMax given. */
  | { kind: 'parametric'; fx: (t: number) => number; fy: (t: number) => number; tMin: number; tMax: number }
  /** Any other relation in x and y: plot F(x,y) = lhs - rhs with sign op. */
  | { kind: 'implicit'; op: Relation; fn: (x: number, y: number) => number }
  /** "(1,2)" or "(1,2),(3,4)" — constant points. */
  | { kind: 'points'; points: Point[] };

export interface AnalyzedLine {
  id: string;
  analysis: ExprAnalysis;
  /**
   * Single-letter variables used but not defined anywhere (excluding x, y, r, theta, t, e, pi).
   * The graphing UI offers "add slider" buttons for these.
   */
  undefinedVariables: string[];
}

export interface ExpressionInput {
  id: string;
  latex: string;
}

export interface EvalOptions {
  angleMode: AngleMode;
  /** Extra variables, e.g. { ans: 42 } for the scientific calculator. */
  variables?: Record<string, number>;
}

export type EvalResult = { ok: true; value: number } | { ok: false; error: string };
