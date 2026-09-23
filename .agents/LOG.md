# Agent Action Log

Chronological history of notable actions taken by any agent in this project. Append an entry (don't edit past ones) whenever you complete a notable action: a scoped task, a meaningful decision, a git checkpoint, etc. Newest entry at the bottom.

## Format

```
### YYYY-MM-DD — Short Title
- Agent/Model: <model name>
- What: <what was done>
- Why: <motivation/context, if non-obvious>
- Commit(s): <hash or "n/a">
```

## Entries

### 2026-09-22 — Initial project scaffolding
- Agent/Model: Claude Sonnet 5
- What: Initialized the git repo; added `.gitignore`, `README.md`, `docs/INDEX.md`, `.agents/LOG.md`, and `.agents/PLAN.md`. No app code written yet.
- Why: Project rules require an LLM-friendly doc index, a git repo, and a plan file before any real feature work begins.
- Commit(s): c9da231

### 2026-09-22 — Plan review
- Agent/Model: Claude Sonnet 5
- What: Reviewed `.agents/PLAN.md` for clarity/completeness; added an "Architecture decisions" section (folder layout, event-bus state/UI-sync pattern, dev-serving note, testing approach) and a "Non-goals / open questions" section (sample recording/import, collaboration, native packaging, hosting all deferred).
- Why: Requested full review before execution; several foundational choices (folder layout, state-sync pattern) were previously undecided and would have caused churn later.
- Commit(s): dc6d678

### 2026-09-22 — Phase 1: skeleton app & audio foundation
- Agent/Model: Claude Sonnet 5
- What: Built `src/` (index.html, css/main.css, js/core/eventBus.js, js/audio/{audioEngine,voice}.js, js/ui/pianoTrigger.js, js/main.js) with companion `.md` files for each; added `.claude/launch.json` (Python static server) for local dev preview. Verified in-browser: `AudioContext` reaches `running` state and produces a routed oscillator voice on note-on, pointer/touch and computer-keyboard input both trigger notes, and the piano layout wraps correctly at mobile width.
- Why: First scoped implementation task per Phase 1 of the plan — proves the audio graph and the event-bus UI/model split end-to-end before building the real synth engine.
- Commit(s): fb56fd1

### 2026-09-22 — Phase 2: MIDI input
- Agent/Model: Claude Sonnet 5
- What: Added `js/midi/midiInput.js` (Web MIDI device enumeration, hot-plug via `onstatechange`, message parsing for note on/off, CC, pitch bend) and `js/ui/midiStatus.js` (connection status readout). Extended the piano-trigger's `note:on`/`note:off` payloads with `velocity`/`source` to match MIDI's shape. Verified in-browser: on the sandboxed preview, `requestMIDIAccess` is permission-denied and the app correctly falls back to an "unavailable" status instead of erroring; UI note input still works unaffected.
- Why: Second scoped task per the plan — unifies hardware MIDI and on-screen/keyboard input behind one event contract before the real synth engine consumes it.
- Commit(s): 5d0cde6

### 2026-09-22 — Phase 3: synth engine core
- Agent/Model: Claude Sonnet 5
- What: Added `js/audio/pitch.js` (note→Hz), `js/audio/patch.js` (JSON patch model), `js/audio/synthEngine.js` (8-voice polyphony + oldest-voice stealing + retrigger), rewrote `js/audio/voice.js` (2 oscillators, shared biquad filter, amp + filter ADSR, optional LFO to pitch or filter), and `js/ui/patchEditor.js` (config-driven live controls for all 21 patch parameters). Deviated from the plan on two points, documented in `patch.md` and `PLAN.md`: standard oscillator waveforms only (no custom/wavetable yet — no consumer for it), and one fixed-route LFO instead of a generic mod matrix (only one mod source exists so far).
- Verified in-browser: patch-editor renders all fields at the correct defaults; a note-on creates exactly the expected node graph (2 oscillators + 1 filter + 3 gains with LFO off, +1 oscillator +1 gain once LFO depth > 0 and the change came from a live slider edit — proving `setPatch` reaches the engine); 9 simultaneous notes against an 8-voice cap steal cleanly with no errors. Hit and fixed a dev-server caching gotcha (documented in `PLAN.md`'s "Dev serving" note) where the preview kept serving a stale module after a server restart on the same port.
- Why: Third scoped task per the plan — this is the last piece needed before the synth is a "real" instrument; everything from here (timeline, piano roll, effects) plays notes through this engine.
- Commit(s): d921e08

### 2026-09-22 — Phase 4: timeline, tracks & transport
- Agent/Model: Claude Sonnet 5
- What: Added `js/core/project.js` (Project/Track/Block data model), `js/core/transport.js` (audio-clock-driven play/pause/stop with lookahead click scheduling), `js/core/transportController.js` + `js/audio/click.js` (metronome), and `js/ui/timeline.js` (transport bar, add-track, click-to-add/drag-to-move/drag-to-resize blocks, horizontal + vertical zoom, playhead). Exposed `ensureAudioContext()`/`getMasterGain()` from `audioEngine.js` so the transport can share the one `AudioContext`. Documented three scope deviations in `PLAN.md`/companion docs: blocks are silent time-regions with no note content yet (Phase 5 adds that), transport record is unimplemented (nothing to record until then), and zoom stops at the beat level (no per-sample waveform rendering without audio content).
- Verified in-browser: add-track/add-block/move/resize/remove all confirmed via direct DOM + pointer-event checks (two synthetic-`pointerId` false negatives were traced to the test harness, not the app — real device pointer IDs work); Play/Pause/Stop and tempo/metronome all confirmed against the actual `AudioContext` clock (position advanced correctly over real elapsed time, metronome oscillators fired at the expected rate, Stop reset to 0). One real limitation found and fixed along the way: the headless preview pane never fires `requestAnimationFrame` (confirmed independently of app code — 2s with zero callbacks), so the playhead's rAF loop alone wouldn't visibly update in this environment; added a `syncPlayhead()` call directly in each transport/zoom control's own handler so the playhead is also correct synchronously, not just via the rAF loop. This is a genuine UX improvement (instant feedback on pause/zoom) independent of the testing quirk that surfaced it.
- Why: Fourth scoped task per the plan — this is the DAW's actual timeline/arrangement view and the shared clock everything else (piano roll, looping, automation) will schedule against.
- Commit(s): bf878ae

### 2026-09-22 — Phase 5: piano roll & real playback scheduling
- Agent/Model: Claude Sonnet 5
- What: Gave blocks real content (`notes: []` + `addNote`/`removeNote`/`moveNote`/`resizeNote` in `project.js`) and a note editor (`js/ui/pianoRoll.js`, opened by double-clicking a timeline block), wired via `timeline.js`'s new `openPianoRoll`. Generalized `transport.js`'s scheduler from a metronome-specific `onClick` callback to a generic `onSchedule(windowStart, windowEnd, beatToContextTime)` hook so `transportController.js` can drive both the metronome and a new note sequencer off one shared lookahead window. Added `synthEngine.scheduleNote()`/`audioEngine.scheduleNote()` for pre-scheduled (not live) playback, and fixed a real latent bug this surfaced: `voice.js`'s release used to read `AudioParam.value` synchronously, correct only for live "release now" calls — switched to `cancelAndHoldAtTime` so a release scheduled entirely in the future (as sequenced notes are) computes the right value.
- Verified in-browser end-to-end: added a note via the piano roll (confirmed correct pixel position and pitch, and that placing/dragging it fires a live preview through the normal note:on/off path), then confirmed Play actually schedules it through the real synth — with the metronome silenced, exactly 2 oscillators were created (matching the default patch's 2-oscillator voice) for one placed note, repeatably across two separate play/stop cycles. Also verified note drag-to-resize and remove, and the panel's open/close.
- Deviations documented in `PLAN.md`: no velocity-editing UI yet (notes default to velocity 100), no quantize-grid/scale-overlay controls (quarter-beat snap covers the common case for now), and tracks still share one global patch (no per-track instrument).
- Why: Fifth scoped task per the plan, and the payoff point for everything built in Phases 1–4: this is the first moment pressing Play actually plays back a composed piece rather than just a click track.
- Commit(s): 2ee9d49

### 2026-09-22 — Phase 6: effects & mixing
- Agent/Model: Claude Sonnet 5
- What: Added six effect types (`js/audio/effects/{delay,distortion,reverb,compressor,chorus,eq}.js`) behind a common `{ input, output, setParam, dispose }` interface, a registry (`effectTypes.js`) driving generic UI generation, a bypassable/reorderable `effectChain.js`, and `mixer.js` (per-track gain/pan/effect-chain buses + a master chain, all kept in sync with new `project.js` fields: `Track.{volume,pan,muted,soloed,effects}` and `project.master`). Added a mixer UI (`js/ui/mixer.js`) with channel strips, mute/solo, and a generic effects rack. `synthEngine.scheduleNote()` now accepts a destination override so sequenced notes route through their track's bus; live-played notes still go straight to master (documented deviation).
- Verified in-browser via live connection tracing (monkey-patching `AudioNode.prototype.connect`), not just code review: adding a Delay through the mixer UI produces exactly the expected node graph in the running app; mute was confirmed to actually zero the track bus's `AudioParam` value; a full effects+mute+solo+playback cycle produced no console errors. Caught and fixed a real bug during testing: removing a track never disposed its mixer bus (gain/pan/effect nodes stayed connected) — added a `track:removed` event so `audioEngine.js` cleans it up.
- Deviations documented in `PLAN.md`: no drag-to-reorder effects UI, no send/aux buses (insert effects only), live input still bypasses per-track routing.
- Why: Sixth scoped task per the plan — the DSP/mixing half of "an exhaustive list of abilities to manipulate sounds" from the project concept.
- Commit(s): (pending)
