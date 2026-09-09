import { MonomialAlgebra, SignAlgebra } from '../algebra/monomial.js';
import { CD, M } from '../algebra/doubling.js';
import type { Mono } from '../algebra/types.js';

export interface SignedIndexMap {
  /** image index of each basis element */
  idx: Int32Array;
  /** image sign of each basis element */
  sgn: Int8Array;
}

/** Check that a signed index map A -> B is multiplicative on the basis. */
export function isMultiplicative(A: MonomialAlgebra, B: MonomialAlgebra, map: SignedIndexMap): boolean {
  for (let g = 0; g < A.n; g++)
    for (let h = 0; h < A.n; h++) {
      const p = A.mono(g, h);
      const lhs: Mono | null = p.s === 0 ? null : { g: map.idx[p.g], s: p.s * map.sgn[p.g] };
      const rhs = B.mulMono({ g: map.idx[g], s: map.sgn[g] }, { g: map.idx[h], s: map.sgn[h] });
      if (lhs === null && rhs === null) continue;
      if (lhs === null || rhs === null || lhs.g !== rhs.g || lhs.s !== rhs.s) return false;
    }
  return true;
}
/** Is the image of the basis a linearly independent set (injective signed index map)? */
export function isInjective(map: SignedIndexMap): boolean {
  return new Set(Array.from(map.idx)).size === map.idx.length;
}

/**
 * Lui's embedding Φ: M(A) -> CD²(A), Φ(a + bℓ) = ā + (be)e′, with the standard basis ordering of the doubles:
 * indices 0..n-1 = A, n..2n-1 = Ae, 2n..3n-1 = Ae′, 3n..4n-1 = (Ae)e′.
 */
export function mirrorEmbedding(A: MonomialAlgebra): { mirror: MonomialAlgebra; target: MonomialAlgebra; map: SignedIndexMap } {
  const n = A.n;
  const mirror = M(A);
  const target = CD(CD(A));
  const idx = new Int32Array(2 * n), sgn = new Int8Array(2 * n);
  for (let g = 0; g < n; g++) {
    idx[g] = g; sgn[g] = A.conjSign[g]; // ā
    idx[n + g] = 3 * n + g; sgn[n + g] = 1; // (e_g e) e′
  }
  return { mirror, target, map: { idx, sgn } };
}

/** The six explicit isomorphisms of Theorem 3.6 between Bales products over O, as signed index maps on O ⊕ Oℓ. */
export function balesIsomorphism(kind: 'ā+bℓ' | 'a+b̄ℓ' | 'ā+b̄ℓ', O: MonomialAlgebra): SignedIndexMap {
  const n = O.n;
  const idx = new Int32Array(2 * n), sgn = new Int8Array(2 * n);
  for (let g = 0; g < n; g++) {
    idx[g] = g; sgn[g] = kind === 'a+b̄ℓ' ? 1 : O.conjSign[g];
    idx[n + g] = n + g; sgn[n + g] = kind === 'ā+bℓ' ? 1 : O.conjSign[g];
  }
  return { idx, sgn };
}

/** Real matrix (n x n, row-major) of a signed index map. */
export function mapMatrix(map: SignedIndexMap): Float64Array {
  const n = map.idx.length;
  const M = new Float64Array(n * n);
  for (let g = 0; g < n; g++) M[map.idx[g] * n + g] = map.sgn[g];
  return M;
}
export { SignAlgebra };
