/** Small dense linear algebra on row-major Float64Array matrices. */

export function matMul(A: Float64Array, B: Float64Array, n: number, m: number, p: number): Float64Array {
  // A: n x m, B: m x p
  const C = new Float64Array(n * p);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < m; k++) {
      const a = A[i * m + k];
      if (a === 0) continue;
      for (let j = 0; j < p; j++) C[i * p + j] += a * B[k * p + j];
    }
  return C;
}
export function matVec(A: Float64Array, x: Float64Array, n: number, m: number): Float64Array {
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < m; k++) s += A[i * m + k] * x[k];
    y[i] = s;
  }
  return y;
}
export function transpose(A: Float64Array, n: number, m: number): Float64Array {
  const T = new Float64Array(m * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) T[j * n + i] = A[i * m + j];
  return T;
}
export function identity(n: number): Float64Array {
  const I = new Float64Array(n * n);
  for (let i = 0; i < n; i++) I[i * n + i] = 1;
  return I;
}

/** Row-reduce a copy of A (rows x cols); returns rank and the reduced matrix with pivot columns. */
export function rref(A: Float64Array, rows: number, cols: number, tol = 1e-9): { R: Float64Array; rank: number; pivots: number[] } {
  const R = Float64Array.from(A);
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let best = r, bv = Math.abs(R[r * cols + c]);
    for (let i = r + 1; i < rows; i++) {
      const v = Math.abs(R[i * cols + c]);
      if (v > bv) { bv = v; best = i; }
    }
    if (bv <= tol) continue;
    if (best !== r) for (let j = 0; j < cols; j++) { const t = R[r * cols + j]; R[r * cols + j] = R[best * cols + j]; R[best * cols + j] = t; }
    const pv = R[r * cols + c];
    for (let j = 0; j < cols; j++) R[r * cols + j] /= pv;
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const f = R[i * cols + c];
      if (f === 0) continue;
      for (let j = 0; j < cols; j++) R[i * cols + j] -= f * R[r * cols + j];
    }
    pivots.push(c);
    r++;
  }
  return { R, rank: r, pivots };
}
export function rankOf(A: Float64Array, rows: number, cols: number, tol = 1e-9): number {
  return rref(A, rows, cols, tol).rank;
}
/** Null space basis of A (rows x cols), as vectors of length cols. */
export function nullSpace(A: Float64Array, rows: number, cols: number, tol = 1e-9): Float64Array[] {
  const { R, rank, pivots } = rref(A, rows, cols, tol);
  const isPiv = new Uint8Array(cols);
  pivots.forEach((p) => (isPiv[p] = 1));
  const out: Float64Array[] = [];
  for (let f = 0; f < cols; f++) {
    if (isPiv[f]) continue;
    const x = new Float64Array(cols);
    x[f] = 1;
    for (let i = 0; i < rank; i++) x[pivots[i]] = -R[i * cols + f];
    out.push(x);
  }
  return out;
}
/** Solve A x = b for square A (n x n) by Gaussian elimination with partial pivoting; returns null if singular. */
export function solve(A: Float64Array, b: Float64Array, n: number, tol = 1e-12): Float64Array | null {
  const M = new Float64Array(n * (n + 1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) M[i * (n + 1) + j] = A[i * n + j];
    M[i * (n + 1) + n] = b[i];
  }
  const w = n + 1;
  for (let c = 0; c < n; c++) {
    let best = c, bv = Math.abs(M[c * w + c]);
    for (let i = c + 1; i < n; i++) { const v = Math.abs(M[i * w + c]); if (v > bv) { bv = v; best = i; } }
    if (bv <= tol) return null;
    if (best !== c) for (let j = 0; j < w; j++) { const t = M[c * w + j]; M[c * w + j] = M[best * w + j]; M[best * w + j] = t; }
    for (let i = 0; i < n; i++) {
      if (i === c) continue;
      const f = M[i * w + c] / M[c * w + c];
      if (f === 0) continue;
      for (let j = c; j < w; j++) M[i * w + j] -= f * M[c * w + j];
    }
  }
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = M[i * w + n] / M[i * w + i];
  return x;
}
/** Determinant of a square matrix (LU with partial pivoting). */
export function det(A: Float64Array, n: number): number {
  const M = Float64Array.from(A);
  let d = 1;
  for (let c = 0; c < n; c++) {
    let best = c, bv = Math.abs(M[c * n + c]);
    for (let i = c + 1; i < n; i++) { const v = Math.abs(M[i * n + c]); if (v > bv) { bv = v; best = i; } }
    if (bv === 0) return 0;
    if (best !== c) { for (let j = 0; j < n; j++) { const t = M[c * n + j]; M[c * n + j] = M[best * n + j]; M[best * n + j] = t; } d = -d; }
    d *= M[c * n + c];
    for (let i = c + 1; i < n; i++) {
      const f = M[i * n + c] / M[c * n + c];
      if (f === 0) continue;
      for (let j = c; j < n; j++) M[i * n + j] -= f * M[c * n + j];
    }
  }
  return d;
}
/** Eigenvalues (ascending) and eigenvectors (columns) of a symmetric matrix by cyclic Jacobi. */
export function symEig(S: Float64Array, n: number, tol = 1e-12): { values: Float64Array; vectors: Float64Array } {
  const A = Float64Array.from(S);
  const V = identity(n);
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i * n + j] ** 2;
    if (off < tol * tol) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        const apq = A[p * n + q];
        if (Math.abs(apq) < 1e-300) continue;
        const app = A[p * n + p], aqq = A[q * n + q];
        const theta = (aqq - app) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k * n + p], akq = A[k * n + q];
          A[k * n + p] = c * akp - s * akq;
          A[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p * n + k], aqk = A[q * n + k];
          A[p * n + k] = c * apk - s * aqk;
          A[q * n + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k * n + p], vkq = V[k * n + q];
          V[k * n + p] = c * vkp - s * vkq;
          V[k * n + q] = s * vkp + c * vkq;
        }
      }
  }
  const values = new Float64Array(n);
  for (let i = 0; i < n; i++) values[i] = A[i * n + i];
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[a] - values[b]);
  const sv = new Float64Array(n), vec = new Float64Array(n * n);
  order.forEach((src, dst) => {
    sv[dst] = values[src];
    for (let k = 0; k < n; k++) vec[k * n + dst] = V[k * n + src];
  });
  return { values: sv, vectors: vec };
}
/** Singular values of A (rows x cols) via eigenvalues of A^T A. */
export function singularValues(A: Float64Array, rows: number, cols: number): Float64Array {
  const AT = transpose(A, rows, cols);
  const G = matMul(AT, A, cols, rows, cols);
  const { values } = symEig(G, cols);
  return values.map((v) => Math.sqrt(Math.max(v, 0)));
}
/** Group nearly-equal values: returns [{value, multiplicity}] ascending. */
export function multiplicities(values: Float64Array | number[], tol = 1e-6): { value: number; mult: number }[] {
  const out: { value: number; mult: number }[] = [];
  for (const v of Array.from(values).sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.value - v) <= tol) last.mult++;
    else out.push({ value: v, mult: 1 });
  }
  return out;
}
/** Matrix exponential by scaling and squaring with Taylor series. */
export function expm(A: Float64Array, n: number): Float64Array {
  let norm = 0;
  for (let i = 0; i < n * n; i++) norm = Math.max(norm, Math.abs(A[i]));
  let s = 0;
  while (norm > 0.5) { norm /= 2; s++; }
  const B = A.map((v) => v / 2 ** s);
  let term = identity(n);
  const R = identity(n);
  for (let k = 1; k <= 20; k++) {
    term = matMul(term, B, n, n, n).map((v) => v / k);
    for (let i = 0; i < n * n; i++) R[i] += term[i];
  }
  let E = R;
  for (let i = 0; i < s; i++) E = matMul(E, E, n, n, n);
  return E;
}
