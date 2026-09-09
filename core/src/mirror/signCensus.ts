import { SignAlgebra } from '../algebra/monomial.js';
import { preset } from '../algebra/presets.js';
import { F2System } from '../linalg/f2.js';
import { hyperplanes } from '../sub/subspaces.js';
import { spanElements } from '../linalg/f2.js';
import { gradedIsomorphisms } from '../sub/gradedIso.js';
import { derivations } from '../facts/der.js';
import { octaveConfiguration } from './census.js';
import { enumerateTriads, summarize, triadType as triadTypeOf } from '../triads/triads.js';

/**
 * Sign functions on F2^4 with every basis line a quaternion algebra and the founding octave V = {0..7} carrying the
 * standard octonion signs. The free data are the orientations of the 28 lines outside V, one bit each:
 * for p in V\0 and q outside V with q < p^q, bit(p,q) says e_p e_q = -e_{p^q} (1) or +e_{p^q} (0).
 * Everything else follows from anticommutation and line associativity.
 */
export interface CensusConfig { bits: number; F: Int8Array }

const N = 16;
const lineBits: { p: number; q: number; bit: number }[] = [];
const bitOf = new Map<string, number>();
(() => {
  let k = 0;
  for (let p = 1; p < 8; p++)
    for (let q = 8; q < 16; q++) {
      const r = p ^ q;
      if (r < q) continue;
      lineBits.push({ p, q, bit: k });
      bitOf.set(`${p},${q}`, k);
      k++;
    }
})();
export const CENSUS_BITS = lineBits.length; // 28

/** Build the full sign function from the 28 bits. */
export function censusSignFunction(bits: number): Int8Array {
  const O = preset('O') as SignAlgebra;
  const F = new Int8Array(N * N);
  for (let g = 0; g < N; g++) { F[g * N] = 1; F[g] = 1; }
  for (let g = 1; g < N; g++) F[g * N + g] = -1;
  // inside V: octonion signs
  for (let g = 1; g < 8; g++) for (let h = 1; h < 8; h++) if (g !== h) F[g * N + h] = O.F(g, h);
  // lines outside V: {p, q, r=p^q} with p in V, q,r outside V. Orientation s: e_p e_q = s e_r.
  for (const { p, q, bit } of lineBits) {
    const r = p ^ q;
    const s = (bits >> bit) & 1 ? -1 : 1;
    // quaternion line with e_p e_q = s e_r: e_q e_r = s e_p, e_r e_p = s e_q, and anticommutation
    F[p * N + q] = s; F[q * N + p] = -s;
    F[q * N + r] = s; F[r * N + q] = -s;
    F[r * N + p] = s; F[p * N + r] = -s;
  }
  return F;
}
export function censusAlgebra(bits: number): SignAlgebra {
  return new SignAlgebra(4, censusSignFunction(bits), { name: `census#${bits}` });
}

/** The 28 bits of a given sign function on F2^4 whose founding octave is standard (or null if it is not of census form). */
export function censusBitsOf(A: SignAlgebra): number | null {
  if (A.m !== 4) return null;
  let bits = 0;
  for (const { p, q, bit } of lineBits) { const s = A.F(p, q); if (s === 0) return null; if (s < 0) bits |= 1 << bit; }
  const F = censusSignFunction(bits);
  for (let i = 0; i < N * N; i++) if (F[i] !== A.sgn[i]) return null;
  return bits;
}

/**
 * ϕ(g,h,k) = F(g,h)F(g^h,k)F(h,k)F(g,h^k) as an affine function of the bits: returns {mask, const} with
 * ϕ = -1  iff  parity(bits & mask) ^ const = 1.
 */
function phiAffine(g: number, h: number, k: number): { mask: number; c: number } {
  let mask = 0, c = 0;
  const F0 = censusSignFunction(0);
  const term = (x: number, y: number) => {
    // sign F(x,y) = base sign (bits=0) times (-1)^{bit} if the pair lies on a free line
    if (F0[x * N + y] < 0) c ^= 1;
    const lp = x < 8 && x > 0 && y >= 8 ? { p: x, q: y } : y < 8 && y > 0 && x >= 8 ? { p: y, q: x } : x >= 8 && y >= 8 ? { p: x ^ y, q: Math.min(x, y) } : null;
    if (lp) {
      const r = lp.p ^ lp.q;
      const key = r < lp.q ? `${lp.p},${r}` : `${lp.p},${lp.q}`;
      const b = bitOf.get(key)!;
      mask ^= 1 << b;
    }
  };
  term(g, h); term(g ^ h, k); term(h, k); term(g, h ^ k);
  return { mask, c };
}

