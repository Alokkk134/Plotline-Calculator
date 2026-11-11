// The graph canvas: grid, axes, labels, pan/zoom, tracing and overlay buttons.
import { formatNumber } from '../math';
import { drawItem, isGraphable, nearestOnTrace, type PlotItem, type Quality, type TraceData } from './plot';
import type { Viewport } from './state';
import { Tf } from './transform';

const MIN_RANGE = 1e-9;
const MAX_RANGE = 1e12;

function niceStep(raw: number): { step: number; minorDiv: number } {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / pow;
  let mant: number;
  if (m < 1.4) mant = 1;
  else if (m < 3.5) mant = 2;
  else if (m < 7.5) mant = 5;
  else mant = 10;
  return { step: mant * pow, minorDiv: mant === 2 ? 4 : 5 };
}

function fmtTick(v: number, step: number): string {
  if (Math.abs(v) < step * 1e-6) return '0';
  let s: string;
  if (Math.abs(v) >= 1e7 || step < 1e-6) {
    s = Number(v.toPrecision(6)).toExponential().replace('e+', 'e');
  } else {
    const dec = Math.min(12, Math.max(0, -Math.floor(Math.log10(step) + 1e-9)));
    s = v.toFixed(dec);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  }
  return s.replace('-', '−');
}

function roundForLabel(v: number, unitsPerPx: number): number {
  const dec = Math.min(12, Math.max(0, Math.ceil(-Math.log10(unitsPerPx)) + 2));
  const r = Number(v.toFixed(dec));
  return Object.is(r, -0) ? 0 : r;
}

