import type { Algebra } from '../algebra/types.js';
import { parseElement, mul, commutator, associator, normOf, Lmat, conj, alternatorMatrix, unitVec, exp, scale, add, type Vec } from '../ops/element.js';
import { symEig, matMul, transpose, rankOf } from '../linalg/dense.js';
import { buildFrame, type FrameSpec, type Frame } from './frame.js';

export type ObservableKind = 'square' | 'mulL' | 'mulR' | 'commutator' | 'associator' | 'norm' | 'zd' | 'ann' | 'stretch' | 'alt' | 'leak' | 'exp';
export interface ObservableSpec { kind: ObservableKind; u?: string; v?: string }
export interface GridSpec { res: number; range: number }

export const OBSERVABLES: { kind: ObservableKind; label: string; needs: ('u' | 'v')[]; scalar: boolean; description: string }[] = [
  { kind: 'square', label: 'square x ↦ x²', needs: [], scalar: false, description: 'deformed lattice: image of the grid under squaring; colour = component leaving the slice' },
  { kind: 'mulL', label: 'left multiply x ↦ u·x', needs: ['u'], scalar: false, description: 'rotation / boost / shear / isoclinic rotation of the slice by u' },
  { kind: 'mulR', label: 'right multiply x ↦ x·u', needs: ['u'], scalar: false, description: '' },
  { kind: 'commutator', label: 'commutator [u, x]', needs: ['u'], scalar: false, description: 'where and how much commutativity fails' },
  { kind: 'associator', label: 'associator [u, v, x]', needs: ['u', 'v'], scalar: false, description: 'fails off the lines through u, v' },
  { kind: 'norm', label: 'norm N(x)', needs: [], scalar: true, description: 'spheres, hyperboloids, null cones' },
  { kind: 'zd', label: 'zero-divisor field σ_min(L_x)/|x|', needs: [], scalar: true, description: 'zero exactly on the dead set Z' },
  { kind: 'ann', label: 'annihilator dimension', needs: [], scalar: true, description: 'dim ker L_x: 0 off Z; 2 / 6 on S′, 4 on S' },
  { kind: 'stretch', label: 'stretch levels', needs: [], scalar: true, description: 'number of distinct eigenvalues of L_x̄L_x / N: 3 on S, 5 on S′' },
  { kind: 'alt', label: 'alternator ‖[x,x,·]‖ / N', needs: [], scalar: true, description: 'zero on the alternative elements' },
  { kind: 'leak', label: 'leakage ‖(I − P)(x·x)‖ / N', needs: [], scalar: true, description: 'how far x² leaves the slice' },
  { kind: 'exp', label: 'exponential curves t ↦ exp(t x)', needs: [], scalar: false, description: 'circles, hyperbolas, lines; one-parameter subgroups' },
];

export interface SampleResult {
  kind: ObservableKind;
  dim: number;
  /** grid coordinates (t1,t2,t3) per point, length 3*count */
  pos: Float32Array;
  count: number;
  /** scalar value per point (scalar observables) */
  value?: Float32Array;
  /** displayed coordinates of the image per point (vector observables) */
  img?: Float32Array;
  /** real-part coefficient of the image */
  real?: Float32Array;
  /** magnitude of the image outside span(frame, unit) */
  leak?: Float32Array;
  /** polylines for curve observables: flat positions and a segment index list */
  curves?: { pos: Float32Array; starts: Int32Array; real: Float32Array };
  frame: { leakage: number; leakageWithUnit: number };
  range: [number, number];
}

function projectCoords(f: Vec[], y: Vec): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  f.forEach((u, i) => { let d = 0; for (let k = 0; k < y.length; k++) d += u[k] * y[k]; out[i] = d; });
  return out;
}

