# pianoTrigger.js

Renders one octave (MIDI notes 60–71) of on-screen piano keys into a given container and wires two input sources — pointer (mouse/touch) and computer-keyboard keys (A W S E D F T G Y H U J) — to the same `note:on`/`note:off` events on the [eventBus](../core/eventBus.md), now matching [midiInput.js](../midi/midiInput.md)'s payload shape (`{ note, velocity, source }`) so the audio engine treats UI and hardware MIDI identically.

`pressedKeys` guards against OS key-repeat re-firing `note:on`; pointer release is also bound to `pointerleave`/`pointercancel` so a note doesn't hang if the pointer drags off the key or a touch is interrupted.
