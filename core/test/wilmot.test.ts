import { describe, it, expect } from 'vitest';
import { preset, SignAlgebra, enumerateTriads, summarize, subalgebraCensus, octaveTypeCounts, identifyOctave, zeroDivisorCount, zeroDivisorFormula, zeroDivisorTriads, cycleModeClasses, assocMono, moufangBits, triadType, wilmotSedenionGenerators, spanElements, identifyOctaveByIso, basisSubalgebra, octaveReferences, gradedIsomorphisms, verifyGradedIso, derivations } from '../src/index.js';
import W from '../../tests/fixtures/wilmot.json';

const nightly = !!process.env.HAV_NIGHTLY;
const maxIndex = nightly ? 5 : 4; // O, U1..U4 by default; U5 nightly

describe('Wilmot tables', () => {
  for (let i = 0; i <= maxIndex; i++) {
    const label = W.labels[i], name = W.presets[i];
    it(`Table 2, 4 for ${label}`, () => {
      const A = preset(name) as SignAlgebra;
      const s = summarize(A, enumerateTriads(A, { verify: A.n <= 32 }));
      expect(s.associative).toBe(W.table2.associative[i]);
      expect(s.nonCycles).toBe(W.table2.nonCycles[i]);
      expect(s.cycleTriads).toBe(W.table2.cycleTriads[i]);
      expect(s.triads).toBe(W.table2.total[i]);
      for (const [silo, col] of Object.entries(W.table4.silos)) expect(s.silos[silo] ?? 0, silo).toBe(col[i]);
      for (const [t, col] of Object.entries(W.table4.nonCycleTypes)) expect(s.nonCycleTypes[t as 'A'], t).toBe(col[i]);
      expect(Object.keys(s.silos).filter((k) => s.silos[k] > 0).every((k) => ['AAA', 'BBA', 'ACC', 'XBB', 'BXC', 'CAB', 'CCX', 'XXX'].includes(k))).toBe(true);
    });
    it(`Table 5 (natural-order type counts) for ${label}`, () => {
      const A = preset(name) as SignAlgebra;
      const c = subalgebraCensus(A);
      expect(c.H).toBe(W.table5.H[i]);
      expect(c.O).toBe(W.table5.O[i]);
      expect(c.P4).toBe(W.table5.P4[i]);
      expect(c.P12).toBe(W.table5.P12[i]);
      expect(c.P14).toBe(W.table5.P14[i]);
      expect(c.other).toBe(0);
      expect(c.P4 + c.P12 + c.P14).toBe(W.table5.totalPk[i]);
    });
    it(`Table 14 for ${label}`, () => {
      const A = preset(name) as SignAlgebra;
      const N = A.n - 1;
      expect(N).toBe(W.table14.pureBasis[i]);
      const s = summarize(A, enumerateTriads(A));
      expect(s.triads - s.associative).toBe(W.table14.nonAssociativeTriads[i]);
      expect((s.triads - s.associative) / 28).toBe(W.table14.factor28[i]);
      const Z = zeroDivisorCount(A);
      expect(Z).toBe(W.table14.zeroDivisors[i]);
      expect(zeroDivisorFormula(N)).toBe(W.table14.zeroDivisors[i]);
      expect(Z / 84).toBe(W.table14.factor84[i]);
    });
  }
  it('Theorem 8: S_{m+1} = 7 (O_m + S_m) across the tabulated levels', () => {
    for (let i = 0; i < W.labels.length - 1; i++) expect(W.table5.totalPk[i + 1]).toBe(7 * (W.table5.O[i] + W.table5.totalPk[i]));
  });
  it('split algebras: Table 14 zero divisors (A(0,3), A(3,1), A(0,4)) and isomorphic split sedenions', () => {
    for (const [name, row] of Object.entries(W.table14.split)) {
      const A = preset(name) as SignAlgebra;
      expect(A.n - 1).toBe(row.pureBasis);
      expect(zeroDivisorCount(A)).toBe(row.zeroDivisors);
    }
    expect(zeroDivisorCount(preset('A(2,2)') as SignAlgebra)).toBe(180);
    expect(zeroDivisorCount(preset('A(1,3)') as SignAlgebra)).toBe(180);
  });
});

