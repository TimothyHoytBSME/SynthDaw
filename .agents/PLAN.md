# SynthDaw — Development Plan

High-level phased roadmap. Each phase should be broken into scoped tasks (and git commits) at implementation time — this file stays high-level. Update the "Status" line as phases start/finish, and log notable milestones in [LOG.md](LOG.md).

**Status: Phases 0–6 complete. Phase 7 not started.**

## Guiding constraints (from CLAUDE.md)

- Vanilla HTML/JS/CSS — no framework. ES modules, no required build step.
- Chrome on Windows/Linux, ideally Android too. Fully responsive, mouse/touch first.
- Web MIDI API support for real controllers (keys, sliders, buttons).
- Every code file gets a partner `.md` file; [docs/INDEX.md](../docs/INDEX.md) stays current.

## Architecture decisions

Settled up front so later phases don't churn on foundational choices:

- **Folder layout:**
  ```
  src/
    index.html
    css/            styles, one file per major UI area
    js/
      core/         project data model, transport/clock, event bus
      audio/        Web Audio graph, synth engine, effects
      midi/         Web MIDI input, event mapping
      ui/           DOM rendering/controllers per view (timeline, piano roll, mixer, etc.)
    assets/         icons, fonts, static files
  ```
  Each `.js` file gets a sibling `.md` (e.g. `js/audio/voice.js` + `js/audio/voice.md`).
