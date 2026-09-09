# Hypercomplex Algebra Viewer — Project Specification

Status: draft v0.1 (for review)
Target: standalone phone app (iOS + Android), fully offline

---

## 1. Vision

A pocket laboratory for finite-dimensional real algebras. You **set** an
algebra (quaternions, octonions, sedenions, split forms, Clifford algebras,
tensor products, or a custom multiplication table), **slice** it by a
subalgebra, and **rotate** that slice through the ambient algebra while the
app renders what the multiplication does to the slice. The goal is
understanding, not decoration: every animation corresponds to an exact
algebraic statement (closure, associativity, norm, zero divisors,
automorphisms), and every visual quantity can be inspected numerically.

The core insight the app is built around: **a subalgebra is a subspace with
zero "leakage"** (products of elements in the subspace stay in the subspace).
Rotating a slice off a subalgebra makes leakage appear; rotating it by an
automorphism keeps leakage at zero while everything else moves. Watching
leakage, associator, commutator, norm and zero-divisor structure change as
the slice moves is the "meaningful morph".

### Goals

- Exact, testable algebra engine (structure constants, not hand-coded cases).
- One consistent visual language across all algebras so differences are
  visible by comparison (ℂ vs split-ℂ vs dual numbers; ℍ vs 𝕆 vs 𝕊).
- Phone-first interaction: one-thumb scrubbing of rotations, full-screen
  canvas, no menus deeper than two levels.
- Offline and self-contained. No accounts, no network.

### Non-goals (v1)

- Infinite-dimensional or non-real base fields.
- Symbolic algebra (no CAS). Everything is numeric with tolerances, except
  the discrete structure of "monomial" algebras (see §3.1), which is exact.
- Teaching text beyond short guided tours (§7). This is a lab, not a textbook.
- Desktop-class UI. A web build is a free by-product, not a design target.

---

## 2. Core interaction model

Four verbs, always visible as a bottom stepper:

| Verb | What the user chooses | What the canvas shows |
|------|----------------------|------------------------|
| **Set** | The ambient algebra A (dim n) | Multiplication table, structure graph, property sheet |
| **Slice** | A subalgebra B ⊂ A and a display frame F (≤ 3 axes) | The slice as a 3D box with grid and sampled field |
| **Rotate** | A rotation mode + parameter t (scrub or play) | The frame moves; field re-sampled every frame |
| **Observe** | The observable (field) drawn on the slice | Arrows / deformed grid / colour / isosurface |

A **scene** = (algebra, subalgebra, frame, rotation mode + t, observable,
camera). Scenes are saved locally and shareable as a compact code (v2).

---

## 3. Mathematical foundation

### 3.1 Algebra representation

An algebra is A = (ℝⁿ, basis e₀…e_{n−1}, product). Two storage forms:

- **Monomial table (primary, exact).** Each basis product is a signed basis
  element or zero: e_i e_j = s_{ij} · e_{k(i,j)} with s_{ij} ∈ {−1, 0, +1}.
  Stored as two n×n integer arrays. Covers every Cayley–Dickson algebra
  (standard, split, dual variants), every Clifford algebra Cl(p,q,r), and
  tensor products of these. Integer arithmetic makes the discrete structure
  (Fano plane, subalgebra lattice) exact.
- **Dense structure constants (fallback).** c_{ij}^k as an n×n×n float array.
  Used for custom algebras and for anything the monomial form cannot express
  (Lie algebras with bracket as product, Jordan algebras, arbitrary user
  tables).

Attached metadata, all derived rather than declared where possible:

- Unit element (index of 1, or none).
- Conjugation involution (linear map), if the constructor provides one.
- Norm form N(x) = scalar part of x·x̄, when it is scalar-valued.
- Grading (Clifford blade grade), when applicable.

### 3.2 Constructors (the preset catalog)

