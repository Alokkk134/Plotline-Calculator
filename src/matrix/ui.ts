import type { CalculatorInstance } from '../shell/types';
import { MatrixError, Fraction, formatNum, parseNum, type Matrix, type Num } from './linalg';
import { safeEvaluate, type EvalResult } from './expr';
import { examplesButton, renderExamples } from '../shared/examples';
import { MATRIX_EXAMPLES, fill, matrixLatex, type MatrixExample } from './examples';
import './matrix.css';

const MAX_DIM = 10;
const MAX_HISTORY = 200;
const MAX_MATRICES = 24;
// I and T are reserved (identity "I3", transpose "^T").
const LETTERS = 'ABCDEFGHJKLMNOPQRSUVWXYZ'.split('');

interface MatrixModel {
  name: string;
  rows: string[][];
}

interface State {
  version: 1;
  matrices: MatrixModel[];
  history: { input: string }[];
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(cls: string, text: string, label?: string): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  if (label) {
    b.setAttribute('aria-label', label);
    b.title = label;
  }
  return b;
}

const blankRows = (r: number, c: number): string[][] =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => '0'));

function defaultMatrices(): MatrixModel[] {
  return [{ name: 'A', rows: [['1', '2'], ['3', '4']] }];
}

function sanitizeState(raw: unknown): State | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (s.version !== 1) return null;
  const matrices: MatrixModel[] = [];
  const seen = new Set<string>();
  if (Array.isArray(s.matrices)) {
    for (const m of s.matrices) {
      if (!m || typeof m !== 'object') continue;
      const { name, rows } = m as Record<string, unknown>;
      if (typeof name !== 'string' || !/^[A-HJ-SU-Z]$/.test(name) || seen.has(name)) continue;
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_DIM) continue;
      const first = rows[0];
      if (!Array.isArray(first) || first.length < 1 || first.length > MAX_DIM) continue;
      const cols = first.length;
      const clean = rows.map((r) =>
        Array.from({ length: cols }, (_, j) => {
          const v: unknown = Array.isArray(r) ? r[j] : undefined;
          return typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 40) : '0';
        }),
      );
      seen.add(name);
      matrices.push({ name, rows: clean });
    }
  }
  const history: { input: string }[] = [];
  if (Array.isArray(s.history)) {
    for (const h of s.history) {
      if (h && typeof h === 'object' && typeof (h as { input?: unknown }).input === 'string') {
        history.push({ input: (h as { input: string }).input.slice(0, 500) });
      }
    }
  }
  return { version: 1, matrices, history: history.slice(-MAX_HISTORY) };
}

