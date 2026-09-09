# Hypercomplex Algebra Viewer — Project Specification

Status: v0.5 (accepted baseline; desktop, dimension 128, Wilmot and mirror-sedenion targets)
Target: standalone desktop application (macOS, Windows, Linux), fully offline

---

## 1. Vision

A desktop laboratory for finite-dimensional real algebras, built around the
Cayley–Dickson family and its relatives. You **set** an algebra
(quaternions, octonions, sedenions and the ultronions U₁…U₄ up to dimension
128, the mirror sedenions and other mirror doubles, split forms, Clifford
algebras, tensor products, arbitrary sign functions on 𝔽₂ᵐ, or a custom
multiplication table), **slice** it by a subalgebra, and **rotate** that
slice through the ambient algebra while linked views render what the
multiplication does to the slice. Every animation corresponds to an exact
algebraic statement, and every quantity can be inspected, scripted and
exported.

Two organising ideas:

- **A subalgebra is a subspace with zero leakage** (products of elements in
  the subspace stay in the subspace). Rotating a slice off a subalgebra
  makes leakage appear; rotating by an automorphism keeps it at zero while
  everything else moves.
- **For basis-closed algebras the whole non-associative structure is a
  finite, exact object.** Every basis triad has a signed associator; its
  pattern under permutation (Wilmot's Types 1/2/3 and A/B/C/X), its 3-cycle
  silo, its modes, and the subalgebra it generates (ℍ, 𝕆, P₄, P₁₂, P₁₄)
  can all be computed, counted and drawn, and the counts checked against
  the literature.

### Headline targets

1. **Wilmot's associator structure, 16 to 128.** G. P. Wilmot,
   *Structure of the Cayley–Dickson algebras* (arXiv:2505.11747v3): the
   graded construction, three classes of unordered associativity and four
   non-associative types, the eight 3-triad-cycle silos, the Moufang and
   Mal'cev correspondences, the quasi-octonion subalgebras P₄, P₁₂, P₁₄
   and the projection theorem, and the zero-divisor count
   Z_m = (N−1)(N−3)(N−7)/16 with its cycle/mode reduction to seven primary
   pairs in 𝕊. The app must compute all of this from the multiplication
   table and reproduce the paper's Tables 2, 4, 5, 6 and 14 for 𝕆, U₁ (16),
   U₂ (32), U₃ (64) and U₄ (128), and the split cases of §5 of the paper.
2. **The mirror sedenions.** Lui, *The mirror sedenions: a second
   G₂-symmetric doubling of the octonions and the geometry of its zero
   divisors* (working draft, 2026): the mirror double M(A), the embedding
   M(A) ≅ A + A(ee′) ⊂ CD²(A), Bales's eight products yielding exactly 𝕊 and
   𝕊′, the five-level stretch spectrum, Z(𝕊′) = S⁶ × S⁷ against V₂(ℝ⁷) for
   𝕊, annihilator dimensions 2/6 against 4, the pair manifold V₂(ℝ⁷) × S³
   against G₂, the octave configurations in PG(3,2), Aut(𝕊′) = G₂ × ℤ/2,
   the orientation bit χ, and the graded-isomorphism search over GL(4,2).
   The app must construct 𝕊′ both directly and as the hyperplane
   S_γ ⊂ 𝕋 spanned by e₀…e₇, e₂₄…e₃₁, verify every finite statement of the
   paper's Appendix A, and let the user *see* the difference between 𝕊 and
   𝕊′ in slices, spectra, zero-divisor sets, and tables.

### Goals

- Exact, testable engine; all counts in the two papers are CI tests.
- One visual language so 𝕊 and 𝕊′, or U₁ and U₂, differ visibly under the
  same view.
- Everything clickable is scriptable; every scene is data.
- Offline and self-contained.

### Non-goals (v1)

- Non-real base fields; infinite-dimensional algebras.
- A general CAS. Arithmetic is exact (integer signs, bigint rationals,
  𝔽₂ linear algebra) for basis-closed algebras and floating point elsewhere.
- A Python bridge. The console is JavaScript running the same engine as the
  UI. The existing NumPy/SymPy verification scripts (`cd.py`, `f2iso.py`,
  `check1–12`, `sym_spectrum.py`) and Wilmot's `geoalg` calculator are
  used as **external oracles in CI**, not embedded: their outputs become
  fixtures the engine must match.

---

## 2. Core interaction model

| Verb | The user chooses | Linked views update |
|------|------------------|---------------------|
| **Set** | Ambient algebra A (dim n ≤ 256, UI tuned to 128) | Table, structure graph, facts, lattice, triad explorer, zero-divisor catalog |
| **Slice** | Subalgebra B ⊂ A and a display frame F (≤ 3 axes, or 4 with projection) | Canvas, table highlight, lattice and triad masks |
| **Rotate** | Rotation mode and parameters, scrubbed, animated or keyframed | Canvas, leakage landscape, structure graph |
| **Observe** | Observables drawn on the slice | Canvas layers, inspector |

A **scene** = (algebra, subalgebra, frame, rotation state, observables,
camera, layout); a **project** = scenes + notebook + cached analyses.
Everything is JSON, undoable and console-addressable.

---

## 3. Mathematical foundation

### 3.1 Algebra representation

Three storage forms, chosen automatically by the constructor:

- **Twisted group algebra of 𝔽₂ᵐ (primary for the Cayley–Dickson family).**
  Basis e_g, g ∈ G = 𝔽₂ᵐ, product e_g e_h = F(g,h) e_{g⊕h} with a sign
  function F: G × G → {±1} (or {±1, 0} for degenerate doublings). Covers
  𝕆, 𝕊, U_m, 𝕊′, M(ℍ), every Bales product, every word in {CD, M}, every
  split A_{q,p}, and arbitrary user sign functions. Stored as an n×n int8
  array. Exact integer arithmetic; 𝔽₂ linear algebra for subalgebras and
  graded maps.
- **Monomial table.** e_i e_j = s_{ij} e_{k(i,j)}, s ∈ {−1,0,+1}, for
  Clifford algebras Cl(p,q,r) and tensor/direct products of monomial
  algebras (index map is not XOR in general).
- **Dense structure constants** c_{ij}^k for custom tables, Lie and Jordan
  algebras.

Two index notations are supported everywhere and switchable in every view:
the bitmask notation e_g (Lui, Cawagas: e₁…e₁₅, ℓ = e₈, e′ = e₁₆) and
Wilmot's graded notation o_α with α ⊂ {1..m} (o₁ = i, o₂ = j, o₁₂ = ij,
o₃ = −l, …), related by g = bitmask(α). Wilmot's equation (20) is the
identity map under this convention and is a unit test.

