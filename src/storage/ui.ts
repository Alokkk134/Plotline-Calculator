import './storage.css';
import type { CalculatorId } from '../shell/types';
import type { SavedItem, StorageHost } from './index';
import { Store, MAX_THUMB_CHARS } from './store';
import { buildShareUrl, decodeShare, encodeShare, readShareParam, stripShareParam } from './share';

const DEFAULT_TITLE = 'Untitled Graph';
const CALC_LABEL: Record<CalculatorId, string> = {
  graphing: 'Graphing',
  scientific: 'Scientific',
  'four-function': 'Four-function',
  matrix: 'Matrix',
};

const ICONS = {
  save: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm2 2v5h9V5H7zm5 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 5a1 1 0 0 1 1-1h6l2 2h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5z"/></svg>',
  share:
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M18 16a3 3 0 0 0-2.4 1.2l-6.6-3.3a3 3 0 0 0 0-1.8l6.6-3.3A3 3 0 1 0 15 7a3 3 0 0 0 .1.7L8.5 11a3 3 0 1 0 0 4.1l6.6 3.3A3 3 0 1 0 18 16z"/></svg>',
};

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

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(ts).toLocaleDateString();
}

let toastTimer: number | undefined;
let toastEl: HTMLElement | null = null;
function toast(msg: string, kind: 'ok' | 'error' = 'ok', ms = 2200): void {
  if (!toastEl) {
    toastEl = el('div', 'pl-toast');
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.append(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.dataset.kind = kind;
  toastEl.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('show'), ms);
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v) ?? 'null';
  } catch {
    return '';
  }
}

