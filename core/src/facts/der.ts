import type { Algebra } from '../algebra/types.js';
import { SignAlgebra } from '../algebra/monomial.js';
import { nullSpace, rankOf, matMul, solve, symEig } from '../linalg/dense.js';
import { basisVec, Lmat, Rmat } from '../ops/element.js';

/**
 * Derivation algebra Der(A) = { D linear : D(xy) = D(x)y + xD(y) }.
 * Returns a basis of n x n matrices (row-major).
 */
export function derivations(A: Algebra, opts: { tol?: number } = {}): Float64Array[] {
  if (A instanceof SignAlgebra && A.m >= 1) return derivationsGenerator(A, opts.tol ?? 1e-9);
  return derivationsFull(A, opts.tol ?? 1e-9);
}

/** Full linear system in the n² entries of D (fine for n ≤ 16). */
export function derivationsFull(A: Algebra, tol = 1e-9): Float64Array[] {
  const n = A.n, u = n * n;
  const rows: number[] = [];
  const Ls: Float64Array[] = [], Rs: Float64Array[] = [];
  for (let g = 0; g < n; g++) { Ls.push(Lmat(A, basisVec(A, g))); Rs.push(Rmat(A, basisVec(A, g))); }
  // equation for pair (g,h), component k:  sum_j c_{gh}^j D[k,j] − sum_j (R_h)[k,j] D[j,g] − sum_j (L_g)[k,j] D[j,h] = 0
  const prods: Float64Array[] = [];
  for (let g = 0; g < n; g++) for (let h = 0; h < n; h++) prods.push(A.mulVec(basisVec(A, g), basisVec(A, h)));
  const M: number[][] = [];
  for (let g = 0; g < n; g++)
    for (let h = 0; h < n; h++) {
      const p = prods[g * n + h];
      for (let k = 0; k < n; k++) {
        const row = new Array<number>(u).fill(0);
        for (let j = 0; j < n; j++) {
          if (p[j] !== 0) row[k * n + j] += p[j];
          const rh = Rs[h][k * n + j];
          if (rh !== 0) row[j * n + g] -= rh;
          const lg = Ls[g][k * n + j];
          if (lg !== 0) row[j * n + h] -= lg;
        }
        M.push(row);
      }
    }
  void rows;
  const flat = new Float64Array(M.length * u);
  M.forEach((r, i) => flat.set(r, i * u));
  return nullSpace(flat, M.length, u, tol);
}

/**
 * Generator reduction for sign algebras: D is determined by D(e_{2^i}); the other D(e_g) follow by Leibniz along
 * e_g = ±(...((e_{g1} e_{g2}) e_{g3})...). Unknown vector u has m blocks of n entries.
 */
