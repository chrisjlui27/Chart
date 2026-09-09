import { MonomialAlgebra, SignAlgebra } from './monomial.js';

/** Tensor product A ⊗ B of monomial algebras; basis e_i ⊗ f_j at index i*nB + j (XOR-compatible for sign algebras). */
export function tensor(A: MonomialAlgebra, B: MonomialAlgebra, name?: string): MonomialAlgebra {
  const nA = A.n, nB = B.n, N = nA * nB;
  const idx = new Int32Array(N * N);
  const sgn = new Int8Array(N * N);
  const conjSign = new Int8Array(N);
  for (let i = 0; i < nA; i++) for (let j = 0; j < nB; j++) conjSign[i * nB + j] = A.conjSign[i] * B.conjSign[j];
  for (let i = 0; i < nA; i++)
    for (let j = 0; j < nB; j++)
      for (let k = 0; k < nA; k++)
        for (let l = 0; l < nB; l++) {
          const a = A.mono(i, k), b = B.mono(j, l);
          const P = (i * nB + j) * N + (k * nB + l);
          sgn[P] = a.s * b.s;
          idx[P] = a.g * nB + b.g;
        }
  const nm = name ?? `${A.name}⊗${B.name}`;
  if (A instanceof SignAlgebra && B instanceof SignAlgebra) {
    return new SignAlgebra(A.m + B.m, sgn, { name: nm, conjSign, genKinds: [...B.genKinds, ...A.genKinds] });
  }
  const unit = A.unit !== null && B.unit !== null ? A.unit * nB + B.unit : null;
  return new MonomialAlgebra(N, idx, sgn, { name: nm, conjSign, unit });
}

/** Direct sum A ⊕ B (componentwise product). Not unital on a single basis element. */
export function directSum(A: MonomialAlgebra, B: MonomialAlgebra, name?: string): MonomialAlgebra {
  const N = A.n + B.n;
  const idx = new Int32Array(N * N);
  const sgn = new Int8Array(N * N);
  const conjSign = new Int8Array(N);
  conjSign.set(A.conjSign, 0);
  conjSign.set(B.conjSign, A.n);
  for (let i = 0; i < A.n; i++)
    for (let k = 0; k < A.n; k++) {
      const a = A.mono(i, k);
      sgn[i * N + k] = a.s;
      idx[i * N + k] = a.g;
    }
  for (let j = 0; j < B.n; j++)
    for (let l = 0; l < B.n; l++) {
      const b = B.mono(j, l);
      sgn[(A.n + j) * N + (A.n + l)] = b.s;
      idx[(A.n + j) * N + (A.n + l)] = A.n + b.g;
    }
  return new MonomialAlgebra(N, idx, sgn, { name: name ?? `${A.name}⊕${B.name}`, conjSign, unit: null });
}
