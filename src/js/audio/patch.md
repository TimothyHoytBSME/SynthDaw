# patch.js

The plain-JSON synth patch model: 2 oscillators (`type` ∈ sine/sawtooth/square/triangle/noise, `octave` −3…+3, `detune` in cents, `mix`), a filter (`type`, `cutoff`, `resonance`, `envAmount`), amp and filter ADSR envelopes, a pitch envelope (`amount` in semitones, 0 = off; `decay` in seconds), one LFO (`rate`, `depth`, `target` ∈ pitch/filter/amp) and an output `gain`. There's no UI or audio code here. [voice.js](./voice.md) turns a patch into nodes.

Since Phase 14, every [Track](../core/project.md) owns a `patch` (persisted, undoable, exported). The `OSC_TYPES`/`FILTER_TYPES`/`LFO_TARGETS` option lists live here so the editor and presets share them.

**`lfo.depth` is normalized 0–1**, and voice.js scales it per target: pitch → up to 100 cents, filter → up to 4 kHz, amp → up to 50% tremolo. The old design used one raw 0–50 range for both "cents" and "Hz", which made the filter target inaudible.

`normalizePatch(patch)` deep-merges a partial or older patch over the defaults (missing fields → default, unknown fields dropped). [project.js](../core/project.md)'s `normalizeProject` and the [presets](./presets.md) both use it. The design is still one fixed LFO, not a generic mod matrix (see the PLAN backlog).
