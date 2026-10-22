// Typesets static math (history rows, example cards) rendered with convertLatexToMarkup.
import 'mathlive/static.css';
// Self-hosted brand font: no third-party request blocking the first paint.
import '@fontsource-variable/plus-jakarta-sans';
import './styles/base.css';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { createShell } from './shell/shell';

createShell(document.getElementById('app')!);

// Vercel Web Analytics: counts visits and page views, including calculator
// switches (it follows pushState). In development it only logs, nothing is sent.
inject({ mode: import.meta.env.DEV ? 'development' : 'production' });

// Vercel Speed Insights: monitors real user performance metrics (Core Web Vitals).
// Automatically detects development mode and only logs without sending data.
injectSpeedInsights();
