import { describe, it, expect } from 'vitest';
import { preset, SignAlgebra, buildFrame, sampleObservable, inspectPoint, parseElement } from '../src/index.js';

describe('frames and observables', () => {
  it('a tilted complex plane in H stays a subalgebra; the (1,i,j) slice leaks', () => {
    const H = preset('H') as SignAlgebra;
    for (const angle of [0, 0.4, 1.1]) {
      const fr = buildFrame(H, { axes: ['1', 'o1'], tilt: { axis: 1, target: 'o2', angle } });
      expect(fr.leakage).toBeLessThan(1e-12);
    }
    expect(buildFrame(H, { axes: ['1', 'o1', 'o2'] }).leakage).toBeGreaterThan(0.1);
  });
  it('the zero-divisor field vanishes on the dead line of the (a0, u, bℓ) chart in S′ and not in S when b ∥ u', () => {
    const Sp = preset("S'") as SignAlgebra, S = preset('S') as SignAlgebra;
    const chart = { axes: ['1', 'o1', 'e9'] }; // x = a0 + r o1 + s (o1 ℓ)
    const rp = sampleObservable(Sp, chart, { kind: 'zd' }, { res: 5, range: 1 });
    const rs = sampleObservable(S, chart, { kind: 'zd' }, { res: 5, range: 1 });
    // point (0, 1, 1): a0 = 0, |a| = |b| -> zero divisor in S' (b in C_u), not in S
    const idx = (t: number[]) => { let best = 0, bd = Infinity; for (let i = 0; i < rp.count; i++) { const d = Math.hypot(rp.pos[3 * i] - t[0], rp.pos[3 * i + 1] - t[1], rp.pos[3 * i + 2] - t[2]); if (d < bd) { bd = d; best = i; } } return best; };
    const i = idx([0, 1, 1]);
    expect(rp.value![i]).toBeLessThan(1e-9);
    expect(rs.value![i]).toBeGreaterThan(0.1);
    const ann = sampleObservable(Sp, chart, { kind: 'ann' }, { res: 5, range: 1 });
    expect(ann.value![i]).toBe(6);
  });
  it('inspector reports the paper coordinates and the stretch levels', () => {
    const Sp = preset("S'") as SignAlgebra;
    const x = parseElement(Sp, 'o1 + e10'); // u = o1, b = o2: generic zero divisor
    const info = inspectPoint(Sp, x) as { dimAnn: number; stretch: { mult: number }[]; paper: { a0: number; aImag: number; b: number; zeroDivisorConditionMirror: boolean } };
    expect(info.dimAnn).toBe(2);
    expect(info.paper.zeroDivisorConditionMirror).toBe(true);
    expect(info.paper.aImag).toBeCloseTo(1);
    expect(info.paper.b).toBeCloseTo(1);
  });
  it('square map on the complex plane leaks nothing; exponential curves close up', () => {
    const C = preset('C') as SignAlgebra;
    const r = sampleObservable(C, { axes: ['1', 'o1'] }, { kind: 'square' }, { res: 4, range: 1 });
    expect(Math.max(...Array.from(r.leak!))).toBeLessThan(1e-12);
    const e = sampleObservable(C, { axes: ['1', 'o1'] }, { kind: 'exp' }, { res: 2, range: 1 });
    expect(e.curves!.starts.length).toBeGreaterThan(0);
  });
});