| Constructor | Parameters | Produces |
|-------------|-----------|----------|
| `CayleyDickson(γ₁,…,γ_m)` | each γ ∈ {+1, −1, 0} | 2^m-dim. (+1)=ℂ, (−1)=split-ℂ, (0)=dual; (+1,+1)=ℍ, (+1,−1)=split-ℍ; (+1,+1,+1)=𝕆, …; four +1's = 𝕊 (sedenions), five = trigintaduonions |
| `Clifford(p,q,r)` | metric signature | 2^{p+q+r}-dim geometric algebra. Cl(2,0), Cl(3,0), Cl(0,2)≅ℍ, Cl(1,3) spacetime, Cl(3,0,1) PGA, Cl(4,1) CGA |
| `Tensor(A,B)` | two algebras | A⊗B. ℂ⊗ℂ = tessarines, ℍ⊗ℂ = biquaternions, ℍ⊗Dual = dual quaternions |
| `DirectSum(A,B)` | two algebras | A⊕B (componentwise product) |
| `Matrix(k)` | k | M_k(ℝ) with the standard matrix-unit basis (for isomorphism comparisons, e.g. split-ℍ ≅ M₂(ℝ)) |
| `Custom(table)` | user-entered table | dense algebra; validated for consistency only |

Cayley–Dickson product convention (fixed, documented in-app):

    (a, b)(c, d) = (a c − γ d̄ b,  d a + b c̄),   conj(a, b) = (ā, −b)

Basis ordering: the standard recursive ordering, so that for 𝕆 the basis is
1, e₁…e₇ and the imaginary units e₁, e₂, e₄ generate with e_i e_j = e_{i XOR j}
up to sign. Clifford blades are indexed by bitmask over generators.

Dimension cap for v1: n ≤ 64 (Cl with p+q+r = 6, trigintaduonions, 𝕊⊗ℂ).

### 3.3 Element operations

All defined on coefficient vectors, all pure functions in the engine:

mul, add, scale, conj, norm, inverse (via norm when composition algebra;
otherwise by solving L_x y = 1), exp (Taylor/scaling-and-squaring), log
(where defined), integer powers, left/right multiplication matrices
L_x, R_x, commutator [x,y], associator [x,y,z].

### 3.4 Computed properties (the "Facts" sheet)

Each is a numeric residual over all basis triples, reported as true/false
with the residual, and with a witness (concrete elements) when false:

- commutative, associative, alternative, flexible, power-associative,
  Moufang, Jordan identity
- norm multiplicative (composition algebra), N(xy) = N(x)N(y)
- zero divisors exist (witness found by minimising σ_min(L_x))
- center, left/middle/right nucleus (dimensions and bases)
- idempotents and nilpotents among basis-aligned elements
- derivation algebra Der(A): dimension and basis, from the null space of the
  linear system D(e_i e_j) = D(e_i) e_j + e_i D(e_j)
- recognised isomorphism type, when the invariant fingerprint matches a
  known algebra (§3.7)

Expected checkpoints (these become engine tests): ℍ associative;
𝕆 alternative and Moufang, not associative; 𝕊 flexible and
power-associative, not alternative, has zero divisors, norm not
multiplicative; dim Der(ℍ) = 3, dim Der(𝕆) = 14 (𝔤₂).

### 3.5 Subalgebras and slices

**Subalgebra B ⊂ A:** a subspace closed under product, stored as an
orthonormal basis (k × n matrix). Sources:

- *Basis-aligned enumeration.* For monomial algebras, the subalgebra
  generated by any set of ≤ 3 basis elements, computed combinatorially
  (closure of index set). Deduplicated and organised into a lattice.
  For 𝕆 this yields ℝ, 7 copies of ℂ, 7 copies of ℍ, 𝕆 (the Fano plane).
  For 𝕊: ℝ, 15 ℂ, 35 ℍ, 15 𝕆, 𝕊.
- *Named subalgebras.* Even subalgebra (Clifford), center, nucleus,
  the power subalgebra ℝ[x] of a chosen element, real span of a chosen
  Clifford grade set.
