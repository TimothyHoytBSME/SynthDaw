# history.js

Snapshot-based undo/redo on top of the plain-JSON [project](./project.md) model. Each undo step is a full project clone, restored with `replaceProjectContents`. There are no per-action command objects.

**Coalescing:** `project:changed` fires on every mutator call, including once per `pointermove` during a drag. The first change in a burst pushes `lastSnapshot` (the state after the previous burst) onto the undo stack. Later changes just reset a 500ms debounce, and `lastSnapshot` advances only once things go quiet. So one drag is one undo step. A wholesale replacement (New, Import, Load Demo) emits `project:replaced`, which settles the burst at once, so an edit made right after loading a demo is its own undo step rather than merged with the load.

**Re-entrancy guard:** `restore()`'s `replaceProjectContents` emits `project:changed` too. That's needed so autosave, the mixer sync and the transport sync all react, but `isRestoring` stops this module from recording its own restore as a new edit.

`initHistory(project, onRestore)`: `onRestore` is [main.js](../main.md)'s `renderProjectUI`, because a restore can change anything. Audio needs no special handling, since the mixer reconciles from the project on the same `project:changed` ([audioEngine.js](../audio/audioEngine.md)).
