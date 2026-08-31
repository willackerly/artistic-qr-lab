# Artistic QR Lab — Project Mandate

## North star

Build an artistic QR encoder/renderer that can make a QR symbol look as much as possible like intentional vector artwork **while remaining robustly decodable in the real world**.

The project should not optimize any one trick in isolation. The intended system jointly exploits coding freedom, visual rendering freedom, and decoder behavior, then validates the result empirically.

The canonical benchmark is a large, clean vector smiley over a short fixed URL. Once that pipeline is strong, the same machinery should generalize to logos, mascots, icons, and imported SVG artwork.

## Integrated optimization stack

The preferred order of operations is:

1. **Keep semantic payload short and fixed.** Use a compact URL such as `QRCD.CO/1234` so useful content occupies as few codewords as possible.
2. **Treat post-terminator full pad bytes as experimental free variables.** Choose arbitrary pad values, recompute Reed–Solomon parity, and use them as a valid-steering channel before introducing errors.
3. **Search legal QR degrees of freedom.** Search all eight masks and, where appropriate, version/ECC combinations.
4. **Fit vector geometry, not just pixels.** Targets should expose exact fills, signed distance to edges, curve tangents/normals, semantic regions, and outline importance.
5. **Protect outlines first.** Outer silhouette, mouth edge, and eye edges have much higher visual value than interior fill. Random QR texture inside a filled region is preferable to a broken outline.
6. **Render scanner-aware sub-module artwork.** A module has both a logical value and a visual intent. Use smooth SVG curves, hue, luminance, center guards/kernels, and adaptive sub-module geometry to satisfy both.
7. **Model local binarization and sampling.** Approximate the image-processing behavior of decoders such as jsQR and ZXing and optimize across unknown pixel phase, scale, blur, perspective, color transforms, and print/camera artifacts.
8. **Validate with real independent decoders.** Surrogate margin is a diagnostic only. Multi-decoder success under a deterministic stress corpus is the true robustness objective.
9. **Spend deliberate RS corruption last.** If stubborn outline defects remain, deliberately sacrifice the highest-value codewords while respecting each Reed–Solomon block independently.
10. **Repair intelligently.** When a candidate is fragile, recover margin with the smallest human-visible change: first rendering changes, then free-byte substitutions, then low-saliency logical reverts.

## Core abstraction

A QR module is not merely black or white. The optimizer should ultimately reason about something like:

```ts
interface ArtisticModule {
  logicalDark: boolean;          // what decoder should recover
  desiredVisualDark: boolean;    // what target artwork wants

  functionRole: string;          // finder/timing/alignment/data/ecc/etc.
  blockId?: number;
  codewordId?: number;
  rsSlack?: number;

  signedDistanceToEdge: number;
  edgeImportance: number;
  semanticRegion: string;        // outline / eye / mouthInterior / background ...

  localLuminance: number;
  centerSampleMargin: number;
  predictedErrorProbability: number;
}
```

The renderer/search engine should be able to answer:

> This bit must decode as X, but the artwork wants Y. What is the least visually damaging way to preserve X, and how much measured decoder margin does that choice consume?

## Objective hierarchy

Treat optimization as a constrained Pareto problem rather than one scalar score. In rough priority order:

1. exact expected payload across required decoders;
2. required empirical decode success over stress corpus;
3. function-pattern / localization integrity;
4. outline continuity and edge fidelity;
5. maximum useful artwork scale;
6. weighted visual similarity;
7. minimum deliberate corrupted RS codewords per block;
8. minimum visible repair artifacts / module overrides;
9. standard compliance, with experimental deviations clearly identified.

For the smiley, **outline fidelity should dominate interior cleanliness**.

## Function-pattern policy

Finder, timing, alignment, format/version structures and the quiet zone are conservative by default. Do not weaken them merely to attempt to induce camera auto-contrast.

Experiments with branded or lower-contrast function patterns are allowed only as isolated, measurable experiments validated across multiple decoder engines and the stress corpus.

## Decoder-aware spatial optimization

A major research direction is to exploit the fact that common binarizers are local and spatially coupled. For jsQR and ZXing HybridBinarizer, the useful mental model is:

```text
raster luminance
  -> hard 8x8 regional statistics
  -> regional black-point estimate
  -> 5x5 neighborhood smoothing on the black-point grid
  -> one threshold per 8x8 region
  -> binary image
  -> perspective grid extraction
  -> module-center sampling
```

This is not a sliding 8x8 convolution on raw pixels, but it *does* create a local receptive field. The optimizer should explore convolutional/differentiable approximations and must randomize the phase of the decoder's 8x8 grid relative to the QR, because a camera crop can place the symbol at arbitrary pixel offsets.

## Edge-field rendering hypothesis

For vector edges, pursue a spatial strategy rather than independent module styling:

- maximize contrast **normal** to a true art edge;
- keep luminance/shape changes **smooth along** the edge;
- avoid unnecessary hard transitions between neighboring cells that belong to the same visual region;
- preserve logical sample centers with the smallest local intervention needed;
- allow interiors to absorb QR texture and deliberate damage before outlines do.

A useful future loss term can combine signed-distance edge fidelity, local-threshold sample margin, and spatial regularization over neighboring luminance/shape parameters.

## Experimental discipline

Every optimization result should record enough state to reproduce it:

- payload/mode/version/ECC/mask;
- pad bytes/free-variable state;
- vector target parameters and placement;
- render parameters;
- deliberate module/codeword damage;
- per-block RS usage;
- decoder versions;
- stress-transform seed/corpus;
- exact pass/fail and decoded payload;
- exported SVG/PNG artifact.

Theoretical RS headroom is not a production-quality success criterion. A symbol is successful when the artwork is good **and** the decoders keep returning the intended payload under realistic perturbation.