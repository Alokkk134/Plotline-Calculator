// One-click examples (also checked by examples.test.ts).
import type { CalcExample } from './calc';

export const SCIENTIFIC_EXAMPLES: CalcExample[] = [
  { name: 'Order of operations', hint: '× is done before +', latex: '2+3\\times4', expect: 14 },
  { name: 'Brackets first', hint: 'Brackets change the order', latex: '\\left(2+3\\right)\\times4', expect: 20 },
  { name: 'Powers', hint: '2 multiplied by itself 10 times', latex: '2^{10}', expect: 1024 },
  { name: 'Square root', hint: 'Which number squared is 144?', latex: '\\sqrt{144}', expect: 12 },
  { name: 'Fractions', hint: 'Add two fractions', latex: '\\frac{3}{4}+\\frac{1}{8}', expect: 0.875 },
  { name: 'Pythagoras', hint: 'Hypotenuse of a 3-4 triangle', latex: '\\sqrt{3^2+4^2}', expect: 5 },
  { name: 'Sine of 30°', hint: 'Trig in degrees', latex: '\\sin\\left(30\\right)', angleMode: 'deg', expect: 0.5 },
  { name: 'Cosine of π', hint: 'Trig in radians', latex: '\\cos\\left(\\pi\\right)', angleMode: 'rad', expect: -1 },
  { name: 'Inverse tangent', hint: 'Which angle has tan = 1?', latex: '\\arctan\\left(1\\right)', angleMode: 'deg', expect: 45 },
  { name: 'Logarithm', hint: '10 to what power is 1000?', latex: '\\log\\left(1000\\right)', expect: 3 },
  { name: 'Log with any base', hint: '2 to what power is 64?', latex: '\\log_{2}\\left(64\\right)', expect: 6 },
  { name: 'Natural log', hint: 'ln undoes e to a power', latex: '\\ln\\left(e^{2}\\right)', expect: 2 },
  { name: 'Factorial', hint: '5 × 4 × 3 × 2 × 1', latex: '5!', expect: 120 },
  { name: 'Compound interest', hint: '1000 at 5% for 10 years', latex: '1000\\left(1+0.05\\right)^{10}', expect: 1628.894626777442 },
];
