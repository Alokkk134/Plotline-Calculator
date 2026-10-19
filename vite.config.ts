import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { PAGES, canonicalUrl, contentHtml, headHtml, type PageSeo } from './src/seo/pages';

const HEAD = /<!--seo:head(?::start-->[\s\S]*?<!--seo:head:end)?-->/;
const CONTENT = /<article id="seo" class="seo-content"[^>]*>[\s\S]*?<\/article>/;

/** Fill index.html's SEO placeholders for one page. */
function renderPage(html: string, p: PageSeo): string {
  return html
    .replace(HEAD, () => `<!--seo:head:start-->\n    ${headHtml(p)}\n    <!--seo:head:end-->`)
    .replace(CONTENT, () => `<article id="seo" class="seo-content" data-page="${p.id}">${contentHtml(p)}</article>`);
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
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${GA_ID}');
    </script>`,
        ),
    },
  };
}

export default defineConfig({
  plugins: [
    googleAnalytics(),
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
          { name: 'Graphing', url: '/#/graphing', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Scientific', url: '/#/scientific', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Four Function', url: '/#/four-function', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Matrix', url: '/#/matrix', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // Let crawler files open as themselves, not as the app.
        navigateFallbackDenylist: [/\.(?:xml|txt|json|webmanifest)$/, /^\/sw\.js$/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Font stylesheet: refresh in the background.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            // Font files never change for a given URL.
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
