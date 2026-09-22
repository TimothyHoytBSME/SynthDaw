# pianoTrigger.js

Renders one octave (MIDI notes 60–71) of on-screen piano keys into a given container and wires three input sources — pointer (mouse/touch), and computer-keyboard keys (A W S E D F T G Y H U J) — to the same `note:on`/`note:off` events on the [eventBus](../core/eventBus.md). This is the fallback/testing input ahead of real MIDI-controller support (Phase 2); it intentionally shares the exact event contract hardware MIDI will use, so the audio engine doesn't need to know which input produced a note.

`pressedKeys` guards against OS key-repeat re-firing `note:on`; pointer release is also bound to `pointerleave`/`pointercancel` so a note doesn't hang if the pointer drags off the key or a touch is interrupted.
