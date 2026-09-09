/** A finite-dimensional real algebra given on a fixed basis e_0..e_{n-1}. */
export interface Algebra {
  readonly n: number;
  readonly name: string;
  /** Index of the multiplicative unit in the basis, or null if the algebra is not unital on this basis. */
  readonly unit: number | null;
  /** Human-readable basis labels (bitmask notation by default). */
  readonly labels: readonly string[];
  /** out = x * y */
  mulVec(x: Float64Array, y: Float64Array, out?: Float64Array): Float64Array;
  /** Involution, if the algebra carries one on this basis. */
  conjVec?(x: Float64Array, out?: Float64Array): Float64Array;
}

/** A signed basis element s * e_g, or zero when s = 0. */
export interface Mono { g: number; s: number }
