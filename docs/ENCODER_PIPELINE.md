# Proposed Artistic Encoder Pipeline

## Inputs

- required decoded payload or URL prefix;
- optional server-side namespace rules for ignorable suffix/query bytes;
- target art: SVG/vector preferred, otherwise high-resolution raster;
- deployment context: screen, paper, signage, aircraft, package, etc.;
- minimum empirical decode score;
- brand palette / rendering constraints.

## Phase 1 — normalize artwork

Produce QR-resolution objective fields:

- binary occupancy target;
- grayscale/luminance target;
- edge-distance map;
- salient feature map;
- optional vector-stroke skeleton;
- optional color/chroma target.

For a logo such as the United globe, edge and stroke objectives are likely more useful than naive pixel MSE because preserving recognizable curves matters more than matching every square.

## Phase 2 — choose candidate symbol envelope

Search across:

- version;
- ECC level;
- QR mode / segmentation;
- target placement / scale / rotation;
- all eight masks.

The optimizer should not assume “highest ECC” is always best. Lower ECC provides more data codewords that can be directly steered by controllable payload bytes; higher ECC provides more post-encode correction margin.

## Phase 3 — establish legal/free variables

Prefer variables in this order:

1. URL slug / routing token bytes that are semantically free;
2. ignored query/path suffix bytes the redirect service explicitly accepts;
3. legal payload segment choices / segmentation;
4. experimental non-standard pad bytes (research mode only);
5. rendering parameters that preserve sampled bit values;
6. deliberate physical corruption.

For a redirect domain, a powerful formulation is:

```text
fixed semantic prefix: QRCD.CO/<routing-key>
free visual suffix:    bytes ignored or consumed by redirect service
```

The suffix is then real QR payload and remains standards-compliant.

## Phase 4 — baseline candidate search

For every candidate payload and mask:

1. construct data codewords;
2. split into RS blocks;
3. compute parity;
4. interleave;
5. place modules;
6. apply mask;
7. score against artwork;
8. retain Pareto-best candidates across image similarity, symbol size, and robustness.

Do not use the stock QR mask penalty as the sole objective. Preserve catastrophic constraints (finder-like false patterns, structural readability) while adding target-art similarity.

## Phase 5 — pad / suffix solver

### Brute / stochastic search

For small free suffixes:

- random search;
- hill climb;
- simulated annealing;
- genetic search;
- beam search.

A candidate evaluation is cheap enough that millions of byte assignments may be practical in native/WASM code.

### Coding-theoretic / algebraic search

Reed–Solomon parity is a linear transform over GF(256). If free data bytes are treated as variables, their effect on parity can be precomputed. This suggests stronger solvers:

- construct a linear influence matrix from free bytes → parity bytes;
- solve exact parity-byte constraints when possible;
- use weighted / approximate objectives when target constraints exceed available degrees of freedom;
- combine linear solving with discrete mask / placement search.

The visual objective lives at the bit/module level while RS arithmetic lives at byte/GF(256) level, so this is naturally a mixed discrete optimization problem.

## Phase 6 — render-space optimization

Before changing logical bits, optimize visual variables that ideally preserve their thresholded values:

- hue / saturation;
- dark-module luminance;
- module radius / corner rounding;
- center-weighted circles;
- stroke shape;
- background color;
- local contrast.

A black semantic logo and dark-blue “QR noise” can be visually separable to humans while both remain dark to the scanner. This is a valuable second channel, but it must be tested across grayscale conversion, color management, display/printer variation, and auto-exposure.

## Phase 7 — deliberate error spending

Only now force stubborn modules.

The unit of accounting is not pixels; it is unique corrupted **codewords per RS block**. Prefer changes that:

- reuse an already-damaged codeword;
- avoid function modules entirely;
- distribute sacrificial codewords across blocks;
- preserve substantial unused correction margin for real-world damage.

## Phase 8 — intelligent repair

Run the repair engine after human or automatic edits. It should first seek valid-steering substitutions that restore the desired modules without errors, then fall back to visually minimal reversion.

## Phase 9 — empirical robustness qualification

A production candidate is accepted only if it crosses a configured decode-success threshold across a perturbation corpus:

- decoders;
- devices / camera-like simulations;
- blur;
- resolution/downsampling;
- rotation/perspective;
- lighting / contrast;
- JPEG or resampling artifacts;
- print bleed / dot gain;
- screen moiré and glare.

The final score should be empirical decode probability with theoretical RS margin as an explanatory diagnostic, not the other way around.
