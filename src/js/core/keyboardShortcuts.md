# keyboardShortcuts.js

Global shortcuts, set up by `initKeyboardShortcuts(project)`. They're ignored while a form field is focused, and with Alt held.

| Key | Action |
|---|---|
| Space | Play/pause |
| Ctrl/Cmd+Z | Undo ([history.js](./history.md)) |
| Ctrl/Cmd+Shift+Z, Ctrl/Cmd+Y | Redo |
| Ctrl/Cmd+D | Duplicate selected block |
| Ctrl/Cmd+C / Ctrl/Cmd+X | Copy / cut selected block (only claimed when a block is selected) |
| Ctrl/Cmd+V | Paste the copied block at the playhead on the selected track |
| Delete / Backspace | Delete selected block |
| ↑ / ↓ | Transpose selected block ±1 semitone |
| Shift+↑ / Shift+↓ | Transpose selected block ±1 octave |
| Esc | Deselect block |

Block keys are only claimed (and `preventDefault`ed) when a block is selected, so arrows still scroll the page otherwise. Bare letters are never claimed here, because they're note input ([computerKeyboard.js](../ui/computerKeyboard.md)). Block operations go through [blockActions.js](./blockActions.md).