describe('Wilmot triad structure in S and T', () => {
  const S = preset('S') as SignAlgebra;
  it('type counts implied by Table 4', () => {
    const s = summarize(S, enumerateTriads(S));
    expect(s.associative).toBe(W.sedenionTypes.S.associative);
    expect(s.types).toEqual({ A: W.sedenionTypes.S.A, B: W.sedenionTypes.S.B, C: W.sedenionTypes.S.C, X: W.sedenionTypes.S.X });
    const T = preset('T') as SignAlgebra;
    const t = summarize(T, enumerateTriads(T));
    expect(t.types).toEqual({ A: W.sedenionTypes.T.A, B: W.sedenionTypes.T.B, C: W.sedenionTypes.T.C, X: W.sedenionTypes.T.X });
  });
  it('Table 3 examples: A and X types with their signed associators', () => {
    const fmt = (x: number, y: number, z: number) => { const a = assocMono(S, x, y, z); return a.s === 0 ? '0' : `${a.s * 2}${S.gradedLabel(a.g)}`; };
    const [b, c, d] = W.table3.A.triad; // (o1, o34, o2) as written in the paper's Type 1 slot
    expect(fmt(b, c, d)).toBe(W.table3.A.type1);
    expect(fmt(1, 2, 12)).toBe(W.table3.A.type2);
    expect(fmt(2, 1, 12)).toBe(W.table3.A.type3);
    expect(triadType(S, 1, 2, 12)).toBe('A');
    expect(fmt(1, 8, 2)).toBe(W.table3.X.type1);
    expect(fmt(1, 2, 8)).toBe(W.table3.X.type2);
    expect(fmt(2, 1, 8)).toBe(W.table3.X.type3);
    expect(triadType(S, 1, 2, 8)).toBe('X');
    expect(fmt(1, 2, 4)).toBe('2o123');
    expect(triadType(S, 1, 10, 12)).toBe('C');
  });
  it('Theorem 6: Moufang identities correspond to types (B or X, C or X, Malcev-dependent)', () => {
    const T = preset('T') as SignAlgebra;
    const tt = enumerateTriads(T);
    for (let i = 0; i < tt.count; i += 7) {
      if (tt.kind[i] === 0) continue;
      const b = tt.b[i], c = tt.c[i], d = tt.d[i];
      const t = triadType(T, b, c, d);
      const m = moufangBits(T, b, c, d);
      expect(m.m1, `M1 at ${b},${c},${d} type ${t}`).toBe(t === 'B' || t === 'X');
      expect(m.m2, `M2 at ${b},${c},${d} type ${t}`).toBe(t === 'C' || t === 'X');
      if (m.malcev) expect(m.m3 === (t === 'B' || t === 'X') || m.m3 === (t === 'A' || t === 'C')).toBe(true);
    }
  });
  it('the eight octonion and seven P4 copies of S are generated by the listed triads; the P4 copies are M(H)', () => {
    const gens = wilmotSedenionGenerators();
    for (const g of gens.O) expect(identifyOctave(octaveTypeCounts(S, g))).toBe('O');
    for (const g of gens.P4) expect(identifyOctave(octaveTypeCounts(S, g))).toBe('P4');
    for (const g of gens.P4) expect(identifyOctaveByIso(basisSubalgebra(S, g).induced)).toBe('P4');
    expect(gradedIsomorphisms(basisSubalgebra(S, gens.P4[0]).induced, preset('M(H)') as SignAlgebra, { limit: 1 }).isos.length).toBe(1);
    // Table 6 signatures
    expect(octaveTypeCounts(S, gens.P4[0])).toMatchObject(W.table6.P4);
    expect(octaveTypeCounts(S, gens.O[0])).toMatchObject(W.table6.O);
  });
  it('seven cycle/mode classes of zero divisors in S (Table 9 primaries)', () => {
    const zt = zeroDivisorTriads(S);
    expect(zt.every((z) => z.type === 'A')).toBe(true);
    const cls = cycleModeClasses(S, zt);
    expect(cls.count).toBe(W.sedenionPrimaries.classes);
    for (const [b, c, d] of W.sedenionPrimaries.triads) expect(zt.some((z) => z.b === b && z.c === c && z.d === d)).toBe(true);
    // all four modes hold for every AAA zero divisor of S
    expect(zt.every((z) => z.modes.dual && z.modes.extended && z.modes.extendedDual)).toBe(true);
    // Wilmot's example (o1 − o1234)(o2 + o34) = 0: a = -o1234 for (b,c,d) = (o1, o2, o34)
    const ex = zt.find((z) => z.b === 1 && z.c === 2 && z.d === 12)!;
    expect(ex.a).toBe(15);
    expect(ex.sa).toBe(-1);
  });
  it('P12 and P14 reference subalgebras are graded-isomorphic to P4 = M(H) (engine finding; see docs)', () => {
    const refs = Object.fromEntries(octaveReferences().map((r) => [r.kind, r.alg]));
    for (const k of ['P12', 'P14'] as const) {
      const r = gradedIsomorphisms(refs[k], refs.P4, { limit: 1 });
      expect(r.isos.length).toBe(1);
      expect(verifyGradedIso(refs[k], refs.P4, r.isos[0])).toBe(true);
      expect(derivations(refs[k]).length).toBe(6);
      expect(zeroDivisorCount(refs[k])).toBe(12);
    }
    expect(gradedIsomorphisms(refs.O, refs.P4, { limit: 1 }).isos.length).toBe(0);
  });
});
