# main.js

App bootstrap. Initializes the audio engine, renders the piano-trigger, MIDI-status, patch-editor, and timeline UI, and kicks off `initMIDIInput()`, once the DOM is ready. Also owns the one `Project` instance for now (created here with a single default track) and hands it to `transportController.js` via `setProject()` so playback can find the tracks/blocks/notes to schedule — once there's a project-management UI (new/load/save), that ownership moves out of this file. Keep this file thin otherwise — it should only wire modules together, never contain audio or UI logic itself.
