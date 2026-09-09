import { useEffect, useRef, useState } from 'react';
import { useStore, select, setState } from '../state/store';
import { getAlgebra, asSign, labelsFor, inSpan } from '../algebra';
import { spanElements, triadType, SignAlgebra } from '@hav/core';

const COLORS = { plus: '#4f8fd6', minus: '#e0873c', zero: '#2a2f38', sel: '#f2d06d', chi: '#ff4d6d', block: 'rgba(242,208,109,0.25)' };
const TYPE_COLORS: Record<string, string> = { A: '#e05c5c', B: '#7ccf5f', C: '#5fa8e0', X: '#b07ce0', assoc: '#3a3f48' };

export function TablePanel() {
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const selection = useStore((s) => s.selection);
  const overlay = useStore((s) => s.overlay);
  const gridD = useStore((s) => s.gridD);
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<string>('');
  const [size, setSize] = useState(0);
  const A = getAlgebra(preset);
  const S = asSign(A);
  const n = A.n;
  const labels = labelsFor(A, notation);
  const cell = Math.max(3, Math.min(22, Math.floor(1100 / (n + 1))));
  const margin = n <= 32 ? 48 : 12;
  const ref16 = overlay === 'chi' && n === 16 ? asSign(getAlgebra(preset === 'S' ? "S'" : 'S')) : null;

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const W = margin + n * cell + 2;
    cv.width = W; cv.height = W; setSize(W);
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#14171c'; ctx.fillRect(0, 0, W, W);
    const span = selection.basis ? new Set(spanElements(selection.basis)) : null;
    const triadCells = new Set<string>();
    if (selection.triad) {
      const [b, c, d] = selection.triad;
      triadCells.add(`${b},${c}`); triadCells.add(`${b ^ c},${d}`); triadCells.add(`${c},${d}`); triadCells.add(`${b},${c ^ d}`);
    }
    for (let g = 0; g < n; g++) for (let h = 0; h < n; h++) {
      const m = A.mono(g, h);
      let color = m.s > 0 ? COLORS.plus : m.s < 0 ? COLORS.minus : COLORS.zero;
      if (overlay === 'types' && S && g > 0 && h > 0 && g !== h && g !== gridD && h !== gridD && gridD > 0) {
        const [b, c] = g < h ? [g, h] : [h, g];
        const d = gridD;
        const sorted = [b, c, d].sort((x, y) => x - y) as [number, number, number];
        color = TYPE_COLORS[triadType(S, sorted[0], sorted[1], sorted[2])];
      }
      ctx.fillStyle = color;
      ctx.fillRect(margin + h * cell, margin + g * cell, cell - 1, cell - 1);
      if (ref16 && ref16.F(g, h) !== (S as SignAlgebra).F(g, h)) { ctx.fillStyle = COLORS.chi; ctx.fillRect(margin + h * cell + 2, margin + g * cell + 2, Math.max(1, cell - 5), Math.max(1, cell - 5)); }
      if (span && span.has(g) && span.has(h)) { ctx.fillStyle = COLORS.block; ctx.fillRect(margin + h * cell, margin + g * cell, cell - 1, cell - 1); }
      if (triadCells.has(`${g},${h}`)) { ctx.strokeStyle = COLORS.sel; ctx.lineWidth = 2; ctx.strokeRect(margin + h * cell + 1, margin + g * cell + 1, cell - 3, cell - 3); }
      if (selection.cell && selection.cell[0] === g && selection.cell[1] === h) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(margin + h * cell + 1, margin + g * cell + 1, cell - 3, cell - 3); }
    }
    if (n <= 32) {
      ctx.fillStyle = '#8b93a1'; ctx.font = `${Math.min(11, cell)}px ui-monospace, Menlo, monospace`; ctx.textAlign = 'right';
      for (let g = 0; g < n; g++) { ctx.fillText(labels[g], margin - 4, margin + g * cell + cell * 0.75); }
      ctx.save(); ctx.translate(0, 0); ctx.textAlign = 'left';
      for (let h = 0; h < n; h++) { ctx.save(); ctx.translate(margin + h * cell + cell * 0.7, margin - 4); ctx.rotate(-Math.PI / 2); ctx.fillText(labels[h], 0, 0); ctx.restore(); }
      ctx.restore();
    }
  }, [preset, notation, selection, overlay, gridD, cell, margin, n]);

  const locate = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const h = Math.floor((e.clientX - r.left - margin) / cell), g = Math.floor((e.clientY - r.top - margin) / cell);
    return g >= 0 && h >= 0 && g < n && h < n ? [g, h] as [number, number] : null;
  };
  return (
    <div className="panel">
      <div className="row">
        <span className="muted">{A.name}: {n} × {n}</span>
        <button className={overlay === 'none' ? 'active' : ''} onClick={() => setState({ overlay: 'none' })}>signs</button>
        {n === 16 && <button className={overlay === 'chi' ? 'active' : ''} onClick={() => setState({ overlay: 'chi' })} title="cells where the sign differs from S (or from S' when S is set)">χ overlay</button>}
        {S && <button className={overlay === 'types' ? 'active' : ''} onClick={() => setState({ overlay: 'types' })} title="colour cell (b,c) by the type of the triad (b, c, d) for the fixed d">triad types</button>}
        {overlay === 'types' && S && <label>d = <select value={gridD} onChange={(e) => setState({ gridD: Number(e.target.value) })}>{labels.slice(1).map((l, i) => <option key={i + 1} value={i + 1}>{l}</option>)}</select></label>}
        <span className="legend"><span><i className="swatch" style={{ background: COLORS.plus }} />+</span><span><i className="swatch" style={{ background: COLORS.minus }} />−</span><span><i className="swatch" style={{ background: COLORS.zero }} />0</span>{overlay === 'types' && <><span><i className="swatch" style={{ background: TYPE_COLORS.A }} />A</span><span><i className="swatch" style={{ background: TYPE_COLORS.B }} />B</span><span><i className="swatch" style={{ background: TYPE_COLORS.C }} />C</span><span><i className="swatch" style={{ background: TYPE_COLORS.X }} />X</span></>}</span>
      </div>
      <div className="mono" style={{ minHeight: 18 }}>{hover}</div>
      <canvas ref={ref} className="table" style={{ width: size, height: size }}
        onMouseMove={(e) => { const p = locate(e); if (!p) { setHover(''); return; } const m = A.mono(p[0], p[1]); const prod = m.s === 0 ? '0' : `${m.s < 0 ? '−' : ''}${labels[m.g]}`; let extra = ''; if (S && overlay === 'types' && p[0] > 0 && p[1] > 0 && p[0] !== p[1] && p[0] !== gridD && p[1] !== gridD) { const s = [p[0], p[1], gridD].sort((x, y) => x - y) as [number, number, number]; extra = `   triad (${s.map((i) => labels[i]).join(', ')}): type ${triadType(S, ...s)}`; } setHover(`${labels[p[0]]} · ${labels[p[1]]} = ${prod}${extra}`); }}
        onClick={(e) => { const p = locate(e); if (p) select({ cell: p, element: p[0] }, true); }} />
      {selection.basis && <div className="muted">Highlighted block: subalgebra spanned by {selection.basis.map((g) => labels[g]).join(', ')} ({spanElements(selection.basis).length} basis elements){inSpan(selection.basis, 0) ? '' : ''}</div>}
    </div>
  );
}
