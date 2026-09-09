import { useState } from 'react';
import { useStore, select, focusPanel } from '../state/store';
import { useEngine } from '../engine/client';
import { getAlgebra, asSign, labelsFor } from '../algebra';
import { spanElements, triadType, octaveTypeCounts } from '@hav/core';

type Row = { b: number; c: number; d: number; type: string; kind: number; m: { m1: boolean; m2: boolean; m3: boolean; malcev: boolean } };

export function TriadPanel() {
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const selection = useStore((s) => s.selection);
  const [type, setType] = useState('all');
  const [kind, setKind] = useState('all');
  const [page, setPage] = useState(0);
  const [inSub, setInSub] = useState(false);
  const A = getAlgebra(preset);
  const S = asSign(A);
  const labels = labelsFor(A, notation);
  const limit = 150;
  const r = useEngine<{ rows: Row[]; total: number }>('triads', [preset, { type, kind, offset: page * limit, limit }], !!S && S.m >= 2);
  if (!S) return <div className="panel muted">Triads are defined for sign algebras.</div>;
  const L = (g: number) => labels[g];
  const span = selection.basis ? spanElements(selection.basis) : null;
  let rows = r.data?.rows ?? [];
  if (inSub && span) rows = rows.filter((t) => span.includes(t.b) && span.includes(t.c) && span.includes(t.d));
  const subCounts = span && selection.basis && selection.basis.length === 3 ? octaveTypeCounts(S, selection.basis) : null;
  const sel = selection.triad;
  const B = ({ v }: { v: boolean }) => <span className={v ? 'ok' : 'no'}>{v ? '✓' : '·'}</span>;
  return (
    <div className="panel">
      <div className="row">
        <label>type <select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }}>{['all', 'A', 'B', 'C', 'X', 'assoc'].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>kind <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(0); }}><option value="all">all</option><option value="first">first-cycle (b&lt;c&lt;bc&lt;d)</option><option value="cycle">cycle</option><option value="noncycle">non-cycle</option></select></label>
        {span && <button className={inSub ? 'active' : ''} onClick={() => setInSub(!inSub)}>only in selected subalgebra</button>}
        <span className="muted">{r.data ? `${r.data.total} triads` : 'enumerating…'}</span>
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button><span className="muted">page {page + 1}</span><button disabled={!r.data || (page + 1) * limit >= r.data.total} onClick={() => setPage(page + 1)}>›</button>
      </div>
      {subCounts && <div className="muted">selected 8-dim subalgebra: <span className="type-A">A {subCounts.A}</span> <span className="type-B">B {subCounts.B}</span> <span className="type-C">C {subCounts.C}</span> <span className="type-X">X {subCounts.X}</span> (Wilmot Table 6: O = 28X, P4 = 12A 12C 4X)</div>}
      {sel && <div className="row"><span>selected triad <b className="mono">({sel.map(L).join(', ')})</b>: type {triadType(S, ...sel)}, a = bcd = {L(sel[0] ^ sel[1] ^ sel[2])}</span><button onClick={() => focusPanel('table')}>show in table</button><button onClick={() => select({ basis: [sel[0], sel[1], sel[2]], triad: sel })}>select generated subalgebra</button></div>}
      <table className="grid">
        <thead><tr><th>b</th><th>c</th><th>d</th><th>a = bcd</th><th>type</th><th>kind</th><th>M1</th><th>M2</th><th>M3</th><th>Mal'cev</th></tr></thead>
        <tbody>
          {rows.map((t) => { const isSel = sel && sel[0] === t.b && sel[1] === t.c && sel[2] === t.d; return (
            <tr key={`${t.b},${t.c},${t.d}`} className={`clickable ${isSel ? 'selected' : ''}`} onClick={() => select({ triad: [t.b, t.c, t.d], basis: selection.basis }, false)}>
              <td>{L(t.b)}</td><td>{L(t.c)}</td><td>{L(t.d)}</td><td>{L(t.b ^ t.c ^ t.d)}</td><td className={`type-${t.type}`}>{t.type}</td><td className="muted">{t.kind === 0 ? 'line' : t.kind === 1 ? 'non-cycle' : t.c < (t.b ^ t.c) && (t.b ^ t.c) < t.d ? 'first cycle' : 'cycle'}</td>
              <td><B v={t.m.m1} /></td><td><B v={t.m.m2} /></td><td><B v={t.m.m3} /></td><td><B v={t.m.malcev} /></td>
            </tr>); })}
        </tbody>
      </table>
      <div className="muted">Moufang 1 holds iff type B or X; Moufang 2 iff C or X; Moufang 3 iff B or X when Mal'cev holds, else A or C (Wilmot Theorem 6).</div>
    </div>
  );
}
