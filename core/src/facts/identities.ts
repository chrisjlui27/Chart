import type { Algebra } from '../algebra/types.js';
import { MonomialAlgebra } from '../algebra/monomial.js';
import { mul, sub, add, associator, commutator, normOf, conj, dot, normInf, basisVec, unitVec, type Vec } from '../ops/element.js';

export interface IdentityResult {
  holds: boolean;
  residual: number;
  witness?: Vec[];
}

/** Deterministic pseudo-random vectors (xorshift) so tests are reproducible. */
export function randomVectors(n: number, count: number, seed = 12345): Vec[] {
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return (s % 2000003) / 2000003 - 0.5;
  };
  return Array.from({ length: count }, () => Float64Array.from({ length: n }, () => rnd()));
}

function multilinearBasisCheck(A: MonomialAlgebra, arity: 2 | 3, f: (idx: number[]) => number): IdentityResult {
  const n = A.n;
  const idx = [0, 0, 0];
  const rec = (k: number): IdentityResult | null => {
    if (k === arity) {
      const r = f(idx.slice(0, arity));
      return r !== 0 ? { holds: false, residual: r, witness: idx.slice(0, arity).map((g) => basisVec(A, g)) } : null;
    }
    for (let g = 0; g < n; g++) { idx[k] = g; const r = rec(k + 1); if (r) return r; }
    return null;
  };
  return rec(0) ?? { holds: true, residual: 0 };
}

function numericCheck(A: Algebra, f: (v: Vec[]) => Vec, arity: number, samples = 6, tol = 1e-9): IdentityResult {
  let worst = 0;
  let witness: Vec[] | undefined;
  for (let t = 0; t < samples; t++) {
    const vs = randomVectors(A.n, arity, 1000 + 7919 * t);
    const r = normInf(f(vs));
    if (r > worst) { worst = r; witness = vs; }
  }
  return worst <= tol ? { holds: true, residual: worst } : { holds: false, residual: worst, witness };
}

