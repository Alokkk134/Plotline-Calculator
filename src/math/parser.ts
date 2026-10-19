// Recursive-descent parser: tokens -> AST. Implicit multiplication follows common calculator conventions.
import { INVERSE_OF } from './builtins';
import { ParseError, tokenize, type Tok } from './tokenizer';
import type { Relation } from './types';

export type BinOp = '+' | '-' | '*' | '/' | '^';
export type Node =
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'neg'; a: Node }
  | { t: 'bin'; op: BinOp; a: Node; b: Node }
  | { t: 'call'; fn: string; args: Node[] }
  /** name(args): a user function call, or multiplication if `name` is a variable. */
  | { t: 'apply'; name: string; args: Node[] }
  | { t: 'tuple'; items: Node[] };

export type Statement =
  | { kind: 'empty' }
  | { kind: 'expr'; node: Node }
  | { kind: 'list'; items: Node[] }
  | { kind: 'rel'; lhs: Node; op: Relation; rhs: Node };

const num = (v: number): Node => ({ t: 'num', v });
const bin = (op: BinOp, a: Node, b: Node): Node => ({ t: 'bin', op, a, b });
const EOF: Tok = { k: 'eof', pos: -1 };

function describe(t: Tok): string {
  if (t.k === 'eof') return 'end';
  if (t.v !== undefined) return String(t.v);
  switch (t.k) {
    case 'lpipe': case 'rpipe': case 'pipe': return '|';
    case 'frac': return '\\frac';
    case 'sqrt': return '\\sqrt';
    default: return t.k;
  }
}

class Parser {
  private p = 0;
  private absDepth = 0;
  constructor(private toks: Tok[]) {}

  peek(o = 0): Tok {
    return this.toks[this.p + o] ?? EOF;
  }
  next(): Tok {
    return this.toks[this.p++] ?? EOF;
  }
  private unexpected(t: Tok): never {
    if (t.k === 'eof') throw new ParseError('Incomplete expression');
    throw new ParseError(`Unexpected '${describe(t)}'`);
  }
  private expect(k: string): Tok {
    const t = this.peek();
    if (t.k !== k) {
      if (t.k === 'eof') throw new ParseError(k === ')' ? 'Missing closing parenthesis' : 'Incomplete expression');
      this.unexpected(t);
    }
    return this.next();
  }
  private isOp(t: Tok, v: string): boolean {
    return t.k === 'op' && t.v === v;
  }

  parseStatement(): Statement {
    if (this.toks.length === 0) return { kind: 'empty' };
    const first = this.parseAdd();
    const t = this.peek();
    if (t.k === 'rel') {
      this.next();
      const rhs = this.parseAdd();
      if (this.peek().k === 'rel') throw new ParseError("Chained inequalities aren't supported");
      this.finish();
      return { kind: 'rel', lhs: first, op: t.v as Relation, rhs };
    }
    if (t.k === ',') {
      const items = [first];
      while (this.peek().k === ',') {
        this.next();
        items.push(this.parseAdd());
      }
      this.finish();
      return { kind: 'list', items };
    }
    this.finish();
    return { kind: 'expr', node: first };
  }

  private finish(): void {
    const t = this.peek();
    if (t.k !== 'eof') this.unexpected(t);
  }

  parseAdd(): Node {
    let left = this.parseMul();
    for (;;) {
      const t = this.peek();
      if (this.isOp(t, '+')) { this.next(); left = bin('+', left, this.parseMul()); }
      else if (this.isOp(t, '-')) { this.next(); left = bin('-', left, this.parseMul()); }
      else return left;
    }
  }

  private startsFactor(t: Tok): boolean {
    switch (t.k) {
      case 'num': case 'name': case 'func': case '(': case '{': case 'lpipe':
      case 'frac': case 'sqrt': case 'binom': case 'lfloor': case 'lceil':
        return true;
      case 'pipe':
        return this.absDepth === 0;
      default:
        return false;
    }
  }

