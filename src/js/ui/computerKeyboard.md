# computerKeyboard.js

Computer keyboard as a note input. Since the on-screen piano was removed (explicit request, Phase 15), this is the instrument when no MIDI device is connected. `initComputerKeyboard(statusElement)` maps the home row like a piano (A=C, W=C#, S=D … J=B, K/O/L continue into the next octave) and uses Z/X to shift the octave (C0–C8). It emits `note:on`/`note:off` with `source: "keyboard"`, which is the same contract as MIDI, so notes play through the selected track ([audioEngine.js](../audio/audioEngine.md)).

- It ignores keys while a form field is focused or any of Ctrl/Cmd/Alt is held. Otherwise typing a track name, or Ctrl+D, would play notes.
- Each held key remembers the note it started, so releasing it after an octave shift still stops the right note.
- `blur` releases every held note, since keyup never arrives if focus leaves mid-press.
- It doesn't claim non-letter keys. Space, arrows and Delete belong to [keyboardShortcuts.js](../core/keyboardShortcuts.md).
