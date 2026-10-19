// Contract every calculator implements. The shell mounts one at a time.

export type CalculatorId = 'graphing' | 'scientific' | 'four-function' | 'matrix';

export interface CalculatorInstance {
  /** Serializable snapshot (JSON-safe). Used by Save / share links. */
  getState(): unknown;
  /** Restore a snapshot previously returned by getState(). Must tolerate bad input. */
  setState(state: unknown): void;
  /** Optional PNG data URL for the "My graphs" list. */
  getThumbnail?(): string | undefined;
  /** Called after the container is resized (window resize, panel drag). */
  resize?(): void;
  destroy(): void;
}

export interface CalculatorModule {
  id: CalculatorId;
  title: string;
  /** Build UI inside `container` (which fills the area under the top bar). */
  mount(container: HTMLElement): CalculatorInstance;
}