- **State/UI sync:** a small hand-rolled event bus (publish/subscribe) decouples the audio/data layer (`core`, `audio`, `midi`) from `ui`. No virtual DOM, no framework — UI modules subscribe to model events and patch the DOM directly. This is decided now so Phase 1 establishes the pattern instead of every later phase inventing its own.
- **Dev serving:** ES modules require `http(s)://`, not `file://` (CORS blocks module imports otherwise). Any static file server works (e.g. `npx serve`, Python's `http.server`); this repo doesn't mandate one specific tool or add it as a dependency. `.claude/launch.json` runs `python -m http.server` on a fixed port for the in-app browser preview. **Gotcha:** the preview pane has been observed serving a stale cached response for a JS module even after the server process was fully restarted with fresh file content on the same port — if edits don't seem to take effect during verification, bump the port number in `launch.json` (forces a new cache key) rather than assuming the code is wrong.
- **Testing:** no test framework dependency for now. Pure logic (tempo/timing math, MIDI parsing, data-model operations) should be written as plain functions that are easy to hand-test or later cover with a minimal assertion script; DOM/audio-graph behavior is verified manually in-browser per phase (see "Ongoing, every phase" below).

## Non-goals / open questions

- **Sample/audio recording and import:** the project concept is "synthesizing from scratch" — sample-based audio clips are not a committed feature. Phase 7's waveform editor targets synth-rendered audio (e.g. a bounced block) and stays conditional; recording/import is deferred until explicitly requested.
- **Multi-user/collaboration:** out of scope entirely; this is a single-user local app.
- **Native app packaging (Electron, Capacitor, etc.):** out of scope; browser-only, per the concept.
- **Hosting/deployment target:** undecided (GitHub Pages vs. other static host); not blocking since the app has no backend. Revisit once there's something worth deploying.

## Phase 0 — Project Scaffolding (this session)

- [x] Git repo initialized.
- [x] `.gitignore`, `README.md`.
- [x] Doc-index convention established (`docs/INDEX.md`).
- [x] `.agents/LOG.md` and this plan file created.
- [x] First commit checkpoint.

## Phase 1 — Skeleton App & Audio Foundation

- `src/` folder skeleton per the layout above, served via any static file server (see "Dev serving").
- Minimal event bus module (`js/core/eventBus.js`) establishing the state/UI sync pattern.
- Web Audio API bootstrap: single `AudioContext`, master gain/output node, resume-on-user-gesture handling (autoplay policy).
- One playable oscillator voice wired to an on-screen trigger (mouse/touch and keyboard), to prove the audio graph works end-to-end.
- Companion `.md` file per code file from this point forward; `docs/INDEX.md` updated.

## Phase 2 — MIDI Input

- Web MIDI API device enumeration and hot-plug handling.
- Map Note On/Off, velocity, pitch bend, CC (sliders/knobs/buttons) to internal event objects.
- On-screen virtual piano keyboard as a fallback input, sharing the same event pipeline as hardware MIDI.

## Phase 3 — Synth Engine Core ✅ (see notes)

- Voice architecture: polyphony (8 voices) + oldest-voice stealing + retrigger-on-repeat. Implemented in [synthEngine.js](../src/js/audio/synthEngine.md)/[voice.js](../src/js/audio/voice.md).
- Oscillator stage: 2 oscillators per voice, standard waveform types (sine/sawtooth/square/triangle) with per-oscillator detune and mix. **Deviation:** custom/wavetable oscillators (`PeriodicWave`) are deferred — no consumer/UI for authoring a custom wave shape exists yet; standard types cover the "verify it's audible and controllable" bar for this phase.
- Modulation: amp + filter ADSR envelopes, one filter (lowpass/highpass/bandpass, cutoff + resonance). **Deviation:** implemented one fixed LFO (rate/depth/target ∈ {pitch, filter}) instead of a fully generic mod matrix — see the simplification note in [patch.md](../src/js/audio/patch.md). Revisit once there's a second modulation source that would justify generic routing.
- Patch data model: plain-JSON, UI-independent, in [patch.js](../src/js/audio/patch.md); a minimal live-editing UI ([patchEditor.js](../src/js/ui/patchEditor.md)) makes every parameter audibly testable now. A real preset browser/save-load UI is deferred.

## Phase 4 — Timeline, Tracks & Transport ✅ (see notes)

- Project data model: Project → Tracks → Blocks, tempo, time signature (`beatsPerBar`). Implemented in [project.js](../src/js/core/project.md). **Deviation:** blocks are pure time regions (`startBeat`/`lengthBeats`) with no note content and no playback wiring yet — silent placeholders until Phase 5 gives them notes; only the metronome click is audible during playback right now.
- Transport: play/pause/stop, playhead, tempo & beats-per-bar editing, click/metronome (with downbeat accent) — see [transport.js](../src/js/core/transport.md), [transportController.js](../src/js/core/transportController.md), [click.js](../src/js/audio/click.md). **Deviation:** record is not implemented (no recordable audio/MIDI-capture source exists yet — this returns once Phase 5 makes notes performable into a block).
- Timeline UI ([timeline.js](../src/js/ui/timeline.md)): track lanes, click-to-add / drag-to-move / drag-to-resize blocks (snapped to quarter-beat), horizontal zoom (10–120 px/beat) and vertical zoom (40–120px track height). **Deviation:** zoom stops at "beats" — it doesn't yet render individual samples/waveform at extreme zoom-in, since there's no audio content in a block to draw a waveform of.
- Timing engine: [transport.js](../src/js/core/transport.md) computes position from `AudioContext.currentTime` (never drifts) and schedules the metronome via a lookahead scheduler, fully decoupled from the UI's `requestAnimationFrame` playhead loop.

## Phase 5 — Piano Roll & MIDI Editing ✅ (see notes)

- Note editing view bound to a block: add/move/resize/delete notes ([pianoRoll.js](../src/js/ui/pianoRoll.md), opened by double-clicking a timeline block). Notes carry velocity (set to 100 by default when placed via the piano roll) but there's no velocity-editing control yet — **deviation**, deferred since it needs its own small UI (a per-note velocity lane or drag-to-adjust) that didn't fit this pass without bloating the grid interaction.
- **Deviation:** quantization and scale/chord helper overlays are not implemented — the piano roll already snaps to quarter-beat by construction (same `snapBeat` pattern as the timeline), which covers the common case; adjustable quantize grid + scale overlays are deferred until there's a concrete need.
- Bidirectional sync with the synth's live preview: placing or dragging a note plays it immediately through the normal live-note path (`note:on`/`note:off`, same as the on-screen piano/MIDI). Actual playback scheduling is separate and real: [transportController.js](../src/js/core/transportController.md) now walks every track/block/note each poll window and schedules it through [synthEngine.js](../src/js/audio/synthEngine.md)'s new `scheduleNote()` — pressing Play actually plays the composed notes, not just the metronome. Verified in-browser end-to-end (a placed note reliably produces exactly its patch's oscillator count when Play is pressed, repeatably across play/stop cycles).
- Fixed a real bug surfaced while building this: `voice.js`'s release scheduling used to read `AudioParam.value` synchronously, which is only correct for a live "release right now" call — pre-scheduled (future) releases needed `cancelAndHoldAtTime` instead. See [voice.md](../src/js/audio/voice.md).
- **Still a non-goal:** every track shares one global patch (no per-track instrument yet — see [project.md](../src/js/core/project.md)); MIDI *export/import* (as in, `.mid` file I/O) was never in scope, only Web MIDI *device input* (Phase 2).

## Phase 6 — Effects & Mixing ✅ (see notes)

- Six effect types on Web Audio nodes ([effects/](../src/js/audio/effects/)): delay, distortion, algorithmic reverb (generated impulse response — no external audio assets), compressor, chorus, 3-band EQ. Each is a self-contained `{ input, output, setParam, dispose }` factory registered in [effectTypes.js](../src/js/audio/effectTypes.md).
- Per-track and master effect chains via [effectChain.js](../src/js/audio/effectChain.md) (ordered, bypassable, full-rewire-on-change) and [mixer.js](../src/js/audio/mixer.md) (owns the per-track buses + master chain, keeps them synced to project data). Signal flow: track gain → track effects → pan → master gain → master effects → destination.
- Effect chain UI: add/remove + per-effect param sliders + bypass, generically generated from `paramDefs` (same pattern as the patch editor) — see [mixer.js (ui)](../src/js/ui/mixer.md). **Deviation:** no drag-to-reorder UI yet (`moveEffect` exists in [project.js](../src/js/core/project.md) but nothing calls it) — reordering by removing and re-adding works today; a proper drag handle is a small follow-up, not attempted here to keep the UI's first pass focused.
- Mixer view: per-track volume/pan/mute/solo (solo correctly silences all non-soloed tracks, recomputed together since solo isn't a per-track-isolated property) and a master strip. **Deviation:** no sends/aux buses — only insert effects. A send model (shared reverb/delay buses with per-track send levels) is meaningfully more plumbing than insert effects and wasn't attempted this pass.
- **Deviation, carried from Phase 5:** live-played notes (on-screen piano/MIDI) still route straight to the master bus, bypassing per-track effects/volume/pan — only *sequenced* (Play-triggered) notes go through a track's bus. Fixing this needs a "currently selected/armed track for live input" concept that doesn't exist yet.
- Verified in-browser end-to-end via connection tracing (not just code review): adding a Delay effect through the mixer UI produces the exact expected live node graph (`GainNode -> DelayNode -> GainNode` for its dry/wet/feedback, chain output into the track's `StereoPannerNode`); mute/solo confirmed to actually zero the track bus's gain; removing a track now also disposes its mixer bus (a real leak caught and fixed during this phase — see [audioEngine.md](../src/js/audio/audioEngine.md)'s `track:removed` handling).

## Phase 7 — Waveform Editing & Automation

- Zoomed-in waveform view for rendered/bounced synth blocks — cut/trim/fade/normalize/gain. (Sample recording/import is a non-goal for now; see above.)
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
- Manually verify new behavior in an actual browser (in-app browser preview) before considering a checkpoint done — type checks and eyeballing code are not a substitute for seeing audio/UI actually work.
