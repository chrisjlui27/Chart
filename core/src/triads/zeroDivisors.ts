import { SignAlgebra } from '../algebra/monomial.js';
import { triadType, type TriadType } from './triads.js';

/**
 * Two-term zero-divisor pair in Wilmot's normal form: (a + b)(c + d) = 0 with b < c < d positive blades,
 * a = ±e_{b^c^d} with the sign `sa`. Also records which modes hold.
 */
export interface ZDPair {
  b: number; c: number; d: number;
  a: number; sa: number;
  type: TriadType;
  /** prime mode is always true; dual, extended, extended-dual as in Wilmot's Modes definition */
  modes: { prime: boolean; dual: boolean; extended: boolean; extendedDual: boolean };
}

function pairIsZero(A: SignAlgebra, p: number, sp: number, q: number, sq: number, r: number, sr: number, t: number, st: number): boolean {
  // (sp e_p + sq e_q)(sr e_r + st e_t) = 0 ?
  const n = A.n;
  const acc = new Map<number, number>();
  const addTerm = (x: number, sx: number, y: number, sy: number) => {
    const s = A.sgn[x * n + y];
    if (s === 0) return;
    const k = x ^ y;
    acc.set(k, (acc.get(k) ?? 0) + s * sx * sy);
  };
  addTerm(p, sp, r, sr); addTerm(p, sp, t, st); addTerm(q, sq, r, sr); addTerm(q, sq, t, st);
  for (const v of acc.values()) if (v !== 0) return false;
  return true;
}

/**
 * Enumerate zero-divisor triads: triads (b<c<d) for which (a+b)(c+d)=0 has a solution a = ±e_{bcd}.
 * Several triads can describe the same pair {a+b, c+d} (the four-set {a,b,c,d} has three pairings);
 * Wilmot's count Z_m is the number of distinct pairs, see zeroDivisorPartitions().
 */
export function zeroDivisorTriads(A: SignAlgebra, opts: { requireEqualSquares?: boolean } = {}): ZDPair[] {
  const n = A.n;
  const out: ZDPair[] = [];
  const sq = opts.requireEqualSquares ? (g: number) => A.square(g) : () => 0;
  for (let b = 1; b < n; b++)
    for (let c = b + 1; c < n; c++) {
      const bc = b ^ c;
      for (let d = c + 1; d < n; d++) {
        if (d === bc) continue;
        const a = b ^ c ^ d;
        // Wilmot requires a^2 = b^2 and c^2 = d^2 (relevant for split algebras)
        if (sq(a) !== sq(b) || sq(c) !== sq(d)) continue;
        let sa = 0;
        for (const s of [1, -1]) if (pairIsZero(A, a, s, b, 1, c, 1, d, 1)) { sa = s; break; }
        if (sa === 0) continue;
        const type = triadType(A, b, c, d);
        // modes
        const dual = pairIsZero(A, d, -1, b, 1, c, 1, a, sa);
        const db = A.mono(d, b); // |db| = positive blade of index d^b
        const dbAbs = db.g;
        // a' = bc|db| computed as (bc)(|db|) signed
        const bcm = A.mono(b, c);
        const ap = A.mulMono({ g: bcm.g, s: bcm.s }, { g: dbAbs, s: 1 });
        let extended = false, extendedDual = false;
        if (ap && ap.s !== 0) {
          extended = pairIsZero(A, ap.g, ap.s, b, 1, c, 1, dbAbs, 1);
          extendedDual = pairIsZero(A, dbAbs, -1, b, 1, c, 1, ap.g, ap.s);
        }
        out.push({ b, c, d, a, sa, type, modes: { prime: true, dual, extended, extendedDual } });
      }
    }
  return out;
}

/** Wilmot's closed form Z_m = (N-1)(N-3)(N-7)/16 for the ultronion with N = 2^n - 1 pure basis elements. */
export function zeroDivisorFormula(N: number): number {
  return ((N - 1) * (N - 3) * (N - 7)) / 16;
}

/**
 * Distinct unordered pairs {x, y} of two-term elements x = e_p ± e_q, y = e_r ± e_s with xy = 0,
 * counted as index partitions {{p,q},{r,s}} (each carries exactly two sign solutions).
 */