Derived metadata: unit, involution ¯x (from the doubling), norm N(x) = x x̄
when scalar, grade (Wilmot's k-grade = popcount of g; Clifford blade grade),
doubling point(s) ℓ, and the fingerprint of §3.7.

### 3.2 Constructors (the preset catalog)

| Constructor | Parameters | Produces |
|-------------|-----------|----------|
| `CD(A, ε)` | base algebra, ε ∈ {+1, −1, 0} | Cayley–Dickson double with (a,b)(c,d) = (ac − ε d̄ b, da + b c̄); ε = +1 standard, −1 split (unitary generator u, u² = +1), 0 dual |
| `M(A)` | base algebra | **Mirror double**: (a + bℓ)(c + dℓ) = (ca − d̄ b) + (da + b c̄)ℓ. M(ℍ) = quasi-octonions (Cawagas's Õ = Chan–Đoković S₈ = Wilmot's P₄); M(𝕆) = 𝕊′ |
| `Bales(A, P)` | base, P ∈ {P₀,P₁,P₂,P₃,P₀ᵀ,P₁ᵀ,P₂ᵀ,P₃ᵀ} or any of the 32 candidate formulas | one doubling step with the chosen product; P₃ᵀ = CD, P₁ᵀ = M |
| `Tower(word)` | word over {CD, M, CDsplit, …} applied to a base | e.g. CD⁴(ℝ) = 𝕊, CD³·M = 𝕊′, M∘M(ℍ), the uniform P₁ᵀ tower, A_{q,p} split towers |
| `Ultronion(m)` | m ≥ 1 | U_m = CD^{m+3}(ℝ): U₁ = 𝕊 (16), U₂ = 𝕋 (32), U₃ (64), U₄ (128), U₅ (256) |
| `SignFunction(F)` | F on 𝔽₂ᵐ × 𝔽₂ᵐ | any twisted group algebra; used by the sign-function census |
| `Clifford(p,q,r)` | signature | Cl(p,q,r) up to 2⁸ dims |
| `Tensor`, `DirectSum`, `Matrix(k,F)`, `Lie(g)`, `Custom(table)` | as before | tessarines, biquaternions, dual quaternions, M₂(ℝ), so(3), 𝔤₂ from Der(𝕆), user tables |

Conventions fixed and shown in-app: Convention 2.1 of the mirror paper for
𝕆 (oriented Fano lines e₁e₂ = e₃, e₁e₄ = e₅, e₂e₄ = e₆, e₃e₄ = e₇,
e₁e₇ = e₆, e₂e₅ = e₇, e₃e₆ = e₅) and Wilmot's Lemma 2 (o_α o_n = +o_{α∪n}
for n above every index of α). Both agree with `CD` above.

### 3.3 Element operations

mul, add, conj, norm, inverse (via norm, else solve L_x y = 1), exp, log,
powers, L_x, R_x, commutator, associator [x,y,z] = (xy)z − x(yz),
alternator alt_x = [x, x, ·], the **stretch operator** L_x̄ L_x / N(x)
with its spectrum, annihilator Ann(x) = ker L_x with dimension, minimal
polynomial, trace t(x) and the quadratic identity x² − 2t(x)x + N(x) = 0
where it holds. Exact-mode variants for basis-closed algebras.

### 3.4 Computed properties (Facts panel)

Global identities with residual and witness: commutative, associative,
alternative, flexible, power-associative (checked to degree 4 and by
[x,x,x] = 0), quadratic, Moufang (three forms), Jordan, Mal'cev on the
commutator algebra, adjoint identity ⟨xy,z⟩ = ⟨y, x̄z⟩, composition law
N(xy) = N(x)N(y), pure trace (Wilmot's Theorem 12: sum of squares of pure
basis elements). Zero divisors exist (witness). Center, nuclei. Der(A)
with its Lie structure and Killing form (recognise 𝔤₂, so(3), so(4), the
6-dimensional Der of M(ℍ)). Recognised isomorphism type (§3.7).

Checkpoints that are tests: dim Der = 14 for 𝕊, 𝕊′ and all 32 Bales
candidates over 𝕆; 6 for M(ℍ), M(M(ℍ)) and the uniform P₁ᵀ tower at 8
and 16 dimensions; 3 for ℍ.

### 3.5 Subalgebras and slices

