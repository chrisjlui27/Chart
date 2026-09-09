/** Linear algebra over F_2. Vectors of F_2^m are bitmasks (m <= 30). */

/** Reduce a list of vectors to an echelon basis (highest bit pivots). */
export function echelon(vs: Iterable<number>): number[] {
  const basis: number[] = []; // basis[i] has pivot bit pivots[i]
  const pivots: number[] = [];
  for (let v of vs) {
    for (let i = 0; i < basis.length; i++) if ((v >> pivots[i]) & 1) v ^= basis[i];
    if (v === 0) continue;
    const p = 31 - Math.clz32(v);
    // keep reduced: eliminate p from existing rows
    for (let i = 0; i < basis.length; i++) if ((basis[i] >> p) & 1) basis[i] ^= v;
    basis.push(v);
    pivots.push(p);
  }
  return basis;
}
export function rank(vs: Iterable<number>): number {
  return echelon(vs).length;
}
export function inSpan(basis: number[], v: number): boolean {
  const b = echelon(basis);
  return echelon([...b, v]).length === b.length;
}
/** All 2^k elements of the span of a basis. */
export function spanElements(basis: number[]): number[] {
  const out: number[] = [0];
  for (const b of basis) {
    const len = out.length;
    for (let i = 0; i < len; i++) out.push(out[i] ^ b);
  }
  return out.sort((a, b) => a - b);
}
/** Canonical key of a subspace: sorted reduced echelon basis. */
export function subspaceKey(basis: number[]): string {
  return reducedEchelon(basis).join(',');
}
/** Reduced row echelon basis, sorted descending by pivot. */
export function reducedEchelon(basis: number[]): number[] {
  return echelon(basis).sort((a, b) => b - a);
}

/** Gaussian binomial [m choose k]_2. */
export function gaussianBinomial(m: number, k: number): number {
  if (k < 0 || k > m) return 0;
  let num = 1, den = 1;
  for (let i = 0; i < k; i++) {
    num *= 2 ** (m - i) - 1;
    den *= 2 ** (i + 1) - 1;
  }
  return Math.round(num / den);
}

/**
 * Enumerate all k-dimensional subspaces of F_2^m as reduced echelon bases
 * (row i has its pivot at column p_i, zeros in the other pivot columns, free bits elsewhere below the pivot).
 */
export function subspacesOfDim(m: number, k: number): number[][] {
  const out: number[][] = [];
  if (k === 0) return [[]];
  const pivots: number[] = [];
  const choose = (start: number) => {
    if (pivots.length === k) {
      fill();
      return;
    }
    for (let p = start; p >= 0; p--) {
      pivots.push(p);
      choose(p - 1);
      pivots.pop();
    }
  };
  const fill = () => {
    // for each row i, free positions: bits j < p_i that are not pivots
    const freeBits: number[][] = pivots.map((p) => {
      const f: number[] = [];
      for (let j = 0; j < p; j++) if (!pivots.includes(j)) f.push(j);
      return f;
    });
    const rows = pivots.map((p) => 1 << p);
    const rec = (i: number) => {
      if (i === k) {
        out.push(rows.slice());
        return;
      }
      const fb = freeBits[i];
      const total = 1 << fb.length;
      for (let mask = 0; mask < total; mask++) {
        let r = 1 << pivots[i];
        for (let t = 0; t < fb.length; t++) if ((mask >> t) & 1) r |= 1 << fb[t];
        rows[i] = r;
        rec(i + 1);
      }
    };
    rec(0);
  };
  choose(m - 1);
  return out;
}

