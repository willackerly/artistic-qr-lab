# Roadmap

The roadmap is governed by [`MANDATE.md`](MANDATE.md) and the live execution checklist in [`../TODO.md`](../TODO.md). The project should move the **joint Pareto frontier** between visual fidelity and measured decoder robustness rather than optimize one layer in isolation.

## V1 — Structure + art damage lab (current)

- [x] full QR matrix construction and metadata
- [x] RS block / codeword navigation
- [x] standard + experimental pad modes
- [x] pad/payload overlay
- [x] physical module editor
- [x] target image upload
- [x] built-in smiley target
- [x] budget-aware vector smiley auto-fit (largest face → minimum RS-symbol spend)
- [x] mask search during vector auto-fit
- [x] semantic target-emphasis rendering + styled PNG export
- [x] codeword-aware per-block damage accounting
- [x] configurable intentional-error target
- [x] Intelligent Repair V0
- [x] native browser decoder integration when available
- [x] clean PNG export
- [x] experimental free post-terminator pad-bit steering with RS recomputation
- [x] smooth scanner-aware vector smiley renderer
- [x] first jsQR/ZXing-style local-threshold surrogate

## V1.1 — Better experimental ergonomics

- [ ] smiley Pareto explorer: diameter vs visual fit vs bad codewords vs module flips
- [ ] vector target parameter controls (eye size, mouth geometry, ring thickness, center constraints)
- [ ] brush drag / rectangle / lasso editing
- [ ] undo/redo history
- [ ] save/load session JSON
- [ ] side-by-side baseline / target / edited / repaired views
- [ ] explicit pad-byte/codeword selector
- [ ] codeword “sacrifice” tool that lets the user spend all useful bits within one already-bad byte
- [ ] highlight over-budget blocks directly on the matrix
- [ ] SVG export + reusable target-geometry interface

## V1.2 — Multi-decoder harness

- [ ] ZXing adapter
- [ ] jsQR adapter
- [ ] optional zbar/WASM adapter
- [ ] compare exact decoded payload across engines
- [ ] decode from clean binary render and fully styled render separately
- [ ] record localization/corner-detection failures
- [ ] expose extracted/sample matrix where possible

## V2 — Stress test and margin estimator

- [ ] downsample / pixels-per-module sweep
- [ ] **8×8 binarizer x/y phase sweep**
- [ ] Gaussian blur sweep
- [ ] contrast / exposure sweep
- [ ] rotation and perspective sweep
- [ ] simulated print dot gain / bleed
- [ ] JPEG/WebP artifacts
- [ ] color-to-grayscale transform variants
- [ ] empirical pass-rate score by decoder
- [ ] “repair to X% empirical pass rate” objective
- [ ] worst-passing / first-failing artifact capture

## V2.1 — Local-binarizer instrumentation

- [ ] display hard 8×8 raster region boundaries
- [ ] display per-region mean/min/max + black-point estimate
- [ ] display 5×5-neighborhood final threshold
- [ ] display thresholded binary raster
- [ ] display perspective-mapped module sample centers
- [ ] display per-module center-to-threshold margin
- [ ] show selected module's local threshold receptive field
- [ ] compare surrogate intermediates with real decoder intermediates where practical

## V2.2 — Spatial / convolutional scanner model

- [ ] formalize hard 8×8 pooling → black point → 5×5 block-grid smoothing → threshold pipeline
- [ ] build phase/scale-aware differentiable approximation
- [ ] softmin/softmax approximation for black-point statistics
- [ ] smooth gate for low-dynamic-range branch
- [ ] 5×5 convolution over black-point grid
- [ ] sigmoid sampling-margin loss
- [ ] optimize expected loss over phase, scale, blur, perspective, and grayscale transforms
- [ ] compare differentiable results against real-decoder black-box optimization

## V2.3 — Edge-field rendering

- [ ] compute signed distance, tangent, normal, and semantic region from vector target
- [ ] maximize contrast normal to true art edges
- [ ] encourage tangent continuity along curves
- [ ] add same-region neighbor smoothness / TV regularization
- [ ] relax smoothing across genuine target boundaries
- [ ] adaptive center guards based on edge distance and measured scanner margin
- [ ] push unavoidable QR texture into filled interiors before outlines
- [ ] benchmark outline-only fidelity separately from total similarity

## V3 — Valid steering optimizer

- [x] search all eight masks with target-aware objective in current smiley/free-pad path
- [ ] search URL slug / ignorable suffix bytes where desired
- [x] identify complete post-terminator pad bytes as experimental free variables
- [x] recompute ECC for free-pad candidates
- [ ] improve arbitrary pad-byte optimizer beyond greedy bit hill climbing
- [ ] maintain Pareto frontier: similarity vs robustness vs symbol size
- [ ] multiprocessing / Web Worker search
- [ ] report contribution of valid steering separately from deliberate damage

## V3.1 — RS algebraic steering

- [x] precompute free-data-bit influence on resulting data+parity visible modules for current baseline
- [ ] formulate exact/weighted parity constraints
- [ ] solve subsets of desired visible modules analytically where possible
- [ ] compare random restart / annealing / tabu / beam / MaxSAT approaches
- [ ] combine with discrete mask/version/ECC search

## V4 — Intelligent Repair V2

- [ ] repair visual sampling before logical bits
- [ ] use target saliency / signed-distance edge maps
- [ ] try valid free-byte substitutions before reverting artwork
- [ ] decoder-in-the-loop repair
- [ ] suggest smallest human-visible edit to move red → yellow → green
- [ ] reserve configurable real-world RS margin rather than merely staying inside theoretical radius
- [ ] make outline modules/codewords expensive to revert
- [ ] prefer repair/damage in interiors and background

## V5 — Rich branded rendering

- [ ] per-role hue/luminance palette
- [ ] circular / rounded / center-weighted module styles
- [ ] vector stroke optimization
- [ ] full-color target objective
- [ ] scanner-luminance vs human-chroma separation
- [ ] arbitrary imported SVG target
- [ ] branded finder styling only behind decoder-qualified constraints
- [ ] export presets for print, signage, mobile, and large-format display

## V6 — Production qualification

- [ ] explicit ISO-conformance mode
- [ ] experimental/non-standard warnings
- [ ] deterministic benchmark/stress corpus
- [ ] CI regression suite across QR vectors and decoder engines
- [ ] campaign batch generation / redirect integration
- [ ] scan telemetry feedback loop where appropriate
- [ ] reproducible artifact manifest containing payload, pad bytes, mask/ECC/version, render parameters, decoder versions, and stress results
