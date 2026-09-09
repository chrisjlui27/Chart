import { SignAlgebra } from '../algebra/monomial.js';
import type { Mono } from '../algebra/types.js';

/** Non-associativity type of a triad: assoc (d = bc), or Wilmot's A, B, C, X. */
export type TriadType = 'assoc' | 'A' | 'B' | 'C' | 'X';
export const TYPE_CODE: Record<TriadType, number> = { assoc: 0, A: 1, B: 2, C: 3, X: 4 };
export const CODE_TYPE: TriadType[] = ['assoc', 'A', 'B', 'C', 'X'];

/** Associator of three basis blades as a signed monomial (s = 0 if they associate); the value is 2*s*e_k. */
export function assocMono(A: SignAlgebra, x: number, y: number, z: number): Mono {
  const xy = A.mono(x, y);
  const lhs = A.mulMono(xy, { g: z, s: 1 });
  const yz = A.mono(y, z);
  const rhs = A.mulMono({ g: x, s: 1 }, yz);
  const ls = lhs ? lhs.s : 0, rs = rhs ? rhs.s : 0;
  const k = lhs ? lhs.g : rhs ? rhs.g : x ^ y ^ z;
  const diff = ls - rs; // in {-2,0,2} when both nonzero
  return { g: k, s: diff === 0 ? 0 : diff > 0 ? 1 : -1 };
}

/** Wilmot's three unordered associativity types for the triad (b,c,d): representatives [b,d,c], [b,c,d], [c,b,d]. */
export function associativityTypes(A: SignAlgebra, b: number, c: number, d: number): [boolean, boolean, boolean] {
  return [assocMono(A, b, d, c).s !== 0, assocMono(A, b, c, d).s !== 0, assocMono(A, c, b, d).s !== 0];
}
export function triadType(A: SignAlgebra, b: number, c: number, d: number): TriadType {
  if (d === (b ^ c)) return 'assoc';
  const [t1, t2, t3] = associativityTypes(A, b, c, d);
  const k = (t1 ? 1 : 0) + (t2 ? 1 : 0) + (t3 ? 1 : 0);
  if (k === 3) return 'X';
  if (k === 0) return 'assoc';
  if (k === 2) throw new Error(`Theorem 5 violated at (${b},${c},${d})`);
  return t1 ? 'A' : t2 ? 'B' : 'C';
}

/** Full check of Table 1: each type's four associators are all zero or all non-zero. */
export function checkTable1(A: SignAlgebra, b: number, c: number, d: number): boolean {
  const a = b ^ c ^ d;
  const z = (x: number, y: number, w: number) => assocMono(A, x, y, w).s !== 0;
  const rows: [number, number, number][][] = [
    [[b, a, c], [b, d, c], [a, b, d], [a, c, d]],
    [[a, b, c], [b, c, d], [b, a, d], [a, d, c]],
    [[a, c, b], [c, b, d], [a, d, b], [c, a, d]],
  ];
  for (const row of rows) {
    const vals = row.map(([x, y, w]) => z(x, y, w));
    if (vals.some((v) => v !== vals[0])) return false;
  }
  return true;
}

export interface TriadTable {
  count: number;
  b: Int32Array;
  c: Int32Array;
  d: Int32Array;
  type: Uint8Array; // TYPE_CODE
  /** 0 = associative (d = bc), 1 = non-cycle (d < bc), 2 = cycle (d > bc) */
  kind: Uint8Array;
}

/** Enumerate all ordered triads b < c < d of pure basis elements. */
export function enumerateTriads(A: SignAlgebra, opts: { verify?: boolean } = {}): TriadTable {
  const n = A.n, N = n - 1;
  const count = (N * (N - 1) * (N - 2)) / 6;
  const b = new Int32Array(count), c = new Int32Array(count), d = new Int32Array(count);
  const type = new Uint8Array(count), kind = new Uint8Array(count);
  let i = 0;
  for (let x = 1; x < n; x++)
    for (let y = x + 1; y < n; y++) {
      const xy = x ^ y;
      for (let z = y + 1; z < n; z++) {
        b[i] = x; c[i] = y; d[i] = z;
        const t = triadType(A, x, y, z);
        type[i] = TYPE_CODE[t];
        kind[i] = z === xy ? 0 : z < xy ? 1 : 2;
        if (opts.verify && z !== xy && !checkTable1(A, x, y, z)) throw new Error(`Table 1 violated at (${x},${y},${z})`);
        i++;
      }
    }
  return { count, b, c, d, type, kind };
}

