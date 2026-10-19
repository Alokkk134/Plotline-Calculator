// One-click Matrix examples (also checked by examples.test.ts).
// {0}, {1} stand for the example's matrices; they are given free letters
// (or reuse an identical existing matrix) when the example runs.

export interface MatrixExample {
  name: string;
  hint: string;
  matrices: string[][][];
  /** Expression typed into the calculator, with {0}/{1} placeholders. */
  expr: string;
  /** Card preview in LaTeX, with {0}/{1} replaced by the matrices. */
  latex: string;
  /** Expected result as formatted text (scalar) or rows (matrix). */
  expect: string | string[][];
}

export const MATRIX_EXAMPLES: MatrixExample[] = [
  {
    name: 'Determinant', hint: 'One number that says if A can be inverted',
    matrices: [[['4', '7'], ['2', '6']]], expr: 'det({0})', latex: '\\det{0}', expect: '10',
  },
  {
    name: 'Inverse', hint: 'Exact fractions, no rounding',
    matrices: [[['4', '7'], ['2', '6']]], expr: '{0}^-1', latex: '{0}^{-1}',
    expect: [['3/5', '-7/10'], ['-1/5', '2/5']],
  },
  {
    name: 'Multiply', hint: 'Row × column for each entry',
    matrices: [[['1', '2'], ['3', '4']], [['5', '6'], ['7', '8']]], expr: '{0}*{1}', latex: '{0}{1}',
    expect: [['19', '22'], ['43', '50']],
  },
  {
    name: 'Scale and add', hint: 'Double A, then add the identity I',
    matrices: [[['1', '2'], ['3', '4']]], expr: '2{0}+I2', latex: '2{0}+I',
    expect: [['3', '4'], ['6', '9']],
  },
  {
    name: 'Transpose', hint: 'Rows become columns',
    matrices: [[['1', '2', '3'], ['4', '5', '6']]], expr: '{0}^T', latex: '{0}^{T}',
    expect: [['1', '4'], ['2', '5'], ['3', '6']],
  },
  {
    name: 'Solve equations', hint: '2x + y = 5 and x + 3y = 10',
    matrices: [[['2', '1'], ['1', '3']], [['5'], ['10']]], expr: 'inv({0})*{1}', latex: '{0}^{-1}{1}',
    expect: [['1'], ['3']],
  },
  {
    name: 'Row reduce (RREF)', hint: 'Simplest form of the rows',
    matrices: [[['1', '2', '3'], ['2', '5', '8']]], expr: 'rref({0})', latex: '\\operatorname{rref}{0}',
    expect: [['1', '0', '-1'], ['0', '1', '2']],
  },
  {
    name: 'Rank', hint: 'Row 2 is just 2 × row 1',
    matrices: [[['1', '2'], ['2', '4']]], expr: 'rank({0})', latex: '\\operatorname{rank}{0}', expect: '1',
  },
  {
    name: 'Trace', hint: 'Sum of the diagonal',
    matrices: [[['5', '1', '0'], ['2', '3', '4'], ['0', '1', '7']]], expr: 'trace({0})', latex: '\\operatorname{tr}{0}',
    expect: '15',
  },
  {
    name: 'Fibonacci by power', hint: 'Raising to the 5th power',
    matrices: [[['1', '1'], ['1', '0']]], expr: '{0}^5', latex: '{0}^{5}', expect: [['8', '5'], ['5', '3']],
  },
  {
    name: 'Check an inverse', hint: 'A times its inverse is I',
    matrices: [[['2', '1'], ['1', '1']]], expr: '{0}*inv({0})', latex: '{0}{0}^{-1}', expect: [['1', '0'], ['0', '1']],
  },
  {
    name: 'Fraction entries', hint: 'Cells can be fractions like 1/3',
    matrices: [[['1/2', '1/3'], ['1/4', '1/5']]], expr: 'det({0})', latex: '\\det{0}', expect: '1/60',
  },
];

/** LaTeX for a matrix of cell strings (fractions shown as \frac). */
export function matrixLatex(rows: string[][]): string {
  const cell = (c: string): string => {
    const m = /^(-?)(\d+)\/(\d+)$/.exec(c.trim());
    return m ? `${m[1]}\\frac{${m[2]}}{${m[3]}}` : c;
  };
  return `\\begin{bmatrix}${rows.map((r) => r.map(cell).join('&')).join('\\\\')}\\end{bmatrix}`;
}

/** Replace {0}, {1}… in `template` with the given strings. */
export function fill(template: string, parts: string[]): string {
  return template.replace(/\{(\d)\}/g, (_, i: string) => parts[Number(i)] ?? '');
}
