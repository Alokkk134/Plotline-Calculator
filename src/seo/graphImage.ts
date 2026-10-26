// Static SVG images of a graph guide's equations, rendered at build time with
// Plotline's own math engine. Used as the illustration on each graph guide
// (with alt text), so the pages have real images for readers and Google Images.
import { analyzeExpressions, type ExprAnalysis } from '../math';

export const IMAGE_W = 640;
export const IMAGE_H = 400;
/** Curve colors, in the order the app assigns them (see --c1..--c6 in base.css). */
const PALETTE = ['#5b4fe0', '#f2545b', '#0fa38f', '#f59e0b', '#d946ef', '#0ea5e9'];

type View = { xmin: number; xmax: number; ymin: number; ymax: number };

const fmt = (n: number): string => (Math.round(n * 10) / 10).toString();

/** A "nice" grid step (1, 2 or 5 × 10ⁿ) giving roughly `target` divisions. */
function niceStep(range: number, target: number): number {
  const raw = range / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

const tickLabel = (v: number): string => {
  const r = Math.round(v * 1000) / 1000;
  return (Object.is(r, -0) ? 0 : r).toString().replace('-', '−');
};

/** Render the graphable expressions of `latex` into an SVG document. */
export function graphSvg(latex: string[], view?: View): string {
  const v: View = view ?? { xmin: -10, xmax: 10, ymin: -6.25, ymax: 6.25 };
  const sx = (x: number): number => ((x - v.xmin) / (v.xmax - v.xmin)) * IMAGE_W;
  const sy = (y: number): number => IMAGE_H - ((y - v.ymin) / (v.ymax - v.ymin)) * IMAGE_H;
  const out: string[] = [];

  // Grid, axes and labels.
  const xs = niceStep(v.xmax - v.xmin, 10);
  const ys = niceStep(v.ymax - v.ymin, 7);
  const grid: string[] = [];
  for (let x = Math.ceil(v.xmin / xs) * xs; x <= v.xmax; x += xs) grid.push(`M${fmt(sx(x))} 0V${IMAGE_H}`);
  for (let y = Math.ceil(v.ymin / ys) * ys; y <= v.ymax; y += ys) grid.push(`M0 ${fmt(sy(y))}H${IMAGE_W}`);
  out.push(`<path d="${grid.join('')}" stroke="#e8e6f5" stroke-width="1"/>`);
  const ax = Math.min(Math.max(sx(0), 0), IMAGE_W);
  const ay = Math.min(Math.max(sy(0), 0), IMAGE_H);
  out.push(`<path d="M${fmt(ax)} 0V${IMAGE_H}M0 ${fmt(ay)}H${IMAGE_W}" stroke="#3a3566" stroke-width="1.6"/>`);
  const labels: string[] = [];
  for (let x = Math.ceil(v.xmin / xs) * xs; x <= v.xmax; x += xs) {
    if (Math.abs(x) < xs / 2) continue;
    labels.push(`<text x="${fmt(sx(x))}" y="${fmt(Math.min(ay + 16, IMAGE_H - 4))}" text-anchor="middle">${tickLabel(x)}</text>`);
  }
  for (let y = Math.ceil(v.ymin / ys) * ys; y <= v.ymax; y += ys) {
    if (Math.abs(y) < ys / 2) continue;
    labels.push(`<text x="${fmt(Math.max(ax - 6, 22))}" y="${fmt(sy(y) + 4)}" text-anchor="end">${tickLabel(y)}</text>`);
  }
  out.push(`<g font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="12" fill="#625e86">${labels.join('')}</g>`);

  // Curves.
  const lines = analyzeExpressions(latex.map((l, i) => ({ id: String(i), latex: l })), { angleMode: 'rad' });
  let colorIndex = 0;
  for (const line of lines) {
    const a = line.analysis;
    if (!isDrawable(a)) continue;
    const color = PALETTE[colorIndex++ % PALETTE.length]!;
    out.push(...drawAnalysis(a, v, sx, sy, color));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${IMAGE_W} ${IMAGE_H}" width="${IMAGE_W}" height="${IMAGE_H}">
<rect width="${IMAGE_W}" height="${IMAGE_H}" fill="#fcfcff"/>
${out.join('\n')}
<text x="${IMAGE_W - 10}" y="${IMAGE_H - 10}" text-anchor="end" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#5b4fe0" opacity="0.8">tryplotline.xyz</text>
</svg>`;
}

function isDrawable(a: ExprAnalysis): boolean {
  return (
    a.kind === 'explicit' || a.kind === 'polar' || a.kind === 'parametric' || a.kind === 'implicit' ||
    (a.kind === 'function-def' && !!a.graph)
  );
}

/** Split sampled points into polyline segments, breaking at gaps and jumps. */
function polylines(pts: ([number, number] | null)[], maxJump: number): string[] {
  const segs: string[] = [];
  let cur: string[] = [];
  let prev: [number, number] | null = null;
  const flush = (): void => {
    if (cur.length > 1) segs.push(`M${cur.join('L')}`);
    cur = [];
  };
  for (const p of pts) {
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      flush();
      prev = null;
      continue;
    }
    if (prev && Math.abs(p[1] - prev[1]) > maxJump) flush();
    cur.push(`${fmt(p[0])} ${fmt(p[1])}`);
    prev = p;
  }
  flush();
  return segs;
}

function drawAnalysis(
  a: ExprAnalysis,
  v: View,
  sx: (x: number) => number,
  sy: (y: number) => number,
  color: string,
): string[] {
  const stroke = (d: string, dashed = false): string =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"${dashed ? ' stroke-dasharray="9 7"' : ''}/>`;
  const clampY = (y: number): number => Math.max(-IMAGE_H, Math.min(2 * IMAGE_H, y));
  const N = 800;

  if (a.kind === 'explicit' || (a.kind === 'function-def' && a.graph)) {
    const fn = a.kind === 'explicit' ? a.fn : a.graph!.fn;
    const dep = a.kind === 'explicit' ? a.dep : 'y';
    const op = a.kind === 'explicit' ? a.op : '=';
    if (dep === 'x') {
      const pts = Array.from({ length: N + 1 }, (_, i) => {
        const y = v.ymin + ((v.ymax - v.ymin) * i) / N;
        return [sx(fn(y)), sy(y)] as [number, number];
      });
      return polylines(pts, IMAGE_W).map((d) => stroke(d));
    }
    const pts = Array.from({ length: N + 1 }, (_, i) => {
      const x = v.xmin + ((v.xmax - v.xmin) * i) / N;
      const y = fn(x);
      return Number.isFinite(y) ? ([sx(x), clampY(sy(y))] as [number, number]) : null;
    });
    const out: string[] = [];
    if (op !== '=') {
      // Shade above (>, ≥) or below (<, ≤) the boundary curve.
      const edge = op === '>' || op === '>=' ? 0 : IMAGE_H;
      const valid = pts.filter((p): p is [number, number] => !!p);
      if (valid.length > 1) {
        const poly = [`${fmt(valid[0]![0])} ${edge}`, ...valid.map((p) => `${fmt(p[0])} ${fmt(p[1])}`), `${fmt(valid[valid.length - 1]![0])} ${edge}`];
        out.push(`<path d="M${poly.join('L')}Z" fill="${color}" fill-opacity="0.22"/>`);
      }
    }
    // Large jumps (asymptotes such as tan or 1/x) break the line.
    out.push(...polylines(pts, IMAGE_H * 0.9).map((d) => stroke(d, op === '<' || op === '>')));
    return out;
  }

  if (a.kind === 'polar' || a.kind === 'parametric') {
    const M = 2400;
    const pts = Array.from({ length: M + 1 }, (_, i) => {
      if (a.kind === 'polar') {
        const t = a.thetaMin + ((a.thetaMax - a.thetaMin) * i) / M;
        const r = a.fn(t);
        return [sx(r * Math.cos(t)), sy(r * Math.sin(t))] as [number, number];
      }
      const t = a.tMin + ((a.tMax - a.tMin) * i) / M;
      return [sx(a.fx(t)), sy(a.fy(t))] as [number, number];
    });
    return polylines(pts, IMAGE_H).map((d) => stroke(d));
  }

  if (a.kind === 'implicit') {
    // Marching squares on a grid of the zero contour of fn(x, y).
    const G = 160;
    const H = Math.round((G * IMAGE_H) / IMAGE_W);
    const fx = (i: number): number => v.xmin + ((v.xmax - v.xmin) * i) / G;
    const fy = (j: number): number => v.ymin + ((v.ymax - v.ymin) * j) / H;
    const val: number[][] = [];
    for (let i = 0; i <= G; i++) {
      val.push([]);
      for (let j = 0; j <= H; j++) val[i]!.push(a.fn(fx(i), fy(j)));
    }
    const segs: string[] = [];
    const lerp = (i0: number, j0: number, i1: number, j1: number): string => {
      const v0 = val[i0]![j0]!;
      const v1 = val[i1]![j1]!;
      const t = v0 === v1 ? 0.5 : v0 / (v0 - v1);
      return `${fmt(sx(fx(i0 + (i1 - i0) * t)))} ${fmt(sy(fy(j0 + (j1 - j0) * t)))}`;
    };
    for (let i = 0; i < G; i++) {
      for (let j = 0; j < H; j++) {
        const corners: [number, number][] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        const crossings: string[] = [];
        for (let k = 0; k < 4; k++) {
          const [i0, j0] = corners[k]!;
          const [i1, j1] = corners[(k + 1) % 4]!;
          const s0 = val[i0]![j0]!;
          const s1 = val[i1]![j1]!;
          if (Number.isFinite(s0) && Number.isFinite(s1) && (s0 < 0) !== (s1 < 0)) crossings.push(lerp(i0, j0, i1, j1));
        }
        if (crossings.length >= 2) segs.push(`M${crossings[0]}L${crossings[1]}`);
        if (crossings.length === 4) segs.push(`M${crossings[2]}L${crossings[3]}`);
      }
    }
    return segs.length ? [stroke(segs.join(''), a.op === '<' || a.op === '>')] : [];
  }
  return [];
}
