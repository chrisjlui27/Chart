# Hypercomplex Algebra Viewer

A desktop laboratory for finite-dimensional real algebras: set an algebra
(Cayley–Dickson tower to dimension 256, mirror doubles, split forms, Clifford
algebras, tensor products, custom tables), slice it by a subalgebra, rotate the
slice, and watch the multiplication structure respond. See [SPEC.md](SPEC.md).

## Status

- M0 done: workspace, CI, fixtures transcribed from both reference papers.
- M1 done: engine (`core/`) with the Wilmot triad module and the mirror-double
  constructions; all fixtures green through U₄ (128 dimensions).
- M2 done: mirror module (Φ, Bales census, orientation tree, χ, graded search,
  stretch spectrum, Z/Ann/P samplers, octaves, Brown's map, sign-function
  census); every Appendix A statement of the mirror paper is a passing test.
  See [docs/engine-notes.md](docs/engine-notes.md) for findings.

## Use

```
npm install
npm test                      # fixture suite (~20 s)
npm run test:nightly          # adds U5 and the 64-dimensional orientation tree
npm run hav -- list           # presets
npm run hav -- wilmot U4      # Wilmot's Tables 2, 4, 5, 14 for the 128-dimensional algebra
npm run hav -- zd S           # zero-divisor classes of the sedenions
npm run hav -- bales          # the 32-formula census over O
npm run hav -- tree 2         # orientation tree of words in {CD, M} over O
npm run hav -- census         # sign-function census on F2^4 (three eight-octave classes)
npm run hav -- zdpair "S'"     # zero-divisor pairs and local dimensions of P and Z
npm run hav -- mul S "o1 - o1234" "o2 + o34" --graded
```

## Layout

```
core/       engine (TypeScript, no UI dependency)
tools/cli   `hav` command-line front end
tools/oracle  external reference implementations used by CI (GPL geoalg; not linked into the app)
tests/fixtures  numbers transcribed from the papers
docs/refs   the papers
```
