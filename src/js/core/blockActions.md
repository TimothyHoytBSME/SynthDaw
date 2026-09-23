# blockActions.js

Operations on the **selected block** ([selection.js](./selection.md)), shared by the [block toolbar](../ui/blockToolbar.md) and [keyboard shortcuts](./keyboardShortcuts.md):

- `duplicateSelectedBlock`: the copy goes right after the original and becomes the selection.
- `deleteSelectedBlock`
- `transposeSelectedBlock(project, semitones)` and `transposeSelectedBlockByOctaves(project, octaves)`: these wrap [project.js](./project.md)'s all-or-nothing `transposeBlock`. If any note would leave MIDI 0–127, nothing changes and a `status:message` explains why.

Each successful action emits **`project:blocks-changed`** so views showing block content (timeline, piano roll) redraw. It's a separate event from `project:changed` because views can't simply redraw on every `project:changed`: drags emit that per `pointermove`, and a redraw would destroy the dragged element.
