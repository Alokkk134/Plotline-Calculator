import type { CalculatorModule } from '../shell/types';
import {
  ansKey, backspaceKey, clearKey, cmd, createCalculatorModule, enterKey, fn, ins, num, op,
} from '../scientific/calc';
import type { KeyDef } from '../scientific/calc';

const keys: (KeyDef | null)[] = [
  clearKey,
  fn('(', 'Open parenthesis', ins('\\left(#?\\right)')),
  fn(')', 'Move past closing parenthesis', cmd('moveToNextChar')),
  backspaceKey,
  fn('&radic;', 'Square root', ins('\\sqrt{#?}')),
  fn('a<sup>2</sup>', 'Square', ins('^2', 'moveToNextChar')),
  op('%', 'Percent', '\\%'),
  op('&divide;', 'Divide', '\\div'),
  num('7'), num('8'), num('9'), op('&times;', 'Multiply', '\\times'),
  num('4'), num('5'), num('6'), op('&minus;', 'Subtract', '-'),
  num('1'), num('2'), num('3'), op('+', 'Add', '+'),
  num('0'), num('.'), ansKey, enterKey,
];

export const fourFunctionModule: CalculatorModule = createCalculatorModule({
  id: 'four-function',
  title: 'Four Function',
  panels: [{ cols: 4, className: 'calc-panel-num', keys }],
});
