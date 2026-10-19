// Serializable state types and validation for the graphing calculator.

export interface Viewport {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
}

export interface ExprState {
  id: string;
  latex: string;
  color: string;
  hidden: boolean;
  slider?: SliderConfig;
}

export interface GraphState {
  version: 1;
  viewport: Viewport;
  expressions: ExprState[];
}

export const DEFAULT_SLIDER: SliderConfig = { min: -10, max: 10, step: 0.1 };

const FALLBACK_PALETTE = ['#c74440', '#2d70b3', '#388c46', '#6042a6', '#fa7e19', '#000000'];

/** Resolve --c1..--c6 from CSS so canvas drawing uses real colors. */
export function readPalette(el: HTMLElement): string[] {
  const cs = getComputedStyle(el);
  return FALLBACK_PALETTE.map((fallback, i) => {
    const v = cs.getPropertyValue(`--c${i + 1}`).trim();
    return v || fallback;
  });
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function fin(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function validViewport(v: unknown): Viewport | undefined {
  if (!isObj(v)) return undefined;
  const { xmin, xmax, ymin, ymax } = v;
  if (!fin(xmin) || !fin(xmax) || !fin(ymin) || !fin(ymax)) return undefined;
  const xr = xmax - xmin;
  const yr = ymax - ymin;
  if (!(xr > 1e-12 && xr < 1e12 && yr > 1e-12 && yr < 1e12)) return undefined;
  return { xmin, xmax, ymin, ymax };
}

export function validSlider(v: unknown): SliderConfig | undefined {
  if (!isObj(v)) return undefined;
  const { min, max, step } = v;
  if (!fin(min) || !fin(max) || !fin(step) || !(max > min) || !(step > 0)) return undefined;
  return { min, max, step };
}

const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;

export interface ParsedState {
  viewport?: Viewport;
  expressions: Array<Partial<ExprState> & { latex: string }>;
}

/** Tolerant parser: bad fields are ignored. */
export function parseState(raw: unknown): ParsedState {
  const out: ParsedState = { expressions: [] };
  if (!isObj(raw)) return out;
  const vp = validViewport(raw.viewport);
  if (vp) out.viewport = vp;
  if (Array.isArray(raw.expressions)) {
    for (const e of raw.expressions) {
      if (!isObj(e)) continue;
      const item: Partial<ExprState> & { latex: string } = {
        latex: typeof e.latex === 'string' ? e.latex : '',
      };
      if (typeof e.id === 'string' && e.id) item.id = e.id;
      if (typeof e.color === 'string' && COLOR_RE.test(e.color.trim())) item.color = e.color.trim();
      if (typeof e.hidden === 'boolean') item.hidden = e.hidden;
      const s = validSlider(e.slider);
      if (s) item.slider = s;
      out.expressions.push(item);
    }
  }
  return out;
}

export function formatSliderValue(v: number, step: number): string {
  const dec = Math.min(10, Math.max(0, Math.ceil(-Math.log10(step) - 1e-9)));
  let s = v.toFixed(dec);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s;
}
