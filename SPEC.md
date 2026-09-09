# Hypercomplex Algebra Viewer — Project Specification

Status: draft v0.2 (desktop respec, for review)
Target: standalone desktop application (macOS, Windows, Linux), fully offline

---

## 1. Vision

A desktop laboratory for finite-dimensional real algebras. You **set** an
algebra (quaternions, octonions, sedenions and higher Cayley–Dickson
algebras, split and dual forms, Clifford algebras, tensor products, or a
custom multiplication table), **slice** it by a subalgebra, and **rotate**
that slice through the ambient algebra while linked views render what the
multiplication does to the slice. Every animation corresponds to an exact
algebraic statement, and every visual quantity can be inspected, scripted
and exported.

The core insight the app is built around: **a subalgebra is a subspace
with zero "leakage"** (products of elements in the subspace stay in the
subspace). Rotating a slice off a subalgebra makes leakage appear; rotating
it by an automorphism keeps leakage at zero while everything else moves.
Watching leakage, associator, commutator, norm and zero-divisor structure
change as the slice moves is the "meaningful morph".

### What desktop adds over the phone spec

- **Compute.** Dimension cap rises from 64 to 256 on CPU and to 3D grids of
  64³ samples via GPU compute. Numerical searches (all subalgebras of a
  given dimension, zero-divisor varieties, derivation algebras) run
  interactively instead of being precomputed.
- **Space.** A docked, multi-pane workspace with linked views: canvas,
  leakage landscape, multiplication table, structure graph, subalgebra
  lattice, facts, timeline, console. Two scenes side by side for comparison.
- **Precision.** Keyboard and mouse: type exact elements, nudge angles by
  keystroke, drag keyframes on a timeline.
- **Depth.** A scripting console with the full engine API, exact rational
  arithmetic for monomial algebras, exploration of the automorphism group
  and its Lie algebra, and export of everything (images, video, tables,
  LaTeX, JSON).

### Goals

- Exact, testable algebra engine (structure constants, not hand-coded cases).
- One consistent visual language across all algebras so differences show up
  by comparison (ℂ vs split-ℂ vs dual numbers; ℍ vs 𝕆 vs 𝕊).
- Everything the user can click can also be scripted; every scene is data.
- Offline and self-contained. No accounts, no network.

### Non-goals (v1)

- Non-real base fields, infinite-dimensional algebras.
- A general computer algebra system. Arithmetic is exact for monomial
  algebras (integer signs, rational coefficients) and floating point
  elsewhere.
- Collaborative or cloud features.

---

## 2. Core interaction model

Four verbs, each a toolbar section; all views stay live while any of them
changes.

| Verb | The user chooses | Linked views update |
|------|------------------|---------------------|
| **Set** | Ambient algebra A (dim n) | Table, structure graph, facts, lattice |
| **Slice** | Subalgebra B ⊂ A and a display frame F (≤ 3 axes, or 4 with a 4D projection) | Canvas, table highlight, lattice selection |
| **Rotate** | Rotation mode and parameter(s), scrubbed, animated, or keyframed | Canvas, leakage landscape, structure graph |
| **Observe** | The observable(s) drawn on the slice | Canvas layers, inspector |

A **scene** = (algebra, subalgebra, frame, rotation state, observables,
camera, layout). Scenes are JSON, saved in a project file, undoable, and
addressable from the console.

---

## 3. Mathematical foundation

### 3.1 Algebra representation

An algebra is A = (ℝⁿ, basis e₀…e_{n−1}, product). Two storage forms:

- **Monomial table (primary, exact).** e_i e_j = s_{ij} · e_{k(i,j)} with
  s_{ij} ∈ {−1, 0, +1}, stored as two n×n integer arrays. Covers every
  Cayley–Dickson algebra (standard, split, dual), every Clifford algebra
  Cl(p,q,r), and tensor products and direct sums of these. Elements with
  rational coefficients multiply exactly (bigint rationals) when the user
  enables exact mode.
- **Dense structure constants (fallback).** c_{ij}^k as an n×n×n float
  array. Used for custom algebras, Lie algebras with bracket as product,
  Jordan algebras, and anything the monomial form cannot express.