**Basis-closed subalgebras.** For twisted group algebras every linear
subspace of 𝔽₂ᵐ spans a subalgebra; enumeration is over subspaces
(Gaussian binomials: 11 811 three-dimensional subspaces of 𝔽₂⁷ give the
11 811 eight-dimensional basis subalgebras of U₄). Each is classified by
its own sign function (fingerprint §3.7, triad counts §3.8): quaternion
vs anti-quaternion lines, octonion vs quasi-octonion hyperplanes, 𝕊 vs 𝕊′
vs other 16-dimensional types, and so on. Named subalgebras (even part,
center, nucleus, ℝ[x], commutant) and numerically found ones (leakage
minimisation on Gr(k, n)) as before.

**Leakage** Λ(S) = (1/k²) Σ ‖(I − P_S)(s_a s_b)‖² over an orthonormal
basis; Λ = 0 iff S is a subalgebra.

**Display frame** F of ≤ 3 (or 4, projected) orthonormal directions; a
product decomposes into displayed, real, hidden-in-B and leak channels.
For x = a + bℓ in a doubled algebra the inspector also shows the paper's
coordinates: a₀, |a′|, |b|, |b∥| (projection of b onto ℂ_a = ℝ + ℝa′).

### 3.6 Rotation modes

Tilt (exp(θ f_i ∧ v), with the two-parameter leakage landscape),
automorphism flow (exp(tD), D from a Der(A) basis; the diagonal G₂ on
doubled algebras; Brown's order-three automorphism of 𝕊 as a discrete
step, shown to fail on 𝕊′ via the automorphism-defect readout),
multiplicative flow (x ↦ exp(tu)x), custom scripted paths, and camera
orbit, as in v0.3. Multiple parameters bind to timeline tracks.

### 3.7 Isomorphism-type recognition and graded isomorphism search

Fingerprint: (dim, identities, zero divisors, square signature, dim center,
dim nucleus, dim Der with Killing signature, triad-type counts of §3.8,
octave configuration of §3.10). Matched against a table of known algebras
including ℍ, 𝕆, split forms, M(ℍ) = P₄, P₁₂, P₁₄, 𝕊, 𝕊′, M(M(ℍ)).

**Graded isomorphism search** (exact, over 𝔽₂): for twisted group algebras
A, A′ on 𝔽₂ᵐ, a graded isomorphism is e_g ↦ λ(g) e_{σg} with σ ∈ GL(m,2),
λ: G → {±1}; for fixed σ the condition
F′(σg, σh) λ(g⊕h) = F(g,h) λ(g) λ(h) is a linear system over 𝔽₂ for λ.
The engine enumerates σ (20 160 for m = 4; 9 999 360 for m = 5, in a
worker; m = 6 by pruning on invariants: σ must preserve the octave and
quaternion-line configurations, which cuts GL(6,2) to a manageable
stabiliser coset search) and reports all solutions, so it can state
"no graded isomorphism 𝕊 → 𝕊′" and count the graded automorphism group
(2688 = 168·16 for both 𝕊 and 𝕊′). A general (non-graded) isomorphism
search by numerical optimisation remains available as a fallback.

### 3.8 Triad structure (Wilmot)

All definitions follow the paper; the engine implements them literally so
the paper's tables are reproducible.

- **Blades and triads.** Pure basis elements (blades) b < c < d in the
  graded order with a = bcd non-scalar (d ≠ bc) form a **triad**; there
  are C(N,3) of them, N = 2ᵐ − 1. Triads with d = bc are the associative
  (quaternion or anti-quaternion) rings.
- **Unordered associativity classes (Theorem 2, Table 1).** Type 1:
  [b,a,c] ≈ [b,d,c] ≈ [a,b,d] ≈ [a,c,d]; Type 2: [a,b,c] ≈ [b,c,d] ≈
  [b,a,d] ≈ [a,d,c]; Type 3: [a,c,b] ≈ [c,b,d] ≈ [a,d,b] ≈ [c,a,d], where
  ≈ means both zero or both non-zero. Representatives used by the engine:
  Type 1 ← [b,d,c], Type 2 ← [b,c,d], Type 3 ← [c,b,d]; the engine also
  verifies the full equivalence classes on every triad as a self-test.
  Triple associator T(b,c,d) = [b,d,c] − [d,c,b] + [c,b,d]; a triad is
  associative iff T = 0.
- **Non-associativity types (Theorem 5).** A non-associative triad has
  either exactly one Type non-zero or all three: A (Type 1 only),
  B (Type 2 only), C (Type 3 only), X (all three). Octonions are all X.
- **Moufang and Mal'cev (Theorem 6, eq. 10).** Per triad: Moufang 1
  d(b(dc)) = (db)(dc) ⇔ B or X; Moufang 2 b(d(cd)) = ((bd)c)d ⇔ C or X;
  Moufang 3 (db)(cd) = (d(bc))d ⇔ B or X when the Mal'cev identity
  (bc)(db) = −((bc)d)b holds, A or C otherwise. All are computed and shown
  per triad, so the correspondence is itself a displayed check.
- **3-cycles and silos (Theorem 7).** Pairs form 3-cycles (b,c), (b,bc),
  (c,bc); a 3-triad cycle is (b,c,d), (b,bc,d), (c,bc,d) with
  b < c < bc < d; triads with d < bc are non-cycles. The type triple of a
  cycle is its silo; only AAA, ACC, XBB, BBA, BXC, CAB, CCX, XXX occur.
  The engine tabulates silo counts and non-cycle type counts per algebra
  (paper Table 4) and associative / non-cycle / cycle totals (Table 2).
