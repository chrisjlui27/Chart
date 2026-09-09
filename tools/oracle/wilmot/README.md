# Oracle: Wilmot's geoalg calculator

Vendored copy of https://github.com/GPWilmot/geoalg (commit `642992d43f16ce291ca56595b99bd6e6b12b0fc2`),
Python sources and macro files only (the bundled PDFs are omitted).
Licence: GPL-3.0 (see `geoalg/LICENSE`).

This code is a **test oracle only**. It is run by CI to produce reference
counts (triad types, silos, modes, zero divisors, subalgebra copies) that
the TypeScript engine must reproduce. It is never imported by, linked into,
or shipped with the application, so the application's licence is unaffected.

Relevant entry points (see SPEC.md §3.8):

- `geoalg/calcO.py`: `nonAssocType`, `cycles`, `cyclesType`, `tripleAssociator`,
  `moufang`, `malcev`, `nonAssocMode`, `AssocTriads`, `MoufangTriads`,
  `AbcTriads`, `ZeroDivisors`.
- `geoalg/ultronions.oct`: the `Cawagas` class and the functions used to
  build the paper's tables (`triadCycles`, `triadCyclesModes`, `triadsZD`, …).

Smoke test (all eight tests pass as of vendoring):

```
cd tools/oracle/wilmot/geoalg && python3 calcO.py test
```

The fixture generator that drives it lives in `tools/oracle/wilmot/gen_fixtures.py`
(to be written in M0/M1).
