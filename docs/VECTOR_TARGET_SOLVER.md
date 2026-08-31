# Vector Target Solver

## Goal

Find the largest recognizable parametric image that can be embedded into a QR while minimizing deliberate post-encode damage and respecting each Reed–Solomon block independently. The first target is deliberately simple and measurable: a classic vector smiley made from an outer circle, two circular eyes, and a filled half-ellipse smile.

## Why vector first

A parametric target gives the optimizer continuous-ish degrees of freedom that a fixed raster image does not: diameter, center offset, stroke thickness, eye radius/spacing, mouth proportions, and rendering profile. That makes it possible to ask a clean question: **how large can the face become before the required modifications exceed the configured per-block error budget?**

## Current V0 objective

The current `Auto-fit largest smiley` solver searches:

- all 8 legal QR masks (optional);
- smiley radius from roughly 91% of symbol width downward;
- ±1-module center offsets;
- two stroke-width variants;
- either `economy` or `clean` target profiles.

`economy` is the important one. Instead of forcing an entire white face background, it defines only dark smiley ink plus a narrow white halo around that ink. This keeps the perceptual edge structure while reducing the number of QR modules that need to change.

For each candidate geometry the solver groups all desired mismatched modules by QR stream codeword. A codeword costs one Reed–Solomon error symbol whether one bit or several bits inside that byte are deliberately changed. The solver therefore values a codeword by the total weighted target improvement obtained by sacrificing it.

Each RS block receives its own limit:

```text
intentional_limit(block) = floor(theoretical_correction_capacity × configured_budget_fraction)
```

Candidate codewords are greedily selected by visual benefit while respecting those independent block limits. Since each selected codeword has equal RS-symbol cost, this is the right first-order strategy for reaching a requested visual-fit threshold with very few bad codewords.

The candidate ranking is currently:

1. meet the requested weighted visual-fit floor;
2. maximize smiley diameter;
3. minimize deliberately corrupted RS codewords;
4. maximize achieved fit;
5. minimize physical module flips;
6. use ordinary QR mask penalty as a final tie-breaker.

## Example result

For the intentionally fertile configuration:

```text
payload    QRCD.CO/1234
version    6
ECC        L
pad mode   FF (experimental)
RS budget  50% of theoretical correction
fit floor  68%
```

V0 currently finds a roughly **37.3-module diameter smiley (91% of QR width)** while spending **7 corrupted RS codewords / 30 physical module flips**, distributed as 4 codewords in one block and 3 in the other. The exact result can vary as the solver evolves, but this is already a useful proof of the optimization model.

## Semantic rendering

Logical QR damage is only one channel. Human vision has access to chroma and sub-module geometry that a thresholding QR scanner may largely discard. The `semantic art` overlay therefore renders:

- target-matching dark smiley modules as near-black;
- other scanner-dark QR modules as saturated navy;
- light modules as white.

This does not change the binary logical matrix. It simply makes the intended target perceptually dominate the QR texture. Styled PNG export uses the same palette. Future versions should verify the styled render directly through multiple decoders and camera-degradation simulations.

## Next: valid steering before damage

V0 still treats the generated QR as a baseline and then spends RS margin. The more powerful solver should first change variables that preserve internal QR validity:

1. search mask;
2. search semantically ignored URL suffix / query bytes;
3. search experimental pad bytes where permitted;
4. recompute Reed–Solomon parity for every candidate;
5. score the resulting *valid* matrix against the vector target;
6. spend intentional errors only on the remaining stubborn target pixels.

This turns excess capacity into a control surface instead of an error budget.

## Later: sub-module perceptual steering

A module need not be rendered as a full black or white square. A future renderer can preserve the scanner's center sample while placing human-visible geometry toward edges/corners, or shrink non-target dark modules into navy center-weighted dots. That creates another layer of artistic freedom without necessarily changing the sampled bit.

This should be tested empirically, not assumed: different decoders use different sampling and binarization strategies.