- **Subalgebra generated by a triad (Theorems 3, 4, 9).** Any triad
  generates an 8-dimensional basis subalgebra isomorphic or
  anti-isomorphic to ℍ, 𝕆, P₄, P₁₂ or P₁₄, identified by its 28 triad
  types (Table 6: 𝕆 = 28X; P₄ = 12A,12C,4X; P₁₂ = 8A,8B,8C,4X;
  P₁₄ = 7A,10B,7C,4X) and by its silo decomposition. Counts of ℍ, 𝕆, P₄,
  P₁₂, P₁₄ copies per algebra (Table 5) and the recurrence
  S_{m+1} = 7(O_m + S_m) (Theorem 8) are tests. Wilmot's explicit
  generating triads for the 8 octonion and 7 P₄ copies in 𝕊 are the
  default labels of those subalgebras.
- **Zero-divisor pairs (Theorem 10, Definition of modes, Theorem 11).**
  Two-term zero divisors (a + b)(c + d) = 0 with a, b, c, d distinct
  scaled blades, a² = b², c² = d², reduce to ac = −bd and to Type 3
  associativity of the underlying triad, hence to A or B triads. Modes:
  prime (a+b)(c+d), dual (−d+b)(c+a), extended (a′+b)(c+|db|) with
  a′ = bc|db|, extended-dual (−|db|+b)(c+a′). The engine enumerates all
  pairs (O(n³) via a⊕b = c⊕d), groups by 3-triad cycle and mode, reports
  the primaries (7 for U₁, 147 for U₂), and checks
  Z_m = (N−1)(N−3)(N−7)/16 = 12·S_m against the enumeration (Table 14:
  84, 1 260, 13 020, 117 180 for U₁…U₄). de Marrais's 42 assessors are
  the same objects in 𝕊 and are labelled as such.
- **Split algebras (§5 of the paper).** Unitary generators u_i (u² = +1),
  the pure-trace theorem, split octonions with 12 zero-divisor pairs,
  A_{0,4} with 180 and A_{3,1} with 84, the isomorphisms among the split
  sedenions, idempotents (1 + u_α) and the nilpotent left ideals. All are
  tests.

**Triad explorer** (view): the C(N,3) triads as a filterable table and as
the τ tensor (n×n slices for fixed third element), coloured by A/B/C/X;
silo and mode grouping; Moufang/Mal'cev bits; click a triad to load its
generated subalgebra, its 3-triad cycle, and its zero-divisor pairs into
the other views. Masking by the selected subalgebra shows an octonion
copy as an all-X block and a P₄ copy as a 12A/12C/4X block.

### 3.9 The mirror double and the sedenion pair (Lui)

- **Construction.** M(A) as in §3.2; Proposition 3.2 (unital, quadratic,
  involution anti-automorphic, N(a+bℓ) = N(a)+N(b), x² = 2a₀x − N(x)) is
  checked on every M(A) the user builds.
- **Embedding (Theorem 3.3).** Φ(a + bℓ) = ā + (be)e′ maps M(A)
  isomorphically onto A + A(ee′) ⊂ CD²(A), with (a+bj)(c+dj) =
  (ac − b d̄) + (ad + c̄ b)j for j = ee′. The engine constructs 𝕊′ both
  by `M(𝕆)` and as the hyperplane S_γ ⊂ 𝕋 spanned by e₀…e₇, e₂₄…e₃₁,
  exhibits Φ, and verifies it is a *-isomorphism. Likewise M(ℍ) as
  ℍ + ℍ(εℓ) ⊂ 𝕊.
- **Bales census (Theorem 3.6).** All 32 candidate doubling formulas
  applied to 𝕆: the eight admissible ones fall into two classes
  {P₀, P₃, P₀ᵀ, P₃ᵀ} → 𝕊 and {P₁, P₂, P₂ᵀ, P₁ᵀ} → 𝕊′ with the stated
  isomorphisms a+bℓ ↦ ā+bℓ etc.; the other 24 give unital algebras with
  x x̄ = N(x), anticommuting units, dim Der = 14, but some basis line not a
  quaternion algebra; 20 have only the founding octave, 4 have eight
  octonion hyperplanes but are not graded-isomorphic to 𝕊 or 𝕊′. All
  reproduced by the engine and displayed as a 32-row census table.
- **Orientation tree (Remark 3.5, 3.8, Question 2).** Words in {CD, M}
  applied to 𝕆: at dimension 16 the four words give 𝕊 (twice, with the
  explicit signed relabelling CD(M(ℍ)) → 𝕊), 𝕊′ and M(M(ℍ)); the app
  builds the full tree to dimension 128 (2⁴ words at 128), fingerprints
  and graded-classifies each node, and reports which have Der = 𝔤₂. This
  is a direct attack on the paper's open Question 2.
- **Orientation bit (Prop. 7.3).** F_{𝕊′} = F_𝕊 · χ with χ = −1 on
  distinct non-zero pairs of the founding 𝔽₂³ and +1 elsewhere; the
  engine displays χ as a mask on the 16×16 table, checks that χ is not a
  2-cocycle, and computes the associator functions ϕ = ∂F (both +1 on
  exactly 168 of the 420 independent triples; neither trilinear).
- **Graded automorphisms (Prop. 7.4).** Order 2688 for both 𝕊 and 𝕊′;
  no graded isomorphism 𝕊 → 𝕊′ (exhaustive over GL(4,2)). Uses §3.7.
