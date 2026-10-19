// Save feature public API. Implementation lives in ./ui, ./store and ./share.
import type { CalculatorId, CalculatorInstance } from '../shell/types';
import { mountStorageUI as mountUI } from './ui';

export interface SavedItem {
  id: string;
  title: string;
  calculator: CalculatorId;
  state: unknown;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StorageHost {
  /** Currently mounted calculator and its id. */
  getActive(): { id: CalculatorId; instance: CalculatorInstance };
  /** Switch calculators (if needed) and load a state into it. */
  open(calculator: CalculatorId, state: unknown, title: string, savedId?: string): void;
}

/**
 * Renders the top-bar controls (title field, Save, "My graphs", Share, export/import)
 * into `slot`. Also restores a shared state from location.hash on startup.
 */
export function mountStorageUI(slot: HTMLElement, host: StorageHost): void {
  mountUI(slot, host);
}
