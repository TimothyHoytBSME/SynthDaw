# SynthDaw — Development Plan

High-level phased roadmap. Each phase should be broken into scoped tasks (and git commits) at implementation time — this file stays high-level. Update the "Status" line as phases start/finish, and log notable milestones in [LOG.md](LOG.md).

**Status: Phase 0 complete. Phase 1 not started.**

## Guiding constraints (from CLAUDE.md)

- Vanilla HTML/JS/CSS — no framework. ES modules, no required build step.
- Chrome on Windows/Linux, ideally Android too. Fully responsive, mouse/touch first.
- Web MIDI API support for real controllers (keys, sliders, buttons).
- Every code file gets a partner `.md` file; [docs/INDEX.md](../docs/INDEX.md) stays current.

## Phase 0 — Project Scaffolding (this session)

- [x] Git repo initialized.
- [x] `.gitignore`, `README.md`.
- [x] Doc-index convention established (`docs/INDEX.md`).
- [x] `.agents/LOG.md` and this plan file created.
- [ ] First commit checkpoint.

## Phase 1 — Skeleton App & Audio Foundation

- Minimal `index.html` + `css/` + `js/` (ES modules) folder skeleton, served via any static file server.
- Web Audio API bootstrap: single `AudioContext`, master gain/output node, resume-on-user-gesture handling (autoplay policy).
- One playable oscillator voice wired to an on-screen trigger, to prove the audio graph works end-to-end.
- Companion `.md` file per code file from this point forward.

## Phase 2 — MIDI Input

- Web MIDI API device enumeration and hot-plug handling.
- Map Note On/Off, velocity, pitch bend, CC (sliders/knobs/buttons) to internal event objects.
- On-screen virtual piano keyboard as a fallback input, sharing the same event pipeline as hardware MIDI.

## Phase 3 — Synth Engine Core

- Voice architecture: polyphony/voice allocation, note stealing.
- Oscillator stage: waveform types (sine/saw/square/triangle + custom/wavetable), detune, multiple oscillators per voice.
- Modulation: ADSR envelopes, LFOs, filter (at least lowpass/highpass/bandpass), routable mod matrix.
- Patch/preset data model (serializable to JSON) independent of the UI.

## Phase 4 — Timeline, Tracks & Transport

- Project data model: Project → Tracks → Blocks/Clips, tempo map, time signature.
- Transport controls: play/pause/stop/record, playhead, tempo & time-signature editing, click/metronome.
- Timeline UI: track lanes, block placement/move/resize, horizontal zoom (bars → beats → samples/waveform) and vertical zoom (track height).
- Timing engine decoupled from UI rendering (audio-accurate scheduling, not `setInterval` drift).

## Phase 5 — Piano Roll & MIDI Editing

- Note editing view bound to a block: add/move/resize/delete notes, velocity editing.
- Quantization, scale/chord helper overlays.
- Bidirectional sync between piano roll and the synth engine's live preview.

## Phase 6 — Effects & Mixing

- Per-track and master effect chains (reverb, delay, distortion/saturation, EQ, compression, chorus, etc.) built on Web Audio nodes.
- Effect chain UI: add/remove/reorder, per-effect parameter controls, bypass.
- Mixer view: per-track volume/pan/mute/solo, sends.

## Phase 7 — Waveform Editing & Automation

- Zoomed-in waveform view for audio blocks (if/when audio recording or sample import is supported) — cut/trim/fade/normalize/gain.
- Automation lanes for arbitrary parameters (synth params, effect params, volume/pan) over time, with curve editing.

## Phase 8 — Looping & Arrangement

- Loop region definition and playback looping.
- Punch in/out recording.
- Section markers and arrangement-level view (blocks collapsed to bar-level, per the zoom-out requirement).

## Phase 9 — Persistence & Export

- Save/load project state (IndexedDB primary, JSON export/import for portability).
- Offline render/export to audio file (e.g., WAV) via `OfflineAudioContext`.

## Phase 10 — Responsive & Touch Polish

- Responsive layout pass for narrow/touch viewports (phone/tablet/Android Chrome).
- Touch gesture support: pinch-zoom timeline, drag blocks/notes, on-screen knobs/sliders usable by touch.
- Verify MIDI controller input still works alongside touch on Android where Web MIDI is supported.

## Phase 11 — Cross-Platform Validation & Performance

- Manual test pass on Chrome/Windows, Chrome/Linux, Chrome/Android.
- Audio performance profiling (voice count ceilings, glitch/underrun checks under load).
- Accessibility pass (keyboard navigation where feasible, contrast, touch target sizing).

## Phase 12 — Polish & Quality-of-Life

- Undo/redo across editing actions.
- Keyboard shortcuts for transport/editing.
- Theming, onboarding/first-run guidance.

## Ongoing, every phase

- Keep [docs/INDEX.md](../docs/INDEX.md) and per-file companion docs current.
- Log notable milestones/decisions in [LOG.md](LOG.md).
- Commit at scoped checkpoints, not once per phase.