Derived metadata: unit element, conjugation involution (from the
constructor), norm form N(x) = scalar part of x·x̄ when scalar-valued,
grading (Clifford), and the fingerprint of §3.7.

### 3.2 Constructors (the preset catalog)

| Constructor | Parameters | Produces |
|-------------|-----------|----------|
| `CayleyDickson(γ₁,…,γ_m)` | each γ ∈ {+1, −1, 0} | 2^m-dim. (+1)=ℂ, (−1)=split-ℂ, (0)=dual; (+1,+1)=ℍ, (+1,−1)=split-ℍ; (+1,+1,+1)=𝕆; four +1's = 𝕊; five = trigintaduonions (32); up to eight steps (256) |
| `Clifford(p,q,r)` | metric signature | 2^{p+q+r}-dim geometric algebra: Cl(2,0), Cl(3,0), Cl(0,2)≅ℍ, Cl(1,3) spacetime, Cl(3,0,1) PGA, Cl(4,1) CGA, up to p+q+r = 8 |
| `Tensor(A,B)` | two algebras | ℂ⊗ℂ tessarines, ℍ⊗ℂ biquaternions, ℍ⊗Dual dual quaternions, 𝕆⊗ℂ bioctonions |
| `DirectSum(A,B)` | two algebras | componentwise product |
| `Matrix(k, F)` | k, F ∈ {ℝ, ℂ, ℍ} | matrix algebra with matrix-unit basis, for isomorphism comparisons |
| `Lie(g)` | preset or structure constants | bracket as product (so(3), su(2), sl(2), 𝔤₂ from Der(𝕆)) |
| `Custom(table)` | user-entered or scripted | dense algebra, validated for consistency |

Cayley–Dickson product convention (fixed, shown in-app):

    (a, b)(c, d) = (a c − γ d̄ b,  d a + b c̄),   conj(a, b) = (ā, −b)

Basis ordering is the standard recursive one, so for 𝕆 the imaginary units
satisfy e_i e_j = ±e_{i XOR j}. Clifford blades are indexed by bitmask.

### 3.3 Element operations

mul, add, scale, conj, norm, inverse (via norm for composition algebras;
otherwise solve L_x y = 1), exp and log (scaling-and-squaring; Padé where
needed), integer and real powers, left/right multiplication matrices L_x,
R_x, commutator, associator, Jordan product, and the bilinear forms
⟨x,y⟩ = Re(x ȳ) where defined. All are pure functions; exact-mode
variants exist for monomial algebras.

### 3.4 Computed properties (the Facts panel)

Each is a numeric residual over all basis triples (exact zero test in exact
mode), reported with the residual and with a witness when false:

- commutative, associative, alternative, flexible, power-associative,
  Moufang, Jordan identity, Lie identities (antisymmetry, Jacobi)
- norm multiplicative (composition algebra)
- zero divisors exist, with a witness found by minimising σ_min(L_x)
- center, left/middle/right nucleus, commutant of a chosen element
- idempotents and nilpotents (basis-aligned exactly; general ones by
  numerical root finding from random starts)
- derivation algebra Der(A): dimension, basis, and its own structure
  constants as a Lie algebra, with Killing form signature and rank so that
  𝔤₂, so(3), etc. can be recognised
- recognised isomorphism type (§3.7)

Checkpoints that become engine tests: ℍ associative; 𝕆 alternative and
Moufang, not associative; 𝕊 flexible and power-associative, not
alternative, has zero divisors, norm not multiplicative; dim Der(ℍ) = 3,
dim Der(𝕆) = 14.

### 3.5 Subalgebras and slices

**Subalgebra B ⊂ A:** a subspace closed under product, stored as an
orthonormal basis (k × n). Sources:

- *Basis-aligned enumeration.* For monomial algebras, closure of every
  subset of ≤ 4 basis elements, computed combinatorially and organised into
  a lattice. 𝕆: ℝ, 7 ℂ, 7 ℍ, 𝕆. 𝕊: ℝ, 15 ℂ, 35 ℍ, 15 𝕆, 𝕊.
- *Named.* Even subalgebra, center, nucleus, power subalgebra ℝ[x],
  commutant of x, span of chosen Clifford grades.
