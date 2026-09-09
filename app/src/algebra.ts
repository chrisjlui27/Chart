import { preset as corePreset, SignAlgebra, MonomialAlgebra, spanElements } from '@hav/core';
import type { Notation } from './state/store';

const cache = new Map<string, MonomialAlgebra>();
export function getAlgebra(name: string): MonomialAlgebra {
  let A = cache.get(name);
  if (!A) { A = corePreset(name); cache.set(name, A); }
  return A;
}
export function asSign(A: MonomialAlgebra): SignAlgebra | null { return A instanceof SignAlgebra ? A : null; }
export function labelsFor(A: MonomialAlgebra, notation: Notation): string[] {
  const S = asSign(A);
  return notation === 'graded' && S ? S.gradedLabels() : [...A.labels];
}
export function labelOf(A: MonomialAlgebra, g: number, notation: Notation): string { return labelsFor(A, notation)[g]; }
export function inSpan(basis: number[] | undefined, g: number): boolean { return !!basis && spanElements(basis).includes(g); }

export const FAMILIES: { name: string; presets: { id: string; note: string }[] }[] = [
  { name: 'Cayley–Dickson tower', presets: [['R', '1'], ['C', '2'], ['H', '4'], ['O', '8'], ['S', '16, sedenions U₁'], ['T', '32, trigintaduonions U₂'], ['U3', '64'], ['U4', '128'], ['U5', '256 (slow)']].map(([id, note]) => ({ id, note })) },
  { name: 'Mirror doubles', presets: [["S'", '16, mirror sedenions M(O)'], ['M(H)', '8, quasi-octonions P₄'], ['M(M(H))', '16'], ['CD(M(H))', '16, ≅ S'], ['M(S)', '32'], ["M(S')", '32']].map(([id, note]) => ({ id, note })) },
  { name: 'Bales products over O', presets: ['P0', 'P1', 'P2', 'P3', 'P0T', 'P1T', 'P2T', 'P3T'].map((p) => ({ id: `Bales:${p}`, note: p === 'P3T' ? 'CD' : p === 'P1T' ? 'mirror' : '' })) },
  { name: 'Split and dual', presets: [['dual', '2'], ['splitC', '2'], ['splitH', '4'], ['A(0,3)', '8, split octonions'], ['A(2,1)', '8'], ['A(3,1)', '16'], ['A(0,4)', '16'], ['A(2,2)', '16']].map(([id, note]) => ({ id, note })) },
  { name: 'Clifford', presets: [['Cl(2,0)', '4'], ['Cl(0,2)', '4 ≅ H'], ['Cl(1,1)', '4'], ['Cl(3,0)', '8'], ['Cl(1,3)', '16, spacetime'], ['Cl(3,0,1)', '16, PGA'], ['Cl(4,1)', '32, CGA']].map(([id, note]) => ({ id, note })) },
  { name: 'Tensor products', presets: [['tessarines', 'C⊗C'], ['biquaternions', 'H⊗C'], ['dualquaternions', 'H⊗dual']].map(([id, note]) => ({ id, note })) },
];
