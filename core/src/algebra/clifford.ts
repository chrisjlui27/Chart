import { SignAlgebra, type GenKind } from './monomial.js';

/**
 * Clifford algebra Cl(p,q,r): p generators squaring to +1, q to -1, r to 0.
 * Basis blades indexed by bitmask over generators (in the order +1's, -1's, 0's);
 * product sign from the transposition count plus the metric of contracted generators.
 * Involution: Clifford conjugation, sign (-1)^{k(k+1)/2} on grade k.
 */
export function clifford(p: number, q: number, r: number = 0): SignAlgebra {
  const m = p + q + r;
  const n = 1 << m;
  const metric = new Int8Array(m);
  for (let i = 0; i < m; i++) metric[i] = i < p ? 1 : i < p + q ? -1 : 0;
  const F = new Int8Array(n * n);
  const popcount = (x: number) => {
    let c = 0;
    while (x) {
      c += x & 1;
      x >>= 1;
    }
    return c;
  };
  for (let g = 0; g < n; g++)
    for (let h = 0; h < n; h++) {
      // count transpositions needed to move each generator of h past the generators of g above it
      let swaps = 0;
      for (let i = 0; i < m; i++) if ((h >> i) & 1) swaps += popcount(g >> (i + 1));
      let s = swaps & 1 ? -1 : 1;
      const common = g & h;
      for (let i = 0; i < m; i++) if ((common >> i) & 1) s *= metric[i];
      F[g * n + h] = s;
    }
  const conjSign = new Int8Array(n);
  for (let g = 0; g < n; g++) {
    const k = popcount(g);
    conjSign[g] = ((k * (k + 1)) / 2) % 2 === 0 ? 1 : -1;
  }
  const genKinds: GenKind[] = Array.from({ length: m }, (_, i) => (metric[i] === 1 ? 'u' : metric[i] === -1 ? 'o' : 'n'));
  return new SignAlgebra(m, F, { name: `Cl(${p},${q}${r ? ',' + r : ''})`, conjSign, genKinds });
}
