# patchEditor.js

Minimal live patch-editing UI: a config-driven list (`FIELDS`) of `{ path, label, kind, ... }` descriptors, each rendered as a `<select>` or `<input type="range">` bound via dot-path get/set (`getByPath`/`setByPath`) into a local working copy of the [patch](../audio/patch.md). On every `input` event it clones the working patch and calls `setPatch()`, so changes apply live to the next note played (not retroactively to already-sounding notes — see [synthEngine.js](../audio/synthEngine.md)).

This exists to make every Phase 3 synth parameter audibly verifiable without editing code; it is intentionally not a polished patch browser/preset UI (save/load, patch names, visual knobs) — that's deferred to a later polish pass once there's more than one patch to manage.
