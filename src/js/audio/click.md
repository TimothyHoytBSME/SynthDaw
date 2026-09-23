# click.js

`playClick(audioContext, destination, time, accented)` schedules one short metronome blip (a square-wave burst with an exponential decay) at a precise, caller-supplied `AudioContext` time — it never uses `setTimeout` for the sound itself, only for *deciding* when to call this (see [transport.js](../core/transport.md)). `accented` picks a higher pitch for downbeats.