- *Generated from elements.* Closure of arbitrary user-chosen elements,
  by iterated span + product until rank stabilises (numeric tolerance).

**Leakage** of any subspace S with orthonormal basis s₁…s_k:

    Λ(S) = (1/k²) Σ_{a,b} ‖ (I − P_S)(s_a s_b) ‖²

Λ(S) = 0 iff S is a subalgebra. This is the primary scalar shown during
rotation. Leakage is exact in the basis-aligned case.

**Display frame F:** an ordered orthonormal set of ≤ 3 directions in A,
by default the first three non-unit basis vectors of B. A product landing
in A is decomposed into four channels that drive rendering:

1. displayed coordinates (position in the 3D box),
2. real part (coefficient of 1, when 1 ∉ F),
3. hidden-in-B (inside the subalgebra but not displayed),
4. leak (outside B).

### 3.6 Rotation modes

A rotation is a one-parameter path acting on the frame or on the slice
points. Four modes, clearly labelled so the user knows which are algebraic
and which are merely viewing:

| Mode | Acts on | Path | Preserves subalgebra? | Teaches |
|------|---------|------|----------------------|---------|
| **Tilt** | frame | exp(θ · f_i ∧ v) in SO(n), tilting displayed axis f_i toward an off-slice direction v | no (generically) | Why B is special: leakage grows as you leave it. Also finds *families* of subalgebras (tilting i→j in Im ℍ keeps a ℂ-plane closed: the S² of complex subalgebras). |
| **Automorphism flow** | frame and points | φ_t = exp(t D), D ∈ Der(A) chosen from a basis of Der(A); or conjugation x ↦ u x u⁻¹ for associative A | yes | Symmetry of the algebra: subalgebras move to subalgebras. In 𝕆 this is G₂ acting on the Fano plane. |
| **Multiplicative flow** | points | x ↦ exp(t u)·x or x·exp(t u) for a chosen u | not an isometry in general | ℂ: rotation. Split-ℂ: boost. Dual: shear. ℍ: isoclinic rotation of ℝ⁴. |
| **Camera orbit** | view only | SO(3) on screen | n/a | none — kept visibly separate from the algebraic modes |

For non-associative A, conjugation is not an automorphism in general; the
app displays the automorphism defect ‖φ(xy) − φ(x)φ(y)‖ so the user sees
exactly when it fails. Derivation bases for n ≥ 32 are precomputed offline
and shipped as assets.

Haptic tick when leakage crosses zero during a tilt, so a user scrubbing
by thumb can feel subalgebras.

### 3.7 Isomorphism-type recognition

For a subalgebra B of dimension k ∈ {1, 2, 4, 8}, compute an invariant
fingerprint: (k, commutative, associative, alternative, has zero divisors,
counts of orthogonal basis elements squaring to +1 / −1 / 0, dim center,
dim Der). Match against a table of known algebras (ℝ, ℂ, split-ℂ, dual,
ℍ, split-ℍ, ℂ⊗ℂ, ℂ⊗Dual, ℍ⊗…, 𝕆, split-𝕆, …). Unmatched fingerprints are
labelled "unrecognised k-dim algebra" with the fingerprint shown.

---

## 4. Observables (fields on the slice)

Each observable is a function sampled over a grid on the slice (2D: 64²,
3D: 16³ by default) and rendered with one of: arrows, deformed lattice,
colour map, isosurface, or curves. The channel decomposition of §3.5 maps
to the encoding: position ← displayed, colour ← real part or leak,
secondary colour/saturation ← hidden.

