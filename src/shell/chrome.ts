// Top bar markup (logo + calculator tabs). Plain strings with no browser-only
// imports, so the build can pre-render it into every page (instant first
// paint) and the running app uses the exact same markup.
import { PAGES, pageById, type PageId } from '../seo/pages';

/** Full tab names (desktop). */
export const TAB_TITLES: Record<PageId, string> = {
  graphing: 'Graphing',
  scientific: 'Scientific',
  'four-function': 'Four Function',
  matrix: 'Matrix',
};

/** Tab labels on phones, where the four tabs share one row. */
export const SHORT_TITLES: Record<PageId, string> = {
  graphing: 'Graph',
  scientific: 'Scientific',
  'four-function': '4-Function',
  matrix: 'Matrix',
};

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const TAB_ICONS: Record<PageId, string> = {
  graphing: svg('<path d="M3 3v18h18"/><path d="M6 16c2.5 0 3-8 6-8s3.5 5 6 5"/>'),
  scientific: svg('<path d="M9 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2"/><path d="M15 4h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"/><path d="M10 9l4 6M14 9l-4 6"/>'),
  'four-function': svg('<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>'),
  matrix: svg('<path d="M7 4H5v16h2M17 4h2v16h-2"/><path d="M9.5 9h.01M14.5 9h.01M9.5 15h.01M14.5 15h.01"/>'),
};

export const LOGO = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
  <defs><linearGradient id="pl-logo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d5ef5"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs>
  <rect width="32" height="32" rx="9" fill="url(#pl-logo)"/>
  <path d="M6 22c3.5 0 4.5-12 8-12s4 8 6.5 8S24 9 26 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="26" cy="9" r="2.4" fill="#ffd166"/>
</svg>`;

/** The header, with `active` marked as the current tab. */
export function topbarHtml(active: PageId): string {
  const tabs = PAGES.map(
    (p) =>
      // The visible text is the accessible name (no aria-label that could differ from it);
      // the title shows the full name on hover.
      `<a class="calc-tab" href="${p.path}" data-id="${p.id}" title="${TAB_TITLES[p.id]}"${p.id === active ? ' aria-current="page"' : ''}>${TAB_ICONS[p.id]}<span class="tab-long">${TAB_TITLES[p.id]}</span><span class="tab-short">${SHORT_TITLES[p.id]}</span></a>`,
  ).join('');
  return `<header class="topbar">
      <a class="brand" href="/" aria-label="Plotline home">${LOGO}<span class="brand-name">Plotline</span></a>
      <nav class="calc-tabs" aria-label="Calculators">${tabs}</nav>
      <div class="install-slot"></div>
      <div class="storage-slot"></div>
    </header>`;
}

/**
 * Pre-rendered first screen: the real header plus a light placeholder where the
 * calculator appears. Shown until the app's JavaScript takes over.
 */
export function bootHtml(active: PageId): string {
  const label = pageById(active).label;
  return `${topbarHtml(active)}
    <main class="calc-host"><div class="boot" aria-busy="true"><p class="boot-title">${label}</p><p class="boot-sub">Loading…</p></div></main>`;
}
