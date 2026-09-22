# main.js

App bootstrap. Initializes the audio engine, renders the piano-trigger, MIDI-status, and patch-editor UI, and kicks off `initMIDIInput()`, once the DOM is ready. Keep this file thin — it should only wire modules together, never contain audio or UI logic itself.
