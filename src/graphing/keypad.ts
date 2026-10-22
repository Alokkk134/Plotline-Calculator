// Docked, tabbed keypad so first-time users can enter any
// function without knowing the syntax. Keys insert into the focused row.
import type { MathfieldElement } from 'mathlive';
import { convertLatexToMarkup } from 'mathlive';

export interface KeypadHost {
  /** The math field to type into (focused row, or the last row). */
  activeField(): MathfieldElement;
  /** Create a new row below and focus it (the Enter key). */
  enter(): void;
  /** Add ready-made expressions as new rows (Examples tab). */
  insertExpressions(latexes: string[]): void;
  /** Called after the keypad is shown or hidden so the graph can re-layout. */
  onToggle(open: boolean): void;
}

interface Key {
  label: string;
  latex?: string;
  cmd?: 'backspace' | 'enter' | 'left' | 'right' | 'clear';
  cls?: string;
  /** Tooltip: what the key does, with an example. */
  title?: string;
  /** Wider key spanning n columns. */
  span?: number;
}

interface KeyGroup {
  heading?: string;
  cols: number;
  /** On phones, spans the full keypad width instead of half. */
  wide?: boolean;
  keys: Key[];
}

interface Example {
  name: string;
  hint: string;
  latex: string[];
}

const NAV: Key[] = [
  { label: '←', cmd: 'left', cls: 'ctl', title: 'Move cursor left' },
  { label: '→', cmd: 'right', cls: 'ctl', title: 'Move cursor right' },
  { label: '⌫', cmd: 'backspace', cls: 'ctl', title: 'Delete' },
  { label: 'clear', cmd: 'clear', cls: 'ctl', title: 'Clear this row' },
  { label: '↵ new', cmd: 'enter', cls: 'accent', title: 'Finish this row and start a new one (Enter)', span: 2 },
];

const MAIN: KeyGroup[] = [
  {
    heading: 'Variables & symbols',
    cols: 4,
    keys: [
      { label: 'x', latex: 'x', title: 'Variable x' },
      { label: 'y', latex: 'y', title: 'Variable y' },
      { label: 'a²', latex: '#@^{2}', title: 'Square, e.g. x²' },
      { label: 'aᵇ', latex: '#@^{#?}', title: 'Power, e.g. x³ or 2ˣ' },
      { label: '(', latex: '(', title: 'Open bracket' },
      { label: ')', latex: ')', title: 'Close bracket' },
      { label: '√', latex: '\\sqrt{#?}', title: 'Square root, e.g. √x' },
      { label: 'π', latex: '\\pi', title: 'Pi ≈ 3.14159' },
      { label: '<', latex: '<', title: 'Less than (shades a region)' },
      { label: '>', latex: '>', title: 'Greater than (shades a region)' },
      { label: '≤', latex: '\\le', title: 'Less than or equal' },
      { label: '≥', latex: '\\ge', title: 'Greater than or equal' },
      { label: '|a|', latex: '\\left|#?\\right|', title: 'Absolute value, e.g. |x|' },
      { label: 'a/b', latex: '\\frac{#@}{#?}', title: 'Fraction' },
      { label: ',', latex: ',', title: 'Comma, e.g. a point (1, 2)' },
      { label: 'θ', latex: '\\theta', title: 'Theta, for polar graphs: r = θ' },
    ],
  },
  {
    heading: 'Numbers',
    cols: 4,
    keys: [
      { label: '7', latex: '7', cls: 'num' },
      { label: '8', latex: '8', cls: 'num' },
      { label: '9', latex: '9', cls: 'num' },
      { label: '÷', latex: '\\frac{#@}{#?}', cls: 'op', title: 'Divide' },
      { label: '4', latex: '4', cls: 'num' },
      { label: '5', latex: '5', cls: 'num' },
      { label: '6', latex: '6', cls: 'num' },
      { label: '×', latex: '\\cdot ', cls: 'op', title: 'Multiply' },
      { label: '1', latex: '1', cls: 'num' },
      { label: '2', latex: '2', cls: 'num' },
      { label: '3', latex: '3', cls: 'num' },
      { label: '−', latex: '-', cls: 'op', title: 'Minus' },
      { label: '0', latex: '0', cls: 'num' },
      { label: '.', latex: '.', cls: 'num', title: 'Decimal point' },
      { label: '=', latex: '=', cls: 'op', title: 'Equals' },
      { label: '+', latex: '+', cls: 'op', title: 'Plus' },
    ],
  },
  {
    heading: 'Popular',
    cols: 3,
    wide: true,
    keys: [
      { label: 'sin', latex: '\\sin\\left(#?\\right)', title: 'Sine, e.g. y = sin(x)' },
      { label: 'cos', latex: '\\cos\\left(#?\\right)', title: 'Cosine, e.g. y = cos(x)' },
      { label: 'tan', latex: '\\tan\\left(#?\\right)', title: 'Tangent, e.g. y = tan(x)' },
      { label: 'ln', latex: '\\ln\\left(#?\\right)', title: 'Natural log, e.g. y = ln(x)' },
      { label: 'log', latex: '\\log\\left(#?\\right)', title: 'Log base 10' },
      { label: 'eˣ', latex: 'e^{#?}', title: 'Exponential, e.g. y = eˣ' },
      { label: 'f(x)', latex: 'f\\left(x\\right)=', title: 'Define your own function: f(x) = …' },
      { label: 'y=', latex: 'y=', title: 'Start an equation y = …' },
      { label: 'all ƒ ›', cls: 'link', title: 'See every function' },
    ],
  },
];

