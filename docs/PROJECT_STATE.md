# Project State — 2026-08-31

This is the compact handoff snapshot for Artistic QR Lab. It exists so a local/Codex session can recover the project intent without reconstructing the originating conversation.

## What we believe now

The promising path is not “draw over a QR and hope ECC saves it.” It is a layered optimization problem:

1. keep the useful URL very short and fixed;
2. exploit complete post-terminator pad bytes as experimental free variables;
3. recompute Reed–Solomon parity after every valid-steering change;
4. search all eight legal global masks;
5. fit continuous vector/SVG target geometry, especially semantic outlines;
6. render scanner-aware sub-module artwork using luminance, hue, shape, and center contracts;
7. validate across unknown raster phase, scale, blur, perspective, color transforms, and print/camera artifacts with multiple real decoders;
8. only then introduce limited deliberate logical corruption, tracked per RS block/codeword;
9. repair fragility with the smallest visual impact, preserving outlines before interiors.

## Why short payload + oversized QR is fertile

For a short URL in a deliberately larger QR version, much of the nominal data capacity is padding. Uniform `00` or `FF` experimental pads reveal strong repeating patterns because the visible module is effectively `raw XOR mask`. Instead of accepting that texture, treat the free pad bytes as an image-control channel and optimize arbitrary byte values before RS generation.

Current free-pad work precomputes the effect of free bits on both their data positions and downstream parity. This is an affine/linear steering problem over the QR/RS pipeline and should be improved with stronger search/solve methods.

## Visual target philosophy

The canonical target is a simple vector smiley because it exposes clear geometry and gives objective benchmarks.

Highest-value features:

1. outer circular silhouette;
2. mouth boundary / flat top / lower arc;
3. eye boundaries;
4. interiors;
5. background.

The art objective should be edge-first. A noisy mouth interior is acceptable before a broken mouth edge.

Future arbitrary SVG targets should expose:

- point-in-fill;
- signed distance to nearest edge;
- edge tangent and normal;
- semantic region / importance;
- exact vector export.

## Scanner-model insight

jsQR and ZXing HybridBinarizer are useful public reference decoders.

Important behavior:

- local luminance statistics are computed in **hard non-overlapping 8×8 raster-pixel regions**;
- regional black points are then spatially coupled through a **5×5 neighborhood average** used for thresholding;
- the 8×8 grid belongs to the input raster, not the QR module grid;
- therefore QR translation modulo 8 pixels, camera scale, blur, and perspective materially change the threshold field;
- after localization/perspective correction, logical modules are sampled near their centers.

This means the scanner-aware renderer should never optimize one perfect raster alignment. Sweep or integrate over phase/scale conditions.

## Spatial/convolutional renderer direction

The renderer should become a continuous luminance/color field rather than independent decorated modules.

For a true target edge:

- maximize useful contrast across the edge **normal**;
- maintain visual continuity/smoothness along the edge **tangent**;
- regularize neighboring values within the same semantic region;
- relax smoothing across actual art boundaries;
- add minimal local center repair only when a QR logical sample needs it.

This suggests a differentiable surrogate:

```text
continuous SVG/luminance field
  -> optics/blur
  -> 8x8 regional pooling/statistics
  -> smooth approximation of black-point logic
  -> 5x5 convolution over black points
  -> soft/sigmoid threshold
  -> perspective center samples
  -> logical sample-margin / decoder loss
```

Optimize expected loss over a distribution of:

- 8×8 phase X/Y;
- pixels/module;
- subpixel offsets;
- blur/PSF;
- perspective/rotation;
- contrast/exposure;
- RGB-to-luminance transforms/white balance;
- compression;
- print dilation/erosion.

Then verify candidates with real decoders.

## “Bit should be X but visually wants Y” abstraction

A module should carry both logical and visual intent. Conceptually:

```ts
interface ArtisticModule {
  logicalDark: boolean;
  desiredVisualDark: boolean;
  role: string;
  blockId?: number;
  codewordId?: number;
  rsSlack?: number;
  signedDistanceToEdge: number;
  edgeImportance: number;
  semanticRegion: string;
  centerLuminance: number;
  predictedSampleMargin: number;
}
```

If logical and visual intent disagree, try in this order:

1. valid free-byte steering;
2. sub-module geometry / smooth SVG art;
3. hue/luminance manipulation;
4. adaptive center contract;
5. deliberate codeword corruption only if necessary.

## Finder/function-pattern policy

Current default is conservative high contrast for quiet zone, finders, timing, alignment, format, and version information.

The earlier idea of lowering anchor contrast to provoke global auto-contrast is not favored because the reference decoders use local binarization. Keep this as an isolated experiment only if real multi-decoder evidence justifies it.

## Current implementation

Main contains:

- QR structure navigator;
- character/codeword/block/module mapping;
- standard and experimental pad modes;
- direct module editing and RS damage accounting;
- vector smiley target and budget-aware auto-fit;
- semantic art rendering;
- arbitrary free post-terminator pad steering with recomputed ECC;
- scanner-aware smooth vector rendering and configurable center contracts;
- local jsQR/ZXing-style threshold surrogate;
- scanner-aware SVG export;
- Intelligent Repair V0.

## Immediate execution order

1. **Real decoder integration** — GitHub #1.
2. **Deterministic stress corpus** — #2.
3. **8×8 phase/threshold diagnostics** — #5.
4. **Empirical center-contract search** — #3.
5. **Edge-field/spatial renderer** — #6.
6. **Improve free-pad solving** — #4.
7. Integrate all of the above into decoder-in-loop Intelligent Repair V2.

## Success criteria for the next major milestone

For the canonical V6/L smiley:

- exact payload recovered across required decoder engines;
- high deterministic stress-pass rate;
- large face relative to QR width;
- very high outline-only fidelity;
- visually smooth boundaries with low QR-like texture around outlines;
- most image fit obtained through valid steering + scanner-aware rendering;
- deliberate RS corruption is small, measured per block, and preserves operational margin;
- every reported best candidate includes reproducible parameters and SVG/PNG artifacts.

See `AGENTS.md`, `docs/MANDATE.md`, `TODO.md`, and issues #1–#6 for the authoritative task list.
