/// <reference lib="webworker" />
import * as hav from '@hav/core';
import type { SignAlgebra } from '@hav/core';

const cache = new Map<string, unknown>();
const A = (name: string) => hav.preset(name) as SignAlgebra;

const fns: Record<string, (...args: never[]) => unknown> = {
  summary(preset: string) {
    const X = A(preset);
    const s = hav.summarize(X, hav.enumerateTriads(X));
    const c = X.m >= 3 ? hav.subalgebraCensus(X) : null;
    const N = X.n - 1;
    return { ...s, census: c ? { H: c.H, O: c.O, P4: c.P4, P12: c.P12, P14: c.P14, other: c.other } : null, zeroDivisors: X.m >= 1 ? hav.zeroDivisorCount(X) : 0, formula: hav.zeroDivisorFormula(N) };
  },
  triads(preset: string, filter: { type?: string; kind?: string; offset: number; limit: number }) {
    const X = A(preset);
    const tt = hav.enumerateTriads(X);
    const out: { b: number; c: number; d: number; type: string; kind: number; m: ReturnType<typeof hav.moufangBits> }[] = [];
    let total = 0;
    for (let i = 0; i < tt.count; i++) {
      const type = hav.CODE_TYPE[tt.type[i]];
      const kind = tt.kind[i];
      if (filter.type && filter.type !== 'all' && type !== filter.type) continue;
      if (filter.kind === 'cycle' && kind !== 2) continue;
      if (filter.kind === 'noncycle' && kind !== 1) continue;
      if (filter.kind === 'first' && !(kind === 2 && tt.c[i] < (tt.b[i] ^ tt.c[i]) && (tt.b[i] ^ tt.c[i]) < tt.d[i])) continue;
      if (total >= filter.offset && out.length < filter.limit) out.push({ b: tt.b[i], c: tt.c[i], d: tt.d[i], type, kind, m: hav.moufangBits(X, tt.b[i], tt.c[i], tt.d[i]) });
      total++;
    }
    return { rows: out, total };
  },
  facts(preset: string) {
    const X = A(preset);
    return { facts: hav.facts(X), identify: hav.identify(X), lines: hav.quaternionLines(X), pureTrace: hav.pureTrace(X) };
  },
  der(preset: string) {
    const X = A(preset);
    if (X.n > 64) return { dim: null, note: 'dimension too large for the on-the-fly solver; run in the CLI' };
    const D = hav.derivations(X);
    const killing = D.length > 0 && D.length <= 16 ? hav.killingSignature(D, X.n) : null;
    return { dim: D.length, killing };
  },
  lattice(preset: string) {
    const X = A(preset);
    const dims: { k: number; subs: { basis: number[]; label: string }[] }[] = [];
    for (let k = 1; k <= X.m; k++) {
      const subs = hav.subspacesOfDim(X.m, k).map((basis) => ({ basis, label: X.m <= 5 || k <= 3 ? hav.identify(hav.basisSubalgebra(X, basis).induced) : `${1 << k}-dim` }));
      dims.push({ k, subs });
    }
    return dims;
  },
  zd(preset: string) {
    const X = A(preset);
    const zt = hav.zeroDivisorTriads(X);
    const cls = hav.cycleModeClasses(X, zt);
    const rows = zt.length <= 2000 ? zt : zt.slice(0, 2000);
    return { count: hav.zeroDivisorCount(X), formula: hav.zeroDivisorFormula(X.n - 1), triads: zt.length, classes: cls.orbits.map((o) => ({ size: o.length, rep: o[0] })), rows, twoTerm: X.n <= 64 ? hav.twoTermZeroDivisorElements(X).length : null };
  },
  bales() { return hav.balesCensus().map((r) => ({ name: r.name, balesName: r.balesName, admissible: r.admissible, classOverO: r.classOverO, compositionHyperplanes: r.compositionHyperplanes, dimDer: r.dimDer })); },
  tree(depth: number, base: string) { return hav.orientationTree(depth, hav.preset(base), { withDer: depth <= 2 }).map((n) => ({ word: n.word.join('·'), dim: n.algebra.n, isoClass: n.isoClass, dimDer: n.dimDer, octaves: n.octaves })); },
  signCensus() {
    const rows = hav.censusWithOctaves(8);
    const cls = hav.classifyCensus(rows);
    return { configurations: rows.length, cosets: hav.censusCosets(rows).length, classes: cls.classes.map((c) => ({ isS: c.isS, isSprime: c.isSprime, dimDer: c.dimDer, size: c.size, bits: c.rep.bits, octaves: c.octaves })) };
  },
  octaveConfig(preset: string) { const o = hav.octaveConfiguration(A(preset)); return { composition: o.composition, throughPoint: o.throughPoint, avoidingPoint: o.avoidingPoint, hyperplanes: o.hyperplanes }; },
  identifySub(preset: string, basis: number[]) { const X = A(preset); const B = hav.basisSubalgebra(X, basis); return { label: hav.identify(B.induced), counts: basis.length === 3 ? hav.octaveTypeCounts(X, basis) : null, elements: B.elements }; },
  gaut(preset: string) { return hav.gradedAutomorphismOrder(A(preset)); },
  sample(preset: string, frame: hav.FrameSpec, obs: hav.ObservableSpec, grid: hav.GridSpec) {
    const X = hav.preset(preset);
    const heavy = ['zd', 'ann', 'stretch', 'alt'].includes(obs.kind);
    const res = X.n > 32 && heavy ? Math.min(grid.res, 6) : X.n > 16 && heavy ? Math.min(grid.res, 9) : grid.res;
    return hav.sampleObservable(X as hav.SignAlgebra, frame, obs, { ...grid, res });
  },
};

self.onmessage = (ev: MessageEvent<{ id: number; fn: string; args: unknown[] }>) => {
  const { id, fn, args } = ev.data;
  const key = `${fn}:${JSON.stringify(args)}`;
  try {
    let result = cache.get(key);
    if (result === undefined) { result = (fns[fn] as (...a: unknown[]) => unknown)(...args); cache.set(key, result); }
    self.postMessage({ id, result });
  } catch (e) {
    self.postMessage({ id, error: (e as Error).message });
  }
};
