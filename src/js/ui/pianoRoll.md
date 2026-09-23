# pianoRoll.js

Note editor for one [block](../core/project.md): `renderPianoRoll(container, block, { beatsPerBar })`. [timeline.js](./timeline.md) opens it in a panel below the arrangement.

**Layout:** a toolbar (zoom 20–240 px/beat, snap 1 … 1/16 beat, a how-to hint), then a scroll area with a sticky key column (the full MIDI range, 0–127, as 20px rows) beside the grid, then a velocity lane whose horizontal scroll is kept in sync with the grid. Grid lines and black-key row shading are CSS gradients built in JS: bar, beat and row lines plus a 12-row stripe period aligned to `HIGHEST_NOTE`. There are no per-row elements.

**Interactions:**
- Click empty grid: add a note at the snapped beat, using the last placed/resized length (clamped to the block end) and velocity 100. It's previewed audibly.
- Drag a note: moves it in time *and* pitch, and each new pitch is previewed. Starts are clamped so the note stays inside the block.
- Drag the right edge: resize (clamped to the block end), which also becomes the default length for new notes.
- Double-click or right-click a note: delete. There's no inline "×" button, since notes are often too small for one.
- Velocity lane: drag a note's bar vertically. Note opacity reflects velocity. Chords starting together overlap there, so only the top bar is reachable. Proper per-note selection is in the backlog.
- Press a key in the key column to hear that pitch (held until release). This replaces the removed on-screen piano's "audition a note" role. Previews go through the normal `note:on`/`note:off` path, so they play the selected track's instrument.

**Rendering:** add/delete does a full re-render into the same container, preserving scroll. A *fresh* container (opening a block, or the timeline refreshing after a transpose) centres the view on the block's notes (or C4 if empty), so transposed notes never end up off-screen. Drags update elements in place. Edits emit `block:notes-changed { blockId }` so the timeline redraws that block's miniature. Notes past the block's end (after the block was shrunk) are drawn under a dashed, shaded "outside" region: kept, but not played (see `playableNotes`).

`settings` (zoom, snap, last length) is module-level, so it persists across re-renders and between blocks. `ROW_HEIGHT` (20) must match `.piano-roll-key`'s height in `main.css`.
