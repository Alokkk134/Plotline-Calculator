// LaTeX (as emitted by MathLive) -> flat token list.
import { canonicalFunc, isFuncName } from './builtins';

export class ParseError extends Error {}

export interface Tok {
  /**
   * Kinds: num name func op rel ( ) [ ] { } , lpipe rpipe pipe _ frac sqrt binom
   * lfloor rfloor lceil rceil circ deg
   */
  k: string;
  v?: string | number;
  pos: number;
}

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η',
  theta: 'θ', vartheta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
  rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

const SKIP_CMDS = new Set([
  ',', ':', ';', '!', ' ', 'quad', 'qquad', 'space', 'displaystyle', 'textstyle', 'scriptstyle',
  'limits', 'nolimits', 'enspace',
]);
const TEXT_CMDS = new Set(['operatorname', 'mathrm', 'text', 'mathit', 'mathbf', 'textit', 'textrm', 'mathop', 'mathsf']);

function matchBrace(src: string, open: number): number {
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') { j++; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return j;
    }
  }
  throw new ParseError('Missing closing brace');
}

function cleanSubscript(raw: string): string {
  return raw
    .replace(/\\([a-zA-Z]+)/g, (_m, w: string) => GREEK[w] ?? w)
    .replace(/[\\{}\s]/g, '');
}

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const n = src.length;
  let i = 0;

  const push = (k: string, v?: string | number, pos = i): void => {
    out.push({ k, v, pos });
  };

  // After a variable name, absorb an optional _{...} / _x subscript into the name.
  const nameWithSub = (base: string): string => {
    let j = i;
    while (src[j] === ' ') j++;
    if (src[j] !== '_') return base;
    j++;
    while (src[j] === ' ') j++;
    let content: string;
    if (src[j] === '{') {
      const end = matchBrace(src, j);
      content = src.slice(j + 1, end);
      i = end + 1;
    } else if (src[j] === '\\') {
      const m = /^\\[a-zA-Z]+/.exec(src.slice(j));
      content = m ? m[0] : src.slice(j, j + 2);
      i = j + content.length;
    } else {
      content = src[j] ?? '';
      i = j + 1;
    }
    const clean = cleanSubscript(content);
    return clean ? `${base}_${clean}` : base;
  };

  while (i < n) {
    const c = src[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '~' || c === ' ') { i++; continue; }

    if ((c >= '0' && c <= '9') || c === '.') {
      const m = /\d+(\.\d*)?|\.\d+/y;
      m.lastIndex = i;
      const r = m.exec(src);
      if (!r) throw new ParseError("Unexpected '.'");
      push('num', parseFloat(r[0]), i);
      i += r[0].length;
      continue;
    }

    if (/[A-Za-z]/.test(c)) {
      const m = /[A-Za-z]+/y;
      m.lastIndex = i;
      const run = m.exec(src)![0];
      const start = i;
      const end = i + run.length;
      if (run === 'ans') { i = end; push('name', 'ans', start); continue; }
      if (run === 'pi') { i = end; push('name', 'π', start); continue; }
      if (run.length > 1 && isFuncName(run) && /^\s*(\\left\s*)?\(/.test(src.slice(end))) {
        i = end;
        push('func', canonicalFunc(run), start);
        continue;
      }
      for (let j = 0; j < run.length; j++) {
        i = start + j + 1;
        const last = j === run.length - 1;
        const nm = last ? nameWithSub(run[j]!) : run[j]!;
        push('name', nm, start + j);
      }
      continue;
    }

    if (c >= 'Ͱ' && c <= 'Ͽ') {
      const start = i;
      i++;
      push('name', nameWithSub(c), start);
      continue;
    }

    if (c === '\\') {
      const start = i;
      i++;
      let cmd: string;
      const m = /[a-zA-Z]+/y;
      m.lastIndex = i;
      const r = m.exec(src);
      if (r) { cmd = r[0]; i += cmd.length; } else { cmd = src[i] ?? ''; i++; }

      if (SKIP_CMDS.has(cmd)) {
        if (cmd === 'hspace' && src[i] === '{') i = matchBrace(src, i) + 1;
        continue;
      }
      if (cmd === 'hspace') { if (src[i] === '{') i = matchBrace(src, i) + 1; continue; }

      if (cmd === 'left' || cmd === 'right') {
        while (src[i] === ' ') i++;
        const ch = src[i];
        const left = cmd === 'left';
        if (ch === '(') { i++; push(left ? '(' : ')', undefined, start); }
        else if (ch === '[') { i++; push(left ? '(' : ')', undefined, start); }
        else if (ch === ']') { i++; push(left ? '(' : ')', undefined, start); }
        else if (ch === ')') { i++; push(left ? '(' : ')', undefined, start); }
        else if (ch === '|') { i++; push(left ? 'lpipe' : 'rpipe', undefined, start); }
        else if (ch === '.') { i++; }
        // else: a command follows (\lfloor, \lvert, \{ ...) and is handled on the next loop turn
        continue;
      }

      if (TEXT_CMDS.has(cmd)) {
        if (src[i] === '*') i++;
        while (src[i] === ' ') i++;
        if (src[i] !== '{') throw new ParseError(`Missing argument for \\${cmd}`);
        const end = matchBrace(src, i);
        const raw = src.slice(i + 1, end).replace(/\\[,:;! ]/g, '').replace(/\s+/g, '');
        i = end + 1;
        if (!raw) continue;
        if (raw.includes('\\')) {
          for (const t of tokenize(raw)) out.push({ ...t, pos: start });
        } else if (raw === 'ans') {
          push('name', 'ans', start);
        } else if (raw === 'pi') {
          push('name', 'π', start);
        } else if (isFuncName(raw)) {
          push('func', canonicalFunc(raw), start);
        } else if (/^\d+(\.\d+)?$/.test(raw)) {
          push('num', parseFloat(raw), start);
        } else {
          push('name', raw.length === 1 ? nameWithSub(raw) : raw, start);
        }
        continue;
      }

      if (cmd === 'placeholder') {
        if (src[i] === '[') { const e = src.indexOf(']', i); i = e < 0 ? n : e + 1; }
        if (src[i] === '{') i = matchBrace(src, i) + 1;
        continue;
      }

      switch (cmd) {
        case 'cdot': case 'times': case 'ast': push('op', '*', start); continue;
        case 'div': push('op', '/', start); continue;
        case 'frac': case 'dfrac': case 'tfrac': {
          push('frac', undefined, start);
          // TeX-style rac12: single-digit arguments without braces
          for (let q = 0; q < 2; q++) {
            while (src[i] === ' ') i++;
            if (src[i] !== undefined && src[i]! >= '0' && src[i]! <= '9') { push('num', Number(src[i]), i); i++; } else break;
          }
          continue;
        }
        case 'sqrt': push('sqrt', undefined, start); continue;
        case 'binom': case 'dbinom': case 'tbinom': push('binom', undefined, start); continue;
        case 'le': case 'leq': case 'leqslant': push('rel', '<=', start); continue;
        case 'ge': case 'geq': case 'geqslant': push('rel', '>=', start); continue;
        case 'lt': push('rel', '<', start); continue;
        case 'gt': push('rel', '>', start); continue;
        case 'infty': push('num', Infinity, start); continue;
        case 'lfloor': push('lfloor', undefined, start); continue;
        case 'rfloor': push('rfloor', undefined, start); continue;
        case 'lceil': push('lceil', undefined, start); continue;
        case 'rceil': push('rceil', undefined, start); continue;
        case 'lvert': push('lpipe', undefined, start); continue;
        case 'rvert': push('rpipe', undefined, start); continue;
        case 'vert': case '|': push('pipe', undefined, start); continue;
        case 'circ': push('circ', undefined, start); continue;
        case 'degree': push('deg', undefined, start); continue;
        case '%': push('op', '%', start); continue;
        case '{': case 'lbrace': push('(', undefined, start); continue;
        case '}': case 'rbrace': push(')', undefined, start); continue;
        default: break;
      }
      if (GREEK[cmd]) { push('name', nameWithSub(GREEK[cmd]), start); continue; }
      if (isFuncName(cmd)) { push('func', canonicalFunc(cmd), start); continue; }
      throw new ParseError(`Unsupported \\${cmd}`);
    }

    // plain single characters
    const start = i;
    i++;
    switch (c) {
      case '+': case '-': case '^': case '!': case '%': case '/': case '*':
        push('op', c, start); break;
      case '−': push('op', '-', start); break;
      case '×': case '·': case '⋅': push('op', '*', start); break;
      case '÷': push('op', '/', start); break;
      case '=': push('rel', '=', start); break;
      case '<':
        if (src[i] === '=') { i++; push('rel', '<=', start); } else push('rel', '<', start);
        break;
      case '>':
        if (src[i] === '=') { i++; push('rel', '>=', start); } else push('rel', '>', start);
        break;
      case '≤': push('rel', '<=', start); break;
      case '≥': push('rel', '>=', start); break;
      case '∞': push('num', Infinity, start); break;
      case '°': push('deg', undefined, start); break;
      case ',': case '(': case ')': case '[': case ']': case '{': case '}': case '_':
        push(c, undefined, start); break;
      case '|': push('pipe', undefined, start); break;
      default:
        throw new ParseError(`Unexpected '${c}'`);
    }
  }
  return out;
}
