import { describe, it, expect } from 'vitest';
import { preset, SignAlgebra, facts, derivations, BALES, double, gradedIsomorphisms, gradedAutomorphismOrder, verifyGradedIso, octaveConfiguration, twoTermZeroDivisorElements, zeroDivisorPartitions, signRatio, orientationBit, isCocycle, associatorFunction, balesCensus, basisSubalgebra, hyperplanes, tower, REALS, stretchSpectrum, annihilatorDim, randomVectors, orientationTree, identify, killingSignature, isDerivation, type TowerStep } from '../src/index.js';
import Mx from '../../tests/fixtures/mirror.json';

const S = () => preset('S') as SignAlgebra;
const Sp = () => preset("S'") as SignAlgebra;
const O = () => preset('O') as SignAlgebra;

describe('mirror sedenions: construction', () => {
  it('identities of S, S\' and M(H)', () => {
    for (const [name, want] of Object.entries(Mx.identities)) {
      const f = facts(preset(name));
      for (const [k, v] of Object.entries(want)) expect((f as unknown as Record<string, boolean>)[k], `${name}.${k}`).toBe(v);
    }
  });
  it('the sign functions differ by the orientation bit chi, which is not a 2-cocycle', () => {
    const chi = signRatio(S(), Sp());
    expect(Array.from(chi)).toEqual(Array.from(orientationBit(16)));
    expect(isCocycle(chi, 16)).toBe(false);
    expect(isCocycle(S().sgn, 16)).toBe(false); // F itself is not a cocycle either (non-associative)
  });
  it('associator function phi = dF is +1 on 168 of 420 triples and not trilinear, for both', () => {
    for (const A of [S(), Sp()]) expect(associatorFunction(A)).toEqual(Mx.associatorFunction);
  });
  it('dim Der', () => {
    for (const [name, d] of Object.entries(Mx.dimDer)) expect(derivations(preset(name)).length, name).toBe(d);
  });
  it('Der(S\') is a 14-dimensional compact simple Lie algebra (negative definite Killing form: g2)', () => {
    const D = derivations(Sp());
    expect(D.every((M) => isDerivation(Sp(), M, 1e-7))).toBe(true);
    const sig = killingSignature(D, 16);
    expect(sig).toEqual({ plus: 0, minus: 14, zero: 0 });
  });
});

describe('mirror sedenions: Bales and words', () => {
  it('Theorem 3.6: the eight products over O give exactly S and S\'', () => {
    for (const [cls, names] of Object.entries(Mx.balesClasses)) {
      const target = cls === 'S' ? S() : Sp();
      const other = cls === 'S' ? Sp() : S();
      for (const nm of names) {
        const A = double(O(), BALES[nm], { name: nm }) as SignAlgebra;
        const r = gradedIsomorphisms(A, target, { limit: 1 });
        expect(r.isos.length, `${nm} -> ${cls}`).toBe(1);
        expect(verifyGradedIso(A, target, r.isos[0])).toBe(true);
        expect(gradedIsomorphisms(A, other, { limit: 1 }).isos.length, `${nm} not -> other`).toBe(0);
      }
    }
  });
  it('the 32-formula census: 4 + 4 + 24, with 20 only-founding-octave and 4 eight-octave rejects, all dim Der 14; 8 admissible', () => {
    const rows = balesCensus();
    expect(rows.length).toBe(32);
    const toS = rows.filter((r) => r.classOverO === 'S'), toSp = rows.filter((r) => r.classOverO === "S'"), other = rows.filter((r) => r.classOverO === 'other');
    expect([toS.length, toSp.length, other.length]).toEqual([Mx.balesCensus.toS, Mx.balesCensus.toSprime, Mx.balesCensus.other]);
    expect(other.filter((r) => r.compositionHyperplanes === 1).length).toBe(Mx.balesCensus.otherWithOnlyFoundingOctave);
    expect(other.filter((r) => r.compositionHyperplanes === 8).length).toBe(Mx.balesCensus.otherWithEightOctaves);
    expect(other.every((r) => r.dimDer === Mx.balesCensus.otherDimDer)).toBe(true);
    expect(rows.filter((r) => r.balesName !== null).every((r) => r.classOverO !== 'other')).toBe(true);
    expect(rows.filter((r) => r.admissible).map((r) => r.balesName).sort()).toEqual(Object.keys(BALES).sort());
  });
  it('the four words in {CD, M} at dimension 16 give S (twice), S\' and M(M(H))', () => {
    for (const [word, want] of Object.entries(Mx.wordsAtDim16)) {
      const A = tower(REALS, word.split('.') as TowerStep[]) as SignAlgebra;
      const isS = gradedIsomorphisms(A, S(), { limit: 1 }).isos.length > 0;
      const isSp = gradedIsomorphisms(A, Sp(), { limit: 1 }).isos.length > 0;
      expect(want === 'S' ? isS : want === "S'" ? isSp : !isS && !isSp, word).toBe(true);
    }
    expect(identify(preset('CD(M(H))'))).toBe('S');
  });
  it('orientation tree over O to dimension 32: four words, classes and Der dimensions', () => {
    const nodes = orientationTree(2, O(), { withDer: true });
    expect(nodes.length).toBe(4);
    const byWord = Object.fromEntries(nodes.map((n) => [n.word.join('.'), n]));
    expect(byWord['CD.CD'].dimDer).toBe(14); // T
    expect(byWord['CD.M'].dimDer).toBe(14); // M(S)
    expect(byWord['M.CD'].dimDer).toBe(14); // CD(S')
    expect(new Set(nodes.map((n) => n.isoClass)).size).toBeGreaterThanOrEqual(3);
  });
  it.skipIf(!process.env.HAV_NIGHTLY)('orientation tree over O to dimension 64 (nightly)', () => {
    const nodes = orientationTree(3, O(), { withDer: true });
    expect(nodes.length).toBe(8);
    expect(nodes.find((n) => n.word.join('.') === 'CD.CD.CD')!.dimDer).toBe(14);
  });
});

