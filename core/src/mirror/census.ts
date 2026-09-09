import { SignAlgebra, REALS, MonomialAlgebra } from '../algebra/monomial.js';
import { double, allDoublingFormulas, BALES, tower, type DoublingFormula, type TowerStep } from '../algebra/doubling.js';
import { preset } from '../algebra/presets.js';
import { hyperplanes, basisSubalgebra, hyperplaneContains } from '../sub/subspaces.js';
import { isComposition } from '../facts/identities.js';
import { gradedIsomorphisms } from '../sub/gradedIso.js';
import { quaternionLines } from '../triads/references.js';
import { derivations } from '../facts/der.js';
import { subalgebraCensus } from '../triads/subalgebras.js';

/** The sign-function ratio chi = F_B / F_A on a common index set (0 where either vanishes). */
export function signRatio(A: SignAlgebra, B: SignAlgebra): Int8Array {
  const n = A.n;
  const chi = new Int8Array(n * n);
  for (let p = 0; p < n * n; p++) chi[p] = A.sgn[p] === 0 || B.sgn[p] === 0 ? 0 : A.sgn[p] * B.sgn[p];
  return chi;
}
/** Lui's orientation bit: -1 on distinct non-zero pairs of the founding F2^3 (indices 1..7), +1 elsewhere. */
export function orientationBit(n = 16): Int8Array {
  const chi = new Int8Array(n * n).fill(1);
  for (let g = 1; g < 8; g++) for (let h = 1; h < 8; h++) if (g !== h) chi[g * n + h] = -1;
  return chi;
}
/** Is a sign function on F2^m a 2-cocycle: c(g,h)c(g^h,k) = c(h,k)c(g,h^k) for all g,h,k? */
export function isCocycle(c: Int8Array, n: number): boolean {
  for (let g = 0; g < n; g++) for (let h = 0; h < n; h++) for (let k = 0; k < n; k++)
    if (c[g * n + h] * c[(g ^ h) * n + k] !== c[h * n + k] * c[g * n + (h ^ k)]) return false;
  return true;
}
/** The associator function phi = dF on independent unordered triples: number of triples with phi = +1 and total. */
export function associatorFunction(A: SignAlgebra): { plus: number; total: number; trilinear: boolean } {
  const n = A.n;
  let plus = 0, total = 0;
  const phi = (g: number, h: number, k: number) => A.F(g, h) * A.F(g ^ h, k) * A.F(h, k) * A.F(g, h ^ k);
  for (let g = 1; g < n; g++) for (let h = g + 1; h < n; h++) for (let k = h + 1; k < n; k++) {
    if (k === (g ^ h)) continue;
    total++;
    if (phi(g, h, k) === 1) plus++;
  }
  // trilinearity check: phi(g1^g2, h, k) = phi(g1,h,k) phi(g2,h,k) on a sample of all triples
  let trilinear = true;
  outer: for (let g1 = 1; g1 < n; g1++) for (let g2 = 1; g2 < n; g2++) for (let h = 1; h < n; h++) for (let k = 1; k < n; k++) {
    if (phi(g1 ^ g2, h, k) !== phi(g1, h, k) * phi(g2, h, k)) { trilinear = false; break outer; }
  }
  return { plus, total, trilinear };
}
/** Octave configuration of a 16-dimensional sign algebra: which of the 15 basis hyperplanes are composition algebras, split by containing the doubling point. */
export function octaveConfiguration(A: SignAlgebra, doublingPoint = 8): { composition: number; throughPoint: number; avoidingPoint: number; hyperplanes: { basis: number[]; composition: boolean; containsPoint: boolean }[] } {
  const hs = hyperplanes(A.m).map((basis) => ({ basis, composition: isComposition(basisSubalgebra(A, basis).induced).holds, containsPoint: hyperplaneContains(basis, doublingPoint) }));
  const comp = hs.filter((h) => h.composition);
  return { composition: comp.length, throughPoint: comp.filter((h) => h.containsPoint).length, avoidingPoint: comp.filter((h) => !h.containsPoint).length, hyperplanes: hs };
}
/** Bales's admissibility: applying the formula uniformly from R, every basis line is a quaternion algebra at every level up to `levels`. */
export function balesAdmissible(formula: DoublingFormula, levels = 4): boolean {
  let A: MonomialAlgebra = REALS;
  for (let i = 0; i < levels; i++) {
    A = double(A, formula);
    if (quaternionLines(A as SignAlgebra).notH > 0) return false;
  }
  return true;
}
export interface BalesCensusRow {
  name: string; formula: DoublingFormula; balesName: string | null; admissible: boolean;
  classOverO: 'S' | "S'" | 'other'; compositionHyperplanes: number; dimDer: number;
}
/** The 32 candidate formulas applied once over O (mirror paper Theorem 3.6 census). */
export function balesCensus(): BalesCensusRow[] {
  const O = preset('O') as SignAlgebra, S = preset('S') as SignAlgebra, Sp = preset("S'") as SignAlgebra;
  return allDoublingFormulas().map(({ name, formula }) => {
    const A = double(O, formula, { name }) as SignAlgebra;
    const balesName = Object.entries(BALES).find(([, f]) => f.first === formula.first && f.second === formula.second && f.cross === formula.cross)?.[0] ?? null;
    const cls = gradedIsomorphisms(A, S, { limit: 1 }).isos.length ? 'S' : gradedIsomorphisms(A, Sp, { limit: 1 }).isos.length ? "S'" : 'other';
    return { name, formula, balesName, admissible: balesAdmissible(formula), classOverO: cls, compositionHyperplanes: octaveConfiguration(A).composition, dimDer: derivations(A).length };
  });
}
export interface OrientationNode { word: TowerStep[]; algebra: SignAlgebra; isoClass: number; dimDer: number; octaves: { O: number; P4: number; other: number } }
/**
 * Orientation tree: every word in {CD, M} of length `depth` applied to a base (default O), grouped into graded-isomorphism
 * classes, with dim Der and the basis-octave census.
 */
export function orientationTree(depth: number, base: MonomialAlgebra = preset('O'), opts: { withDer?: boolean } = {}): OrientationNode[] {
  const words: TowerStep[][] = [[]];
  for (let i = 0; i < depth; i++) { const next: TowerStep[][] = []; for (const w of words) { next.push([...w, 'CD']); next.push([...w, 'M']); } words.splice(0, words.length, ...next); }
  const nodes: OrientationNode[] = [];
  const reps: SignAlgebra[] = [];
  for (const w of words) {
    const A = tower(base, w, `${w.join('·')}(${base.name})`) as SignAlgebra;
    let cls = reps.findIndex((r) => gradedIsomorphisms(A, r, { limit: 1 }).isos.length > 0);
    if (cls < 0) { reps.push(A); cls = reps.length - 1; }
    const c = subalgebraCensus(A, { method: 'iso' });
    nodes.push({ word: w, algebra: A, isoClass: cls, dimDer: opts.withDer === false ? -1 : derivations(A).length, octaves: { O: c.O, P4: c.P4, other: c.P12 + c.P14 + c.other } });
  }
  return nodes;
}
