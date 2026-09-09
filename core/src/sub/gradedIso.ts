import { SignAlgebra } from '../algebra/monomial.js';
import { F2System, applyLinear } from '../linalg/f2.js';

export interface GradedIso {
  /** images of the generators 1<<i */
  cols: number[];
  /** one sign choice lambda: G -> ±1 */
  lambda: Int8Array;
  /** number of sign choices compatible with this sigma */
  lambdaCount: number;
}

/**
 * Consistency of the sign system for a partial sigma on the subspace spanned by the first k generators:
 * mu(g) + mu(h) + mu(g^h) = c(g,h), c = [F_B(sigma g, sigma h) != F_A(g,h)].
 */
function solveSigns(A: SignAlgebra, B: SignAlgebra, cols: number[], k: number): F2System | null {
  const nk = 1 << k;
  const sys = new F2System(nk);
  sys.addEquation([0], 0); // mu(0) = 0 (unit maps to unit)
  for (let g = 0; g < nk; g++) {
    const sg = applyLinear(cols, g);
    for (let h = g; h < nk; h++) {
      const fa = A.F(g, h);
      const fb = B.F(sg, applyLinear(cols, h));
      if ((fa === 0) !== (fb === 0)) return null;
      if (fa === 0) continue;
      const rhs = fa === fb ? 0 : 1;
      const vars = g === h ? [] : [g, h, g ^ h];
      // mu(g)+mu(h)+mu(g^h) with repeated variables cancelling mod 2
      if (g === h) { if (!sys.addEquation([0], rhs)) return null; continue; }
      if (!sys.addEquation(vars, rhs)) return null;
    }
  }
  return sys;
}

export interface GradedSearchOpts {
  /** stop after this many sigma solutions (default: unlimited) */
  limit?: number;
  /** count all lambda solutions per sigma (default true) */
  countLambdas?: boolean;
}

/**
 * Graded isomorphisms A -> B: e_g -> lambda(g) e_{sigma g}, sigma in GL(m,2). Depth-first over generator images
 * with pruning by sign-consistency on the subalgebra spanned so far.
 */
export function gradedIsomorphisms(A: SignAlgebra, B: SignAlgebra, opts: GradedSearchOpts = {}): { isos: GradedIso[]; sigmaCount: number; totalCount: number } {
  if (A.m !== B.m) return { isos: [], sigmaCount: 0, totalCount: 0 };
  const m = A.m, n = A.n;
  const isos: GradedIso[] = [];
  let sigmaCount = 0, totalCount = 0;
  const cols: number[] = [];
  const spanSet = new Uint8Array(n);
  spanSet[0] = 1;
  let spanList: number[] = [0];
  const limit = opts.limit ?? Infinity;
  const rec = (i: number): boolean => {
    if (i === m) {
      const sys = solveSigns(A, B, cols, m)!;
      const sol = sys.solution()!;
      const lambda = new Int8Array(n);
      for (let g = 0; g < n; g++) lambda[g] = sol[g] ? -1 : 1;
      const lambdaCount = 2 ** sys.nullity;
      sigmaCount++;
      totalCount += lambdaCount;
      if (isos.length < limit) isos.push({ cols: cols.slice(), lambda, lambdaCount });
      return isos.length >= limit && opts.limit !== undefined;
    }
    for (let v = 1; v < n; v++) {
      if (spanSet[v]) continue;
      cols.push(v);
      const sys = solveSigns(A, B, cols, i + 1);
      if (sys) {
        const added: number[] = [];
        for (const s of spanList) { const w = s ^ v; spanSet[w] = 1; added.push(w); }
        const saved = spanList;
        spanList = spanList.concat(added);
        const stop = rec(i + 1);
        spanList = saved;
        for (const w of added) spanSet[w] = 0;
        if (stop) { cols.pop(); return true; }
      }
      cols.pop();
    }
    return false;
  };
  rec(0);
  return { isos, sigmaCount, totalCount };
}

export function isGradedIsomorphic(A: SignAlgebra, B: SignAlgebra): boolean {
  return gradedIsomorphisms(A, B, { limit: 1 }).isos.length > 0;
}
/** Order of the group of graded automorphisms (sigma, lambda). */
export function gradedAutomorphismOrder(A: SignAlgebra): { order: number; sigmas: number } {
  const r = gradedIsomorphisms(A, A);
  return { order: r.totalCount, sigmas: r.sigmaCount };
}
/** Apply a graded iso to build the image sign function and verify it equals B (self-check). */
export function verifyGradedIso(A: SignAlgebra, B: SignAlgebra, iso: GradedIso): boolean {
  for (let g = 0; g < A.n; g++)
    for (let h = 0; h < A.n; h++) {
      const sg = applyLinear(iso.cols, g), sh = applyLinear(iso.cols, h);
      const lhs = B.F(sg, sh) * iso.lambda[g ^ h];
      const rhs = A.F(g, h) * iso.lambda[g] * iso.lambda[h];
      if (lhs !== rhs) return false;
    }
  return true;
}
