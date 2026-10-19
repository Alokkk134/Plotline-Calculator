// Math engine public API. Implementation lives in tokenizer / parser / compile / analyze / format.
import { analyzeLines } from './analyze';
import { evalLatex } from './evaluate';
import { formatNumber as format } from './format';
import type { AnalyzedLine, EvalOptions, EvalResult, ExpressionInput } from './types';

export * from './types';

/**
 * Analyze every expression line together (so "a=2" and "y=ax" resolve each other,
 * and "f(x)=x^2" is callable from "y=f(x)+1"). Order of the result matches input.
 */
export function analyzeExpressions(inputs: ExpressionInput[], opts: EvalOptions): AnalyzedLine[] {
  return analyzeLines(inputs, opts);
}

/** Evaluate one LaTeX expression to a number (scientific / four-function calculators). */
export function evaluateLatex(latex: string, opts: EvalOptions): EvalResult {
  return evalLatex(latex, opts);
}

/**
 * Display formatting: up to 10 significant digits, trims zeros, '-0' -> '0'.
 * |n| >= 1e12 or 0 < |n| < 1e-6 use unicode scientific text, e.g. "1.2345×10¹²".
 */
export function formatNumber(n: number): string {
  return format(n);
}
