# keyboardShortcuts.js

Global keyboard shortcuts: **Space** toggles play/pause on the shared [transport](./transportController.md), **Ctrl/Cmd+Z** undoes, **Ctrl/Cmd+Shift+Z** or **Ctrl/Cmd+Y** redoes (via [history.js](./history.md)). Every handler bails out first if `document.activeElement` is an `INPUT`/`SELECT`/`TEXTAREA` — without that check, pressing Space to type a space in a track-name field (once that exists) or adjusting a tempo/loop number input would instead toggle playback, and Ctrl+Z while editing a text field would fight the browser's own native undo for that field.