/** Sample an observable over a grid in the slice. */
export function sampleObservable(A: Algebra & { parseLabel?: (s: string) => number }, frameSpec: FrameSpec, obs: ObservableSpec, grid: GridSpec): SampleResult {
  const frame: Frame = buildFrame(A, frameSpec);
  const n = A.n, dim = frame.f.length;
  const unit = A.unit !== null ? unitVec(A) : null;
  const u = obs.u?.trim() ? parseElement(A, obs.u) : null;
  const v = obs.v?.trim() ? parseElement(A, obs.v) : null;
  const res = Math.max(2, grid.res), R = grid.range;
  const pointAt = (t: number[]): Vec => { const x = Float64Array.from(frame.origin); for (let i = 0; i < dim; i++) for (let k = 0; k < n; k++) x[k] += t[i] * frame.f[i][k]; return x; };
  const coords: number[][] = [];
  const steps = Array.from({ length: res }, (_, i) => -R + (2 * R * i) / (res - 1));
  if (dim === 3) for (const a of steps) for (const b of steps) for (const c of steps) coords.push([a, b, c]);
  else if (dim === 2) for (const a of steps) for (const b of steps) coords.push([a, b, 0]);
  else for (const a of steps) coords.push([a, 0, 0]);
  const count = coords.length;
  const pos = new Float32Array(count * 3);
  coords.forEach((t, i) => { pos[3 * i] = t[0]; pos[3 * i + 1] = t[1]; pos[3 * i + 2] = t[2]; });
  const base: SampleResult = { kind: obs.kind, dim, pos, count, frame: { leakage: frame.leakage, leakageWithUnit: frame.leakageWithUnit }, range: [0, 1] };
  // projector onto span(frame, unit) for the leak channel
  const proj = [...frame.f]; if (unit) { const w = Float64Array.from(unit); for (const q of proj) { let d = 0; for (let k = 0; k < n; k++) d += w[k] * q[k]; for (let k = 0; k < n; k++) w[k] -= d * q[k]; } const wn = Math.sqrt(w.reduce((a, x) => a + x * x, 0)); if (wn > 1e-9) proj.push(w.map((x) => x / wn)); }
  const leakOf = (y: Vec) => { const r = Float64Array.from(y); for (const q of proj) { let d = 0; for (let k = 0; k < n; k++) d += r[k] * q[k]; for (let k = 0; k < n; k++) r[k] -= d * q[k]; } return Math.sqrt(r.reduce((a, x) => a + x * x, 0)); };

  if (obs.kind === 'exp') {
    // directions: grid points on the unit sphere/circle of the slice (subsample), curves t in [0, T]
    const dirs: number[][] = [];
    const m = dim === 3 ? 6 : 12;
    if (dim === 3) for (let i = 0; i < m; i++) for (let j = 0; j < 2 * m; j++) { const th = (Math.PI * (i + 0.5)) / m, ph = (2 * Math.PI * j) / (2 * m); dirs.push([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]); }
    else for (let j = 0; j < 2 * m; j++) dirs.push([Math.cos((2 * Math.PI * j) / (2 * m)), Math.sin((2 * Math.PI * j) / (2 * m)), 0]);
    const T = 2 * Math.PI, K = 64;
    const cpos: number[] = [], starts: number[] = [], creal: number[] = [];
    for (const d of dirs) {
      starts.push(cpos.length / 3);
      const x0 = pointAt(d.map((c) => c * R));
      for (let s = 0; s <= K; s++) {
        const y = exp(A, scale(x0, (T * s) / K / R));
        const c = projectCoords(frame.f, y);
        cpos.push(c[0], c[1], c[2]);
        creal.push(unit ? y[A.unit!] : 0);
      }
    }
    base.curves = { pos: Float32Array.from(cpos), starts: Int32Array.from(starts), real: Float32Array.from(creal) };
    return base;
  }
  const scalar = ['norm', 'zd', 'ann', 'stretch', 'alt', 'leak'].includes(obs.kind);
  if (scalar) {
    const value = new Float32Array(count);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < count; i++) {
      const x = pointAt(coords[i]);
      const N2 = x.reduce((a, q) => a + q * q, 0);
      let val = 0;
      if (N2 < 1e-14) val = obs.kind === 'ann' ? n : 0;
      else switch (obs.kind) {
        case 'norm': val = normOf(A, x).N; break;
        case 'zd': { const L = Lmat(A, x); const G = matMul(transpose(L, n, n), L, n, n, n); const { values } = symEig(G, n); val = Math.sqrt(Math.max(values[0], 0) / N2); break; }
        case 'ann': { const L = Lmat(A, x); val = n - rankOf(L, n, n, 1e-7 * Math.sqrt(N2)); break; }
        case 'stretch': { const L = Lmat(A, x), Lb = Lmat(A, conj(A, x)); const P = matMul(Lb, L, n, n, n); const PT = transpose(P, n, n); for (let k = 0; k < n * n; k++) P[k] = (P[k] + PT[k]) / 2; const { values } = symEig(P, n); let levels = 1; for (let k = 1; k < n; k++) if (Math.abs(values[k] - values[k - 1]) > 1e-6 * N2) levels++; val = levels; break; }
        case 'alt': { const M = alternatorMatrix(A, x); let s = 0; for (const q of M) s += q * q; val = Math.sqrt(s) / N2; break; }
        case 'leak': val = leakOf(mul(A, x, x)) / N2; break;
      }
      value[i] = val; if (val < lo) lo = val; if (val > hi) hi = val;
    }
    base.value = value; base.range = [lo, hi];
    return base;
  }
  const img = new Float32Array(count * 3), real = new Float32Array(count), leak = new Float32Array(count);
  let hi = 0;
  for (let i = 0; i < count; i++) {
    const x = pointAt(coords[i]);
    let y: Vec;
    switch (obs.kind) {
      case 'square': y = mul(A, x, x); break;
      case 'mulL': y = u ? mul(A, u, x) : x; break;
      case 'mulR': y = u ? mul(A, x, u) : x; break;
      case 'commutator': y = u ? commutator(A, u, x) : new Float64Array(n); break;
      case 'associator': y = u && v ? associator(A, u, v, x) : new Float64Array(n); break;
      default: y = x;
    }
    // displayed coordinates relative to the origin
    const rel = add(y, scale(frame.origin, -1));
    const c = projectCoords(frame.f, rel);
    img[3 * i] = c[0]; img[3 * i + 1] = c[1]; img[3 * i + 2] = c[2];
    real[i] = unit ? y[A.unit!] : 0;
    leak[i] = leakOf(y); if (leak[i] > hi) hi = leak[i];
  }
  base.img = img; base.real = real; base.leak = leak; base.range = [0, hi];
  return base;
}

