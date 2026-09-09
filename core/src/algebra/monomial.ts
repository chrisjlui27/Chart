import type { Algebra, Mono } from './types.js';

export interface MonomialOpts {
  name?: string;
  unit?: number | null;
  /** conjugation sign per basis element (involution diagonal on the basis) */
  conjSign?: Int8Array;
  labels?: string[];
}

/**
 * Monomial (basis-closed) algebra: e_i e_j = sgn[i,j] * e_{idx[i,j]} with sgn in {-1,0,+1}.
 * Covers Cayley–Dickson type algebras, Clifford algebras and their tensor products.
 */
export class MonomialAlgebra implements Algebra {
  readonly n: number;
  readonly name: string;
  readonly unit: number | null;
  readonly idx: Int32Array;
  readonly sgn: Int8Array;
  readonly conjSign: Int8Array;
  readonly labels: string[];

  constructor(n: number, idx: Int32Array, sgn: Int8Array, opts: MonomialOpts = {}) {
    this.n = n;
    this.idx = idx;
    this.sgn = sgn;
    this.name = opts.name ?? `monomial(${n})`;
    this.unit = opts.unit === undefined ? 0 : opts.unit;
    this.conjSign = opts.conjSign ?? MonomialAlgebra.defaultConj(n);
    this.labels = opts.labels ?? Array.from({ length: n }, (_, i) => `e${i}`);
  }

  static defaultConj(n: number): Int8Array {
    const c = new Int8Array(n).fill(-1);
    c[0] = 1;
    return c;
  }

  /** product of basis elements as a signed monomial */
  mono(g: number, h: number): Mono {
    const p = g * this.n + h;
    return { g: this.idx[p], s: this.sgn[p] };
  }
  /** product of two signed monomials (null = zero) */
  mulMono(x: Mono | null, y: Mono | null): Mono | null {
    if (!x || !y || x.s === 0 || y.s === 0) return null;
    const p = x.g * this.n + y.g;
    const s = this.sgn[p];
    if (s === 0) return null;
    return { g: this.idx[p], s: s * x.s * y.s };
  }
  conjMono(x: Mono | null): Mono | null {
    if (!x || x.s === 0) return null;
    return { g: x.g, s: x.s * this.conjSign[x.g] };
  }
  /** sign of e_g^2 when it is a multiple of the unit (0 if e_g^2 = 0) */
  square(g: number): number {
    const p = g * this.n + g;
    if (this.sgn[p] === 0) return 0;
    if (this.unit !== null && this.idx[p] !== this.unit) return NaN;
    return this.sgn[p];
  }

  mulVec(x: Float64Array, y: Float64Array, out?: Float64Array): Float64Array {
    const n = this.n;
    const r = out ?? new Float64Array(n);
    r.fill(0);
    for (let g = 0; g < n; g++) {
      const xg = x[g];
      if (xg === 0) continue;
      const row = g * n;
      for (let h = 0; h < n; h++) {
        const yh = y[h];
        if (yh === 0) continue;
        const s = this.sgn[row + h];
        if (s !== 0) r[this.idx[row + h]] += s * xg * yh;
      }
    }
    return r;
  }
  conjVec(x: Float64Array, out?: Float64Array): Float64Array {
    const r = out ?? new Float64Array(this.n);
    for (let g = 0; g < this.n; g++) r[g] = this.conjSign[g] * x[g];
    return r;
  }
  /** Left multiplication matrix L_x (row-major, n x n): (L_x y) = x y. */
  L(x: Float64Array): Float64Array {
    const n = this.n;
    const M = new Float64Array(n * n);
    for (let g = 0; g < n; g++) {
      const xg = x[g];
      if (xg === 0) continue;
      const row = g * n;
      for (let h = 0; h < n; h++) {
        const s = this.sgn[row + h];
        if (s !== 0) M[this.idx[row + h] * n + h] += s * xg;
      }
    }
    return M;
  }
  /** Right multiplication matrix R_x: (R_x y) = y x. */
  R(x: Float64Array): Float64Array {
    const n = this.n;
    const M = new Float64Array(n * n);
    for (let h = 0; h < n; h++) {
      const xh = x[h];
      if (xh === 0) continue;
      for (let g = 0; g < n; g++) {
        const p = g * n + h;
        const s = this.sgn[p];
        if (s !== 0) M[this.idx[p] * n + g] += s * xh;
      }
    }
    return M;
  }
  basis(g: number): Float64Array {
    const v = new Float64Array(this.n);
    v[g] = 1;
    return v;
  }
  /** true if every product index is the XOR of the factor indices */
  isXor(): boolean {
    for (let g = 0; g < this.n; g++)
      for (let h = 0; h < this.n; h++) {
        const p = g * this.n + h;
        if (this.sgn[p] !== 0 && this.idx[p] !== (g ^ h)) return false;
      }
    return true;
  }
}