export interface TriadSummary {
  triads: number;
  associative: number;
  nonCycles: number;
  cycleTriads: number;
  /** counts of types over all non-associative triads */
  types: Record<'A' | 'B' | 'C' | 'X', number>;
  /** counts of types over non-cycle triads (Table 4, lower block) */
  nonCycleTypes: Record<'A' | 'B' | 'C' | 'X', number>;
  /** 3-triad cycle silos (Table 4, upper block): number of cycles per silo */
  silos: Record<string, number>;
}

export const SILOS = ['AAA', 'BBA', 'ACC', 'XBB', 'BXC', 'CAB', 'CCX', 'XXX'];

function typeIndex(A: SignAlgebra, tt: TriadTable): (b: number, c: number, d: number) => TriadType {
  // triad index for b<c<d: combinatorial number system
  const n = A.n;
  const N = n - 1;
  const C2 = (k: number) => (k * (k - 1)) / 2;
  const C3 = (k: number) => (k * (k - 1) * (k - 2)) / 6;
  // index of (x,y,z) with 1<=x<y<z<=N in lexicographic order
  return (x, y, z) => {
    const i = C3(N) - C3(N - x + 1) + (C2(N - x) - C2(N - y + 1)) + (z - y - 1);
    return CODE_TYPE[tt.type[i]];
  };
}

export function summarize(A: SignAlgebra, tt: TriadTable): TriadSummary {
  const s: TriadSummary = {
    triads: tt.count, associative: 0, nonCycles: 0, cycleTriads: 0,
    types: { A: 0, B: 0, C: 0, X: 0 }, nonCycleTypes: { A: 0, B: 0, C: 0, X: 0 }, silos: {},
  };
  for (const name of SILOS) s.silos[name] = 0;
  const T = typeIndex(A, tt);
  for (let i = 0; i < tt.count; i++) {
    const t = CODE_TYPE[tt.type[i]];
    if (tt.kind[i] === 0) { s.associative++; continue; }
    if (t !== 'assoc') s.types[t]++;
    if (tt.kind[i] === 1) { s.nonCycles++; if (t !== 'assoc') s.nonCycleTypes[t]++; continue; }
    s.cycleTriads++;
    const b = tt.b[i], c = tt.c[i], d = tt.d[i], bc = b ^ c;
    // first cycle only: b < c < bc < d
    if (c < bc && bc < d) {
      const silo = `${t}${T(b, bc, d)}${T(c, bc, d)}`.replace(/assoc/g, '0');
      s.silos[silo] = (s.silos[silo] ?? 0) + 1;
    }
  }
  return s;
}

/** Moufang identities and Mal'cev identity on a triad of blades, per Wilmot Theorem 6 and eq. (10). */
export function moufangBits(A: SignAlgebra, b: number, c: number, d: number): { m1: boolean; m2: boolean; m3: boolean; malcev: boolean } {
  const B: Mono = { g: b, s: 1 }, C: Mono = { g: c, s: 1 }, D: Mono = { g: d, s: 1 };
  const m = (x: Mono | null, y: Mono | null) => A.mulMono(x, y);
  const eq = (x: Mono | null, y: Mono | null) => (x === null && y === null) || (x !== null && y !== null && x.g === y.g && x.s === y.s);
  // Moufang 1: d(b(dc)) = ((db)d)c ; Moufang 2: b(d(cd)) = ((bd)c)d ; Moufang 3: (db)(cd) = (d(bc))d
  const m1 = eq(m(D, m(B, m(D, C))), m(m(m(D, B), D), C));
  const m2 = eq(m(B, m(D, m(C, D))), m(m(m(B, D), C), D));
  const m3 = eq(m(m(D, B), m(C, D)), m(m(D, m(B, C)), D));
  // Mal'cev (10): ((bc)d)b + (bc)(db) = 0
  const p = m(m(m(B, C), D), B), q = m(m(B, C), m(D, B));
  const malcev = p !== null && q !== null && p.g === q.g && p.s === -q.s;
  return { m1, m2, m3, malcev };
}