export function isCommutative(A: Algebra): IdentityResult {
  if (A instanceof MonomialAlgebra) return multilinearBasisCheck(A, 2, ([g, h]) => normInf(commutator(A, basisVec(A, g), basisVec(A, h))));
  return numericCheck(A, ([x, y]) => commutator(A, x, y), 2);
}
export function isAssociative(A: Algebra): IdentityResult {
  if (A instanceof MonomialAlgebra) return multilinearBasisCheck(A, 3, ([g, h, k]) => normInf(associator(A, basisVec(A, g), basisVec(A, h), basisVec(A, k))));
  return numericCheck(A, ([x, y, z]) => associator(A, x, y, z), 3);
}
/** Alternative: [x,x,y] = 0 = [y,x,x]; linearised on the basis: [x,y,z]+[y,x,z] = 0 and [x,y,z]+[x,z,y] = 0. */
export function isAlternative(A: Algebra): IdentityResult {
  const f = (x: Vec, y: Vec, z: Vec) => Math.max(normInf(add(associator(A, x, y, z), associator(A, y, x, z))), normInf(add(associator(A, x, y, z), associator(A, x, z, y))));
  if (A instanceof MonomialAlgebra) return multilinearBasisCheck(A, 3, ([g, h, k]) => f(basisVec(A, g), basisVec(A, h), basisVec(A, k)));
  return numericCheck(A, ([x, y]) => add(associator(A, x, x, y), associator(A, y, x, x)), 2);
}
/** Flexible: [x,y,x] = 0; linearised: [x,y,z] + [z,y,x] = 0. */
export function isFlexible(A: Algebra): IdentityResult {
  const f = (x: Vec, y: Vec, z: Vec) => normInf(add(associator(A, x, y, z), associator(A, z, y, x)));
  if (A instanceof MonomialAlgebra) return multilinearBasisCheck(A, 3, ([g, h, k]) => f(basisVec(A, g), basisVec(A, h), basisVec(A, k)));
  return numericCheck(A, ([x, y]) => associator(A, x, y, x), 2);
}
/** Power-associative to degree 4 (numerical): x²x = xx², (x²x)x = x²x² = x(xx²). */
export function isPowerAssociative(A: Algebra): IdentityResult {
  return numericCheck(A, ([x]) => {
    const x2 = mul(A, x, x);
    const x3a = mul(A, x2, x), x3b = mul(A, x, x2);
    const x4a = mul(A, x3a, x), x4b = mul(A, x2, x2), x4c = mul(A, x, x3b);
    const r = add(sub(x3a, x3b), add(sub(x4a, x4b), sub(x4b, x4c)));
    return r;
  }, 1);
}
/** Quadratic: x² − 2t(x)x + N(x) = 0 with t(x) = scalar part of x, N(x) = scalar part of x x̄. */
export function isQuadratic(A: Algebra): IdentityResult {
  return numericCheck(A, ([x]) => {
    const u = A.unit ?? 0;
    const t = x[u];
    const { N } = normOf(A, x);
    // x² − 2 t x + N·1
    return add(sub(mul(A, x, x), x.map((v) => 2 * t * v)), unitVec(A).map((v) => N * v));
  }, 1);
}
/** Composition law N(xy) = N(x)N(y). */
export function isComposition(A: Algebra): IdentityResult {
  return numericCheck(A, ([x, y]) => Float64Array.of(normOf(A, mul(A, x, y)).N - normOf(A, x).N * normOf(A, y).N), 2);
}
/** Adjoint identity ⟨xy, z⟩ = ⟨y, x̄ z⟩. */
export function adjointIdentity(A: Algebra): IdentityResult {
  return numericCheck(A, ([x, y, z]) => Float64Array.of(dot(mul(A, x, y), z) - dot(y, mul(A, conj(A, x), z))), 3);
}
/** The three Moufang identities, numerically. */
export function moufang(A: Algebra): { left: IdentityResult; right: IdentityResult; middle: IdentityResult } {
  const left = numericCheck(A, ([x, y, z]) => sub(mul(A, z, mul(A, x, mul(A, z, y))), mul(A, mul(A, mul(A, z, x), z), y)), 3);
  const right = numericCheck(A, ([x, y, z]) => sub(mul(A, mul(A, mul(A, y, z), x), z), mul(A, y, mul(A, z, mul(A, x, z)))), 3);
  const middle = numericCheck(A, ([x, y, z]) => sub(mul(A, mul(A, z, x), mul(A, y, z)), mul(A, mul(A, z, mul(A, x, y)), z)), 3);
  return { left, right, middle };
}
/** Jordan identity (x²y)x = x²(yx). */
export function jordan(A: Algebra): IdentityResult {
  return numericCheck(A, ([x, y]) => { const x2 = mul(A, x, x); return sub(mul(A, mul(A, x2, y), x), mul(A, x2, mul(A, y, x))); }, 2);
}
/** x x̄ is scalar for all x (norm form exists). */
export function hasScalarNorm(A: Algebra): IdentityResult {
  if (!A.conjVec) return { holds: false, residual: NaN };
  return numericCheck(A, ([x]) => { const e = mul(A, x, conj(A, x)); const u = A.unit ?? 0; const r = Float64Array.from(e); r[u] = 0; return r; }, 1);
}
/** Wilmot's pure trace: sum of squares of the pure basis elements (as a scalar multiple of the unit). */
export function pureTrace(A: MonomialAlgebra): number {
  let t = 0;
  for (let g = 0; g < A.n; g++) if (g !== A.unit) t += A.square(g);
  return t;
}

export interface FactsSheet {
  name: string;
  dim: number;
  commutative: boolean;
  associative: boolean;
  alternative: boolean;
  flexible: boolean;
  powerAssociative: boolean;
  quadratic: boolean;
  composition: boolean;
  adjoint: boolean;
  scalarNorm: boolean;
  moufang: { left: boolean; right: boolean; middle: boolean };
  jordan: boolean;
  pureTrace?: number;
  squares?: { plus: number; minus: number; zero: number };
}

export function facts(A: Algebra): FactsSheet {
  const mf = moufang(A);
  const sheet: FactsSheet = {
    name: A.name, dim: A.n,
    commutative: isCommutative(A).holds, associative: isAssociative(A).holds, alternative: isAlternative(A).holds,
    flexible: isFlexible(A).holds, powerAssociative: isPowerAssociative(A).holds, quadratic: A.unit !== null && !!A.conjVec && isQuadratic(A).holds,
    composition: !!A.conjVec && isComposition(A).holds, adjoint: !!A.conjVec && adjointIdentity(A).holds, scalarNorm: hasScalarNorm(A).holds,
    moufang: { left: mf.left.holds, right: mf.right.holds, middle: mf.middle.holds }, jordan: jordan(A).holds,
  };
  if (A instanceof MonomialAlgebra) {
    sheet.pureTrace = pureTrace(A);
    const sq = { plus: 0, minus: 0, zero: 0 };
    for (let g = 0; g < A.n; g++) { if (g === A.unit) continue; const s = A.square(g); if (s > 0) sq.plus++; else if (s < 0) sq.minus++; else sq.zero++; }
    sheet.squares = sq;
  }
  return sheet;
}