/** Generator kinds for labelling: 'o' imaginary (square -1), 'u' unitary (square +1), 'n' nilpotent (square 0). */
export type GenKind = 'o' | 'u' | 'n';

export interface SignOpts extends MonomialOpts {
  genKinds?: GenKind[];
}

/**
 * Twisted group algebra of F_2^m: e_g e_h = F(g,h) e_{g xor h}, F in {-1,0,+1}.
 * Basis index g is the bitmask of Wilmot's graded index set alpha (bit i-1 <-> generator i).
 */
export class SignAlgebra extends MonomialAlgebra {
  readonly m: number;
  readonly genKinds: GenKind[];

  constructor(m: number, F: Int8Array, opts: SignOpts = {}) {
    const n = 1 << m;
    const idx = new Int32Array(n * n);
    for (let g = 0; g < n; g++) for (let h = 0; h < n; h++) idx[g * n + h] = g ^ h;
    const genKinds = opts.genKinds ?? Array.from({ length: m }, () => 'o' as GenKind);
    super(n, idx, F, { ...opts, labels: opts.labels ?? SignAlgebra.bitLabels(n) });
    this.m = m;
    this.genKinds = genKinds;
  }

  F(g: number, h: number): number {
    return this.sgn[g * this.n + h];
  }

  static bitLabels(n: number): string[] {
    return Array.from({ length: n }, (_, i) => (i === 0 ? '1' : `e${i}`));
  }

  /** Wilmot's graded label: o12, o3u1, ... */
  gradedLabel(g: number): string {
    if (g === 0) return '1';
    let out = '';
    let kind: GenKind | '' = '';
    const wide = this.m > 9;
    for (let i = 0; i < this.m; i++) {
      if (!(g >> i) || !((g >> i) & 1)) continue;
      const k = this.genKinds[i];
      // generators are numbered within their kind (o1,o2,... u1,u2,...)
      const num = this.genKinds.slice(0, i).filter((x) => x === k).length + 1;
      if (k !== kind) {
        out += k;
        kind = k;
      } else if (wide) out += ',';
      out += String(num);
    }
    return out;
  }
  gradedLabels(): string[] {
    return Array.from({ length: this.n }, (_, g) => this.gradedLabel(g));
  }
  /** popcount grade */
  grade(g: number): number {
    let c = 0;
    while (g) {
      c += g & 1;
      g >>= 1;
    }
    return c;
  }
  /** Convenience: parse 'o12', 'u1', 'e5', '1' to an index. */
  parseLabel(s: string): number {
    s = s.trim();
    if (s === '1' || s === 'e0') return 0;
    if (/^e\d+$/.test(s)) return parseInt(s.slice(1), 10);
    let g = 0;
    const re = /([oun])([\d,]+)/g;
    let mt: RegExpExecArray | null;
    while ((mt = re.exec(s))) {
      const kind = mt[1] as GenKind;
      const nums = this.m > 9 ? mt[2].split(',').map(Number) : mt[2].split('').map(Number);
      for (const num of nums) {
        let seen = 0;
        for (let i = 0; i < this.m; i++) {
          if (this.genKinds[i] === kind) {
            seen++;
            if (seen === num) {
              g |= 1 << i;
              break;
            }
          }
        }
      }
    }
    return g;
  }
}

export const REALS: SignAlgebra = new SignAlgebra(0, new Int8Array([1]), {
  name: 'R',
  conjSign: new Int8Array([1]),
  genKinds: [],
});
