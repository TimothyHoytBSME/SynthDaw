# patchEditor.js

The "Instrument" panel: edits the **selected track's** patch ([selection.js](../core/selection.md)). It re-renders when the selected track changes or on `project:tracks-changed`, and `renderPatchEditor(container, project)` returns a disposer.

- Config-driven: `PATCH_SECTIONS` (Oscillator 1/2, Filter, Amp envelope, Filter envelope, LFO, Output) lists each field's `path` into the patch, its range and a formatter. Every slider shows a live value readout (Hz/kHz, ms/s, %, cents).
- `scale: "log"` fields (cutoff, envelope times, LFO rate) map the slider exponentially. Sliders run 0–1000 internally, and `valueFromNormalized`/`normalizedFromValue` convert. `valueFromNormalized` is exported because MIDI CC mapping reuses it (a CC value is just a normalized slider position).
- Every edit calls [project.js](../core/project.md)'s `setTrackPatchParam(track, path, value)`, so edits are saved and undoable (a drag coalesces into one undo step). New notes pick up the change, and already-sounding voices keep their patch.
- The preset dropdown ([presets.js](../audio/presets.md)) replaces the whole patch via `setTrackPatch`.
- `controls` maps `path -> { field, setValue }` so external changes (MIDI learn) can move the matching slider.