| Observable | Definition | Default rendering | What it reveals |
|------------|-----------|-------------------|-----------------|
| Square | x ↦ x² | deformed lattice | Imaginary units (x² = −1 sphere), idempotents, nilpotents; hyperboloids in split forms |
| Multiply by u | x ↦ u x (or x u) | deformed lattice + arrows | Rotations vs boosts vs shears; isoclinic rotations |
| Norm | N(x) | isosurface / contours | Spheres, hyperboloids, null cones, parallel planes (dual) |
| Commutator with u | x ↦ [u, x] | arrows | Where commutativity fails and how much |
| Associator with (u, v) | x ↦ [u, v, x] | colour + arrows | Fails off Fano lines in 𝕆; everywhere in 𝕊 |
| Leakage density | x ↦ ‖(I − P_B)(x·x)‖ or averaged over y ∈ slice | colour map | Closure defect point by point |
| Zero-divisor field | x ↦ σ_min(L_x) (or log|det L_x| for large n) | dark isosurface at 0 | Null cones in split algebras; the zero-divisor variety of 𝕊 appears/disappears as the slice rotates |
| Exponential curves | t ↦ exp(t x) for x on the unit sphere of the slice | curves | Circles / hyperbolas / lines; one-parameter subgroups |
| Power orbit | x, x², x³, … | polyline | Power-associativity, periodicity |
| Inverse | x ↦ x⁻¹ | deformed lattice, blank where undefined | Invertibility boundary |

Tapping a point opens an inspector: coordinates, all channels, the
observable value, and the product of that point with any basis element.

---

## 5. Discrete structure views

Complementary to the continuous canvas; live in the **Set** step and are
reachable from every step via a swipe-up sheet.

- **Multiplication table.** n×n grid, cells coloured by sign, symbol on tap.
  The current subalgebra is highlighted as a block; leakage cells (products
  escaping B) are outlined.
- **Structure graph.** Nodes = imaginary basis units; a triangle/line per
  triple (i, j, k) with e_i e_j = ±e_k. Renders the Fano plane for 𝕆 and
  PG(3,2) for 𝕊, laid out with a force layout seeded by the standard
  drawing. The selected subalgebra is a line or plane in this diagram.
  Automorphism flow animates node positions.
- **Subalgebra lattice.** Hasse diagram of basis-aligned subalgebras, tap
  to select. Counts shown per isomorphism type.
- **Facts sheet.** The computed properties of §3.4 with residuals and
  witnesses.

---

## 6. Screens and UX (phone-first)

Portrait, single canvas, controls in a draggable bottom sheet with three
detents (peek: verb stepper + one slider; half: mode options; full: lists).

1. **Home.** Recent scenes, guided tours, "New scene".
2. **Set.** Preset catalog grouped by family (Cayley–Dickson tower, split
   and dual forms, Clifford, tensor products, custom). Each preset card shows
   dim and a one-line property summary. Custom table editor is a scrollable
   grid with validation.
3. **Slice.** Subalgebra picker (lattice view or list), frame axis chooser
   (three chips, each selecting a basis direction or "custom vector").
4. **Rotate.** Mode segmented control (Tilt / Automorphism / Multiply /
   Orbit). One large scrub slider for t with play/pause, loop, and speed.
   Mode-specific pickers: tilt axis and target direction; derivation basis
   element or conjugating element; multiplier u.
5. **Observe.** Observable list with rendering style, grid resolution,
   colour channel assignment.
6. **Inspector** (modal on long-press of a point).
7. **Tour player.** Full-screen scene with a short caption card and
   next/previous; each step is a scene plus text.

Gestures: one-finger drag orbits the camera, pinch zooms, two-finger
horizontal drag scrubs t (so the rotation can be driven without the sheet),
long-press inspects. A small always-visible readout shows Λ(S) and the
current mode.

Accessibility: colour-blind safe palettes (sign encoding also uses
shape/hatching), dynamic type, reduced-motion respects the system setting.

---

## 7. Guided tours (content for v1)

Each tour is a sequence of scenes with one-paragraph captions.

1. **The sphere of complex numbers inside ℍ.** Tilt i toward j; leakage
   stays zero. Every unit imaginary quaternion spans a copy of ℂ.
2. **Seven quaternions in the octonions.** Select a Fano line; tilt one axis
   off it; the associator lights up. Then move it by a G₂ derivation flow
   and watch it stay closed while the Fano plane rotates.
