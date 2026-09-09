import { describe, it, expect } from 'vitest';
import { preset, SignAlgebra, mirrorEmbedding, isMultiplicative, isInjective, balesIsomorphism, double, BALES, brownMap, automorphismDefect, matPow, isIdentity, epsilonMap, diagonalMap, twistedDiagonalMap, flow, derivations, findZeroDivisorPair, pairManifoldLocal, randomVectors, annihilatorDim, mirrorAnnihilatorClosedForm, Lmat, dense, psiMap, doubled, alternatorKernel, mul, normInf, tower, REALS, gradedIsomorphisms, rankVectors, normOf, hyperplanes, basisSubalgebra, isComposition, censusWithOctaves, classifyCensus, censusCosets, censusBitsOf, censusAlgebra, octaveConfiguration, isDerivation, gradedAutomorphismOrder } from '../src/index.js';
import Mx from '../../tests/fixtures/mirror.json';

const O = () => preset('O') as SignAlgebra, H = () => preset('H') as SignAlgebra, S = () => preset('S') as SignAlgebra, Sp = () => preset("S'") as SignAlgebra;
const unit = (v: Float64Array) => v.map((x) => x / Math.sqrt(v.reduce((s, y) => s + y * y, 0)));

describe('Theorem 3.3 and 3.6: explicit maps', () => {
  it('Φ: M(A) → CD²(A), a + bℓ ↦ ā + (be)e′ is an injective multiplicative map for A = H, O', () => {
    for (const name of Mx.embedding.bases) {
      const e = mirrorEmbedding(preset(name));
      expect(isMultiplicative(e.mirror, e.target, e.map)).toBe(Mx.embedding.multiplicative);
      expect(isInjective(e.map)).toBe(true);
      // image is A + A(ee′): indices 0..n-1 and 3n..4n-1
      const n = preset(name).n;
      expect(Array.from(e.map.idx)).toEqual([...Array.from({ length: n }, (_, g) => g), ...Array.from({ length: n }, (_, g) => 3 * n + g)]);
    }
  });
  it('the six isomorphisms between Bales products are multiplicative', () => {
    for (const [src, dst, kind] of Mx.balesIsomorphisms as [string, string, 'ā+bℓ' | 'a+b̄ℓ' | 'ā+b̄ℓ'][]) {
      const A = double(O(), BALES[src], { name: src }), B = double(O(), BALES[dst], { name: dst });
      expect(isMultiplicative(A, B, balesIsomorphism(kind, O())), `${src}->${dst}`).toBe(true);
    }
  });
});

describe('Theorem 7.1, Remark 7.2, Theorem 8.1: automorphisms', () => {
  it("Brown's order-three map is an automorphism of S and not of S'", () => {
    const br = brownMap();
    expect(automorphismDefect(S(), br)).toBeLessThan(1e-12);
    expect(isIdentity(matPow(br, 16, Mx.brown.orderOnS), 16)).toBe(true);
    expect(isIdentity(br, 16)).toBe(false);
    expect(automorphismDefect(Sp(), br) > 1e-6).toBe(!Mx.brown.automorphismOfSprime);
  });
  it('ε: a + bℓ ↦ a − bℓ is an automorphism of every double; the diagonal G2 flow acts on S and S\'', () => {
    for (const name of ['S', "S'", 'M(H)', 'M(M(H))']) { const A = preset(name); expect(automorphismDefect(A, epsilonMap(A.n)), name).toBeLessThan(1e-12); }
    const D = derivations(O());
    expect(D.length).toBe(14);
    for (const t of [0.3, 1.1]) {
      const phi = flow(D[5], 8, t);
      expect(automorphismDefect(O(), phi)).toBeLessThan(1e-9);
      expect(automorphismDefect(Sp(), diagonalMap(phi, 8))).toBeLessThan(1e-9);
      expect(automorphismDefect(S(), diagonalMap(phi, 8))).toBeLessThan(1e-9);
    }
  });
  it('a + bℓ ↦ φ(a) + (qφ(b))ℓ is an automorphism of M(H) for unit q, and of S\' only for q = ±1', () => {
    const DH = derivations(H());
    const phiH = flow(DH[0], 4, 0.5);
    const q = unit(randomVectors(4, 1, 3)[0]);
    expect(automorphismDefect(preset('M(H)'), twistedDiagonalMap(H(), phiH, q))).toBeLessThan(1e-9);
    const idO = flow(new Float64Array(64), 8, 0);
    const qO = unit(randomVectors(8, 1, 5)[0]);
    expect(automorphismDefect(Sp(), twistedDiagonalMap(O(), idO, qO))).toBeGreaterThan(1e-3);
    const minusOne = new Float64Array(8); minusOne[0] = -1;
    expect(automorphismDefect(Sp(), twistedDiagonalMap(O(), idO, minusOne))).toBeLessThan(1e-12);
  });
  it('the derivation algebra of S is g2 too, and every basis element is a derivation', () => {
    const D = derivations(S());
    expect(D.length).toBe(14);
    expect(D.every((M) => isDerivation(S(), M, 1e-7))).toBe(true);
  });
});

