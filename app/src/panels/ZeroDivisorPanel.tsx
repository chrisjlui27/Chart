import { useStore, select, log, focusPanel } from '../state/store';
import { useEngine } from '../engine/client';
import { getAlgebra, asSign, labelsFor } from '../algebra';
import { formatElement, mul, vec } from '@hav/core';

type ZD = { b: number; c: number; d: number; a: number; sa: number; type: string; modes: { dual: boolean; extended: boolean; extendedDual: boolean } };
type Data = { count: number; formula: number; triads: number; classes: { size: number; rep: ZD }[]; rows: ZD[]; twoTerm: number | null };

export function ZeroDivisorPanel() {
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const selection = useStore((s) => s.selection);
  const A = getAlgebra(preset);
  const S = asSign(A);
  const labels = labelsFor(A, notation);
  const z = useEngine<Data>('zd', [preset], !!S && S.m >= 2 && A.n <= 128);
  if (!S) return <div className="panel muted">Two-term zero divisors are enumerated for sign algebras.</div>;
  const L = (g: number) => labels[g];
  const sel = selection.zd;
  const pick = (r: ZD) => {
    select({ zd: r, triad: [r.b, r.c, r.d] });
    const x = vec(A.n, { [r.a]: r.sa, [r.b]: 1 }), y = vec(A.n, { [r.c]: 1, [r.d]: 1 });
    log(`(${formatElement(A, x, labels)}) · (${formatElement(A, y, labels)}) = ${formatElement(A, mul(A, x, y), labels)}`);
  };
  const Row = ({ r, size }: { r: ZD; size?: number }) => { const isSel = sel && sel.b === r.b && sel.c === r.c && sel.d === r.d; return (
    <tr className={`clickable ${isSel ? 'selected' : ''}`} onClick={() => pick(r)}>
      {size !== undefined && <td>{size}</td>}<td>{L(r.b)}</td><td>{L(r.c)}</td><td>{L(r.d)}</td><td>{r.sa < 0 ? '−' : ''}{L(r.a)}</td><td className={`type-${r.type}`}>{r.type}</td><td className="mono">{r.modes.dual ? 'D' : '·'}{r.modes.extended ? 'E' : '·'}{r.modes.extendedDual ? 'X' : '·'}</td>
    </tr>); };
  return (
    <div className="panel">
      {z.loading && <div className="muted">enumerating zero divisors…</div>}
      {z.data && (
        <>
          <div className="kv">
            <span className="muted">distinct two-term pairs</span><span>{z.data.count} (Wilmot Z = {z.data.formula}{z.data.count === z.data.formula ? ' ✓' : ''})</span>
            <span className="muted">zero-divisor triads</span><span>{z.data.triads} (a triad names the pairing that puts a = bcd with b)</span>
            {z.data.twoTerm !== null && <><span className="muted">two-term zero-divisor elements e_p ± e_q</span><span>{z.data.twoTerm}</span></>}
            <span className="muted">cycle/mode classes</span><span>{z.data.classes.length}</span>
          </div>
          {sel && <div className="row"><span>selected: ({sel.sa < 0 ? '−' : ''}{L(sel.a)} + {L(sel.b)})({L(sel.c)} + {L(sel.d)}) = 0</span><button onClick={() => focusPanel('console')}>see product in console</button><button onClick={() => focusPanel('table')}>show triad in table</button></div>}
          <h3>classes (representatives) · modes: D dual, E extended, X extended-dual</h3>
          <table className="grid"><thead><tr><th>size</th><th>b</th><th>c</th><th>d</th><th>a</th><th>type</th><th>modes</th></tr></thead><tbody>{z.data.classes.slice(0, 300).map((c) => <Row key={`${c.rep.b},${c.rep.c},${c.rep.d}`} r={c.rep} size={c.size} />)}</tbody></table>
          <h3>all zero-divisor triads{z.data.rows.length < z.data.triads ? ` (first ${z.data.rows.length})` : ''}</h3>
          <table className="grid"><thead><tr><th>b</th><th>c</th><th>d</th><th>a</th><th>type</th><th>modes</th></tr></thead><tbody>{z.data.rows.map((r) => <Row key={`${r.b},${r.c},${r.d}`} r={r} />)}</tbody></table>
        </>
      )}
    </div>
  );
}
