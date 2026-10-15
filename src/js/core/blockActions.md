# blockActions.js

Operations on the **selected block** ([selection.js](./selection.md)), shared by the [block toolbar](../ui/blockToolbar.md) and [keyboard shortcuts](./keyboardShortcuts.md):

- `duplicateSelectedBlock`: the copy goes right after the original and becomes the selection.
- `deleteSelectedBlock`
- **Clipboard:** `copySelectedBlock`, `cutSelectedBlock` and `pasteBlock(project)` use a module-level, in-memory deep copy of one block (not the system clipboard; it's lost on reload). Paste goes onto the selected track at the playhead, floored to the beat (`getPositionBeats()`, which never creates the transport), and selects the pasted block. Copy emits `clipboard:changed` and a `status:message`; `hasClipboardBlock()` lets the toolbar show its Paste button.
- `loopSelectedBlock(project)`: sets the loop range to the block's bounds and enables looping (the toolbar's ⟲ Loop).
- `transposeSelectedBlock(project, semitones)` and `transposeSelectedBlockByOctaves(project, octaves)`: these wrap [project.js](./project.md)'s all-or-nothing `transposeBlock`. If any note would leave MIDI 0–127, nothing changes and a `status:message` explains why.

Each successful action emits **`project:blocks-changed`** so views showing block content (timeline, piano roll) redraw. It's a separate event from `project:changed` because views can't simply redraw on every `project:changed`: drags emit that per `pointermove`, and a redraw would destroy the dragged element.
