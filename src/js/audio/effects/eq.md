# eq.js

Fixed 3-band EQ: `lowshelf` @ 320Hz → `peaking` @ 1kHz (Q 0.7) → `highshelf` @ 3.2kHz, in series, each with an independent `±15dB` gain param (`low`/`mid`/`high`). No dry/wet mix — an EQ is normally applied at full effect, not blended. Frequencies/Q are fixed (not user-adjustable) to keep the control surface simple; a fully parametric EQ (adjustable band frequency/Q/count) is a reasonable future extension if the fixed bands prove limiting. Same `{ input, output, setParam, dispose }` shape as the rest of `effects/` — see [effectChain.md](../effectChain.md).
