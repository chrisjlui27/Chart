import { SignAlgebra } from '../algebra/monomial.js';
import { subspacesOfDim, spanElements, gaussianBinomial } from '../linalg/f2.js';
import { triadType, type TriadType } from './triads.js';
import { basisSubalgebra } from '../sub/subspaces.js';
import { identifyOctaveByIso } from './references.js';

export type OctaveKind = 'H' | 'O' | 'P4' | 'P12' | 'P14' | 'other';

/** Type counts of the 35 triads of an 8-dimensional basis subalgebra spanned by the 3-dim F2-subspace `basis`. */
export function octaveTypeCounts(A: SignAlgebra, basis: number[]): Record<TriadType, number> {
  const els = spanElements(basis).filter((g) => g !== 0);
  const counts: Record<TriadType, number> = { assoc: 0, A: 0, B: 0, C: 0, X: 0 };
  for (let i = 0; i < els.length; i++)
    for (let j = i + 1; j < els.length; j++)
      for (let k = j + 1; k < els.length; k++) counts[triadType(A, els[i], els[j], els[k])]++;
  return counts;
}

/** Identify an 8-dimensional basis subalgebra by Wilmot's Table 6 (O = 28X; P4 = 12A,12C,4X; P12 = 8A,8B,8C,4X; P14 = 7A,10B,7C,4X). */
export function identifyOctave(counts: Record<TriadType, number>): OctaveKind {
  const { A, B, C, X } = counts;
  if (A === 0 && B === 0 && C === 0 && X === 28) return 'O';
  if (X !== 4) return 'other';
  const s = [A, B, C].sort((p, q) => p - q);
  if (s[0] === 0 && s[1] === 12 && s[2] === 12) return 'P4';
  if (s[0] === 8 && s[1] === 8 && s[2] === 8) return 'P12';
  if (s[0] === 7 && s[1] === 7 && s[2] === 10) return 'P14';
  return 'other';
}

export interface CensusOpts {
  /** 'types' = Wilmot's Table 6 type counts in the ambient graded order (default); 'iso' = graded isomorphism to references */
  method?: 'types' | 'iso';
}

export interface SubalgebraCensus {
  H: number;
  O: number;
  P4: number;
  P12: number;
  P14: number;
  other: number;
  /** total 8-dimensional basis subalgebras */
  octaves: number;
  /** bases of each kind (F2 subspaces) */
  byKind: Record<OctaveKind, number[][]>;
}

/** Wilmot Table 5: counts of H, O, P4, P12, P14 among basis subalgebras (2-dim and 3-dim F2-subspaces). */
export function subalgebraCensus(A: SignAlgebra, opts: CensusOpts = {}): SubalgebraCensus {
  const byKind: Record<OctaveKind, number[][]> = { H: [], O: [], P4: [], P12: [], P14: [], other: [] };
  const c = { H: gaussianBinomial(A.m, 2), O: 0, P4: 0, P12: 0, P14: 0, other: 0, octaves: 0, byKind };
  if (A.m >= 3)
    for (const basis of subspacesOfDim(A.m, 3)) {
      const kind = opts.method === 'iso' ? identifyOctaveByIso(basisSubalgebra(A, basis).induced) : identifyOctave(octaveTypeCounts(A, basis));
      c[kind]++;
      c.octaves++;
      byKind[kind].push(basis);
    }
  return c;
}

/** The generating triads of the octonion and P4 copies of S in the order Wilmot lists them (for labelling). */
export function wilmotSedenionGenerators(): { O: number[][]; P4: number[][] } {
  // o1=1,o2=2,o12=3,o3=4,o13=5,o23=6,o123=7,o4=8,o14=9,o24=10,o124=11,o34=12,o134=13,o234=14,o1234=15
  return {
    O: [[1, 2, 4], [1, 2, 8], [1, 4, 8], [1, 6, 8], [2, 4, 8], [2, 5, 8], [3, 4, 8], [3, 5, 8]],
    P4: [[1, 2, 12], [1, 4, 10], [1, 6, 10], [2, 4, 9], [2, 5, 9], [3, 4, 9], [3, 5, 9]],
  };
}