- **Automorphisms (Theorem 7.1, Remark 7.2, Theorem 8.1).**
  Aut(𝕊′) = G₂ × ℤ/2 acting diagonally; the sign flip ε: a+bℓ ↦ a−bℓ;
  Brown's order-three element of Aut(𝕊) (rotation by 2π/3 in each plane
  ℝq + ℝqℓ) constructed explicitly and shown to fail on 𝕊′; for M(ℍ) the
  6-dimensional group a+bℓ ↦ φ(a) + (qφ(b))ℓ.
- **Sign-function census (ref. [16], Question 2).** Enumerate sign
  functions on 𝔽₂⁴ whose basis lines are all quaternion or
  anti-quaternion, classify by octave count and dim Der, and confirm 𝕊 and
  𝕊′ are the only ones with eight octaves and dim Der = 14. Same engine at
  𝔽₂⁵ with pruning, as far as it will go, to see whether the pattern
  continues.

### 3.10 Geometry of zero divisors (Lui, Moreno, Biss–Dugger–Isaksen)

Continuous structure on the sedenion pair and on any doubled algebra:

- **Stretch spectrum (Theorem 4.1, Remark 4.2).** Eigenvalues of
  L_x̄ L_x / N: for 𝕊′ {1 ± σ, 1 ± τ, 1} with multiplicities 2,2,4,4,4,
  σ = 2|a′||b|/N, τ = 2|a′||b∥|/N; for 𝕊 {1 ± s, 1} with 4,4,8,
  s = 2|a′ × b′|/N. Computed numerically at any x and compared to the
  closed forms; the characteristic polynomials in normal form are tests.
  ker alt_x for generic x is a quaternion subalgebra in 𝕊′ and an octonion
  subalgebra in 𝕊 (both checked to be composition subalgebras).
- **Dead set Z(A).** Norm-one zero divisors: for 𝕊′ the condition
  Re a = 0, |a| = |b| (S⁶ × S⁷, dimension 13); for 𝕊 additionally a ⊥ b
  (V₂(ℝ⁷), dimension 11). The engine samples Z, estimates its dimension
  from the rank of the differential, and reports 13 vs 11.
- **Annihilators (Theorem 5.2).** dim Ann(x) as an integer field: 2
  generically and 6 on the locus b ∈ ℂ_u for 𝕊′; 4 for 𝕊. The closed
  form Ann(u + bℓ) = {nu + (bn)ℓ : n ∈ Im 𝕆, n ⊥ u, [b,n,u] = 0} is
  checked against ker L_x.
- **Pair manifold P(A) (Theorem 5.5).** Sample pairs (x,y) of norm-one
  elements with xy = 0; estimate tangent dimension (14 for both);
  exhibit Ψ(u,n,q) and its inverse; show the fibres S¹ / S⁵ of
  (x,y) ↦ x and the fibration over the quaternion Grassmannian
  G₂/SO(4). Two-sidedness xy = 0 ⇒ yx = 0.
- **Basis zero divisors (Prop. 5.4).** 84 two-term zero divisors in 𝕊
  (42 assessors) vs 112 (56 index pairs) in 𝕊′; 336 ordered two-term
  annihilating pairs in both. Cross-referenced with Wilmot's modes.
- **Alternative elements (Cor. 4.3).** 𝕊′: 𝕆 ∪ (ℝ + 𝕆ℓ); 𝕊:
  (ℝ + 𝕆ℓ) ∪ ⋃_u (ℂ_u + ℂ_u ℓ). Rendered as the zero set of ‖alt_x‖.
- **Octaves (Theorem 6.1).** The 15 hyperplanes of 𝔽₂⁴: octonion iff
  ℓ ∉ H for 𝕊′ ("all planes avoiding a point"), iff H = V or ℓ ∈ H for 𝕊
  ("all planes through a point, plus one"); the other seven are M(ℍ) in
  both. Drawn on the PG(3,2) structure graph; the GL(4,2) stabilisers
  (orders 1344 vs 168) reported.
- **Higher mirrors (Question 3).** M(𝕊), M(𝕊′) ⊂ CD⁶(ℝ) (64 dims):
  annihilator-dimension statistics to test the conjecture
  dim Ann ≡ 0 (mod 2) rather than (mod 4).

**Views for this section:** *Stretch spectrum* panel (eigenvalues of the
current inspector point as a level diagram with multiplicities, and the
closed-form prediction beside it); *Annihilator dimension* observable
(integer colour map); *Zero-divisor set* observable (isosurface of
σ_min(L_x), with the (a₀, |a′|, |b|) chart as an alternative 3D slice
where Z is a plane curve for 𝕊′ and needs the extra angle for 𝕊);
*Pair sampler* panel (P(A) samples, tangent dimensions, fibre dimensions).

---

## 4. Observables (fields on the slice)

As in v0.3 (square, multiply-by-u, norm, commutator, associator with (u,v),
leakage density, exponential curves, power orbit, inverse, custom), plus:

| Observable | Definition | Rendering | Reveals |
|------------|-----------|-----------|---------|
| Stretch spectrum | eigenvalues of L_x̄L_x/N(x) | colour by number of distinct levels, or by σ, τ, s | 3-level (𝕊) vs 5-level (𝕊′) structure; zero divisors where an eigenvalue hits 0 |
| Annihilator dimension | dim ker L_x (numerical rank) | integer colour map | the 2/6 stratification of 𝕊′, the constant 4 of 𝕊 |
| Alternator norm | ‖alt_x‖ = ‖[x,x,·]‖ | isosurface at 0 | alternative elements |
| Zero-divisor set | σ_min(L_x) | dark isosurface | Z(A) in any slice |
| Triad type | for basis-aligned frames, colour cells of the product grid by the A/B/C/X type of the triad they complete | discrete colour | Wilmot's structure on the canvas |