/** Iterate over GL(m,2) as arrays of column images (image of basis vector 1<<i). */
export function forEachGL(m: number, cb: (cols: number[]) => boolean | void): void {
  const n = 1 << m;
  const cols: number[] = [];
  const spanSet = new Uint8Array(n);
  spanSet[0] = 1;
  let spanList: number[] = [0];
  const rec = (i: number): boolean => {
    if (i === m) return cb(cols) === false;
    for (let v = 1; v < n; v++) {
      if (spanSet[v]) continue;
      cols.push(v);
      const added: number[] = [];
      for (const s of spanList) {
        const w = s ^ v;
        spanSet[w] = 1;
        added.push(w);
      }
      const savedList = spanList;
      spanList = spanList.concat(added);
      const stop = rec(i + 1);
      spanList = savedList;
      for (const w of added) spanSet[w] = 0;
      cols.pop();
      if (stop) return true;
    }
    return false;
  };
  rec(0);
}
export function applyLinear(cols: number[], g: number): number {
  let r = 0;
  for (let i = 0; g >> i; i++) if ((g >> i) & 1) r ^= cols[i];
  return r;
}

/** Linear system over F_2 with bitset rows. Unknown count u <= 8192 comfortably. */
export class F2System {
  readonly u: number;
  readonly words: number;
  rows: Uint32Array[] = []; // echelon rows: each row is words+1 uint32 (last word holds rhs bit)
  pivots: number[] = [];
  consistent = true;

  constructor(unknowns: number) {
    this.u = unknowns;
    this.words = Math.ceil(unknowns / 32);
  }
  /** Add equation: xor of unknowns in `vars` equals rhs. Returns false if inconsistent. */
  addEquation(vars: number[], rhs: number): boolean {
    const row = new Uint32Array(this.words + 1);
    for (const v of vars) row[v >> 5] ^= 1 << (v & 31);
    row[this.words] = rhs & 1;
    return this.addRow(row);
  }
  addRow(row: Uint32Array): boolean {
    for (let i = 0; i < this.rows.length; i++) {
      const p = this.pivots[i];
      if ((row[p >> 5] >> (p & 31)) & 1) {
        const r = this.rows[i];
        for (let w = 0; w <= this.words; w++) row[w] ^= r[w];
      }
    }
    let piv = -1;
    for (let w = 0; w < this.words && piv < 0; w++) if (row[w]) piv = w * 32 + (31 - Math.clz32(row[w] & -row[w]) ); 
    if (piv < 0) {
      if (row[this.words] & 1) {
        this.consistent = false;
        return false;
      }
      return true;
    }
    // fix: pivot = lowest set bit
    // (recompute precisely)
    piv = -1;
    for (let w = 0; w < this.words; w++) {
      if (row[w]) {
        const low = row[w] & -row[w];
        piv = w * 32 + (31 - Math.clz32(low));
        break;
      }
    }
    // eliminate from existing rows
    for (let i = 0; i < this.rows.length; i++) {
      const r = this.rows[i];
      if ((r[piv >> 5] >> (piv & 31)) & 1) for (let w = 0; w <= this.words; w++) r[w] ^= row[w];
    }
    this.rows.push(row);
    this.pivots.push(piv);
    return true;
  }
  get rank(): number {
    return this.rows.length;
  }
  get nullity(): number {
    return this.u - this.rows.length;
  }
  /** One particular solution (free unknowns = 0), as a Uint8Array of bits. */
  solution(): Uint8Array | null {
    if (!this.consistent) return null;
    const x = new Uint8Array(this.u);
    for (let i = 0; i < this.rows.length; i++) x[this.pivots[i]] = this.rows[i][this.words] & 1;
    return x;
  }
  /** Basis of the homogeneous solution space. */
  nullSpace(): Uint8Array[] {
    const isPivot = new Uint8Array(this.u);
    for (const p of this.pivots) isPivot[p] = 1;
    const out: Uint8Array[] = [];
    for (let f = 0; f < this.u; f++) {
      if (isPivot[f]) continue;
      const x = new Uint8Array(this.u);
      x[f] = 1;
      for (let i = 0; i < this.rows.length; i++) if ((this.rows[i][f >> 5] >> (f & 31)) & 1) x[this.pivots[i]] = 1;
      out.push(x);
    }
    return out;
  }
}
