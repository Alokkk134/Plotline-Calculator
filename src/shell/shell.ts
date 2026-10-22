// App shell: top bar, calculator switcher, routing.
// Routes are real paths (/, /scientific-calculator, /basic-calculator, /matrix-calculator)
// so each calculator is its own indexable page. Old "#/scientific" links still work.
// Anything after "?" in the hash (e.g. "#/graphing?s=...") belongs to the storage module.
import { mountStorageUI } from '../storage';
import { mountInstallButton, registerServiceWorker } from './install';
import { graphingModule } from '../graphing';
import { scientificModule } from '../scientific';
import { fourFunctionModule } from '../fourfunction';
import { matrixModule } from '../matrix';
import type { CalculatorId, CalculatorInstance, CalculatorModule } from './types';
import { canonicalUrl, contentHtml, jsonLd, pageById, pageByPath } from '../seo/pages';
import { topbarHtml } from './chrome';

const MODULES: CalculatorModule[] = [graphingModule, scientificModule, fourFunctionModule, matrixModule];

/** Calculator named by an old-style "#/scientific" hash, if any. */
function routeFromHash(hash = location.hash): CalculatorId | null {
  const id = hash.replace(/^#\/?/, '').split('?')[0];
  return MODULES.find((m) => m.id === id)?.id ?? null;
}

/** Hash route first (old links, share links), then the URL path. */
export function routeFromLocation(): CalculatorId {
  return routeFromHash() ?? pageByPath(location.pathname)?.id ?? 'graphing';
}

const pathFor = (id: CalculatorId): string => pageById(id).path;

/** Keep <title>, description, canonical, social tags, JSON-LD and the article in sync. */
function applySeo(id: CalculatorId): void {
  const p = pageById(id);
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
  const article = document.getElementById('seo');
  if (article && article.dataset.page !== id) {
    article.innerHTML = contentHtml(p);
    article.dataset.page = id;
  }
}

export function createShell(root: HTMLElement): void {
  // Same markup the build pre-rendered (see chrome.ts), now with an empty host
  // for the live calculator in place of the loading placeholder.
  root.innerHTML = `${topbarHtml(routeFromLocation())}
    <main class="calc-host"></main>`;

  const tabs = root.querySelector<HTMLElement>('.calc-tabs')!;
  const host = root.querySelector<HTMLElement>('.calc-host')!;
  const slot = root.querySelector<HTMLElement>('.storage-slot')!;

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
    applySeo(id);
  };

  /** Switch calculator and update the address bar (no page reload). */
  const navigate = (id: CalculatorId): void => {
    const path = pathFor(id);
    // Mount first so the new <title> is in place when the URL changes:
    // Google Analytics records a page view on pushState and reads the title then.
    mount(id);
    if (location.pathname !== path || location.hash) history.pushState(null, '', path);
  };
  // Internal links (tabs, logo, "More free calculators") switch without reloading.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.target || a.origin !== location.origin || a.hash) return;
    const page = pageByPath(a.pathname);
    if (!page) return;
    e.preventDefault();
    navigate(page.id);
    if (!a.closest('.topbar')) window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  mount(routeFromLocation());
  window.addEventListener('popstate', () => mount(routeFromLocation()));
  window.addEventListener('hashchange', () => mount(routeFromLocation()));
  window.addEventListener('resize', () => active?.resize?.());

  mountInstallButton(root.querySelector<HTMLElement>('.install-slot')!);
  registerServiceWorker();

  mountStorageUI(slot, {
    getActive: () => ({ id: activeId!, instance: active! }),
    open: (calculator, state) => {
      if (calculator !== activeId) history.replaceState(null, '', pathFor(calculator));
      // A null state means "new blank": remount fresh rather than relying on each calculator's reset.
      mount(calculator, state == null);
      if (state != null) active!.setState(state);
    },
  });

  // Storage has read any share link by now; turn an old "#/scientific" address into the clean path.
  const hashId = routeFromHash();
  if (hashId && !location.hash.includes('?')) history.replaceState(null, '', pathFor(hashId));
}
