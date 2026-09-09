import { SignAlgebra } from '../algebra/monomial.js';
import { preset } from '../algebra/presets.js';
import { basisSubalgebra } from '../sub/subspaces.js';
import { gradedIsomorphisms } from '../sub/gradedIso.js';
import type { OctaveKind } from './subalgebras.js';
import { assocMono } from './triads.js';

let refs: { kind: OctaveKind; alg: SignAlgebra }[] | null = null;

/**
 * Reference 8-dimensional algebras in Wilmot's natural order: O; P4 generated in S by (o1,o24,o34) — Cawagas's
 * quasi-octonions, also M(H); P12 generated in T by (o1,o24,o345); P14 generated in U3 by (o14,o25,o36).
 */
export function octaveReferences(): { kind: OctaveKind; alg: SignAlgebra }[] {
  if (refs) return refs;
  const S = preset('S') as SignAlgebra, T = preset('T') as SignAlgebra, U3 = preset('U3') as SignAlgebra;
  refs = [
    { kind: 'O', alg: preset('O') as SignAlgebra },
    { kind: 'P4', alg: basisSubalgebra(S, [1, 10, 12], 'P4').induced },
    { kind: 'P12', alg: basisSubalgebra(T, [1, 10, 28], 'P12').induced },
    { kind: 'P14', alg: basisSubalgebra(U3, [9, 18, 36], 'P14').induced },
  ];
  return refs;
}

/** Identify an 8-dimensional basis subalgebra up to graded isomorphism (order-independent). */
export function identifyOctaveByIso(B: SignAlgebra): OctaveKind {
  for (const r of octaveReferences()) if (gradedIsomorphisms(B, r.alg, { limit: 1 }).isos.length) return r.kind;
  return 'other';
}

/**
 * Basis lines {p, q, p^q}. A line spans a quaternion algebra iff its three elements pairwise anticommute and square
 * to -1; `oriented` counts those with (e_p e_q) e_{p^q} = -1 (Wilmot's quaternion, as opposed to anti-quaternion,
 * orientation), `notH` the lines that are not isomorphic to H (commuting products, squares != -1, or degenerate).
 */
export function quaternionLines(A: SignAlgebra): { lines: number; H: number; oriented: number; anti: number; notH: number } {
  const out = { lines: 0, H: 0, oriented: 0, anti: 0, notH: 0 };
  for (let p = 1; p < A.n; p++)
    for (let q = p + 1; q < A.n; q++) {
      const r = p ^ q;
      if (r < q) continue; // count each line once with p<q<r
      out.lines++;
      const anticommute = A.F(p, q) !== 0 && A.F(p, q) === -A.F(q, p) && A.F(p, r) === -A.F(r, p) && A.F(q, r) === -A.F(r, q);
      const squares = A.square(p) === -1 && A.square(q) === -1 && A.square(r) === -1;
      // the line must also be associative to span a copy of H
      let assoc = true;
      const trip = [p, q, r];
      for (const x of trip) for (const y of trip) for (const z of trip) if (assocMono(A, x, y, z).s !== 0) assoc = false;
      if (!anticommute || !squares || !assoc) { out.notH++; continue; }
      out.H++;
      const t = A.mulMono(A.mono(p, q), { g: r, s: 1 })!;
      if (t.s < 0) out.oriented++; else out.anti++;
    }
  return out;
}
