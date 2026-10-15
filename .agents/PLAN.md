# SynthDaw — Development Plan

High-level phased roadmap. Each phase should be broken into scoped tasks (and git commits) at implementation time — this file stays high-level. Update the "Status" line as phases start/finish, and log notable milestones in [LOG.md](LOG.md).

**Status: Phases 0–6, 9, and 10 complete. Phase 8 (looping) and Phase 12 (undo/redo + shortcuts) partially complete. A second full review (2026-09-22, see "Second review" below) found correctness bugs and major usability gaps; Phases 13–17 were added to fix them and are complete. Since then (2026-09-27 to 09-29): built-in demo songs in a Load Demo… picker (Neon Tide, and Neon Riptide, its 64-bar remix with oscillator-built drums and a dubstep drop, polished for tuning and mix balance, and liked by the user). Also fixed: silent playback in real Chrome (autoplay-policy unlock timing, and a fixed 48 kHz engine rate, because the user's 192 kHz output device overloaded the audio thread), and undraggable 7px-wide Instrument-panel sliders. On 2026-09-29 (second session): noise oscillator, pitch envelope and drum presets; live patch edits on sounding notes; tempo-synced delay and LFO; block copy/cut/paste; playhead follow; a master level meter; and a third demo, **Neon Pulse** (house loop on the new drums). A third full review (2026-10-15, see "Third review" below) found an export slowdown, a metronome routing bug, lost scroll on undo, a Delete footgun in the piano roll, no sustain pedal, and ranked the next features; the same session then fixed issues 1–5, 7 and 8 and shipped the simple wins (loop-the-block, header Mute/Solo, track colours, piano-roll playhead, Home/Ctrl+S, idle-work and sequencer-scan trims, phone header). All verified headless with offline renders; nothing was listened to. Later the same day (at the user's "proceed as you think best"): a fourth demo, **Neon Vortex** (psytrance), the autosave backup slot with Recover previous, note selection in the piano roll (marquee, group move/resize, velocity, transpose, copy/paste/duplicate, quantize), track reorder by header drag, MIDI learn for mixer faders and transport buttons, and per-frame zoom re-rendering. A demo polish pass followed (velocity-sensitive filter envelopes added to the synth; Pulse and Vortex got fills, variations, transitions and mix trims; Tide small touches; Riptide only tempo sync), driven by a measurement harness (per-section K-weighted loudness, peaks, spectral bands, in-scale fraction of spectral peaks, per-track density/uniqueness). **Next session:** get the user's ear on all four demos (polished, not listened to), the background-tab fix (build hash shown on the page), and the metronome routing. Then: automation lanes (Phase 7), synth depth (unison, glide, wavetables, user presets), canvas block previews, recording count-in, a project browser, and more demos (the user has room for them). 2026-10-15 evening: the user reported glitches even while using the page that settle after a while (audio-thread CPU, likely Chrome resampling to the 192 kHz device); the scheduling horizon went back to 0.2 s and an **Audio: Stable** buffer setting was added. **Neon Aurora**, a symphonic overture, is the fifth demo. Playback still garbles at times on the user's machine; the level meter now counts audio dropouts ("⚠ N": audio-clock jumps against the wall clock), so the next session can see whether they track dense passages (audio-thread CPU) or UI actions. **Next session, first:** ask the user for the ⚠ count and when it climbs, whether "Audio: Stable" changed anything, and whether setting the Windows output device to 48 kHz (Chrome then stops resampling our 48 kHz engine to 192 kHz) helps. Then the likely fixes, in order: a "freeze"/bounce playback mode (render the project offline once and play the buffer, which makes playback nearly free and makes the demos glitch-proof), lighter voices (fewer nodes per note, k-rate filter automation), and effect chains that idle while a track is silent. Then candidates: note selection/copy/multi-select in the piano roll, unison/glide, a CPU load indicator, and the distortion-gain / pre-effects track volume items (both change existing demos' sound, so re-balance and check with the user). **Don't play audio** unless the user asks (they work on the same machine); verify with offline renders. Phase 7 and the remaining Phase 8/12 items are now in the Backlog. Phase 11 (cross-platform validation) is on hold indefinitely per explicit instruction — this environment can't test Linux/Android/other-device Chrome anyway, and it's not blocking use of the app on the one platform (Windows Chrome) that can be tested here.**

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
- **Dev serving:** ES modules require `http(s)://`, not `file://` (CORS blocks module imports otherwise). Any static file server works (e.g. `npx serve`, Python's `http.server`); this repo doesn't mandate one specific tool or add it as a dependency. `.claude/launch.json` runs [tools/devServer.py](../tools/devServer.md) (stdlib `http.server` + `Cache-Control: no-store`) for the in-app browser preview. Plain `python -m http.server` let the preview keep serving stale JS modules after edits, which used to require bumping the port; the no-store header fixes that permanently.
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

## Phase 8 — Looping & Arrangement (partial — see notes)

**Taken out of order, ahead of Phase 7:** looping is explicitly named in the project concept ("It should have looping") as a core requirement, whereas Phase 7's waveform editing has no real content to operate on yet (no sample recording/import — a standing non-goal — and no rendered/bounced audio exists). Looping was the higher-value, more clearly-scoped piece to build next.

- ✅ Loop region definition (`project.loop: { enabled, startBeat, endBeat }`, [project.js](../src/js/core/project.md)) and seamless, audio-accurate playback looping ([transport.js](../src/js/core/transport.md)) — verified in-browser to hold up over 12+ consecutive loop cycles with no drift and no double/missed note scheduling. A real bug was found and fixed during this work: the first implementation attempt re-anchored the transport's position using the *scheduling lookahead* (~100ms ahead of real time) instead of actual elapsed playback time, which both corrupted position reads at the seam and caused ~3x over-scheduling of notes near the loop boundary — see the "Deviation" history in [transport.md](../src/js/core/transport.md) and the Phase 8 log entry.
- ✅ A visual loop-region overlay on the timeline ruler/lanes, and loop enable/start/end controls in the transport bar ([timeline.js](../src/js/ui/timeline.md)).
- ❌ Not done: punch in/out recording (no capture source exists — same reason transport `record` was skipped in Phase 4) and an arrangement-level "blocks collapse to bars" view (deferred; the existing horizontal zoom already reaches down to a coarse bar-level look, just without dedicated section markers).

## Phase 9 — Persistence & Export ✅

- Save/load: [project.js](../src/js/core/project.md) mutators now emit `project:changed`; [persistence.js](../src/js/core/persistence.md) debounce-autosaves to IndexedDB (~800ms after the last change) and loads it back on startup. JSON export/import via [projectControls.js](../src/js/ui/projectControls.md).
- **Real bug found and fixed along the way:** the "IDs are a simple incrementing counter" limitation flagged since Phase 4 stopped being theoretical once save/load and import were real — `syncIdCounter()` now scans loaded/imported data and advances the counter past the highest id seen, verified to prevent collisions (a crafted `track-999` import correctly forced the next new track to `track-1000+`, not `track-1`).
- Offline render/export to WAV via `OfflineAudioContext`: [exportRender.js](../src/js/audio/exportRender.md) stands up a second synth engine + mixer against an offline context (reusing every DSP module unmodified, since none of them hardcode a global `AudioContext`) and [wavEncoder.js](../src/js/audio/wavEncoder.md) encodes the result as 16-bit PCM WAV. Verified in-browser: rendered a real, non-silent, correctly-timed buffer, and the WAV header/data-size math checked out byte-for-byte.
- Import/New Project also call `resetMixer()` ([audioEngine.js](../src/js/audio/audioEngine.md)) since old tracks' mixer buses have no relationship to a wholesale-replaced project's tracks — full teardown/rebuild rather than reconciliation, same pattern as the Phase 6 track-removal leak fix.
- **Deviation:** single autosave slot only (no named/multiple saved projects, no version history) — matches the app's current single-project scope; add a project browser if that becomes a real need.

## Phase 10 — Responsive & Touch Polish ✅ (see notes)

**Taken out of order, ahead of Phase 7:** same reasoning as looping — "fully-responsive... rely heavily on mouse/touch input... ideally android too" is explicit in the project concept, while Phase 7 still has no audio content to build a waveform view around.

- Responsive layout pass: audited (not guessed) real DOM measurements at mobile (375×812, reporting as a 640px viewport in this environment) and tablet (768×1024) widths — no horizontal overflow anywhere (timeline, mixer, patch editor, project controls all confirmed to fit).
- Touch gesture support: drag blocks/notes already worked (Pointer Events unify mouse/touch/pen, and draggable elements already had `touch-action: none`) — verified this holds after the sizing pass below. On-screen knobs/sliders (native `<input type="range">`) already have adequate touch hit areas from the browser regardless of visual thinness. **Deviation:** no custom pinch-to-zoom gesture on the timeline — the existing zoom *sliders* are already touch-operable and cover the same need without the added complexity of custom multi-touch handling; revisit only if real use shows the slider isn't good enough.
- **Real, measured problem found and fixed:** several small icon buttons and resize handles were badly undersized for touch — e.g. `.timeline-track-remove` measured 12×14px, `.piano-roll-note-resize` measured 6×14px. Enlarged every such control to an explicit `min-width`/`min-height` (24–40px depending on context) rather than letting it shrink to its glyph, and widened resize-handle hit areas; re-measured after the fix to confirm (e.g. `timeline-track-remove` → 28×28px) and re-verified drag/resize interactions still work correctly. The piano roll's note controls (~18px) remain the most cramped in the app, documented as a known limitation in [pianoRoll.md](../src/js/ui/pianoRoll.md) since fixing it properly needs a zoom control the piano roll doesn't have yet.
- MIDI + touch coexistence: already true by construction (Web MIDI input is independent of any touch/pointer UI code, unified only at the `note:on`/`note:off` event level) — no Android hardware available in this environment to test physically, so this is verified by code/architecture inspection, not a live device.

## Phase 11 — Cross-Platform Validation & Performance — ⏸ ON HOLD INDEFINITELY

Put on hold by explicit instruction (2026-09-22). Not a technical blocker — this environment genuinely can't test Chrome/Linux or Chrome/Android (no such devices available), and holding it doesn't block using or testing the app on Chrome/Windows in the meantime.

- Manual test pass on Chrome/Windows, Chrome/Linux, Chrome/Android.
- Audio performance profiling (voice count ceilings, glitch/underrun checks under load).
- Accessibility pass (keyboard navigation where feasible, contrast, touch target sizing).

## Phase 12 — Polish & Quality-of-Life (partial — see notes)

**Taken out of order, ahead of Phase 7 and 11:** undo/redo and basic transport shortcuts are high-value, well-scoped, and had no dependency on anything still missing — unlike Phase 7 (needs audio content) or Phase 11 (needs other Chrome platforms/devices this environment can't provide).

- ✅ Undo/redo ([history.js](../src/js/core/history.md)): snapshot-based, built entirely on the plain-JSON project model from Phase 9 rather than per-action command objects. Debounces rapid-fire changes (500ms) so one drag gesture is one undo step, not dozens — verified in-browser with a real 8-step simulated drag collapsing into exactly one undo. Wired into [projectControls.js](../src/js/ui/projectControls.md) as Undo/Redo buttons that disable themselves correctly via a `history:changed` event.
- ✅ Keyboard shortcuts ([keyboardShortcuts.js](../src/js/core/keyboardShortcuts.md)): Space (play/pause), Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y (redo) — all correctly suppressed while a text/number input has focus (verified: Space while the tempo field is focused does not toggle playback).
- ❌ Not done: theming (only the one dark theme exists) and onboarding/first-run guidance (no tutorial or empty-state help text) — both are pure UI polish with no functional dependency on anything else, genuinely just not gotten to yet, unlike the other deviations in this plan which reflect deliberate scope calls.

## Second review (2026-09-22)

A full read of every source file plus the running app. Phases 1–12 built a lot of surface area, but several parts don't actually work together, and the core editing workflow is thin. Findings, grouped by severity:

**Correctness bugs (the app does the wrong thing today):**

1. **Saved mixer state is never applied to audio.** On load, undo/redo and import, track volume/pan/mute/solo, track effects, master volume and master effects all show in the UI but the audio graph ignores them until each control is touched again. Undo even *drops* every effect from the audio, because `resetMixer()` tears the buses down and nothing rebuilds them.
2. **Moving an effect slider rebuilds the whole chain on every input event.** `onEffectsChanged` → `syncTrackEffects` disposes and recreates every effect node. Dragging a Reverb slider regenerates its impulse response dozens of times a second, which glitches audio. It should be a plain `setParam`.
3. **Tempo and beats-per-bar edits skip `project.js`.** The UI writes `project.tempo` directly, with no `project:changed`. That makes them non-undoable, and they're only saved if something else happens to trigger a save. The transport's tempo also never gets synced *from* the project, so a saved 90 BPM project plays at 120.
4. **The synth patch isn't part of the project.** It lives in a module global in `audioEngine.js`, so it's lost on reload, left out of Export JSON, and can't be undone.
5. **Stop/Pause don't silence sequenced notes.** Anything already scheduled keeps sounding for its full length (a 4-beat note rings on for 2s after Stop at 120 BPM).
6. **Pause → Play with the loop enabled jumps back to the loop start** instead of resuming from where it paused.
7. **Notes outside a block's bounds still play and export.** Shrinking a block doesn't clip its content.
8. **Re-rendering leaks.** Every undo/redo/import calls `renderTimeline`/`renderMixer` again. Each call stacks another `project:tracks-changed` listener and another `requestAnimationFrame` loop that is never cancelled.
9. **Computer-keyboard notes fire even while a form field has focus, or with Ctrl/Cmd held.** Ctrl+D would play a note, for example. This is mostly latent today because there are no text fields yet, but track rename will add one.

**Major usability gaps:**

- Blocks are opaque blue rectangles, with no preview of the notes inside them.
- The piano roll covers only 3 octaves (C3–B5). Notes can't be dragged to a new pitch, only sideways. There's no zoom, no grid choice and no velocity editing.
- Nothing can be selected, duplicated or transposed. Blocks can't move between tracks, tracks can't be renamed, and clicking the ruler doesn't seek.
- The timeline is a fixed 32 bars.
- Every track shares one instrument, and live MIDI/keyboard input skips track routing entirely (a deviation flagged in Phase 6).
- MIDI CC and pitch-bend events are parsed and emitted, but nothing consumes them, so controller sliders/knobs/wheels do nothing. For a MIDI-centric DAW this is a core gap.
- Transport "record" has never existed, so you can't play a part in.
- The patch editor is a flat list of 21 unlabeled sliders with no value readouts and no presets. Osc 1 detune isn't exposed, and LFO depth uses one 0–50 range for both "cents" and "Hz", which makes the filter target useless.
- The visual on-screen piano at the bottom of the page is redundant now that there's a piano roll and MIDI (removal requested).

### Phase 13 — Correctness & model/audio sync ✅

- **The audio follows the model, from one place.** `audioEngine.js` attaches to the project and re-syncs the mixer on `project:changed`, coalesced per microtask. `mixer.syncProject(project)` reconciles buses by track id (creates, updates, disposes) and effect chains by effect id/type (it rebuilds only when the chain's structure changes; otherwise it applies param and bypass diffs through `setParam`). Remove the scattered `getMixer().sync*` calls in the UI, `resetMixer()`, and the `track:removed` event. Fixes #1, #2.
- **Transport follows the model too.** `transportController.js` syncs tempo, loop and beats-per-bar from the project on attach and on every change. New `setTempo`/`setBeatsPerBar` mutators in `project.js`. Fixes #3.
- `normalizeProject()` in `project.js` fills defaults for any missing field (older saves, hand-edited imports). It runs on load and import.
- `synthEngine` tracks the voices it has scheduled. The transport's stop/pause/seek cancel them (quick release). Fixes #5.
- Transport resumes from the paused position if that position is inside the loop, and only snaps to the loop start otherwise. Fixes #6.
- The sequencer and WAV export clip notes to their block's bounds. Fixes #7.
- `renderTimeline`/`renderMixer` return a `dispose()` that unsubscribes and cancels rAF; `main.js` disposes before it re-renders. Fixes #8.

### Phase 14 — Per-track instruments & live input routing ✅

- Each track owns a `patch` (plain JSON, persisted, undoable, exported). `synthEngine` takes the patch per note instead of holding a global one. Export WAV renders each track with its own patch. Fixes #4.
- A **selected track** (`core/selection.js`, UI state, not persisted). Clicking a track header selects it. Live input (MIDI + computer keyboard + piano-roll previews) plays through the selected track's patch *and* its mixer bus, so live notes get that track's effects/volume/pan. Resolves the Phase 5/6 deviation.
- The patch editor edits the selected track's patch. It's organized into sections (Oscillators, Filter, Amp envelope, Filter envelope, LFO, Output), with a live value readout on every slider. Adds Osc 1 detune and a per-oscillator octave (−3…+3). LFO depth becomes a normalized 0–1 amount that the voice scales per target (pitch → cents, filter → Hz, amp → tremolo), and a new **amp** target (tremolo) is added.
- Built-in presets (`audio/presets.js`): a handful of from-scratch starting points (init, lead, pad, pluck, bass, keys) in a dropdown. Loading one replaces the track's patch and is undoable.

### Phase 15 — Timeline editing essentials ✅

- **Remove the on-screen piano** (explicit request). Computer-keyboard note input stays, since it's the only instrument when no MIDI device is connected. It moves to `ui/computerKeyboard.js`, gains Z/X octave shift, and ignores keys while typing in a field or with modifier keys held (fixes #9).
- **Block selection** (click). A selected-block toolbar offers Edit notes (touch-friendly alternative to double-click), Duplicate, Delete, **Transpose by X octaves up/down** (numeric octave count + ▲/▼), and ±1 semitone. Transposition is all-or-nothing: if any note would leave MIDI range 0–127, nothing changes and the toolbar says why. Keyboard: Delete/Backspace, Ctrl/Cmd+D, ↑/↓ (semitone), Shift+↑/↓ (octave), Esc (deselect).
- Blocks render a miniature of their notes, so content (and transposition) is visible at a glance.
- Drag a block vertically to move it to another track.
- Click the ruler to seek; the ruler shows beat ticks as well as bar numbers.
- Double-click a track name to rename it. The selected track is highlighted.
- Timeline length grows with content (always at least 8 bars past the last block, minimum 32).
- **Changed interaction:** a *double*-click on an empty lane adds a block. A single click now selects the track and deselects the block, since single-click-to-add made every stray click create a block. The inline block "×" is gone too: use the toolbar or the Delete key.
- Transport UI split out of `timeline.js` into `ui/transportBar.js`, and the selected-block toolbar into `ui/blockToolbar.js`, to keep files focused.

### Phase 16 — Piano roll upgrade ✅

- Full MIDI range (0–127), auto-scrolled on open to the block's notes (or middle C when empty). Black-key rows are shaded in the grid.
- Drag notes vertically to change pitch, previewing each new pitch as you go. Notes stay clamped inside the block.
- Horizontal zoom and a snap-grid selector (1, 1/2, 1/4, 1/8, 1/16 beat). New notes use the last length you placed or resized to.
- Velocity lane under the grid: drag a note's bar to set its velocity. Note opacity reflects velocity.
- Clicking a key in the key column previews that pitch, which replaces the removed on-screen piano's "audition a note" role.
- Content beyond the block's end (after shrinking a block) is shown shaded, not deleted. It doesn't play, per #7.
- The piano roll stays open across undo/redo (it reopens on the same block id if it still exists).

### Phase 17 — MIDI performance: record, pitch bend, CC learn ✅

- **Record**: a transport Record button that plays and captures live notes (MIDI/computer keyboard) on the selected track. On stop, the take becomes a new block, bar-aligned around the played notes, with optional quantize-to-grid. Loop recording layers takes into the loop region.
- **Pitch bend** applied to live voices (±2 semitones). New voices start at the current bend.
- **MIDI learn** for patch parameters: click a slider's "learn" button, move a controller knob/slider, and that CC now drives the parameter (scaled to the slider's range) on whatever track is selected. The mappings describe the user's hardware, not a project, so they persist in `localStorage` (`core/midiMap.js`) and not in the project.

**Also done during 13–17:** `tools/devServer.py` (a no-cache static server) replaces the port-bumping workaround for stale modules. The piano roll's notes delete by double-click/right-click instead of an inline button. The mixer's add-effect controls got the touch-size fix Phase 10 missed. Undo/redo keeps the timeline zoom and the open piano roll.

### Backlog (not in the current pass)

- Phase 7: automation lanes, and a waveform view once there's bounced/rendered audio to show.
- Send/aux buses; drag-to-reorder effects (`moveEffect` exists, no UI). Tracks reorder by header drag (2026-10-15).
- Note selection, group move/resize/velocity, transpose, copy/paste/duplicate of notes are done (2026-10-15). Still open: quantize selected notes, note clipboard across blocks is in-memory only (as is the block clipboard).
- Custom/wavetable oscillators, unison, glide, a generic mod matrix (the noise oscillator and pitch envelope are done, 2026-09-29). Neon Riptide's drums still fake noise with filter sweeps and stacked squares; they were left alone because the user likes the song.
- Tempo-synced LFOs don't retime notes already sounding when the tempo changes (they apply from the next note). Synced delays do follow immediately.
- Live patch edits (done 2026-09-29) don't cover attack/decay times, the pitch envelope, switching to/from noise, loading a preset, or undo/redo (those replace the patch object); they apply from the next note.
- Arrangement markers/sections, pinch-to-zoom (playhead follow is done, 2026-09-29).
- Theming, onboarding/first-run help, multiple named saved projects.
- Recording latency compensation, count-in.
- Compact transport/toolbars on phone widths (they wrap correctly but use a lot of vertical space).
- Distortion effect output compensation: it adds about +19 dB on quiet signals, so adding it makes a track jump in level (found while mixing the demo song).
- Track volume is applied *before* the track's effects (`gainNode -> effectChain -> pan`), so a compressor's automatic makeup gain cancels volume cuts. It should probably be post-effects, like a real fader.
- **DSP cost:** at 48 kHz the demo's densest section takes about 50% of real time to render offline, and the voices alone about 35%. Per-voice biquad filters with automated (a-rate) frequency are likely the main cost. Consider cheaper voices (skip the filter envelope when `envAmount` is 0, share LFOs), a voice cap for sequenced notes, and a load indicator (a master level meter exists since 2026-09-29; a CPU/load indicator doesn't). This overlaps the on-hold Phase 11 performance profiling. Found while building Neon Riptide: every track's effect chain costs CPU even while the track is silent, and a convolution reverb costs ≈2% of real time each (other effects ≈0.3–0.7%). Riptide's verse renders at ≈0.6× real time (live-style scheduling), versus 0.42× for Neon Tide's densest section.
- Phase 11 (cross-platform/perf/a11y), still on hold.

## Third review (2026-10-15)

A full read of every source file after the move to GitHub, plus a headless Chromium pass (page load, demo loading, transport, undo, phone-width layout, and offline renders of all three demos; no audio was played). The app loads with no console errors, the transport clock tracks real time, and every demo renders without clipping (peaks 0.69–0.75). What follows is what's worth fixing or adding, most valuable first. Nothing here changes how the demos sound unless marked.

**Outcome (same day):** issues 1–8 below are fixed (6 via a backup slot and a Recover button), every item under "Simple wins" except per-block canvas previews is done (zoom re-renders are coalesced per frame instead), and features 1 (note selection) and 3 (track reorder) shipped, plus MIDI learn for mixer and transport; see the 2026-10-15 LOG entries. Features 4–7 remain open.

**Bugs and glaring issues (all verified):**

1. **Export WAV is far slower than it needs to be, with no progress feedback.** `exportRender.js` schedules every note of the project up front, so the `OfflineAudioContext` carries every voice's nodes (oscillators, filter, gains) from time zero and processes them all for the whole render. Measured headless: Neon Pulse (609 notes, 33 s) renders in 24.7 s scheduled up front, but in 9.2 s when notes are added about a bar ahead via `OfflineAudioContext.suspend()`/`resume()` (2.7× faster); Neon Riptide (2619 notes, 139 s) took 12.5 minutes up front, while Neon Tide (416 notes, 36 s) took 27 s. The cost grows with note count, not song length. Fix: sort `playableNotes` by start, schedule a bar at a time from `suspend()` callbacks (the same look-ahead the live transport uses), and report progress on the Export button. Also render at `ENGINE_SAMPLE_RATE` (48 kHz) instead of 44.1 kHz so the file matches what the user hears.
2. **The metronome click goes through the master effects and master volume.** `transportController.js` sends `playClick` to `masterGain`, which feeds the master chain. All three demos have a master compressor, so the 0.3-gain square click pumps the compressor and ducks the music on every beat (and a master reverb would smear it). Route the click to `mixer.masterOutput` (or its own gain with a level control), and consider defaulting the metronome to off for the demos.
3. **Undo/redo/import/demo-load reset the timeline scroll to bar 1** (measured: `scrollLeft` 1500 → 0 after Ctrl+Z). `main.js` rebuilds the timeline, mixer and patch editor wholesale, and only zoom survives via `timeline.js`'s module-level `view`. Save `scrollLeft`/`scrollTop` (and the mixer strip scroll) the same way before disposing and restore after rendering.
4. **Delete with the piano roll open deletes the whole block.** There is no note selection, so Delete/Backspace fall through to the block shortcut (measured: 30 blocks → 29 and the roll closes). Until note selection exists, ignore the block Delete shortcut while the piano roll panel is open.
5. **No sustain pedal.** `midiInput.js` emits CC 64 as a plain `midi:cc`, so a MIDI piano's pedal does nothing and every note releases when the key lifts. Hold note-offs in `audioEngine.js` while CC 64 ≥ 64 and release them when it drops. Related: the live pool is 8 voices (`MAX_VOICES` in `synthEngine.js`), which is tight for two-handed playing with a pedal; 16 is cheap at 48 kHz.
6. **A demo load or New Project overwrites the only autosave slot.** `replaceProjectContents` emits `project:changed`, so 800 ms later the previous project is gone from IndexedDB; undo covers it only until the page reloads. Keep a few rolling autosave snapshots, or add named save slots (Backlog has "multiple named saved projects").
7. **Gain changes jump instantly.** `mixer.js` sets `gain.value`/`pan.value` directly for volume, mute, solo and master volume, and the effects' `setParam` does the same (a delay-time jump also pitch-warbles). Use `setTargetAtTime` with ~10 ms. No steady-state sound change.
8. Small ones: Ctrl+D calls `preventDefault` even with no block selected (eats the browser's bookmark shortcut); `neonRiptide.js` has a duplicated comment line at 562–563.

**Simple wins (small, self-contained):**

- **Loop the selected block**: a toolbar button that sets `loop` to the block's bounds and enables it. Loop points can only be typed in as raw beats today; showing them as bar.beat, and dragging a loop range in the ruler, are the next steps.
- **Mute/Solo in the timeline track headers.** With 11–14 tracks the mixer is below the fold, and the timeline is capped at 50vh.
- **Per-track colours** (auto-assigned palette stored on the track) for blocks, headers and mixer strips. Every block is the same blue, so Riptide's 14 lanes read as a wall.
- **A playhead in the piano roll** (position minus `block.startBeat`) in the same rAF loop, so editing while looping shows where you are.
- **Keyboard**: Home seeks to 0, Ctrl+S exports JSON (it currently opens the browser's Save Page dialog), `+`/`-` zoom. Letters stay reserved for notes.
- **Transport via MIDI**: the project concept names a controller with buttons and sliders, but CC learn only covers patch sliders. `midiMap.js`'s target strings are generic, so mixer faders (`mixer:<trackId>.volume`) and transport (`transport:play`) are small additions. CC 1 (mod wheel) → LFO depth is another.
- **Idle work**: `timeline.js`'s rAF loop writes the playhead transform and position text every frame while paused, and `levelMeter.js` redraws every frame before audio exists. Skip when nothing changed (battery on Android).
- **Sequencer scan**: `scheduleProjectNotes` walks every note in the project 40×/s (2619 for Riptide). Cache `playableNotes` sorted by start and invalidate on `project:changed`.
- **Block previews** are one `<div>` per note (609 for Pulse, ~2600 for Riptide), rebuilt on every tick of the horizontal zoom slider. A small canvas per block, or throttling the zoom re-render to one per frame, keeps zooming smooth on big songs.

**UI / responsive:**

- On a 375 px phone the header is 334 px and the transport + view bar + block toolbar another 304 px, so the first lane starts 640 px down an 812 px screen. Hide the subtitle below ~600 px, fold the keyboard/MIDI status lines into one, and use icon-only transport buttons at narrow widths (Backlog already notes the toolbars' height).
- The header's hint text could become a dismissible first-run tip (Backlog: onboarding).
- The timeline's track header is 120 px; long names truncate with no tooltip beyond the generic one.

**Features, in the order they'd pay off:**

1. **Note selection in the piano roll** (click, shift-click, marquee) with delete, drag, transpose, copy/paste and velocity editing of the selection. It's the biggest editing gap, it unblocks the velocity-lane access item, and it fixes issue 4 properly.
2. Per-track colours, header Mute/Solo, piano-roll playhead and loop-the-block (above).
3. **Track reorder** (drag the header, or ▲/▼): lane order is `project.tracks` order, so a `moveTrack` mutator is small.
4. **Automation lanes** (Phase 7): track volume and filter cutoff first. This is the largest remaining "DAW" gap.
5. **Synth depth**: unison, glide, a wavetable/`PeriodicWave` oscillator, and user presets (save/rename/delete in `localStorage`). Presets are currently built-in only.
6. **Recording**: count-in and latency compensation (Backlog).
7. **Project browser**: named projects in IndexedDB, which also resolves issue 6.

**Still open from earlier reviews:** the distortion output compensation and post-effects track volume (both change the demos' sound; check with the user first), and the per-voice DSP cost notes in the Backlog.

## Ongoing, every phase

- Keep [docs/INDEX.md](../docs/INDEX.md) and per-file companion docs current.
- Log notable milestones/decisions in [LOG.md](LOG.md).
- Commit at scoped checkpoints, not once per phase.
- Manually verify new behavior in an actual browser (in-app browser preview) before considering a checkpoint done — type checks and eyeballing code are not a substitute for seeing audio/UI actually work.
