// Example cards shared by the Scientific, Four Function and Matrix calculators:
// a "★ Examples" toggle button and a panel of one-click examples.
import { convertLatexToMarkup } from 'mathlive';
import './examples.css';

export interface ExampleCard {
  name: string;
  hint: string;
  /** LaTeX shown on the card. */
  latex: string;
  onPick(): void;
}

/** "★ See examples" button; the caller decides what toggling does. */
export function examplesButton(): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ex-toggle';
  b.innerHTML = '<span aria-hidden="true">★</span><span class="ex-toggle-lbl">See examples</span>';
  b.title = 'Show examples you can try with one click';
  b.setAttribute('aria-label', 'See examples');
  // Don't steal focus from the calculator input.
  b.addEventListener('mousedown', (e) => e.preventDefault());
  return b;
}

/** Fill `panel` with a heading and one card per example. */
export function renderExamples(panel: HTMLElement, intro: string, cards: ExampleCard[]): void {
  panel.className = 'ex-panel';
  panel.replaceChildren();
  const head = document.createElement('div');
  head.className = 'ex-intro';
  head.textContent = intro;
  const grid = document.createElement('div');
  grid.className = 'ex-grid';
  for (const c of cards) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ex-card';
    b.title = `Try: ${c.name}`;
    const name = document.createElement('span');
    name.className = 'ex-name';
    name.textContent = c.name;
    const math = document.createElement('span');
    math.className = 'ex-math';
    try {
      math.innerHTML = convertLatexToMarkup(c.latex);
    } catch {
      math.textContent = c.latex;
    }
    const hint = document.createElement('span');
    hint.className = 'ex-hint';
    hint.textContent = c.hint;
    b.append(name, math, hint);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => c.onPick());
    grid.append(b);
  }
  panel.append(head, grid);
}