- *Generated.* Closure of arbitrary elements by iterated span + product.
- *Found numerically.* Minimise leakage over the Grassmannian Gr(k, n) from
  many random starts, cluster the zeros, and report the families found
  (for example the 8-dimensional family of quaternion subalgebras of 𝕆,
  which is G₂/SO(4)). This is the desktop-only "subalgebra search".

**Leakage** of any subspace S with orthonormal basis s₁…s_k:

    Λ(S) = (1/k²) Σ_{a,b} ‖ (I − P_S)(s_a s_b) ‖²

Λ(S) = 0 iff S is a subalgebra. It is the primary scalar shown during
rotation, and the objective for subalgebra search.

**Display frame F:** an ordered orthonormal set of up to 3 directions
(or 4, rendered through a chosen 4D→3D projection: orthographic drop,
perspective, or stereographic). A product landing in A decomposes into
channels that drive rendering: displayed coordinates, real part, hidden-in-B,
and leak (outside B).

### 3.6 Rotation modes

| Mode | Acts on | Path | Preserves B? | Teaches |
|------|---------|------|--------------|---------|
| **Tilt** | frame | exp(θ · f_i ∧ v) in SO(n), tilting axis f_i toward an off-slice direction v; two-parameter tilts (θ, φ) toward two directions drive the leakage landscape | no (generically) | Why B is special; families of subalgebras appear as zero curves in the landscape |
| **Automorphism flow** | frame and points | exp(t D) for D a user-weighted combination of the Der(A) basis; conjugation x ↦ u x u⁻¹ when associative | yes | Symmetry of A: G₂ on the Fano plane, SO(3) on Im ℍ |
| **Multiplicative flow** | points | x ↦ exp(t u)·x or x·exp(t u) | not an isometry in general | Rotation vs boost vs shear; isoclinic rotations of ℝ⁴ |
| **Custom path** | frame or points | any scripted t ↦ M(t) ∈ GL(n) from the console | as scripted | Anything |
| **Camera orbit** | view only | SO(3) on screen | n/a | none; kept visibly separate |

For non-associative A the automorphism defect ‖φ(xy) − φ(x)φ(y)‖ is shown
whenever conjugation is used. Multiple rotation parameters can be bound to
the timeline as keyframed tracks.

### 3.7 Isomorphism-type recognition

Fingerprint of a (sub)algebra: (dim, commutative, associative,
alternative, has zero divisors, square-signature counts of +1/−1/0 over
an orthogonalised basis, dim center, dim nucleus, dim Der, Killing
signature of Der). Matched against a table of known algebras; unmatched
ones are labelled with the fingerprint. The **isomorphism explorer** (v1.1)
searches for an explicit basis change between two algebras with equal
fingerprints and shows it as a matrix.

---

## 4. Observables (fields on the slice)

Sampled on a 2D grid (up to 256²) or 3D grid (up to 64³ on GPU, 24³ on
CPU), layered on the canvas; several can be shown at once.

| Observable | Definition | Rendering | Reveals |
|------------|-----------|-----------|---------|
| Square | x ↦ x² | deformed lattice | imaginary-unit sphere, idempotents, nilpotents, hyperboloids in split forms |
| Multiply by u | x ↦ u x or x u | deformed lattice + arrows | rotations, boosts, shears, isoclinic rotations |
| Norm | N(x) | isosurface / contours | spheres, hyperboloids, null cones, parallel planes |
| Commutator with u | [u, x] | arrows | where and how much commutativity fails |
| Associator with (u, v) | [u, v, x] | colour + arrows | fails off Fano lines in 𝕆; everywhere in 𝕊 |
| Leakage density | ‖(I − P_B)(x·x)‖, or averaged over y in the slice | colour map | closure defect point by point |
| Zero-divisor field | σ_min(L_x), or log|det L_x| for large n | dark isosurface at 0 | null cones; the zero-divisor variety of 𝕊 |
| Exponential curves | t ↦ exp(t x) for x on the unit sphere of the slice | curves | circles, hyperbolas, lines; one-parameter subgroups |
| Power orbit | x, x², x³, … | polylines | power-associativity, periodicity |
| Inverse | x ↦ x⁻¹ | deformed lattice, blank where undefined | invertibility boundary |
| Custom | any scripted f: A → A or A → ℝ | user's choice | anything |