---

## 5. Views (dockable panels)

Canvas · Leakage landscape · Multiplication table (with sign-function
overlays such as χ, and both index notations) · Structure graph (Fano
plane, PG(3,2) for 16, PG(4,2) for 32; octave and quasi-octave hyperplanes
coloured; 3-cycles as oriented triangles) · Subalgebra lattice (by
isomorphism type: ℍ, 𝕆, P₄, P₁₂, P₁₄, 𝕊, 𝕊′, …) · Facts · Derivations ·
**Triad explorer** (§3.8) · **Zero-divisor catalog** (pairs, assessors,
cycles, modes, primaries) · **Stretch spectrum** · **Pair sampler** ·
**Census** (Bales's 32 formulas; orientation tree; sign-function census;
graded-isomorphism results) · Timeline · Console · Compare (two scenes
sharing parameters; default pairing 𝕊 | 𝕊′).

All panels are linked: a triad selected in the explorer highlights its
three cells in the table, its triangle in the structure graph, its
generated subalgebra in the lattice, and its zero-divisor pairs in the
catalog and canvas.

---

## 6. Interaction

Mouse and keyboard as in v0.3; command palette; direct entry of elements
in either notation (`e1 + e9`, `o1 - o1234`, `a + b*l` with a, b
octonion expressions); export PNG/SVG/MP4, CSV/JSON of any table or field,
LaTeX of tables (the paper tables regenerate from the engine), project
JSON.

---

## 7. Guided tours (content for v1)

1. The sphere of complex numbers inside ℍ.
2. Seven quaternions in the octonions; G₂ derivation flow.
3. Rotation, boost, shear: ℂ, split-ℂ, dual numbers.
4. Spinors are even: Cl(3,0).
5. Same algebra, different clothes: split-ℍ, Cl(2,0), Cl(1,1), M₂(ℝ).
6. **Wilmot I: types and silos.** From 𝕆 (all X) to 𝕊: the first A and C
   triads, Type 1/2/3 associators side by side, the eight silos, the
   Moufang identities separating.
7. **Wilmot II: octonions and quasi-octonions in 𝕊.** The 8 + 7 split from
   generating triads; P₄ as 12A/12C/4X; the 12 zero divisors of each P₄
   copy; 7 × 12 = 84.
8. **Wilmot III: 32 to 128.** P₁₂ appears in U₂, P₁₄ in U₃, the projection
   theorem; Tables 4, 5 and 14 regenerated live up to U₄; the zero-divisor
   formula Z_m against the enumeration.
9. **Wilmot IV: split sedenions.** Unitary generators, pure trace, the
   180 and 84 zero divisors of A_{0,4} and A_{3,1}, idempotents and ideals.
10. **Mirror I: one letter.** Build 𝕊 and 𝕊′ from 𝕆 with the two products;
    show χ on the table; show that no signed relabelling connects them.
11. **Mirror II: inside 𝕋.** Find S_γ among the 31 hyperplanes, see the
    embedding Φ, the octave configurations "through a point" vs "avoiding
    a point" on PG(3,2).
12. **Mirror III: the dead set.** Zero-divisor isosurfaces in matched
    slices of 𝕊 and 𝕊′; the (a₀, |a′|, |b|) chart; annihilator dimension
    2/6 vs 4; the stretch spectrum at a moving point.
13. **Mirror IV: symmetry.** The diagonal G₂ flow on both; Brown's
    order-three map succeeding on 𝕊 and failing on 𝕊′; the orientation
    tree to 64 dimensions and the open question of which words give
    Der = 𝔤₂.
14. **Bales's eight products.** The 32-row census; two classes; the four
    odd ones out.

---

## 8. Architecture

```
core/
  algebra/   sign-function, monomial and dense representations; constructors
             CD, M, Bales, Tower, Ultronion, SignFunction, Clifford, …;
             both index notations
  ops/       element ops, L_x/R_x, exp/log, stretch operator, annihilator
  linalg/    dense QR/SVD/eig/null space; 𝔽₂ linear algebra (rank, solve,
             subspace enumeration, GL(m,2) enumeration with stabiliser pruning)
  sub/       subspaces, closure, leakage, lattice, Grassmannian search,
             fingerprint, graded isomorphism search
  triads/    Wilmot module: triads, Types, A/B/C/X, T, Moufang/Mal'cev bits,
             3-cycles, silos, generated subalgebra and P_k identification,
             zero-divisor pairs, modes, primaries, Z_m, split variants
  mirror/    Lui module: M(A), Φ embedding, Bales census, orientation tree,
             χ and cocycle test, stretch spectrum closed forms, Z/Ann/P
             samplers, octave configurations, Brown's map
  flow/      rotation modes
  fields/    observable samplers (CPU) and GPU kernels (WGSL)
  facts/     identities with residuals and witnesses; Der(A)
  script/    console API
viz/         framework-free scene builder and GPU kernels
app/         panels, docking, state, project files, timeline, tours
tools/       CLI; oracle runners that execute the external Python scripts
             (when present) and diff their output against engine fixtures
```

State: one immutable project object; reducers; renderer as a pure
function. Heavy jobs (GL(5,2) search, U₄ triad tables, sign-function
census, P(A) sampling) run in workers with progress and cancellation and
cache results in the project. Rust/WASM for the 𝔽₂ searches if profiling
demands it.

