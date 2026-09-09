import { useState } from 'react';
import { useStore } from '../state/store';
import { useEngine } from '../engine/client';
import { getAlgebra, asSign } from '../algebra';

type Bales = { name: string; balesName: string | null; admissible: boolean; classOverO: string; compositionHyperplanes: number; dimDer: number }[];
type Tree = { word: string; dim: number; isoClass: number; dimDer: number; octaves: { O: number; P4: number; other: number } }[];
type Sign = { configurations: number; cosets: number; classes: { isS: boolean; isSprime: boolean; dimDer: number; size: number; bits: number; octaves: number }[] };
type Oct = { composition: number; throughPoint: number; avoidingPoint: number; hyperplanes: { basis: number[]; composition: boolean; containsPoint: boolean }[] };

export function CensusPanel() {
  const preset = useStore((s) => s.preset);
  const A = getAlgebra(preset);
  const S = asSign(A);
  const [runBales, setRunBales] = useState(false);
  const [treeDepth, setTreeDepth] = useState(0);
  const [runSign, setRunSign] = useState(false);
  const bales = useEngine<Bales>('bales', [], runBales);
  const tree = useEngine<Tree>('tree', [treeDepth, 'O'], treeDepth > 0);
  const sign = useEngine<Sign>('signCensus', [], runSign);
  const oct = useEngine<Oct>('octaveConfig', [preset], !!S && S.m === 4);
  return (
    <div className="panel">
      <h3>Octave configuration of {A.name}</h3>
      {S && S.m === 4 ? (oct.data ? <div>{oct.data.composition} of the 15 basis hyperplanes are composition (octonion) algebras: {oct.data.throughPoint} through the doubling point ℓ = e8, {oct.data.avoidingPoint} avoiding it.</div> : <div className="muted">computing…</div>) : <div className="muted">select a 16-dimensional preset</div>}
      <h3>Bales's 32 doubling formulas over O</h3>
      {!runBales && <button onClick={() => setRunBales(true)}>run (≈ 6 s)</button>}
      {bales.loading && <div className="muted">running…</div>}
      {bales.data && (
        <table className="grid"><thead><tr><th>Bales</th><th>formula</th><th>admissible</th><th>over O</th><th>octaves</th><th>dim Der</th></tr></thead>
          <tbody>{bales.data.map((r) => <tr key={r.name}><td>{r.balesName ?? ''}</td><td className="mono">{r.name}</td><td>{r.admissible ? '✓' : ''}</td><td>{r.classOverO}</td><td>{r.compositionHyperplanes}</td><td>{r.dimDer}</td></tr>)}</tbody></table>
      )}
      <h3>Orientation tree: words in {'{CD, M}'} over O</h3>
      <div className="row"><button className={treeDepth === 2 ? 'active' : ''} onClick={() => setTreeDepth(2)}>depth 2 (dim 32, ≈ 10 s)</button><button className={treeDepth === 3 ? 'active' : ''} onClick={() => setTreeDepth(3)}>depth 3 (dim 64, slower)</button></div>
      {tree.loading && <div className="muted">building…</div>}
      {tree.data && (
        <table className="grid"><thead><tr><th>word</th><th>dim</th><th>graded-iso class</th><th>dim Der</th><th>basis octaves</th></tr></thead>
          <tbody>{tree.data.map((r) => <tr key={r.word}><td className="mono">{r.word}</td><td>{r.dim}</td><td>{r.isoClass}</td><td>{r.dimDer < 0 ? '—' : r.dimDer}</td><td>{r.octaves.O} O + {r.octaves.P4} M(H){r.octaves.other ? ` + ${r.octaves.other} other` : ''}</td></tr>)}</tbody></table>
      )}
      <h3>Sign-function census on F2⁴ (Question 2)</h3>
      <div className="muted">Sign functions with every basis line a quaternion algebra and the standard founding octave; classes with eight octonion hyperplanes up to graded isomorphism.</div>
      {!runSign && <button onClick={() => setRunSign(true)}>run (≈ 25 s)</button>}
      {sign.loading && <div className="muted">running…</div>}
      {sign.data && (
        <div>
          <div>{sign.data.configurations} configurations with eight octaves (none with nine), {sign.data.cosets} cosets modulo sign changes, {sign.data.classes.length} graded-isomorphism classes:</div>
          <table className="grid"><thead><tr><th>class</th><th>octaves</th><th>dim Der</th><th>configurations</th><th>representative bits</th></tr></thead>
            <tbody>{sign.data.classes.map((c) => <tr key={c.bits}><td>{c.isS ? 'S' : c.isSprime ? "S'" : 'third algebra'}</td><td>{c.octaves}</td><td>{c.dimDer}</td><td>{c.size}</td><td className="mono">{c.bits}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
}