export function zeroDivisorPartitions(A: SignAlgebra, opts: { requireEqualSquares?: boolean } = {}): { partitions: number; orderedElementPairs: number } {
  const n = A.n;
  let partitions = 0;
  const sqOK = (p: number, q: number) => !opts.requireEqualSquares || A.square(p) === A.square(q);
  for (let v = 1; v < n; v++) {
    const pairs: number[][] = [];
    for (let p = 1; p < n; p++) {
      const q = p ^ v;
      if (q > p && q !== 0) pairs.push([p, q]);
    }
    for (let i = 0; i < pairs.length; i++)
      for (let j = i + 1; j < pairs.length; j++) {
        const [p, q] = pairs[i], [r, s] = pairs[j];
        if (!sqOK(p, q) || !sqOK(r, s)) continue;
        let ok = 0;
        for (const sq of [1, -1]) for (const ss of [1, -1]) if (pairIsZero(A, p, 1, q, sq, r, 1, s, ss)) ok++;
        if (ok > 0) partitions++;
      }
  }
  return { partitions, orderedElementPairs: 4 * partitions };
}

/** Two-term elements e_p ± e_q (p<q) that are zero divisors (L_x singular), by exact two-term annihilator search. */
export function twoTermZeroDivisorElements(A: SignAlgebra): { p: number; q: number; s: number }[] {
  const n = A.n;
  const out: { p: number; q: number; s: number }[] = [];
  for (let p = 1; p < n; p++)
    for (let q = p + 1; q < n; q++)
      for (const s of [1, -1]) {
        const v = p ^ q;
        let found = false;
        for (let r = 1; r < n && !found; r++) {
          const t = r ^ v;
          if (t <= r || t === 0) continue;
          for (const st of [1, -1]) if (pairIsZero(A, p, 1, q, s, r, 1, t, st)) { found = true; break; }
        }
        if (found) out.push({ p, q, s });
      }
  return out;
}

/** Group zero-divisor pairs into orbits under 3-triad-cycle maps and modes; the orbit representatives are the primaries. */
/** Alias kept for readability: Wilmot's Z_m. */
export function zeroDivisorCount(A: SignAlgebra): number {
  return zeroDivisorPartitions(A).partitions;
}

export function cycleModeClasses(A: SignAlgebra, pairs: ZDPair[]): { orbits: ZDPair[][]; count: number } {
  const key = (b: number, c: number, d: number) => `${b},${c},${d}`;
  const partitionKey = (p: number, q: number, r: number, s: number) => {
    const x = [Math.min(p, q), Math.max(p, q)], y = [Math.min(r, s), Math.max(r, s)];
    const [u, v] = x[0] < y[0] ? [x, y] : [y, x];
    return `${u[0]},${u[1]}|${v[0]},${v[1]}`;
  };
  // index pairs by partition {a,b}|{c,d}
  const byPartition = new Map<string, ZDPair[]>();
  for (const z of pairs) {
    const k = partitionKey(z.a, z.b, z.c, z.d);
    const arr = byPartition.get(k) ?? [];
    arr.push(z);
    byPartition.set(k, arr);
  }
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (x: string, y: string) => {
    const rx = find(x), ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  };
  for (const k of byPartition.keys()) parent.set(k, k);
  const triadPartition = new Map<string, string>();
  for (const z of pairs) triadPartition.set(key(z.b, z.c, z.d), partitionKey(z.a, z.b, z.c, z.d));
  for (const z of pairs) {
    const me = partitionKey(z.a, z.b, z.c, z.d);
    const { b, c, d } = z;
    const bc = b ^ c;
    // cycle mates (b,bc,d) and (c,bc,d) when b<c<bc<d
    if (c < bc && bc < d) {
      for (const [x, y, w] of [[b, bc, d], [c, bc, d]]) {
        const pk = triadPartition.get(key(x, y, w));
        if (pk) union(me, pk);
      }
    }
    // modes
    if (z.modes.dual) union(me, partitionKey(d, b, c, z.a));
    if (z.modes.extended || z.modes.extendedDual) {
      const dbAbs = d ^ b;
      const apg = b ^ c ^ dbAbs;
      if (z.modes.extended) { const k = partitionKey(apg, b, c, dbAbs); if (byPartition.has(k)) union(me, k); }
      if (z.modes.extendedDual) { const k = partitionKey(dbAbs, b, c, apg); if (byPartition.has(k)) union(me, k); }
    }
  }
  const groups = new Map<string, ZDPair[]>();
  for (const [k, arr] of byPartition) {
    const r = find(k);
    groups.set(r, [...(groups.get(r) ?? []), ...arr]);
  }
  const orbits = [...groups.values()];
  return { orbits, count: orbits.length };
}
