// Every function key on the graphing keypad must produce LaTeX the math engine can graph.
import { describe, expect, it } from 'vitest';
import { analyzeExpressions } from '../math';
import source from './keypad.ts?raw';

/** Unescape a single-quoted TS string literal body. */
const unquote = (s: string): string => s.replace(/\\\\/g, '\\');

const keyLatex = [...source.matchAll(/latex: '((?:[^'\\]|\\.)*)'/g)]
  .map((m) => unquote(m[1]!))
  // Only templates and named functions/constants; plain digits, operators,
  // brackets, single letters and subscripts aren't complete expressions.
  .filter((l) => (l.includes('\\') || l.includes('#')) && !l.includes('_{#?}') && !l.endsWith('='))
  .filter((l) => !['\\cdot ', '\\le', '\\ge', '\\alpha', '\\beta', '\\theta'].includes(l));

/** Fill MathLive template slots: #@ (previous) and the first #? with x, later #? with 3. */
function fill(latex: string): string {
  let first = true;
  return latex.replace(/#@/g, 'x').replace(/#\?/g, () => {
    const v = first ? 'x' : '3';
    first = false;
    return v;
  });
}

const exampleLatex = [...source.matchAll(/latex: \[([^\]]*)\]/g)].map((m) =>
  [...m[1]!.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((q) => unquote(q[1]!)),
);

describe('graphing keypad', () => {
  it('finds the keys', () => {
    expect(keyLatex.length).toBeGreaterThan(25);
    expect(exampleLatex.length).toBe(12);
  });

  it.each(keyLatex)('key %s graphs as y = …', (latex) => {
    const expr = latex === '!' ? 'y=x!' : `y=${fill(latex)}`;
    const [line] = analyzeExpressions([{ id: 'k', latex: expr }], { angleMode: 'rad' });
    expect(line!.analysis.kind, `${expr}: ${JSON.stringify(line!.analysis)}`).not.toBe('error');
  });

  it.each(exampleLatex.map((l) => [l.join(' ; '), l] as const))('example %s analyzes without errors', (_name, latexes) => {
    const lines = analyzeExpressions(
      latexes.map((latex, i) => ({ id: String(i), latex })),
      { angleMode: 'rad' },
    );
    for (const line of lines) expect(line.analysis.kind, JSON.stringify(line.analysis)).not.toBe('error');
  });
});
