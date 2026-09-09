import type { Algebra } from '../algebra/types.js';
import { MonomialAlgebra } from '../algebra/monomial.js';
import { solve, rankOf, symEig, matMul, transpose } from '../linalg/dense.js';

export type Vec = Float64Array;

export function vec(n: number, entries: Record<number, number> | number[] = {}): Vec {
  const v = new Float64Array(n);
  if (Array.isArray(entries)) entries.forEach((x, i) => (v[i] = x));
  else for (const [k, x] of Object.entries(entries)) v[Number(k)] = x;
  return v;
}
export function basisVec(A: Algebra, g: number): Vec {
  const v = new Float64Array(A.n);
  v[g] = 1;
  return v;
}
export function add(x: Vec, y: Vec): Vec {
  const r = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) r[i] = x[i] + y[i];
  return r;
}
export function sub(x: Vec, y: Vec): Vec {
  const r = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) r[i] = x[i] - y[i];
  return r;
}
export function scale(x: Vec, s: number): Vec {
  return x.map((v) => v * s);
}
export function dot(x: Vec, y: Vec): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * y[i];
  return s;
}
export function norm2(x: Vec): number {
  return dot(x, x);
}
export function normInf(x: Vec): number {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  return m;
}
export function mul(A: Algebra, x: Vec, y: Vec): Vec {
  return A.mulVec(x, y);
}
export function conj(A: Algebra, x: Vec): Vec {
  if (!A.conjVec) throw new Error(`${A.name} has no involution`);
  return A.conjVec(x);
}
export function unitVec(A: Algebra): Vec {
  if (A.unit === null) throw new Error(`${A.name} is not unital`);
  return basisVec(A, A.unit);
}
/** x x̄ (an element); its scalar part is N(x) when the algebra is quadratic. */
export function normElement(A: Algebra, x: Vec): Vec {
  return mul(A, x, conj(A, x));
}
/** N(x) = scalar part of x x̄; also reports whether x x̄ is scalar. */
export function normOf(A: Algebra, x: Vec): { N: number; scalar: boolean } {
  const e = normElement(A, x);
  const u = A.unit ?? 0;
  let off = 0;
  for (let i = 0; i < A.n; i++) if (i !== u) off = Math.max(off, Math.abs(e[i]));
  return { N: e[u], scalar: off < 1e-9 * (1 + Math.abs(e[u])) };
}
export function commutator(A: Algebra, x: Vec, y: Vec): Vec {
  return sub(mul(A, x, y), mul(A, y, x));
}
/** [x,y,z] = (xy)z − x(yz) */
export function associator(A: Algebra, x: Vec, y: Vec, z: Vec): Vec {
  return sub(mul(A, mul(A, x, y), z), mul(A, x, mul(A, y, z)));
}
export function Lmat(A: Algebra, x: Vec): Float64Array {
  if (A instanceof MonomialAlgebra) return A.L(x);
  const n = A.n, M = new Float64Array(n * n);
  for (let h = 0; h < n; h++) {
    const col = A.mulVec(x, basisVec(A, h));
    for (let k = 0; k < n; k++) M[k * n + h] = col[k];
  }
  return M;
}
export function Rmat(A: Algebra, x: Vec): Float64Array {
  if (A instanceof MonomialAlgebra) return A.R(x);
  const n = A.n, M = new Float64Array(n * n);
  for (let g = 0; g < n; g++) {
    const col = A.mulVec(basisVec(A, g), x);
    for (let k = 0; k < n; k++) M[k * n + g] = col[k];
  }
  return M;
}
/** Inverse by solving L_x y = 1; null if x is not (left-)invertible. */
export function inverse(A: Algebra, x: Vec): Vec | null {
  return solve(Lmat(A, x), unitVec(A), A.n);
}
/** dim Ann(x) = dim ker L_x (numerical). */
export function annihilatorDim(A: Algebra, x: Vec, tol = 1e-9): number {
  return A.n - rankOf(Lmat(A, x), A.n, A.n, tol);
}
/** The symmetric operator alt_x = L_x̄ L_x − N(x) I (when the adjoint identity holds). */
export function alternatorMatrix(A: Algebra, x: Vec): Float64Array {
  const n = A.n;
  const Lx = Lmat(A, x), Lxb = Lmat(A, conj(A, x));
  const P = matMul(Lxb, Lx, n, n, n);
  const N = normOf(A, x).N;
  for (let i = 0; i < n; i++) P[i * n + i] -= N;
  return P;
}
/** Spectrum of the stretch operator L_x̄ L_x / N(x): ascending eigenvalues with multiplicities. */
export function stretchSpectrum(A: Algebra, x: Vec, tol = 1e-7): { value: number; mult: number }[] {
  const n = A.n;
  const Lx = Lmat(A, x), Lxb = Lmat(A, conj(A, x));
  const P = matMul(Lxb, Lx, n, n, n);
  // symmetrise to guard against tiny asymmetry
  const PT = transpose(P, n, n);
  for (let i = 0; i < n * n; i++) P[i] = (P[i] + PT[i]) / 2;
  const N = normOf(A, x).N;
  const { values } = symEig(P, n);
  const out: { value: number; mult: number }[] = [];
  for (const v of values) {
    const s = v / N;
    const last = out[out.length - 1];
    if (last && Math.abs(last.value - s) <= tol) last.mult++;
    else out.push({ value: s, mult: 1 });
  }
  return out;
}
/** Left-nested power x^k = x(x(...x)) — unambiguous in power-associative algebras. */
export function power(A: Algebra, x: Vec, k: number): Vec {
  if (k === 0) return unitVec(A);
  let r = x;
  for (let i = 1; i < k; i++) r = mul(A, x, r);
  return r;
}
/** exp(x) by scaling and squaring on the element (requires power-associativity for uniqueness). */
export function exp(A: Algebra, x: Vec): Vec {
  let s = 0;
  let m = normInf(x);
  while (m > 0.25) { m /= 2; s++; }
  const y = scale(x, 1 / 2 ** s);
  let term = unitVec(A);
  let acc = unitVec(A);
  for (let k = 1; k <= 24; k++) {
    term = scale(mul(A, term, y), 1 / k);
    acc = add(acc, term);
    if (normInf(term) < 1e-18) break;
  }
  for (let i = 0; i < s; i++) acc = mul(A, acc, acc);
  return acc;
}
/** Parse an element from a string like "1 + 2*e1 - e9" or "o1 - o1234" against the algebra's labels. */
export function parseElement(A: Algebra & { parseLabel?: (s: string) => number }, text: string): Vec {
  const v = new Float64Array(A.n);
  const cleaned = text.replace(/\s+/g, '');
  const terms = cleaned.match(/[+-]?[^+-]+/g) ?? [];
  for (const t of terms) {
    const mt = /^([+-]?)(\d*\.?\d*)\*?([A-Za-z][A-Za-z0-9,]*)?$/.exec(t);
    if (!mt) throw new Error(`cannot parse term '${t}'`);
    const sign = mt[1] === '-' ? -1 : 1;
    const coef = mt[2] === '' ? 1 : parseFloat(mt[2]);
    let idx = 0;
    if (mt[3]) {
      const li = A.labels.indexOf(mt[3]);
      if (li >= 0) idx = li;
      else if (A.parseLabel) idx = A.parseLabel(mt[3]);
      else throw new Error(`unknown basis label '${mt[3]}'`);
    }
    v[idx] += sign * coef;
  }
  return v;
}
export function formatElement(A: Algebra, x: Vec, labels?: readonly string[], tol = 1e-12): string {
  const L = labels ?? A.labels;
  const parts: string[] = [];
  for (let i = 0; i < A.n; i++) {
    const c = x[i];
    if (Math.abs(c) < tol) continue;
    const mag = Math.abs(c);
    const coef = Math.abs(mag - 1) < tol && i !== (A.unit ?? -1) ? '' : String(Number(mag.toFixed(10)));
    const lab = i === (A.unit ?? -1) ? '' : L[i];
    parts.push(`${parts.length === 0 ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + '}${coef}${coef && lab ? '' : ''}${lab}`);
  }
  return parts.length ? parts.join('') : '0';
}