3. **Rotation, boost, shear.** ℂ, split-ℂ, dual numbers side by side under
   multiplicative flow.
4. **Where the norm breaks.** Sedenions: N(xy) ≠ N(x)N(y), then find a zero
   divisor by rotating a 3-slice until the dark surface appears.
5. **Spinors are even.** Cl(3,0): the even subalgebra is ℍ; square the odd
   part and see where it goes.
6. **Same algebra, different clothes.** Split-quaternions, Cl(2,0), Cl(1,1),
   M₂(ℝ): four presets with the same fingerprint (§3.7).

---

## 8. Architecture

Three layers with strict dependency direction: app → viz → core.

```
core/        pure engine, no UI dependency, runs in Node for tests & precompute
  algebra/   Algebra type, monomial + dense tables, constructors
  ops/       element operations, L_x/R_x, exp/log, inverse
  linalg/    small dense linear algebra: QR, SVD, null space, matrix exp
  sub/       subspaces, closure, leakage, lattice enumeration, recognition
  flow/      rotation modes as functions (frame, t) -> frame / point map
  fields/    observable samplers -> typed arrays (positions, channels)
  facts/     property checks with residuals and witnesses
viz/         framework-free scene builder: samples -> render primitives
             (point clouds, line sets, triangle meshes, colour arrays)
app/         UI, navigation, state store, persistence, tours
tools/       offline precompute (derivation bases, subalgebra lattices for
             n >= 32) -> JSON assets; test fixtures
```

State: a single immutable scene object; every UI control is a reducer on
it; the renderer is a pure function of scene + sampled field. This keeps
scenes serialisable for save/share and makes tours plain data.

Persistence: local JSON per scene. Precomputed assets bundled with the app.

---

## 9. Technology recommendation

**Recommended: React Native with Expo, TypeScript, three.js via expo-gl /
react-three-fiber for the 3D canvas, react-native-skia for 2D views
(table, structure graph, lattice).**

Reasons:

- The engine is plain TypeScript, unit-tested in Node, reused by the
  precompute tools, and runnable in a browser for debugging.
- three.js gives point clouds, line sets, isosurfaces and custom GLSL
  shaders with no extra work; structure constants can later be uploaded as
  a texture so products are evaluated on the GPU (needed for n = 64 3D
  grids).
- Expo EAS builds signed iOS and Android binaries; a web build is free.
- Known risk: expo-gl regressions across Expo SDK versions. Mitigation:
  pin the SDK, keep the 2D views on Skia so the app degrades to 2D slices
  if the GL layer breaks.

**Alternative: Flutter (Dart).** Excellent gestures and a strong 2D canvas;
3D would be a hand-rolled projector on Canvas or the still-experimental
flutter_gpu. Choose this if a Dart codebase is preferred; the spec is
unchanged.

**Not recommended:** two native codebases (Swift/Metal + Kotlin/Vulkan);
the engine would have to be written twice or bridged.

---

## 10. Performance budget

- Camera orbit: 60 fps always (renderer only re-uploads buffers when the
  scene changes).
- Scrubbing t: ≥ 30 fps for monomial algebras with n ≤ 16 on a 3D grid of
  16³ (4096 products × n² ops ≈ 1 M ops per frame, trivially CPU-bound).
- n = 32 or dense tables: default to 2D 64² slices or a 10³ grid; move to
  GPU evaluation in v2.
- Zero-divisor field: σ_min via small SVD for n ≤ 16; log|det| via LU for
  larger n.
- Derivation algebra: computed on device for n ≤ 16 (< 100 ms); precomputed
  for n ≥ 32.
- Cold start to first rendered scene: < 2 s on a mid-range Android device.

---

## 11. Testing strategy

The engine is the product; it gets the tests.

- **Constructor identities.** Every preset's table matches independent
  reference computations (e.g. ℍ from the standard i, j, k rules; 𝕆 Fano
  triples; Clifford e_i² per signature; Cl(0,2) ≅ ℍ via explicit
  isomorphism).