describe('Theorems 5.1–5.5: zero-divisor geometry', () => {
  it('alternating minimisation finds zero-divisor pairs; rank dμ = 16, dim P = 14, dim Z = 11 (S) / 13 (S\')', () => {
    for (const [name, A] of [['S', S()], ["S'", Sp()]] as const) {
      const zd = findZeroDivisorPair(A, randomVectors(16, 1, 11)[0])!;
      expect(zd).not.toBeNull();
      expect(zd.residual).toBeLessThan(1e-9);
      expect(pairManifoldLocal(A, zd.x, zd.y)).toEqual((Mx.pairManifold as Record<string, unknown>)[name]);
    }
  });
  it('the stratum b ∈ C_u of S\' has 6-dimensional annihilators and the same rank dμ', () => {
    const [a] = randomVectors(8, 2, 42);
    const u = Float64Array.from(a); u[0] = 0; const uu = unit(u);
    const bC = uu.map((v, i) => 0.6 * v + (i === 0 ? 0.8 : 0));
    const x = doubled(uu, bC);
    const y = dense.nullSpace(Lmat(Sp(), x), 16, 16)[0];
    expect(pairManifoldLocal(Sp(), x, y)).toMatchObject(Mx.pairManifold["S'-bInCu"]);
  });
  it('Theorem 5.2 closed form of Ann(u + bℓ) matches ker L_x, generically (dim 2) and on b ∈ C_u (dim 6)', () => {
    const [a, b] = randomVectors(8, 2, 42);
    const u = Float64Array.from(a); u[0] = 0; const uu = unit(u), bb = unit(b);
    for (const bv of [bb, uu.map((v, i) => 0.6 * v + (i === 0 ? 0.8 : 0))]) {
      const pred = mirrorAnnihilatorClosedForm(O(), uu, bv);
      const ker = dense.nullSpace(Lmat(Sp(), doubled(uu, bv)), 16, 16);
      expect(pred.length).toBe(ker.length);
      expect(rankVectors([...pred, ...ker], 16)).toBe(ker.length);
    }
  });
  it('the 2/6 stratification on the (b0, b1) disc: dim 6 exactly on the boundary circle b ∈ C_u', () => {
    const [a, b] = randomVectors(8, 2, 42);
    const u = Float64Array.from(a); u[0] = 0; const uu = unit(u);
    const v0 = Float64Array.from(b); v0[0] = 0; let d = 0; for (let i = 0; i < 8; i++) d += v0[i] * uu[i];
    const nn = unit(v0.map((x, i) => x - d * uu[i]));
    for (const [b0, b1] of [[0, 0], [0.3, 0.4], [0.6, 0.8], [1, 0], [0, -1], [-0.5, 0.2]]) {
      const r2 = 1 - b0 * b0 - b1 * b1;
      const bv = uu.map((v, t) => b0 * (t === 0 ? 1 : 0) + b1 * v + Math.sqrt(Math.max(r2, 0)) * nn[t]);
      expect(annihilatorDim(Sp(), doubled(uu, bv)), `b0=${b0},b1=${b1}`).toBe(r2 < 1e-12 ? 6 : 2);
    }
  });
  it('Ψ(u, n, q) produces norm-one two-sided zero-divisor pairs', () => {
    const [a, b] = randomVectors(8, 2, 42);
    const u = Float64Array.from(a); u[0] = 0; const uu = unit(u);
    const v0 = Float64Array.from(b); v0[0] = 0; let d = 0; for (let i = 0; i < 8; i++) d += v0[i] * uu[i];
    const nn = unit(v0.map((x, i) => x - d * uu[i]));
    for (const q of [[1, 0, 0, 0], [0.5, 0.5, 0.5, 0.5], [0, 0.6, 0, 0.8]] as [number, number, number, number][]) {
      const { x, y } = psiMap(O(), uu, nn, q);
      expect(Math.abs(normOf(Sp(), x).N - 1)).toBeLessThan(1e-12);
      expect(Math.abs(normOf(Sp(), y).N - 1)).toBeLessThan(1e-12);
      expect(normInf(mul(Sp(), x, y))).toBeLessThan(1e-12);
      expect(normInf(mul(Sp(), y, x))).toBeLessThan(1e-12);
    }
  });
  it('Remark 4.2: ker alt_x is an octonion subalgebra in S and a quaternion subalgebra in S\'', () => {
    const [x] = randomVectors(16, 1, 9);
    expect(alternatorKernel(S(), x)).toMatchObject({ dim: 8, closed: true, composition: true, associative: false });
    expect(alternatorKernel(Sp(), x)).toMatchObject({ dim: 4, closed: true, composition: true, associative: true });
  });
});

