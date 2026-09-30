# patchEditor.js

The "Instrument" panel: edits the **selected track's** patch ([selection.js](../core/selection.md)). It re-renders when the selected track changes or on `project:tracks-changed`, and `renderPatchEditor(container, project)` returns a disposer.

- Config-driven: `PATCH_SECTIONS` (Oscillator 1/2, Filter, Amp envelope, Filter envelope, Pitch envelope, LFO, Output) lists each field's `path` into the patch, its range and a formatter. Every slider shows a live value readout (Hz/kHz, ms/s, %, cents). Each field is two rows: the label, readout and learn button on top, and a full-width slider below (on one row, the slider was squeezed to ~7px and couldn't be dragged).
- `scale: "log"` fields (cutoff, envelope times, LFO rate) map the slider exponentially. Sliders run 0–1000 internally, and `valueFromNormalized`/`normalizedFromValue` convert. `valueFromNormalized` is exported because MIDI CC mapping reuses it (a CC value is just a normalized slider position).
- Every edit calls [project.js](../core/project.md)'s `setTrackPatchParam(track, path, value)`, so edits are saved and undoable (a drag coalesces into one undo step). Sounding notes follow most edits live (see [voice.md](../audio/voice.md)); loading a preset applies from the next note.
- The preset dropdown ([presets.js](../audio/presets.md)) replaces the whole patch via `setTrackPatch`.
- **MIDI learn:** every slider has a small learn button (`MIDI` → `…` while waiting → `CC21` once mapped; clicking while waiting cancels and unmaps). `midimap:control` events ([midiMap.js](../midi/midiMap.md)) are applied to the selected track's patch via the field's own scaling, and `controls` (`path -> { field, setValue }`) moves the matching slider.
