import type { Algebra } from '../algebra/types.js';
import { rref } from '../linalg/dense.js';

/** Orthonormalise rows (k x n) by Gram–Schmidt; drops dependent rows. */
export function orthonormalRows(rows: Float64Array[], tol = 1e-10): Float64Array[] {
  const out: Float64Array[] = [];
  for (const r of rows) {
    const v = Float64Array.from(r);
    for (const u of out) {
      let d = 0;
      for (let i = 0; i < v.length; i++) d += v[i] * u[i];
      for (let i = 0; i < v.length; i++) v[i] -= d * u[i];
    }
    let nn = 0;
    for (const x of v) nn += x * x;
    if (nn > tol * tol) out.push(v.map((x) => x / Math.sqrt(nn)));
  }
  return out;
}
/** Leakage Λ(S) = (1/k²) Σ_{a,b} ‖(I − P_S)(s_a s_b)‖² for an orthonormal basis of S. */
export function leakage(A: Algebra, S: Float64Array[]): number {
  const k = S.length;
  if (k === 0) return 0;
  let total = 0;
  for (const sa of S)
    for (const sb of S) {
      const p = A.mulVec(sa, sb);
      const q = Float64Array.from(p);
      for (const u of S) {
        let d = 0;
        for (let i = 0; i < p.length; i++) d += p[i] * u[i];
        for (let i = 0; i < p.length; i++) q[i] -= d * u[i];
      }
      let nn = 0;
      for (const x of q) nn += x * x;
      total += nn;
    }
  return total / (k * k);
}
/** Closure of a set of generators under product (numerical), as an orthonormal basis. */
export function closure(A: Algebra, gens: Float64Array[], tol = 1e-9): Float64Array[] {
  let basis = orthonormalRows(gens, tol);
  for (let iter = 0; iter < 64; iter++) {
    const products: Float64Array[] = [];
    for (const x of basis) for (const y of basis) products.push(A.mulVec(x, y));
    const next = orthonormalRows([...basis, ...products], tol);
    if (next.length === basis.length) return basis;
    basis = next;
  }
  return basis;
}
/** Rank of a set of vectors. */
export function rankVectors(vs: Float64Array[], n: number, tol = 1e-9): number {
  const M = new Float64Array(vs.length * n);
  vs.forEach((v, i) => M.set(v, i * n));
  return rref(M, vs.length, n, tol).rank;
}
