# index.html

The single HTML page. It loads `css/main.css` and the `js/main.js` module. It contains only empty mount points that UI modules fill at runtime:
- In the header: a how-to subtitle, `#keyboard-status` ([computerKeyboard.js](js/ui/computerKeyboard.md)), `#midi-status` ([midiStatus.js](js/ui/midiStatus.md)), a "Build:" line whose `#app-version` reads `dev` locally and the deployed commit's short hash on GitHub Pages (stamped by [pages.yml](../.github/workflows/pages.md)) and `#project-controls` ([projectControls.js](js/ui/projectControls.md)).
- In `<main>`: `#timeline` ([timeline.js](js/ui/timeline.md)), `#patch-editor` ([patchEditor.js](js/ui/patchEditor.md), the selected track's instrument) and `#mixer` ([mixer.js](js/ui/mixer.md)).

Don't hardcode other markup here. New views get their own UI module. The on-screen piano was removed in Phase 15 (on request). Live note input is MIDI or the computer keyboard.
