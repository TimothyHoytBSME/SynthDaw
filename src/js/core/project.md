# project.js

The project data model and **the only place project data is mutated**. Shape:

- `Project { tempo, timeSignature: { beatsPerBar }, tracks, master: { volume, effects }, loop: { enabled, startBeat, endBeat } }`
- `Track { id, name, color, blocks, volume, pan, muted, soloed, effects, patch }`, where `patch` is a [patch.js](../audio/patch.md) object (per-track instrument) and `color` is a CSS hex colour (assigned from `TRACK_COLORS` by track index on creation and by `normalizeProject` for older data; `setTrackColor` changes it)
- `Block { id, startBeat, lengthBeats, notes }`
- `Note { id, note (MIDI 0–127), startBeat (relative to its block), lengthBeats, velocity (1–127) }`
- `Effect { id, type, params, bypassed }`

Everything is plain JSON with no audio or DOM references. It's mutated in place because every module holds the same project object.

**Every mutator emits `project:changed`.** That drives autosave ([persistence.js](./persistence.md)), undo ([history.js](./history.md)), the audio-graph sync ([audioEngine.js](../audio/audioEngine.md)) and the transport sync ([transportController.js](./transportController.md)). A new mutator that skips `notifyChanged()` breaks all four. Drag-driven setters use `setIfChanged`, so a `pointermove` that doesn't change the snapped value emits nothing.

Mutators:
- Tracks: `addTrack`, `removeTrack`, `renameTrack`, `setTrackVolume/Pan/Muted/Soloed`, `setTrackPatch`, `setTrackPatchParam(track, "filter.cutoff", v)` (also emits `patch:param-changed { patch, path }` so sounding notes update).
- Blocks: `addBlock`, `removeBlock`, `moveBlock`, `resizeBlock`, `copyBlock(track, block, startBeat)` (a fresh-id copy of any block, attached or detached, e.g. the clipboard), `duplicateBlock` (a `copyBlock` right after the original), `moveBlockToTrack`, and `transposeBlock(block, semitones)`. The transpose is **all-or-nothing**: it returns `false` and changes nothing if any note would leave `LOWEST_NOTE..HIGHEST_NOTE`, because shifting only some notes would silently change intervals.
- Notes: `addNote`, `removeNote`, `moveNote`, `resizeNote`, `setNotePitch`, `setNoteVelocity`.
- Global: `setTempo` (clamped to `MIN_TEMPO..MAX_TEMPO`), `setBeatsPerBar`, `setLoopEnabled`, `setLoopRange`, `setMasterVolume`.
- Effects (`effectsOwner` is a track or `project.master`): `addEffect`, `removeEffect`, `setEffectParam`, `setEffectBypass`, `moveEffect`.

**`playableNotes(project)`** is a generator yielding every note that should sound, in absolute beats (`{ track, note, velocity, startBeat, lengthBeats }`), clipped to its block. A block is a window onto its notes: notes starting at or after its end are skipped and longer ones are cut. The sequencer and WAV export share it.

**Loading outside data:** `normalizeProject` fills missing fields (older saves, hand-edited imports, patches via `normalizePatch`, effect params from `defaultParamsFor`, e.g. the delay's later-added `sync`). `syncIdCounter` advances the id counter past every id present, so new ids never collide. Ids are `prefix-N` from one counter. `replaceProjectContents(target, source)` deep-clones `source` into the existing object (normalizing and syncing ids), which is how New/Import/undo swap content without handing modules a new reference; it emits `project:changed` and then `project:replaced` (see [history.js](./history.md)). `serializeProject`/`parseProject` are the JSON file format.
