import { useEffect, useState } from 'react';

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
let nextId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
worker.onmessage = (ev: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
  const p = pending.get(ev.data.id);
  if (!p) return;
  pending.delete(ev.data.id);
  if (ev.data.error) p.reject(new Error(ev.data.error)); else p.resolve(ev.data.result);
};
const cache = new Map<string, Promise<unknown>>();

export function call<T = unknown>(fn: string, ...args: unknown[]): Promise<T> {
  const key = `${fn}:${JSON.stringify(args)}`;
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const p = new Promise<T>((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker.postMessage({ id, fn, args });
  });
  cache.set(key, p);
  return p;
}

/** React hook: result of an engine call, or undefined while computing; `enabled` false skips. */
export function useEngine<T>(fn: string, args: unknown[], enabled = true): { data?: T; error?: string; loading: boolean } {
  const key = `${fn}:${JSON.stringify(args)}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: '' });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    call<T>(fn, ...args).then((data) => alive && setState({ key, data })).catch((e: Error) => alive && setState({ key, error: e.message }));
    return () => { alive = false; };
  }, [key, enabled]);
  if (!enabled) return { loading: false };
  if (state.key !== key) return { loading: true };
  return { data: state.data, error: state.error, loading: false };
}
