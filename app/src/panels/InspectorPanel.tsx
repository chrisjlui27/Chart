import { useState } from 'react';
import { inspectPoint, formatElement, parseElement, SignAlgebra } from '@hav/core';
import { useStore, setState } from '../state/store';
import { getAlgebra, labelsFor } from '../algebra';

export function InspectorPanel() {
  const preset = useStore((s) => s.preset);
  const notation = useStore((s) => s.notation);
  const inspect = useStore((s) => s.inspect);
  const [text, setText] = useState('o1 + e10');
  const [error, setError] = useState('');
  const A = getAlgebra(preset);
  const labels = labelsFor(A, notation);
  const x = inspect && inspect.length === A.n ? Float64Array.from(inspect) : null;
  const info = x ? (inspectPoint(A as SignAlgebra, x) as { N: number; dimAnn?: number; stretch?: { value: number; mult: number }[]; kerAltDim?: number; paper?: { a0: number; aImag: number; b: number; bPar: number; zeroDivisorConditionMirror: boolean; aPerpB: boolean } }) : null;
  return (
    <div className="panel">
      <div className="row"><input className="mono" style={{ width: 200 }} value={text} onChange={(e) => setText(e.target.value)} /><button onClick={() => { try { setState({ inspect: Array.from(parseElement(A as SignAlgebra, text)) }); setError(''); } catch (e) { setError((e as Error).message); } }}>inspect</button>{error && <span className="no">{error}</span>}</div>
      {!x && <div className="muted">Click a point in the canvas, or type an element.</div>}
      {x && info && (
        <div className="kv">
          <span className="muted">x</span><span className="mono">{formatElement(A, x, labels)}</span>
          <span className="muted">N(x)</span><span>{info.N.toFixed(6)}</span>
          {info.dimAnn !== undefined && <><span className="muted">dim Ann(x)</span><span className={info.dimAnn > 0 ? 'ok' : ''}>{info.dimAnn}{info.dimAnn > 0 ? ' — zero divisor' : ''}</span></>}
          {info.kerAltDim !== undefined && <><span className="muted">dim ker alt_x</span><span>{info.kerAltDim}</span></>}
          {info.stretch && <><span className="muted">stretch spectrum</span><span className="mono">{info.stretch.map((l) => `${l.value.toFixed(4)}×${l.mult}`).join('  ')} ({info.stretch.length} levels)</span></>}
          {info.paper && <>
            <span className="muted">a₀ = Re a</span><span>{info.paper.a0.toFixed(6)}</span>
            <span className="muted">|a′| = |Im a|</span><span>{info.paper.aImag.toFixed(6)}</span>
            <span className="muted">|b|</span><span>{info.paper.b.toFixed(6)}</span>
            <span className="muted">|b∥| (projection of b on C_a)</span><span>{Number.isFinite(info.paper.bPar) ? info.paper.bPar.toFixed(6) : '—'}</span>
            <span className="muted">Re a = 0 and |a| = |b|</span><span className={info.paper.zeroDivisorConditionMirror ? 'ok' : 'no'}>{info.paper.zeroDivisorConditionMirror ? 'yes (dead set of S′)' : 'no'}</span>
            <span className="muted">a ⊥ b</span><span className={info.paper.aPerpB ? 'ok' : 'no'}>{info.paper.aPerpB ? 'yes' : 'no'}{info.paper.aPerpB && info.paper.zeroDivisorConditionMirror ? ' (dead set of S too)' : ''}</span>
          </>}
        </div>
      )}
    </div>
  );
}
