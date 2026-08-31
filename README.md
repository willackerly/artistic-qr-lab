# Artistic QR Lab

A browser-based laboratory for understanding, editing, and eventually *solving for* QR codes that resemble logos, mascots, icons, and other artwork while retaining measurable decode margin.

This repo started from a QR structure navigator and is deliberately becoming something more ambitious: a block-aware artistic QR compositor with real error-budget accounting and intelligent repair.

## Why this exists

Ordinary branded QR generators mostly decorate a valid QR after the fact. Artistic QR Lab treats QR generation as a constrained coding problem.

The core idea is to expose and optimize several distinct degrees of freedom:

- payload bytes and semantically ignored URL suffix/query bytes;
- QR mode, version, ECC level, and one of the eight global mask patterns;
- standard or experimental pad-byte behavior;
- module rendering (shape, luminance, hue, size);
- intentional post-encode module overrides, tracked at **Reed–Solomon codeword / block** granularity;
- target-image similarity;
- future valid-steering search that changes controllable bytes and recomputes ECC instead of merely consuming ECC margin.

The error-correction model matters: Reed–Solomon does not correct “30% of pixels.” QR codewords are assigned to RS blocks, interleaved, and physically scattered through the matrix. One or many flipped bits inside the same 8-bit codeword still represent one bad RS symbol. Each block has its own correction limit.

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
- standard `EC/11` pad bytes plus experimental `00`, `FF`, and pseudo-random pads;
- overlays for RS blocks, codeword stream, function/data anatomy, and **pad/payload mapping**;
- click-through mapping from payload characters → codewords → RS blocks → physical modules;
- direct module painting / post-encode overrides;
- target image upload (mapped into the central 72% of the QR) and a built-in smiley target;
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

The UI currently exposes **physical overrides**. A painted module is changed *after* the valid QR was generated, so if the sampled bit changes it consumes RS correction margin.

The more powerful roadmap path is **valid steering**:

1. define the target image;
2. choose legal/free variables (URL suffix bytes, mask, version, ECC, possibly experimental pad bytes);
3. regenerate Reed–Solomon parity;
4. score the resulting fully internally consistent QR against the target;
5. search the variable space;
6. spend deliberate RS error budget only as final polish.

That turns excess QR capacity into an image-control channel rather than treating ECC as a paint bucket.

## Intelligent repair

The current repair pass operates at the correct first-order unit: **corrupted codewords per RS block**.

For any edited QR it:

1. identifies every codeword with at least one post-encode module override;
2. groups bad codewords by RS block;
3. compares each block to the configured safety target;
4. estimates the visual cost of restoring each codeword, using the target image when present;
5. restores the cheapest codewords until each block is back under budget.

This is intentionally conservative and explainable. Future repair stages will add decoder feedback, perceptual saliency, and valid-byte steering before reverting artwork.

## Decoder semantics

A QR decoder does **not** choose the semantically “closest URL.” Roughly:

1. find and geometrically rectify the symbol;
2. sample dark/light modules;
3. recover format/version data and unmask;
4. assemble interleaved codewords;
5. Reed–Solomon-correct each block;
6. parse the corrected payload.

If a block is within its correction radius, it should recover the original RS codeword. Outside that radius, decode may fail or (less desirably) miscorrect. Detection/sampling failures around finders, timing, alignment, format data, quiet zone, blur, glare, etc. are a separate failure class that RS may never get a chance to fix.

## Repository docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — data model and proposed subsystem boundaries
- [`docs/ENCODER_PIPELINE.md`](docs/ENCODER_PIPELINE.md) — target-image / valid-steering optimizer pipeline
- [`docs/INTELLIGENT_REPAIR.md`](docs/INTELLIGENT_REPAIR.md) — repair objectives and algorithms
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — implementation milestones
- [`docs/QR_CODING_NOTES.md`](docs/QR_CODING_NOTES.md) — coding-theory notes and invariants

## Status

Research / prototype. Do not infer production scan reliability from theoretical RS margin alone. Any real deployment should be tested across devices, decoders, print processes, screens, distance, rotation, blur, low contrast, glare, and compression.

No license has been selected yet.
