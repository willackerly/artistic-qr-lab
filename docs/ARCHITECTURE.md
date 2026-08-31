# Architecture

## Design goal

Separate three layers that ordinary QR styling tools tend to collapse:

1. **Logical QR** — payload, codewords, RS blocks, mask, function modules.
2. **Rendered symbol** — shapes, hue, luminance, module size, texture.
3. **Observed symbol** — what a camera/decoder actually samples after blur, thresholding, perspective, print/screen artifacts, etc.

The eventual optimizer should be able to modify a higher layer without accidentally pretending it changed a lower one.

## Core data model

### `QrModel`

A generated QR should expose:

- version and matrix size;
- mode and payload segments;
- ECC level;
- mask ID;
- baseline dark/light matrix;
- per-module metadata;
- interleaved codeword stream;
- RS block definitions;
- mapping from stream codeword → physical module coordinates;
- mapping from module → stream codeword, block, bit position, and semantic source;
- function/remainder/data/ECC classification.

### `ModuleMeta`

For every matrix coordinate:

```text
row, col
role: function | codeword | remainder
functionType?: finder | timing | alignment | format | version | ...
finalDark
maskApplied
unmaskedBit
streamIndex?
codewordKind?: data | ecc
blockId?
indexInBlock?
bitIndexInCodeword?
source?: payload | terminator | alignment-zero | pad-byte | ecc
```

### `ArtState`

Keep physical changes separate from baseline QR generation:

```text
physicalOverrides: Map<module, dark|light>
targetImage: TargetGrid | null
renderStyle: ...
```

A physical override means “a camera is intended to sample this bit differently from the baseline valid symbol.” It therefore counts against RS integrity if the module belongs to a codeword.

### `TargetGrid`

Target artwork becomes a QR-resolution field rather than an arbitrary bitmap:

```text
dark[row][col]       desired binary appearance
active[row][col]     whether this position participates in the image objective
weight[row][col]     perceptual/saliency importance
color?               future chroma objective
```

Vector inputs should eventually produce multiple fields: occupancy, edge distance, stroke skeleton, saliency, and color target.

## Proposed packages

As the single-file prototype grows, split into:

```text
src/
  qr/
    encode.ts
    matrix.ts
    rs.ts
    masks.ts
    metadata.ts
  art/
    target.ts
    render.ts
    similarity.ts
    overrides.ts
  optimize/
    payload-search.ts
    pad-search.ts
    mask-search.ts
    repair.ts
    solver.ts
  decode/
    native.ts
    zxing.ts
    jsqr.ts
    stress.ts
  ui/
    canvas.ts
    diagnostics.ts
    controls.ts
```

Do not split prematurely; the current standalone page is useful for research because every state transition is inspectable.

## Block-damage accounting

For a fixed generated QR, any physical module override in a codeword changes one bit of that 8-bit RS symbol after unmasking. Damage accounting should therefore be:

```text
module override
    ↓
stream codeword index
    ↓
RS block
    ↓
unique corrupted codewords per block
```

Multiple overridden modules inside the same codeword still cost **one** unknown RS symbol error.

If a block contains `r` ECC codewords, the conventional unknown-error correction radius is:

```text
floor(r / 2) codewords
```

The prototype uses that as a theoretical ceiling, not a guarantee of image-level scan robustness.

## Valid steering vs physical overrides

### Physical override path

```text
valid QR → render → force modules → decoder relies on ECC
```

Advantages:
- direct artistic control;
- trivial to understand;
- excellent experimental tool.

Disadvantages:
- consumes correction margin;
- cannot create arbitrary art safely;
- does not exploit free payload variables.

### Valid steering path

```text
target image
  ↓
choose free variables
  ↓
construct complete data stream
  ↓
recompute RS parity
  ↓
mask and render
  ↓
score image
```

Advantages:
- no RS “damage” for changes incorporated before parity generation;
- payload/suffix/pad search can steer both data and parity geometry;
- likely the core of a production encoder.

The final system should combine both: valid steering first, intentional damage last.

## Decoder harness

Use multiple independent implementations because frontend sampling differs substantially:

- native `BarcodeDetector` where available;
- ZXing / ZXing-C++ WASM;
- jsQR;
- optionally zbar/WASM.

Decoder result schema:

```text
decoder
found/not found
decoded payload
matches expected
corner points / geometry
runtime
```

Then add a stress harness that renders variants under blur, scaling, rotation, perspective, contrast, JPEG-like degradation, color transforms, and print/screen simulation.

## Security / scope

This project operates on ordinary QR encoding and decoding. It should preserve a clear distinction between experimental, non-standard symbol generation and ISO-conforming output. Production export should eventually display an explicit conformance status.
