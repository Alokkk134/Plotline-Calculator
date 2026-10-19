// Typesets static math (history rows, example cards) rendered with convertLatexToMarkup.
import 'mathlive/static.css';
import './styles/base.css';
import { inject } from '@vercel/analytics';
import { createShell } from './shell/shell';

createShell(document.getElementById('app')!);

// Vercel Web Analytics: counts visits and page views, including calculator
// switches (it follows pushState). In development it only logs, nothing is sent.
inject({ mode: import.meta.env.DEV ? 'development' : 'production' });
