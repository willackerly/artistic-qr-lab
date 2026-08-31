# Scanner-Aware Rendering

## Objective

Render a QR symbol whose **logical module values remain recoverable by common decoders** while the human-visible artwork approaches a smooth vector target as closely as possible.

The core abstraction is no longer “this module is black/white.” Each module has two simultaneous intents:

```text
logical target:   what the QR decoder should sample
visual target:    what a human should perceive as part of the artwork
```

When those intents disagree, the renderer uses luminance, shape, sub-module placement, hue, local scanner modeling, and spatial neighborhood context before it spends any Reed–Solomon error budget.

## Scanner facts that shape the design

Two widely used open-source decoder families, ZXing and jsQR, are unusually useful reference models because their image pipeline is explicit.

### Local thresholding, not a single global contrast knob

ZXing `HybridBinarizer` and jsQR both divide an image into 8×8-pixel regions, estimate a black point per region, and threshold using a 5×5 neighborhood of those local black points. Both use a minimum local dynamic range of 24 luminance levels before treating a region as truly mixed dark/light.

Implication: **deliberately lowering finder-pattern contrast is not a good default strategy.** There is no reliable global “make the anchors gray so the camera cranks contrast” effect to exploit. Low-contrast function patterns can instead fall into low-dynamic-range heuristics and harm the finder-pattern detection step.

Default policy:

- finder / timing / alignment / format / version structures: conservative, high contrast;
- data + ECC modules: artistic rendering playground;
- quiet zone: preserve.

Reference implementations:

- ZXing `HybridBinarizer.java`
- ZXing `DefaultGridSampler.java`
- jsQR `src/binarizer/index.ts`
- jsQR `src/extractor/index.ts`

### The 8×8 regions are hard tiles, not a sliding 8×8 window

This distinction matters.

Both reference binarizers use a **fixed raster-space grid of non-overlapping 8×8 regions** anchored at the input image origin. They do not sweep an 8×8 window one pixel at a time.

A simplified model is:

```text
raw raster luminance
   |
   +--> hard non-overlapping 8x8 regions
           |
           +--> mean / min / max + low-dynamic-range rule
                    |
                    +--> one black-point value per 8x8 region
                              |
                              +--> 5x5 neighborhood average on black-point grid
                                        |
                                        +--> one threshold for each 8x8 region
                                                  |
                                                  +--> threshold all pixels in that region
```

So the final threshold image is **piecewise constant in threshold value over each 8×8 region**, even though each threshold is spatially coupled to nearby regions.

This can be viewed as a coarse, partially nonlinear convolutional pipeline:

1. 8×8 block pooling/statistics;
2. nonlinear black-point estimation (especially the low-dynamic-range branch);
3. approximately a 5×5 box filter over the regional black-point field;
4. hard thresholding.

In mixed/high-contrast regions where the black point is basically an average, the middle of this pipeline is especially amenable to a differentiable/convolutional approximation.

### Binarizer phase is unknown and must be swept

The hard 8×8 grid is aligned to **camera/raster pixels**, not to QR modules.

That means the same rendered QR can land at different phases relative to the binarizer grid simply because:

- the QR appears at a different x/y offset in the camera frame;
- the crop changes;
- the symbol is rendered at a different pixels/module scale;
- perspective/rotation changes the raster mapping.

Therefore a renderer must not exploit one convenient 8×8 alignment. The stress harness should explicitly sweep at least:

```text
phaseX = 0..7 pixels
phaseY = 0..7 pixels
pixelsPerModule = multiple representative values
```

plus fractional scale/perspective cases.

At 8 px/module and one lucky phase, a binarizer region can line up with one QR module. At 4 px/module it spans roughly 2×2 modules. At 12 px/module it spans less than one module. The effective QR-space receptive field of the 5×5 black-point neighborhood therefore changes with camera scale.

This is exactly why a **phase/scale-averaged spatial optimization** is more promising than a brittle per-module threshold trick.

### Module-center sampling matters

After localization/perspective correction, jsQR explicitly samples the extracted grid at `(x + 0.5, y + 0.5)` module coordinates. ZXing's normal `DefaultGridSampler` likewise constructs sample points at `(x + 0.5, y + 0.5)` before the perspective transform.

This gives us a powerful rendering degree of freedom:

> visual ink can cross module edges and corners while a small deterministic center region protects the intended logical sample.

This is not a guarantee against every camera pipeline—blur spreads edge energy into the center and binarization happens before extraction—but it is a strong starting model and can be stress-tested.

## Per-module contract

The renderer should eventually expose a structure like:

```ts
interface ModuleRenderContract {
  logicalDark: boolean;
  desiredVisualDark: boolean;

  kind: "function" | "data" | "ecc" | "remainder";
  streamIndex?: number;
  blockId?: number;
  rsBlockSlack?: number;

  signedDistanceToArtEdge: number;
  outlineImportance: number;
  interiorImportance: number;
  edgeTangent?: [number, number];
  edgeNormal?: [number, number];

  centerLuminanceTarget: number; // 0 black .. 1 white
  centerGuardFraction: number;
  predictedSampleMargin: number;
  predictedErrorProbability?: number;
}
```

## Default rendering parameters

V0.2 defaults intentionally preserve margin rather than chase maximum art immediately:

