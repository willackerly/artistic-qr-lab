# QR Coding Notes

## One global mask

A QR symbol selects exactly one of eight standard masks. The mask is applied to data/ECC module positions, not independently per block or region. The mask ID is encoded in format information.

For a data module:

```text
rendered_bit = unmasked_bit XOR mask_bit(row, col)
```

Uniform raw `00` bytes therefore reveal the mask texture; `FF` bytes reveal its inverse.

## Padding

Several things are colloquially called “padding”:

- terminator bits;
- byte-alignment zeros;
- pad codewords (`0xEC`, `0x11` alternating in standard QR construction);
- remainder bits after the final codeword stream.

Experimental `00` / `FF` pad-byte modes in this lab deliberately diverge from standard pad-codeword construction, but Reed–Solomon parity is recomputed from those experimental data bytes so the RS blocks remain internally self-consistent.

A production encoder should distinguish “decoder happens to accept it” from standards conformance.

## RS block error radius

For an RS block with `r` parity codewords, a conventional decoder can correct up to:

```text
floor(r / 2)
```

unknown bad codewords, assuming no erasure information.

This includes errors in either data or parity bytes. If content bytes are perfect and only parity bytes are physically corrupted, the same `floor(r/2)` unknown-symbol limit applies.

## Why module count is misleading

One modified bit in an 8-bit codeword marks that codeword wrong. Seven additional wrong bits in that *same* codeword do not increase the RS symbol-error count. Therefore an artistic optimizer should reason about codeword clusters, not raw flipped-module count.

## Interleaving and physical spread

QR data codewords are divided into blocks, parity is generated per block, and the data/parity bytes are then interleaved before bits are laid into the standard zig-zag matrix path. As a result, one RS block appears as scattered physical positions, not a rectangular region.

This is good for ordinary localized damage and useful for art because free/pad-derived bytes can be distributed through the symbol. It also means a naive central image can touch many blocks.

## Mask penalties

The standard mask-selection scoring discourages:

- long same-color runs;
- 2×2 same-color blocks;
- finder-like `1:1:3:1:1` structures;
- large dark/light imbalance.

These are encoder scoring rules intended to improve readability, not a “nearest valid pattern” code that a decoder corrects. An artistic encoder may choose a non-minimal mask score, but should retain strong penalties for structures that interfere with symbol detection.

## What a decoder corrects

A decoder does not infer the closest meaningful text or URL. After detection and unmasking, RS decoding attempts to recover valid codewords from received symbols. If correction succeeds, the payload parser sees corrected bytes. Outside the correction regime, behavior may be failure or miscorrection depending on the implementation and error pattern.
