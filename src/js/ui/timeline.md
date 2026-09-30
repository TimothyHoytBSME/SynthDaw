# timeline.js

The main arrangement view. `renderTimeline(container, project)` builds, top to bottom:

1. The [transport bar](./transportBar.md).
2. A view bar: "+ Track", horizontal zoom (6–160 px/beat), vertical zoom (40–160px rows) and **Follow playhead** (on by default, kept in the module-level `view`). While the transport runs, `followPlayhead()` (in the rAF playhead loop) page-turns the scroll area when the playhead passes the right edge or is left of the view (seek, loop wrap), putting it 10% into the visible lanes. It never scrolls while stopped, so manual scrolling isn't fought.
3. The [block toolbar](./blockToolbar.md) (selected-block actions, including transpose).
4. The scrolling grid: ruler, track rows, loop overlay, playhead.
5. The piano-roll panel ([pianoRoll.js](./pianoRoll.md)).

It returns a disposer (cancels the rAF loop and unsubscribes).

**Interactions:**
- Track header: click to select the track (live input plays it), double-click the name to rename (input: Enter/blur commits, Esc cancels), "×" to remove (asks first if the track has blocks). Headers are `position: sticky` so they stay visible while scrolling horizontally.
- Lane: click empty space to select the track and deselect the block. **Double-click** to add a one-bar block at the clicked bar. Single click used to add blocks, which made every stray click create one.
- Block: pointerdown selects it. Drag to move (snaps to ¼ beat, or whole beats below 20 px/beat) and drag vertically to move it to another track. The track change is only previewed with `translateY` until release, because re-parenting mid-drag would drop pointer capture. Drag the right edge to resize, and double-click to open the piano roll. Each block shows a miniature of its notes (`renderNotePreview`, positioned in %).
- The playhead polls `transportController.getPositionBeats()`, which never creates the transport/AudioContext. Only a user action does.
- Ruler: click or drag to seek (`transport.seek`). It shows bar numbers plus beat ticks when zoomed in far enough.
- Length grows with content: at least 32 bars, and always 8 bars past the last block/loop end.

**Rendering rules:**
- Structural changes (`renderTracks`/`renderAll`) rebuild the DOM. Selection changes only toggle classes (`highlightSelection`), since selecting happens on a block's pointerdown and a rebuild would destroy the element being dragged.
- After a drag, a rebuild happens only if something actually changed. Rebuilding after a plain click would replace the element between the two clicks of a double-click.
- Listens to `project:blocks-changed` (from [blockActions.js](../core/blockActions.md), or after a drag), which triggers a full redraw plus a piano-roll refresh, and to `block:notes-changed` (from the piano roll), which redraws just that block's preview.
- `view` (zoom) and `pianoRollBlockId` are module-level, so undo/redo/import re-renders keep the zoom and reopen the piano roll on the same block id (closing it if that block is gone). `showPianoRoll` doesn't touch selection, and `openPianoRoll` also selects the block.

**Coupling:** `TRACK_HEADER_WIDTH` (120) must match `.timeline-track-header`'s width in `main.css`. Lane gridlines come from CSS custom properties `--bar-px`/`--beat-px`, set per lane.
