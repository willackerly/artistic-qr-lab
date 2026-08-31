# Intelligent Repair

## Objective

Given:

- a known-valid baseline QR;
- a target artwork objective;
- a physically edited/stylized candidate;
- a required safety margin;

find the **smallest perceptual change** that returns the QR to the desired integrity / decode regime.

This is not merely “undo edits until it works.” The repair engine should understand codewords, blocks, visual saliency, and eventually decoder behavior.

## V0 algorithm implemented in the page

1. Compare every physically overridden module to the baseline QR.
2. Map changed codeword modules to stream codeword indices.
3. Count unique bad codewords per RS block.
4. Compute the configured target as a fraction of `floor(ECC_codewords / 2)`.
5. For any block above target, calculate a repair cost for each damaged codeword.
6. A codeword is repaired by restoring *all* overridden bits belonging to that codeword.
7. Restore lowest-cost codewords until the block is under target.

If a target image exists, reverting a module that strongly matches a salient target pixel is expensive; reverting non-target/noise edits is cheap.

This simple algorithm already exploits a crucial property: eight modified modules inside one codeword cost one RS symbol error, whereas eight modified modules in eight codewords cost eight.

## V1 — structure and sampling repair

Before reverting logical codeword damage:

- restore function anatomy if styling touched it;
- strengthen module centers without changing logical values;
- darken borderline dark colors;
- lighten borderline light colors;
- reduce shapes that bleed across module boundaries;
- repair quiet-zone intrusions.

This can improve real decoding without spending or reclaiming any RS symbols.

## V2 — valid-variable repair

When a desired artistic module currently costs an RS error, ask whether a free payload/suffix/pad variable can make that module naturally assume the desired value *after a full re-encode*.

Repair priority becomes:

```text
valid variable substitution
    before
visual-only correction
    before
reverting target art
```

This is the key step from “ECC-aware editor” to “coding-aware compositor.”

## V3 — decoder-in-the-loop repair

Treat actual decoder results as an oracle.

Possible search loop:

1. generate candidate;
2. run multiple decoders;
3. render stress variants;
4. measure failure cases;
5. identify modules/codewords disproportionately associated with failure;
6. make the lowest-perceptual-cost repair;
7. repeat.

Because image preprocessing is nonlinear, empirical decoder feedback should eventually override simplistic RS-only predictions.

## Perceptual cost model

Potential terms:

- target binary mismatch;
- grayscale difference;
- edge displacement;
- vector stroke deviation;
- semantic/salient-region weighting;
- local smoothness;
- brand-color deviation.

For a mascot face, eyes and mouth should have much higher preservation weight than low-saliency background texture. For the United globe, preserving sweeping curved bands may matter more than isolated modules.

## Repair status regimes

A useful UI model:

- **Green** — under configured per-block intentional-error budget *and* decoder stress target passes.
- **Yellow** — theoretically correctable or empirically decodable but safety margin is thin.
- **Red** — one or more blocks exceed the correction radius, structural anatomy is damaged, or decoders fail.

“Repair to green” should become a first-class action.

## Caveats

Theoretical RS counts assume that the scanner has already found the symbol and sampled every unedited module correctly. A design using the entire RS radius for intentional art has essentially no room left for real-world sampling errors and is not production-safe.
