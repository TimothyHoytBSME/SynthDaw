# patch.js

The synth patch data model — plain JSON, no Web Audio objects, so it can be saved/loaded/serialized independently of any audio graph (per the plan's Phase 3 goal). Shape: two `oscillators` (`type`, `detune` in cents, `mix` 0–1), one `filter` (`type`, `cutoff` Hz, `resonance`/Q, `envAmount` Hz added at envelope peak), `ampEnvelope`/`filterEnvelope` (standard ADSR, `attack`/`decay`/`release` in seconds, `sustain` 0–1), one `lfo` (`rate` Hz, `depth`, `target`: `"pitch"` or `"filter"`), and an overall `gain`.

`clonePatch()` is a deep copy via JSON round-trip — safe because the patch is plain JSON by design; don't put functions or non-serializable values into a patch object. `serializePatch`/`parsePatch` are thin JSON wrappers kept here so callers don't need to know the patch happens to be JSON-shaped.

**Simplification note:** the plan originally described a "routable mod matrix"; this implementation ships one fixed LFO with a two-way target switch instead of a fully generic source→destination matrix, since there's currently only one modulation source (the LFO) and building generic routing for it would be premature abstraction. Revisit if/when more mod sources (e.g. a second LFO, envelope-as-modulator) are added.
