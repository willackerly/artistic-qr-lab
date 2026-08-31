# Codex Handoff: Scanner-Aware Artistic QR V0.3

## Why this is a good Codex/local task

The project has reached the point where rapid local edit → browser render → decoder test → screenshot → iterate cycles are more valuable than additional architecture-only discussion. A local coding agent can run the repo, use Chromium, add JS/WASM decoder dependencies, execute thousands of optimization/stress cases, and keep changes in normal branches/PRs.

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

## First local tasks

### P0 — make decoder-in-loop validation real

Add at least two independent decoders:

1. `jsQR` in-browser;
2. ZXing-C++ WASM or ZXing-JS / native test harness.

For each rendered candidate report:

- exact decoded payload;
- pass/fail by decoder;
- sampled/extracted matrix if exposed;
- decoder disagreement;
- failure mode where observable.

### P0 — stress harness

Generate deterministic transforms over scanner-aware renders:

- scale: 3–20 px/module;
- subpixel x/y offsets;
- Gaussian blur;
- perspective skew;
- rotation;
- luminance/contrast shifts;
- JPEG/WebP compression;
- print-like dilation/erosion;
- RGB/white-balance variation.

Score a candidate by decode success fraction, not a single perfect render.

### P0 — optimize center contracts empirically

Search:

- light center luminance;
- dark center luminance;
- light guard fraction;
- dark kernel fraction;
- navy-dot fraction;
- blur-aware adaptive guard size.

Objective: maximize vector-outline similarity subject to a required decoder success rate.

### P1 — edge-aware adaptive guards

Replace one global center-guard size with a per-module guard computed from:

- signed distance from module center to nearest art edge;
- whether art actually covers the center;
- local line direction / curvature;
- decoder stress sensitivity;
- module role and RS block slack.

If a curve only clips a corner, do not add a center repair at all.

### P1 — formalize target geometry

Move smiley primitives into reusable target geometry interfaces supporting:

- point-in-fill;
- signed distance to edge;
- exact vector export;
- semantic regions: outline, interior, background;
- arbitrary imported SVG in a later step.

### P1 — smarter free-bit solve

The current greedy affine solver is a strong baseline. Compare it against:

- random restarts;
- simulated annealing;
- tabu search;
- beam search;
- MaxSAT / pseudo-Boolean optimization for weighted target bits.

Benchmark score vs runtime using the fixed smiley target.

## Benchmark configuration

Keep one canonical benchmark checked into the repo:

```text
payload: QRCD.CO/1234
mode: byte
version: 6
ECC: L
free bytes: arbitrary post-terminator bytes
masks: all 8
art: vector smiley
```

Track:

- face diameter / QR width;
- outline fit;
- overall weighted fit;
- deliberate bad codewords per block;
- number of free-byte toggles;
- decode success under stress;
- SVG/PNG snapshots.

## Important invariant

Do **not** optimize by reducing finder/timing/alignment contrast. Function structures should remain conservative unless a dedicated experiment proves otherwise across multiple decoders. ZXing and jsQR use local thresholding, so there is no dependable global auto-contrast benefit to harvest.
