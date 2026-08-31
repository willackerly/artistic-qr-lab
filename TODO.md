# Artistic QR Lab — TODO

This file is the execution checklist for the integrated mandate in [`docs/MANDATE.md`](docs/MANDATE.md). Do not optimize the artwork, QR code, scanner surrogate, or RS budget as isolated subsystems; the end objective is **visual fidelity subject to measured decoder robustness**.

## P0 — make robustness measurable

- [ ] Integrate jsQR as a real in-browser decoder.
- [ ] Integrate a second independent decoder (prefer ZXing-C++ WASM/native or ZXing-JS with a materially independent path).
- [ ] Decode the fully styled SVG/PNG render, not only the logical matrix.
- [ ] Report exact payload, success/failure, decoder disagreement, and extracted matrix where available.
- [ ] Build deterministic stress corpus: pixels/module, x/y subpixel offset, blur, perspective, rotation, luminance/contrast, white balance, compression, print bleed/erosion.
- [ ] Add explicit **binarizer phase sweep**: vary QR position modulo the decoder's 8×8 regional grid so no candidate accidentally overfits one raster alignment.
- [ ] Add pixels/module sweep because an 8×8 binarizer region can span fractions of a QR module or multiple modules depending on camera scale.
- [ ] Check in canonical V6/L `QRCD.CO/1234` smiley benchmark and reproducible metrics.

## P0 — instrument local threshold behavior

- [ ] Visualize 8×8 binarizer region boundaries for a selected phase.
- [ ] Visualize per-region black point and final 5×5-neighborhood threshold.
- [ ] Visualize module sample locations after perspective extraction.
- [ ] Show per-module center luminance, local threshold, and classification margin.
- [ ] Show which surrounding raster regions contributed to a selected module's threshold.
- [ ] Compare surrogate binarization to actual jsQR/ZXing intermediate binary images where practical.

## P0 — outline-first scanner-aware renderer

- [ ] Move smiley to reusable analytic/SVG target geometry with fill + signed-distance queries.
- [ ] Compute curve tangent/normal and semantic region for each module / raster point.
- [ ] Weight outer circle, mouth boundary, and eye boundaries much more strongly than filled interiors.
- [ ] Replace globally fixed center guards with adaptive guards driven by distance from the art edge to the expected sample center.
- [ ] Preserve high visual contrast across the normal of true target edges.
- [ ] Encourage smooth luminance/shape variation along edges and within same-semantic-region neighbors.
- [ ] Prefer visual errors inside mouth/eye fills over breaks in the silhouette/outline.
- [ ] Search light-center luminance, dark-center luminance, guard size, dark kernel size, navy-dot size, and hue.
- [ ] Optimize those parameters against multi-decoder stress success rather than surrogate margin alone.

## P0 — valid steering before damage

- [ ] Keep useful URL short/fixed for canonical benchmark.
- [ ] Treat all complete post-terminator pad bytes as experimental free variables.
- [ ] Recompute RS parity for every free-byte candidate.
- [ ] Search all eight masks jointly with pad bytes.
- [ ] Report visual gain attributable to valid steering separately from gain attributable to deliberate corruption.
- [ ] Maintain `deliberate RS errors = 0` during this stage.

## P1 — spatial / convolutional decoder surrogate

- [ ] Formalize the common local-binarizer pipeline as:
  - hard 8×8 regional statistics;
  - nonlinear black-point rule (mean + min/max + low-dynamic-range branch);
  - 5×5 box-filter-like neighborhood over black points;
  - piecewise-constant threshold per 8×8 region;
  - perspective center sampling.
- [ ] Build a differentiable approximation using smooth min/max and sigmoid thresholding.
- [ ] Optimize expected sample margin over a distribution of 8×8 phase offsets, scales, and blur kernels.
- [ ] Compare differentiable-gradient results with black-box search against real decoders.
- [ ] Investigate whether broad low-frequency luminance shaping can improve threshold margins without visibly degrading artwork.
- [ ] Avoid relying on one exact 8×8 alignment; any useful effect must survive phase randomization.

## P1 — edge-field optimization

- [ ] Represent render parameters as a spatial field rather than independent module choices.
- [ ] Add neighbor regularization inside same visual regions (e.g. squared-gradient / total-variation penalty).
- [ ] Disable/relax smoothing across actual target edges.
- [ ] Add an explicit edge-contrast reward normal to the vector boundary.
- [ ] Add a tangent-continuity reward so curves remain visually smooth.
- [ ] Explore anti-aliased SVG strokes plus local center repair rather than module-shaped art.
- [ ] Measure whether local color/luminance continuity reduces visible QR texture while maintaining sample margins.

## P1 — improve free-byte solver

- [ ] Keep current affine influence/greedy solver as baseline.
- [ ] Add random restarts.
- [ ] Add simulated annealing / tabu / beam search.
- [ ] Explore pseudo-Boolean / MaxSAT formulation for weighted visible-bit constraints.
- [ ] Explore GF(256)-aware algebraic solve for selected parity/visible constraints.
- [ ] Parallelize search with Web Workers or local worker processes.
- [ ] Track Pareto frontier: outline fidelity, overall fidelity, runtime, free bits changed, robustness.

## P1 — deliberate damage and Intelligent Repair V2

- [ ] Only enter damage stage after valid steering + scanner-aware rendering are exhausted.
- [ ] Spend corruption by RS **codeword**, not module count.
- [ ] Prefer already-sacrificed codewords when additional useful module changes lie inside them.
- [ ] Keep independent per-block budgets and configurable real-world reserve.
- [ ] Strongly protect outline-related modules/codewords.
- [ ] Prefer damage in filled interiors/background.
- [ ] Repair order: visual render tweak → free-byte re-steer → low-saliency logical revert.
- [ ] Add “repair to ≥X% stress-corpus decode success” action.

## P2 — function-pattern experiments

- [ ] Keep finders/timing/alignment/format/version high contrast by default.
- [ ] Add isolated experimental finder-style controls only after P0 decoder/stress infrastructure exists.
- [ ] Test moderate function-pattern luminance changes empirically; do **not** assume they trigger beneficial global auto-contrast.
- [ ] Reject any finder styling that improves one decoder/phase but materially harms aggregate localization robustness.

## P2 — arbitrary artwork

- [ ] Import SVG and normalize to target geometry interface.
- [ ] Derive semantic edge/interior maps automatically.
- [ ] Support multiple art saliency classes / user-painted importance masks.
- [ ] Support full-color targets with separate human-perceptual and scanner-luminance objectives.
- [ ] Generalize benchmark from smiley to United-style globe / logo cases.

## Success metrics

Every benchmark run should report:

- target artwork scale / QR width;
- outline-only fidelity;
- weighted overall fidelity;
- deliberate bad codewords per RS block;
- remaining theoretical RS margin;
- free-pad bits/bytes changed;
- decoder pass rate by engine;
- aggregate stress-corpus pass rate;
- worst passing and first failing transforms;
- render parameters and deterministic seed;
- SVG/PNG artifacts.

A pretty symbol that decodes once is not a pass. A boring symbol with huge margin is not the goal either. The project exists to push the Pareto frontier between the two.