---

## 9. Technology (decided)

Electron + TypeScript + React; three.js on WebGL2 with WebGPU compute for
field evaluation; Dockview for panels; Monaco for the console. Engine in
plain TypeScript with typed arrays and bigint rationals; 𝔽₂ vectors as
Uint32 bitsets.

---

## 10. Performance budget

- Camera 60 fps; scrubbing ≥ 30 fps at 32³ for n ≤ 32 (CPU), 64³ for
  n ≤ 64 (GPU); 24³ default at n = 128.
- U₄ (128): 333 375 triads typed and siloed in under 2 s; 117 180
  zero-divisor pairs enumerated and moded in under 2 s; 11 811 eight-dim
  basis subalgebras classified in under 5 s; all in workers, cached.
- Graded isomorphism search: m = 4 instant; m = 5 under a minute in a
  worker; m = 6 only with pruning, reported as partial if the stabiliser
  coset search exceeds a budget.
- Der(A) by generator reduction for n ≥ 64 (unknowns n·log₂n); dim 14
  expected across the CD tower and the mirror family with Der = 𝔤₂,
  6 for the M(ℍ)-based ones.
- Stretch spectrum at a point: 128×128 symmetric eigenproblem, under
  10 ms; as a field on 16³ samples at n = 16, real time.
- P(A) sampling: 10⁴ pairs with tangent-rank estimates in a few seconds.

---

## 11. Testing strategy

The engine is the product; the two papers are the test oracles.

**Construction.** Convention 2.1 Fano lines; Wilmot's (20) index
correspondence; `M(𝕆)` ≅ S_γ ⊂ 𝕋 via Φ; M(ℍ) ≅ ℍ + ℍ(εℓ) ⊂ 𝕊; the eight
Bales products give exactly two algebras with the six stated
isomorphisms; CD(M(ℍ)) ≅ 𝕊 by a signed relabelling; four words at
dimension 16 give three algebras.

**Wilmot tables** (𝕆, U₁–U₄; U₅ optional in nightly CI):
- Table 2 (associative / non-cycle / cycle counts; totals = C(N,3)).
- Table 4 (silo counts and non-cycle A/B/C/X counts; only eight silos).
- Table 5 (ℍ, 𝕆, P₄, P₁₂, P₁₄ counts; S_{m+1} = 7(O_m + S_m)).
- Table 6 (identification signatures of 𝕆, P₄, P₁₂, P₁₄).
- Table 14 (non-associative triads, 28-factor, zero divisors, 84-factor);
  Z_m formula; 𝕊: 455 = 35 + 84A + 112C + 224X; U₂: 4495 = 155 + 1092B +
  336A + 1092C + 1820X; 147 distinct triples for U₂'s 1 260 pairs.
- Tables 8–13 (the 84 sedenion pairs in graded form, the 7 primaries,
  the U₂ primaries), Theorems 6 and 11 verified per triad.
- §5: pure trace = 1 for split algebras; 12 pairs for split octonions;
  180 for A_{0,4} with 39 primaries + 21 modes; 84 for A_{3,1} with 7
  primaries; the split-sedenion isomorphisms.

**Mirror paper (Appendix A, item by item):** unit, x x̄ = N, flexibility,
power-associativity to degree 4, failure of alternativity and of the
composition law, adjoint identity, for 𝕊 and 𝕊′; annihilator dimensions
2/6 vs 4 and the closed form of Ann(u + bℓ); rank dμ = 16 on every
stratum of P(𝕊′), tangent dimensions 14/13 (𝕊′) and 14/11 (𝕊);
composition property of the 15 hyperplanes of each and of the 31 of 𝕋;
dim Der = 14 for 𝕊, 𝕊′, all 32 candidates, and 6 for M(ℍ), the uniform
P₁ᵀ tower, M(M(ℍ)); characteristic polynomials of alt_x in normal form
(λ⁴(4a₁²(b₀²+b₁²) − λ²)⁴(4a₁²(b₀²+b₁²+b₂²) − λ²)² for 𝕊′,
λ⁸(4a₁²b₂² − λ²)⁴ for 𝕊); Φ and the six Bales isomorphisms; the
GL(4,2) search (order 2688, no 𝕊 → 𝕊′); 84/112/336; Brown's map on 𝕊
and its failure on 𝕊′; Aut(M(ℍ)) elements; the quaternion-line failures
of the 24 rejected formulas; ker alt_x a composition subalgebra of 𝕊;
ϕ = ∂F values (+1 on 168 of 420) and non-trilinearity; χ not a 2-cocycle.

**General:** leakage zero on every basis subalgebra; Λ invariant under
Der flows; exact vs float agreement; property-based tests; viz snapshots;
headless render of every tour step.

**Oracle runners:** if `tools/oracle/wilmot/` (geoalg) or
`tools/oracle/lui/` (cd.py, f2iso.py, check1–12, sym_spectrum.py) are
present, CI runs them and diffs against the fixtures; otherwise the
fixtures stand.

---

## 12. Roadmap

