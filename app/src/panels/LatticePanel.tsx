import { useStore, select, focusPanel } from '../state/store';
import { useEngine } from '../engine/client';
import { getAlgebra, asSign, labelsFor } from '../algebra';
import { spanElements } from '@hav/core';

type Lattice = { k: number; subs: { basis: number[]; label: string }[] }[];

export function LatticePanel() {
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const selection = useStore((s) => s.selection);
  const A = getAlgebra(preset);
  const S = asSign(A);
  const labels = labelsFor(A, notation);
  const enabled = !!S && S.m >= 1 && S.m <= 7;
  const l = useEngine<Lattice>('lattice', [preset], enabled);
  if (!S) return <div className="panel muted">Basis subalgebra lattice is defined for sign algebras.</div>;
  const selKey = selection.basis ? [...selection.basis].sort((a, b) => a - b).join(',') : '';
  return (
    <div className="panel">
      <div className="muted">Basis subalgebras of {A.name}: every F2-subspace of the index space spans one. Click to select; the table, graph and triad explorer follow.</div>
      {l.loading && <div className="muted">classifying…</div>}
      {l.data?.map(({ k, subs }) => {
        const groups = new Map<string, typeof subs>();
        for (const s of subs) groups.set(s.label, [...(groups.get(s.label) ?? []), s]);
        return (
          <div key={k}>
            <h3>dimension {1 << k} · {subs.length} subalgebras</h3>
            {[...groups].map(([label, list]) => (
              <div key={label} className="row">
                <span style={{ minWidth: 120 }}>{list.length} × <b>{label}</b></span>
                <span>{list.slice(0, 200).map((s) => { const key = spanElements(s.basis).filter((g) => g).join(',') ; const sel = selection.basis && spanElements(selection.basis).filter((g) => g).join(',') === key; return <span key={key} className={`chip mono ${sel ? 'selected' : ''}`} title={`spanned by ${spanElements(s.basis).map((g) => labels[g]).join(' ')}`} onClick={() => { select({ basis: s.basis }); }}>{s.basis.map((g) => labels[g]).join('·')}</span>; })}{list.length > 200 && <span className="muted"> … {list.length - 200} more</span>}</span>
              </div>
            ))}
          </div>
        );
      })}
      {selection.basis && <div className="row"><span className="muted">selected: {selKey && spanElements(selection.basis).map((g) => labels[g]).join(' ')}</span><button onClick={() => focusPanel('graph')}>show in graph</button><button onClick={() => select({})}>clear</button></div>}
    </div>
  );
}
