import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { PAGES, canonicalUrl, contentHtml, headHtml, type PageSeo } from './src/seo/pages';
import { bootHtml } from './src/shell/chrome';

const HEAD = /<!--seo:head(?::start-->[\s\S]*?<!--seo:head:end)?-->/;
const CONTENT = /<article id="seo" class="seo-content"[^>]*>[\s\S]*?<\/article>/;
const APP = /<div id="app">(?:[\s\S]*?<!--\/app-->)?<\/div>/;

/** Fill index.html's placeholders for one page. */
function renderPage(html: string, p: PageSeo): string {
  return html
    .replace(HEAD, () => `<!--seo:head:start-->\n    ${headHtml(p)}\n    <!--seo:head:end-->`)
    .replace(CONTENT, () => `<article id="seo" class="seo-content" data-page="${p.id}">${contentHtml(p)}</article>`)
    // Real header + loading frame, painted before any JavaScript runs.
    .replace(APP, () => `<div id="app">${bootHtml(p.id)}<!--/app--></div>`);
}

/**
 * Pre-renders one HTML file per calculator (index.html, scientific-calculator.html, …)
 * with its own title, description, canonical URL, structured data and readable
 * article, so search engines and AI crawlers see real content without JavaScript.
 * Also writes sitemap.xml.
 */
function seoPages(): Plugin {
  const home = PAGES.find((p) => p.path === '/')!;
  return {
    name: 'plotline-seo-pages',
    transformIndexHtml: { order: 'pre', handler: (html) => renderPage(html, home) },
    // Runs after Vite has added the finished index.html to the bundle.
    enforce: 'post',
    generateBundle: { order: 'post', handler(_opts, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') return;
      const html = String(index.source);
      for (const p of PAGES) {
        if (p.path === '/') continue;
        this.emitFile({ type: 'asset', fileName: p.file, source: renderPage(html, p) });
      }
      const today = new Date().toISOString().slice(0, 10);
      const urls = PAGES.map(
        (p) =>
          `  <url><loc>${canonicalUrl(p)}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${p.path === '/' ? '1.0' : '0.9'}</priority></url>`,
      ).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    } },
  };
}

/** Google Analytics 4 measurement ID for tryplotline.xyz. */
const GA_ID = 'G-F56XZ7LDGV';

/**
 * Adds the Google tag right after <head> in production builds only, so local
 * development doesn't count as visits. Every pre-rendered page gets it because
 * they are all made from the built index.html.
 *
 * The gtag() queue is set up immediately (so the visit is recorded), but the
 * 180 KB gtag.js library is fetched only after the page has loaded and the
 * browser is idle, so it doesn't delay the first paint or block input.
 */
function googleAnalytics(): Plugin {
  return {
    name: 'plotline-google-analytics',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(
          '<head>',
          `<head>
    <!-- Google tag (gtag.js), library loaded after page load -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${GA_ID}');

      window.addEventListener('load', function () {
        var load = function () {
          var s = document.createElement('script');
          s.async = true;
          s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
          document.head.appendChild(s);
        };
        if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 4000 });
        else setTimeout(load, 2000);
      });
    </script>`,
        ),
    },
  };
}

/**
 * Paint first, then start the app. Vite's entry <script type="module"> would run
 * the (large) app bundle before the browser's first paint, hiding the
 * pre-rendered header/loading frame. Instead: preload the bundle right away
 * (download starts immediately) and execute it after the first frame is drawn.
 */
function paintFirst(): Plugin {
  return {
    name: 'plotline-paint-first',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html.replace(
          /<script type="module" crossorigin src="([^"]+)"><\/script>/,
          (_m, src: string) => `<link rel="modulepreload" crossorigin href="${src}">
    <script>
      (function () {
        var started = false;
        function start() {
          if (started) return;
          started = true;
          var s = document.createElement('script');
          s.type = 'module';
          s.crossOrigin = '';
          s.src = '${src}';
          document.head.appendChild(s);
        }
        // After the first frame is painted; the timer covers tabs that don't
        // draw frames (e.g. opened in the background).
        requestAnimationFrame(function () { setTimeout(start, 0); });
        setTimeout(start, 150);
      })();
    </script>`,
        ),
    },
  };
}

export default defineConfig({
  // Published source maps: only downloaded by developer tools, help debugging.
  build: { sourcemap: true },
  plugins: [
    googleAnalytics(),
    paintFirst(),
    seoPages(),
    // Makes the app installable (Chrome "Install", Android "Add to Home screen")
    // and usable offline: every built file is precached by the service worker.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from src/shell/install.ts
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Plotline Calculator',
        short_name: 'Plotline',
        description: 'Graphing, scientific, four-function and matrix calculators. Works offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5f4fb',
        theme_color: '#ffffff',
        categories: ['education', 'productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Graphing', url: '/', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Scientific', url: '/scientific-calculator', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Four Function', url: '/basic-calculator', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Matrix', url: '/matrix-calculator', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // Let crawler files open as themselves, not as the app.
        navigateFallbackDenylist: [/\.(?:xml|txt|json|webmanifest)$/, /^\/sw\.js$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
