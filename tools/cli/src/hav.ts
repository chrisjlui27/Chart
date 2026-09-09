#!/usr/bin/env tsx
import { preset, PRESET_NAMES, SignAlgebra, MonomialAlgebra, facts, enumerateTriads, summarize, subalgebraCensus, zeroDivisorCount, zeroDivisorFormula, zeroDivisorTriads, cycleModeClasses, derivations, identify, fingerprint, balesCensus, orientationTree, octaveConfiguration, gradedAutomorphismOrder, subspacesOfDim, basisSubalgebra, SILOS, formatElement, parseElement, mul } from '@hav/core';

const [cmd, ...args] = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const flag = (k: string) => args.includes(k);
const A = (name?: string) => preset(name ?? args[0]);
const pad = (s: string | number, w: number) => String(s).padStart(w);

function table(rows: (string | number)[][], header?: string[]) {
  const all = header ? [header, ...rows] : rows;
  const widths = all[0].map((_, j) => Math.max(...all.map((r) => String(r[j]).length)));
  for (const r of all) console.log(r.map((c, j) => pad(c, widths[j])).join('  '));
}

switch (cmd) {
  case 'list': console.log(PRESET_NAMES.join('\n')); break;
  case 'facts': {
    const X = A();
    const f = facts(X);
    console.log(`${f.name}: dim ${f.dim}`);
    for (const [k, v] of Object.entries(f)) if (k !== 'name' && k !== 'dim') console.log(`  ${k}: ${JSON.stringify(v)}`);
    if (X instanceof MonomialAlgebra) console.log(`  identify: ${identify(X)}`);
    if (flag('--der')) console.log(`  dim Der: ${derivations(X).length}`);
    break;
  }
  case 'table': {
    const X = A() as SignAlgebra;
    const graded = flag('--graded') && X instanceof SignAlgebra;
    const L = graded ? X.gradedLabels() : X.labels;
    const rows = [];
    for (let g = 0; g < X.n; g++) rows.push([L[g], ...Array.from({ length: X.n }, (_, h) => { const m = X.mono(g, h); return m.s === 0 ? '0' : (m.s < 0 ? '-' : '') + L[m.g]; })]);
    table(rows, ['', ...L]);
    break;
  }
  case 'wilmot': {
    const X = A() as SignAlgebra;
    const s = summarize(X, enumerateTriads(X));
    const c = subalgebraCensus(X);
    const N = X.n - 1;
    console.log(`${X.name}: N = ${N} pure basis elements, ${s.triads} triads`);
    console.log(`Table 2: associative ${s.associative}, non-cycles ${s.nonCycles}, 3-triad cycles ${s.cycleTriads}`);
    console.log(`Table 4 silos: ${SILOS.map((k) => `${k} ${s.silos[k] ?? 0}`).join(', ')}`);
    console.log(`Table 4 non-cycle types: A ${s.nonCycleTypes.A}, B ${s.nonCycleTypes.B}, C ${s.nonCycleTypes.C}, X ${s.nonCycleTypes.X}`);
    console.log(`Types (all non-associative triads): A ${s.types.A}, B ${s.types.B}, C ${s.types.C}, X ${s.types.X}`);
    console.log(`Table 5: H ${c.H}, O ${c.O}, P4 ${c.P4}, P12 ${c.P12}, P14 ${c.P14}, other ${c.other}`);
    const Z = zeroDivisorCount(X);
    console.log(`Table 14: non-associative ${s.triads - s.associative} (28-factor ${(s.triads - s.associative) / 28}), zero divisors ${Z} (84-factor ${Z / 84}), formula ${zeroDivisorFormula(N)}`);
    if (flag('--iso')) { const ci = subalgebraCensus(X, { method: 'iso' }); console.log(`Table 5 by graded isomorphism: O ${ci.O}, P4 ${ci.P4}, P12 ${ci.P12}, P14 ${ci.P14}, other ${ci.other}`); }
    break;
  }
  case 'zd': {
    const X = A() as SignAlgebra;
    const zt = zeroDivisorTriads(X);
    const cls = cycleModeClasses(X, zt);
    console.log(`${X.name}: ${zeroDivisorCount(X)} distinct two-term zero-divisor pairs, ${zt.length} zero-divisor triads, ${cls.count} cycle/mode classes`);
    if (flag('--all')) { const L = X.gradedLabels(); table(zt.map((z) => [L[z.b], L[z.c], L[z.d], (z.sa < 0 ? '-' : '') + L[z.a], z.type, [z.modes.dual ? 'D' : '-', z.modes.extended ? 'E' : '-', z.modes.extendedDual ? 'X' : '-'].join('')]), ['b', 'c', 'd', 'a', 'type', 'modes']); }
    else { const L = X.gradedLabels(); table(cls.orbits.map((o) => { const z = o[0]; return [o.length, L[z.b], L[z.c], L[z.d], (z.sa < 0 ? '-' : '') + L[z.a], z.type]; }), ['size', 'b', 'c', 'd', 'a', 'type']); }
    break;
  }
  case 'lattice': {
    const X = A() as SignAlgebra;
    for (let k = 1; k <= X.m; k++) {
      const subs = subspacesOfDim(X.m, k);
      const counts = new Map<string, number>();
      for (const b of subs) { const id = identify(basisSubalgebra(X, b).induced); counts.set(id, (counts.get(id) ?? 0) + 1); }
      console.log(`dim ${1 << k}: ${subs.length} basis subalgebras — ${[...counts].map(([k2, v]) => `${v} × ${k2}`).join(', ')}`);
    }
    break;
  }
  case 'fingerprint': console.log(JSON.stringify(fingerprint(A() as MonomialAlgebra), null, 2)); break;
  case 'bales': table(balesCensus().map((r) => [r.balesName ?? '', r.name, r.admissible ? 'admissible' : '', r.classOverO, r.compositionHyperplanes, r.dimDer]), ['Bales', 'formula', '', 'over O', 'octaves', 'dim Der']); break;
  case 'tree': {
    const depth = parseInt(args[0] ?? '2', 10);
    const nodes = orientationTree(depth, preset(opt('--base') ?? 'O'), { withDer: !flag('--no-der') });
    table(nodes.map((n) => [n.word.join('·'), n.algebra.n, `class ${n.isoClass}`, n.dimDer, `${n.octaves.O} O + ${n.octaves.P4} P4 + ${n.octaves.other} other`]), ['word', 'dim', 'iso class', 'dim Der', 'basis octaves']);
    break;
  }
  case 'octaves': { const X = A() as SignAlgebra; const o = octaveConfiguration(X, parseInt(opt('--point') ?? '8', 10)); console.log(`${X.name}: ${o.composition} composition hyperplanes, ${o.throughPoint} through the doubling point, ${o.avoidingPoint} avoiding it`); break; }
  case 'gaut': console.log(gradedAutomorphismOrder(A() as SignAlgebra)); break;
  case 'mul': { const X = A() as SignAlgebra; const x = parseElement(X, args[1]), y = parseElement(X, args[2]); const L = flag('--graded') ? X.gradedLabels() : X.labels; console.log(formatElement(X, mul(X, x, y), L)); break; }
  default:
    console.log(`hav — hypercomplex algebra viewer CLI
  list                       preset names
  facts <preset> [--der]     identities, squares, identification
  table <preset> [--graded]  multiplication table
  wilmot <preset> [--iso]    Wilmot's Tables 2, 4, 5, 14 for the preset
  zd <preset> [--all]        zero-divisor triads, classes, modes
  lattice <preset>           basis subalgebras by dimension and type
  fingerprint <preset>
  bales                      the 32-formula census over O
  tree <depth> [--base P]    orientation tree of words in {CD, M}
  octaves <preset>           composition hyperplanes vs the doubling point
  gaut <preset>              graded automorphism group order
  mul <preset> "x" "y"       multiply two elements, e.g. mul S "o1 - o1234" "o2 + o34"`);
}
