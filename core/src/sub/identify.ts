import { SignAlgebra, MonomialAlgebra } from '../algebra/monomial.js';
import { facts, type FactsSheet } from '../facts/identities.js';
import { enumerateTriads, summarize } from '../triads/triads.js';
import { subalgebraCensus } from '../triads/subalgebras.js';
import { zeroDivisorPartitions, twoTermZeroDivisorElements } from '../triads/zeroDivisors.js';
import { hyperplanes, basisSubalgebra } from './subspaces.js';
import { isComposition } from '../facts/identities.js';
import { gradedIsomorphisms } from './gradedIso.js';
import { identifyOctaveByIso, quaternionLines } from '../triads/references.js';
import { preset } from '../algebra/presets.js';

export interface Fingerprint extends FactsSheet {
  triadTypes?: { A: number; B: number; C: number; X: number };
  silos?: Record<string, number>;
  octaves?: { O: number; P4: number; P12: number; P14: number; other: number };
  compositionHyperplanes?: number;
  quaternionLines?: { lines: number; H: number; oriented: number; anti: number; notH: number };
  zeroDivisorPartitions?: number;
  twoTermZeroDivisors?: number;
}

/** Invariants used to recognise an algebra; exact where the algebra is basis-closed. */
export function fingerprint(A: MonomialAlgebra): Fingerprint {
  const fp: Fingerprint = facts(A);
  if (A instanceof SignAlgebra && A.m >= 1) {
    const s = summarize(A, enumerateTriads(A));
    fp.triadTypes = s.types;
    fp.silos = s.silos;
    fp.quaternionLines = quaternionLines(A);
    if (A.m >= 3) {
      const c = subalgebraCensus(A, { method: A.m <= 5 ? 'iso' : 'types' });
      fp.octaves = { O: c.O, P4: c.P4, P12: c.P12, P14: c.P14, other: c.other };
    }
    if (A.m >= 2 && A.m <= 6) {
      fp.compositionHyperplanes = hyperplanes(A.m).filter((h) => isComposition(basisSubalgebra(A, h).induced).holds).length;
      fp.zeroDivisorPartitions = zeroDivisorPartitions(A).partitions;
      if (A.m <= 5) fp.twoTermZeroDivisors = twoTermZeroDivisorElements(A).length;
    }
  }
  return fp;
}

function identifyClifford8(fp: Fingerprint): string {
  const sq = fp.squares!;
  return `associative 8-dim (${sq.plus}+,${sq.minus}−,${sq.zero}0)`;
}

/** Best-effort name for a basis-closed algebra from its fingerprint. */
export function identify(A: MonomialAlgebra): string {
  const fp = fingerprint(A);
  const sq = fp.squares!;
  const n = A.n;
  if (n === 1) return 'R';
  if (n === 2) return sq.minus === 1 ? 'C' : sq.plus === 1 ? 'split-C' : 'dual';
  if (n === 4) {
    if (!fp.associative) return 'non-associative 4-dim';
    if (fp.commutative) return sq.zero ? 'commutative 4-dim with nilpotents' : sq.minus === 3 ? 'C⊗C?' : 'commutative 4-dim';
    return sq.minus === 3 ? 'H' : sq.plus === 2 ? 'split-H' : `4-dim (${sq.plus}+,${sq.minus}−,${sq.zero}0)`;
  }
  if (n === 8 && A instanceof SignAlgebra) {
    if (fp.associative) return sq.minus === 7 ? 'associative 8-dim' : identifyClifford8(fp);
    const kind = identifyOctaveByIso(A);
    if (kind !== 'other') return sq.minus === 7 ? (kind === 'P4' ? 'P4 (M(H), quasi-octonions)' : kind) : `split-signature ${kind}-like`;
  }
  if (n === 16 && A instanceof SignAlgebra && fp.octaves) {
    if (gradedIsomorphisms(A, preset('S') as SignAlgebra, { limit: 1 }).isos.length) return 'S';
    if (gradedIsomorphisms(A, preset("S'") as SignAlgebra, { limit: 1 }).isos.length) return "S'";
    const o = fp.octaves;
    return `16-dim (O=${o.O}, P4=${o.P4}, P12=${o.P12}, P14=${o.P14}, other=${o.other})`;
  }
  return `${n}-dim ${fp.associative ? 'associative' : fp.alternative ? 'alternative' : fp.powerAssociative ? 'power-associative' : 'non-associative'}`;
}