export function derivationsGenerator(A: SignAlgebra, tol = 1e-9): Float64Array[] {
  const n = A.n, m = A.m, U = m * n;
  // Dg[g] : n x U matrix expressing D(e_g) in terms of the unknowns
  const Dg: Float64Array[] = new Array(n);
  Dg[0] = new Float64Array(n * U); // D(1) = 0
  for (let i = 0; i < m; i++) {
    const M = new Float64Array(n * U);
    for (let k = 0; k < n; k++) M[k * U + i * n + k] = 1;
    Dg[1 << i] = M;
  }
  const Ls = (g: number) => Lmat(A, basisVec(A, g));
  const Rs = (g: number) => Rmat(A, basisVec(A, g));
  for (let g = 1; g < n; g++) {
    if (Dg[g]) continue;
    // g = h ^ (1<<i) with i the highest bit; e_g = s * e_h e_{2^i}
    const i = 31 - Math.clz32(g);
    const h = g ^ (1 << i);
    const mono = A.mono(h, 1 << i); // e_h e_{2^i} = mono.s e_g
    const s = mono.s;
    if (mono.g !== g || s === 0) throw new Error('unexpected product structure');
    // D(e_g) = s [ D(e_h) e_{2^i} + e_h D(e_{2^i}) ] = s [ R_{2^i} D(e_h) + L_h D(e_{2^i}) ]
    const R = Rs(1 << i), L = Ls(h);
    const a = matMul(R, Dg[h], n, n, U), b = matMul(L, Dg[1 << i], n, n, U);
    const M = new Float64Array(n * U);
    for (let t = 0; t < n * U; t++) M[t] = s * (a[t] + b[t]);
    Dg[g] = M;
  }
  // equations: F(g,h) D(e_{g^h}) − R_h D(e_g) − L_g D(e_h) = 0 for all g,h
  const Lcache: Float64Array[] = [], Rcache: Float64Array[] = [];
  for (let g = 0; g < n; g++) { Lcache.push(Ls(g)); Rcache.push(Rs(g)); }
  const equationBlock = (g: number, h: number): Float64Array => {
    const f = A.F(g, h);
    const a = matMul(Rcache[h], Dg[g], n, n, U), b = matMul(Lcache[g], Dg[h], n, n, U);
    const target = Dg[g ^ h];
    const E = new Float64Array(n * U);
    for (let t = 0; t < n * U; t++) E[t] = f * target[t] - a[t] - b[t];
    return E;
  };
  let ns: Float64Array[];
  if (n <= 32) {
    const eqs: Float64Array[] = [];
    for (let g = 1; g < n; g++) for (let h = 1; h < n; h++) eqs.push(equationBlock(g, h));
    const rowsN = eqs.length * n;
    const flat = new Float64Array(rowsN * U);
    eqs.forEach((E, i) => flat.set(E, i * n * U));
    ns = nullSpace(flat, rowsN, U, tol);
  } else {
    // Large n: accumulate the Gram matrix G = Σ rowᵀ row over a sample of pairs; null space = small-eigenvalue
    // eigenvectors of G. Sample size doubles until every candidate verifies as a derivation.
    let pairs: [number, number][] = [];
    for (let g = 1; g < n; g++) for (let h = 1; h < n; h++) pairs.push([g, h]);
    let seed = 987654321;
    for (let i = pairs.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; const j = seed % (i + 1); [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; }
    let sample = Math.min(pairs.length, 6 * m + 64);
    const G = new Float64Array(U * U);
    let used = 0;
    for (;;) {
      for (; used < sample; used++) {
        const [g, h] = pairs[used];
        const E = equationBlock(g, h);
        for (let r = 0; r < n; r++) {
          const row = E.subarray(r * U, (r + 1) * U);
          for (let i = 0; i < U; i++) {
            const ri = row[i];
            if (ri === 0) continue;
            const base = i * U;
            for (let j = i; j < U; j++) G[base + j] += ri * row[j];
          }
        }
      }
      const Gs = new Float64Array(U * U);
      for (let i = 0; i < U; i++) for (let j = i; j < U; j++) { Gs[i * U + j] = G[i * U + j]; Gs[j * U + i] = G[i * U + j]; }
      const { values, vectors } = symEig(Gs, U, 1e-14);
      const scale = Math.max(1, values[U - 1]);
      ns = [];
      for (let k = 0; k < U; k++) {
        if (values[k] > 1e-9 * scale) break;
        const v = new Float64Array(U);
        for (let t = 0; t < U; t++) v[t] = vectors[t * U + k];
        ns.push(v);
      }
      const cand = ns.map((u) => reconstruct(u));
      if (cand.every((D) => isDerivation(A, D, 1e-6)) || sample >= pairs.length) break;
      sample = Math.min(pairs.length, sample * 2);
    }
  }
  function reconstruct(u: Float64Array): Float64Array {
    const D = new Float64Array(n * n);
    for (let g = 0; g < n; g++) {
      const Mg = Dg[g];
      for (let k = 0; k < n; k++) {
        let v = 0;
        for (let t = 0; t < U; t++) v += Mg[k * U + t] * u[t];
        D[k * n + g] = v;
      }
    }
    return D;
  }
  // reconstruct D matrices (n x n): D[k, g] = component k of D(e_g); verify (guards the sampled case)
  const out = ns.map((u) => reconstruct(u));
  const good = out.filter((D) => isDerivation(A, D, 1e-6));
  // orthonormalise for a clean basis
  return orthonormalMatrices(good);
}

function orthonormalMatrices(mats: Float64Array[]): Float64Array[] {
  const out: Float64Array[] = [];
  for (const M of mats) {
    const v = Float64Array.from(M);
    for (const u of out) { let d = 0; for (let i = 0; i < v.length; i++) d += v[i] * u[i]; for (let i = 0; i < v.length; i++) v[i] -= d * u[i]; }
    let nn = 0; for (const x of v) nn += x * x;
    if (nn > 1e-18) out.push(v.map((x) => x / Math.sqrt(nn)));
  }
  return out;
}

export function isDerivation(A: Algebra, D: Float64Array, tol = 1e-9): boolean {
  const n = A.n;
  const apply = (x: Float64Array) => { const y = new Float64Array(n); for (let k = 0; k < n; k++) { let s = 0; for (let j = 0; j < n; j++) s += D[k * n + j] * x[j]; y[k] = s; } return y; };
  for (let g = 0; g < n; g++)
    for (let h = 0; h < n; h++) {
      const eg = basisVec(A, g), eh = basisVec(A, h);
      const lhs = apply(A.mulVec(eg, eh));
      const rhs = A.mulVec(apply(eg), eh);
      const r2 = A.mulVec(eg, apply(eh));
      for (let k = 0; k < n; k++) if (Math.abs(lhs[k] - rhs[k] - r2[k]) > tol) return false;
    }
  return true;
}

/** Lie bracket [D1, D2] = D1 D2 − D2 D1. */
export function bracket(D1: Float64Array, D2: Float64Array, n: number): Float64Array {
  const a = matMul(D1, D2, n, n, n), b = matMul(D2, D1, n, n, n);
  return a.map((v, i) => v - b[i]);
}
/** Dimension of the span of a set of matrices. */
export function spanDim(mats: Float64Array[], tol = 1e-9): number {
  if (mats.length === 0) return 0;
  const w = mats[0].length;
  const M = new Float64Array(mats.length * w);
  mats.forEach((D, i) => M.set(D, i * w));
  return rankOf(M, mats.length, w, tol);
}
/** Killing form signature of the Lie algebra spanned by a basis of derivations. */
export function killingSignature(basis: Float64Array[], n: number): { plus: number; minus: number; zero: number } {
  const d = basis.length;
  // structure constants via least squares against the basis (basis assumed independent)
  const w = n * n;
  const G = new Float64Array(d * d);
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) { let s = 0; for (let t = 0; t < w; t++) s += basis[i][t] * basis[j][t]; G[i * d + j] = s; }
  const coords = (X: Float64Array): Float64Array => {
    const rhs = new Float64Array(d);
    for (let i = 0; i < d; i++) { let s = 0; for (let t = 0; t < w; t++) s += basis[i][t] * X[t]; rhs[i] = s; }
    // solve G c = rhs
    return solve(G, rhs, d) ?? new Float64Array(d);
  };
  const ad: Float64Array[] = [];
  for (let i = 0; i < d; i++) {
    const M = new Float64Array(d * d);
    for (let j = 0; j < d; j++) { const c = coords(bracket(basis[i], basis[j], n)); for (let k = 0; k < d; k++) M[k * d + j] = c[k]; }
    ad.push(M);
  }
  const K = new Float64Array(d * d);
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) { const P = matMul(ad[i], ad[j], d, d, d); let tr = 0; for (let k = 0; k < d; k++) tr += P[k * d + k]; K[i * d + j] = tr; }
  const { values } = symEig(K, d);
  const sig = { plus: 0, minus: 0, zero: 0 };
  for (const v of values) { if (v > 1e-6) sig.plus++; else if (v < -1e-6) sig.minus++; else sig.zero++; }
  return sig;
}
