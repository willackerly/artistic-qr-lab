# Roadmap

## V1 — Structure + art damage lab (current)

- [x] full QR matrix construction and metadata
- [x] RS block / codeword navigation
- [x] standard + experimental pad modes
- [x] pad/payload overlay
- [x] physical module editor
- [x] target image upload
- [x] built-in smiley target
- [x] codeword-aware per-block damage accounting
- [x] configurable intentional-error target
- [x] Intelligent Repair V0
- [x] native browser decoder integration when available
- [x] clean PNG export

## V1.1 — Better experimental ergonomics

- [ ] brush drag / rectangle / lasso editing
- [ ] undo/redo history
- [ ] save/load session JSON
- [ ] side-by-side baseline / target / edited / repaired views
- [ ] explicit pad-byte/codeword selector
- [ ] codeword “sacrifice” tool that lets the user spend all useful bits within one already-bad byte
- [ ] highlight over-budget blocks directly on the matrix
- [ ] SVG export

## V1.2 — Multi-decoder harness

- [ ] ZXing adapter
- [ ] jsQR adapter
- [ ] optional zbar/WASM adapter
- [ ] compare decoded payload across engines
- [ ] decode from clean binary render and fully styled render separately
- [ ] record corner detection / failures

## V2 — Stress test and margin estimator

- [ ] downsample / resample sweep
- [ ] Gaussian blur sweep
- [ ] contrast / exposure sweep
- [ ] rotation and perspective sweep
- [ ] simulated print dot gain / bleed
- [ ] JPEG-like artifacts
- [ ] color-to-grayscale transform variants
- [ ] empirical pass-rate score
- [ ] “repair to X% empirical pass rate” objective

## V3 — Valid steering optimizer

- [ ] search all eight masks with target-aware objective
- [ ] search URL slug / ignorable suffix bytes
- [ ] identify all semantically free payload bits
- [ ] experimental custom pad-byte optimizer
- [ ] recompute ECC for every candidate
- [ ] maintain Pareto frontier: similarity vs robustness vs symbol size
- [ ] multiprocessing / Web Worker search

## V3.1 — RS algebraic steering

- [ ] precompute free-data-byte influence on parity bytes over GF(256)
- [ ] formulate exact/weighted parity constraints
- [ ] solve subsets of desired visible modules analytically where possible
- [ ] combine with discrete mask/version search

## V4 — Intelligent Repair V2

- [ ] repair visual sampling before logical bits
- [ ] use target saliency / edge maps
- [ ] try valid free-byte substitutions before reverting artwork
- [ ] decoder-in-the-loop repair
- [ ] suggest smallest human-visible edit to move red → yellow → green
- [ ] reserve configurable real-world RS margin rather than merely staying inside theoretical radius

## V5 — Rich branded rendering

- [ ] per-role hue/luminance palette
- [ ] circular / rounded / center-weighted module styles
- [ ] vector stroke optimization
- [ ] full-color target objective
- [ ] scanner-luminance vs human-chroma separation
- [ ] branded finder styling with detection constraints
- [ ] export presets for print, signage, mobile, and large-format display

## V6 — Production qualification

- [ ] explicit ISO-conformance mode
- [ ] experimental/non-standard warnings
- [ ] deterministic test corpus
- [ ] CI regression suite across QR vectors and decoder engines
- [ ] campaign batch generation / redirect integration
- [ ] scan telemetry feedback loop where appropriate
