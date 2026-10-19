// The expression panel: numbered rows with math inputs, feedback and sliders.
import type { MathfieldElement } from 'mathlive';
import { analyzeExpressions, formatNumber } from '../math';
import type { AnalyzedLine, ExprAnalysis } from '../math/types';
import { createMathInput } from '../shared/mathfield';
import { isGraphable, type PlotItem } from './plot';
import {
  DEFAULT_SLIDER,
  formatSliderValue,
  parseState,
  type ExprState,
  type SliderConfig,
} from './state';

const ANALYZE_DELAY = 30;
const SWEEP_SECONDS = 8;

interface Row {
  id: string;
  color: string;
  hidden: boolean;
  slider: SliderConfig | undefined;
  latex: string;
  analysis: ExprAnalysis;
  undef: string[];
  playing: boolean;
  dir: 1 | -1;
  animV: number;
  el: HTMLElement;
  num: HTMLElement;
  toggle: HTMLButtonElement;
  mf: MathfieldElement;
  fb: HTMLElement;
  hint: HTMLElement;
  sliderBox: HTMLElement;
  range: HTMLInputElement;
  minIn: HTMLInputElement;
  maxIn: HTMLInputElement;
  stepIn: HTMLInputElement;
  playBtn: HTMLButtonElement;
}

