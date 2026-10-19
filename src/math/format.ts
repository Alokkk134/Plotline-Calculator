// Number formatting for results and labels.
// Scientific notation is plain unicode text: 1.2345×10¹² (superscript digits, '⁻' for negative exponents).

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

export function formatNumber(n: number): string {
  if (Number.isNaN(n)) return 'undefined';
  if (n === Infinity) return '∞';
  if (n === -Infinity) return '-∞';
  const r = Number(n.toPrecision(10));
  if (r === 0) return '0';
  const abs = Math.abs(r);
  if (abs >= 1e12 || abs < 1e-6) {
    const [mant, exp] = r.toExponential(9).split('e') as [string, string];
    const m = mant.includes('.') ? mant.replace(/\.?0+$/, '') : mant;
    const e = String(parseInt(exp, 10));
    return `${m}×10${[...e].map((c) => SUP[c] ?? c).join('')}`;
  }
  return String(r);
}