The **inspector** (click a point) shows coordinates in all channels, the
observable values, the full multiplication row of that element, L_x with
its singular values, and the minimal polynomial (numerically) of x.

---

## 5. Views (dockable panels)

All panels are linked: selecting a basis element, subalgebra, or point in
one highlights it in the others.

- **Canvas.** 3D (or projected 4D) view of the slice with layered
  observables, axes labelled by their expansion in the standard basis,
  a ghost of the previous frame position during rotation.
- **Leakage landscape.** Heat map of Λ over a two-parameter tilt (θ, φ);
  subalgebras are the zeros. Click anywhere to jump the frame there; drag
  to scrub. This is the desktop-only view that makes families of
  subalgebras visible at a glance.
- **Multiplication table.** n×n grid coloured by sign, symbols on hover;
  the subalgebra as a highlighted block, leakage cells outlined; sortable
  by any permutation of the basis (drag columns); export as LaTeX/CSV.
- **Structure graph.** Nodes = imaginary units, one line per triple with
  e_i e_j = ±e_k. Fano plane for 𝕆, PG(3,2) for 𝕊 (35 lines, with the 15
  Fano-plane substructures selectable). Automorphism flow animates it.
- **Subalgebra lattice.** Hasse diagram of enumerated and found
  subalgebras, grouped by isomorphism type, with counts.
- **Facts.** The §3.4 property sheet, with witnesses that can be sent to
  the inspector or canvas in one click.
- **Derivations.** Basis of Der(A) as matrices, its bracket table, sliders
  for a weighted combination to feed the automorphism flow.
- **Timeline.** Keyframe tracks for every rotation parameter and camera;
  play, loop, scrub, render to video.
- **Console.** JavaScript REPL with the engine API (`A.mul(x, y)`,
  `B = A.closure([...])`, `scene.frame.tilt(...)`, `plot(...)`) and a
  scratch notebook of cells whose outputs (numbers, tables, scenes) are
  kept in the project.
- **Compare.** Two scenes side by side with shared rotation parameters and
  camera, for ℂ vs split-ℂ, or the same subalgebra in 𝕆 and 𝕊.

Default layout: canvas centre, landscape and lattice left, table and facts
right, timeline and console bottom. Layouts are saved with the project.

---

## 6. Interaction

- Mouse: drag orbits the camera, wheel zooms, right-drag pans; click
  inspects; drag on the leakage landscape scrubs the tilt.
- Keyboard: arrow keys nudge the active rotation parameter (Shift for
  coarse, Alt for fine), space plays/pauses, digits 1–4 switch verbs,
  Cmd/Ctrl-Z undo, Cmd/Ctrl-K opens the command palette (every action is
  reachable by name).
- Direct entry: any element field accepts expressions in the basis
  (`1 + 2i - k`, `e3 + e10`), evaluated by the engine.
- Export: PNG/SVG of any panel, MP4/WebM of the timeline, CSV/JSON of any
  sampled field, LaTeX of tables and facts, the whole project as JSON.
- Accessibility: colour-blind safe palettes with redundant shape/hatch
  encoding of sign, adjustable font size, reduced-motion option.

---

## 7. Guided tours (content for v1)

Each tour is a sequence of scenes with a caption and a suggested
experiment; tours are ordinary projects the user can fork.

1. **The sphere of complex numbers inside ℍ.** Tilt i toward j; leakage
   stays zero; the landscape shows a whole zero curve.
2. **Seven quaternions in the octonions.** Select a Fano line, tilt off it,
   the associator lights up; then run a G₂ derivation flow and watch it
   stay closed while the Fano plane turns. Run subalgebra search and find
   the 8-dimensional family.
3. **Rotation, boost, shear.** ℂ, split-ℂ, dual numbers in Compare view
   under multiplicative flow.
4. **Where the norm breaks.** Sedenions: N(xy) ≠ N(x)N(y); find a zero
   divisor by rotating a 3-slice until the dark surface appears; then map
   the full zero-divisor variety with the search tool.
5. **Spinors are even.** Cl(3,0): the even subalgebra is ℍ; square the odd
   part and watch it land in the even part.
6. **Same algebra, different clothes.** Split-ℍ, Cl(2,0), Cl(1,1), M₂(ℝ):
   equal fingerprints, and the explicit isomorphisms.
