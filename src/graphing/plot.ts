// Drawing of analyzed expressions onto a Canvas 2D context.
import type { ExprAnalysis, Relation } from '../math/types';
import { marchImplicit } from './implicit';
import type { Tf } from './transform';

export interface PlotItem {
  id: string;
  color: string;
  hidden: boolean;
  analysis: ExprAnalysis;
}

/** Geometry (CSS px) kept from the last draw, used for tracing. */
export interface TraceData {
  /** Flat polylines; a 2-length polyline is a single point. */
  polys: number[][];
  /** For single-point polylines: exact world coordinates (parallel to polys). */
  exact?: Array<{ x: number; y: number } | undefined>;
}

export type Quality = 'fast' | 'full';

const BIG = 1e5;
const LINE_WIDTH = 2.5;

export function isGraphable(a: ExprAnalysis): boolean {
  switch (a.kind) {
    case 'explicit':
    case 'polar':
    case 'parametric':
    case 'implicit':
    case 'points':
      return true;
    case 'function-def':
      return !!a.graph;
    default:
      return false;
  }
}

function call1(f: (t: number) => number, t: number): number {
  try {
    const v = f(t);
    return Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

type Sampler = (t: number, out: number[]) => void;

/**
 * Adaptive curve sampler. `f` writes pixel coordinates (NaN when undefined).
 * Returns polylines broken at undefined regions and at jumps.
 */
function sampleCurve(
  f: Sampler,
  t0: number,
  t1: number,
  n: number,
  maxDepth: number,
  breakDist: number,
  forceDist: number,
  maxPts: number,
): number[][] {
  const lines: number[][] = [];
  let cur: number[] = [];
  const out = [0, 0];
  let count = 0;

  const ev = (t: number): [number, number] => {
    f(t, out);
    let x = out[0]!;
    let y = out[1]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [NaN, NaN];
    if (x > BIG) x = BIG;
    else if (x < -BIG) x = -BIG;
    if (y > BIG) y = BIG;
    else if (y < -BIG) y = -BIG;
    return [x, y];
  };
  const brk = (): void => {
    if (cur.length >= 4) lines.push(cur);
    cur = [];
  };
  const push = (x: number, y: number): void => {
    cur.push(x, y);
    count++;
  };

  const refine = (
    ta: number, ax: number, ay: number,
    tb: number, bx: number, by: number,
    d: number,
  ): void => {
    const fa = !Number.isNaN(ax);
    const fb = !Number.isNaN(bx);
    if (!fa && !fb) {
      brk();
      return;
    }
    const dist = fa && fb ? Math.hypot(bx - ax, by - ay) : Infinity;
    if (d >= maxDepth || count > maxPts) {
      if (fa && fb) {
        if (dist > breakDist) {
          brk();
          push(bx, by);
        } else push(bx, by);
      } else if (fa) brk();
      else {
        brk();
        push(bx, by);
      }
      return;
    }
    const tm = (ta + tb) / 2;
    const [mx, my] = ev(tm);
    const fm = !Number.isNaN(mx);
    let split = false;
    if (fa !== fb || fm !== fa) split = true;
    else if (fa && fb) {
      if (dist > forceDist) split = true;
      else {
        const dx = bx - ax, dy = by - ay;
        const len = Math.hypot(dx, dy);
        const dev = len < 1e-9 ? Math.hypot(mx - ax, my - ay) : Math.abs((mx - ax) * dy - (my - ay) * dx) / len;
        if (dev > 0.2) split = true;
      }
    }
    if (!split) {
      push(bx, by);
      return;
    }
    refine(ta, ax, ay, tm, mx, my, d + 1);
    refine(tm, mx, my, tb, bx, by, d + 1);
  };

  let [px, py] = ev(t0);
  if (!Number.isNaN(px)) push(px, py);
  for (let i = 1; i <= n; i++) {
    const ta = t0 + ((t1 - t0) * (i - 1)) / n;
    const tb = i === n ? t1 : t0 + ((t1 - t0) * i) / n;
    const [qx, qy] = ev(tb);
    refine(ta, px, py, tb, qx, qy, 0);
    px = qx;
    py = qy;
  }
  brk();
  return lines;
}

function strokePolys(ctx: CanvasRenderingContext2D, polys: number[][], color: string, dashed: boolean): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = dashed ? 'butt' : 'round';
  if (dashed) ctx.setLineDash([9, 7]);
  ctx.beginPath();
  for (const p of polys) {
    ctx.moveTo(p[0]!, p[1]!);
    if (p.length === 2) ctx.lineTo(p[0]! + 0.01, p[1]!);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i]!, p[i + 1]!);
  }
  ctx.stroke();
  ctx.restore();
}

function fillPolys(ctx: CanvasRenderingContext2D, polys: number[][], color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  for (const p of polys) {
    ctx.moveTo(p[0]!, p[1]!);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i]!, p[i + 1]!);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

function isStrict(op: Relation): boolean {
  return op === '<' || op === '>';
}

function drawImplicit(
  ctx: CanvasRenderingContext2D,
  F: (x: number, y: number) => number,
  op: Relation,
  color: string,
  tf: Tf,
  quality: Quality,
): number[][] {
  const cell = quality === 'fast' ? 9 : 5;
  const res = marchImplicit(F, tf, cell, op, op !== '=');
  if (op !== '=') fillPolys(ctx, res.fills, color);
  strokePolys(ctx, res.lines, color, isStrict(op));
  return res.lines;
}

