import type { Algebra } from '../algebra/types.js';
import { Lmat, Rmat, annihilatorDim, alternatorMatrix, normOf, mul, sub, normInf, conj, basisVec, type Vec } from '../ops/element.js';
import { symEig, rankOf, nullSpace, matMul, transpose } from '../linalg/dense.js';
import { orthonormalRows, closure, rankVectors } from '../sub/leakage.js';
import { isComposition, isAssociative } from '../facts/identities.js';
import { DenseAlgebra } from '../algebra/dense.js';

function unit(v: Vec): Vec { const nn = Math.sqrt(v.reduce((s, x) => s + x * x, 0)); return v.map((x) => x / nn); }
function smallestRightSingular(M: Float64Array, n: number): { value: number; vec: Vec } {
  const G = matMul(transpose(M, n, n), M, n, n, n);
  const { values, vectors } = symEig(G, n);
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = vectors[i * n];
  return { value: Math.sqrt(Math.max(values[0], 0)), vec: v };
}

/**
 * Find a norm-one zero-divisor pair by alternating minimisation of |xy| over unit x, y:
 * y <- smallest right singular vector of L_x, x <- smallest right singular vector of R_y.
 */
export function findZeroDivisorPair(A: Algebra, x0: Vec, iters = 60, tol = 1e-10): { x: Vec; y: Vec; residual: number } | null {
  let x = unit(x0);
  let y = smallestRightSingular(Lmat(A, x), A.n).vec;
  let res = Infinity;
  for (let i = 0; i < iters; i++) {
    x = unit(smallestRightSingular(Rmat(A, y), A.n).vec);
    const s = smallestRightSingular(Lmat(A, x), A.n);
    y = unit(s.vec);
    res = normInf(mul(A, x, y));
    if (res < tol) return { x, y, residual: res };
  }
  return res < 1e-6 ? { x, y, residual: res } : null;
}

/**
 * Local dimensions of the pair manifold P = {(x,y) on the spheres : xy = 0} and the dead set Z at a pair (x,y):
 * rank of dμ = [R_y | L_x] (n x 2n), dim P = 2n − rank − 2 (transversal sphere constraints), dim Z = dim P − (dim Ann(x) − 1).
 */
export function pairManifoldLocal(A: Algebra, x: Vec, y: Vec, tol = 1e-8): { rankDmu: number; dimP: number; dimZ: number; dimAnn: number } {
  const n = A.n;
  const J = new Float64Array(n * 2 * n);
  const Ry = Rmat(A, y), Lx = Lmat(A, x);
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) { J[i * 2 * n + j] = Ry[i * n + j]; J[i * 2 * n + n + j] = Lx[i * n + j]; } }
  const rankDmu = rankOf(J, n, 2 * n, tol);
  const dimAnn = annihilatorDim(A, x, tol);
  const dimP = 2 * n - rankDmu - 2;
  return { rankDmu, dimP, dimZ: dimP - (dimAnn - 1), dimAnn };
}

/** Basis of ker alt_x, and whether that kernel is a (composition / associative) subalgebra. */
export function alternatorKernel(A: Algebra, x: Vec, tol = 1e-8): { dim: number; basis: Vec[]; closed: boolean; composition: boolean; associative: boolean } {
  const K = nullSpace(alternatorMatrix(A, x), A.n, A.n, tol);
  const basis = orthonormalRows(K);
  const cl = closure(A, basis, tol);
  const closed = cl.length === basis.length;
  // induced dense algebra on the kernel (if closed)
  let composition = false, associative = false;
  if (closed && basis.length > 0) {
    const k = basis.length;
    const c = new Float64Array(k * k * k);
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) { const p = A.mulVec(basis[i], basis[j]); for (let t = 0; t < k; t++) { let d = 0; for (let q = 0; q < A.n; q++) d += p[q] * basis[t][q]; c[(i * k + j) * k + t] = d; } }
    const conjT = new Float64Array(k * k);
    if (A.conjVec) for (let i = 0; i < k; i++) { const ci = A.conjVec(basis[i]); for (let t = 0; t < k; t++) { let d = 0; for (let q = 0; q < A.n; q++) d += ci[q] * basis[t][q]; conjT[t * k + i] = d; } }
    const D = new DenseAlgebra(k, c, { name: 'ker alt' });
    const Dc = Object.assign(D, { conjVec: (v: Vec) => { const r = new Float64Array(k); for (let t = 0; t < k; t++) { let s = 0; for (let i = 0; i < k; i++) s += conjT[t * k + i] * v[i]; r[t] = s; } return r; } });
    associative = isAssociative(Dc).holds;
    composition = D.unit !== null && isComposition(Dc).holds;
  }
  return { dim: basis.length, basis, closed, composition, associative };
}

/** Sedenion-family coordinates x = a + bℓ on a 16-dim doubled algebra with base dimension 8. */
export function doubled(a: Vec, b: Vec): Vec { const x = new Float64Array(a.length + b.length); x.set(a, 0); x.set(b, a.length); return x; }
export function halves(x: Vec): { a: Vec; b: Vec } { const h = x.length / 2; return { a: x.slice(0, h), b: x.slice(h) }; }

/**
 * Lui Theorem 5.2 closed form: Ann(u + bℓ) = { nu + (bn)ℓ : n ∈ Im O, n ⊥ u, [b,n,u] = 0 } in S′ (u imaginary unit, |b| = |u|).
 * Returns the predicted annihilator basis (from the linear conditions on n) so it can be compared with ker L_x.
 */
export function mirrorAnnihilatorClosedForm(Obase: Algebra, u: Vec, b: Vec, tol = 1e-8): Vec[] {
  const m = Obase.n; // 8
  // n ranges over Im O with n ⊥ u and [b,n,u] = 0: linear conditions on n ∈ R^8
  const rows: number[][] = [];
  rows.push(Array.from({ length: m }, (_, i) => (i === 0 ? 1 : 0))); // real part zero
  rows.push(Array.from(u)); // n ⊥ u
  // associator [b, e_i, u] components: linear in n
  const assocCols: Vec[] = [];
  for (let i = 0; i < m; i++) { const e = basisVec(Obase, i); assocCols.push(sub(Obase.mulVec(Obase.mulVec(b, e), u), Obase.mulVec(b, Obase.mulVec(e, u)))); }
  for (let comp = 0; comp < m; comp++) rows.push(assocCols.map((c) => c[comp]));
  const flat = new Float64Array(rows.length * m);
  rows.forEach((r, i) => flat.set(r, i * m));
  const ns = nullSpace(flat, rows.length, m, tol);
  return ns.map((n) => doubled(Obase.mulVec(n, u), Obase.mulVec(b, n)));
}
/** Lui Theorem 5.5: Ψ(u, n, q) = ((u + bℓ)/√2, (nu + (bn)ℓ)/√2) with b = q0 + q1 u + q2 n + q3 un. */
export function psiMap(Obase: Algebra, u: Vec, nvec: Vec, q: [number, number, number, number]): { x: Vec; y: Vec } {
  const un = Obase.mulVec(u, nvec);
  const b = new Float64Array(Obase.n);
  b[0] += q[0];
  for (let i = 0; i < Obase.n; i++) b[i] += q[1] * u[i] + q[2] * nvec[i] + q[3] * un[i];
  const x = doubled(u, b).map((v) => v / Math.SQRT2);
  const y = doubled(Obase.mulVec(nvec, u), Obase.mulVec(b, nvec)).map((v) => v / Math.SQRT2);
  return { x, y };
}
export { normOf, conj, rankVectors };