7. **Beyond the sedenions.** Trigintaduonions: how the lattice, Der(A) and
   zero-divisor structure change from 16 to 32 dimensions.

---

## 8. Architecture

Strict dependency direction: app → viz → core.

```
core/        pure engine, no UI dependency, runs in Node for tests and CLI
  algebra/   Algebra type, monomial + dense tables, constructors, exact mode
  ops/       element operations, L_x/R_x, exp/log, inverse, minimal polynomial
  linalg/    dense linear algebra: QR, SVD, null space, matrix exp, LU
  sub/       subspaces, closure, leakage, lattice, Grassmannian search,
             fingerprint and recognition, isomorphism search
  flow/      rotation modes as functions (state, t) -> frame / point map
  fields/    observable samplers -> typed arrays (CPU) or GPU kernels
  facts/     property checks with residuals and witnesses; Der(A)
  script/    the console API surface, a thin typed facade over the above
viz/         framework-free scene builder: samples -> render primitives
             (point clouds, line sets, meshes, colour arrays), GPU field
             evaluation kernels (WGSL, with GLSL fallback)
app/         panels, docking, state store, project files, timeline, tours
tools/       CLI (facts sheet, lattice dump, batch renders), test fixtures
```

State: one immutable project object (scenes, layout, notebook); every UI
action is a reducer; the renderer is a pure function of scene + sampled
field. This gives undo/redo, serialisation and scriptability for free.

Heavy numerics (n ≥ 64 SVDs, Grassmannian search with thousands of starts,
lattice enumeration for n = 128) run in worker threads with progress and
cancellation; hot loops move to a Rust/WASM module when profiling shows a
need (planned, not assumed).

---

## 9. Technology recommendation

**Recommended: Electron + TypeScript + React, three.js on WebGL2 for the
canvas with WebGPU compute for field evaluation, a dockable panel library
(e.g. Dockview or rc-dock), Monaco for the console.**

Reasons:

- Electron bundles Chromium, so WebGL2 and WebGPU behave identically on all
  three platforms. A math-visualisation app should not debug platform
  webview differences.
- The engine is plain TypeScript, tested in Node, used by the CLI, and
  exposed verbatim in the console: users script the same code the UI runs.
- three.js covers point clouds, line sets, isosurfaces (marching cubes on
  the GPU), custom shaders and video capture with little glue.
- A browser build is a free by-product for sharing read-only scenes later.

**Alternative A: Tauri.** Much smaller binary and lower memory. Cost:
GPU feature parity depends on each OS webview (WebKit on macOS/Linux,
WebView2 on Windows); WebGPU is not uniformly available. Choose only if
binary size matters more than rendering consistency.

**Alternative B: Python + Qt (PySide6) + VisPy/ModernGL + NumPy.** Best if
the scripting console should be Python and NumPy/SymPy interop is the
priority. Cost: packaging and startup, and a less polished docking/UI
story.

**Not recommended:** native C++/Rust UI from scratch; the UI surface here
(docking, tables, editors, video export) is large and web tooling covers it.

---

## 10. Performance budget

- Camera orbit: 60 fps; buffers re-uploaded only when the scene changes.
- Scrubbing a rotation: ≥ 30 fps at 32³ for n ≤ 32 on CPU; 64³ for n ≤ 64
  with GPU field evaluation (structure constants uploaded once as a
  texture or storage buffer).
- Leakage landscape: 256² tilt samples for n ≤ 64 in under 200 ms on a
  worker, incremental refinement while dragging.
- Zero-divisor field: σ_min via SVD for n ≤ 32; log|det| via LU above that.
- Der(A): on the fly for n ≤ 64 (null space of an n³ × n² system); for
  n = 128, 256 computed once per algebra in a worker and cached in the
  project (minutes, with progress).
- Subalgebra search: 1000 random starts on Gr(4, 8) in a few seconds;
  progress bar and cancel for larger cases.
- Cold start to first rendered scene: under 3 s.

---

## 11. Testing strategy

The engine is the product; it gets the tests.

- **Constructor identities.** Every preset's table against independent
  reference computations: ℍ from i, j, k rules; 𝕆 Fano triples; Clifford
  e_i² per signature; Cl(0,2) ≅ ℍ via explicit isomorphism; tensor
  products against Kronecker products of L-matrices.
