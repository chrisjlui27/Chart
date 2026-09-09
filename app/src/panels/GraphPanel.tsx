import { useMemo, useState } from 'react';
import { useStore, select } from '../state/store';
import { getAlgebra, asSign, labelsFor } from '../algebra';
import { spanElements } from '@hav/core';

interface Line { p: number; q: number; r: number; oriented: boolean }

export function GraphPanel() {
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const selection = useStore((s) => s.selection);
  const [showAll, setShowAll] = useState(false);
  const A = getAlgebra(preset);
  const S = asSign(A);
  const labels = labelsFor(A, notation);
  const n = A.n;
  const lines = useMemo(() => {
    if (!S) return [] as Line[];
    const out: Line[] = [];
    for (let p = 1; p < n; p++) for (let q = p + 1; q < n; q++) { const r = p ^ q; if (r < q) continue; const t = S.mulMono(S.mono(p, q), { g: r, s: 1 }); out.push({ p, q, r, oriented: !!t && t.s < 0 }); }
    return out;
  }, [S, n]);
  if (!S) return <div className="panel muted">Structure graph is defined for sign algebras (Cayley–Dickson type, Clifford).</div>;
  const N = n - 1;
  const W = 520, cx = W / 2, cy = W / 2, R = W / 2 - 40;
  const pos = new Map<number, [number, number]>();
  if (S.m === 3) {
    // Fano plane: triangle vertices o1, o2, o3; midpoints; centre
    const V: Record<number, [number, number]> = { 1: [cx, cy - R], 2: [cx - R * 0.87, cy + R * 0.5], 4: [cx + R * 0.87, cy + R * 0.5] };
    const mid = (a: number, b: number): [number, number] => [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2];
    pos.set(1, V[1]); pos.set(2, V[2]); pos.set(4, V[4]); pos.set(3, mid(1, 2)); pos.set(5, mid(1, 4)); pos.set(6, mid(2, 4)); pos.set(7, [cx, cy + R * 0.0]);
  } else {
    for (let g = 1; g <= N; g++) { const a = (2 * Math.PI * (g - 1)) / N - Math.PI / 2; pos.set(g, [cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  }
  const span = selection.basis ? new Set(spanElements(selection.basis)) : null;
  const tri = selection.triad;
  const el = selection.element;
  const highlight = (l: Line) => {
    if (tri) { const [b, c, d] = tri; const in3 = (x: number) => x === b || x === c || x === d || x === (b ^ c) || x === (b ^ d) || x === (c ^ d); if (in3(l.p) && in3(l.q) && in3(l.r)) return 'triad'; }
    if (span && span.has(l.p) && span.has(l.q) && span.has(l.r)) return 'sub';
    if (el !== undefined && (l.p === el || l.q === el || l.r === el)) return 'el';
    return null;
  };
  const visible = lines.filter((l) => showAll || S.m <= 3 || highlight(l));
  const path = (l: Line) => {
    const [a, b, c] = [pos.get(l.p)!, pos.get(l.q)!, pos.get(l.r)!];
    if (S.m === 3 && l.p === 3 && l.q === 5 && l.r === 6) { const r = R * 0.5; return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy}`; }
    return `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]} Z`;
  };
  return (
    <div className="panel">
      <div className="row">
        <span className="muted">{N} pure basis elements, {lines.length} lines · {lines.filter((l) => l.oriented).length} oriented as quaternions</span>
        {S.m > 3 && <button className={showAll ? 'active' : ''} onClick={() => setShowAll(!showAll)}>all lines</button>}
        <span className="muted">click a node to see its lines</span>
      </div>
      <svg width={W} height={W} style={{ maxWidth: '100%' }}>
        {visible.map((l) => { const h = highlight(l); const stroke = h === 'triad' ? '#f2d06d' : h === 'sub' ? '#6db3f2' : h === 'el' ? '#e0873c' : l.oriented ? '#4f8fd6' : '#e0873c'; return <path key={`${l.p}-${l.q}`} d={path(l)} fill={h === 'triad' ? 'rgba(242,208,109,0.12)' : 'none'} stroke={stroke} strokeWidth={h ? 2.5 : 1} opacity={h ? 1 : 0.45} />; })}
        {[...pos].map(([g, [x, y]]) => { const inS = span?.has(g); const inT = tri && (g === tri[0] || g === tri[1] || g === tri[2]); return (
          <g key={g} onClick={() => select({ element: g }, true)} style={{ cursor: 'pointer' }}>
            <circle cx={x} cy={y} r={inT ? 9 : 7} fill={inT ? '#f2d06d' : inS ? '#6db3f2' : el === g ? '#e0873c' : '#262b34'} stroke="#8b93a1" />
            <text x={x} y={y - 12} fontSize={11} fill="#d8dde6" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">{labels[g]}</text>
          </g>); })}
      </svg>
      {tri && <div className="muted">Triad {tri.map((g) => labels[g]).join(', ')}: its three lines and the product line through {labels[tri[0] ^ tri[1]]}.</div>}
    </div>
  );
}
