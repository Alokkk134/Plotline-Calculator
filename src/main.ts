// Typesets static math (history rows, example cards) rendered with convertLatexToMarkup.
import 'mathlive/static.css';
// Self-hosted brand font: no third-party request blocking the first paint.
import '@fontsource-variable/plus-jakarta-sans';
import './styles/base.css';
import { createShell } from './shell/shell';

createShell(document.getElementById('app')!);

// Analytics, after the page is interactive: both scripts ran during load and
// added to the blocking time that Core Web Vitals measure. They still count the
// visit (Vercel reads the current URL when it starts, and follows pushState).
const startAnalytics = async (): Promise<void> => {
  const mode = import.meta.env.DEV ? 'development' : 'production';
  // Vercel Web Analytics: visits and page views, including calculator switches.
  const { inject } = await import('@vercel/analytics');
  inject({ mode });
  // Vercel Speed Insights: real-user Core Web Vitals.
  const { injectSpeedInsights } = await import('@vercel/speed-insights');
  injectSpeedInsights();
};
if ('requestIdleCallback' in window) requestIdleCallback(() => void startAnalytics(), { timeout: 4000 });
else setTimeout(() => void startAnalytics(), 2500);