- **Property checkpoints.** Expected true/false matrix of §3.4 for the
  Cayley–Dickson tower to 32 dimensions, split and dual forms, Cl(p,q) for
  p+q ≤ 4, tessarines, dual quaternions, biquaternions.
- **Invariants.** dim Der(ℍ) = 3, dim Der(𝕆) = 14 with Killing form
  negative definite of rank 2 (𝔤₂); dim center(ℂ⊗ℂ) = 4; subalgebra counts
  for 𝕆 (7 ℂ, 7 ℍ) and 𝕊 (15 ℂ, 35 ℍ, 15 𝕆).
- **Leakage.** Λ = 0 exactly (exact mode) for every enumerated subalgebra;
  Λ > 0 for random subspaces; Λ invariant under automorphism flow to 1e-9;
  Grassmannian search from a perturbed subalgebra converges back to it.
- **Zero divisors.** Witness found in 𝕊 and every split algebra; none in
  ℝ, ℂ, ℍ, 𝕆.
- **Exact vs float.** Exact-mode products agree with float products on
  random rational elements.
- **Property-based tests.** Random elements: associator vanishes iff
  flagged associative; exp(log x) = x near 1; L_{xy} = L_x L_y iff
  associative.
- **Viz snapshots.** Primitive counts and bounding boxes per observable;
  GPU and CPU field evaluation agree to 1e-5.
- **App smoke test.** Every tour step renders headlessly in CI.

---

## 12. Roadmap

| Milestone | Deliverable | Exit criterion |
|-----------|-------------|----------------|
| M0 | This spec, repo skeleton, CI | Spec approved; `npm test` runs |
| M1 | Core engine: constructors, ops, facts, closure, lattice, leakage, Der(A), fingerprint; CLI | All §11 engine tests pass; CLI prints facts and lattice for any preset |
| M2 | App shell: docking, Set verb, table, structure graph, facts, console | Browse every preset; console runs engine calls |
| M3 | Slice + canvas: frame selection, Square and Multiply observables, inspector, camera | Tour 1 playable |
| M4 | Rotation: tilt, automorphism flow, multiplicative flow, leakage landscape, timeline scrub/play | Tours 1–3 playable |
| M5 | Remaining observables, GPU field evaluation, subalgebra search, lattice UI, Compare view | Tours 4–7 playable |
| M6 | Project files, undo, exports (image/video/LaTeX/CSV), keyframes, packaging for three platforms | v1.0 release builds |
| v1.1 | Isomorphism explorer, 4D projections, Rust/WASM hot paths if profiling demands, Lie/Jordan presets, custom-path rotations | — |

---

## 13. Decisions needed from you

1. **Stack:** Electron (recommended) or Tauri, or a Python/Qt lab if you
   want Python scripting?
2. **Dimension ambition for v1:** engine to 256 but UI tuned for ≤ 64, as
   specified? Or push trigintaduonions (32) only and defer larger?
3. **Console language:** JavaScript (same code as the app) as specified,
   or a Python bridge in addition?
4. **Tours:** are the seven in §7 the right first set? Which phenomena do
   you most want to understand, so the observables and search tools are
   shaped around them?

---

## Appendix A. Notation

- A: ambient algebra, dim n, basis e₀ = 1 (when unital), e₁…e_{n−1}.
- B: subalgebra, dim k, orthonormal basis matrix (k × n); P_B its projector.
- F: display frame, ≤ 3 (or 4) orthonormal directions in A.
- L_x, R_x: left/right multiplication matrices (n × n).
- Λ(S): leakage of subspace S (§3.5).
- Der(A): derivation Lie algebra; exp(tD) is an automorphism flow.
- Gr(k, n): Grassmannian of k-planes in ℝⁿ.
- σ_min: smallest singular value.

## Appendix B. Conventions to fix in code and document in-app

- Cayley–Dickson product and basis ordering (§3.2).
- Clifford blade ordering (bitmask, lexicographic) and sign convention for
  blade products (count of transpositions).
- Numeric tolerance for rank and identity checks: 1e-9 relative, reported
  alongside every boolean; exact mode reports true zero.
- Colour channel defaults: position ← displayed, hue ← real part,
  saturation ← leak, brightness ← hidden-in-B.
