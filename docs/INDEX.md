# Document Index

Every markdown file in the project, one line each. Update this whenever a doc is added, moved, or removed. Per-code-file companion docs (a `foo.js` next to `foo.md`) get an entry here too, once they exist, so this index doubles as a low-token map of the codebase.

| File | Description |
|---|---|
| [README.md](../README.md) | Project overview, stack, and links to the other docs. |
| [.agents/CLAUDE.md](../.agents/CLAUDE.md) | Full project spec and the operating rules/qualities all agents follow. |
| [.agents/PLAN.md](../.agents/PLAN.md) | High-level phased roadmap for building the DAW. |
| [.agents/LOG.md](../.agents/LOG.md) | Chronological history of notable actions taken by any agent. |
| [docs/INDEX.md](INDEX.md) | This file. |
| [src/index.md](../src/index.md) | Companion doc for `src/index.html`, the single HTML entry point. |
| [src/css/main.md](../src/css/main.md) | Companion doc for `src/css/main.css`, the global stylesheet. |
| [src/js/main.md](../src/js/main.md) | Companion doc for `src/js/main.js`, the app bootstrap. |
| [src/js/core/eventBus.md](../src/js/core/eventBus.md) | Companion doc for `src/js/core/eventBus.js`, the pub/sub decoupling the model from the UI. |
| [src/js/audio/audioEngine.md](../src/js/audio/audioEngine.md) | Companion doc for `src/js/audio/audioEngine.js`, the `AudioContext`/master-gain owner and note router. |
| [src/js/audio/voice.md](../src/js/audio/voice.md) | Companion doc for `src/js/audio/voice.js`, the multi-oscillator/filter/envelope/LFO voice graph. |
| [src/js/audio/synthEngine.md](../src/js/audio/synthEngine.md) | Companion doc for `src/js/audio/synthEngine.js`, polyphony/voice-stealing manager. |
| [src/js/audio/patch.md](../src/js/audio/patch.md) | Companion doc for `src/js/audio/patch.js`, the JSON synth-patch data model. |
| [src/js/audio/pitch.md](../src/js/audio/pitch.md) | Companion doc for `src/js/audio/pitch.js`, MIDI-note-to-frequency conversion. |
| [src/js/ui/pianoTrigger.md](../src/js/ui/pianoTrigger.md) | Companion doc for `src/js/ui/pianoTrigger.js`, the on-screen/computer-keyboard note input. |
| [src/js/ui/patchEditor.md](../src/js/ui/patchEditor.md) | Companion doc for `src/js/ui/patchEditor.js`, the live patch-parameter editing UI. |
| [src/js/midi/midiInput.md](../src/js/midi/midiInput.md) | Companion doc for `src/js/midi/midiInput.js`, the Web MIDI device/message layer. |
| [src/js/ui/midiStatus.md](../src/js/ui/midiStatus.md) | Companion doc for `src/js/ui/midiStatus.js`, the MIDI connection-status readout. |
| [src/js/core/project.md](../src/js/core/project.md) | Companion doc for `src/js/core/project.js`, the Project/Track/Block data model. |
| [src/js/core/transport.md](../src/js/core/transport.md) | Companion doc for `src/js/core/transport.js`, the audio-accurate play/pause/stop clock. |
| [src/js/core/transportController.md](../src/js/core/transportController.md) | Companion doc for `src/js/core/transportController.js`, wires the transport to the metronome + note sequencer. |
| [src/js/audio/click.md](../src/js/audio/click.md) | Companion doc for `src/js/audio/click.js`, the metronome click sound. |
| [src/js/ui/timeline.md](../src/js/ui/timeline.md) | Companion doc for `src/js/ui/timeline.js`, the timeline/tracks/transport UI. |
| [src/js/ui/pianoRoll.md](../src/js/ui/pianoRoll.md) | Companion doc for `src/js/ui/pianoRoll.js`, the per-block note editor. |
| [src/js/audio/effectChain.md](../src/js/audio/effectChain.md) | Companion doc for `src/js/audio/effectChain.js`, the ordered/bypassable effect-stage router. |
| [src/js/audio/effectTypes.md](../src/js/audio/effectTypes.md) | Companion doc for `src/js/audio/effectTypes.js`, the effect-type registry + UI param metadata. |
| [src/js/audio/effects/delay.md](../src/js/audio/effects/delay.md) | Companion doc for `src/js/audio/effects/delay.js`, feedback delay. |
| [src/js/audio/effects/distortion.md](../src/js/audio/effects/distortion.md) | Companion doc for `src/js/audio/effects/distortion.js`, waveshaper distortion. |
| [src/js/audio/effects/reverb.md](../src/js/audio/effects/reverb.md) | Companion doc for `src/js/audio/effects/reverb.js`, algorithmic (generated-IR) reverb. |
| [src/js/audio/effects/compressor.md](../src/js/audio/effects/compressor.md) | Companion doc for `src/js/audio/effects/compressor.js`, dynamics compressor wrapper. |
| [src/js/audio/effects/chorus.md](../src/js/audio/effects/chorus.md) | Companion doc for `src/js/audio/effects/chorus.js`, modulated-delay chorus. |
| [src/js/audio/effects/eq.md](../src/js/audio/effects/eq.md) | Companion doc for `src/js/audio/effects/eq.js`, fixed 3-band EQ. |
| [src/js/audio/mixer.md](../src/js/audio/mixer.md) | Companion doc for `src/js/audio/mixer.js`, per-track buses + master chain, kept in sync with project data. |
| [src/js/ui/mixer.md](../src/js/ui/mixer.md) | Companion doc for `src/js/ui/mixer.js`, the channel-strip/effects-rack UI. |
| [src/js/core/persistence.md](../src/js/core/persistence.md) | Companion doc for `src/js/core/persistence.js`, IndexedDB save/load + debounced autosave. |
| [src/js/ui/projectControls.md](../src/js/ui/projectControls.md) | Companion doc for `src/js/ui/projectControls.js`, New/Export/Import project controls. |
| [src/js/audio/exportRender.md](../src/js/audio/exportRender.md) | Companion doc for `src/js/audio/exportRender.js`, offline (non-realtime) project rendering. |
| [src/js/audio/wavEncoder.md](../src/js/audio/wavEncoder.md) | Companion doc for `src/js/audio/wavEncoder.js`, `AudioBuffer` → WAV file encoding. |
