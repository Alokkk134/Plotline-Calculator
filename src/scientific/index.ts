import type { CalculatorModule } from '../shell/types';
import {
  ansKey, backspaceKey, clearKey, cmd, createCalculatorModule, enterKey, fn, ins, num, op, special,
} from './calc';
import type { KeyDef, KeyPanel } from './calc';

const fnKeys: (KeyDef | null)[] = [
  { label: '2nd', title: 'Toggle inverse / alternate functions', kind: 'toggle', action: special('second') },
  { label: 'deg', title: 'Angle mode', kind: 'toggle', action: special('angle') },
  fn('(', 'Open parenthesis', ins('\\left(#?\\right)')),
  fn(')', 'Move past closing parenthesis', cmd('moveToNextChar')),
  op('%', 'Percent', '\\%'),

  fn('a<sup>2</sup>', 'Square', ins('^2', 'moveToNextChar')),
  fn('a<sup>b</sup>', 'Power', ins('^{#?}')),
  fn('|a|', 'Absolute value', ins('\\left|#?\\right|')),
  fn('&radic;', 'Square root', ins('\\sqrt{#?}'), {
    label: '&#8731;', title: 'Cube root', action: ins('\\sqrt[3]{#?}'),
  }),
  fn('n!', 'Factorial', ins('!')),

  fn('sin', 'Sine', ins('\\sin\\left(#?\\right)'), {
    label: 'sin<sup>-1</sup>', title: 'Inverse sine', action: ins('\\arcsin\\left(#?\\right)'),
  }),
  fn('cos', 'Cosine', ins('\\cos\\left(#?\\right)'), {
    label: 'cos<sup>-1</sup>', title: 'Inverse cosine', action: ins('\\arccos\\left(#?\\right)'),
  }),
  fn('tan', 'Tangent', ins('\\tan\\left(#?\\right)'), {
    label: 'tan<sup>-1</sup>', title: 'Inverse tangent', action: ins('\\arctan\\left(#?\\right)'),
  }),
  fn('&pi;', 'Pi', ins('\\pi')),
  fn('e', 'Euler number', ins('e')),

  fn('ln', 'Natural log', ins('\\ln\\left(#?\\right)'), {
    label: 'e<sup>x</sup>', title: 'e to the x', action: ins('e^{#?}'),
  }),
  fn('log', 'Log base 10', ins('\\log\\left(#?\\right)'), {
    label: '10<sup>x</sup>', title: '10 to the x', action: ins('10^{#?}'),
  }),
  fn('log<sub>b</sub>', 'Log with base', ins('\\log_{#?}\\left(#?\\right)')),
  fn('x/y', 'Fraction', ins('\\frac{#@}{#?}')),
  ansKey,
];

const numKeys: (KeyDef | null)[] = [
  clearKey,
  { label: '&larr;', title: 'Move left', kind: 'op', action: cmd('moveToPreviousChar') },
  { label: '&rarr;', title: 'Move right', kind: 'op', action: cmd('moveToNextChar') },
  backspaceKey,
  num('7'), num('8'), num('9'), op('&divide;', 'Divide', '\\div'),
  num('4'), num('5'), num('6'), op('&times;', 'Multiply', '\\times'),
  num('1'), num('2'), num('3'), op('&minus;', 'Subtract', '-'),
  num('0'), num('.'), op('+', 'Add', '+'), enterKey,
];

const panels: KeyPanel[] = [
  { cols: 5, className: 'calc-panel-fn', keys: fnKeys },
  { cols: 4, className: 'calc-panel-num', keys: numKeys },
];

export const scientificModule: CalculatorModule = createCalculatorModule({
  id: 'scientific',
  title: 'Scientific',
  panels,
});