describe('Remark 3.8 and Appendix A leftovers', () => {
  it('the uniform P1T tower has dim Der 6 at dimensions 8 and 16, and its 8-dimensional stage is M(H)', () => {
    const P8 = tower(REALS, ['P1T', 'P1T', 'P1T']), P16 = tower(REALS, ['P1T', 'P1T', 'P1T', 'P1T']);
    expect(derivations(P8).length).toBe(Mx.uniformP1TTower.dimDer8);
    expect(derivations(P16).length).toBe(Mx.uniformP1TTower.dimDer16);
    expect(gradedIsomorphisms(P8 as SignAlgebra, preset('M(H)') as SignAlgebra, { limit: 1 }).isos.length > 0).toBe(Mx.uniformP1TTower.dim8IsMH);
  });
  it('none of the 31 hyperplanes of T is a composition algebra', () => {
    const T = preset('T') as SignAlgebra;
    expect(hyperplanes(5).filter((h) => isComposition(basisSubalgebra(T, h).induced).holds).length).toBe(Mx.hyperplanesOfTComposition);
  });
});

describe('sign-function census on F2^4 (reference [16], Question 2)', () => {
  it('exactly three graded-isomorphism classes have eight octaves: S, S\' (dim Der 14) and one more (dim Der 8); none has nine', () => {
    const rows = censusWithOctaves(8);
    expect(rows.length).toBe(Mx.signCensus.configsWithEightOctaves);
    expect(rows.filter((r) => r.octaves > 8).length).toBe(Mx.signCensus.configsWithMoreThanEight);
    expect(censusCosets(rows).length).toBe(Mx.signCensus.cosetsModSignChanges);
    expect(rows.some((r) => r.bits === censusBitsOf(S()))).toBe(true);
    // affine octave count agrees with the composition test on a sample
    for (const r of rows.filter((_, i) => i % 3000 === 0)) expect(octaveConfiguration(censusAlgebra(r.bits)).composition).toBe(r.octaves);
    const { classes } = classifyCensus(rows);
    expect(classes.length).toBe(Mx.signCensus.classes.length);
    const s = classes.find((c) => c.isS)!, sp = classes.find((c) => c.isSprime)!, other = classes.find((c) => !c.isS && !c.isSprime)!;
    expect(s).toMatchObject({ dimDer: 14, size: 8192 });
    expect(sp).toMatchObject({ dimDer: 14, size: 8192 });
    expect(other).toMatchObject({ dimDer: 8, size: 57344 });
    expect(gradedAutomorphismOrder(censusAlgebra(other.rep.bits)).order).toBeGreaterThan(0);
  });
});