- **Property checkpoints.** The expected true/false matrix of §3.4 for the
  Cayley–Dickson tower up to 𝕊, split forms, dual numbers, Cl(p,q) for
  p+q ≤ 3, tessarines, dual quaternions.
- **Numeric invariants.** dim Der(ℍ) = 3, dim Der(𝕆) = 14, dim center(ℍ) = 1,
  dim center(ℂ⊗ℂ) = 4, subalgebra counts for 𝕆 (7 ℂ, 7 ℍ) and 𝕊
  (15 ℂ, 35 ℍ, 15 𝕆).
- **Leakage.** Λ = 0 exactly for every enumerated subalgebra; Λ > 0 for
  random subspaces; Λ invariant under automorphism flow to 1e-9.
- **Zero divisors.** A witness is found in 𝕊 and in every split algebra;
  none in ℝ, ℂ, ℍ, 𝕆.
- **Property-based tests.** Random elements: associator vanishes iff the
  algebra is flagged associative; exp(log x) = x on a neighbourhood of 1.
- **Snapshot tests** for the viz layer (primitive counts and bounding boxes
  per observable), and a device smoke test that renders every tour step.

---

## 12. Roadmap

| Milestone | Deliverable | Exit criterion |
|-----------|-------------|----------------|
| M0 | This spec, repo skeleton, CI | Spec approved; `npm test` runs |
| M1 | Core engine: constructors, ops, facts, subalgebra closure and lattice, leakage, Der(A) | All §11 engine tests pass; CLI prints the facts sheet for any preset |
| M2 | App shell: Set step, multiplication table, facts sheet, structure graph | Browse every preset on device |
| M3 | Slice + 3D canvas: frame selection, Square and Multiply observables, camera | Tour 1 playable |
| M4 | Rotation modes: tilt, automorphism flow, multiplicative flow, scrub/play, leakage readout, haptics | Tours 1–3 playable |
| M5 | Remaining observables (norm isosurface, zero-divisor field, associator), subalgebra lattice UI, inspector | Tours 4–6 playable |
| M6 | Scenes save/load, tours polish, accessibility, store builds | TestFlight / internal track release |
| v2 | Scene sharing codes, GPU field evaluation, custom-table editor polish, isomorphism explorer (explicit basis change between presets), Lie/Jordan algebras | — |

---

## 13. Decisions needed from you

1. **Stack:** React Native + Expo + TypeScript (recommended) or Flutter?
2. **Initial algebra scope:** Cayley–Dickson tower to 𝕊 plus split/dual
   forms and Clifford up to dim 16 for M1–M4, with dim 32–64 in M5? Or
   include dim 32 from the start?
3. **Custom tables in v1** or defer to v2? (Engine supports them from M1
   either way; the question is only the editor UI.)
4. **Tours:** are the six in §7 the right first set, and are there specific
   algebras or phenomena you most want to understand that should shape
   the observables list?

---

## Appendix A. Notation

- A: ambient algebra, dim n, basis e₀ = 1 (when unital), e₁…e_{n−1}.
- B: subalgebra, dim k, orthonormal basis matrix (k × n). P_B: orthogonal
  projector onto B.
- F: display frame, ≤ 3 orthonormal directions in A.
- L_x, R_x: left/right multiplication matrices (n × n).
- Λ(S): leakage of subspace S (§3.5).
- Der(A): derivation Lie algebra; exp(tD) for D ∈ Der(A) is an
  automorphism flow.
- σ_min: smallest singular value.

## Appendix B. Conventions to fix in code and document in-app

- Cayley–Dickson product and basis ordering (§3.2).
- Clifford blade ordering (bitmask, lexicographic) and sign convention for
  blade products (count of transpositions).
- Numeric tolerance for rank and identity checks: 1e-9 relative, reported
  alongside every boolean.
- Colour channel defaults: position ← displayed, hue ← real part,
  saturation ← leak, brightness ← hidden-in-B.
