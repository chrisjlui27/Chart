import { MonomialAlgebra, SignAlgebra, REALS, type GenKind } from './monomial.js';
import type { Mono } from './types.js';

/**
 * A doubling formula (a,b)(c,d) = (first - eps*second, cross), in Bales's notation.
 * first: 'ac' or 'ca'; second: one of b̄d, db̄, bd̄, d̄b; cross: one of dā+bc, ād+cb, ad+c̄b, da+bc̄.
 */
export type FirstTerm = 'ac' | 'ca';
export type SecondTerm = 'b̄d' | 'db̄' | 'bd̄' | 'd̄b';
export type CrossTerm = 'dā+bc' | 'ād+cb' | 'ad+c̄b' | 'da+bc̄';
export interface DoublingFormula {
  first: FirstTerm;
  second: SecondTerm;
  cross: CrossTerm;
}

export const SECOND_TERMS: SecondTerm[] = ['b̄d', 'db̄', 'bd̄', 'd̄b'];
export const CROSS_TERMS: CrossTerm[] = ['dā+bc', 'ād+cb', 'ad+c̄b', 'da+bc̄'];

/** Standard Cayley–Dickson product (a,b)(c,d) = (ac − d̄b, da + bc̄)  (Bales P3ᵀ). */
export const CD_FORMULA: DoublingFormula = { first: 'ac', second: 'd̄b', cross: 'da+bc̄' };
/** Mirror product (a,b)(c,d) = (ca − d̄b, da + bc̄)  (Bales P1ᵀ). */
export const MIRROR_FORMULA: DoublingFormula = { first: 'ca', second: 'd̄b', cross: 'da+bc̄' };

/** Bales's eight admissible doubling products. */
export const BALES: Record<string, DoublingFormula> = {
  P0: { first: 'ca', second: 'b̄d', cross: 'dā+bc' },
  P1: { first: 'ca', second: 'db̄', cross: 'ād+cb' },
  P2: { first: 'ac', second: 'b̄d', cross: 'dā+bc' },
  P3: { first: 'ac', second: 'db̄', cross: 'ād+cb' },
  P0T: { first: 'ca', second: 'bd̄', cross: 'ad+c̄b' },
  P1T: { first: 'ca', second: 'd̄b', cross: 'da+bc̄' },
  P2T: { first: 'ac', second: 'bd̄', cross: 'ad+c̄b' },
  P3T: { first: 'ac', second: 'd̄b', cross: 'da+bc̄' },
};

/** All 32 candidate formulas, named by their components. */
export function allDoublingFormulas(): { name: string; formula: DoublingFormula }[] {
  const out: { name: string; formula: DoublingFormula }[] = [];
  for (const first of ['ac', 'ca'] as FirstTerm[])
    for (const second of SECOND_TERMS)
      for (const cross of CROSS_TERMS) out.push({ name: `(${first}−${second}, ${cross})`, formula: { first, second, cross } });
  return out;
}

export function formulaName(f: DoublingFormula): string {
  for (const [k, v] of Object.entries(BALES)) if (v.first === f.first && v.second === f.second && v.cross === f.cross) return k;
  return `(${f.first}−${f.second}, ${f.cross})`;
}

export interface DoubleOpts {
  /** epsilon: +1 standard (new unit squares to -1), -1 split (squares to +1), 0 dual (squares to 0) */
  eps?: number;
  name?: string;
  genKind?: GenKind;
}

/**
 * Double a monomial algebra A with a given formula: basis of the result is
 * e_g (g < n) for (e_g, 0) and e_{g+n} for (0, e_g).
 */
