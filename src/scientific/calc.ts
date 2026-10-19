// Shared calculator engine UI for Scientific and Four Function:
// history list + live MathLive input + on-screen keypad renderer.
import { convertLatexToMarkup } from 'mathlive';
import type { MathfieldElement } from 'mathlive';
import { createMathInput } from '../shared/mathfield';
import { examplesButton, renderExamples } from '../shared/examples';
import { evaluateLatex, formatNumber } from '../math';
import type { AngleMode } from '../math';
import type { CalculatorInstance, CalculatorModule, CalculatorId } from '../shell/types';
import './calc.css';

export type KeyKind = 'num' | 'op' | 'fn' | 'accent' | 'toggle';

export type KeyAction =
  | { type: 'insert'; latex: string; after?: string }
  | { type: 'cmd'; cmd: string }
  | { type: 'special'; name: 'enter' | 'clear' | 'second' | 'angle' };

export interface KeyDef {
  /** Visible label (HTML allowed; static strings only). */
  label: string;
  /** Accessible name. */
  title: string;
  kind: KeyKind;
  action: KeyAction;
  /** Alternate key shown while "2nd" is active. */
  alt?: { label: string; title: string; action: KeyAction };
}

export interface KeyPanel {
  cols: number;
  className?: string;
  /** null = empty grid cell. */
  keys: (KeyDef | null)[];
}

/** A one-click example: evaluated and added to history when picked. */
export interface CalcExample {
  name: string;
  hint: string;
  latex: string;
  /** Switch the angle mode first (trig examples). */
  angleMode?: AngleMode;
  /** Expected result; checked by tests, not shown in the UI. */
  expect: number;
}

export interface CalcConfig {
  id: CalculatorId;
  title: string;
  panels: KeyPanel[];
  examples?: CalcExample[];
}

// ---- key helpers -------------------------------------------------------
export const ins = (latex: string, after?: string): KeyAction =>
  after ? { type: 'insert', latex, after } : { type: 'insert', latex };
export const cmd = (c: string): KeyAction => ({ type: 'cmd', cmd: c });
export const special = (name: 'enter' | 'clear' | 'second' | 'angle'): KeyAction => ({ type: 'special', name });

export const num = (d: string): KeyDef => ({ label: d, title: d, kind: 'num', action: ins(d) });
export const op = (label: string, title: string, latex: string): KeyDef => ({
  label, title, kind: 'op', action: ins(latex),
});
export const fn = (label: string, title: string, action: KeyAction, alt?: KeyDef['alt']): KeyDef =>
  alt ? { label, title, kind: 'fn', action, alt } : { label, title, kind: 'fn', action };
export const backspaceKey: KeyDef = { label: '&#9003;', title: 'Backspace', kind: 'op', action: cmd('deleteBackward') };
export const clearKey: KeyDef = { label: 'AC', title: 'Clear all', kind: 'op', action: special('clear') };
export const ansKey: KeyDef = fn('ans', 'Previous answer', ins('\\operatorname{ans}'));
export const enterKey: KeyDef = { label: '=', title: 'Enter', kind: 'accent', action: special('enter') };

// ---- state -------------------------------------------------------------
interface HistoryItem {
  latex: string;
  value: number;
}