const FUNCTIONS: KeyGroup[] = [
  {
    heading: 'Trigonometry',
    cols: 3,
    keys: [
      { label: 'sin', latex: '\\sin\\left(#?\\right)', title: 'Sine' },
      { label: 'cos', latex: '\\cos\\left(#?\\right)', title: 'Cosine' },
      { label: 'tan', latex: '\\tan\\left(#?\\right)', title: 'Tangent' },
      { label: 'csc', latex: '\\csc\\left(#?\\right)', title: 'Cosecant = 1/sin' },
      { label: 'sec', latex: '\\sec\\left(#?\\right)', title: 'Secant = 1/cos' },
      { label: 'cot', latex: '\\cot\\left(#?\\right)', title: 'Cotangent = 1/tan' },
      { label: 'sin⁻¹', latex: '\\arcsin\\left(#?\\right)', title: 'Inverse sine (arcsin)' },
      { label: 'cos⁻¹', latex: '\\arccos\\left(#?\\right)', title: 'Inverse cosine (arccos)' },
      { label: 'tan⁻¹', latex: '\\arctan\\left(#?\\right)', title: 'Inverse tangent (arctan)' },
    ],
  },
  {
    heading: 'Hyperbolic',
    cols: 3,
    keys: [
      { label: 'sinh', latex: '\\sinh\\left(#?\\right)', title: 'Hyperbolic sine' },
      { label: 'cosh', latex: '\\cosh\\left(#?\\right)', title: 'Hyperbolic cosine' },
      { label: 'tanh', latex: '\\tanh\\left(#?\\right)', title: 'Hyperbolic tangent' },
    ],
  },
  {
    heading: 'Powers, roots & logs',
    cols: 3,
    keys: [
      { label: 'a²', latex: '#@^{2}', title: 'Square' },
      { label: 'aᵇ', latex: '#@^{#?}', title: 'Power' },
      { label: 'eˣ', latex: 'e^{#?}', title: 'Exponential' },
      { label: '√', latex: '\\sqrt{#?}', title: 'Square root' },
      { label: '∛', latex: '\\sqrt[3]{#?}', title: 'Cube root' },
      { label: 'ⁿ√', latex: '\\sqrt[#?]{#?}', title: 'n-th root' },
      { label: 'ln', latex: '\\ln\\left(#?\\right)', title: 'Natural log (base e)' },
      { label: 'log', latex: '\\log\\left(#?\\right)', title: 'Log base 10' },
      { label: 'logₐ', latex: '\\log_{#?}\\left(#?\\right)', title: 'Log with any base, e.g. log₂(x)' },
    ],
  },
  {
    heading: 'Rounding & more',
    cols: 3,
    keys: [
      { label: '|x|', latex: '\\left|#?\\right|', title: 'Absolute value' },
      { label: '⌊x⌋', latex: '\\left\\lfloor #?\\right\\rfloor', title: 'Floor: round down' },
      { label: '⌈x⌉', latex: '\\left\\lceil #?\\right\\rceil', title: 'Ceiling: round up' },
      { label: 'round', latex: '\\operatorname{round}\\left(#?\\right)', title: 'Round to nearest whole number' },
      { label: 'sign', latex: '\\operatorname{sign}\\left(#?\\right)', title: 'Sign: −1, 0 or 1' },
      { label: 'mod', latex: '\\operatorname{mod}\\left(#?,#?\\right)', title: 'Remainder, e.g. mod(7, 3) = 1' },
      { label: 'min', latex: '\\operatorname{min}\\left(#?,#?\\right)', title: 'Smallest value' },
      { label: 'max', latex: '\\operatorname{max}\\left(#?,#?\\right)', title: 'Largest value' },
      { label: 'n!', latex: '!', title: 'Factorial, e.g. 5! = 120' },
    ],
  },
  {
    heading: 'Counting & constants',
    cols: 3,
    keys: [
      { label: 'nCr', latex: '\\operatorname{nCr}\\left(#?,#?\\right)', title: 'Combinations' },
      { label: 'nPr', latex: '\\operatorname{nPr}\\left(#?,#?\\right)', title: 'Permutations' },
      { label: 'gcd', latex: '\\operatorname{gcd}\\left(#?,#?\\right)', title: 'Greatest common divisor' },
      { label: 'π', latex: '\\pi', title: 'Pi' },
      { label: 'e', latex: 'e', title: "Euler's number ≈ 2.718" },
      { label: 'θ', latex: '\\theta', title: 'Theta (polar angle)' },
    ],
  },
];

