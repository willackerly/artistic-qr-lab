# Scanner-Aware Rendering

## Objective

Render a QR symbol whose **logical module values remain recoverable by common decoders** while the human-visible artwork approaches a smooth vector target as closely as possible.

The core abstraction is no longer “this module is black/white.” Each module has two simultaneous intents:

```text
logical target:   what the QR decoder should sample
visual target:    what a human should perceive as part of the artwork
```

When those intents disagree, the renderer uses luminance, shape, sub-module placement, hue, and local scanner modeling before it spends any Reed–Solomon error budget.

## Scanner facts that shape the design

Two widely used open-source decoder families, ZXing and jsQR, are unusually useful reference models because their image pipeline is explicit.

### Local thresholding, not a single global contrast knob

ZXing `HybridBinarizer` and jsQR both divide an image into 8×8-pixel regions, estimate a black point per region, and threshold using a 5×5 neighborhood of those local black points. Both use a minimum local dynamic range of 24 luminance levels before treating a region as truly mixed dark/light.

Implication: **deliberately lowering finder-pattern contrast is not a good default strategy.** There is no reliable global “make the anchors gray so the camera cranks contrast” effect to exploit. Low-contrast function patterns can instead fall into low-dynamic-range heuristics and harm the 1:1:3:1:1 finder-pattern detection step.

Default policy:

- finder / timing / alignment / format / version structures: conservative, high contrast;
- data + ECC modules: artistic rendering playground;
- quiet zone: preserve.

Reference implementations:

- ZXing `HybridBinarizer.java`
- jsQR `src/binarizer/index.ts`
- jsQR `src/extractor/index.ts`

### Module-center sampling matters

After localization/perspective correction, jsQR explicitly samples the extracted grid at `(x + 0.5, y + 0.5)` module coordinates. ZXing similarly nudges toward module centers in its pure-barcode path and uses a perspective grid sampler for normal detection.

This gives us a powerful rendering degree of freedom:

> visual ink can cross module edges and corners while a small deterministic center region protects the intended logical sample.

This is not a guarantee against every camera pipeline—blur spreads edge energy into the center—but it is a strong starting model and can be stress-tested.

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

## Local-threshold surrogate

V0.2 includes a browser-side surrogate modeled after the relevant parts of jsQR/ZXing:

1. render at 8 pixels/module;
2. optional Gaussian blur;
3. convert RGB to luminance using `0.2126 R + 0.7152 G + 0.0722 B`;
4. divide into 8×8 pixel regions;
5. compute local black points with minimum dynamic range 24;
6. average the surrounding 5×5 black-point neighborhood;
7. threshold pixels;
8. sample the center of every QR module;
9. map sampled errors back to RS codewords and blocks.

Outputs include sampled module errors, affected RS codewords, errors per block vs correction capacity, and minimum center-to-threshold luminance margin.

This model is deliberately fast and deterministic. It is **not** the final production validator. Real decoder-in-the-loop tests must add perspective, scale, camera blur, compression, print bleed, glare, white balance, and multiple independent decoders.

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
  → scanner-aware vector render
  → threshold/decode stress test
  → deliberate codeword damage only for stubborn outline defects
  → intelligent repair / margin restoration
```

When deliberate damage is necessary, protect target outlines aggressively and preferentially spend errors in low-saliency interiors such as the filled mouth.