/** Everything the inspector shows about one point. */
export function inspectPoint(A: Algebra & { parseLabel?: (s: string) => number }, x: Vec): Record<string, unknown> {
  const n = A.n;
  const { N, scalar } = normOf(A, x);
  const out: Record<string, unknown> = { N, normScalar: scalar };
  const N2 = x.reduce((a, q) => a + q * q, 0);
  if (N2 > 1e-14) {
    const L = Lmat(A, x);
    out.dimAnn = n - rankOf(L, n, n, 1e-7 * Math.sqrt(N2));
    const Lb = Lmat(A, conj(A, x)); const P = matMul(Lb, L, n, n, n); const PT = transpose(P, n, n); for (let k = 0; k < n * n; k++) P[k] = (P[k] + PT[k]) / 2;
    const { values } = symEig(P, n);
    const levels: { value: number; mult: number }[] = [];
    for (const vv of values) { const s = vv / (N || 1); const last = levels[levels.length - 1]; if (last && Math.abs(last.value - s) < 1e-6) last.mult++; else levels.push({ value: s, mult: 1 }); }
    out.stretch = levels;
    const M = alternatorMatrix(A, x); out.kerAltDim = n - rankOf(M, n, n, 1e-7 * N2);
    if (n % 2 === 0 && n >= 4 && A.unit === 0) {
      const h = n / 2; const a = x.slice(0, h), b = x.slice(h);
      const a0 = a[0]; const ap = Math.sqrt(a.slice(1).reduce((s, q) => s + q * q, 0)); const bn = Math.sqrt(b.reduce((s, q) => s + q * q, 0));
      let bpar = NaN;
      if (ap > 1e-12) { const ai = Float64Array.from(a); ai[0] = 0; const d = b.reduce((s, q, i) => s + q * ai[i], 0) / ap; bpar = Math.sqrt(b[0] ** 2 + d ** 2); }
      out.paper = { a0, aImag: ap, b: bn, bPar: bpar, zeroDivisorConditionMirror: Math.abs(a0) < 1e-9 && Math.abs(ap - bn) < 1e-9, aPerpB: Math.abs(a.reduce((s, q, i) => s + q * b[i], 0)) < 1e-9 };
    }
  }
  return out;
}