/** Affine conditions (over F2) for a hyperplane H to be an octonion algebra: every one of its 28 triads is type X. */
function octaveConditions(H: number[]): { mask: number; c: number }[] {
  const els = spanElements(H).filter((g) => g !== 0);
  const conds: { mask: number; c: number }[] = [];
  for (let i = 0; i < els.length; i++)
    for (let j = i + 1; j < els.length; j++)
      for (let k = j + 1; k < els.length; k++) {
        const [b, cc, d] = [els[i], els[j], els[k]];
        if (d === (b ^ cc)) continue;
        // types 1,2,3 all non-zero: ϕ(b,d,c) = ϕ(b,c,d) = ϕ(c,b,d) = -1
        for (const [x, y, z] of [[b, d, cc], [b, cc, d], [cc, b, d]]) { const a = phiAffine(x, y, z); conds.push({ mask: a.mask, c: a.c ^ 1 }); }
      }
  return conds;
}

export interface CensusRow { bits: number; octaves: number; dimDer?: number; isoClass?: number; isS?: boolean; isSprime?: boolean }

/**
 * All census configurations with at least `minOctaves` octonion hyperplanes (V always counts), found by solving the
 * affine systems for every choice of `minOctaves` hyperplanes. Returns unique configurations with their octave counts.
 */
export function censusWithOctaves(minOctaves = 8): CensusRow[] {
  const hs = hyperplanes(4);
  const conds = hs.map(octaveConditions);
  const isV = hs.map((h) => spanElements(h).every((g) => g < 8));
  const found = new Map<number, number>();
  const idxs = hs.map((_, i) => i);
  const choose = (start: number, chosen: number[]) => {
    if (chosen.length === minOctaves - 1) { // V is always an octave
      const sys = new F2System(CENSUS_BITS);
      for (const i of chosen) for (const { mask, c } of conds[i]) {
        const vars: number[] = [];
        for (let b = 0; b < CENSUS_BITS; b++) if ((mask >> b) & 1) vars.push(b);
        if (!sys.addEquation(vars, c)) return;
      }
      const sol = sys.solution()!;
      const ns = sys.nullSpace();
      const base = sol.reduce((acc, v, i) => acc | (v ? 1 << i : 0), 0);
      const gens = ns.map((v) => v.reduce((acc, x, i) => acc | (x ? 1 << i : 0), 0));
      const total = 1 << gens.length;
      for (let t = 0; t < total; t++) {
        let bits = base;
        for (let i = 0; i < gens.length; i++) if ((t >> i) & 1) bits ^= gens[i];
        if (!found.has(bits)) {
          // exact octave count for this configuration
          let count = 0;
          for (let i = 0; i < hs.length; i++) if (isV[i] || conds[i].every(({ mask, c }) => (popcount(bits & mask) & 1) === c)) count++;
          found.set(bits, count);
        }
      }
      return;
    }
    for (let i = start; i < idxs.length; i++) { if (isV[i]) continue; chosen.push(i); choose(i + 1, chosen); chosen.pop(); }
  };
  choose(0, []);
  // V is always an octave, so minOctaves-1 others are chosen
  return [...found].map(([bits, octaves]) => ({ bits, octaves })).filter((r) => r.octaves >= minOctaves);
}
function popcount(x: number): number { let c = 0; while (x) { c += x & 1; x >>>= 1; } return c; }

/**
 * Sign changes e_g -> λ(g) e_g act on the 28 bits linearly: a line (p,q) flips iff λ(p)λ(q)λ(p^q) = -1. The λ that keep
 * the founding octave's signs are the characters of V times arbitrary signs on the complement (2^11 of them); their
 * effect is a subspace W of F2^28. Configurations are reduced to a canonical representative modulo W.
 */