const icon = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ICON_PLUS = icon('<path d="M12 5v14M5 12h14"/>');
const ICON_MINUS = icon('<path d="M5 12h14"/>');
/** Crosshair: "reset view" back to the origin. */
const ICON_RESET = icon('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>');
/** Down arrow into a tray: "save as image". */
const ICON_SAVE = icon('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>');
const CREDIT = 'tryplotline.xyz';
const LABEL_FONT ="'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export class GraphView {
  private readonly canvas = document.createElement('canvas');
  private readonly overlay = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly octx: CanvasRenderingContext2D;
  private readonly buttons = document.createElement('div');

  private w = 0;
  private h = 0;
  private dpr = 1;
  private vp: Viewport = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
  private pendingVp: Viewport | null = null;
  private sized = false;

  private items: PlotItem[] = [];
  private traces = new Map<string, TraceData>();

  private dirty = true;
  private overlayDirty = true;
  private raf = 0;
  private interacting = false;
  private interactTimer = 0;
  private destroyed = false;

  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private dragging = false;
  private hover: { x: number; y: number } | null = null;

  private colors = { minor: '#cfcbe6', major: '#e8e6f5', axis: '#3a3566', text: '#625e86', bg: '#fcfcff', ink: '#1e1b3a' };
  private removers: Array<() => void> = [];

  constructor(private readonly host: HTMLElement) {
    this.canvas.className = 'gr-canvas';
    this.overlay.className = 'gr-canvas gr-overlay';
    this.buttons.className = 'gr-zoom-buttons';
    const mk = (label: string, title: string, html: string, fn: () => void): void => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gr-zoom-btn';
      b.title = title;
      b.setAttribute('aria-label', label);
      b.innerHTML = html;
      b.addEventListener('click', fn);
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      this.buttons.appendChild(b);
    };
    mk('Zoom in', 'Zoom in', ICON_PLUS, () => this.zoomCenter(1.4));
    mk('Zoom out', 'Zoom out', ICON_MINUS, () => this.zoomCenter(1 / 1.4));
    mk('Reset view', 'Reset view: back to the origin at the default zoom', ICON_RESET, () => this.resetViewport());
    mk('Save as image', 'Save the graph as an image (PNG)', ICON_SAVE, () => void this.saveImage());
    host.append(this.canvas, this.overlay, this.buttons);
    // Axis labels use the brand web font; redraw once it has loaded.
    document.fonts?.ready.then(() => this.invalidate());
    this.ctx = this.canvas.getContext('2d')!;
    this.octx = this.overlay.getContext('2d')!;
    this.bind();
    this.readColors();
    this.resize();
  }

  // ---- public API -------------------------------------------------------

  setItems(items: PlotItem[]): void {
    this.items = items;
    this.invalidate();
  }

  getViewport(): Viewport {
    return { ...this.vp };
  }

  setViewport(v: Viewport): void {
    if (!this.sized) {
      this.pendingVp = { ...v };
      return;
    }
    this.vp = { ...v };
    this.invalidate();
  }

  resetViewport(): void {
    this.vp = this.defaultViewport();
    this.invalidate();
  }

  resize(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (w <= 0 || h <= 0) return;
    if (w === this.w && h === this.h && dpr === this.dpr && this.sized) return;
    const first = !this.sized;
    const oldW = this.w, oldH = this.h;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.sized = true;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.overlay.width = this.canvas.width;
    this.overlay.height = this.canvas.height;
    if (first) {
      this.vp = this.pendingVp ?? this.defaultViewport();
      this.pendingVp = null;
    } else if (oldW > 0 && oldH > 0) {
      // Keep the scale and the center fixed, so opening/closing the keypad or
      // resizing the panel doesn't shift the graph.
      const ux = (this.vp.xmax - this.vp.xmin) / oldW;
      const uy = (this.vp.ymax - this.vp.ymin) / oldH;
      const cx = (this.vp.xmin + this.vp.xmax) / 2;
      const cy = (this.vp.ymin + this.vp.ymax) / 2;
      this.vp = {
        xmin: cx - (ux * w) / 2,
        xmax: cx + (ux * w) / 2,
        ymin: cy - (uy * h) / 2,
        ymax: cy + (uy * h) / 2,
      };
    }
    this.readColors();
    this.invalidate();
  }

  thumbnail(width = 240, height = 160): string | undefined {
    if (!this.sized) return undefined;
    try {
      this.drawNow();
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const g = c.getContext('2d');
      if (!g) return undefined;
      g.fillStyle = this.colors.bg;
      g.fillRect(0, 0, width, height);
      // Cover-crop the main canvas to the thumbnail aspect ratio.
      const sw = this.canvas.width, sh = this.canvas.height;
      const target = width / height;
      let cw = sw, ch = sw / target;
      if (ch > sh) {
        ch = sh;
        cw = sh * target;
      }
      g.drawImage(this.canvas, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, width, height);
      return c.toDataURL('image/png');
    } catch {
      return undefined;
    }
  }

  /** PNG of the graph as drawn now (without the trace marker), with a small credit in the corner. */
  exportImage(): Promise<Blob | null> {
    if (!this.sized) return Promise.resolve(null);
    // Always export at full quality, even if called in the middle of a drag, and
    // at least twice the CSS size so the image stays sharp when it is shared.
    this.interacting = false;
    const s = Math.max(2, this.dpr);
    const out = document.createElement('canvas');
    out.width = Math.round(this.w * s);
    out.height = Math.round(this.h * s);
    const g = out.getContext('2d');
    if (!g) return Promise.resolve(null);
    const { width: keepW, height: keepH } = this.canvas;
    const keepDpr = this.dpr;
    try {
      // Draw the graph once at the export scale, then put the screen canvas back
      // the way it was. All of it happens before the browser paints, so nothing flickers.
      this.dpr = s;
      this.canvas.width = out.width;
      this.canvas.height = out.height;
      this.drawMain();
      g.drawImage(this.canvas, 0, 0);
    } finally {
      this.dpr = keepDpr;
      this.canvas.width = keepW;
      this.canvas.height = keepH;
      this.dirty = false;
      this.drawMain();
    }

    const accent = getComputedStyle(this.host).getPropertyValue('--accent-strong').trim() || '#4a3fd0';
    g.font = `700 ${12.5 * s}px ${LABEL_FONT}`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const padX = 10 * s, boxH = 26 * s, r = 8 * s;
    const boxW = g.measureText(CREDIT).width + padX * 2;
    const x = 12 * s, y = out.height - boxH - 12 * s;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + boxW, y, x + boxW, y + boxH, r);
    g.arcTo(x + boxW, y + boxH, x, y + boxH, r);
    g.arcTo(x, y + boxH, x, y, r);
    g.arcTo(x, y, x + boxW, y, r);
    g.closePath();
    g.fillStyle = this.colors.bg;
    g.globalAlpha = 0.92;
    g.fill();
    g.globalAlpha = 1;
    g.lineWidth = s;
    g.strokeStyle = this.colors.major;
    g.stroke();
    g.fillStyle = accent;
    g.fillText(CREDIT, x + padX, y + boxH / 2 + s * 0.5);

    return new Promise((resolve) => out.toBlob((b) => resolve(b), 'image/png'));
  }

  /** Share the image on phones that can (the share sheet), otherwise download it. */
  private async saveImage(): Promise<void> {
    const blob = await this.exportImage();
    if (!blob) return;
    const file = new File([blob], 'plotline-graph.png', { type: 'image/png' });
    const touch = window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Graph made with Plotline', url: location.origin });
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return; // the user closed the share sheet
        // Anything else: fall through to a normal download.
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.interactTimer);
    for (const r of this.removers) r();
    this.removers = [];
    this.canvas.remove();
    this.overlay.remove();
    this.buttons.remove();
  }

  // ---- internals ---------------------------------------------------------

  private readColors(): void {
    const cs = getComputedStyle(this.host);
    const get = (n: string, f: string): string => cs.getPropertyValue(n).trim() || f;
    this.colors = {
      minor: get('--grid-minor', '#cfcbe6'),
      major: get('--grid-major', '#e8e6f5'),
      axis: get('--axis', '#3a3566'),
      text: get('--text-muted', '#625e86'),
      bg: get('--graph-bg', '#fcfcff'),
      ink: get('--text', '#1e1b3a'),
    };
  }

  private defaultViewport(): Viewport {
    const w = this.w || 800;
    const h = this.h || 600;
    const u = 20 / w;
    return { xmin: -10, xmax: 10, ymin: (-h * u) / 2, ymax: (h * u) / 2 };
  }

  private invalidate(): void {
    this.dirty = true;
    this.overlayDirty = true;
    this.schedule();
  }

  private invalidateOverlay(): void {
    this.overlayDirty = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.raf || this.destroyed) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.destroyed) return;
      this.drawNow();
    });
  }

  private tf(): Tf {
    return new Tf(this.w, this.h, this.vp.xmin, this.vp.xmax, this.vp.ymin, this.vp.ymax);
  }

  private drawNow(): void {
    if (!this.sized) return;
    if (this.dirty) {
      this.dirty = false;
      this.drawMain();
    }
    if (this.overlayDirty) {
      this.overlayDirty = false;
      this.drawOverlay();
    }
  }

  private markInteracting(): void {
    this.interacting = true;
    window.clearTimeout(this.interactTimer);
    this.interactTimer = window.setTimeout(() => {
      this.interacting = false;
      if (!this.dragging && this.pointers.size === 0) this.invalidate();
    }, 140);
  }

  private drawMain(): void {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, this.w, this.h);
    const tf = this.tf();
    this.drawGrid(ctx, tf);
    const quality: Quality = this.interacting ? 'fast' : 'full';
    const traces = new Map<string, TraceData>();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.w, this.h);
    ctx.clip();
    for (const item of this.items) {
      if (item.hidden || !isGraphable(item.analysis)) continue;
      try {
        traces.set(item.id, drawItem(ctx, item, tf, quality));
      } catch {
        // A broken user function must never break the whole frame.
      }
    }
    ctx.restore();
    this.traces = traces;
  }

  private drawGrid(ctx: CanvasRenderingContext2D, tf: Tf): void {
    const { w, h, dpr } = this;
    const snap = (v: number): number => (Math.round(v * dpr - 0.5) + 0.5) / dpr;
    const upx = 1 / tf.sx, upy = 1 / tf.sy;
    const nx = niceStep(90 * upx);
    let ny = niceStep(64 * upy);
    if (Math.abs(tf.sx / tf.sy - 1) < 0.01) ny = nx;

    const lines = (
      step: number,
      div: number,
      vertical: boolean,
    ): { minor: number[]; major: number[] } => {
      const minor: number[] = [];
      const major: number[] = [];
      const ms = step / div;
      const lo = vertical ? tf.xmin : tf.ymin;
      const hi = vertical ? tf.xmax : tf.ymax;
      const i0 = Math.ceil(lo / ms);
      const i1 = Math.floor(hi / ms);
      if (i1 - i0 > 600) return { minor, major };
      for (let i = i0; i <= i1; i++) {
        const p = vertical ? tf.px(i * ms) : tf.py(i * ms);
        (i % div === 0 ? major : minor).push(snap(p));
      }
      return { minor, major };
    };
    const vx = lines(nx.step, nx.minorDiv, true);
    const hy = lines(ny.step, ny.minorDiv, false);

    const stroke = (xs: number[], ys: number[], color: string): void => {
      ctx.beginPath();
      for (const x of xs) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (const y of ys) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    stroke(vx.major, hy.major, this.colors.major);
    // Minor grid as a dot lattice (all minor and major crossings).
    const xs = [...vx.minor, ...vx.major];
    const ys = [...hy.minor, ...hy.major];
    if (xs.length * ys.length < 20000) {
      ctx.fillStyle = this.colors.minor;
      const r = 1.1;
      for (const x of xs) for (const y of ys) ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Axes
    const ax = tf.px(0), ay = tf.py(0);
    ctx.strokeStyle = this.colors.axis;
    ctx.fillStyle = this.colors.axis;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (ax >= 0 && ax <= w) {
      ctx.moveTo(snap(ax), 0);
      ctx.lineTo(snap(ax), h);
    }
    if (ay >= 0 && ay <= h) {
      ctx.moveTo(0, snap(ay));
      ctx.lineTo(w, snap(ay));
    }
    ctx.stroke();
    // Arrowheads on the positive ends.
    ctx.beginPath();
    if (ax >= 0 && ax <= w) {
      const x = snap(ax);
      ctx.moveTo(x, 1);
      ctx.lineTo(x - 5, 10);
      ctx.lineTo(x + 5, 10);
    }
    if (ay >= 0 && ay <= h) {
      const y = snap(ay);
      ctx.moveTo(w - 1, y);
      ctx.lineTo(w - 10, y - 5);
      ctx.lineTo(w - 10, y + 5);
    }
    ctx.fill();

    // Labels
    ctx.font = `500 11.5px ${LABEL_FONT}`;
    ctx.fillStyle = this.colors.text;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.colors.bg;
    const text = (s: string, x: number, y: number): void => {
      ctx.strokeText(s, x, y);
      ctx.fillText(s, x, y);
    };

    // x labels (below axis, stuck to the top/bottom edge when offscreen)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labY = Math.min(Math.max(ay + 5, 4), h - 17);
    const ixMajor0 = Math.ceil(tf.xmin / nx.step);
    const ixMajor1 = Math.floor(tf.xmax / nx.step);
    if (ixMajor1 - ixMajor0 < 400) {
      for (let i = ixMajor0; i <= ixMajor1; i++) {
        if (i === 0) continue;
        const px = tf.px(i * nx.step);
        text(fmtTick(i * nx.step, nx.step), px, labY);
      }
    }
    // y labels (left of axis, stuck to the left/right edge when offscreen)
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    const iyMajor0 = Math.ceil(tf.ymin / ny.step);
    const iyMajor1 = Math.floor(tf.ymax / ny.step);
    let maxW = 12;
    const ylabels: Array<[string, number]> = [];
    if (iyMajor1 - iyMajor0 < 400) {
      for (let i = iyMajor0; i <= iyMajor1; i++) {
        const s = i === 0 ? '0' : fmtTick(i * ny.step, ny.step);
        if (i === 0 && ax >= 0 && ax <= w && ay >= 0 && ay <= h) continue;
        ylabels.push([s, tf.py(i * ny.step)]);
        maxW = Math.max(maxW, ctx.measureText(s).width);
      }
    }
    const labX = Math.min(Math.max(ax - 6, maxW + 6), w - 5);
    for (const [s, py] of ylabels) text(s, labX, py);
    if (ax >= 0 && ax <= w && ay >= 0 && ay <= h) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      text('0', ax - 6, ay + 5);
    }
  }

  private traceAt(mx: number, my: number): { item: PlotItem; px: number; py: number; label: string } | null {
    const tf = this.tf();
    let best: { item: PlotItem; px: number; py: number; dist: number; ex?: { x: number; y: number } } | null = null;
    for (const item of this.items) {
      if (item.hidden) continue;
      const tr = this.traces.get(item.id);
      if (!tr) continue;
      const near = nearestOnTrace(tr, mx, my);
      if (!near) continue;
      const limit = item.analysis.kind === 'points' ? 12 : 16;
      if (near.dist > limit) continue;
      if (!best || near.dist < best.dist) {
        best = { item, px: near.px, py: near.py, dist: near.dist };
        if (near.exact) best.ex = near.exact;
      }
    }
    if (!best) return null;
    const x = best.ex ? best.ex.x : roundForLabel(tf.x(best.px), 1 / tf.sx);
    const y = best.ex ? best.ex.y : roundForLabel(tf.y(best.py), 1 / tf.sy);
    return { item: best.item, px: best.px, py: best.py, label: `(${formatNumber(x)}, ${formatNumber(y)})` };
  }

  private drawOverlay(): void {
    const { octx: g, dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    if (!this.hover || this.dragging || this.pointers.size > 1) return;
    const t = this.traceAt(this.hover.x, this.hover.y);
    if (!t) return;
    g.beginPath();
    g.arc(t.px, t.py, 6, 0, Math.PI * 2);
    g.fillStyle = t.item.color;
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = '#ffffff';
    g.stroke();

    g.font = `600 12.5px ${LABEL_FONT}`;
    const tw = g.measureText(t.label).width;
    const bw = tw + 30, bh = 26;
    let bx = t.px + 12, by = t.py - bh - 10;
    if (bx + bw > this.w - 4) bx = t.px - bw - 12;
    if (by < 4) by = t.py + 12;
    if (bx < 4) bx = 4;
    g.fillStyle = this.colors.ink;
    g.beginPath();
    g.roundRect(bx, by, bw, bh, bh / 2);
    g.fill();
    g.beginPath();
    g.arc(bx + 12, by + bh / 2, 4, 0, Math.PI * 2);
    g.fillStyle = t.item.color;
    g.fill();
    g.fillStyle = '#ffffff';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(t.label, bx + 21, by + bh / 2 + 0.5);
  }

  private zoomAt(px: number, py: number, factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const v = this.vp;
    const xr = (v.xmax - v.xmin) / factor;
    const yr = (v.ymax - v.ymin) / factor;
    if (xr < MIN_RANGE || xr > MAX_RANGE || yr < MIN_RANGE || yr > MAX_RANGE) return;
    const fx = px / this.w, fy = py / this.h;
    const wx = v.xmin + fx * (v.xmax - v.xmin);
    const wy = v.ymax - fy * (v.ymax - v.ymin);
    v.xmin = wx - fx * xr;
    v.xmax = v.xmin + xr;
    v.ymax = wy + fy * yr;
    v.ymin = v.ymax - yr;
  }

  private zoomCenter(factor: number): void {
    this.zoomAt(this.w / 2, this.h / 2, factor);
    this.invalidate();
  }

  private panBy(dxPx: number, dyPx: number): void {
    const v = this.vp;
    const ux = (v.xmax - v.xmin) / this.w;
    const uy = (v.ymax - v.ymin) / this.h;
    v.xmin -= dxPx * ux;
    v.xmax -= dxPx * ux;
    v.ymin += dyPx * uy;
    v.ymax += dyPx * uy;
  }

  private local(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.overlay.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private bind(): void {
    const el = this.overlay;
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      fn: (e: HTMLElementEventMap[K]) => void,
      opts?: AddEventListenerOptions,
    ): void => {
      el.addEventListener(type, fn, opts);
      this.removers.push(() => el.removeEventListener(type, fn, opts));
    };

    on('pointerdown', (e) => {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Pointer already released (or synthetic); dragging still works without capture.
      }
      const p = this.local(e);
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 1) {
        this.dragging = false;
        this.hover = p;
        el.style.cursor = 'grabbing';
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        this.dragging = true;
      }
      this.invalidateOverlay();
    });

    on('pointermove', (e) => {
      const p = this.local(e);
      const prev = this.pointers.get(e.pointerId);
      if (!prev) {
        this.hover = p;
        this.invalidateOverlay();
        return;
      }
      if (this.pointers.size === 1) {
        const dx = p.x - prev.x, dy = p.y - prev.y;
        if (!this.dragging && Math.hypot(dx, dy) > 0) this.dragging = true;
        this.pointers.set(e.pointerId, p);
        this.hover = p;
        this.panBy(dx, dy);
        this.markInteracting();
        this.invalidate();
      } else if (this.pointers.size === 2) {
        const before = [...this.pointers.values()];
        this.pointers.set(e.pointerId, p);
        const after = [...this.pointers.values()];
        const cx0 = (before[0]!.x + before[1]!.x) / 2, cy0 = (before[0]!.y + before[1]!.y) / 2;
        const cx1 = (after[0]!.x + after[1]!.x) / 2, cy1 = (after[0]!.y + after[1]!.y) / 2;
        const d = Math.hypot(after[0]!.x - after[1]!.x, after[0]!.y - after[1]!.y);
        this.panBy(cx1 - cx0, cy1 - cy0);
        if (this.pinchDist > 0 && d > 0) this.zoomAt(cx1, cy1, d / this.pinchDist);
        this.pinchDist = d;
        this.markInteracting();
        this.invalidate();
      }
    });

    const end = (e: PointerEvent): void => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinchDist = 0;
      if (this.pointers.size === 0) {
        this.dragging = false;
        el.style.cursor = '';
        if (e.pointerType !== 'mouse') this.hover = null;
        this.invalidate();
      } else {
        // Continue panning with the remaining pointer.
        this.dragging = true;
      }
    };
    on('pointerup', end);
    on('pointercancel', end);
    on('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && this.pointers.size === 0) {
        this.hover = null;
        this.invalidateOverlay();
      }
    });

    on(
      'wheel',
      (e) => {
        e.preventDefault();
        const p = this.local(e);
        const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
        const k = e.ctrlKey ? 0.01 : 0.0015;
        this.zoomAt(p.x, p.y, Math.exp(-e.deltaY * scale * k));
        this.hover = p;
        this.markInteracting();
        this.invalidate();
      },
      { passive: false },
    );
  }
}