export function mountStorageUI(slot: HTMLElement, host: StorageHost): void {
  const store = new Store({
    getItem: (k) => localStorage.getItem(k),
    setItem: (k, v) => localStorage.setItem(k, v),
  });

  let currentId: string | null = null;
  let title = DEFAULT_TITLE;
  let trackedCalc: CalculatorId | null = null;
  // The calculator instance being tracked: a fresh mount (switching calculator,
  // or opening a guide page with its example) starts a new, unedited document.
  let trackedInstance: unknown = null;
  let baseline: string | null = null;
  let dirty = false;

  // ---- DOM ----
  const root = el('div', 'pl-storage');
  const titleInput = el('input', 'pl-title');
  titleInput.type = 'text';
  titleInput.value = title;
  titleInput.maxLength = 80;
  titleInput.setAttribute('aria-label', 'Graph title');
  titleInput.title = 'Click to rename';
  titleInput.spellcheck = false;

  const dirtyDot = el('span', 'pl-dirty', '• Unsaved');
  dirtyDot.hidden = true;
  dirtyDot.setAttribute('role', 'status');

  const mkBtn = (cls: string, icon: string, label: string): HTMLButtonElement => {
    const b = el('button', `pl-btn ${cls}`);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = `<span class="pl-ico">${icon}</span><span class="pl-lbl"></span>`;
    b.querySelector('.pl-lbl')!.textContent = label;
    return b;
  };
  const saveBtn = mkBtn('pl-primary', ICONS.save, 'Save');
  saveBtn.title = 'Save (Ctrl+S)';
  const graphsBtn = mkBtn('', ICONS.folder, 'My graphs');
  graphsBtn.setAttribute('aria-haspopup', 'dialog');
  graphsBtn.setAttribute('aria-expanded', 'false');
  const shareBtn = mkBtn('', ICONS.share, 'Share');

  const panel = el('div', 'pl-panel');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'My graphs');

  const search = el('input', 'pl-search');
  search.type = 'search';
  search.placeholder = 'Search saved graphs';
  search.setAttribute('aria-label', 'Search saved graphs');
  const list = el('ul', 'pl-list');
  const actions = el('div', 'pl-actions');
  const mkAct = (t: string): HTMLButtonElement => {
    const b = el('button', 'pl-act', t);
    b.type = 'button';
    return b;
  };
  const newBtn = mkAct('New blank');
  const exportBtn = mkAct('Export all (.json)');
  const importBtn = mkAct('Import (.json)');
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;
  actions.append(newBtn, exportBtn, importBtn, fileInput);
  panel.append(search, list, actions);

  root.append(titleInput, dirtyDot, saveBtn, graphsBtn, shareBtn, panel);
  slot.append(root);

  // ---- state helpers ----
  const active = () => host.getActive();

  function currentJson(): string {
    try {
      return safeStringify(active().instance.getState());
    } catch {
      return '';
    }
  }

  function setTitle(t: string): void {
    title = t.trim() || DEFAULT_TITLE;
    titleInput.value = title;
  }

  function resetTracking(calc: CalculatorId | null): void {
    trackedCalc = calc;
    try {
      trackedInstance = active().instance;
    } catch {
      trackedInstance = null;
    }
    baseline = currentJson();
    dirty = false;
    dirtyDot.hidden = true;
  }

  function refreshDirty(): void {
    let a: ReturnType<typeof active>;
    try {
      a = active();
    } catch {
      return;
    }
    if (!a?.instance) return;
    if (a.id !== trackedCalc || a.instance !== trackedInstance) {
      // The user switched calculators (or opened a guide): start a fresh, unsaved document.
      currentId = null;
      setTitle(DEFAULT_TITLE);
      resetTracking(a.id);
      return;
    }
    dirty = currentJson() !== baseline;
    dirtyDot.hidden = !dirty;
  }

  // ---- save ----
  function save(): void {
    const a = active();
    let state: unknown;
    try {
      state = a.instance.getState();
    } catch {
      toast('Could not read the current state', 'error');
      return;
    }
    let thumbnail: string | undefined;
    try {
      const t = a.instance.getThumbnail?.();
      if (t && t.length <= MAX_THUMB_CHARS) thumbnail = t;
    } catch {
      /* thumbnails are optional */
    }
    try {
      const item = store.save({ id: currentId, title, calculator: a.id, state, thumbnail });
      currentId = item.id;
      trackedCalc = a.id;
      trackedInstance = a.instance;
      baseline = safeStringify(state);
      dirty = false;
      dirtyDot.hidden = true;
      toast('Saved');
      if (!panel.hidden) renderList();
    } catch {
      toast('Could not save: browser storage is full or unavailable', 'error', 4000);
    }
  }

  // ---- open ----
  function openItem(item: SavedItem): void {
    host.open(item.calculator, item.state, item.title, item.id);
    currentId = item.id;
    setTitle(item.title);
    resetTracking(item.calculator);
  }

  function newBlank(): void {
    const id = active().id;
    host.open(id, null, DEFAULT_TITLE);
    currentId = null;
    setTitle(DEFAULT_TITLE);
    resetTracking(id);
  }

  // ---- panel ----
  function safeList(): SavedItem[] {
    try {
      return store.list();
    } catch {
      toast('Could not read saved graphs', 'error', 4000);
      return [];
    }
  }

  function renderList(): void {
    const q = search.value.trim().toLowerCase();
    const items = safeList().filter(
      (i) => !q || i.title.toLowerCase().includes(q) || CALC_LABEL[i.calculator].toLowerCase().includes(q),
    );
    list.replaceChildren();
    if (!items.length) {
      list.append(el('li', 'pl-empty', q ? 'No matches.' : 'No saved graphs yet. Press Save to keep one.'));
      return;
    }
    for (const item of items) {
      const li = el('li', 'pl-row');
      if (item.id === currentId) li.classList.add('current');

      const open = el('button', 'pl-open');
      open.type = 'button';
      open.setAttribute('aria-label', `Open ${item.title}`);
      const thumb = el('span', 'pl-thumb');
      if (item.thumbnail && item.thumbnail.startsWith('data:image/')) {
        const img = el('img');
        img.src = item.thumbnail;
        img.alt = '';
        thumb.append(img);
      } else {
        thumb.textContent = CALC_LABEL[item.calculator].charAt(0);
      }
      const meta = el('span', 'pl-meta');
      const t = el('span', 'pl-name', item.title);
      const sub = el('span', 'pl-sub');
      const badge = el('span', 'pl-badge', CALC_LABEL[item.calculator]);
      sub.append(badge, document.createTextNode(` ${relativeTime(item.updatedAt)}`));
      meta.append(t, sub);
      open.append(thumb, meta);
      open.addEventListener('click', () => {
        openItem(item);
        closePanel();
      });

      const ren = el('button', 'pl-icon', '✎');
      ren.type = 'button';
      ren.setAttribute('aria-label', `Rename ${item.title}`);
      ren.title = 'Rename';
      ren.addEventListener('click', () => {
        const next = window.prompt('Rename graph', item.title);
        if (next === null) return;
        try {
          store.rename(item.id, next);
          if (item.id === currentId) setTitle(next);
        } catch {
          toast('Could not rename: storage unavailable', 'error', 4000);
        }
        renderList();
      });

      const del = el('button', 'pl-icon pl-danger', '×');
      del.type = 'button';
      del.setAttribute('aria-label', `Delete ${item.title}`);
      del.title = 'Delete';
      del.addEventListener('click', () => {
        if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
        try {
          store.remove(item.id);
          if (item.id === currentId) {
            currentId = null;
            baseline = null; // now an unsaved document
          }
        } catch {
          toast('Could not delete: storage unavailable', 'error', 4000);
        }
        renderList();
      });

      li.append(open, ren, del);
      list.append(li);
    }
  }

  function openPanel(): void {
    panel.hidden = false;
    graphsBtn.setAttribute('aria-expanded', 'true');
    search.value = '';
    renderList();
    search.focus();
  }
  function closePanel(): void {
    if (panel.hidden) return;
    panel.hidden = true;
    graphsBtn.setAttribute('aria-expanded', 'false');
  }

  // ---- export / import ----
  function exportAll(): void {
    const items = safeList();
    if (!items.length) {
      toast('Nothing to export yet');
      return;
    }
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = `plotline-graphs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(file: File): Promise<void> {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast('That file is not valid JSON', 'error', 4000);
      return;
    }
    if (!Array.isArray(data)) {
      toast('Import failed: expected a list of saved graphs', 'error', 4000);
      return;
    }
    try {
      const r = store.importMerge(data);
      toast(`Imported ${r.added + r.updated}, skipped ${r.skipped}`, r.added + r.updated ? 'ok' : 'error', 3500);
    } catch {
      toast('Could not import: storage is full or unavailable', 'error', 4000);
    }
    renderList();
  }

  // ---- share ----
  async function share(): Promise<void> {
    const a = active();
    let state: unknown;
    try {
      state = a.instance.getState();
    } catch {
      toast('Could not read the current state', 'error');
      return;
    }
    const data = await encodeShare({ c: a.id, t: title, s: state });
    const url = buildShareUrl(a.id, data);
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      try {
        const ta = el('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.append(ta);
        ta.select();
        copied = document.execCommand('copy');
        ta.remove();
      } catch {
        /* ignore */
      }
    }
    if (copied) {
      const short = url.length > 70 ? url.slice(0, 67) + '...' : url;
      toast(`Link copied: ${short}`, 'ok', 4000);
    } else {
      // prompt() is unavailable in some embedded browsers; fall back to showing the link.
      try {
        window.prompt('Copy this link', url);
      } catch {
        toast(`Copy this link: ${url}`, 'ok', 10000);
      }
    }
  }

  // ---- events ----
  titleInput.addEventListener('focus', () => titleInput.select());
  const commitTitle = () => {
    setTitle(titleInput.value);
    if (currentId) {
      try {
        store.rename(currentId, title);
      } catch {
        toast('Could not rename: storage unavailable', 'error', 4000);
      }
    }
  };
  titleInput.addEventListener('change', commitTitle);
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') titleInput.blur();
    else if (e.key === 'Escape') {
      titleInput.value = title;
      titleInput.blur();
    }
  });

  saveBtn.addEventListener('click', save);
  shareBtn.addEventListener('click', () => void share());
  graphsBtn.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
  search.addEventListener('input', renderList);
  newBtn.addEventListener('click', () => {
    newBlank();
    closePanel();
  });
  exportBtn.addEventListener('click', exportAll);
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (f) void importFile(f);
  });

  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !root.contains(e.target as Node)) closePanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      closePanel();
      graphsBtn.focus();
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    refreshDirty();
    if (dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ---- startup ----
  try {
    resetTracking(active().id);
  } catch {
    /* calculator not ready; the poll will pick it up */
  }
  window.setInterval(refreshDirty, 1000);

  const param = readShareParam(location.hash);
  if (param !== null) {
    const stripped = stripShareParam(location.hash);
    history.replaceState(null, '', location.pathname + location.search + stripped);
    void decodeShare(param).then((p) => {
      if (!p) {
        toast('That share link is invalid or damaged', 'error', 4000);
        return;
      }
      host.open(p.c, p.s, p.t);
      currentId = null;
      setTitle(p.t);
      resetTracking(p.c);
      toast(`Opened shared graph: ${p.t}`);
    });
  }
}