const ABC: KeyGroup[] = [
  {
    heading: 'Letters (use for sliders, e.g. y = a·x²)',
    cols: 9,
    keys: [
      ...'abcdfghjk'.split(''),
      ...'lmnpqrstu'.split(''),
      ...'vwzxy'.split(''),
    ].map((c) => ({ label: c, latex: c, title: c === 'x' || c === 'y' ? `Variable ${c}` : `Variable ${c} (gets a slider)` }))
      .concat([
        { label: 'a₁', latex: '#@_{#?}', title: 'Subscript, e.g. a₁' },
        { label: 'θ', latex: '\\theta', title: 'Theta' },
        { label: 'α', latex: '\\alpha', title: 'Alpha' },
        { label: 'β', latex: '\\beta', title: 'Beta' },
      ]),
  },
];

const EXAMPLES: Example[] = [
  { name: 'Straight line', hint: 'Slope 2, crosses y at 1', latex: ['y=2x+1'] },
  { name: 'Parabola', hint: 'A U-shaped curve', latex: ['y=x^2-4'] },
  { name: 'Sine wave', hint: 'Waves up and down', latex: ['y=\\sin\\left(x\\right)'] },
  { name: 'Circle', hint: 'Radius 4 around the origin', latex: ['x^2+y^2=16'] },
  { name: 'Slider', hint: 'Drag a and b to change the wave', latex: ['a=2', 'b=1', 'y=a\\sin\\left(bx\\right)'] },
  { name: 'Shaded region', hint: 'Everything above a parabola', latex: ['y>x^2-3'] },
  { name: 'Exponential', hint: 'Fast growth', latex: ['y=e^{x}'] },
  { name: 'Absolute value', hint: 'A V-shape', latex: ['y=\\left|x\\right|'] },
  { name: 'Polar flower', hint: 'r = 3·sin(4θ)', latex: ['r=3\\sin\\left(4\\theta\\right)'] },
  { name: 'Parametric ellipse', hint: '(5 cos t, 3 sin t), t from 0 to 1', latex: ['\\left(5\\cos\\left(2\\pi t\\right),3\\sin\\left(2\\pi t\\right)\\right)'] },
  { name: 'Your own function', hint: 'Define f, then graph f(x) + 2', latex: ['f\\left(x\\right)=x^3-3x', 'y=f\\left(x\\right)+2'] },
  { name: 'Points', hint: 'Plot exact points', latex: ['\\left(1,2\\right),\\left(3,4\\right),\\left(-2,1\\right)'] },
];