export function mountMatrix(container: HTMLElement): CalculatorInstance {
  let matrices: MatrixModel[] = defaultMatrices();
  let history: { input: string }[] = [];
  let selected = -1; // history index whose "save" action is shown
  const cleanups: (() => void)[] = [];

  const root = el('div', 'mx-root');
  const side = el('section', 'mx-side');
  const sideHead = el('div', 'mx-side-head');
  sideHead.append(el('h2', 'mx-title', 'Matrices'));
  const addBtn = button('mx-add', '+ New Matrix');
  sideHead.append(addBtn);
  const matrixList = el('div', 'mx-list');
  side.append(sideHead, matrixList);

  const main = el('section', 'mx-main');
  const historyEl = el('div', 'mx-history');
  historyEl.setAttribute('aria-live', 'polite');
  const inputRow = el('div', 'mx-input-row');
  const input = el('input', 'mx-input');
  input.type = 'text';
  input.placeholder = 'Type an expression, e.g. A*B, 2A, A^-1, det(A)';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Matrix expression');
  const exBtn = examplesButton();
  inputRow.append(exBtn, input);
  const keypad = el('div', 'mx-keypad');
  // Examples take the history area: shown while history is empty, or on demand.
  const examplesEl = el('div');
  examplesEl.hidden = true;
  main.append(historyEl, examplesEl, inputRow, keypad);
  root.append(side, main);
  container.replaceChildren(root);

  // ---- evaluation -------------------------------------------------------
  function lookup(name: string): Matrix {
    const m = matrices.find((x) => x.name === name);
    if (!m) throw new MatrixError(`Matrix ${name} doesn't exist`);
    return m.rows.map((r) =>
      r.map((cell): Num => {
        const v = parseNum(cell);
        if (v === null) throw new MatrixError(`Matrix ${name} has an invalid entry "${cell}"`);
        return v;
      }),
    );
  }
  const evalInput = (src: string): EvalResult => safeEvaluate(src, lookup);

  // ---- rendering --------------------------------------------------------
  function matrixView(m: Matrix): HTMLElement {
    const wrap = el('div', 'mx-bracket');
    wrap.style.gridTemplateColumns = `repeat(${m[0]?.length ?? 1}, auto)`;
    for (const row of m) for (const v of row) wrap.append(el('span', 'mx-cell-out', formatNum(v)));
    return wrap;
  }

  function renderHistory(): void {
    historyEl.replaceChildren();
    if (!history.length) {
      historyEl.append(el('p', 'mx-empty', 'Results appear here. Try A*A or det(A), or tap ★ for examples.'));
      return;
    }
    history.forEach((h, idx) => {
      const item = el('div', 'mx-item');
      const head = el('div', 'mx-item-head');
      head.append(el('span', 'mx-expr', h.input));
      const del = button('mx-del-item', '×', 'Remove entry');
      del.addEventListener('click', (ev) => {
        ev.stopPropagation();
        history.splice(idx, 1);
        selected = -1;
        renderHistory();
      });
      head.append(del);
      item.append(head);
      const res = evalInput(h.input);
      const body = el('div', 'mx-result');
      if (!res.ok) {
        body.classList.add('mx-error');
        body.textContent = res.error;
      } else if (res.value.kind === 'scalar') {
        body.append(el('span', 'mx-scalar', formatNum(res.value.v)));
        if (res.value.v instanceof Fraction && !res.value.v.isInteger()) {
          body.append(el('span', 'mx-approx', `≈ ${Number(res.value.v.toNumber().toPrecision(8))}`));
        }
      } else {
        body.append(matrixView(res.value.m));
        body.classList.add('mx-clickable');
        body.tabIndex = 0;
        body.setAttribute('role', 'button');
        body.setAttribute('aria-label', 'Result matrix. Activate for options');
        const toggle = (): void => {
          selected = selected === idx ? -1 : idx;
          renderHistory();
        };
        body.addEventListener('click', toggle);
        body.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            toggle();
          }
        });
        if (selected === idx) {
          const value = res.value.m;
          const save = button('mx-save', 'Save as new matrix');
          save.addEventListener('click', (ev) => {
            ev.stopPropagation();
            saveAsMatrix(value);
          });
          item.append(body, save);
          historyEl.append(item);
          return;
        }
      }
      item.append(body);
      historyEl.append(item);
    });
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function nextName(): string | undefined {
    return LETTERS.find((l) => !matrices.some((m) => m.name === l));
  }

  function saveAsMatrix(m: Matrix): void {
    const name = nextName();
    if (!name || matrices.length >= MAX_MATRICES) return;
    matrices.push({ name, rows: m.map((r) => r.map(formatNum)) });
    selected = -1;
    renderMatrices();
    renderKeypad();
    renderHistory();
  }

  function resize(m: MatrixModel, rows: number, cols: number): void {
    rows = Math.min(MAX_DIM, Math.max(1, rows));
    cols = Math.min(MAX_DIM, Math.max(1, cols));
    m.rows = Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => m.rows[i]?.[j] ?? '0'),
    );
  }

  function stepper(label: string, value: number, onChange: (v: number) => void): HTMLElement {
    const box = el('div', 'mx-stepper');
    const minus = button('mx-step', '−', `Decrease ${label}`);
    const plus = button('mx-step', '+', `Increase ${label}`);
    minus.disabled = value <= 1;
    plus.disabled = value >= MAX_DIM;
    minus.addEventListener('click', () => onChange(value - 1));
    plus.addEventListener('click', () => onChange(value + 1));
    box.append(el('span', 'mx-step-label', label), minus, el('span', 'mx-step-value', String(value)), plus);
    return box;
  }

  function renderMatrices(): void {
    matrixList.replaceChildren();
    for (const m of matrices) {
      const card = el('div', 'mx-card');
      const head = el('div', 'mx-card-head');
      head.append(el('span', 'mx-name', m.name));
      const dims = el('div', 'mx-dims');
      const rows = m.rows.length;
      const cols = m.rows[0]?.length ?? 1;
      dims.append(
        stepper('rows', rows, (v) => { resize(m, v, cols); renderMatrices(); renderHistory(); }),
        stepper('cols', cols, (v) => { resize(m, rows, v); renderMatrices(); renderHistory(); }),
      );
      head.append(dims);
      const del = button('mx-del', '×', `Delete matrix ${m.name}`);
      del.addEventListener('click', () => {
        matrices = matrices.filter((x) => x !== m);
        selected = -1;
        renderMatrices();
        renderKeypad();
        renderHistory();
      });
      head.append(del);

      const grid = el('div', 'mx-grid');
      grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      m.rows.forEach((row, i) =>
        row.forEach((cell, j) => {
          const inp = el('input', 'mx-cell');
          inp.type = 'text';
          inp.inputMode = 'decimal';
          inp.value = cell;
          inp.autocomplete = 'off';
          inp.setAttribute('aria-label', `${m.name} row ${i + 1} column ${j + 1}`);
          inp.classList.toggle('mx-invalid', parseNum(cell) === null);
          inp.addEventListener('input', () => {
            m.rows[i]![j] = inp.value;
            inp.classList.toggle('mx-invalid', parseNum(inp.value) === null);
            renderHistory();
          });
          inp.addEventListener('blur', () => {
            if (inp.value.trim() === '') {
              inp.value = '0';
              m.rows[i]![j] = '0';
              inp.classList.remove('mx-invalid');
              renderHistory();
            }
          });
          grid.append(inp);
        }),
      );
      card.append(head, grid);
      matrixList.append(card);
    }
    addBtn.disabled = matrices.length >= MAX_MATRICES || !nextName();
  }

  // ---- input & keypad ---------------------------------------------------
  function insert(text: string): void {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? s;
    input.setRangeText(text, s, e, 'end');
    input.focus();
  }
  function backspace(): void {
    const s = input.selectionStart ?? input.value.length;
    const e = input.selectionEnd ?? s;
    if (s !== e) input.setRangeText('', s, e, 'end');
    else if (s > 0) input.setRangeText('', s - 1, s, 'end');
    input.focus();
  }
  function submit(): void {
    const text = input.value.trim();
    if (!text) return;
    history.push({ input: text });
    if (history.length > MAX_HISTORY) history.shift();
    showExamples(false);
    input.value = '';
    selected = -1;
    renderHistory();
    input.focus();
  }

  function renderKeypad(): void {
    keypad.replaceChildren();
    const keys: { label: string; aria?: string; cls?: string; act: () => void }[] = [];
    for (const m of matrices) keys.push({ label: m.name, cls: 'mx-key-mat', act: () => insert(m.name) });
    const ins = (label: string, text: string, aria?: string): void => {
      keys.push({ label, aria, act: () => insert(text) });
    };
    ins('+', '+', 'plus');
    ins('−', '-', 'minus');
    ins('×', '*', 'times');
    ins('^', '^', 'power');
    ins('⁻¹', '^-1', 'inverse');
    ins('ᵀ', '^T', 'transpose');
    ins('det', 'det(');
    ins('inv', 'inv(');
    ins('rref', 'rref(');
    ins('trace', 'trace(');
    ins('rank', 'rank(');
    ins('(', '(');
    ins(')', ')');
    keys.push({ label: '⌫', aria: 'backspace', cls: 'mx-key-op', act: backspace });
    keys.push({ label: 'enter', cls: 'mx-key-enter', act: submit });
    for (const k of keys) {
      const b = button(`mx-key ${k.cls ?? ''}`.trim(), k.label, k.aria);
      b.addEventListener('mousedown', (ev) => ev.preventDefault()); // keep input focus
      b.addEventListener('click', k.act);
      keypad.append(b);
    }
  }

  // ---- examples ---------------------------------------------------------
  let examplesOpen = false;
  function showExamples(open: boolean): void {
    examplesOpen = open;
    examplesEl.hidden = !open;
    historyEl.hidden = open;
    exBtn.setAttribute('aria-expanded', String(open));
  }
  const sameRows = (a: string[][], b: string[][]): boolean =>
    a.length === b.length && a.every((r, i) => r.length === b[i]!.length && r.every((c, j) => c.trim() === b[i]![j]!.trim()));

  /** Give each example matrix a letter: reuse an identical matrix, else add a new one. Never overwrites. */
  function runExample(ex: MatrixExample): void {
    const names: string[] = [];
    const added: MatrixModel[] = [];
    for (const rows of ex.matrices) {
      const existing = [...matrices, ...added].find((m) => sameRows(m.rows, rows));
      if (existing) {
        names.push(existing.name);
        continue;
      }
      const name = LETTERS.find((l) => ![...matrices, ...added].some((m) => m.name === l));
      if (!name || matrices.length + added.length >= MAX_MATRICES) {
        const intro = examplesEl.querySelector('.ex-intro');
        if (intro) intro.textContent = 'No free matrix letters left. Delete a matrix, then try again.';
        return;
      }
      added.push({ name, rows: rows.map((r) => r.slice()) });
      names.push(name);
    }
    matrices.push(...added);
    history.push({ input: fill(ex.expr, names) });
    if (history.length > MAX_HISTORY) history.shift();
    selected = -1;
    showExamples(false);
    renderAll();
  }
  renderExamples(
    examplesEl,
    'New here? Tap an example: it adds the matrices it needs (your own matrices stay untouched).',
    MATRIX_EXAMPLES.map((ex) => ({
      name: ex.name,
      hint: ex.hint,
      latex: fill(ex.latex, ex.matrices.map(matrixLatex)),
      onPick: () => runExample(ex),
    })),
  );
  exBtn.addEventListener('click', () => showExamples(!examplesOpen));

  addBtn.addEventListener('click', () => {
    const name = nextName();
    if (!name) return;
    matrices.push({ name, rows: blankRows(2, 2) });
    renderMatrices();
    renderKeypad();
    renderHistory();
  });
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      submit();
    }
  };
  input.addEventListener('keydown', onKey);
  cleanups.push(() => input.removeEventListener('keydown', onKey));

  function renderAll(): void {
    renderMatrices();
    renderKeypad();
    renderHistory();
  }
  renderAll();
  showExamples(history.length === 0);

  return {
    getState(): State {
      return {
        version: 1,
        matrices: matrices.map((m) => ({ name: m.name, rows: m.rows.map((r) => r.slice()) })),
        history: history.map((h) => ({ input: h.input })),
      };
    },
    setState(raw: unknown): void {
      const s = sanitizeState(raw);
      if (!s) return;
      matrices = s.matrices;
      history = s.history;
      selected = -1;
      renderAll();
      showExamples(history.length === 0);
    },
    destroy(): void {
      for (const c of cleanups) c();
      container.replaceChildren();
    },
  };
}
