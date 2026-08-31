# AGENTS.md — Artistic QR Lab

## Mission

Build an artistic QR encoder/renderer that makes a QR symbol look as much as possible like intentional vector artwork while remaining robustly decodable under real camera/print conditions.

Do not optimize the QR encoder, artwork, scanner model, or Reed–Solomon budget as isolated subsystems. The project mandate is to optimize them jointly.

Read first:

1. `docs/MANDATE.md`
2. `TODO.md`
3. `docs/PROJECT_STATE.md`
4. `docs/CODEX_HANDOFF.md`
5. `docs/SCANNER_AWARE_RENDERING.md`
6. `docs/FREE_PAD_STEERING.md`
7. GitHub issues #1–#6

## Canonical benchmark

Use this as the default regression case unless a task explicitly says otherwise:

```text
payload: QRCD.CO/1234
mode: byte
version: 6
ECC: L
masks: search all 8
free bytes: complete post-terminator pad bytes may be arbitrary in experimental mode
art: analytic/vector smiley
```

Track at minimum:

- exact decoded payload by every integrated decoder;
- empirical stress-pass rate;
- face diameter / QR width;
- outline-only fidelity;
- overall weighted visual fidelity;
- free-byte changes;
- deliberate corrupted codewords per RS block;
- render parameters and artifact snapshots.

## Core invariants

- Keep useful URL/payload short and fixed for the canonical benchmark.
- Use valid steering first: free post-terminator bytes + recomputed RS parity + mask search.
- Scanner-aware visual rendering comes next.
- Deliberate logical corruption is a final-polish mechanism, not the primary encoder.
- Track deliberate damage by corrupted **codeword per RS block**, not module count.
- Preserve quiet zone and function structures conservatively by default.
- Do not weaken finder/timing/alignment contrast unless a dedicated multi-decoder experiment proves benefit.
- Optimize target **outlines** before filled interiors. Random QR texture inside a mouth/eye/logo fill is preferable to a broken semantic edge.
- Never treat the browser threshold surrogate as ground truth. Real decoder-in-the-loop validation wins.
- Never overfit one raster alignment. Sweep 8×8 binarizer phase, scale, blur, and other stress variables.

## Decoder model facts worth preserving

Reference implementations show a useful common structure:

- jsQR and ZXing HybridBinarizer use hard, non-overlapping 8×8 raster-pixel regions for local statistics.
- Final threshold for a region depends on a 5×5 neighborhood of regional black points.
- The regional grid is anchored to the input raster/camera frame, not QR module coordinates.
- Therefore `(phaseX, phaseY) mod 8` and pixels/module are critical nuisance variables.
- After localization/perspective correction, module extraction is effectively center-sampled; jsQR and ZXing's grid sampler use logical coordinates around `(x + 0.5, y + 0.5)`.

This motivates center contracts, sub-module artwork, phase sweeps, and spatial/convolutional threshold optimization.

## Preferred optimization stack

```text
short fixed payload
  -> choose version/ECC/mask search space
  -> optimize free post-terminator bytes
  -> recompute Reed–Solomon parity
  -> fit vector target / signed-distance field
  -> render smooth scanner-aware SVG/luminance field
  -> enforce adaptive logical center contracts only where necessary
  -> run phase/scale/blur/camera/print stress corpus through real decoders
  -> spend limited deliberate codeword corruption for stubborn high-value edges
  -> intelligent repair to restore requested empirical margin
```

## Spatial renderer direction

Treat rendering as a continuous field, not independent module decoration.

Desired behavior:

- high contrast **normal** to true target edges;
- smooth luminance/geometry **along** edge tangents;
- smooth neighboring luminance within the same semantic region;
- no smoothing penalty across intentional vector boundaries;
- adaptive center repair based on distance from the true vector edge to the expected sample center;
- interior texture is cheap, edge breakage is expensive.

Investigate spatial regularizers such as total variation / squared-gradient penalties within regions, explicit edge-normal contrast rewards, tangent-continuity rewards, and differentiable approximations of local binarization.

## Current highest-priority work

P0 sequence:

1. Issue #1 — real multi-decoder validation.
2. Issue #2 — deterministic camera/print stress harness.
3. Issue #5 — 8×8 binarizer phase/scale diagnostics.
4. Issue #3 — empirically optimize center contracts.
5. Issue #6 — edge-field renderer.

Then improve free-byte solving (#4) and fold all pieces into Intelligent Repair V2.

## Engineering expectations

- Prefer reproducible benchmarks and checked-in fixtures over anecdotal screenshots.
- Keep optimizer results deterministic when seeded.
- Record exact parameter sets for every claimed improvement.
- Add regression tests before refactoring QR/RS mapping code.
- Keep standard-compliant mode separate from experimental custom-pad mode.
- Clearly label any behavior that depends on decoder tolerance outside strict QR canonical padding rules.
- Preserve a simple way to export SVG and raster snapshots for human comparison.

The point of this repo is not merely to make a QR that scans once. The goal is to discover the best joint coding/vision/rendering strategy for creating art that still scans robustly.
