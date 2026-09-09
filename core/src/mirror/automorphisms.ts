import type { Algebra } from '../algebra/types.js';
import { MonomialAlgebra } from '../algebra/monomial.js';
import { basisVec, normInf, sub, mul, type Vec } from '../ops/element.js';
import { matVec, expm } from '../linalg/dense.js';

/** Residual max ‖θ(xy) − θ(x)θ(y)‖ over basis pairs, for a linear map θ given as an n x n matrix. */
export function automorphismDefect(A: Algebra, theta: Float64Array): number {
  const n = A.n;
  let worst = 0;
  const img: Vec[] = [];
  for (let g = 0; g < n; g++) img.push(matVec(theta, basisVec(A, g), n, n));
  for (let g = 0; g < n; g++)
    for (let h = 0; h < n; h++) {
      const lhs = matVec(theta, A.mulVec(basisVec(A, g), basisVec(A, h)), n, n);
      const rhs = A.mulVec(img[g], img[h]);
      worst = Math.max(worst, normInf(sub(lhs, rhs)));
    }
  return worst;
}
export function isAutomorphism(A: Algebra, theta: Float64Array, tol = 1e-9): boolean {
  return automorphismDefect(A, theta) <= tol;
}

/**
 * Brown's order-three automorphism of S: simultaneous rotation by angle θ (default 2π/3) in each plane
 * R e_q + R e_q ℓ for q in Im O (indices 1..7 and 9..15), fixing 1 and ℓ. Defined on any 16-dim doubled algebra.
 */
export function brownMap(angle = (2 * Math.PI) / 3, n = 16): Float64Array {
  const M = new Float64Array(n * n);
  const half = n / 2;
  M[0] = 1;
  M[half * n + half] = 1;
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let q = 1; q < half; q++) {
    // e_q -> c e_q + s e_{q+half};  e_{q+half} -> -s e_q + c e_{q+half}
    M[q * n + q] = c; M[(q + half) * n + q] = s;
    M[q * n + (q + half)] = -s; M[(q + half) * n + (q + half)] = c;
  }
  return M;
}
/** The sign flip ε: a + bℓ ↦ a − bℓ on a doubled algebra. */
export function epsilonMap(n: number): Float64Array {
  const M = new Float64Array(n * n);
  for (let g = 0; g < n; g++) M[g * n + g] = g < n / 2 ? 1 : -1;
  return M;
}
/** Diagonal extension φ ⊕ φ of a linear map φ on the base of a doubled algebra. */
export function diagonalMap(phi: Float64Array, half: number): Float64Array {
  const n = 2 * half;
  const M = new Float64Array(n * n);
  for (let i = 0; i < half; i++) for (let j = 0; j < half; j++) { M[i * n + j] = phi[i * half + j]; M[(i + half) * n + (j + half)] = phi[i * half + j]; }
  return M;
}
/** a + bℓ ↦ φ(a) + (q φ(b))ℓ with q a unit of the base (Theorem 8.1(3)). */
export function twistedDiagonalMap(base: MonomialAlgebra, phi: Float64Array, q: Vec): Float64Array {
  const half = base.n, n = 2 * half;
  const M = new Float64Array(n * n);
  const Lq = base.L(q);
  const LqPhi = new Float64Array(half * half);
  for (let i = 0; i < half; i++) for (let j = 0; j < half; j++) { let s = 0; for (let k = 0; k < half; k++) s += Lq[i * half + k] * phi[k * half + j]; LqPhi[i * half + j] = s; }
  for (let i = 0; i < half; i++) for (let j = 0; j < half; j++) { M[i * n + j] = phi[i * half + j]; M[(i + half) * n + (j + half)] = LqPhi[i * half + j]; }
  return M;
}
/** exp(tD) for a derivation D (an automorphism when D is a derivation). */
export function flow(D: Float64Array, n: number, t: number): Float64Array {
  return expm(D.map((v) => v * t), n);
}
/** Matrix power (for checking orders). */
export function matPow(M: Float64Array, n: number, k: number): Float64Array {
  let R = new Float64Array(n * n);
  for (let i = 0; i < n; i++) R[i * n + i] = 1;
  for (let i = 0; i < k; i++) { const T = new Float64Array(n * n); for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { let s = 0; for (let c = 0; c < n; c++) s += R[a * n + c] * M[c * n + b]; T[a * n + b] = s; } R = T; }
  return R;
}
export function isIdentity(M: Float64Array, n: number, tol = 1e-9): boolean {
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (Math.abs(M[i * n + j] - (i === j ? 1 : 0)) > tol) return false;
  return true;
}
export { mul };
