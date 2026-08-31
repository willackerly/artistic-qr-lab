# Codex Handoff: Scanner-Aware Artistic QR V0.4

## Read first

Before changing code, read:

1. [`docs/MANDATE.md`](MANDATE.md) — north-star objective and invariants;
2. [`../TODO.md`](../TODO.md) — prioritized execution checklist;
3. [`SCANNER_AWARE_RENDERING.md`](SCANNER_AWARE_RENDERING.md) — scanner model and spatial edge strategy;
4. [`FREE_PAD_STEERING.md`](FREE_PAD_STEERING.md) — valid post-terminator steering;
5. [`INTELLIGENT_REPAIR.md`](INTELLIGENT_REPAIR.md) — controlled damage / repair model.

The mandate is intentionally integrated: **do not improve one metric by quietly making another layer worse.** The target is smooth vector artwork subject to measured multi-decoder robustness.

## Why this is a good Codex/local task

The project has reached the point where rapid local edit → browser render → real decoder → stress corpus → metrics → screenshot → iterate cycles are more valuable than architecture-only discussion. A local coding agent can run Chromium, add JS/WASM/native decoder dependencies, execute thousands of optimization/stress cases, produce benchmark artifacts, and keep changes in normal branches/PRs.

## Current state

Main includes:

- QR structure navigator;
- RS block/codeword mapping;
- experimental pad modes;
- editable modules and RS-damage accounting;
- target-image / vector-smiley tooling;
- budget-aware vector smiley solver;
- `app/scanner-aware.js`:
  - arbitrary free post-terminator pad bytes;
  - affine pad-bit influence precomputation;
  - outline-weighted free-byte steering across all masks;
  - smooth vector smiley rendering;
  - deterministic logical-light/dark center contracts;
  - jsQR/ZXing-style local-threshold surrogate;
  - scanner-aware SVG export.

## Decoder facts to preserve in implementation

### Local binarization is hard-tiled + neighborhood-coupled

For jsQR and ZXing HybridBinarizer, the useful reference model is:

```text
input raster
  → fixed non-overlapping 8x8 regional statistics
  → nonlinear black-point estimate per region
  → 5x5 neighborhood average on regional black points
  → one threshold per 8x8 region
  → binary raster
  → QR localization / perspective mapping
  → sample near module centers
```

The 8×8 regions **do not slide one pixel at a time**. However, the 5×5 neighborhood means each threshold is spatially coupled to a broad local region.

The 8×8 grid is anchored to image pixels, not QR modules. Any evaluation must randomize/sweep raster phase `(dx mod 8, dy mod 8)` and pixels/module so we do not overfit one alignment.

### Center sampling is real but not sufficient by itself

jsQR and ZXing's grid sampler both target coordinates at logical module centers after perspective mapping. This supports sub-module center contracts, but binarization/blur happen earlier, so a tiny center island is only useful if it remains classifiable under the full image pipeline.

### Function patterns stay conservative by default

Do not deliberately reduce finder/timing/alignment contrast to try to force a global auto-contrast response. Local binarization provides no dependable global gain. Any branded finder experiment belongs behind an explicit experiment flag and must pass the multi-decoder stress corpus.

## First local tasks

### P0 — make decoder-in-loop validation real

Add at least two independent decoders:

1. `jsQR` in-browser or local harness;
2. ZXing-C++ WASM/native or a materially independent ZXing path.

For each rendered candidate report:

- exact decoded payload;
- pass/fail by decoder;
- sampled/extracted matrix if exposed;
- decoder disagreement;
- failure mode where observable.

### P0 — deterministic stress harness

Generate reproducible transforms over scanner-aware renders:

- scale: representative 3–20 px/module plus fractional scales;
- x/y subpixel offsets;
- **8×8 binarizer phase sweep**;
- Gaussian blur;
- perspective skew;
- rotation;
- luminance/contrast shifts;
- JPEG/WebP compression;
- print-like dilation/erosion;
- RGB/white-balance variation.

Score a candidate by decode success fraction, not a single perfect render.

### P0 — instrument local threshold behavior

Add debug views for:

- 8×8 regional boundaries;
- per-region mean/min/max and black point;
- 5×5-neighborhood final threshold;
- binary raster;
- perspective-mapped module sample locations;
- center luminance vs local threshold margin;
- selected module's threshold receptive field.

Where possible compare the surrogate to intermediate data from actual decoder implementations.

### P0 — optimize center contracts empirically

Search:

- light center luminance;
- dark center luminance;
- light guard fraction;
- dark kernel fraction;
- navy-dot fraction;
- blur-aware adaptive guard size;
- anti-aliasing / edge softness.

Objective: maximize vector-outline similarity subject to a required multi-decoder stress success rate.

### P0 — edge-first spatial renderer

Replace independent per-module styling with a spatial/vector field model.

Use exact vector geometry to obtain:

- signed distance to edge;
- tangent/normal;
- semantic region;
- outline importance.

Desired behavior:

- high contrast normal to actual smiley boundaries;
- smooth appearance along boundary tangents;
- smooth neighboring luminance/shape in regions without a target edge;
- center intervention only when scanner margin requires it;
- visual QR texture pushed into filled interiors before outlines.

Implement a configurable same-region smoothness/TV penalty and an explicit edge-normal contrast reward.

### P1 — phase-averaged differentiable decoder surrogate

Build a differentiable approximation of the local-binarizer path:

- 8×8 average pooling;
- soft min/max;
- smooth low-dynamic-range gate;
- 5×5 black-point convolution;
- sigmoid threshold;
- differentiable sample-margin loss.

Optimize expected loss over randomized/enumerated:

- 8×8 x/y phase;
- pixels/module;
- blur;
- small perspective/rotation;
- grayscale transform.

Compare gradient optimization against black-box search using actual decoders as truth.

### P1 — formalize target geometry

Move smiley primitives into reusable target geometry interfaces supporting:

- point-in-fill;
- signed distance to edge;
- edge tangent/normal;
- exact vector export;
- semantic regions: outline, eye, mouth interior, background;
- imported SVG later.

### P1 — smarter free-bit solve

The current greedy affine solver is a baseline. Compare against:

- random restarts;
- simulated annealing;
- tabu search;
- beam search;
- MaxSAT / pseudo-Boolean optimization;
- GF(256)-aware algebraic constraints where useful.

Keep deliberate RS damage at zero throughout this stage.

## Benchmark configuration

Keep one canonical benchmark checked into the repo:

```text
payload: QRCD.CO/1234
mode: byte
version: 6
ECC: L
free bytes: arbitrary post-terminator full bytes
masks: all 8
art: analytic/vector smiley
```

Track:

- face diameter / QR width;
- outline fit;
- overall weighted fit;
- deliberate bad codewords per block;
- free-byte state / toggles;
- real-decoder stress success;
- binarizer phase/scale statistics;
- SVG/PNG snapshots;
- deterministic seed/config.

## Optimization hierarchy

Do not collapse everything into one opaque scalar too early. Maintain a Pareto frontier with hard constraints where possible:

1. exact expected payload;
2. required decoder/stress pass rate;
3. localization/function integrity;
4. outline fidelity;
5. art size;
6. weighted visual fit;
7. deliberate RS damage;
8. visible repair complexity.

If visual compromises are required, **damage the mouth interior before breaking the mouth outline**.
