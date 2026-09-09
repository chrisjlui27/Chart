import { useRef, useState } from 'react';
import * as hav from '@hav/core';
import { useStore, log } from '../state/store';
import { getAlgebra, labelsFor } from '../algebra';

const HELP = `hav       engine namespace (preset, mul, associator, derivations, gradedIsomorphisms, ...)
A         the current algebra;  L  its labels in the chosen notation
el(s)     parse an element, e.g. el("o1 - o1234");  fmt(x)  format one
print(x)  print a value;  the last expression's value is printed too
Examples:
  fmt(hav.mul(A, el("o1 - o1234"), el("o2 + o34")))
  hav.derivations(A).length
  hav.gradedIsomorphisms(A, hav.preset("S'"), {limit:1}).isos.length
  hav.stretchSpectrum(A, el("e1 + e9"))`;

export function ConsolePanel() {
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const lines = useStore((s) => s.log);
  const [code, setCode] = useState('fmt(hav.mul(A, el("o1 - o1234"), el("o2 + o34")))');
  const hist = useRef<string[]>([]);
  const run = () => {
    const A = getAlgebra(preset);
    const L = labelsFor(A, notation);
    const fmt = (x: unknown) => x instanceof Float64Array ? hav.formatElement(A, x, L) : typeof x === 'object' ? JSON.stringify(x, (_k, v) => (v instanceof Float64Array || v instanceof Int8Array || v instanceof Int32Array || v instanceof Uint8Array ? Array.from(v as ArrayLike<number>) : v), 1) : String(x);
    const el = (s: string) => hav.parseElement(A as hav.SignAlgebra, s);
    const print = (x: unknown) => log(fmt(x));
    log(`› ${code}`);
    try {
      const body = code.includes('\n') || /^\s*(const|let|var|for|if|while|function)\b/.test(code) ? code : `return (${code});`;
      const f = new Function('hav', 'A', 'L', 'el', 'fmt', 'print', body);
      const v = f(hav, A, L, el, fmt, print);
      if (v !== undefined) log(fmt(v));
    } catch (e) { log(`error: ${(e as Error).message}`); }
    hist.current.push(code);
  };
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="console-out">{lines.length ? lines.join('\n') : HELP}</div>
      <textarea className="console-in" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } }} spellCheck={false} />
      <div className="row"><button onClick={run}>run (Ctrl+Enter)</button><button onClick={() => log(HELP)}>help</button><button onClick={() => useStoreClear()}>clear</button><span className="muted">A = {preset}</span></div>
    </div>
  );
}
function useStoreClear() { (window as unknown as { __havClear?: () => void }).__havClear?.(); }
