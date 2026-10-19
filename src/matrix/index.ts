import type { CalculatorModule } from '../shell/types';
import { mountMatrix } from './ui';

export const matrixModule: CalculatorModule = {
  id: 'matrix',
  title: 'Matrix',
  mount: mountMatrix,
};
