# voice.js

`createVoice(audioContext, destination, frequency)` builds one oscillator + gain-envelope pair and returns `{ start(), stop() }`. This is the single-voice building block the real synth engine (Phase 3) will replace/extend with multiple oscillators, filters, and a proper ADSR — for now it's a fixed sawtooth with a fast linear attack/release, just enough to avoid clicks and prove the audio graph.

Each call creates fresh `OscillatorNode`/`GainNode` instances — a voice is single-use (`start()` then `stop()`); it is not reusable after `stop()` because `OscillatorNode.stop()` is terminal per the Web Audio spec.