export function double(A: MonomialAlgebra, formula: DoublingFormula, opts: DoubleOpts = {}): MonomialAlgebra {
  const eps = opts.eps ?? 1;
  const n = A.n;
  const N = 2 * n;
  const idx = new Int32Array(N * N);
  const sgn = new Int8Array(N * N);
  const conjSign = new Int8Array(N);
  for (let g = 0; g < n; g++) {
    conjSign[g] = A.conjSign[g];
    conjSign[g + n] = -1;
  }
  const mul = (x: Mono | null, y: Mono | null) => A.mulMono(x, y);
  const cj = (x: Mono | null) => A.conjMono(x);
  for (let i = 0; i < N; i++) {
    const a: Mono | null = i < n ? { g: i, s: 1 } : null;
    const b: Mono | null = i >= n ? { g: i - n, s: 1 } : null;
    for (let j = 0; j < N; j++) {
      const c: Mono | null = j < n ? { g: j, s: 1 } : null;
      const d: Mono | null = j >= n ? { g: j - n, s: 1 } : null;
      // first component
      const t1 = formula.first === 'ac' ? mul(a, c) : mul(c, a);
      let t2: Mono | null;
      switch (formula.second) {
        case 'b̄d': t2 = mul(cj(b), d); break;
        case 'db̄': t2 = mul(d, cj(b)); break;
        case 'bd̄': t2 = mul(b, cj(d)); break;
        case 'd̄b': t2 = mul(cj(d), b); break;
      }
      // second component
      let u1: Mono | null, u2: Mono | null;
      switch (formula.cross) {
        case 'dā+bc': u1 = mul(d, cj(a)); u2 = mul(b, c); break;
        case 'ād+cb': u1 = mul(cj(a), d); u2 = mul(c, b); break;
        case 'ad+c̄b': u1 = mul(a, d); u2 = mul(cj(c), b); break;
        case 'da+bc̄': u1 = mul(d, a); u2 = mul(b, cj(c)); break;
      }
      let res: Mono | null = null;
      let inSecond = false;
      if (t1) res = t1;
      else if (t2) res = { g: t2.g, s: -eps * t2.s };
      else if (u1) { res = u1; inSecond = true; }
      else if (u2) { res = u2; inSecond = true; }
      const p = i * N + j;
      if (!res || res.s === 0) {
        sgn[p] = 0;
        idx[p] = inSecond ? n : 0;
      } else {
        sgn[p] = res.s as number;
        idx[p] = inSecond ? res.g + n : res.g;
      }
    }
  }
  const name = opts.name ?? `${formulaName(formula)}(${A.name})`;
  if (A instanceof SignAlgebra) {
    const S = new SignAlgebra(A.m + 1, sgn, {
      name,
      conjSign,
      genKinds: [...A.genKinds, opts.genKind ?? (eps === 1 ? 'o' : eps === -1 ? 'u' : 'n')],
    });
    // sanity: the doubling of an XOR-indexed algebra is XOR-indexed
    for (let p = 0; p < N * N; p++) if (sgn[p] !== 0 && idx[p] !== (((p / N) | 0) ^ (p % N))) throw new Error('doubling broke XOR indexing');
    return S;
  }
  return new MonomialAlgebra(N, idx, sgn, { name, conjSign, unit: A.unit });
}

/** Standard Cayley–Dickson double CD(A), with eps = +1 (standard), -1 (split), 0 (dual). */
export function CD(A: MonomialAlgebra, eps = 1, name?: string): MonomialAlgebra {
  return double(A, CD_FORMULA, { eps, name: name ?? (eps === 1 ? `CD(${A.name})` : eps === -1 ? `CDsplit(${A.name})` : `CDdual(${A.name})`) });
}
/** Mirror double M(A). */
export function M(A: MonomialAlgebra, name?: string): MonomialAlgebra {
  return double(A, MIRROR_FORMULA, { name: name ?? `M(${A.name})` });
}

export type TowerStep = 'CD' | 'M' | 'CDsplit' | 'CDdual' | keyof typeof BALES;

/** Apply a word of doubling steps to a base algebra (leftmost step applied first). */
export function tower(base: MonomialAlgebra, word: TowerStep[], name?: string): MonomialAlgebra {
  let A = base;
  for (const step of word) {
    if (step === 'CD') A = CD(A);
    else if (step === 'CDsplit') A = CD(A, -1);
    else if (step === 'CDdual') A = CD(A, 0);
    else if (step === 'M') A = M(A);
    else A = double(A, BALES[step], { name: `${step}(${A.name})` });
  }
  if (name) (A as { name: string }).name = name;
  return A;
}

/** Cayley–Dickson tower CD^k(R): k=1 C, 2 H, 3 O, 4 S, 5 T, ... */
export function cayleyDickson(k: number, name?: string): SignAlgebra {
  const names = ['R', 'C', 'H', 'O', 'S', 'T', 'U3', 'U4', 'U5', 'U6', 'U7'];
  let A: MonomialAlgebra = REALS;
  for (let i = 0; i < k; i++) A = CD(A);
  (A as { name: string }).name = name ?? names[k] ?? `CD^${k}(R)`;
  return A as SignAlgebra;
}

/** Wilmot's ultronion U_m = CD^{m+3}(R): U1 = S, U2 = T, ... */
export function ultronion(m: number): SignAlgebra {
  return cayleyDickson(m + 3, m === 1 ? 'S' : m === 2 ? 'T' : `U${m}`);
}

/** Split Cayley–Dickson algebra A_{q,p}: q imaginary generators then p unitary generators (Wilmot §5). */
export function splitCD(q: number, p: number, name?: string): SignAlgebra {
  let A: MonomialAlgebra = REALS;
  for (let i = 0; i < q; i++) A = CD(A, 1);
  for (let i = 0; i < p; i++) A = CD(A, -1);
  (A as { name: string }).name = name ?? `A(${q},${p})`;
  return A as SignAlgebra;
}
