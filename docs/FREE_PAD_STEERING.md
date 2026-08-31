# Free Post-Terminator Byte Steering

## Thesis

For an intentionally oversized QR containing a very short fixed URL, the large region after the message terminator is visually valuable capacity.

Standard QR encoding fills the remaining data-codeword capacity with alternating `0xEC / 0x11` pad codewords. For research mode, Artistic QR Lab instead treats those full post-terminator pad bytes as free variables:

```text
fixed URL + terminator + arbitrary free pad bytes
                              ↓
                      recompute RS parity
                              ↓
                          valid RS blocks
```

The arbitrary pad values are non-canonical QR padding and therefore must be treated as an experimental compatibility mode. Crucially, they are changed **before** RS generation: they do not consume deliberate RS error budget.

## Why `00` and `FF` invert so cleanly

For any data/ECC module:

```text
visible_bit = raw_bit XOR global_mask_bit
```

A repeated `0x00` raw pad field exposes the mask texture. `0xFF` exposes its inverse. Arbitrary pad bytes interpolate across an enormous set of RS-consistent spatial patterns.

## RS parity is a steering channel too

Changing one pad bit changes:

- that bit’s own mapped data-module location;
- deterministic parity bytes in its RS block;
- therefore all visible modules corresponding to those changed parity bits.

This is not unwanted collateral—it is additional controllable image structure.

Because Reed–Solomon encoding over GF(256) is linear and the final mask is XOR, **for a fixed version/ECC/layout each free input bit has an exact affine XOR influence field over the final data+ECC matrix**.

That gives us a much better algorithm than repeatedly rebuilding random pad strings.

## Influence-matrix algorithm

For `N` free pad bytes, there are `8N` binary steering variables.

### Precomputation

1. Set every free pad byte to zero.
2. Encode + recompute RS → baseline matrix `Q0`.
3. For each free pad bit `i`:
   - set only bit `i`;
   - re-encode + recompute RS;
   - XOR the resulting matrix with `Q0`;
   - store the changed module indices as influence field `I_i`.

The influence field automatically includes RS parity effects.

### Optimization

For a target art matrix and visual weight map:

1. pick a legal global mask;
2. start from the baseline visible bit vector;
3. evaluate every free-bit influence as a candidate XOR operation;
4. choose the bit with greatest positive weighted visual improvement;
5. apply its influence field;
6. repeat until no positive move remains or the iteration budget is exhausted;
7. rebuild once with the selected final free-byte values;
8. verify exact equivalence with the predicted affine result.

Repeat for all eight masks and take the best result.

V0.2 implements this as a deterministic greedy coordinate hill-climber. Future versions can use simulated annealing, tabu search, beam search, ILP/MaxSAT, or specialized binary optimization.

## Objective: outlines first

A target is not scored uniformly. Each target module receives a weight derived from distance to the vector boundary.

For the smiley benchmark:

```text
outer circle boundary    >>> mouth/eye boundaries >>> filled mouth interior >>> background
```

This means the solver would rather leave random QR texture inside a large black mouth than break the smooth smile perimeter.

## Relationship to deliberate damage

Valid steering should always run first.

```text
fixed URL
  ↓
optimize free post-terminator bytes
  ↓
recompute RS
  ↓
choose best mask
  ↓
scanner-aware sub-module rendering
  ↓
only then choose codewords to intentionally corrupt
```

This cleanly separates:

- **steering**: zero deliberate ECC cost, non-canonical pad semantics;
- **damage**: sampled bits knowingly differ from the RS codeword and consume per-block correction margin.

## Production path

If arbitrary QR pad bytes prove insufficiently interoperable across strict decoders, the same steering machinery can move to **semantically ignored but standards-valid URL bytes**, e.g. a server-consumed suffix/query field. That costs payload capacity but makes every steering byte formally part of the QR message.

The affine influence solver does not care whether a free byte came from experimental padding or from an ignorable URL suffix.
