// Marching squares for implicit curves F(x,y) op 0, with one level of
// refinement near sign changes and polyline chaining (for dashing / tracing).
import type { Relation } from '../math/types';
import type { Tf } from './transform';

export interface ImplicitResult {
  /** Flat [x0,y0,x1,y1,...] polylines in CSS px. */
  lines: number[][];
  /** Flat closed polygons in CSS px (only when fill requested). */
  fills: number[][];
}

type F2 = (x: number, y: number) => number;

function safe(F: F2, x: number, y: number): number {
  try {
    const v = F(x, y);
    return Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

/** Canonical (order independent) zero crossing between two corner samples. */
function crossing(x1: number, y1: number, v1: number, x2: number, y2: number, v2: number, out: number[]): void {
  if (x1 > x2 || (x1 === x2 && y1 > y2)) {
    const tx = x1, ty = y1, tv = v1;
    x1 = x2; y1 = y2; v1 = v2;
    x2 = tx; y2 = ty; v2 = tv;
  }
  let t = v1 / (v1 - v2);
  if (!Number.isFinite(t)) t = 0.5;
  t = Math.min(1, Math.max(0, t));
  out.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
}

export function marchImplicit(F: F2, tf: Tf, cell: number, op: Relation, wantFill: boolean): ImplicitResult {
  const cols = Math.ceil(tf.w / cell);
  const rows = Math.ceil(tf.h / cell);
  const vw = cols + 1;
  const vals = new Float64Array(vw * (rows + 1));
  for (let j = 0; j <= rows; j++) {
    const y = tf.y(j * cell);
    for (let i = 0; i <= cols; i++) vals[j * vw + i] = safe(F, tf.x(i * cell), y);
  }

  const segs: number[] = [];
  const fills: number[][] = [];
  const strictOp = op === '<' || op === '>';
  const less = op === '<' || op === '<=';
  const inside = (v: number): boolean => {
    if (Number.isNaN(v)) return false;
    if (less) return strictOp ? v < 0 : v <= 0;
    return strictOp ? v > 0 : v >= 0;
  };

  const tmp: number[] = [];
  // Corners: TL, TR, BR, BL.
  const processCell = (x: number, y: number, x1: number, y1: number, a: number, b: number, c: number, d: number): void => {
    if (wantFill) {
      const ia = inside(a), ib = inside(b), ic = inside(c), id = inside(d);
      if (ia && ib && ic && id) {
        fills.push([x, y, x1, y, x1, y1, x, y1]);
      } else if (ia || ib || ic || id) {
        const poly: number[] = [];
        const cx = [x, x1, x1, x], cy = [y, y, y1, y1], cv = [a, b, c, d], ci = [ia, ib, ic, id];
        for (let k = 0; k < 4; k++) {
          const n = (k + 1) % 4;
          if (ci[k]) poly.push(cx[k]!, cy[k]!);
          if (ci[k] !== ci[n]) {
            const va = cv[k]!, vb = cv[n]!;
            if (Number.isNaN(va) || Number.isNaN(vb)) poly.push((cx[k]! + cx[n]!) / 2, (cy[k]! + cy[n]!) / 2);
            else crossing(cx[k]!, cy[k]!, va, cx[n]!, cy[n]!, vb, poly);
          }
        }
        if (poly.length >= 6) fills.push(poly);
      }
    }
    if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c) || Number.isNaN(d)) return;
    const idx = (a < 0 ? 8 : 0) | (b < 0 ? 4 : 0) | (c < 0 ? 2 : 0) | (d < 0 ? 1 : 0);
    if (idx === 0 || idx === 15) return;
    const T = 0, R = 1, B = 2, L = 3;
    const edge = (e: number): void => {
      tmp.length = 0;
      if (e === T) crossing(x, y, a, x1, y, b, tmp);
      else if (e === R) crossing(x1, y, b, x1, y1, c, tmp);
      else if (e === B) crossing(x, y1, d, x1, y1, c, tmp);
      else crossing(x, y, a, x, y1, d, tmp);
      segs.push(tmp[0]!, tmp[1]!);
    };
    const seg = (e1: number, e2: number): void => {
      edge(e1);
      edge(e2);
    };
    switch (idx) {
      case 1: seg(L, B); break;
      case 2: seg(B, R); break;
      case 3: seg(L, R); break;
      case 4: seg(T, R); break;
      case 5:
        if ((a + b + c + d) / 4 < 0) { seg(T, L); seg(B, R); } else { seg(T, R); seg(L, B); }
        break;
      case 6: seg(T, B); break;
      case 7: seg(T, L); break;
      case 8: seg(T, L); break;
      case 9: seg(T, B); break;
      case 10:
        if ((a + b + c + d) / 4 < 0) { seg(T, R); seg(L, B); } else { seg(T, L); seg(B, R); }
        break;
      case 11: seg(T, R); break;
      case 12: seg(L, R); break;
      case 13: seg(B, R); break;
      case 14: seg(L, B); break;
    }
  };

  const sub = new Float64Array(16);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = vals[j * vw + i]!;
      const b = vals[j * vw + i + 1]!;
      const d = vals[(j + 1) * vw + i]!;
      const c = vals[(j + 1) * vw + i + 1]!;
      const x = i * cell, y = j * cell;
      const neg = (a < 0 ? 1 : 0) + (b < 0 ? 1 : 0) + (c < 0 ? 1 : 0) + (d < 0 ? 1 : 0);
      const finite = !(Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c) || Number.isNaN(d));
      if (finite && neg > 0 && neg < 4 && cell > 2) {
        // Refine with a 3x3 sub-grid.
        const cx = (p: number): number => x + (p * cell) / 3;
        const cy = (q: number): number => y + (q * cell) / 3;
        for (let q = 0; q < 4; q++) {
          for (let p = 0; p < 4; p++) {
            const isCorner = (p === 0 || p === 3) && (q === 0 || q === 3);
            sub[q * 4 + p] = isCorner
              ? (q === 0 ? (p === 0 ? a : b) : p === 0 ? d : c)
              : safe(F, tf.x(cx(p)), tf.y(cy(q)));
          }
        }
        for (let q = 0; q < 3; q++) {
          for (let p = 0; p < 3; p++) {
            processCell(
              cx(p), cy(q), cx(p + 1), cy(q + 1),
              sub[q * 4 + p]!, sub[q * 4 + p + 1]!, sub[(q + 1) * 4 + p + 1]!, sub[(q + 1) * 4 + p]!,
            );
          }
        }
      } else {
        processCell(x, y, x + cell, y + cell, a, b, c, d);
      }
    }
  }
  return { lines: chain(segs), fills };
}

