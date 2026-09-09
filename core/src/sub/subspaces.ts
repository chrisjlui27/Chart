import { SignAlgebra } from '../algebra/monomial.js';
import { spanElements, reducedEchelon, subspacesOfDim } from '../linalg/f2.js';

export interface BasisSubalgebra {
  /** F2 basis (bitmasks) of the index subspace */
  basis: number[];
  /** all indices in the span, sorted */
  elements: number[];
  /** the induced sign algebra in coordinates x -> sum x_i basis[i] */
  induced: SignAlgebra;
  /** map from induced index to ambient index */
  toAmbient: (x: number) => number;
}

/** The subalgebra of a sign algebra spanned by the basis elements indexed by an F2-subspace. */
export function basisSubalgebra(A: SignAlgebra, basis: number[], name?: string): BasisSubalgebra {
  const B = reducedEchelon(basis).reverse(); // ascending pivots so that coordinates match the natural order
  const k = B.length;
  const nk = 1 << k;
  const toAmbient = (x: number) => {
    let g = 0;
    for (let i = 0; i < k; i++) if ((x >> i) & 1) g ^= B[i];
    return g;
  };
  const F = new Int8Array(nk * nk);
  const conjSign = new Int8Array(nk);
  for (let x = 0; x < nk; x++) {
    conjSign[x] = A.conjSign[toAmbient(x)];
    for (let y = 0; y < nk; y++) F[x * nk + y] = A.F(toAmbient(x), toAmbient(y));
  }
  const induced = new SignAlgebra(k, F, { name: name ?? `${A.name}[${B.map((g) => A.labels[g]).join(',')}]`, conjSign });
  return { basis: B, elements: spanElements(B), induced, toAmbient };
}

/** All basis subalgebras of dimension 2^k. */
export function basisSubalgebrasOfDim(A: SignAlgebra, k: number): BasisSubalgebra[] {
  return subspacesOfDim(A.m, k).map((b) => basisSubalgebra(A, b));
}

/** Hyperplanes of F2^m containing / avoiding a given point. */
export function hyperplanes(m: number): number[][] {
  return subspacesOfDim(m, m - 1);
}
export function hyperplaneContains(basis: number[], g: number): boolean {
  return spanElements(basis).includes(g);
}
