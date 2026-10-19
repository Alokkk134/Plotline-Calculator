// One-click examples (also checked by examples.test.ts).
import type { CalcExample } from '../scientific/calc';

export const FOUR_FUNCTION_EXAMPLES: CalcExample[] = [
  { name: 'Add', hint: 'Two prices together', latex: '125+375', expect: 500 },
  { name: 'Subtract', hint: 'Change from 1000', latex: '1000-647', expect: 353 },
  { name: 'Multiply', hint: '12 boxes of 15', latex: '12\\times15', expect: 180 },
  { name: 'Divide', hint: '144 shared by 12', latex: '144\\div12', expect: 12 },
  { name: 'Order of operations', hint: '× is done before +', latex: '2+3\\times4', expect: 14 },
  { name: 'Brackets', hint: 'Brackets go first', latex: '\\left(2+3\\right)\\times4', expect: 20 },
  { name: 'Percent of a number', hint: '20% of 80', latex: '20\\%\\times80', expect: 16 },
  { name: 'Discount', hint: '25% off a price of 800', latex: '800-800\\times25\\%', expect: 600 },
  { name: 'Split the bill', hint: '1250 between 4 friends', latex: '1250\\div4', expect: 312.5 },
  { name: 'Square', hint: '15 squared', latex: '15^2', expect: 225 },
  { name: 'Square root', hint: 'Which number squared is 81?', latex: '\\sqrt{81}', expect: 9 },
  { name: 'Decimals', hint: 'Exact decimal answer', latex: '0.1+0.2', expect: 0.3 },
];
