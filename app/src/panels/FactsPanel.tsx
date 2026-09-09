import { useStore } from '../state/store';
import { useEngine } from '../engine/client';
import { getAlgebra, asSign } from '../algebra';
import { SILOS } from '@hav/core';

type Summary = { triads: number; associative: number; nonCycles: number; cycleTriads: number; types: Record<string, number>; nonCycleTypes: Record<string, number>; silos: Record<string, number>; census: { H: number; O: number; P4: number; P12: number; P14: number; other: number } | null; zeroDivisors: number; formula: number };
type Facts = { facts: Record<string, unknown> & { moufang: Record<string, boolean>; squares?: { plus: number; minus: number; zero: number } }; identify: string; lines: { lines: number; H: number; oriented: number; anti: number; notH: number }; pureTrace: number };

const B = ({ v }: { v: unknown }) => <span className={v ? 'ok' : 'no'}>{v ? 'yes' : 'no'}</span>;

export function FactsPanel() {
  const preset = useStore((s) => s.preset);
  const A = getAlgebra(preset);
  const S = asSign(A);
  const f = useEngine<Facts>('facts', [preset]);
  const s = useEngine<Summary>('summary', [preset], !!S && S.m >= 1 && A.n <= 256);
  const d = useEngine<{ dim: number | null; killing: { plus: number; minus: number; zero: number } | null; note?: string }>('der', [preset], A.n <= 64);
  const g = useEngine<{ order: number; sigmas: number }>('gaut', [preset], !!S && S.m <= 4);
  const keys = ['commutative', 'associative', 'alternative', 'flexible', 'powerAssociative', 'quadratic', 'composition', 'adjoint', 'scalarNorm', 'jordan'];
  return (
    <div className="panel">
      <h3>{A.name} · dimension {A.n}</h3>
      {f.data ? (
        <div className="kv">
          <span className="muted">identified as</span><span>{f.data.identify}</span>
          {keys.map((k) => <><span className="muted" key={k + 'k'}>{k}</span><span key={k}><B v={f.data!.facts[k]} /></span></>)}
          <span className="muted">Moufang (left, right, middle)</span><span><B v={f.data.facts.moufang.left} /> <B v={f.data.facts.moufang.right} /> <B v={f.data.facts.moufang.middle} /></span>
          <span className="muted">basis squares (+, −, 0)</span><span>{f.data.facts.squares?.plus}, {f.data.facts.squares?.minus}, {f.data.facts.squares?.zero} · pure trace {f.data.pureTrace}</span>
          <span className="muted">basis lines</span><span>{f.data.lines.lines} lines, {f.data.lines.H} ≅ H ({f.data.lines.oriented} oriented, {f.data.lines.anti} anti), {f.data.lines.notH} not H</span>
          <span className="muted">dim Der</span><span>{d.loading ? 'computing…' : d.data?.dim ?? d.data?.note ?? '—'}{d.data?.killing ? ` · Killing form (${d.data.killing.plus}+, ${d.data.killing.minus}−, ${d.data.killing.zero} 0)${d.data.killing.minus === 14 && d.data.killing.plus === 0 ? ' = g2' : ''}` : ''}</span>
          {S && S.m <= 4 && <><span className="muted">graded automorphisms</span><span>{g.loading ? 'computing…' : g.data ? `${g.data.order} (${g.data.sigmas} permutation parts)` : '—'}</span></>}
        </div>
      ) : <div className="muted">computing…</div>}
      {S && S.m >= 1 && (
        <>
          <h3>Wilmot tables</h3>
          {s.loading && <div className="muted">enumerating triads…</div>}
          {s.data && (
            <div className="kv">
              <span className="muted">Table 2</span><span>{s.data.triads} triads: {s.data.associative} associative, {s.data.nonCycles} non-cycles, {s.data.cycleTriads} in 3-triad cycles</span>
              <span className="muted">types</span><span><span className="type-A">A {s.data.types.A}</span> · <span className="type-B">B {s.data.types.B}</span> · <span className="type-C">C {s.data.types.C}</span> · <span className="type-X">X {s.data.types.X}</span></span>
              <span className="muted">Table 4 silos</span><span>{SILOS.map((k) => `${k} ${s.data!.silos[k] ?? 0}`).join(' · ')}</span>
              <span className="muted">non-cycle types</span><span>A {s.data.nonCycleTypes.A} · B {s.data.nonCycleTypes.B} · C {s.data.nonCycleTypes.C} · X {s.data.nonCycleTypes.X}</span>
              {s.data.census && <><span className="muted">Table 5</span><span>H {s.data.census.H} · O {s.data.census.O} · P4 {s.data.census.P4} · P12 {s.data.census.P12} · P14 {s.data.census.P14}{s.data.census.other ? ` · other ${s.data.census.other}` : ''}</span></>}
              <span className="muted">Table 14</span><span>{s.data.triads - s.data.associative} non-associative triads (28-factor {(s.data.triads - s.data.associative) / 28}) · {s.data.zeroDivisors} zero-divisor pairs (formula {s.data.formula}, 84-factor {s.data.zeroDivisors / 84})</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