type TabId = 'main' | 'functions' | 'abc' | 'examples';
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'main', label: '123' },
  { id: 'functions', label: 'ƒ Functions' },
  { id: 'abc', label: 'ABC' },
  { id: 'examples', label: '★ Examples' },
];

export class Keypad {
  readonly el = document.createElement('div');
  private readonly removers: Array<() => void> = [];
  private readonly panes = new Map<TabId, HTMLElement>();
  private readonly tabBtns = new Map<TabId, HTMLButtonElement>();
  private readonly hideBtn = document.createElement('button');
  private isOpen = true;

  constructor(private readonly host: KeypadHost) {
    this.el.className = 'gr-keypad';

    const bar = document.createElement('div');
    bar.className = 'gr-kp-bar';
    const tabList = document.createElement('div');
    tabList.className = 'gr-kp-tabs';
    tabList.setAttribute('role', 'tablist');
    for (const t of TABS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gr-kp-tab';
      b.textContent = t.label;
      b.setAttribute('role', 'tab');
      this.on(b, 'mousedown', (e) => e.preventDefault());
      this.on(b, 'click', () => this.showTab(t.id));
      this.tabBtns.set(t.id, b);
      tabList.appendChild(b);
    }
    const tip = document.createElement('span');
    tip.className = 'gr-kp-tip';
    tip.textContent = 'Tip: you can also just type: sqrt, pi, theta, sin… become math, ^ makes a power, / makes a fraction.';
    this.hideBtn.type = 'button';
    this.hideBtn.className = 'gr-kp-hide';
    this.on(this.hideBtn, 'mousedown', (e) => e.preventDefault());
    this.on(this.hideBtn, 'click', () => this.setOpen(!this.isOpen));
    bar.append(tabList, tip, this.hideBtn);

    const body = document.createElement('div');
    body.className = 'gr-kp-body';
    this.panes.set('main', this.pane(MAIN));
    this.panes.set('functions', this.pane(FUNCTIONS));
    this.panes.set('abc', this.pane(ABC));
    this.panes.set('examples', this.examplesPane());
    for (const p of this.panes.values()) body.appendChild(p);

    this.el.append(bar, body);
    this.showTab('main');
    this.syncOpen();
  }

  get open(): boolean {
    return this.isOpen;
  }

  setOpen(open: boolean): void {
    this.isOpen = open;
    this.syncOpen();
    this.host.onToggle(open);
  }

  destroy(): void {
    for (const r of this.removers) r();
    this.removers.length = 0;
    this.el.remove();
  }

  // ---- building ----------------------------------------------------------

  private on<K extends keyof HTMLElementEventMap>(t: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void): void {
    t.addEventListener(type, fn);
    this.removers.push(() => t.removeEventListener(type, fn));
  }

  private syncOpen(): void {
    this.el.classList.toggle('gr-kp-closed', !this.isOpen);
    this.hideBtn.innerHTML = this.isOpen
      ? '<span class="kp-long">Hide keypad </span>▾'
      : '<span class="kp-long">⌨ Show keypad </span>▴';
    this.hideBtn.setAttribute('aria-label', this.isOpen ? 'Hide keypad' : 'Show keypad');
    this.hideBtn.setAttribute('aria-expanded', String(this.isOpen));
  }

  private showTab(id: TabId): void {
    for (const [k, p] of this.panes) p.hidden = k !== id;
    for (const [k, b] of this.tabBtns) {
      b.classList.toggle('on', k === id);
      b.setAttribute('aria-selected', String(k === id));
    }
    if (!this.isOpen) this.setOpen(true);
  }