| Parameter | Default | Meaning |
|---|---:|---|
| light center minimum luminance | 82% | logical-light center protection |
| dark center maximum luminance | 18% | logical-dark center protection |
| light center guard | 32% of module | center patch used only when dark artwork crosses a light module center |
| dark center kernel | 50% of module | centered dark kernel preserving dark samples |
| non-art dark module fill | 58% | visually de-emphasized dark QR “noise” |
| blur surrogate | 10% of module | first-pass optical blur test |
| outline importance | 6× | prioritizes clean smile/eye/perimeter boundaries |

These are **parameters to optimize empirically**, not universal QR thresholds.

## Continuous vector rendering

For the smiley benchmark, the vector target consists of analytic primitives:

- circular perimeter stroke;
- two filled circular eyes;
- filled lower half-ellipse mouth with a flat top.

The render order is deliberate:

1. white quiet-zone/background;
2. ordinary logical-dark data/ECC modules as small navy center-weighted rounded squares;
3. continuous black vector artwork across module boundaries;
4. deterministic data-module center contracts;
5. high-contrast function patterns last.

The important consequence is that the mouth/perimeter are **genuinely smooth curves**, rather than stair-stepped module silhouettes. A light logical module crossed by an outline can keep a small light center while still carrying dark vector ink around that center.

### Edge-first visual objective

Raw pixel similarity is the wrong objective. The smiley is recognizable primarily from its boundaries.

Priority order:

1. outer perimeter continuity;
2. mouth outline / flat top / lower arc;
3. eye boundaries;
4. mouth interior;
5. other target fill;
6. background texture.

The optimizer therefore uses a signed-distance / edge-distance field and multiplies mismatch cost near boundaries. Random QR texture inside the mouth is acceptable long before a broken smile outline is acceptable.

### Spatial edge-field strategy

Do not choose every module's luminance/shape independently. The artwork should be optimized as a **spatial field**.

For a true vector boundary:

- maximize perceptual contrast **normal to the edge**;
- keep luminance and shape changes smooth **along the tangent of the edge**;
- discourage arbitrary high-frequency transitions between adjacent modules that belong to the same semantic region;
- permit a local center guard/kernel only when scanner margin requires it;
- concentrate unavoidable QR texture inside filled regions rather than along boundaries.

A useful objective can include terms such as:

```text
visual edge fidelity
+ edge-normal contrast
+ tangent continuity
+ same-region luminance smoothness
+ decoder sample margin
- RS damage cost
```

One simple same-region regularizer is a weighted neighbor penalty:

```text
sum_(i,j neighbors, no target edge between them) w_ij * (L_i - L_j)^2
```

or a total-variation term. Across a genuine target edge, that smoothing term should be relaxed and replaced by an explicit contrast reward.

This directly encodes the desired aesthetic behavior: **smooth broad visual fields, crisp intentional character edges, QR ugliness pushed into interiors.**

## Local-threshold surrogate

V0.2 includes a browser-side surrogate modeled after the relevant parts of jsQR/ZXing:

1. render at a configurable pixels/module scale;
2. optional Gaussian blur;
3. convert RGB to luminance using `0.2126 R + 0.7152 G + 0.0722 B`;
4. divide into hard 8×8 pixel regions;
5. compute local black points with minimum dynamic range 24;
6. average the surrounding 5×5 black-point neighborhood;
7. threshold pixels with one threshold per 8×8 region;
8. sample the center of every QR module after the modeled geometry mapping;
9. map sampled errors back to RS codewords and blocks.

Outputs should include sampled module errors, affected RS codewords, errors per block vs correction capacity, minimum center-to-threshold luminance margin, and the active 8×8 phase/grid visualization.

This model is deliberately fast and deterministic. It is **not** the final production validator. Real decoder-in-the-loop tests must add phase sweeps, perspective, scale, camera blur, compression, print bleed, glare, white balance, and multiple independent decoders.

## Differentiable / convolutional research direction

The fixed-region pipeline is not globally differentiable as written because of min/max branches and hard thresholds, but a useful surrogate can replace them with smooth approximations:

- block means: exact average pooling;
- min/max: softmin / softmax;
- low-dynamic-range branch: smooth gate;
- 5×5 black-point neighborhood: ordinary convolution / box filter;
- hard threshold: sigmoid with controllable temperature;
- module sample success: differentiable margin loss.

Optimize **expected** loss across random or enumerated phase offsets, pixels/module values, blur kernels, and color transforms rather than one rasterization.

This may let gradient-based optimization tune a continuous luminance/SVG field while the free-byte/RS/mask search handles the discrete coding variables.

## Color / hue

Hue should be treated as a human-perception channel while scanner modeling uses luminance.

Proposed default roles:

- target artwork: near-black;
- scanner-dark but visually secondary QR modules: navy / brand blue;
- protected function modules: very dark navy;
- logical-light center guards: neutral high-luminance gray/white.

A future renderer should optimize in a perceptual color space while constraining multiple grayscale transforms, because camera/decoder pipelines do not all use identical RGB→luminance weights.

## Repair integration

Scanner-aware rendering comes **before** logical corruption.

Preferred pipeline:

```text
valid QR
  → free-byte steering
  → scanner-aware vector / spatial-field render
  → phase/scale/decode stress test
  → deliberate codeword damage only for stubborn outline defects
  → intelligent repair / margin restoration
```

When deliberate damage is necessary, protect target outlines aggressively and preferentially spend errors in low-saliency interiors such as the filled mouth.
