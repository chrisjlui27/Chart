import { describe, it, expect } from 'vitest';
import { preset, SignAlgebra, facts, mul, basisVec, associator, normInf, clifford, tensor, isAssociative, isCommutative, identify, gradedIsomorphisms, pureTrace, REALS, CD, leakage, orthonormalRows, closure, randomVectors, inverse, unitVec, sub, exp } from '../src/index.js';
import mirror from '../../tests/fixtures/mirror.json';

describe('conventions', () => {
  it('reproduces Convention 2.1 Fano lines in O', () => {
    const O = preset('O') as SignAlgebra;
    for (const [g, h, k] of mirror.fanoLines) expect(O.mono(g, h)).toEqual({ g: k, s: 1 });
  });
  it("uses Wilmot's graded order (his eq. 20) for S", () => {
    const S = preset('S') as SignAlgebra;
    expect(S.gradedLabels().join(' ')).toBe('1 o1 o2 o12 o3 o13 o23 o123 o4 o14 o24 o124 o34 o134 o234 o1234');
    expect(S.parseLabel('o1234')).toBe(15);
    expect(S.parseLabel('o24')).toBe(10);
  });
  it('quaternions i j = k with k = o12', () => {
    const H = preset('H') as SignAlgebra;
    expect(H.mono(1, 2)).toEqual({ g: 3, s: 1 });
    expect(H.mono(2, 3)).toEqual({ g: 1, s: 1 });
    expect(H.mono(3, 1)).toEqual({ g: 2, s: 1 });
  });
  it('the founding octave of S\' carries the opposite product', () => {
    const Sp = preset("S'") as SignAlgebra;
    expect(Sp.mono(1, 2)).toEqual({ g: 3, s: -1 });
  });
});

describe('facts', () => {
  it('C, H associative; O alternative not associative; S flexible power-associative not alternative', () => {
    expect(facts(preset('C')).commutative).toBe(true);
    expect(facts(preset('H')).associative).toBe(true);
    expect(facts(preset('H')).commutative).toBe(false);
    const o = facts(preset('O'));
    expect(o.alternative).toBe(true);
    expect(o.associative).toBe(false);
    expect(o.composition).toBe(true);
    expect(o.moufang).toEqual({ left: true, right: true, middle: true });
    const s = facts(preset('S'));
    expect(s.flexible).toBe(true);
    expect(s.powerAssociative).toBe(true);
    expect(s.alternative).toBe(false);
    expect(s.composition).toBe(false);
    expect(s.quadratic).toBe(true);
    expect(s.moufang).toEqual({ left: false, right: false, middle: false });
  });
  it('Clifford algebras: Cl(0,2) ≅ H, Cl(2,0) ≅ split-H, Cl(3,0) associative', () => {
    expect(identify(clifford(0, 2))).toBe('H');
    expect(identify(clifford(2, 0))).toBe('split-H');
    expect(isAssociative(clifford(3, 0)).holds).toBe(true);
    expect(isAssociative(clifford(1, 3)).holds).toBe(true);
    expect(gradedIsomorphisms(clifford(0, 2), preset('H') as SignAlgebra, { limit: 1 }).isos.length).toBe(1);
  });
  it('tensor products: tessarines commutative associative, dual quaternions associative with nilpotents', () => {
    const tess = tensor(preset('C'), preset('C'));
    expect(isCommutative(tess).holds && isAssociative(tess).holds).toBe(true);
    const dq = preset('dualquaternions');
    expect(isAssociative(dq).holds).toBe(true);
    expect(facts(dq).squares?.zero).toBe(4);
  });
  it('split algebras have pure trace 1 (Wilmot Theorem 12)', () => {
    for (const name of ['splitC', 'splitH', 'A(0,3)', 'A(3,1)', 'A(0,4)', 'A(2,2)']) expect(pureTrace(preset(name) as SignAlgebra)).toBe(1);
    expect(pureTrace(preset('S') as SignAlgebra)).toBe(-15);
  });
  it('dual numbers: CD(R, 0) has a nilpotent generator', () => {
    const D = CD(REALS, 0);
    expect(D.square(1)).toBe(0);
  });
});

describe('element operations', () => {
  it('inverse and exp behave in H and O', () => {
    for (const name of ['H', 'O']) {
      const A = preset(name);
      const [x] = randomVectors(A.n, 1, 7);
      const xi = inverse(A, x)!;
      expect(normInf(sub(mul(A, x, xi), unitVec(A)))).toBeLessThan(1e-9);
      const e = exp(A, x);
      const em = exp(A, x.map((v) => -v));
      expect(normInf(sub(mul(A, e, em), unitVec(A)))).toBeLessThan(1e-8);
    }
  });
  it('associator vanishes in H and not in O', () => {
    const H = preset('H'), O = preset('O');
    expect(normInf(associator(H, basisVec(H, 1), basisVec(H, 2), basisVec(H, 3)))).toBe(0);
    expect(normInf(associator(O, basisVec(O, 1), basisVec(O, 2), basisVec(O, 4)))).toBe(2);
  });
});

describe('leakage', () => {
  it('is zero on subalgebras and positive on a tilted plane', () => {
    const O = preset('O');
    const H = orthonormalRows([basisVec(O, 0), basisVec(O, 1), basisVec(O, 2), basisVec(O, 3)]);
    expect(leakage(O, H)).toBeLessThan(1e-12);
    const tilted = orthonormalRows([basisVec(O, 0), basisVec(O, 1), basisVec(O, 2), basisVec(O, 3).map((v, i) => v + (i === 4 ? 0.5 : 0))]);
    expect(leakage(O, tilted)).toBeGreaterThan(1e-3);
    const cl = closure(O, [basisVec(O, 1), basisVec(O, 2)]);
    expect(cl.length).toBe(4);
  });
});