interface CalcState {
  version: 1;
  angleMode: AngleMode;
  history: HistoryItem[];
  input: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function renderLatex(el: HTMLElement, latex: string): void {
  try {
    el.innerHTML = convertLatexToMarkup(latex);
  } catch {
    el.textContent = latex;
  }
}

export function createCalculatorModule(config: CalcConfig): CalculatorModule {
  return {
    id: config.id,
    title: config.title,
    mount(container: HTMLElement): CalculatorInstance {
      return mountCalculator(container, config);
    },
  };
}

function mountCalculator(container: HTMLElement, config: CalcConfig): CalculatorInstance {
  let angleMode: AngleMode = 'rad';
  let second = false;
  let history: HistoryItem[] = [];

  const root = document.createElement('div');
  root.className = `calc calc-${config.id}`;

  const historyEl = document.createElement('div');
  historyEl.className = 'calc-history';
  historyEl.setAttribute('role', 'log');
  historyEl.setAttribute('aria-label', 'History');

  const inputWrap = document.createElement('div');
  inputWrap.className = 'calc-input-wrap';
  const mf: MathfieldElement = createMathInput({ virtualKeyboard: 'manual' });
  mf.classList.add('calc-input');
  mf.setAttribute('data-testid', 'calc-input');
  const preview = document.createElement('div');
  preview.className = 'calc-preview';
  preview.setAttribute('aria-live', 'polite');
  const errorEl = document.createElement('div');
  errorEl.className = 'calc-error';
  errorEl.setAttribute('role', 'alert');
  const inputRow = document.createElement('div');
  inputRow.className = 'calc-input-row';
  const exBtn = config.examples?.length ? examplesButton() : null;
  if (exBtn) inputRow.append(exBtn);
  inputRow.append(mf, preview);
  inputWrap.append(inputRow, errorEl);

  const keypadWrap = document.createElement('div');
  keypadWrap.className = 'calc-keypad-wrap';
  const keypad = document.createElement('div');
  keypad.className = 'calc-keypad';
  keypadWrap.append(keypad);

  // Examples take the history area, only after the user taps "See examples".
  const examplesEl = document.createElement('div');
  examplesEl.hidden = true;
  root.append(historyEl, examplesEl, inputWrap, keypadWrap);
  container.replaceChildren(root);

  // ---- evaluation ----
  const lastAns = (): number => {
    const last = history[history.length - 1];
    return last ? last.value : 0;
  };
  const evaluate = (latex: string) =>
    evaluateLatex(latex, { angleMode, variables: { ans: lastAns() } });

  function updatePreview(): void {
    errorEl.textContent = '';
    const latex = mf.value.trim();
    if (!latex) {
      preview.textContent = '';
      return;
    }
    const r = evaluate(latex);
    preview.textContent = r.ok ? `= ${formatNumber(r.value)}` : '';
  }

  function renderHistory(): void {
    historyEl.replaceChildren();
    history.forEach((item) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'calc-history-row';
      row.title = 'Click to reuse this expression';
      const expr = document.createElement('span');
      expr.className = 'calc-history-expr';
      renderLatex(expr, item.latex);
      const res = document.createElement('span');
      res.className = 'calc-history-result';
      res.textContent = `= ${formatNumber(item.value)}`;
      row.append(expr, res);
      row.addEventListener('pointerdown', (e) => e.preventDefault());
      row.addEventListener('click', () => {
        mf.value = item.latex;
        mf.focus();
        updatePreview();
      });
      historyEl.append(row);
    });
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  let examplesOpen = false;
  function showExamples(open: boolean): void {
    examplesOpen = open && !!exBtn;
    examplesEl.hidden = !examplesOpen;
    historyEl.hidden = examplesOpen;
    exBtn?.setAttribute('aria-expanded', String(examplesOpen));
    // Phones hide the keypad while examples are open (see calc.css).
    root.classList.toggle('calc-ex-open', examplesOpen);
  }
  // On phones, tapping the input means "I want to type": bring the keypad back.
  inputWrap.addEventListener('pointerdown', (e) => {
    if (examplesOpen && e.target !== exBtn && !exBtn?.contains(e.target as Node) && window.matchMedia('(max-width: 720px)').matches) {
      showExamples(false);
    }
  });
  function runExample(ex: CalcExample): void {
    if (ex.angleMode) {
      angleMode = ex.angleMode;
      refreshKeys();
    }
    const r = evaluate(ex.latex);
    if (r.ok) history.push({ latex: ex.latex, value: r.value });
    mf.value = '';
    errorEl.textContent = r.ok ? '' : r.error;
    preview.textContent = '';
    showExamples(false);
    renderHistory();
    mf.focus();
  }
  if (config.examples?.length) {
    renderExamples(
      examplesEl,
      'New here? Tap an example to see how it works, then edit it.',
      config.examples.map((ex) => ({
        name: ex.name,
        hint: ex.hint,
        latex: ex.latex,
        onPick: () => runExample(ex),
      })),
    );
    exBtn!.addEventListener('click', () => showExamples(!examplesOpen));
  }

  function submit(): void {
    const latex = mf.value.trim();
    if (!latex) return;
    const r = evaluate(latex);
    if (!r.ok) {
      errorEl.textContent = r.error;
      return;
    }
    history.push({ latex, value: r.value });
    showExamples(false);
    mf.value = '';
    preview.textContent = '';
    errorEl.textContent = '';
    renderHistory();
    mf.focus();
  }

  function clearAll(): void {
    if (mf.value.trim()) {
      mf.value = '';
    } else {
      history = [];
      renderHistory();
      showExamples(false);
    }
    updatePreview();
  }

  // ---- keypad ----
  interface KeyRef {
    def: KeyDef;
    el: HTMLButtonElement;
  }
  const keyRefs: KeyRef[] = [];
  let angleBtn: HTMLButtonElement | null = null;
  let secondBtn: HTMLButtonElement | null = null;

  function runAction(a: KeyAction): void {
    if (a.type === 'insert') {
      mf.insert(a.latex, { format: 'latex' });
      if (a.after) mf.executeCommand(a.after as never);
    } else if (a.type === 'cmd') {
      mf.executeCommand(a.cmd as never);
    } else {
      switch (a.name) {
        case 'enter':
          submit();
          return;
        case 'clear':
          clearAll();
          return;
        case 'second':
          second = !second;
          refreshKeys();
          return;
        case 'angle':
          angleMode = angleMode === 'rad' ? 'deg' : 'rad';
          refreshKeys();
          updatePreview();
          return;
      }
    }
    if (!mf.hasFocus()) mf.focus();
    updatePreview();
  }

  function refreshKeys(): void {
    for (const { def, el } of keyRefs) {
      const alt = second ? def.alt : undefined;
      el.innerHTML = alt ? alt.label : def.label;
      el.title = alt ? alt.title : def.title;
      el.setAttribute('aria-label', el.title);
      el.classList.toggle('is-alt', Boolean(alt));
    }
    if (angleBtn) {
      angleBtn.textContent = angleMode;
      const name = `Angle mode: ${angleMode === 'deg' ? 'degrees' : 'radians'} (click to toggle)`;
      angleBtn.setAttribute('aria-label', name);
      angleBtn.title = name;
    }
    if (secondBtn) {
      secondBtn.classList.toggle('is-active', second);
      secondBtn.setAttribute('aria-pressed', String(second));
    }
  }

  function makeKey(def: KeyDef): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `calc-key calc-key-${def.kind}`;
    b.innerHTML = def.label;
    b.title = def.title;
    b.setAttribute('aria-label', def.title);
    // Keep focus in the math field.
    b.addEventListener('pointerdown', (e) => e.preventDefault());
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      runAction(second && def.alt ? def.alt.action : def.action);
    });
    if (def.action.type === 'special' && def.action.name === 'second') secondBtn = b;
    if (def.action.type === 'special' && def.action.name === 'angle') angleBtn = b;
    keyRefs.push({ def, el: b });
    return b;
  }

  for (const panel of config.panels) {
    const p = document.createElement('div');
    p.className = `calc-panel ${panel.className ?? ''}`.trim();
    p.style.setProperty('--cols', String(panel.cols));
    for (const k of panel.keys) {
      if (!k) {
        const gap = document.createElement('div');
        gap.className = 'calc-gap';
        p.append(gap);
      } else {
        p.append(makeKey(k));
      }
    }
    keypad.append(p);
  }
  refreshKeys();
  showExamples(false);

  // ---- events ----
  const onInput = (): void => updatePreview();
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      submit();
    }
  };
  mf.addEventListener('input', onInput);
  mf.addEventListener('keydown', onKeydown, true);

  queueMicrotask(() => {
    if (root.isConnected) mf.focus();
  });

  return {
    getState(): CalcState {
      return { version: 1, angleMode, history: history.map((h) => ({ ...h })), input: mf.value };
    },
    setState(state: unknown): void {
      if (!isRecord(state)) return;
      const am = state['angleMode'];
      if (am === 'deg' || am === 'rad') angleMode = am;
      const h = state['history'];
      if (Array.isArray(h)) {
        history = h.flatMap((it: unknown): HistoryItem[] => {
          if (!isRecord(it)) return [];
          const latex = it['latex'];
          const value = it['value'];
          return typeof latex === 'string' && typeof value === 'number' && Number.isFinite(value)
            ? [{ latex, value }]
            : [];
        });
      }
      const input = state['input'];
      mf.value = typeof input === 'string' ? input : '';
      renderHistory();
      refreshKeys();
      updatePreview();
      showExamples(false);
    },
    resize(): void {
      historyEl.scrollTop = historyEl.scrollHeight;
    },
    destroy(): void {
      mf.removeEventListener('input', onInput);
      mf.removeEventListener('keydown', onKeydown, true);
      container.replaceChildren();
    },
  };
}
