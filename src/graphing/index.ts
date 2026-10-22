// Graphing calculator module: expression panel + canvas graph.
import type { CalculatorInstance, CalculatorModule } from '../shell/types';
import { ExpressionList } from './expressionList';
import { GraphView } from './graphView';
import { Keypad } from './keypad';
import { parseState, readPalette, type GraphState } from './state';
import './graphing.css';

const NARROW = '(max-width: 699px)';

function mount(container: HTMLElement): CalculatorInstance {
  const root = document.createElement('div');
  root.className = 'gr-root';

  // Panel
  const panel = document.createElement('div');
  panel.className = 'gr-panel';
  const header = document.createElement('div');
  header.className = 'gr-panel-header';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'gr-icon-btn';
  addBtn.textContent = '+';
  addBtn.title = 'Add expression';
  addBtn.setAttribute('aria-label', 'Add expression');
  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'gr-icon-btn gr-collapse';
  collapseBtn.textContent = '‹';
  collapseBtn.title = 'Hide expression list';
  collapseBtn.setAttribute('aria-label', 'Hide expression list');
  const heading = document.createElement('span');
  heading.className = 'gr-panel-title';
  heading.textContent = 'Expressions';
  header.append(heading, addBtn, collapseBtn);
  const listWrap = document.createElement('div');
  listWrap.className = 'gr-list-wrap';

  const handle = document.createElement('div');
  handle.className = 'gr-handle';
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-label', 'Resize expression list');
  // A focusable separator must report its position: the panel's share (0–100).
  handle.setAttribute('aria-valuemin', '0');
  handle.setAttribute('aria-valuemax', '100');
  handle.setAttribute('aria-valuenow', '30');
  handle.tabIndex = 0;

  const graphPane = document.createElement('div');
  graphPane.className = 'gr-graph';
  const expandBtn = document.createElement('button');
  expandBtn.type = 'button';
  expandBtn.className = 'gr-expand';
  expandBtn.textContent = '›';
  expandBtn.title = 'Show expression list';
  expandBtn.setAttribute('aria-label', 'Show expression list');
  expandBtn.hidden = true;

  let view!: GraphView;
  const mq = window.matchMedia(NARROW);
  const list = new ExpressionList(listWrap, {
    palette: readPalette(document.documentElement),
    onItems: (items) => view?.setItems(items),
    // Phones: the keypad replaces the system keyboard, so show it while editing.
    onRowActivate: () => {
      if (mq.matches && !keypad.open) keypad.setOpen(true);
    },
  });
  const keypad = new Keypad({
    activeField: () => list.activeField(),
    enter: () => list.addRowAtEnd(true),
    insertExpressions: (latexes) => list.insertExpressions(latexes),
    onToggle: () => view.resize(),
  });
  panel.append(header, listWrap);
  root.append(panel, handle, graphPane);
  graphPane.appendChild(expandBtn);
  // Outer column: [list | graph] on top, keypad docked along the bottom.
  const outer = document.createElement('div');
  outer.className = 'gr-outer';
  outer.append(root, keypad.el);
  container.appendChild(outer);
  view = new GraphView(graphPane);
  // Palette may have been read before the container was in the DOM; items are
  // colored from rows, which fall back to the same palette values.

  const cleanups: Array<() => void> = [];
  const listen = <T extends EventTarget>(t: T, type: string, fn: (e: never) => void, o?: AddEventListenerOptions): void => {
    t.addEventListener(type, fn as EventListener, o);
    cleanups.push(() => t.removeEventListener(type, fn as EventListener, o));
  };

  listen(addBtn, 'click', () => list.addRowAtEnd(true));

  // Collapse / expand
  const setCollapsed = (c: boolean): void => {
    root.classList.toggle('gr-collapsed', c);
    expandBtn.hidden = !c;
    view.resize();
  };
  listen(collapseBtn, 'click', () => setCollapsed(true));
  listen(expandBtn, 'click', () => setCollapsed(false));

  // Phones: start with the keypad folded so the graph gets the space; tapping
  // the graph folds it again.
  if (mq.matches) keypad.setOpen(false);
  listen(graphPane, 'pointerdown', () => {
    if (mq.matches && keypad.open) keypad.setOpen(false);
  });

  // Resizable panel
  let dragging = false;
  listen(handle, 'pointerdown', (e: PointerEvent) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('dragging');
    e.preventDefault();
  });
  listen(handle, 'pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    const r = root.getBoundingClientRect();
    if (mq.matches) {
      const hgt = Math.min(r.height * 0.85, Math.max(120, r.bottom - e.clientY));
      root.style.setProperty('--gr-panel-h', `${hgt}px`);
    } else {
      const w = Math.min(r.width * 0.7, Math.max(220, e.clientX - r.left));
      root.style.setProperty('--gr-panel-w', `${w}px`);
    }
    view.resize();
  });
  const endDrag = (): void => {
    dragging = false;
    handle.classList.remove('dragging');
  };
  listen(handle, 'pointerup', endDrag);
  listen(handle, 'pointercancel', endDrag);
  listen(handle, 'keydown', (e: KeyboardEvent) => {
    if (mq.matches) return;
    const cur = parseFloat(getComputedStyle(root).getPropertyValue('--gr-panel-w')) || 360;
    if (e.key === 'ArrowLeft') root.style.setProperty('--gr-panel-w', `${Math.max(220, cur - 20)}px`);
    else if (e.key === 'ArrowRight') root.style.setProperty('--gr-panel-w', `${cur + 20}px`);
    else return;
    view.resize();
  });

  const syncHandle = (): void => {
    const r = root.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const share = mq.matches ? p.height / (r.height || 1) : p.width / (r.width || 1);
    handle.setAttribute('aria-valuenow', String(Math.round(Math.min(1, Math.max(0, share)) * 100)));
    handle.setAttribute('aria-orientation', mq.matches ? 'horizontal' : 'vertical');
  };
  const ro = new ResizeObserver(() => {
    view.resize();
    syncHandle();
  });
  ro.observe(graphPane);
  listen(window, 'resize', () => view.resize());

  // Seed with one empty row and focus it only when the user interacts.
  list.analyzeNow();
  view.resize();
  syncHandle();

  let destroyed = false;
  return {
    getState(): GraphState {
      return { version: 1, viewport: view.getViewport(), expressions: list.getExpressions() };
    },
    setState(state: unknown): void {
      if (destroyed) return;
      const parsed = parseState(state);
      list.setExpressions(parsed.expressions);
      if (parsed.viewport) view.setViewport(parsed.viewport);
      else view.resetViewport();
    },
    getThumbnail(): string | undefined {
      return view.thumbnail(240, 160);
    },
    resize(): void {
      view.resize();
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      ro.disconnect();
      for (const c of cleanups) c();
      cleanups.length = 0;
      list.destroy();
      keypad.destroy();
      view.destroy();
      outer.remove();
    },
  };
}

export const graphingModule: CalculatorModule = {
  id: 'graphing',
  title: 'Graphing',
  mount,
};
