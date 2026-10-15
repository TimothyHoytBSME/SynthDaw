# keyboardShortcuts.js

Global shortcuts, set up by `initKeyboardShortcuts(project)`. They're ignored while a form field is focused, and with Alt held.

| Key | Action |
|---|---|
| Space | Play/pause |
| Ctrl/Cmd+Z | Undo ([history.js](./history.md)) |
| Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y | Redo |
| Ctrl/Cmd+D | Duplicate selected block (only claimed when a block is selected and no piano roll is open) |
| Ctrl/Cmd+S | Export JSON (via a `shortcut:export-json` event that [projectControls.js](../ui/projectControls.md) handles), instead of the browser's Save Page |
| Home | Seek to the start |

**Piano roll first:** while a block is being edited (`isEditingBlock()`), every key is first offered to the open roll as a `pianoroll:key` request (`{ key, shiftKey, ctrlKey, metaKey, handled }` on the bus); if [pianoRoll.js](../ui/pianoRoll.md) marks it handled (note selection: Delete, arrows, Esc, Ctrl+A/C/X/V/D), the default is prevented and nothing else runs. Otherwise the key falls through to the table above, except that Delete, Backspace and the arrows never reach the block while a roll is open.
| Ctrl/Cmd+C / Ctrl/Cmd+X | Copy / cut selected block (only claimed when a block is selected) |
| Ctrl/Cmd+V | Paste the copied block at the playhead on the selected track |
| Delete / Backspace | Delete selected block. Not while the piano roll is open (`isEditingBlock()` in [selection.js](./selection.md)): there the key belongs to the note selection |
| ↑ / ↓ | Transpose selected block ±1 semitone |
| Shift+↑ / Shift+↓ | Transpose selected block ±1 octave |
| Esc | Deselect block |

Block keys are only claimed (and `preventDefault`ed) when a block is selected, so arrows still scroll the page otherwise. Bare letters are never claimed here, because they're note input ([computerKeyboard.js](../ui/computerKeyboard.md)). Block operations go through [blockActions.js](./blockActions.md).
