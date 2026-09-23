# presets.js

Built-in starting-point patches (Init, Saw Lead, Soft Pad, Pluck, Sub Bass, Keys). Each preset is stored only as its *differences* from the default patch, and `createPresetPatch(name)` expands it with [patch.js](./patch.md)'s `normalizePatch`, so adding a patch field never requires touching every preset. `PRESET_NAMES` drives the dropdown in [patchEditor.js](../ui/patchEditor.md). Loading a preset replaces the selected track's patch via `setTrackPatch` (undoable).
