// Shared MathLive setup. Every calculator creates math inputs through here
// so fonts, sounds and keyboard behavior are configured once.
import { MathfieldElement } from 'mathlive';

let configured = false;

function configure(): void {
  if (configured) return;
  configured = true;
  // Fonts are copied to public/mathlive/fonts so the app works offline.
  MathfieldElement.fontsDirectory = `${import.meta.env.BASE_URL}mathlive/fonts`;
  MathfieldElement.soundsDirectory = null;
}

export interface MathInputOptions {
  value?: string;
  placeholder?: string;
  /** 'manual' hides MathLive's own virtual keyboard toggle (calculators render their own keypads). */
  virtualKeyboard?: 'auto' | 'manual';
}

/** Create a configured <math-field>. Read/write LaTeX through `.value`; listen to 'input'. */
export function createMathInput(opts: MathInputOptions = {}): MathfieldElement {
  configure();
  const mf = new MathfieldElement();
  mf.mathVirtualKeyboardPolicy = opts.virtualKeyboard ?? 'manual';
  mf.smartFence = true;
  mf.smartSuperscript = true;
  // Typing "sqrt", "pi", "theta" etc. becomes the symbol.
  mf.defaultMode = 'math';
  if (opts.placeholder) mf.placeholder = opts.placeholder;
  if (opts.value) mf.value = opts.value;
  // menuItems can only be set once the field is in the DOM.
  mf.addEventListener('mount', () => (mf.menuItems = []), { once: true });
  return mf;
}
