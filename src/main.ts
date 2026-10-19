// Typesets static math (history rows, example cards) rendered with convertLatexToMarkup.
import 'mathlive/static.css';
import './styles/base.css';
import { createShell } from './shell/shell';
import { inject } from '@vercel/analytics';

createShell(document.getElementById('app')!);

// Initialize Vercel Web Analytics
inject();
