import type { Algebra } from './types.js';

/** Dense algebra with structure constants c[i][j][k]: e_i e_j = sum_k c[i,j,k] e_k. */
export class DenseAlgebra implements Algebra {
  readonly n: number;
  readonly name: string;
  readonly unit: number | null;
  readonly labels: string[];
  readonly c: Float64Array; // n*n*n, index (i*n+j)*n+k

  constructor(n: number, c: Float64Array, opts: { name?: string; unit?: number | null; labels?: string[] } = {}) {
    if (c.length !== n * n * n) throw new Error('structure constants must have n^3 entries');
    this.n = n;
    this.c = c;
    this.name = opts.name ?? `dense(${n})`;
    this.unit = opts.unit ?? DenseAlgebra.findUnit(n, c);
    this.labels = opts.labels ?? Array.from({ length: n }, (_, i) => `e${i}`);
  }

  static findUnit(n: number, c: Float64Array): number | null {
    outer: for (let u = 0; u < n; u++) {
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++) {
          const want = j === k ? 1 : 0;
          if (Math.abs(c[(u * n + j) * n + k] - want) > 1e-12) continue outer;
          if (Math.abs(c[(j * n + u) * n + k] - want) > 1e-12) continue outer;
        }
      return u;
    }
    return null;
  }

  static fromTable(table: number[][][], opts?: { name?: string; unit?: number | null; labels?: string[] }): DenseAlgebra {
    const n = table.length;
    const c = new Float64Array(n * n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) c[(i * n + j) * n + k] = table[i][j][k];
    return new DenseAlgebra(n, c, opts);
  }

  /** Lie algebra from a bracket table (product = bracket). */
  static lie(name: string, n: number, bracket: (i: number, j: number) => number[]): DenseAlgebra {
    const c = new Float64Array(n * n * n);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = bracket(i, j);
        for (let k = 0; k < n; k++) c[(i * n + j) * n + k] = v[k];
      }
    return new DenseAlgebra(n, c, { name, unit: null });
  }

  mulVec(x: Float64Array, y: Float64Array, out?: Float64Array): Float64Array {
    const n = this.n;
    const r = out ?? new Float64Array(n);
    r.fill(0);
    for (let i = 0; i < n; i++) {
      if (x[i] === 0) continue;
      for (let j = 0; j < n; j++) {
        const xy = x[i] * y[j];
        if (xy === 0) continue;
        const base = (i * n + j) * n;
        for (let k = 0; k < n; k++) r[k] += xy * this.c[base + k];
      }
    }
    return r;
  }
}