| Milestone | Deliverable | Exit criterion |
|-----------|-------------|----------------|
| M0 | Spec, repo skeleton, CI, fixture files transcribed from both papers | `npm test` runs the fixture suite (red) |
| M1 | Engine: representations, constructors incl. M and Bales, ops, 𝔽₂ linalg, subalgebra lattice, fingerprints, Der, **triads module** complete for U₁–U₄, zero-divisor enumeration and modes, split variants; CLI regenerating Wilmot's tables | All Wilmot fixtures green through U₄ |
| M2 | **Mirror module**: Φ, Bales census, orientation tree, χ, graded isomorphism search (m ≤ 5), stretch spectrum, Z/Ann/P samplers, octaves, Brown's map | All Appendix A fixtures green |
| M3 | App shell: docking, Set, table with overlays, structure graph, facts, lattice, triad explorer, zero-divisor catalog, census panel, console | Tours 6–8, 10, 11, 14 playable in discrete views |
| M4 | Slice + canvas: frames, observables incl. stretch spectrum, annihilator dimension, zero-divisor set; inspector with paper coordinates | Tours 1, 12 playable |
| M5 | Rotation modes, leakage landscape, Der flows incl. diagonal G₂ and Brown's step, timeline, Compare | Tours 2, 3, 13 playable |
| M6 | GPU fields, subalgebra search, higher mirrors at 64, sign-function census, exports, packaging | Tours 4, 5, 9 playable; v1.0 builds |
| v1.1 | m = 6 graded search with pruning, U₅ in the UI, 4D projections, WASM hot paths | — |

---

## 13. Decisions

Taken:

- Electron/TypeScript stack; engine to 256, UI tuned to 128.
- JavaScript console; external Python scripts as CI oracles, no bridge.
- Both index notations first-class; the two papers' tables are the
  acceptance suite.
- The two PDFs are committed under `docs/refs/`.
- Wilmot's `geoalg` (GPL-3.0) is vendored under `tools/oracle/wilmot/` as
  a test oracle only; it is never linked into the application.
- Tour order as listed in §7.
- The orientation tree (§3.9) is an intended discovery tool for the
  mirror paper's Question 2: build every word in {CD, M} over 𝕆 to
  dimension 128, classify, and report which are non-isomorphic and which
  have Der = 𝔤₂.

Pending input:

- The mirror paper's verification scripts (`cd.py`, `f2iso.py`,
  `check1–12`, `sym_spectrum.py`) go under `tools/oracle/lui/` when
  available; the fixtures transcribed from the paper stand until then.

---

## Appendix A. Notation

A ambient algebra, n = 2ᵐ; e_g, g ∈ 𝔽₂ᵐ, bitmask basis; o_α graded basis;
ℓ = e₈ doubling unit of 𝕊, e′ = e₁₆ of 𝕋; F sign function; B subalgebra;
F display frame; L_x, R_x; alt_x = [x,x,·]; N(x), t(x); Λ(S) leakage;
Der(A); U_m = CD^{m+3}(ℝ), N_m = 2^{m+3} − 1; H_m, O_m, S_m counts of ℍ,
𝕆, P_k copies; Z_m zero-divisor pair count; Z(A) norm-one zero divisors;
Ann(x); P(A) pair manifold; V₂(ℝ⁷) Stiefel manifold; χ orientation bit.

## Appendix B. Conventions

CD product (a,b)(c,d) = (ac − ε d̄ b, da + b c̄), conj (ā, −b); mirror
product (ca − d̄ b, da + b c̄); Fano lines of Convention 2.1; graded order
by Pascal recurrence with o_α o_n = +o_{α∪n}; Clifford blades by bitmask
with transposition-count signs; tolerances 1e-9 relative, exact mode where
available.

## Appendix C. References

- G. P. Wilmot, *Structure of the Cayley–Dickson algebras*,
  arXiv:2505.11747v3 (6 Feb 2026). Calculator: github.com/GPWilmot/geoalg.
- G. P. Wilmot, *Construction of exceptional Lie algebra G₂ and
  non-associative algebras using Clifford algebra*, arXiv:2505.06011 (the
  P_k series).
- Lui, *The mirror sedenions: a second G₂-symmetric doubling of the
  octonions and the geometry of its zero divisors*, working draft v1,
  September 2026.
- J. W. Bales, *The eight Cayley–Dickson doubling products*, Adv. Appl.
  Clifford Algebras 26 (2016).
- R. E. Cawagas, *On the structure and zero divisors of the Cayley–Dickson
  sedenion algebra*, Discuss. Math. Gen. Algebra Appl. 24 (2004).
- R. E. Cawagas et al., *The basic subalgebra structure of the
  Cayley–Dickson algebra of dimension 32*, arXiv:0907.2047 (2009).
- K.-C. Chan, D. Ž. Đoković, *Conjugacy classes of subalgebras of the real
  sedenions*, Canad. Math. Bull. 49 (2006).
- R. P. C. de Marrais, *The 42 assessors and the box-kites they fly*,
  arXiv:math/0011260 (2000).
- G. Moreno, *The zero divisors of the Cayley–Dickson algebras over the
  real numbers*, Bol. Soc. Mat. Mexicana (1998).
- D. K. Biss, D. Dugger, D. C. Isaksen, *Large annihilators in
  Cayley–Dickson algebras*, Comm. Algebra 36 (2008); with J. D.
  Christensen, *Eigentheory of Cayley–Dickson algebras*, Forum Math. 21
  (2009).
- R. B. Brown, *On generalized Cayley–Dickson algebras*, Pacific J. Math.
  20 (1967). P. Eakin, A. Sathaye, J. Algebra 129 (1990).
- S. Reggiani, *The geometry of sedenion zero divisors*, arXiv:2411.18881.
- J. Kirshtein, *Automorphism groups of Cayley–Dickson loops*, J. Gen. Lie
  Theory Appl. 6 (2012).