describe('mirror sedenions: structure', () => {
  it('Theorem 6.1: octave configurations through/avoiding the doubling point', () => {
    expect(octaveConfiguration(S())).toMatchObject(Mx.octaves.S);
    expect(octaveConfiguration(Sp())).toMatchObject(Mx.octaves["S'"]);
  });
  it('Proposition 5.4: 84 / 112 two-term zero divisors and 336 ordered annihilating pairs in both', () => {
    expect(twoTermZeroDivisorElements(S()).length).toBe(Mx.twoTermZeroDivisors.S);
    expect(twoTermZeroDivisorElements(Sp()).length).toBe(Mx.twoTermZeroDivisors["S'"]);
    expect(zeroDivisorPartitions(S()).orderedElementPairs).toBe(Mx.orderedTwoTermPairs.S);
    expect(zeroDivisorPartitions(Sp()).orderedElementPairs).toBe(Mx.orderedTwoTermPairs["S'"]);
    // the two-term zero divisors of S' are exactly e_i ± e_j with 1<=i<=7, 8<=j<=15
    const els = twoTermZeroDivisorElements(Sp());
    expect(els.every((e) => e.p >= 1 && e.p <= 7 && e.q >= 8)).toBe(true);
    // and for S the pairs with j != i+8 and j != 8
    const elsS = twoTermZeroDivisorElements(S());
    expect(elsS.every((e) => e.p >= 1 && e.p <= 7 && e.q >= 9 && e.q !== e.p + 8)).toBe(true);
  });
  it('Proposition 7.4: graded automorphism groups of order 2688 = 168·16; no graded isomorphism S -> S\'', () => {
    expect(gradedAutomorphismOrder(S())).toEqual({ order: Mx.gradedAutomorphismOrder.S, sigmas: Mx.gradedAutomorphismOrder.sigmas });
    expect(gradedAutomorphismOrder(Sp())).toEqual({ order: Mx.gradedAutomorphismOrder["S'"], sigmas: Mx.gradedAutomorphismOrder.sigmas });
    expect(gradedIsomorphisms(S(), Sp(), { limit: 1 }).isos.length).toBe(0);
  });
  it('Theorem 3.3 / Cor 3.4: S\' is the hyperplane S_gamma of T spanned by e0..e7, e24..e31; the 31 hyperplanes split 16 S + 1 S\' + 14 other', () => {
    const T = preset('T') as SignAlgebra;
    const Sg = basisSubalgebra(T, Mx.sGammaBasis);
    expect(Sg.elements).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 24, 25, 26, 27, 28, 29, 30, 31]);
    expect(gradedIsomorphisms(Sg.induced, Sp(), { limit: 1 }).isos.length).toBe(1);
    expect(gradedIsomorphisms(Sg.induced, S(), { limit: 1 }).isos.length).toBe(0);
    let s = 0, sp = 0, other = 0;
    for (const h of hyperplanes(5)) {
      const B = basisSubalgebra(T, h).induced;
      if (gradedIsomorphisms(B, S(), { limit: 1 }).isos.length) s++;
      else if (gradedIsomorphisms(B, Sp(), { limit: 1 }).isos.length) sp++;
      else other++;
    }
    expect({ S: s, "S'": sp, other }).toEqual(Mx.hyperplanesOfT);
  });
  it('Theorem 4.1 / Remark 4.2: stretch spectrum has 5 levels (2,4,4,4,2) on S\' and 3 levels (4,8,4) on S', () => {
    const [a, b] = randomVectors(8, 2, 42);
    const mk = (a: Float64Array, b: Float64Array) => { const x = new Float64Array(16); x.set(a, 0); x.set(b, 8); return x; };
    const sp = stretchSpectrum(Sp(), mk(a, b));
    expect(sp.map((e) => e.mult)).toEqual(Mx.stretch["S'"].multiplicities);
    const s = stretchSpectrum(S(), mk(a, b));
    expect(s.map((e) => e.mult)).toEqual(Mx.stretch.S.multiplicities);
    // closed forms: 1 ± sigma, 1 ± tau, 1 with sigma = 2|a'||b|/N, tau = 2|a'||b_par|/N
    const N = a.reduce((t, v) => t + v * v, 0) + b.reduce((t, v) => t + v * v, 0);
    const ap = Math.sqrt(a.slice(1).reduce((t, v) => t + v * v, 0));
    const bn = Math.sqrt(b.reduce((t, v) => t + v * v, 0));
    const sigma = (2 * ap * bn) / N;
    // b_par = projection of b on C_a = span(1, a')
    const aImag = Float64Array.from(a); aImag[0] = 0;
    const bpar2 = b[0] ** 2 + (b.reduce((t, v, i) => t + v * aImag[i], 0) / ap) ** 2;
    const tau = (2 * ap * Math.sqrt(bpar2)) / N;
    const want = [1 - sigma, 1 - tau, 1, 1 + tau, 1 + sigma];
    sp.forEach((e, i) => expect(Math.abs(e.value - want[i])).toBeLessThan(1e-8));
  });
  it('Theorems 5.1, 5.2 and Remark 5.6: annihilator dimensions 2 / 6 on S\' and 4 on S', () => {
    const [a, b] = randomVectors(8, 2, 42);
    const u = Float64Array.from(a); u[0] = 0;
    const nu = Math.sqrt(u.reduce((t, v) => t + v * v, 0)); const uu = u.map((v) => v / nu);
    const bb = b.map((v) => v / Math.sqrt(b.reduce((t, w) => t + w * w, 0)));
    const mk = (a: Float64Array, b: Float64Array) => { const x = new Float64Array(16); x.set(a, 0); x.set(b, 8); return x; };
    expect(annihilatorDim(Sp(), mk(uu, bb))).toBe(Mx.annihilators["S'"].generic);
    expect(annihilatorDim(Sp(), mk(uu, uu))).toBe(Mx.annihilators["S'"].bInCu);
    // S: u, v orthonormal imaginary
    const v0 = Float64Array.from(b); v0[0] = 0;
    let d = 0; for (let i = 0; i < 8; i++) d += v0[i] * uu[i];
    const v1 = v0.map((x, i) => x - d * uu[i]); const nv = Math.sqrt(v1.reduce((t, x) => t + x * x, 0)); const vv = v1.map((x) => x / nv);
    expect(annihilatorDim(S(), mk(uu, vv))).toBe(Mx.annihilators.S.generic);
    // not a zero divisor when |a| != |b|
    expect(annihilatorDim(Sp(), mk(uu, bb.map((v) => 0.5 * v)))).toBe(0);
  });
});
