import { useSyncExternalStore } from 'react';
import type { FrameSpec, ObservableSpec, GridSpec } from '@hav/core';

export type Notation = 'bit' | 'graded';
export interface Selection {
  /** F2 basis of a selected basis subalgebra */
  basis?: number[];
  /** selected triad (b, c, d) */
  triad?: [number, number, number];
  /** selected table cell */
  cell?: [number, number];
  /** selected zero-divisor triad */
  zd?: { b: number; c: number; d: number; a: number; sa: number };
  /** selected basis element */
  element?: number;
}
export interface AppState {
  preset: string;
  notation: Notation;
  selection: Selection;
  overlay: 'none' | 'chi' | 'types';
  /** third element fixed for the triad grid */
  gridD: number;
  focusPanel?: string;
  focusTick: number;
  log: string[];
  frame: FrameSpec;
  observable: ObservableSpec;
  grid: GridSpec;
  canvas: { showGrid: boolean; deadThreshold: number };
  /** inspected point as coefficient array */
  inspect?: number[];
}

const initial: AppState = { preset: 'S', notation: 'graded', selection: {}, overlay: 'none', gridD: 12, focusTick: 0, log: [], frame: { axes: ['1', 'o1', 'o2'], origin: '0', tilt: { axis: 2, target: 'o12', angle: 0 } }, observable: { kind: 'square', u: 'o1', v: 'o2' }, grid: { res: 9, range: 1.2 }, canvas: { showGrid: true, deadThreshold: 0.03 } };
let state: AppState = initial;
const listeners = new Set<() => void>();

export function getState(): AppState { return state; }
export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  for (const l of listeners) l();
}
export function select(sel: Selection, merge = false) {
  setState((s) => ({ selection: merge ? { ...s.selection, ...sel } : sel }));
}
export function focusPanel(id: string) { setState((s) => ({ focusPanel: id, focusTick: s.focusTick + 1 })); }
export function log(line: string) { setState((s) => ({ log: [...s.log.slice(-400), line] })); }
export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => selector(state), () => selector(state));
}
