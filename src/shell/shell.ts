// App shell: top bar, calculator switcher, routing.
// Routes are real paths: the calculator hubs (/, /scientific-calculator,
// /basic-calculator, /matrix-calculator) and guide pages (/graphs/sine,
// /inverse-matrix-calculator, …) that open a calculator with a preset loaded.
// Old "#/scientific" links still work. Anything after "?" in the hash
// (e.g. "#/graphing?s=...") belongs to the storage module.
import { mountStorageUI } from '../storage';
import { mountInstallButton, registerServiceWorker } from './install';
import { graphingModule } from '../graphing';
import { scientificModule } from '../scientific';
import { fourFunctionModule } from '../fourfunction';
import { matrixModule } from '../matrix';
import type { CalculatorId, CalculatorInstance, CalculatorModule } from './types';
import { calcOf, canonicalUrl, contentHtml, isGuide, jsonLd, pageById, pageByPath, type SitePage } from '../seo/pages';
import { topbarHtml } from './chrome';

const MODULES: CalculatorModule[] = [graphingModule, scientificModule, fourFunctionModule, matrixModule];

/** Calculator named by an old-style "#/scientific" hash, if any. */
function routeFromHash(hash = location.hash): CalculatorId | null {
  const id = hash.replace(/^#\/?/, '').split('?')[0];
  return MODULES.find((m) => m.id === id)?.id ?? null;
}

/** Hash route first (old links, share links), then the URL path. */
export function routeFromLocation(): SitePage {
  const hashId = routeFromHash();
  if (hashId) return pageById(hashId);
  return pageByPath(location.pathname) ?? pageById('graphing');
}

const hubPath = (id: CalculatorId): string => pageById(id).path;

/** Keep <title>, description, canonical, social tags, JSON-LD and the article in sync. */
function applySeo(p: SitePage): void {
  // Leave a pre-rendered "page not found" article (404.html) alone.
  const article = document.getElementById('seo');
  if (article?.dataset.page === '404') return;
  document.title = p.title;
  const set = (sel: string, attr: string, val: string): void => {
    document.querySelector(sel)?.setAttribute(attr, val);
  };
  set('meta[name="description"]', 'content', p.description);
  set('link[rel="canonical"]', 'href', canonicalUrl(p));
  set('meta[property="og:title"]', 'content', p.title);
  set('meta[property="og:description"]', 'content', p.description);
  set('meta[property="og:url"]', 'content', canonicalUrl(p));
  set('meta[name="twitter:title"]', 'content', p.title);
  set('meta[name="twitter:description"]', 'content', p.description);
  // Pages carry different numbers of JSON-LD blocks, so replace them all.
  document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
  for (const obj of jsonLd(p)) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(obj);
    document.head.append(s);
  }
  if (article && article.dataset.page !== p.path) {
    article.innerHTML = contentHtml(p);
    article.dataset.page = p.path;
  }
}

export function createShell(root: HTMLElement): void {
  // Same markup the build pre-rendered (see chrome.ts), now with an empty host
  // for the live calculator in place of the loading placeholder.
  const first = routeFromLocation();
  root.innerHTML = `${topbarHtml(calcOf(first))}
    <main class="calc-host"></main>`;

  const tabs = root.querySelector<HTMLElement>('.calc-tabs')!;
  const host = root.querySelector<HTMLElement>('.calc-host')!;
  const slot = root.querySelector<HTMLElement>('.storage-slot')!;

  let activeId: CalculatorId | null = null;
  let active: CalculatorInstance | null = null;

  const mount = (id: CalculatorId, force = false): void => {
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
  };

  /** Show a page: its calculator (fresh, with the guide's preset if any) plus its SEO. */
  const show = (p: SitePage): void => {
    const preset = isGuide(p) ? p.preset : undefined;
    mount(calcOf(p), preset !== undefined);
    // A copy, so edits in the calculator never change the guide's data.
    if (preset !== undefined) active!.setState(JSON.parse(JSON.stringify(preset)));
    applySeo(p);
    // About and Privacy are for reading: open at the text, not the calculator.
    if (isGuide(p) && p.textPage) document.getElementById('seo')?.scrollIntoView();
  };

  /** Go to a page and update the address bar (no page reload). */
  const navigate = (p: SitePage): void => {
    // Show first so the new <title> is in place when the URL changes:
    // Google Analytics records a page view on pushState and reads the title then.
    show(p);
    if (location.pathname !== p.path || location.hash) history.pushState(null, '', p.path);
  };
  // Internal links (tabs, logo, guide links) switch without reloading.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target || a.origin !== location.origin || a.hash) return;
    const page = pageByPath(a.pathname);
    if (!page) return;
    e.preventDefault();
    navigate(page);
    if (!a.closest('.topbar') && !(isGuide(page) && page.textPage)) window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  show(first);
  window.addEventListener('popstate', () => show(routeFromLocation()));
  window.addEventListener('hashchange', () => show(routeFromLocation()));
  window.addEventListener('resize', () => active?.resize?.());

  mountInstallButton(root.querySelector<HTMLElement>('.install-slot')!);
  registerServiceWorker();

  mountStorageUI(slot, {
    getActive: () => ({ id: activeId!, instance: active! }),
    open: (calculator, state) => {
      // Opening a saved/shared item: it belongs on the calculator's hub page.
      const hub = pageById(calculator);
      if (location.pathname !== hub.path) history.replaceState(null, '', hub.path);
      // A null state means "new blank": remount fresh rather than relying on each calculator's reset.
      mount(calculator, true);
      if (state != null) active!.setState(state);
      applySeo(hub);
    },
  });

  // Storage has read any share link by now; turn an old "#/scientific" address into the clean path.
  const hashId = routeFromHash();
  if (hashId && !location.hash.includes('?')) history.replaceState(null, '', hubPath(hashId));
}
