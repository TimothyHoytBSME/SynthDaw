# selection.js

UI selection state: `{ trackId, blockId }`. It isn't persisted and isn't undoable. It's stored as **ids**, not object references, because undo/redo/import replace the project's track and block objects wholesale, and ids survive that.

- `getSelectedTrack(project)`: the selected track, falling back to (and adopting) the first track when the id is missing or stale. There's always a live-input target while any track exists.
- `getSelectedBlock(project)`: the selected block (on the selected track) or `null`.
- `selectTrack(id)` (also clears the block), `selectBlock(trackId, blockId)`, `clearBlockSelection()`: each emits `selection:changed` only on a real change.
- `findBlock(project, blockId)` -> `{ track, block }` or `null`.
- `setEditingBlock(id | null)` / `isEditingBlock()`: whether the piano roll is open (set by [timeline.js](../ui/timeline.md)). Not broadcast; [keyboardShortcuts.js](./keyboardShortcuts.md) reads it to keep Delete off the block while its notes are being edited.

Consumers: [audioEngine.js](../audio/audioEngine.md) (routes live input to the selected track), [patchEditor.js](../ui/patchEditor.md), [timeline.js](../ui/timeline.md), and [mixer.js](../ui/mixer.md) (highlights).
