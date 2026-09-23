# transportBar.js

`createTransportBar(project, { onLayoutChange, onTransportAction })` returns `{ element, setPosition(beat), dispose }`. The bar has Play/Pause/Stop, a position readout (`bar.beat`), tempo, beats-per-bar, metronome and loop (enable + start/end in beats). After Stop come **● Rec** (toggles [recorder.js](../core/recorder.md) on the selected track, and turns red while recording) and a **Quantize** checkbox for takes. `dispose()` unsubscribes the recorder listener.

Tempo, beats-per-bar and loop go through [project.js](../core/project.md) mutators, so they're undoable and saved, and [transportController.js](../core/transportController.md) pushes them into the transport. Number fields apply on `change` (commit), not on every keystroke, and are re-displayed with the clamped value. `onLayoutChange` tells [timeline.js](./timeline.md) to redraw (ruler, loop overlay). `onTransportAction` lets it sync the playhead immediately.

`formatPosition(beat, beatsPerBar)` is exported for other views (the block toolbar uses it).
