# Oracle: mirror-sedenions verification scripts

Place the scripts from Appendix A of the mirror-sedenions paper here:

- `cd.py` (iterated doubling, the mirror double, the 32 Bales candidates)
- `f2iso.py` (graded isomorphism search over GL(4,2))
- `check1.py` … `check12.py`
- `sym_spectrum.py` (symbolic characteristic polynomials of alt_x)

CI runs whatever is present and diffs the output against the fixtures
transcribed from the paper (SPEC.md §11). The scripts are not imported by
the application.
