import { useState } from 'react';
import { useStore, setState, select } from '../state/store';
import { FAMILIES, getAlgebra } from '../algebra';

export function SetPanel() {
  const preset = useStore((s) => s.preset);
  const [custom, setCustom] = useState('word:CD.CD.CD.M');
  const [error, setError] = useState('');
  const choose = (id: string) => {
    try { getAlgebra(id); setError(''); setState({ preset: id }); select({}); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="panel">
      {FAMILIES.map((f) => (
        <div className="family" key={f.name}>
          <h3>{f.name}</h3>
          {f.presets.map((p) => (
            <button key={p.id} className={`preset-btn ${preset === p.id ? 'active' : ''}`} title={p.note} onClick={() => choose(p.id)}>{p.id}{p.note ? <span className="muted"> · {p.note}</span> : null}</button>
          ))}
        </div>
      ))}
      <h3>Custom</h3>
      <div className="row">
        <input className="mono" style={{ width: 260 }} value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button onClick={() => choose(custom)}>Set</button>
      </div>
      <div className="muted">Forms: <span className="mono">word:CD.CD.M.CD</span> (steps applied to R; steps CD, M, CDsplit, CDdual, P0…P3T), <span className="mono">A(q,p)</span>, <span className="mono">Cl(p,q,r)</span>, <span className="mono">Bales#k</span> (k = 0…31), <span className="mono">U5</span>.</div>
      {error && <div className="no">{error}</div>}
    </div>
  );
}
