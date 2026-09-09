import { MonomialAlgebra, SignAlgebra, REALS } from './monomial.js';
import { CD, M, cayleyDickson, ultronion, splitCD, tower, double, BALES, allDoublingFormulas, type TowerStep } from './doubling.js';
import { clifford } from './clifford.js';
import { tensor } from './tensor.js';

const cache = new Map<string, MonomialAlgebra>();

export function O(): SignAlgebra { return preset('O') as SignAlgebra; }
export function S(): SignAlgebra { return preset('S') as SignAlgebra; }
export function T(): SignAlgebra { return preset('T') as SignAlgebra; }
export function mirrorSedenions(): SignAlgebra { return preset("S'") as SignAlgebra; }

/**
 * Preset names:
 *  R C H O S T U1..U8, S' (mirror sedenions), M(H), M(M(H)), CD(M(H)), M(S), M(S'),
 *  dual, splitC, splitH, splitO, A(q,p), Cl(p,q[,r]), tessarines, biquaternions, dualquaternions,
 *  Bales:<P0..P3|P0T..P3T> (one step over O), Bales#k (k in 0..31, one step over O),
 *  word:<steps separated by '.'> e.g. word:CD.CD.CD.M  (applied to R).
 */
export function preset(name: string): MonomialAlgebra {
  const hit = cache.get(name);
  if (hit) return hit;
  const A = build(name);
  cache.set(name, A);
  return A;
}

function build(name: string): MonomialAlgebra {
  const cdNames: Record<string, number> = { R: 0, C: 1, H: 2, O: 3, S: 4, T: 5 };
  if (name in cdNames) return cayleyDickson(cdNames[name]);
  let mt: RegExpExecArray | null;
  if ((mt = /^U(\d+)$/.exec(name))) return ultronion(parseInt(mt[1], 10));
  if (name === "S'" || name === 'Sprime' || name === 'M(O)') return M(preset('O'), "S'") ;
  if (name === 'M(H)') return M(preset('H'));
  if (name === 'M(M(H))') return M(preset('M(H)'));
  if (name === 'CD(M(H))') return CD(preset('M(H)'));
  if (name === 'M(S)') return M(preset('S'));
  if (name === "M(S')") return M(preset("S'"));
  if (name === 'dual') return CD(REALS, 0, 'dual');
  if (name === 'splitC') return splitCD(0, 1, 'splitC');
  if (name === 'splitH') return splitCD(1, 1, 'splitH');
  if (name === 'splitO') return splitCD(2, 1, 'splitO');
  if ((mt = /^A\((\d+),(\d+)\)$/.exec(name))) return splitCD(parseInt(mt[1], 10), parseInt(mt[2], 10));
  if ((mt = /^Cl\((\d+),(\d+)(?:,(\d+))?\)$/.exec(name))) return clifford(parseInt(mt[1], 10), parseInt(mt[2], 10), mt[3] ? parseInt(mt[3], 10) : 0);
  if (name === 'tessarines') return tensor(preset('C'), preset('C'), 'tessarines');
  if (name === 'biquaternions') return tensor(preset('H'), preset('C'), 'biquaternions');
  if (name === 'dualquaternions') return tensor(preset('H'), preset('dual'), 'dualquaternions');
  if ((mt = /^Bales:(P[0-3]T?)$/.exec(name))) return double(preset('O'), BALES[mt[1]], { name });
  if ((mt = /^Bales#(\d+)$/.exec(name))) {
    const f = allDoublingFormulas()[parseInt(mt[1], 10)];
    return double(preset('O'), f.formula, { name: `Bales#${mt[1]} ${f.name}` });
  }
  if ((mt = /^word:(.+)$/.exec(name))) return tower(REALS, mt[1].split('.') as TowerStep[], name);
  throw new Error(`unknown preset '${name}'`);
}

export const PRESET_NAMES = ['R', 'C', 'H', 'O', 'S', 'T', 'U3', 'U4', 'U5', "S'", 'M(H)', 'M(M(H))', 'CD(M(H))', 'M(S)', "M(S')",
  'dual', 'splitC', 'splitH', 'splitO', 'A(3,1)', 'A(0,4)', 'Cl(2,0)', 'Cl(3,0)', 'Cl(0,2)', 'Cl(1,3)', 'Cl(3,0,1)', 'tessarines', 'biquaternions', 'dualquaternions'];
