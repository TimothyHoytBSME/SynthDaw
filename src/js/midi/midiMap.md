# midiMap.js

MIDI learn: maps controller CC numbers to named targets (currently `patch:<path>`, e.g. `patch:filter.cutoff`). `initMIDIMap()` loads mappings and subscribes to `midi:cc` from [midiInput.js](./midiInput.md).

- `startLearning(target)`: the next CC received is mapped to `target`, replacing any earlier CC for it. `cancelLearning()` and `clearMapping(target)` undo that. `getLearnTarget()`/`getMappedController(target)` feed the UI.
- A mapped CC emits `midimap:control { target, normalized }` (value/127). The owning view turns that into a real value. [patchEditor.js](../ui/patchEditor.md) uses the slider's own scaling (`valueFromNormalized`, so log-scaled fields stay log) and applies it to the **selected track**, so one knob controls whichever track you're playing.
- `midimap:changed` fires on any learn-state/mapping change, so learn buttons can refresh.

Mappings describe the user's hardware, not a song, so they persist in `localStorage` (`synthdaw.midiMap`), not in the project/export. Storage failures are tolerated (session-only mappings). Mappings are channel-agnostic.