/** Draw one item and return its trace geometry. */
export function drawItem(ctx: CanvasRenderingContext2D, item: PlotItem, tf: Tf, quality: Quality): TraceData {
  const a = item.analysis;
  const color = item.color;
  switch (a.kind) {
    case 'explicit':
      return { polys: drawExplicit(ctx, a.fn, a.dep, a.op, color, tf, quality) };
    case 'function-def':
      if (!a.graph) return { polys: [] };
      return { polys: drawExplicit(ctx, a.graph.fn, 'y', '=', color, tf, quality) };
    case 'parametric': {
      const { fx, fy } = a;
      const lo = Math.min(a.tMin, a.tMax);
      const hi = Math.max(a.tMin, a.tMax);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { polys: [] };
      const polys = sampleCurve(
        (t, o) => {
          o[0] = tf.px(call1(fx, t));
          o[1] = tf.py(call1(fy, t));
        },
        lo, hi, 2000, 8, tf.h, tf.h / 3, 60000,
      );
      strokePolys(ctx, polys, color, false);
      return { polys };
    }
    case 'polar': {
      const fn = a.fn;
      const lo = Math.min(a.thetaMin, a.thetaMax);
      const hi = Math.max(a.thetaMin, a.thetaMax);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { polys: [] };
      if (a.op !== '=') {
        drawImplicit(
          ctx,
          (x, y) => {
            const v = call1(fn, Math.atan2(y, x));
            return Math.hypot(x, y) - v;
          },
          a.op, color, tf, quality,
        );
      }
      const polys = sampleCurve(
        (t, o) => {
          const r = call1(fn, t);
          o[0] = tf.px(r * Math.cos(t));
          o[1] = tf.py(r * Math.sin(t));
        },
        lo, hi, 2000, 8, tf.h, tf.h / 3, 60000,
      );
      strokePolys(ctx, polys, color, a.op !== '=' && isStrict(a.op));
      return { polys };
    }
    case 'implicit':
      return { polys: drawImplicit(ctx, a.fn, a.op, color, tf, quality) };
    case 'points': {
      const polys: number[][] = [];
      const exact: Array<{ x: number; y: number } | undefined> = [];
      ctx.save();
      ctx.fillStyle = color;
      for (const p of a.points) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
        const px = tf.px(p.x), py = tf.py(p.y);
        polys.push([px, py]);
        exact.push({ x: p.x, y: p.y });
        if (px < -10 || py < -10 || px > tf.w + 10 || py > tf.h + 10) continue;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return { polys, exact };
    }
    default:
      return { polys: [] };
  }
}

function drawExplicit(
  ctx: CanvasRenderingContext2D,
  fn: (t: number) => number,
  dep: 'x' | 'y',
  op: Relation,
  color: string,
  tf: Tf,
  quality: Quality,
): number[][] {
  const horizontal = dep === 'y';
  const span = horizontal ? tf.w : tf.h;
  if (op !== '=') {
    // Column / row shading, evaluated per pixel strip.
    const step = quality === 'fast' ? 3 : 1.5;
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    const greater = op === '>' || op === '>=';
    for (let s = 0; s < span; s += step) {
      const c = s + step / 2;
      if (horizontal) {
        const v = call1(fn, tf.x(c));
        if (Number.isNaN(v)) continue;
        const py = Math.min(tf.h, Math.max(0, tf.py(v)));
        if (greater) ctx.rect(s, 0, step + 0.4, py);
        else ctx.rect(s, py, step + 0.4, tf.h - py);
      } else {
        const v = call1(fn, tf.y(c));
        if (Number.isNaN(v)) continue;
        const px = Math.min(tf.w, Math.max(0, tf.px(v)));
        if (greater) ctx.rect(px, s, tf.w - px, step + 0.4);
        else ctx.rect(0, s, px, step + 0.4);
      }
    }
    ctx.fill();
    ctx.restore();
  }
  const sampler: Sampler = horizontal
    ? (t, o) => {
        o[0] = tf.px(t);
        o[1] = tf.py(call1(fn, t));
      }
    : (t, o) => {
        o[0] = tf.px(call1(fn, t));
        o[1] = tf.py(t);
      };
  const t0 = horizontal ? tf.xmin : tf.ymin;
  const t1 = horizontal ? tf.xmax : tf.ymax;
  const n = Math.max(20, Math.ceil(span / (quality === 'fast' ? 4 : 2)));
  const polys = sampleCurve(sampler, t0, t1, n, 10, 10, Math.max(tf.w, tf.h) * 0.4, 80000);
  strokePolys(ctx, polys, color, op !== '=' && isStrict(op));
  return polys;
}

/** Nearest point on the trace geometry to (mx,my), in CSS px. */
export function nearestOnTrace(
  trace: TraceData,
  mx: number,
  my: number,
): { px: number; py: number; dist: number; exact?: { x: number; y: number } } | null {
  let best: { px: number; py: number; dist: number; exact?: { x: number; y: number } } | null = null;
  for (let k = 0; k < trace.polys.length; k++) {
    const p = trace.polys[k]!;
    if (p.length === 2) {
      const d = Math.hypot(p[0]! - mx, p[1]! - my);
      if (!best || d < best.dist) {
        best = { px: p[0]!, py: p[1]!, dist: d };
        const e = trace.exact?.[k];
        if (e) best.exact = e;
      }
      continue;
    }
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i]!, ay = p[i + 1]!, bx = p[i + 2]!, by = p[i + 3]!;
      const dx = bx - ax, dy = by - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((mx - ax) * dx + (my - ay) * dy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      const qx = ax + t * dx, qy = ay + t * dy;
      const d = Math.hypot(qx - mx, qy - my);
      if (!best || d < best.dist) best = { px: qx, py: qy, dist: d };
    }
  }
  return best;
}
