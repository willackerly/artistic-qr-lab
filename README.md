# Artistic QR Lab

A browser-based laboratory for understanding, editing, and eventually *solving for* QR codes that resemble logos, mascots, icons, and other artwork while retaining measurable decode margin.

This repo started from a QR structure navigator and is deliberately becoming something more ambitious: a block-aware artistic QR compositor with real error-budget accounting, decoder-aware rendering, valid-byte steering, and intelligent repair.

> **Project mandate:** pursue the coding, rendering, scanner-modeling, validation, controlled-damage, and repair strategies **together**. Do not optimize one layer in isolation. The end objective is smooth intentional artwork subject to measured multi-decoder robustness.
>
> Start with [`docs/MANDATE.md`](docs/MANDATE.md), then use [`TODO.md`](TODO.md) as the execution checklist. A local/Codex implementation handoff is in [`docs/CODEX_HANDOFF.md`](docs/CODEX_HANDOFF.md).

## Why this exists

Ordinary branded QR generators mostly decorate a valid QR after the fact. Artistic QR Lab treats QR generation as a constrained coding + computer-vision optimization problem.

The core idea is to expose and optimize several distinct degrees of freedom:

- a short fixed semantic payload plus experimental post-terminator free pad bytes;
- QR mode, version, ECC level, and one of the eight global mask patterns;
- standard or experimental pad-byte behavior;
- smooth vector target geometry, signed-distance edge fields, and semantic importance;
- module rendering (shape, luminance, hue, size, sub-module center contracts);
- decoder local-threshold behavior, raster phase, scale, blur, perspective, and color transforms;
- intentional post-encode module overrides, tracked at **Reed–Solomon codeword / block** granularity;
- intelligent repair that restores decoder margin with minimum visual damage;
- target-image similarity, with outlines much more valuable than filled interiors.

The error-correction model matters: Reed–Solomon does not correct “30% of pixels.” QR codewords are assigned to RS blocks, interleaved, and physically scattered through the matrix. One or many flipped bits inside the same 8-bit codeword still represent one bad RS symbol. Each block has its own correction limit.

## Preferred optimization pipeline

```text
short fixed URL
  → free post-terminator byte steering + RS recomputation
  → all-8-mask / version / ECC search
  → vector target fit with outline-first scoring
  → scanner-aware smooth SVG/sub-module rendering
  → multi-decoder + camera/print stress validation
  → deliberate RS-codeword damage only for stubborn visual defects
  → intelligent repair / margin restoration
```

The canonical research benchmark is a large vector smiley over `QRCD.CO/1234`, byte mode, V6/L. The smiley is intentionally simple: exact circles/curves make edge fidelity measurable, and the short URL leaves a large post-terminator design space.

## Current V1 lab

The repository keeps the full single-page prototype in small source chunks so it can be assembled reproducibly. Serve the repo over HTTP and open `index.html`:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/