function chain(segs: number[]): number[][] {
  const n = segs.length / 4;
  const map = new Map<string, number[]>();
  const add = (k: string, i: number): void => {
    const l = map.get(k);
    if (l) l.push(i);
    else map.set(k, [i]);
  };
  for (let i = 0; i < n; i++) {
    add(segs[i * 4]! + ',' + segs[i * 4 + 1]!, i);
    add(segs[i * 4 + 2]! + ',' + segs[i * 4 + 3]!, i);
  }
  const used = new Uint8Array(n);
  const next = (x: number, y: number): number => {
    const l = map.get(x + ',' + y);
    if (!l) return -1;
    for (const k of l) if (!used[k]) return k;
    return -1;
  };
  const lines: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line = [segs[i * 4]!, segs[i * 4 + 1]!, segs[i * 4 + 2]!, segs[i * 4 + 3]!];
    for (;;) {
      const ex = line[line.length - 2]!, ey = line[line.length - 1]!;
      const k = next(ex, ey);
      if (k < 0) break;
      used[k] = 1;
      if (segs[k * 4] === ex && segs[k * 4 + 1] === ey) line.push(segs[k * 4 + 2]!, segs[k * 4 + 3]!);
      else line.push(segs[k * 4]!, segs[k * 4 + 1]!);
    }
    const front: number[] = [];
    for (;;) {
      const sx = front.length ? front[front.length - 2]! : line[0]!;
      const sy = front.length ? front[front.length - 1]! : line[1]!;
      const k = next(sx, sy);
      if (k < 0) break;
      used[k] = 1;
      if (segs[k * 4] === sx && segs[k * 4 + 1] === sy) front.push(segs[k * 4 + 2]!, segs[k * 4 + 3]!);
      else front.push(segs[k * 4]!, segs[k * 4 + 1]!);
    }
    if (front.length) {
      const rev: number[] = [];
      for (let p = front.length - 2; p >= 0; p -= 2) rev.push(front[p]!, front[p + 1]!);
      lines.push(rev.concat(line));
    } else lines.push(line);
  }
  return lines;
}
