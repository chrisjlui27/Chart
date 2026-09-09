import type { Algebra } from '../algebra/types.js';
import { parseElement, type Vec } from '../ops/element.js';
import { orthonormalRows, leakage } from '../sub/leakage.js';

export interface TiltSpec { axis: number; target: string; angle: number }
/** A display frame: up to three axis directions and an origin, given as element expressions. */
export interface FrameSpec { axes: string[]; origin?: string; tilt?: TiltSpec }

export interface Frame {
  /** orthonormal axis vectors in R^n (2 or 3) */
  f: Vec[];
  origin: Vec;
  /** leakage of span(axes) and of span(1, axes) */
  leakage: number;
  leakageWithUnit: number;
}

function normalise(v: Vec): Vec { const s = Math.sqrt(v.reduce((a, x) => a + x * x, 0)); if (s === 0) throw new Error('zero axis'); return v.map((x) => x / s); }

/** Build the frame: parse axes, orthonormalise, apply the tilt exp(θ f_i ∧ w) with w the target direction orthogonalised against the frame. */
export function buildFrame(A: Algebra & { parseLabel?: (s: string) => number }, spec: FrameSpec): Frame {
  const n = A.n;
  const raw = spec.axes.filter((s) => s.trim()).map((s) => parseElement(A, s));
  let f = orthonormalRows(raw);
  if (f.length !== raw.length) throw new Error('axes are linearly dependent');
  if (spec.tilt && spec.tilt.angle !== 0 && spec.tilt.target.trim()) {
    const i = spec.tilt.axis;
    if (i < f.length) {
      let w = parseElement(A, spec.tilt.target);
      for (const u of f) { let d = 0; for (let k = 0; k < n; k++) d += w[k] * u[k]; for (let k = 0; k < n; k++) w[k] -= d * u[k]; }
      const wn = Math.sqrt(w.reduce((a, x) => a + x * x, 0));
      if (wn > 1e-12) {
        w = w.map((x) => x / wn);
        const c = Math.cos(spec.tilt.angle), s = Math.sin(spec.tilt.angle);
        f = f.map((u, j) => (j === i ? u.map((x, k) => c * x + s * w[k]) : u));
      }
    }
  }
  const origin = spec.origin && spec.origin.trim() && spec.origin.trim() !== '0' ? parseElement(A, spec.origin) : new Float64Array(n);
  const unit = new Float64Array(n); if (A.unit !== null) unit[A.unit] = 1;
  return { f, origin, leakage: leakage(A, f), leakageWithUnit: A.unit === null ? NaN : leakage(A, orthonormalRows([unit, ...f])) };
}
export { normalise };