export function signChangeSubspace(): number[] {
  const gens: number[] = [];
  for (let q0 = 8; q0 < 16; q0++) { let v = 0; for (const { p, q, bit } of lineBits) if (q === q0 || (p ^ q) === q0) v |= 1 << bit; gens.push(v); }
  for (const w of [1, 2, 4]) { let v = 0; for (const { p, bit } of lineBits) if (popcount(p & w) & 1) v |= 1 << bit; gens.push(v); }
  return echelonBasis(gens);
}
function echelonBasis(vs: number[]): number[] {
  const out: number[] = [];
  for (const v0 of vs) {
    let v = v0;
    for (const b of out) if ((v ^ b) < v) v ^= b;
    if (!v) continue;
    // keep reduced: eliminate v's top bit from existing rows
    for (let i = 0; i < out.length; i++) if ((out[i] ^ v) < out[i]) out[i] ^= v;
    out.push(v);
    out.sort((a, b) => b - a);
  }
  return out;
}
export function reduceModSignChanges(bits: number, W = signChangeSubspace()): number {
  let v = bits;
  for (const b of W) if ((v ^ b) < v) v ^= b;
  return v;
}
/** Distinct configurations modulo sign changes, with the number of configurations in each coset. */
export function censusCosets(rows: CensusRow[]): { rep: CensusRow; size: number }[] {
  const W = signChangeSubspace();
  const map = new Map<number, { rep: CensusRow; size: number }>();
  for (const r of rows) { const k = reduceModSignChanges(r.bits, W); const e = map.get(k); if (e) e.size++; else map.set(k, { rep: { bits: k, octaves: r.octaves }, size: 1 }); }
  return [...map.values()];
}

/** Cheap graded-isomorphism invariant of a configuration: counts of X triads and of single-type triads (both from ϕ, hence sign-change invariant). */
export function censusInvariant(bits: number): string {
  const A = censusAlgebra(bits);
  const s = summarize(A, enumerateTriads(A));
  // incidence signature of the octave hyperplanes: for each point, how many octaves contain it (sorted) — GL- and sign-invariant
  const hs = hyperplanes(4);
  const octs = hs.filter((h) => { const els = spanElements(h).filter((g) => g !== 0); for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) for (let k = j + 1; k < els.length; k++) { const [b, c, d] = [els[i], els[j], els[k]]; if (d === (b ^ c)) continue; if (triadTypeOf(A, b, c, d) !== 'X') return false; } return true; });
  const inc = Array.from({ length: 15 }, (_, i) => octs.filter((h) => spanElements(h).includes(i + 1)).length).sort((a, b) => a - b).join('');
  return `X${s.types.X}|S${s.types.A + s.types.B + s.types.C}|${inc}`;
}

/** Group configurations into graded-isomorphism classes and compute dim Der per class. */
export function classifyCensus(rows: CensusRow[]): { classes: { rep: CensusRow; size: number; dimDer: number; isS: boolean; isSprime: boolean; octaves: number }[] } {
  const S = preset('S') as SignAlgebra, Sp = preset("S'") as SignAlgebra;
  const reps: { rep: CensusRow; alg: SignAlgebra; size: number }[] = [];
  const invOf = new Map<number, string>();
  for (const { rep: r, size } of censusCosets(rows)) {
    const A = censusAlgebra(r.bits);
    const inv = censusInvariant(r.bits);
    invOf.set(r.bits, inv);
    const hit = reps.find((x) => x.rep.octaves === r.octaves && invOf.get(x.rep.bits) === inv && gradedIsomorphisms(A, x.alg, { limit: 1 }).isos.length > 0);
    if (hit) hit.size += size; else reps.push({ rep: r, alg: A, size });
  }
  return { classes: reps.map(({ rep, alg, size }) => ({ rep, size, dimDer: derivations(alg).length, isS: gradedIsomorphisms(alg, S, { limit: 1 }).isos.length > 0, isSprime: gradedIsomorphisms(alg, Sp, { limit: 1 }).isos.length > 0, octaves: rep.octaves })) };
}
export { octaveConfiguration };
