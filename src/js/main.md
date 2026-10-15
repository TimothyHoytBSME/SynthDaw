# main.js

App bootstrap (`async`, because it loads the autosaved project from IndexedDB first via [persistence.js](./core/persistence.md)). It only wires modules together and should never contain audio or UI logic.

Order: audio engine and input devices ([computerKeyboard.js](./ui/computerKeyboard.md), MIDI) → load (normalize + `syncIdCounter`) or create the project → `attachProject` ([audioEngine.js](./audio/audioEngine.md)), `initTransportController` + `setProject` ([transportController.js](./core/transportController.md)) so audio and transport follow the model → render the views → project controls, autosave, history, keyboard shortcuts.

`renderProjectUI()` renders the timeline, the instrument (patch) editor and the mixer. Each returns a disposer, and the previous ones are called before re-rendering, so listeners and rAF loops never stack. The page's scroll position is saved and restored around the rebuild (each view keeps its own inner scroll). It runs at startup and whenever the project is replaced wholesale (New, Import, undo/redo). It's passed as a callback to [projectControls.js](./ui/projectControls.md) and [history.js](./core/history.md).

`window.synthDaw = { project }` is a console debug/verification handle. Nothing in the app reads it.