export interface ExpressionListOptions {
  palette: string[];
  onItems(items: PlotItem[]): void;
  /** The user tapped or focused a row (phones open the keypad then). */
  onRowActivate?(): void;
}

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class ExpressionList {
  private rows: Row[] = [];
  private seq = 0;
  private colorCounter = 0;
  private analyzeTimer = 0;
  private animRaf = 0;
  private lastAnimT = 0;
  private lastFocused: Row | null = null;
  private destroyed = false;
  private readonly listEl = h('div', 'gr-rows');

  constructor(
    root: HTMLElement,
    private readonly opts: ExpressionListOptions,
  ) {
    root.appendChild(this.listEl);
    this.listEl.addEventListener('mousedown', (e) => {
      // Clicking empty space below the rows focuses the last row.
      if (e.target === this.listEl) {
        e.preventDefault();
        this.focusRow(this.rows[this.rows.length - 1], true);
      }
    });
    this.setRows([]);
  }

  // ---- public ------------------------------------------------------------

  getExpressions(): ExprState[] {
    const out: ExprState[] = [];
    for (const r of this.rows) {
      if (r.latex.trim() === '') continue;
      const e: ExprState = { id: r.id, latex: r.latex, color: r.color, hidden: r.hidden };
      if (r.slider) e.slider = { ...r.slider };
      out.push(e);
    }
    return out;
  }

  setExpressions(list: ReturnType<typeof parseState>['expressions']): void {
    this.setRows(list);
  }

  addRowAtEnd(focus = true): void {
    const last = this.rows[this.rows.length - 1];
    if (last && last.latex.trim() === '') {
      if (focus) this.focusRow(last, true);
      return;
    }
    const r = this.addRow(this.rows.length);
    if (focus) this.focusRow(r, true);
  }

  /**
   * Add expressions as new rows (used by the Examples tab). Fills the empty
   * trailing row first, then appends; skips assignments whose variable is already defined.
   */
  insertExpressions(latexes: string[]): void {
    for (const latex of latexes) {
      const name = /^([a-zA-Z])=/.exec(latex)?.[1];
      if (name && this.rows.some((r) => r.latex.replace(/\s/g, '').startsWith(`${name}=`))) continue;
      const last = this.rows[this.rows.length - 1];
      if (last && last.latex.trim() === '') {
        last.latex = latex;
        last.mf.value = latex;
      } else {
        this.addRow(this.rows.length, { latex });
      }
    }
    this.ensureTrailing();
    this.analyzeNow();
    this.rows[this.rows.length - 1]?.el.scrollIntoView({ block: 'nearest' });
  }

  /** Math field that keypad input should go to. */
  activeField(): MathfieldElement {
    const r = this.lastFocused && this.rows.includes(this.lastFocused) ? this.lastFocused : this.rows[this.rows.length - 1]!;
    return r.mf;
  }

  analyzeNow(): void {
    window.clearTimeout(this.analyzeTimer);
    this.analyzeTimer = 0;
    this.analyze();
  }

  destroy(): void {
    this.destroyed = true;
    window.clearTimeout(this.analyzeTimer);
    cancelAnimationFrame(this.animRaf);
    this.rows = [];
    this.listEl.replaceChildren();
    this.listEl.remove();
  }

  // ---- rows ----------------------------------------------------------------

  private newId(): string {
    let id: string;
    do id = `e${++this.seq}`;
    while (this.rows.some((r) => r.id === id));
    return id;
  }

  private setRows(list: Array<Partial<ExprState> & { latex: string }>): void {
    for (const r of this.rows) r.playing = false;
    this.rows = [];
    this.listEl.replaceChildren();
    this.lastFocused = null;
    for (const e of list) {
      const id = e.id && !this.rows.some((r) => r.id === e.id) ? e.id : undefined;
      this.addRow(this.rows.length, { ...e, ...(id ? { id } : {}) });
    }
    this.ensureTrailing();
    this.analyzeNow();
  }

  private addRow(index: number, init?: Partial<ExprState>): Row {
    const color = init?.color ?? this.opts.palette[this.colorCounter % this.opts.palette.length]!;
    this.colorCounter++;
    // The first row tells first-time users what to do.
    const mf = createMathInput({ placeholder: index === 0 ? '\\text{Type an equation, e.g. }y=x^2' : '' });
    mf.classList.add('gr-mf');
    mf.setAttribute('aria-label', 'Expression');
    const el = h('div', 'gr-row');
    const num = h('span', 'gr-num');
    const toggle = h('button', 'gr-toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Show or hide curve');
    toggle.title = 'Show/hide';
    const gutter = h('div', 'gr-gutter');
    gutter.append(num, toggle);
    const line = h('div', 'gr-line');
    const fb = h('span', 'gr-fb');
    line.append(mf, fb);
    const hint = h('div', 'gr-hint');
    hint.hidden = true;

    const sliderBox = h('div', 'gr-slider');
    sliderBox.hidden = true;
    const minIn = h('input', 'gr-num-in');
    const maxIn = h('input', 'gr-num-in');
    const stepIn = h('input', 'gr-num-in gr-step-in');
    for (const i of [minIn, maxIn, stepIn]) {
      i.type = 'text';
      i.inputMode = 'decimal';
      i.spellcheck = false;
    }
    minIn.setAttribute('aria-label', 'Slider minimum');
    maxIn.setAttribute('aria-label', 'Slider maximum');
    stepIn.setAttribute('aria-label', 'Slider step');
    stepIn.title = 'Step';
    const range = h('input', 'gr-range');
    range.type = 'range';
    const playBtn = h('button', 'gr-play');
    playBtn.type = 'button';
    playBtn.title = 'Animate';
    playBtn.setAttribute('aria-label', 'Play or pause slider animation');
    const sliderTop = h('div', 'gr-slider-top');
    sliderTop.append(minIn, range, maxIn);
    const sliderBottom = h('div', 'gr-slider-bottom');
    const stepLbl = h('span', 'gr-step-lbl', 'step');
    sliderBottom.append(playBtn, stepLbl, stepIn);
    sliderBox.append(sliderTop, sliderBottom);

    const body = h('div', 'gr-body');
    body.append(line, hint, sliderBox);
    const del = h('button', 'gr-del', '×');
    del.type = 'button';
    del.title = 'Delete expression';
    del.setAttribute('aria-label', 'Delete expression');
    el.append(gutter, body, del);

    const row: Row = {
      id: init?.id ?? this.newId(),
      color,
      hidden: init?.hidden ?? false,
      slider: init?.slider ? { ...init.slider } : undefined,
      latex: init?.latex ?? '',
      analysis: { kind: 'empty' },
      undef: [],
      playing: false,
      dir: 1,
      animV: 0,
      el, num, toggle, mf, fb, hint, sliderBox, range, minIn, maxIn, stepIn, playBtn,
    };
    if (row.latex) mf.value = row.latex;
    this.applyColor(row);

    this.rows.splice(index, 0, row);
    const before = this.rows[index + 1];
    if (before) this.listEl.insertBefore(el, before.el);
    else this.listEl.appendChild(el);
    this.renumber();
    this.wireRow(row, del);
    return row;
  }

  private applyColor(row: Row): void {
    row.el.style.setProperty('--row-color', row.color);
    row.el.classList.toggle('gr-hidden', row.hidden);
  }

  private wireRow(row: Row, del: HTMLButtonElement): void {
    const { mf } = row;
    // Remember the row the user last touched so keypad input goes there, even
    // if focus events don't arrive (e.g. the window isn't focused).
    row.el.addEventListener('pointerdown', (e) => {
      this.markActive(row);
      // Not for the row's own buttons (color toggle, delete, slider controls).
      if (!(e.target as HTMLElement).closest('button, input')) this.opts.onRowActivate?.();
    });
    mf.addEventListener('input', () => {
      this.lastFocused = row;
      row.latex = mf.value;
      this.ensureTrailing();
      this.scheduleAnalyze(ANALYZE_DELAY);
    });
    mf.addEventListener('focusin', () => this.markActive(row));
    mf.addEventListener('focusout', () => row.el.classList.remove('gr-active'));
    mf.addEventListener(
      'keydown',
      (ev) => {
        const e = ev as KeyboardEvent;
        if (e.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          const idx = this.rows.indexOf(row);
          const next = this.rows[idx + 1];
          const target = next && next.latex.trim() === '' && idx + 1 === this.rows.length - 1 ? next : this.addRow(idx + 1);
          this.focusRow(target, true);
        } else if (e.key === 'Backspace' && mf.value === '') {
          e.preventDefault();
          e.stopPropagation();
          const idx = this.rows.indexOf(row);
          if (idx === 0 && this.rows.length === 1) return;
          if (idx === this.rows.length - 1) {
            this.focusRow(this.rows[idx - 1], true);
          } else {
            this.removeRow(row);
            this.focusRow(this.rows[Math.max(0, idx - 1)], true);
          }
        }
      },
      true,
    );
    mf.addEventListener('move-out', (ev) => {
      const dir = (ev as CustomEvent<{ direction?: string }>).detail?.direction;
      const idx = this.rows.indexOf(row);
      if (dir === 'upward' || dir === 'backward') {
        const t = this.rows[idx - 1];
        if (t) {
          ev.preventDefault();
          this.focusRow(t, true);
        }
      } else if (dir === 'downward' || dir === 'forward') {
        const t = this.rows[idx + 1];
        if (t) {
          ev.preventDefault();
          this.focusRow(t, false);
        }
      }
    });

    row.toggle.addEventListener('click', () => {
      row.hidden = !row.hidden;
      this.applyColor(row);
      this.emitItems();
    });
    del.addEventListener('click', () => this.removeRow(row));

    // Slider controls
    row.range.addEventListener('input', () => {
      const v = Number(row.range.value);
      this.setSliderValue(row, v);
      this.scheduleAnalyze(0);
    });
    const commitBounds = (): void => {
      const cur = row.slider ?? { ...DEFAULT_SLIDER };
      const min = Number(row.minIn.value);
      const max = Number(row.maxIn.value);
      const step = Number(row.stepIn.value);
      const next = {
        min: Number.isFinite(min) && row.minIn.value.trim() !== '' ? min : cur.min,
        max: Number.isFinite(max) && row.maxIn.value.trim() !== '' ? max : cur.max,
        step: Number.isFinite(step) && step > 0 ? step : cur.step,
      };
      if (!(next.max > next.min)) {
        next.min = cur.min;
        next.max = cur.max;
      }
      row.slider = next;
      this.syncSlider(row);
    };
    for (const i of [row.minIn, row.maxIn, row.stepIn]) {
      i.addEventListener('change', commitBounds);
      i.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') i.blur();
        e.stopPropagation();
      });
    }
    row.playBtn.addEventListener('click', () => {
      row.playing = !row.playing;
      if (row.playing && row.analysis.kind === 'assignment') row.animV = row.analysis.value;
      row.dir = 1;
      this.syncPlayButton(row);
      this.startAnim();
    });
  }

  private removeRow(row: Row): void {
    const idx = this.rows.indexOf(row);
    if (idx < 0) return;
    row.playing = false;
    if (this.rows.length === 1) {
      row.mf.value = '';
      row.latex = '';
      this.scheduleAnalyze(0);
      return;
    }
    this.rows.splice(idx, 1);
    row.el.remove();
    if (this.lastFocused === row) this.lastFocused = null;
    this.renumber();
    this.ensureTrailing();
    this.scheduleAnalyze(0);
  }

  private ensureTrailing(): void {
    const last = this.rows[this.rows.length - 1];
    if (!last || last.latex.trim() !== '') this.addRow(this.rows.length);
  }

  private renumber(): void {
    this.rows.forEach((r, i) => {
      r.num.textContent = String(i + 1);
    });
  }

  private markActive(row: Row): void {
    this.lastFocused = row;
    this.listEl.querySelectorAll('.gr-active').forEach((n) => n.classList.remove('gr-active'));
    row.el.classList.add('gr-active');
  }

  private focusRow(row: Row | undefined, atEnd: boolean): void {
    if (!row) return;
    this.markActive(row);
    row.mf.focus();
    if (atEnd) row.mf.executeCommand('moveToMathfieldEnd');
    row.el.scrollIntoView({ block: 'nearest' });
  }

  // ---- analysis ------------------------------------------------------------

  private scheduleAnalyze(delay: number): void {
    if (this.destroyed) return;
    window.clearTimeout(this.analyzeTimer);
    this.analyzeTimer = window.setTimeout(() => {
      this.analyzeTimer = 0;
      this.analyze();
    }, delay);
  }

  private analyze(): void {
    if (this.destroyed) return;
    let lines: AnalyzedLine[] = [];
    try {
      lines = analyzeExpressions(
        this.rows.map((r) => ({ id: r.id, latex: r.latex })),
        { angleMode: 'rad' },
      );
    } catch (err) {
      lines = this.rows.map((r) => ({
        id: r.id,
        analysis: { kind: 'error', message: err instanceof Error ? err.message : 'Error' } as ExprAnalysis,
        undefinedVariables: [],
      }));
    }
    const byId = new Map(lines.map((l) => [l.id, l]));
    for (const row of this.rows) {
      const l = byId.get(row.id);
      row.analysis = l ? l.analysis : { kind: 'empty' };
      row.undef = l ? l.undefinedVariables : [];
      this.renderFeedback(row);
    }
    this.emitItems();
  }

  private emitItems(): void {
    const items: PlotItem[] = this.rows.map((r) => ({
      id: r.id,
      color: r.color,
      hidden: r.hidden,
      analysis: r.analysis,
    }));
    this.opts.onItems(items);
  }

  private renderFeedback(row: Row): void {
    const a = row.analysis;
    const empty = row.latex.trim() === '';
    row.fb.className = 'gr-fb';
    row.fb.replaceChildren();
    row.fb.removeAttribute('title');
    if (a.kind === 'value') {
      row.fb.textContent = `= ${formatNumber(a.value)}`;
    } else if (a.kind === 'assignment' && !a.isSlider) {
      row.fb.textContent = `= ${formatNumber(a.value)}`;
    } else if (a.kind === 'error' && !empty) {
      row.fb.classList.add('gr-fb-error');
      const icon = h('span', 'gr-warn', '⚠');
      icon.title = a.message;
      icon.setAttribute('role', 'img');
      icon.setAttribute('aria-label', `Error: ${a.message}`);
      icon.tabIndex = 0;
      row.fb.appendChild(icon);
    }

    // Graph toggle appearance
    const graphable = isGraphable(a);
    row.el.classList.toggle('gr-graphable', graphable);
    row.el.classList.toggle('gr-error', a.kind === 'error' && !empty);

    // Undefined-variable hints
    row.hint.replaceChildren();
    const vars = empty ? [] : row.undef;
    row.hint.hidden = vars.length === 0;
    if (vars.length) {
      row.hint.appendChild(h('span', 'gr-hint-lbl', 'add slider:'));
      for (const v of vars) {
        const b = h('button', 'gr-hint-btn', v);
        b.type = 'button';
        b.addEventListener('click', () => this.addSliderFor(row, v));
        row.hint.appendChild(b);
      }
    }

    // Slider
    if (a.kind === 'assignment' && a.isSlider) {
      if (!row.slider) {
        const s = { ...DEFAULT_SLIDER };
        const v = a.value;
        if (v < s.min || v > s.max) {
          const m = Math.pow(10, Math.ceil(Math.log10(Math.abs(v) + 1)));
          s.min = -m;
          s.max = m;
        }
        row.slider = s;
      }
      this.syncSlider(row);
    } else {
      row.sliderBox.hidden = true;
      if (row.playing) {
        row.playing = false;
        this.syncPlayButton(row);
      }
    }
  }

  private addSliderFor(row: Row, name: string): void {
    if (this.rows.some((r) => r.analysis.kind === 'assignment' && r.analysis.name === name)) return;
    const idx = this.rows.indexOf(row);
    const r = this.addRow(Math.max(0, idx), { latex: `${name}=1` });
    r.slider = { ...DEFAULT_SLIDER };
    this.analyzeNow();
  }

  private syncSlider(row: Row): void {
    const a = row.analysis;
    if (a.kind !== 'assignment' || !a.isSlider || !row.slider) return;
    const s = row.slider;
    if (!row.playing && (a.value < s.min || a.value > s.max)) {
      s.min = Math.min(s.min, Math.floor(a.value));
      s.max = Math.max(s.max, Math.ceil(a.value));
    }
    row.sliderBox.hidden = false;
    row.range.min = String(s.min);
    row.range.max = String(s.max);
    row.range.step = String(s.step);
    row.range.value = String(a.value);
    row.range.setAttribute('aria-label', `Value of ${a.name}`);
    if (document.activeElement !== row.minIn) row.minIn.value = String(s.min);
    if (document.activeElement !== row.maxIn) row.maxIn.value = String(s.max);
    if (document.activeElement !== row.stepIn) row.stepIn.value = String(s.step);
    this.syncPlayButton(row);
  }

  private syncPlayButton(row: Row): void {
    row.playBtn.classList.toggle('gr-playing', row.playing);
    row.playBtn.textContent = row.playing ? '❚❚' : '▶';
    row.playBtn.title = row.playing ? 'Pause' : 'Animate';
  }

  /** Rewrite the row's math field as `name=value` (used by slider + animation). */
  private setSliderValue(row: Row, v: number): void {
    const a = row.analysis;
    if (a.kind !== 'assignment') return;
    const step = row.slider?.step ?? DEFAULT_SLIDER.step;
    const latex = `${a.name}=${formatSliderValue(v, step)}`;
    row.latex = latex;
    row.mf.value = latex;
  }

  // ---- slider animation ----------------------------------------------------

  private startAnim(): void {
    if (this.animRaf || this.destroyed) return;
    this.lastAnimT = performance.now();
    const tick = (t: number): void => {
      this.animRaf = 0;
      if (this.destroyed) return;
      const dt = Math.min(0.1, (t - this.lastAnimT) / 1000);
      this.lastAnimT = t;
      let any = false;
      for (const row of this.rows) {
        if (!row.playing) continue;
        if (row.analysis.kind !== 'assignment' || !row.analysis.isSlider || !row.slider) {
          row.playing = false;
          this.syncPlayButton(row);
          continue;
        }
        any = true;
        const s = row.slider;
        const speed = (s.max - s.min) / SWEEP_SECONDS;
        let v = row.animV + row.dir * speed * dt;
        if (v >= s.max) {
          v = s.max;
          row.dir = -1;
        } else if (v <= s.min) {
          v = s.min;
          row.dir = 1;
        }
        row.animV = v;
        const snapped = Math.min(s.max, Math.max(s.min, Math.round((v - s.min) / s.step) * s.step + s.min));
        this.setSliderValue(row, snapped);
      }
      if (any) {
        this.analyze();
        this.animRaf = requestAnimationFrame(tick);
      }
    };
    this.animRaf = requestAnimationFrame(tick);
  }
}
