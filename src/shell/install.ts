// "Install app" support: registers the service worker and shows an Install
// button in the top bar when the browser allows installing.
//  - Chrome / Edge / Android: uses the browser's own install prompt.
//  - iPhone / iPad Safari: no prompt exists, so the button shows the
//    "Share → Add to Home Screen" steps instead.
//  - Already installed (running as an app): the button stays hidden.
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((fn) => fn());

// Catch the prompt as early as possible; it can fire before the UI mounts.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

/** Register the offline service worker (production builds only). */
export function registerServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
  registerSW({ immediate: true });
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  // Other iOS browsers (Chrome = CriOS, Firefox = FxiOS, Edge = EdgiOS) show their own share menus.
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

const ICON_INSTALL =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
const ICON_SHARE =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v13"/><path d="m8 7 4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';

/** Render the Install button (and the iOS help popover) into `slot`. */
export function mountInstallButton(slot: HTMLElement): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'install-btn';
  btn.innerHTML = `${ICON_INSTALL}<span class="install-lbl">Install app</span>`;
  btn.title = 'Install Plotline on this device';
  btn.setAttribute('aria-label', 'Install app');

  const help = document.createElement('div');
  help.className = 'install-help';
  help.setAttribute('role', 'dialog');
  help.setAttribute('aria-label', 'Add to Home Screen');
  help.hidden = true;
  help.innerHTML = `
    <strong>Add Plotline to your Home Screen</strong>
    <ol>
      <li>Tap the <span class="install-ico">${ICON_SHARE}</span> <b>Share</b> button in Safari.</li>
      <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
      <li>Tap <b>Add</b>. Plotline opens like an app and works offline.</li>
    </ol>
    <button type="button" class="install-help-close">Got it</button>`;

  slot.append(btn, help);

  const ios = isIosSafari();
  const update = (): void => {
    btn.hidden = isStandalone() || !(deferred || ios);
    if (btn.hidden) help.hidden = true;
  };
  listeners.add(update);
  window.matchMedia('(display-mode: standalone)').addEventListener('change', update);
  update();

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (deferred) {
      const ev = deferred;
      deferred = null;
      await ev.prompt();
      await ev.userChoice.catch(() => undefined);
      update();
    } else if (ios) {
      help.hidden = !help.hidden;
    }
  });
  help.querySelector('.install-help-close')!.addEventListener('click', () => (help.hidden = true));
  document.addEventListener('click', (e) => {
    if (!help.hidden && !help.contains(e.target as Node)) help.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') help.hidden = true;
  });
}
