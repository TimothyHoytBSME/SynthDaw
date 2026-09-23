# blockToolbar.js

`createBlockToolbar(project, { onEditNotes })` returns `{ element, dispose }`. It's a row under the timeline's view bar.

- **Nothing selected:** a short how-to hint. The row keeps its height, so the timeline never jumps.
- **Block selected:** a label (track · position · note count) and the actions ✎ Edit notes (the touch-friendly alternative to double-click), ⧉ Duplicate, **Transpose ▼ Oct [X] ▲ Oct** (by X octaves, X = 1–10), −1/+1 semitone, and 🗑 Delete. Every action goes through [blockActions.js](../core/blockActions.md), shared with keyboard shortcuts.
- A message area shows `status:message` events for 4s, e.g. why a transpose was refused (some note would leave MIDI 0–127).

It refreshes on `selection:changed` and `project:changed` (text only, cheap).