# optional: build a standalone HTML file
python3 scripts/build_standalone.py
```

The app currently supports:

- QR generation for numeric, alphanumeric, and byte mode;
- versions 1–40 and ECC levels L/M/Q/H;
- explicit selection of all eight QR masks;
- standard `EC/11` pad bytes plus experimental `00`, `FF`, pseudo-random, and optimized arbitrary post-terminator pads;
- overlays for RS blocks, codeword stream, function/data anatomy, and **pad/payload mapping**;
- click-through mapping from payload characters → codewords → RS blocks → physical modules;
- direct module painting / post-encode overrides;
- target image upload and built-in vector smiley target;
- **budget-aware vector smiley auto-fit**: searches legal masks, maximizes face diameter, and spends the fewest high-value RS codewords needed to reach a configurable visual-fit floor without exceeding any block budget;
- semantic art overlay + styled PNG export: target-matching dark modules render near-black while other scanner-dark modules render navy, exploiting human chroma perception without changing the logical matrix;
- **valid free-pad steering**: treats full post-terminator pad bytes as experimental free variables, measures each free bit’s exact data+RS-parity influence field, and hill-climbs all eight masks toward the vector target without deliberate ECC damage;
- **scanner-aware vector rendering**: draws smooth smiley geometry across module boundaries while deterministic light/dark center contracts protect logical sampling;
- **jsQR/ZXing-style threshold surrogate**: models hard 8×8 local black-point regions, 5×5 black-point-neighborhood thresholds, blur, center sampling, and maps predicted sample errors back to RS blocks;
- scanner-aware SVG export for continuous curves instead of stair-stepped module-only art;
- live accounting of changed modules → corrupted codewords → per-block theoretical RS utilization;
- configurable intentional-error budget as a fraction of each block's theoretical correction capacity;
- **Intelligent Repair V0**: greedily restores the least visually expensive damaged codewords until every block is under the selected budget;
- clean PNG export;
- native browser QR decode using `BarcodeDetector` when the browser exposes it.

### Reproduce the repeating “fertile ground” experiment

A particularly revealing configuration is:

- payload: `QRCD.CO/1234`
- mode: byte / UTF-8
- ECC: L
- version: 6
- mask: 5
- pad bytes: all `FF`

With a short payload and a deliberately oversized symbol, much of the data capacity is padding. A uniform raw pad stream passed through a deterministic mask produces conspicuous repeating visual structure. Switching `00` ↔ `FF` inverts that structure almost perfectly because the rendered data bit is effectively `raw XOR mask`.

Use **Pad / payload map** to see where those pad-derived bits actually land. They are not a single clean rectangle: block interleaving and the QR placement zig-zag scatter them through the symbol.

## Important distinction: valid steering vs physical damage

The UI exposes **physical overrides**. A painted module is changed *after* the valid QR was generated, so if the sampled bit changes it consumes RS correction margin.

The preferred pipeline uses **valid steering first**:

1. define the target vector geometry and edge-importance map;
2. keep the useful URL short and fixed;
3. treat full post-terminator pad bytes as experimental free variables;
4. recompute Reed–Solomon parity and score the resulting internally consistent RS matrix against the target;
5. search all eight global masks;
6. use scanner-aware sub-module rendering to protect logical samples while preserving smooth vector edges;
7. validate across binarizer phases/scales and real decoders;
8. spend deliberate RS error budget only as final polish.

That turns excess QR capacity into an image-control channel rather than treating ECC as a paint bucket.

## Decoder-aware spatial rendering

Common open-source QR pipelines provide a particularly interesting local structure. jsQR and ZXing HybridBinarizer use **hard 8×8 raster regions** for local statistics, but each region's final threshold is influenced by a **5×5 neighborhood of regional black-point estimates**. After geometry extraction, both sample near logical module centers.

That creates two simultaneous opportunities/constraints:

- smooth vector ink and sub-module center contracts can exploit center sampling;
- luminance choices are spatially coupled through local threshold neighborhoods, so neighboring cells should not be optimized independently.

The 8×8 grid is anchored to image pixels, not QR modules. Camera crop/scale changes its phase relative to the QR, so robust optimization must sweep/randomize x/y phase and pixels-per-module rather than overfit one convenient alignment. See [`docs/SCANNER_AWARE_RENDERING.md`](docs/SCANNER_AWARE_RENDERING.md).

## Intelligent repair

The current repair pass operates at the correct first-order unit: **corrupted codewords per RS block**.

For any edited QR it:

1. identifies every codeword with at least one post-encode module override;
2. groups bad codewords by RS block;
3. compares each block to the configured safety target;
4. estimates the visual cost of restoring each codeword, using the target image when present;
5. restores the cheapest codewords until each block is back under budget.

This is intentionally conservative and explainable. Future repair stages add real decoder feedback, perceptual saliency, adaptive center contracts, spatial luminance smoothing, and valid-byte steering before reverting artwork.

## Decoder semantics

A QR decoder does **not** choose the semantically “closest URL.” Roughly:

1. locally binarize the camera/raster image;
2. find and geometrically rectify the symbol;
3. sample dark/light modules;
4. recover format/version data and unmask;
5. assemble interleaved codewords;
6. Reed–Solomon-correct each block;
7. parse the corrected payload.

If a block is within its correction radius, it should recover the original RS codeword. Outside that radius, decode may fail or miscorrect. Detection/sampling failures around finders, timing, alignment, format data, quiet zone, blur, glare, etc. are a separate failure class that RS may never get a chance to fix.

## Repository docs

- [`docs/MANDATE.md`](docs/MANDATE.md) — integrated north-star objective and optimization hierarchy
- [`TODO.md`](TODO.md) — prioritized execution checklist
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — data model and proposed subsystem boundaries
- [`docs/ENCODER_PIPELINE.md`](docs/ENCODER_PIPELINE.md) — target-image / valid-steering optimizer pipeline
- [`docs/INTELLIGENT_REPAIR.md`](docs/INTELLIGENT_REPAIR.md) — repair objectives and algorithms
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — implementation milestones
- [`docs/QR_CODING_NOTES.md`](docs/QR_CODING_NOTES.md) — coding-theory notes and invariants
- [`docs/VECTOR_TARGET_SOLVER.md`](docs/VECTOR_TARGET_SOLVER.md) — current smiley solver and objective function
- [`docs/SCANNER_AWARE_RENDERING.md`](docs/SCANNER_AWARE_RENDERING.md) — local-threshold scanner model, sub-module center contracts, SVG/vector rendering, and edge-first scoring
- [`docs/FREE_PAD_STEERING.md`](docs/FREE_PAD_STEERING.md) — affine free-bit influence solver and post-terminator steering model
- [`docs/CODEX_HANDOFF.md`](docs/CODEX_HANDOFF.md) — concrete local/Codex work plan for multi-decoder validation and stress testing

## Status

Research / prototype. Do not infer production scan reliability from theoretical RS margin or the surrogate scanner alone. Any real deployment should be tested across devices, independent decoder libraries, print processes, screens, distance, rotation, blur, low contrast, glare, compression, and raster-phase alignment.

No license has been selected yet.