  private pane(groups: KeyGroup[]): HTMLElement {
    const p = document.createElement('div');
    p.className = 'gr-kp-pane';
    p.setAttribute('role', 'tabpanel');
    const groupsEl = document.createElement('div');
    groupsEl.className = 'gr-kp-groups';
    for (const g of groups) {
      const box = document.createElement('div');
      box.className = g.wide ? 'gr-kp-group gr-kp-wide' : 'gr-kp-group';
      if (g.heading) {
        const hd = document.createElement('div');
        hd.className = 'gr-kp-heading';
        hd.textContent = g.heading;
        box.appendChild(hd);
      }
      box.appendChild(this.grid(g.keys, g.cols));
      groupsEl.appendChild(box);
    }
    const nav = document.createElement('div');
    nav.className = 'gr-kp-group gr-kp-navgroup';
    const hd = document.createElement('div');
    hd.className = 'gr-kp-heading';
    hd.textContent = 'Edit';
    nav.append(hd, this.grid(NAV, 2));
    groupsEl.appendChild(nav);
    p.appendChild(groupsEl);
    return p;
  }

  private grid(keys: Key[], cols: number): HTMLElement {
    const g = document.createElement('div');
    g.className = 'gr-kp-grid';
    g.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    for (const k of keys) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `gr-key ${k.cls ?? ''}`;
      b.textContent = k.label;
      if (k.span) b.style.gridColumn = `span ${k.span}`;
      if (k.title) b.title = k.title;
      // The spoken name must include the visible label (e.g. "a², Square").
      const named = !k.title || k.title.toLowerCase().includes(k.label.toLowerCase()) || !/[\p{L}\p{N}]/u.test(k.label);
      b.setAttribute('aria-label', named ? (k.title ?? k.label) : `${k.label}, ${k.title}`);
      // Keep the caret in the math field.
      this.on(b, 'mousedown', (e) => e.preventDefault());
      this.on(b, 'click', () => (k.cls === 'link' ? this.showTab('functions') : this.press(k)));
      g.appendChild(b);
    }
    return g;
  }

  private examplesPane(): HTMLElement {
    const p = document.createElement('div');
    p.className = 'gr-kp-pane gr-kp-examples';
    p.setAttribute('role', 'tabpanel');
    const intro = document.createElement('div');
    intro.className = 'gr-kp-heading';
    intro.textContent = 'New here? Click any example to add it to your graph, then edit it.';
    const grid = document.createElement('div');
    grid.className = 'gr-ex-grid';
    for (const ex of EXAMPLES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gr-ex';
      const name = document.createElement('span');
      name.className = 'gr-ex-name';
      name.textContent = ex.name;
      const math = document.createElement('span');
      math.className = 'gr-ex-math';
      math.innerHTML = convertLatexToMarkup(ex.latex[ex.latex.length - 1]!);
      const hint = document.createElement('span');
      hint.className = 'gr-ex-hint';
      hint.textContent = ex.hint;
      b.append(name, math, hint);
      b.title = `Add: ${ex.name}`;
      this.on(b, 'click', () => this.host.insertExpressions(ex.latex));
      grid.appendChild(b);
    }
    p.append(intro, grid);
    return p;
  }

  // ---- input ---------------------------------------------------------------

  private press(k: Key): void {
    if (k.cmd === 'enter') {
      this.host.enter();
      return;
    }
    const mf = this.host.activeField();
    mf.focus();
    if (k.cmd === 'backspace') mf.executeCommand('deleteBackward');
    else if (k.cmd === 'left') mf.executeCommand('moveToPreviousChar');
    else if (k.cmd === 'right') mf.executeCommand('moveToNextChar');
    else if (k.cmd === 'clear') mf.value = '';
    else if (k.latex !== undefined) mf.insert(k.latex, { focus: true, feedback: false, selectionMode: 'placeholder' });
    mf.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
