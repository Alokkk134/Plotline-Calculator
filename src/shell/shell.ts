// App shell: top bar, calculator switcher, hash routing.
// Routes: #/graphing, #/scientific, #/four-function, #/matrix.
// Anything after "?" in the hash (e.g. "#/graphing?s=...") belongs to the storage module.
import { mountStorageUI } from '../storage';
import { graphingModule } from '../graphing';
import { scientificModule } from '../scientific';
import { fourFunctionModule } from '../fourfunction';
import { matrixModule } from '../matrix';
import type { CalculatorId, CalculatorInstance, CalculatorModule } from './types';

const MODULES: CalculatorModule[] = [graphingModule, scientificModule, fourFunctionModule, matrixModule];
/** Tab labels on phones, where the four tabs share one row. */
const SHORT_TITLES: Record<CalculatorId, string> = {
  graphing: 'Graph',
  scientific: 'Scientific',
  'four-function': '4-Function',
  matrix: 'Matrix',
};

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const TAB_ICONS: Record<CalculatorId, string> = {
  graphing: svg('<path d="M3 3v18h18"/><path d="M6 16c2.5 0 3-8 6-8s3.5 5 6 5"/>'),
  scientific: svg('<path d="M9 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2"/><path d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"/><path d="M10 9l4 6M14 9l-4 6"/>'),
  'four-function': svg('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>'),
  matrix: svg('<path d="M7 4H5v16h2M17 4h2v16h-2"/><path d="M9.5 9h.01M14.5 9h.01M9.5 15h.01M14.5 15h.01"/>'),
};

const LOGO = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
  <defs><linearGradient id="pl-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d5ef5"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs>
  <rect width="32" height="32" rx="9" fill="url(#pl-logo)"/>
  <path d="M6 22c3.5 0 4.5-12 8-12s4 8 6.5 8S24 9 26 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="26" cy="9" r="2.4" fill="#ffd166"/>
</svg>`;

export function routeFromHash(hash = location.hash): CalculatorId {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  return MODULES.find((m) => m.id === path)?.id ?? 'graphing';
}

export function createShell(root: HTMLElement): void {
  root.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#/graphing" aria-label="Plotline home">${LOGO}<span class="brand-name">Plotline</span></a>
      <nav class="calc-tabs" aria-label="Calculators"></nav>
      <div class="storage-slot"></div>
    </header>
    <main class="calc-host"></main>`;

  const tabs = root.querySelector<HTMLElement>('.calc-tabs')!;
  const host = root.querySelector<HTMLElement>('.calc-host')!;
  const slot = root.querySelector<HTMLElement>('.storage-slot')!;

  for (const m of MODULES) {
    const a = document.createElement('a');
    a.href = `#/${m.id}`;
    a.className = 'calc-tab';
    a.innerHTML = `${TAB_ICONS[m.id]}<span class="tab-long"></span><span class="tab-short"></span>`;
    a.querySelector('.tab-long')!.textContent = m.title;
    a.querySelector('.tab-short')!.textContent = SHORT_TITLES[m.id];
    a.setAttribute('aria-label', m.title);
    a.dataset.id = m.id;
    tabs.append(a);
  }

  let activeId: CalculatorId | null = null;
  let active: CalculatorInstance | null = null;

  const mount = (id: CalculatorId, force = false) => {
    if (id === activeId && active && !force) return;
    active?.destroy();
    host.replaceChildren();
    const mod = MODULES.find((m) => m.id === id)!;
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;inset:0;';
    host.append(container);
    active = mod.mount(container);
    activeId = id;
    for (const a of tabs.querySelectorAll<HTMLAnchorElement>('a')) {
      if (a.dataset.id === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    document.title = `${mod.title} | Plotline`;
  };

  mount(routeFromHash());
  window.addEventListener('hashchange', () => mount(routeFromHash()));
  window.addEventListener('resize', () => active?.resize?.());

  mountStorageUI(slot, {
    getActive: () => ({ id: activeId!, instance: active! }),
    open: (calculator, state) => {
      if (calculator !== activeId) history.replaceState(null, '', `#/${calculator}`);
      // A null state means "new blank": remount fresh rather than relying on each calculator's reset.
      mount(calculator, state == null);
      if (state != null) active!.setState(state);
    },
  });
}
