# Hypercomplex Algebra Viewer

A desktop laboratory for finite-dimensional real algebras: set an algebra
(Cayley–Dickson tower to dimension 256, mirror doubles, split forms, Clifford
algebras, tensor products, custom tables), slice it by a subalgebra, rotate the
slice, and watch the multiplication structure respond. See [SPEC.md](SPEC.md).

## Status

- M0 done: workspace, CI, fixtures transcribed from both reference papers.
- M1 done: engine (`core/`) with the Wilmot triad module and the mirror-double
  constructions; all fixtures green through U₄ (128 dimensions).
- M4 done: 3D canvas (three.js) with slices given by axis expressions and a
  tilt, observables (square, multiplication, commutator, associator, norm,
  zero-divisor field with dead-set highlighting, annihilator dimension,
  stretch levels, alternator, leakage, exponential curves), a live leakage
  readout, and an Inspector with the mirror paper's coordinates. Tours 1
  and 12 are playable.
- M3 done: desktop app shell (`app/`): Electron + React + Dockview with
  Set, Multiplication table (χ and triad-type overlays), Structure graph,
  Facts, Subalgebra lattice, Triad explorer, Zero divisors, Census, Console
  and Tours panels; the engine runs in a Web Worker. Tours 6, 7, 8, 10, 11
  and 14 are playable.
- M2 done: mirror module (Φ, Bales census, orientation tree, χ, graded search,
  stretch spectrum, Z/Ann/P samplers, octaves, Brown's map, sign-function
  census); every Appendix A statement of the mirror paper is a passing test.
  See [docs/engine-notes.md](docs/engine-notes.md) for findings.

## Run the desktop app

Requires Node.js 22 or newer. `npm install` downloads the Electron binary.

```
npm install
npm run app:start          # builds the renderer and opens the window
```

Neither command needs a second terminal. For development, with hot reload:

```
npm run app:dev                       # http://localhost:5173 in any browser
npm run app:electron-dev              # dev server + Electron window, one command
```

`app:electron-dev` starts the dev server itself and opens the window once the
server answers; if a dev server is already listening on the port it attaches to
that one instead. Ctrl-C stops whatever it started. Set `HAV_DEV_PORT` to use a
port other than 5173. To attach a window to a server you started elsewhere, use
`npm run app:attach`.

The renderer is a plain web app, so `npm run app:dev` alone is enough to use
every panel in Chrome, Firefox or Safari — no Electron, no second terminal.

## Command line

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
app/        desktop app: Vite + React renderer (src/), Electron main (electron/)
tools/cli   `hav` command-line front end
tools/oracle  external reference implementations used by CI (GPL geoalg; not linked into the app)
tests/fixtures  numbers transcribed from the papers
docs/refs   the papers
```