  private parseMul(): Node {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (this.isOp(t, '*')) { this.next(); left = bin('*', left, this.parseUnary()); }
      else if (this.isOp(t, '/')) { this.next(); left = bin('/', left, this.parseUnary()); }
      else if (this.startsFactor(t)) left = bin('*', left, this.parsePostfix());
      else return left;
    }
  }

  private parseUnary(): Node {
    const t = this.peek();
    if (this.isOp(t, '-')) { this.next(); return { t: 'neg', a: this.parseUnary() }; }
    if (this.isOp(t, '+')) { this.next(); return this.parseUnary(); }
    return this.parsePostfix();
  }

  private parsePostfix(): Node {
    let left = this.parseAtom();
    for (;;) {
      const t = this.peek();
      if (this.isOp(t, '!')) { this.next(); left = { t: 'call', fn: 'factorial', args: [left] }; }
      else if (this.isOp(t, '%')) { this.next(); left = bin('/', left, num(100)); }
      else if (t.k === 'deg') { this.next(); left = bin('*', left, num(Math.PI / 180)); }
      else if (this.isOp(t, '^')) {
        if (this.peek(1).k === 'circ') { this.p += 2; left = bin('*', left, num(Math.PI / 180)); continue; }
        if (this.peek(1).k === '{' && this.peek(2).k === 'circ' && this.peek(3).k === '}') {
          this.p += 4;
          left = bin('*', left, num(Math.PI / 180));
          continue;
        }
        this.next();
        left = bin('^', left, this.parsePowerOperand());
      } else return left;
    }
  }

  private parsePowerOperand(): Node {
    const t = this.peek();
    if (this.isOp(t, '-')) { this.next(); return { t: 'neg', a: this.parsePowerOperand() }; }
    if (this.isOp(t, '+')) { this.next(); return this.parsePowerOperand(); }
    if (t.k === '{') return this.parseGroup();
    const atom = this.parseAtom();
    if (this.isOp(this.peek(), '^')) { this.next(); return bin('^', atom, this.parsePowerOperand()); }
    return atom;
  }

  /** `{expr}` or a single atom (TeX style). */
  private parseGroup(): Node {
    if (this.peek().k !== '{') return this.parseAtom();
    this.next();
    const saved = this.absDepth;
    this.absDepth = 0;
    const e = this.parseAdd();
    this.absDepth = saved;
    this.expect('}');
    return e;
  }

  private closer(): Tok {
    const t = this.peek();
    if (t.k === ')' || t.k === ']') return this.next();
    return this.expect(')');
  }

  private parseParenArgs(): Node[] {
    this.expect('(');
    const saved = this.absDepth;
    this.absDepth = 0;
    const items = [this.parseAdd()];
    while (this.peek().k === ',') {
      this.next();
      items.push(this.parseAdd());
    }
    this.absDepth = saved;
    this.closer();
    return items;
  }

  /** Argument of a function written without parentheses: \sin 2x, \ln x^2. */
  private parseFuncArg(): Node {
    const t = this.peek();
    if (this.isOp(t, '-')) { this.next(); return { t: 'neg', a: this.parseFuncArg() }; }
    if (this.isOp(t, '+')) { this.next(); return this.parseFuncArg(); }
    let left = this.parsePostfix();
    while (this.startsFactor(this.peek()) && this.peek().k !== 'func') {
      left = bin('*', left, this.parsePostfix());
    }
    return left;
  }

  private parseFunc(): Node {
    let name = this.next().v as string;
    let exp: Node | null = null;
    let base: Node | null = null;
    for (;;) {
      const t = this.peek();
      if (this.isOp(t, '^') && exp === null) {
        this.next();
        exp = this.parsePowerOperand();
      } else if (t.k === '_' && base === null) {
        this.next();
        base = this.parseGroup();
      } else break;
    }
    if (exp && INVERSE_OF[name] && exp.t === 'neg' && exp.a.t === 'num' && exp.a.v === 1) {
      name = INVERSE_OF[name]!;
      exp = null;
    }
    let args: Node[];
    if (this.peek().k === '(') args = this.parseParenArgs();
    else {
      const t = this.peek();
      if (t.k === 'eof' || !(this.startsFactor(t) || this.isOp(t, '-') || this.isOp(t, '+'))) {
        throw new ParseError(`Missing argument for ${name}`);
      }
      args = [this.parseFuncArg()];
    }
    let node: Node;
    if (name === 'log' && base) node = { t: 'call', fn: 'logb', args: [args[0]!, base] };
    else node = { t: 'call', fn: name, args };
    return exp ? bin('^', node, exp) : node;
  }

  private parseAtom(): Node {
    const t = this.peek();
    switch (t.k) {
      case 'num':
        this.next();
        return num(t.v as number);
      case 'name': {
        this.next();
        if (this.peek().k === '(') return { t: 'apply', name: t.v as string, args: this.parseParenArgs() };
        return { t: 'var', name: t.v as string };
      }
      case 'func':
        return this.parseFunc();
      case '(': {
        const items = this.parseParenArgs();
        return items.length === 1 ? items[0]! : { t: 'tuple', items };
      }
      case '{': {
        return this.parseGroup();
      }
      case 'lpipe':
      case 'pipe': {
        this.next();
        const saved = this.absDepth;
        this.absDepth = 1;
        const e = this.parseAdd();
        this.absDepth = saved;
        const c = this.peek();
        if (c.k !== 'rpipe' && c.k !== 'pipe') {
          if (c.k === 'eof') throw new ParseError('Missing closing |');
          this.unexpected(c);
        }
        this.next();
        return { t: 'call', fn: 'abs', args: [e] };
      }
      case 'lfloor':
      case 'lceil': {
        this.next();
        const e = this.parseAdd();
        this.expect(t.k === 'lfloor' ? 'rfloor' : 'rceil');
        return { t: 'call', fn: t.k === 'lfloor' ? 'floor' : 'ceil', args: [e] };
      }
      case 'frac': {
        this.next();
        const a = this.parseGroup();
        const b = this.parseGroup();
        return bin('/', a, b);
      }
      case 'binom': {
        this.next();
        const a = this.parseGroup();
        const b = this.parseGroup();
        return { t: 'call', fn: 'nCr', args: [a, b] };
      }
      case 'sqrt': {
        this.next();
        let idx: Node | null = null;
        if (this.peek().k === '[') {
          this.next();
          idx = this.parseAdd();
          this.expect(']');
        }
        const arg = this.parseGroup();
        return idx ? { t: 'call', fn: 'root', args: [arg, idx] } : { t: 'call', fn: 'sqrt', args: [arg] };
      }
      default:
        return this.unexpected(t);
    }
  }
}

/** Parse a whole line: expression, comma list, or a single relation. Throws ParseError. */
export function parseLatex(src: string): Statement {
  return new Parser(tokenize(src)).parseStatement();
}
