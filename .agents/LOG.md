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
- Commit(s): bdf4b4c

### 2026-09-22 — Phase 8 (partial, out of order): looping
- Agent/Model: Claude Sonnet 5
- What: Added `project.loop { enabled, startBeat, endBeat }` and setters in `project.js`; extended `transport.js` to loop playback seamlessly (position wraps, scheduling continues across the seam with no gap or duplication); added loop controls (checkbox + start/end beat inputs) and a visual loop-region overlay to `timeline.js`. Took this out of plan order, ahead of Phase 7 (waveform editing), because looping is an explicit named requirement in the original project concept, while Phase 7 currently has no real content to act on (no sample recording/import, no bounced audio yet).
- Hit and fixed a real, non-trivial bug during in-browser testing (not just written correctly on the first attempt): the first implementation re-anchored the transport's position based on the *scheduling lookahead* (~100ms ahead of real time) rather than actual elapsed playback time. This corrupted `getPositionBeats()` (observed reading negative values right at the loop seam) and, worse, caused the scheduling window bookkeeping to mix pre-wrap and post-wrap beat numbers, over-scheduling notes near the boundary by roughly 3x (17 triggers observed where ~5-6 were correct). Root-caused via direct position sampling and oscillator-count instrumentation, then fixed by decoupling position-tracking re-anchoring (keyed strictly to real elapsed time) from scheduling (which now caps each poll's window at the loop boundary rather than pre-splitting across it, picking the remainder up cleanly on the next tick once the real anchor has caught up).
- Verified in-browser after the fix: position samples stay within the loop's numeric range across many cycles with correct wrapping; note-trigger counts matched the expected count exactly for both a short (2.6s / ~5 cycles) and long (6s / 12 cycles, stress test) run with zero drift; the visual loop region renders and hides correctly; disabling the loop returns to normal linear playback.
- Deviations documented in `PLAN.md`: punch in/out recording and an arrangement-level bar-collapse view are not done (same "nothing to capture yet" reasoning as transport `record` in Phase 4).
- Why: Explicit concept requirement ("It should have looping"), and higher-value than starting Phase 7 while there's no audio content for a waveform view to display yet.
- Commit(s): c7588fa

### 2026-09-22 — Phase 9: persistence & export
- Agent/Model: Claude Sonnet 5
- What: Every mutator in `project.js` now emits `project:changed`; new `persistence.js` debounce-autosaves the project to IndexedDB (~800ms after the last change) and loads it back on startup, falling back to a fresh default project if nothing was saved. `projectControls.js` adds New Project / Export JSON / Export WAV / Import JSON buttons plus a "Saved"/"Unsaved changes…" status readout. WAV export (`exportRender.js` + `wavEncoder.js`) stands up a second synth engine + mixer against an `OfflineAudioContext` — reusing every DSP module unchanged, since none of them hardcode a global `AudioContext` — and hand-encodes the rendered buffer as 16-bit PCM WAV (no Web Audio API does this for you). Also added `project.js`'s `syncIdCounter()`, since save/load and import make the long-flagged "id collision" limitation from Phase 4 a real risk rather than a theoretical one.
- Verified in-browser thoroughly: made a change, watched the debounced autosave fire, reloaded the page for real, and confirmed the block was still there; exported JSON and checked its shape; imported a crafted project (different tempo/track/loop settings) and confirmed the live UI actually switched over; imported a project containing id `track-999` and confirmed the next new track came out `track-1001` (not colliding) proving `syncIdCounter` works; rendered WAV export directly and inspected the actual PCM data (non-silent, correct duration formula) and the encoded file's header bytes (RIFF/WAVE/fmt/data tags and every size field correct, byte-for-byte); New Project reset cleanly and audio kept working afterward. Zero console errors across the whole suite.
- Deviation documented in `PLAN.md`: one autosave slot only, no named/multiple saved projects — matches the app's current single-project scope.
- Why: Highest-value remaining piece per the previous session's own recommendation — until now all work was lost on every page reload.
- Commit(s): 4e23d7d

### 2026-09-22 — Phase 10 (out of order): responsive & touch polish
- Agent/Model: Claude Sonnet 5
- What: Audited the app at mobile (375×812) and tablet (768×1024) viewports via real DOM measurements, not guesses. Confirmed no horizontal overflow anywhere. Found several genuinely undersized touch targets by measuring them directly — `.timeline-track-remove` at 12×14px, `.timeline-block-remove` at 20×14px, `.piano-roll-note-resize` at 6×14px, and others similarly cramped — and fixed each with explicit `min-width`/`min-height` (24–40px) plus widened resize-handle hit areas, then re-measured to confirm the fix (e.g. `timeline-track-remove` now 28×28px) and re-verified drag/resize interactions still work correctly afterward. Bumped the piano roll's `ROW_HEIGHT` from 16 to 20px (kept in sync with a CSS comment, same coupling pattern as `TRACK_HEADER_WIDTH`).
- Took this out of plan order, ahead of Phase 7, for the same reason as Phase 8's looping: "fully-responsive... rely heavily on mouse/touch input... ideally android too" is an explicit concept requirement, while Phase 7 has no audio content yet to act on.
- Deviations documented in `PLAN.md`: no custom pinch-to-zoom gesture (the existing zoom sliders already work by touch and cover the need without custom multi-touch code); piano-roll note controls remain the most cramped element in the app since fixing that properly needs a zoom control the piano roll doesn't have; no physical Android device available to test, so MIDI+touch coexistence is verified by architecture (Web MIDI is independent of pointer/touch code) rather than on real hardware.
- Why: Explicit concept requirement, and a concrete usability gap (measured, not assumed) worth fixing before adding more surface area in Phase 7 or beyond.
- Commit(s): 7d21d3d

### 2026-09-22 — Phase 12 (partial, out of order): undo/redo and keyboard shortcuts
- Agent/Model: Claude Sonnet 5
- What: Added `history.js` (snapshot-based undo/redo, reusing the plain-JSON project model and `replaceProjectContents` from Phase 9 rather than building per-action command objects) and `keyboardShortcuts.js` (Space to play/pause, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo, all suppressed while a form field has focus). Wired Undo/Redo buttons into `projectControls.js` with disabled state kept in sync via a new `history:changed` event. Cleaned up `projectControls.js`'s New Project handler to call `createProject()` instead of duplicating its return shape inline.
- The subtle part: `project:changed` fires on every mutator call, including once per `pointermove` during a drag — naively recording an undo step per event would make undoing one drag take dozens of presses. Debounced (500ms) so a burst of rapid changes coalesces into one undo step, and guarded against the restore operation re-triggering itself as a new undoable change (since `replaceProjectContents` still needs to emit `project:changed` for autosave's benefit).
- Verified in-browser: a real simulated 8-step drag collapsed into exactly one undo (block jumped straight back to its pre-drag position, not one step at a time); a full add→drag→undo→undo→redo→redo chain produced the exactly-expected state at each step; Ctrl+Z through the actual keyboard handler (not calling the function directly) correctly removed a block; Space correctly toggled play/pause and was correctly suppressed while a number input was focused; autosave was confirmed to still fire after an undo/redo despite history.js ignoring that same event for its own bookkeeping. Zero console errors.
- Took this out of plan order (ahead of Phase 7 and Phase 11) since it had no blocking dependency, unlike either of those.
- Deviations documented in `PLAN.md`: theming and onboarding/first-run guidance are not done — plain remaining work, not a deliberate scope cut.
- Why: High value, well-scoped, and immediately usable — mistakes while editing a timeline/piano-roll are common, and losing them without undo would be a real usability gap.
- Commit(s): 168db80

### 2026-09-22 — Phase 11 put on hold indefinitely
- Agent/Model: Claude Sonnet 5
- What: Marked Phase 11 (cross-platform validation & performance) on hold indefinitely in `PLAN.md`, per explicit instruction. No code changes.
- Why: This environment can't test Chrome/Linux or Chrome/Android (no such devices available), and the app is fully usable/testable on Chrome/Windows without it — holding it isn't a blocker for anything else in the plan.
- Commit(s): 94bc679

### 2026-09-22 — Second full review and plan update (Phases 13–17)
- Agent/Model: Claude Opus 5.5
- What: Read every source file plus the running app. Found 9 concrete correctness bugs, including saved mixer state never reaching the audio graph, effect sliders rebuilding whole chains per input event, tempo edits bypassing the model (non-undoable, never applied on load), the synth patch not being saved at all, Stop not silencing scheduled notes, Pause→Play restarting loops, and re-renders leaking listeners/rAF loops. Also found major usability gaps. Rewrote `PLAN.md` with a "Second review" section, new Phases 13–17 and a Backlog (Phase 7 and the remaining 8/12 items moved there).
- Why: The user asked for a thorough review and plan update, including two explicit requests: remove the on-screen piano, and transpose a block by X octaves.
- Commit(s): aa6974a

### 2026-09-22 — Phase 13: correctness and model-driven sync
- Agent/Model: Claude Opus 5.5
- What: The audio graph and transport now *follow the project*. `mixer.syncProject` reconciles buses and effect chains after every `project:changed` (param/bypass diffs via `setParam`, rebuilding only on structural change), and `transportController` syncs tempo and loop. Added `setTempo`/`setBeatsPerBar`, `normalizeProject`, `playableNotes` (block-clipped notes shared by the sequencer and export), scheduled-voice cancellation on stop/pause/seek, `transport.seek`, and view disposers. Replaced the port-bumping cache workaround with `tools/devServer.py` (no-store headers).
- Verified in-browser: saved track volume applied after reload (0.5); 20 effect-slider events created 0 new nodes; tempo 90 synced and undone back to 120; pause/resume inside a loop resumed at 2.64 beats; a note running past its block was clipped and a note after the block end was skipped; Stop silenced a 1s note within 250ms.
- Commit(s): 8ae6754

### 2026-09-22 — Phase 14: per-track instruments and live routing
- Agent/Model: Claude Opus 5.5
- What: `track.patch` per track (saved, undoable, exported). The synth engine takes the patch per note. Added a selected-track concept (`core/selection.js`); live input now plays the selected track's patch through its mixer bus (closing the Phase 5/6 deviation). Rebuilt the patch editor: sections, value readouts, log-scaled sliders, Osc 1 detune, per-oscillator octave, presets (`audio/presets.js`). LFO depth is normalized per target, with a new tremolo (amp) target implemented as a multiplying stage so it can't sound after release.
- Verified in-browser: track 2 with the Sub Bass preset played its own patch (octave −1 = −1200 cents) via its own bus while track 1 was unchanged; the WAV export rendered per-track patches; old saves without patches were normalized.
- Commit(s): 5335ed5

### 2026-09-22 — Phase 15: timeline editing, piano removal, octave transpose
- Agent/Model: Claude Opus 5.5
- What: Removed the on-screen piano (requested); computer-keyboard input moved to `ui/computerKeyboard.js` (Z/X octave, ignores fields/modifiers). Block selection plus `ui/blockToolbar.js`: edit/duplicate/delete and **transpose by X octaves** (all-or-nothing within MIDI 0–127, with a message when refused) and ±1 semitone, all shared with shortcuts through `core/blockActions.js`. Blocks show a miniature of their notes and can be dragged between tracks. Also added ruler seek, a position readout, track rename, sticky headers, a growing timeline, and zoom/piano roll that survive undo. Split `ui/transportBar.js` out of `timeline.js`. **Interaction change:** double-click (not single click) on an empty lane adds a block.
- Verified in-browser: +2/−4 octave transposes were exact, a 10-octave transpose was refused with notes untouched, ↑ and Shift+↑ gave +1 and +12, Ctrl+D duplicated and selected the copy, drag moved a block one bar right onto track 2, ruler seek went to beat 6, rename propagated to the mixer, Delete removed the block and closed its piano roll.
- Commit(s): c9e2058

### 2026-09-22 — Phase 16: piano roll upgrade
- Agent/Model: Claude Opus 5.5
- What: Full MIDI range with a clickable key column (auditioning replaces the removed piano); auto-centering on notes (also after a transpose); drag in time and pitch with preview; zoom plus snap (1 to 1/16); last-length note placement; velocity lane; double-click/right-click to delete; notes past the block end shown shaded.
- Verified in-browser: a note moved +2 semitones/+1 beat with two pitch previews; velocity set to 32 via the lane; a new note's length was clamped to the block end; deletion and key preview worked; the timeline miniature updated.
- Commit(s): 32addff

### 2026-09-22 — Phase 17: record, pitch bend, MIDI learn
- Agent/Model: Claude Opus 5.5
- What: `core/recorder.js` records MIDI/computer-keyboard input on the selected track into a bar-aligned block (optional ¼-beat quantize; loop-wrap aware; held notes closed at Stop). Pitch bend is ±2 semitones on live voices. `midi/midiMap.js` plus per-slider learn buttons map CCs to patch parameters (localStorage, applied to the selected track with the slider's own log/linear scaling). Also: `+ Effect` touch-size fix, keyboard hint hidden on touch devices, README status updated.
- Verified in-browser (MIDI permission is denied in the preview, so MIDI was simulated via bus events): a keyboard take with an octave shift and a note held through Stop became the expected quantized block; CC21 was learned and drove cutoff 40 Hz–16 kHz and persisted; an unmapped CC did nothing; pitch bend moved held oscillators +200 cents. The final regression on a fresh project (add block → piano-roll notes → preset + reverb → play → WAV export → JSON round-trip) produced no console errors; a 375px viewport had no horizontal overflow.
- Commit(s): a564e26

### 2026-09-27 — Demo song ("Neon Tide") and Load Demo button
- Agent/Model: Claude Opus 5.5
- What: Added `src/js/demo/demoSong.js` (`createDemoProject()`, built from the app's own presets and effect defaults rather than a static JSON file) and a **Load Demo** button in the project controls (confirms first, undoable). The song is 16 bars at 112 BPM in A minor (Am–F–C–G), looped. It builds from pad, to bass + pluck arp, to lead + keys, and its final section has the lead transposed up an octave. Between them the tracks cover all 5 non-Init presets, a customized patch (deeper amp-LFO tremolo), 5 of the 6 effect types plus a master EQ→compressor chain, pan, velocity accents, and looping.
- Verified in-browser (on the user's running dev server, in the preview pane's separate storage): Load Demo produced 5 tracks, 14 blocks, tempo 112 and a visible loop. Each track was rendered solo offline to balance levels. The full mix measured −29 / −20.7 / −19.2 / −19.2 dB RMS per section with a 0.51 peak and 0 clipped samples. Live playback from bar 9 scheduled normally, with no console errors.
- Found while mixing, not fixed (added to the PLAN backlog): distortion adds about +19 dB with no output compensation, and track volume is pre-effects, so a compressor's makeup gain cancels volume cuts.
- Commit(s): 93a9b1f

### 2026-09-27 — Fix: no sound in Chrome after the first metronome click (autoplay policy)
- Agent/Model: Claude Opus 5.5
- What: The user reported silence after the first click, with the console warning "The AudioContext was not allowed to start". Root cause: startup created the `AudioContext` (via `setProject` → `getTransport()`), before any user gesture, so Chrome made it suspended. It was then only resumed as a side effect of scheduling sounds, mostly from timers that don't count as gestures, and `transport.play()` anchored its clock to the suspended context's frozen `currentTime`. The fix:
  - Nothing creates the transport or context at load anymore. The playhead polls a non-creating `getPositionBeats()`, and the first `getTransport()` call syncs tempo/loop from the project.
  - `audioEngine.unlockAudio()` resumes from capture-phase `pointerdown`/`keydown` listeners, and `ensureContext()` no longer calls `resume()`.
  - `transport.play()` waits for `resume()` to resolve before anchoring (cancellable by pause/stop).
  - If audio stays blocked, a "click anywhere to enable audio" hint appears.
- Why it was missed: the preview pane doesn't enforce Chrome's autoplay policy (its contexts start `running`), and all earlier verification checked the schedule and offline renders, never the live clock under the policy.
- Verified in-browser with the policy simulated (context suspended; `resume()` refused unless `navigator.userActivation.isActive`): a real click on Play resumed the context with 0 blocked resumes. Position advanced 6.6 → 10.6 beats over 3s, and an analyser on the master bus read non-zero RMS (0.018–0.039) throughout. A scripted play() with no gesture waited instead of running, showed the hint, and Stop cleared the pending start. No console errors.
- Commit(s): e46751a

### 2026-09-27 — Fix, part 2: unlock audio on mousedown/click, not pointerdown
- Agent/Model: Claude Opus 5.5
- What: After the first autoplay fix, the user's Chrome (Windows, mouse) was still silent. Their console showed `unlockAudio` creating the context from the capture-phase **pointerdown** listener and Chrome refusing it ("not allowed to start"). For a mouse, Chrome records user activation at `mousedown`, which comes *after* `pointerdown`, so the earlier fix unlocked audio one event too early. Changes:
  - Unlock on `mousedown`/`click`/`keydown`/`touchend`.
  - Don't touch audio at all (no context, no live notes, no pitch bend) until `navigator.userActivation.hasBeenActive`.
  - Add `getAudioState()` and `audio:state` events, plus a transport-bar warning shown whenever the context exists but isn't running.
- Why it was missed twice: the preview pane grants audio unconditionally, and even with the policy simulated it can't reproduce Chrome's event-vs-activation ordering. The user's pasted console stack trace is what identified the cause.
- Verified in-browser (logic only, per the above): before any real gesture, a MIDI-style note and an untrusted mousedown created 0 AudioContexts. A real click on Play created exactly 1 running context, and the transport advanced with non-zero master-bus RMS (0.017–0.037). Suspending the context showed the warning, and a real click elsewhere resumed it and hid the warning. No console messages. **Still needs confirmation in the user's Chrome.**
- Commit(s): d94772b

### 2026-09-27 — Fix, part 3: the real cause of silence was a 192 kHz output device
- Agent/Model: Claude Opus 5.5
- What: With the autoplay issues fixed, the user's Chrome was still silent (playhead moving, not even a metronome click), while the preview pane on the same machine played. The context reported `sampleRate` 192000, which is the user's output device rate. Offline measurements of the demo: effect chains alone with no notes ran at 109% of real time at 192 kHz (14% at 48 kHz), and the densest section at 241% (96 kHz 120%, 48 kHz ≈50%). Chrome's real-time audio thread therefore overloaded and output silence. Fix: create the AudioContext at a fixed `ENGINE_SAMPLE_RATE` of 48 kHz and let Chrome resample to the device.
- Why it was missed: the preview pane tolerated the overload (probably through larger buffers), and every earlier check either rendered offline (at 44.1 kHz) or ran in that pane. The autoplay fixes were real bugs too, but they weren't the whole story.
- Verified in-browser: the context was created at 48000 Hz. A real click on Play plus a seek to the densest section (bars 13–16) gave master-bus RMS of 0.06–0.12 throughout, and the audio clock tracked wall-clock time at a ratio of 1.000, so no overload. **Still needs confirmation in the user's Chrome.** Added a DSP-cost item to the PLAN backlog (voices alone take ~35% at 48 kHz).
- Commit(s): 307e71d

### 2026-09-27 — Session wrap-up
- Agent/Model: Claude Opus 5.5
- What: Closed out the session. The working tree is clean, every `.md` is in `docs/INDEX.md`, and every code file has a companion doc. Updated `PLAN.md`'s status line with post-Phase-17 work and a next-session pointer (the Backlog, led by the distortion-gain, pre-effects-volume and DSP-cost items). No code changes.
- Note for future verification: the in-app preview pane does **not** reproduce Chrome's autoplay policy or its real-time audio overload behaviour. Audio fixes need confirmation in the user's own Chrome, or measurement against real-time deadlines (offline render time vs. audio duration; `currentTime` vs. wall clock), not just the preview pane.
- Commit(s): (this commit)

### 2026-09-27 — Neon Riptide (extended demo) and a Load Demo picker
- Agent/Model: Claude Opus 5.5
- What: The user asked for a much longer version of the demo, with more instruments and tracks, dubstep sounds, more effects and drums. They also wanted the original kept and both songs loadable from a list.
  - **Load Demo** is now a `<select>` picker fed by `demo/demos.js`.
  - The original Neon Tide is unchanged: its builders moved to the shared `demo/demoKit.js`, and its JSON output was verified byte-identical before and after.
  - New `demo/neonRiptide.js`: 64 bars (about 2:17) and 14 tracks. It keeps the key, tempo, chords and lead, and adds oscillator-built Kick/Snare/Hats (no noise source exists), a half-time dubstep drop (Wobble with a note-synced filter LFO, Sub, Growl, Laser), Glass Bells and a Riser. The structure is intro → build → verse → rise → drop → breakdown → rise → drop 2 → outro.
- DSP: the first draft rendered at up to 2.1× real time. That was measured with every note scheduled up front, which overstates the cost. Scheduling 0.1 s ahead like live playback, it was 0.9× in the verse. Profiling showed convolution reverb ≈2% of real time each (other effects ≈0.3–0.7%), with effect chains costing CPU even on silent tracks, and the hats were the costliest voices. After trimming (3 reverbs removed, redundant EQs removed, 2 notes per hat, 1 per snare, no pad under drop 2), the verse is ≈0.55–0.63× and the drops 0.3–0.4×. Neon Tide's densest section is 0.42× measured the same way.
- Verified in-browser: solo and full-mix renders at 48 kHz had peaks ≤0.86 and no clipping; section RMS was −27 dB for the intro, −17 dB for the verse and −15 dB for the drops. The picker loaded both songs (Riptide in ~80 ms: 63 blocks, loop 0–256). With a real click on Play and seeks into the verse and drop 2, the context ran at 48 kHz, the audio clock tracked wall-clock time at a ratio of 1.000, master RMS was 0.05–0.30, and there were no console messages. **The sound itself (especially the fake-noise drums) and real-time headroom still need confirmation in the user's Chrome.**
- Commit(s): b5added

### 2026-09-27 — Fix: instrument sliders couldn't be dragged; Riptide snare lowered
- Agent/Model: Claude Opus 5.5
- What:
  - **Sliders:** the user couldn't drag sliders with the mouse. The Instrument panel's sliders were rendering **7px wide**. The label (4.5rem), value readout (4.2rem) and MIDI-learn button (added in Phase 17) shared one row inside the panel's 220px-minimum grid columns, which left the slider almost nothing. Now each `.patch-field` is two rows (label, readout and learn button on top; a full-width slider below). Mixer and effect sliders were already fine.
  - **Snare:** at the user's request, Neon Riptide's snare square partial is two octaves lower (octave 3 → 1) and the track is 20% quieter (volume 0.65 → 0.52).
  - **Live output:** the user reported that changes didn't affect playback. Checked and found no code bug: mixer, effect and patch changes reach the audio while playing. Patch changes apply from the next note, not to notes already sounding, so a long pad chord keeps its old sound until the next chord. Before this fix, the patch sliders couldn't be moved at all.
- Verified in-browser: patch sliders are 210px wide. A real mouse drag moved Osc 1 Level from 60% to 18%, with `input` events firing during the drag, and a real drag on a mixer volume slider moved it from 0.85 to 1.29. During playback with Pluck Arp soloed, setting its instrument Volume to 0 dropped master RMS from 0.027 to 0.003 (only the delay tail left), and restoring it returned 0.030. The track Vol slider behaved the same way.
- Commit(s): 4390c05

### 2026-09-29 — Neon Riptide polish: tuning and mix balance
- Agent/Model: Claude Opus 5.5
- What: The user found Riptide "not quite as nice as the original": the balance between tracks was off, and some frequencies were disharmonic. They also asked that no audio be played from now on unless explicitly requested (saved to memory). All checks were silent offline renders.
- Method: an in-page harness rendered each track solo and the full mix per section. It measured K-weighted loudness, and used FFT spectral peaks to find energy more than 20 cents off 12-TET or outside A minor. Neon Tide's five tracks measured ≤5%. The new tracks were the problem:
  - Hats: 82% off-key, because they used an F# note.
  - Kick: its filter rang at 90 Hz, between notes.
  - Snare: a +37-cent square partial.
  - Riser: ±15-cent detune, wide vibrato, and a held E against the F chord.
  - Bells: a −30-cent partial.
  - Laser: its filter rang at 150 Hz.
  - Growl: ±20-cent detune and heavy drive.
  - Wobble: a resonant sweep over a very low note brought out the flat 7th/11th harmonics.
- Fixes:
  - Pitched extras are built on G/D (G fits all four chords). Partials are in tune, and detune is ≤6 cents.
  - Resonant filters now settle on chord tones (kick A2, laser G2). The kick is shorter.
  - The wobble moved up an octave with lower resonance.
  - The master chain went back to Neon Tide's.
  - Levels were rebalanced: kick and sub down; snare, wobble, hats, bells, growl, laser and riser adjusted.
  - The pad now plays quietly under both drops for harmonic glue.
- Result (verified offline): the intro, verse, rises, breakdown and outro are as clean as Neon Tide (≤7% off-pitch, ≤3% off-key). The drops dropped from 31/29% to 19% (drop 1) and 13% (drop 2); what remains is the wobble/growl's natural harmonic series. The verse loudness is −20.4 (Neon Tide −20.3), drops are −19.9/−18.5, and peaks ≤0.78. Render load at 48 kHz with live-style scheduling is ≤0.5× real time everywhere (was 0.6×). The app loads the song with no console errors. **Not listened to:** the user needs to judge the sound.
- Method note: tuning readings below ~150 Hz are unreliable (FFT resolution ~46–77 cents per bin there; a pure sine read as "98% off"). Fast filter LFOs also create sidebands the metric counts as off-pitch.
- Commit(s): e2983dc

### 2026-09-29 — Session wrap-up
- Agent/Model: Claude Opus 5.5
- What: Closed out the session. The user is happy with the polished Neon Riptide ("basic, but it's quality... like 32 bit game music"). The working tree is clean, every `.md` is in `docs/INDEX.md`, and every code file has a companion doc. Updated `PLAN.md`'s status line with this session's work and a next-session pointer (new features; top candidates are a noise oscillator + pitch envelope and live patch updates for sounding notes). Added the live-patch-update item to the Backlog. The dev server this session had started was already stopped. No code changes.
- Standing instruction: don't play audio unless the user asks. Offline renders are fine.
- Commit(s): (this commit)

### 2026-09-29 — Noise oscillator, pitch envelope, drum presets, live patch edits
- Agent/Model: Claude Opus 5.5
- What: The user asked for polish and features at my discretion. Oscillator type `noise` (shared looping white-noise buffer, random start offset) and a per-patch pitch envelope (`amount` semitones, `decay`), with a new editor section. Seven presets: Kick, Snare, Closed Hat, Open Hat, Tom, Zap, Noise Sweep. Patch edits now reach sounding notes: `setTrackPatchParam` emits `patch:param-changed`, and each voice diffs its patch against a snapshot and retargets mix, wave, pitch, filter, sustain, LFO and volume, re-adding any pre-scheduled release. The voice gain was split into envelope (0..1) × level to make volume and tremolo live-editable.
- Verified (all offline, silent): every Neon Tide and Riptide voice rendered **bit-identical** before/after the refactor (A/B against a HEAD copy of `src/`). Live edits via `OfflineAudioContext.suspend`: volume ×0.25 gave −12 dB with the scheduled release intact, filter/sustain changes landed, an LFO switched on mid-note modulated, wave and octave changes took effect, and `refreshPatch` touched only voices sharing that patch. Presets: kick peak 0.89 sweeping ~150→50 Hz, hats 0.41, all within the instrument presets' range.
- Commit(s): c19c26b

### 2026-09-29 — Block copy/paste and playhead follow
- Agent/Model: Claude Opus 5.5
- What: Ctrl+C/X/V plus toolbar ⎘ Copy / 📋 Paste (in-memory clipboard; paste onto the selected track at the playhead, floored to the beat); `project.copyBlock` generalizes `duplicateBlock`. Timeline **Follow playhead** (default on) page-turns the scroll area while playing.
- Verified in-browser with the audio output connection blocked in the page (so nothing could sound): real Ctrl+C/Ctrl+V pasted a 12-note block at beat 200 (bar 51.1) and Ctrl+Z removed it; follow turned the page at the right edge, followed seeks and the loop wrap, and left manual scrolling alone when paused.
- Commit(s): ad82260

### 2026-09-29 — Tempo sync for delay and LFO
- Agent/Model: Claude Opus 5.5
- What: `audio/tempoSync.js` divisions (4/1 to 1/32, dotted, triplet). The delay gets a `sync` select param, resolved to `time` inside the effect chain's diff so tempo changes retime it; the LFO gets `lfo.sync` (the engine passes the tempo to voices). The effects UI now supports select params, and synced sliders are dimmed/disabled. `normalizeProject` fills missing effect params from defaults.
- Verified offline: echo arrival 1/8 @120 = 0.250 s, @100 = 0.300 s, 1/4. @120 = 0.750 s, retimed 120→60 BPM to 0.500 s; amp-LFO periods 1/4 @120 = 0.500 s, @90 = 0.667 s, 1/8 = 0.250 s, off = free rate. A seeded (reverb RNG pinned) full-song A/B of Neon Tide differed by at most 8.8e-6 (≈ −101 dBFS).
- Commit(s): f55e8a2

### 2026-09-29 — Master level meter
- Agent/Model: Claude Opus 5.5
- What: Stereo peak meter (−48 to +3 dBFS, peak hold, clip light that resets on click) in the transport bar. The mixer gained a unity `masterOutput` node, and the live engine taps it with two analysers; the meter never creates the AudioContext.
- Verified with the output connection blocked: the analysers read 0.16–0.32 peaks in Riptide's drop 2 and the meter drew about −9 dB; an over-full test tone lit the clip light and a click reset it. No overflow at 375 px. The preview pane was hidden, which pauses rAF, so the drawing was tested with a timer-based rAF shim.
- Commit(s): f9b4a44

### 2026-09-29 — Neon Pulse demo
- Agent/Model: Claude Opus 5.5
- What: A third demo showing the new features: 16 bars of house at 124 BPM in A minor (Am–G–F–Em), 11 tracks. Pitch-envelope kick following each chord's root, noise snare and hats, a tom fill, off-beat sub bass, an arp with a 1/8. synced delay, a 1/16 synced-LFO trance gate, zaps with the resonant filter tuned to E6, noise risers. The existing demos are unchanged.
- Balance: K-weighted momentary max per solo track, relative to the kick: snare −4.8, bass −3.6, arp −8.6, pads/zap about −9.5, hats −12 to −14. The master was trimmed to 0.42 to match Riptide's loudness; mix peaks ≤0.73. Render load with all notes scheduled up front ≤0.47× real time. The snare body moved from E to A after spotting E's clash with the F chord.
- **Not listened to:** needs the user's ear.
- Commit(s): becb5b5

### 2026-10-15 — Moved to GitHub; agent memory stored in the repo
- Agent/Model: Claude Opus 5.5
- What: Copied the local Claude Code auto-memory (on the Windows machine only) into `.agents/MEMORY.md`, and added a root `CLAUDE.md` that imports `.agents/CLAUDE.md` and `.agents/MEMORY.md`. Claude Code only auto-loads root-level instructions, so without that file cloud sessions wouldn't see the project rules. Pushed `master` to https://github.com/TimothyHoytBSME/SynthDaw, which was empty, using the user's local git credentials.
- Commit(s): see the commit that adds `.agents/MEMORY.md`

### 2026-10-15 — Third full review (no code changes)
- Agent/Model: Claude Fable 5.1
- What: Read every source file and ran the app headless in Chromium (page load, demo loading, transport clock, undo, phone-width layout, offline renders of all three demos; nothing was played). Wrote the findings up as "Third review (2026-10-15)" in `PLAN.md`, ranked. Highlights: Export WAV schedules every note up front, so render time grows with note count (Neon Riptide took 12.5 min headless; scheduling a bar ahead via `OfflineAudioContext.suspend()` was 2.7× faster on Neon Pulse); the metronome click runs through the master effects, so the demos' master compressor ducks the music on each click; undo/redo reset the timeline scroll; Delete with the piano roll open deletes the block; no sustain pedal; a demo load overwrites the only autosave slot. Simple wins and features are listed in the review.
- Why: The user asked for a review after pushing the repo to GitHub, looking for glaring issues, simple wins, UI improvements, bug fixes, optimizations and features.
- Commit(s): see the commit that adds the review

### 2026-10-15 — Worked the third review's list (bugs and simple wins)
- Agent/Model: Claude Fable 5.1
- What (one commit each, all verified headless in Chromium with silent offline renders; nothing was listened to):
  - **Export WAV** schedules notes a bar at a time from `OfflineAudioContext.suspend()` callbacks instead of all up front, renders at the engine's 48 kHz, and shows a percentage. Neon Pulse: 24.0 s → 8.5 s, output identical to within 1.5e-5 (seeded-random A/B against the old scheduling).
  - **Metronome** plays through a new mixer `clickInput` (master volume, no master effects); it used to go through the demos' master compressor.
  - **Scroll** of the timeline (both axes), mixer strips and page survives undo/redo/import/demo load. `replaceProjectContents` emits `project:replaced`, which settles the undo debounce so a demo load and an edit right after it are two steps (they merged before).
  - **Delete/Backspace** no longer deletes the block while its piano roll is open (`selection.js` tracks the edited block). New shortcuts: Home (seek to start), Ctrl/Cmd+S (Export JSON). Ctrl+D only claimed with a block selected.
  - **Sustain pedal** (CC 64) handled in `midiInput.js`, per channel; live polyphony 8 → 16.
  - **Mixer gains** (volume, pan, mute/solo, master) ramp over 10 ms; the first value is still set directly, so offline renders are unchanged.
  - **Loop-this-block** button; transport-bar fields follow the model; **piano-roll playhead**; **track colours** (`track.color`, swatch in the header, tints blocks/headers/strips; demos get them by index via `normalizeProject`, sound unchanged); **Mute/Solo in the track headers**, kept in step with the mixer; header width 120 → 170 px.
  - Idle rAF frames do no DOM work; the sequencer binary-searches a sorted note cache; the header shrinks below 600 px (334 → 167 px on a 375 px phone).
- Not done: review issue 6 (a demo load overwrites the only autosave slot), canvas block previews, and the feature list.
- Commit(s): 2f2defe, c74a966, 7d1a84a, 73e17f1, c879b4e, 100e278, ae4e15a, bd656a6, e30dba5

### 2026-10-15 — Neon Vortex demo (psytrance)
- Agent/Model: Claude Fable 5.1
- What: The user asked for a psytrance or glitch-hop demo. Added `demo/neonVortex.js` (**Neon Vortex**, fourth in the picker): 32 bars at 145 BPM in E minor, 11 tracks, 1413 notes, about 53 s, looped. Rolling off-beat 16th bass (custom patch: saw + square, 170 Hz lowpass with an 80 ms filter envelope) under a shortened Kick preset; 16th hats with open hats on the "and"s; an acid riff (two saws, Q 9 lowpass, filter LFO synced to 2 bars, dotted-8th delay) in E minor pentatonic; a 1/16 trance gate; Zaps on E6; squelch blips (Q 12 lowpass snap + pitch drop, triplet delay); breakdown pads; noise risers; a rising snare roll into the drop. Structure: intro → groove → break → build → drop → outro.
- Balance: measured by rendering each track solo offline at 48 kHz and taking the K-weighted momentary max (BS.1770 filters built from two biquads). First pass: bass 0.4 dB above the kick (cut to −2), acid and gate ~1–2 dB shy (raised), squelch 27 dB down because its bandpass rejected most of the square (redesigned as a resonant lowpass, then trimmed to −11). Final full mix: drop −12.3 vs Neon Pulse −12.6, peaks ≤ 0.71. Headless render load 0.56× real time with the chunked exporter.
- **Not listened to:** the user needs to judge it.
- Commit(s): see the commit adding neonVortex.js

### 2026-10-15 — Autosave backup slot, and note selection in the piano roll
- Agent/Model: Claude Fable 5.1
- What:
  - **Backup slot** (review issue 6): `replaceProjectContents` emits `project:replacing` for New/Import/Load Demo/Recover (not undo/redo); `persistence.js` saves the outgoing project under `"backup"`, and a **↩ Recover previous** button (shown once a backup exists) swaps it back. Verified: work → demo load → page reload → Recover brought the work back; recovering again swapped back; undo left the backup alone.
  - **Note selection** (the review's top feature): click / Shift-click / marquee / Ctrl+A / Esc; group drag in time and pitch with the group's delta clamped by its extremes; group resize; velocity drag applies to the whole selection (fixes stacked-chord velocity access); Delete, ↑/↓ (Shift = octave), Ctrl+C/X/V/D on notes, with paste at the playhead inside the block. Keys reach the roll through a `pianoroll:key` bus request that `keyboardShortcuts.js` sends first while a block is being edited. New `removeNotes`/`transposeNotes` in `project.js`. Found and fixed during testing: a key that re-renders the roll re-subscribed its bus listener mid-dispatch, and the new listener handled the same request again (an infinite paste loop); the handler now checks `request.handled` first.
- Verified headless: marquee selected 2 of 4 notes; dragging one moved both (+1 beat, +2 semitones); Shift+↑ raised both an octave; Ctrl+A then a velocity drag set all four to 62; Esc/click/Ctrl+C/Ctrl+V/Ctrl+D/Delete behaved; a click on empty grid still adds a note; undo kept the roll open; the block itself was never deleted. Earlier regressions (shortcuts, loop button, scroll, colours, recover) still pass.
- Commit(s): 1d54b39 (backup), and the note-selection commit

### 2026-10-15 — Track reorder, MIDI learn for mixer/transport, quantize, zoom coalescing
- Agent/Model: Claude Fable 5.1
- What: `moveTrack` + drag a track header up/down to reorder (previewed with translateY; verified Kick dragged two rows down, mixer followed, undo restored). The patch editor's learn button moved to `ui/midiLearnButton.js` and is shared: mixer Vol/Pan and master Vol learn by track position (`mixer:track:<i>:volume|pan`, `mixer:master:volume`), the transport bar has a **MIDI:** group for play/pause, stop and record (fires on the press). Verified with simulated CCs: CC 7 at 64 set track 2 to 0.756 and moved its slider, CC 20 started and CC 21 stopped the transport, patch learn still worked, all five mappings persisted in localStorage. The piano roll gained **Quantize notes** (selection or all; verified 0.13/1.1/2.4/3.9 → 0.25/1/2.5/3.5 on a 1/4 grid, last one clamped to the block). Zoom sliders coalesce their rebuild to one per frame (five input events → one rebuild; a Riptide rebuild is ≈30 ms).
- Commit(s): f928dd1, 11182b2, and the quantize/zoom commit

### 2026-10-15 — Background-tab playback fix (worker ticker)
- Agent/Model: Claude Fable 5.1
- What: The user reported that audio glitches when they navigate away from the tab and only recovers after pause/play. Cause: the transport's 25 ms `setTimeout` scheduler is throttled by Chrome in hidden tabs (once a second, once a minute after five minutes), starving the 100 ms lookahead. New `core/ticker.js` runs the interval in an inline Web Worker (not throttled that way) and the transport schedules 1 s ahead while `document.hidden`, polling immediately on `visibilitychange`. Verified headless with page timers forced to ≥1 s and the document reporting hidden: every note of Neon Vortex's drop was still scheduled (150 voices for 141 notes up to the horizon); the visible-path sequencer test still matches exactly (72 = 72). **Needs confirming in the user's Chrome** by switching tabs during playback.
- Commit(s): see the ticker commit

### 2026-10-15 — Scheduler hardened: 0.5 s / 2 s horizon through loop seams, late notes dropped
- Agent/Model: Claude Fable 5.1
- What: The user still heard glitches after the worker ticker. Headless Chromium doesn't throttle background pages, so the symptom can't be reproduced here; the likelier cause is main-thread stalls in a backgrounded or unfocused renderer exceeding the 100 ms horizon (Chrome exempts audible tabs from heavy timer throttling, so timers were probably not the whole story). `transport.js` was rewritten around an unwrapped beat frame: the anchor never moves at the loop seam, the cursor schedules straight through seams (each window stops at the next seam and carries its own frame offset), the horizon is 0.5 s visible and 2 s hidden, and `transportController.js` skips notes/clicks already more than 50 ms in the past rather than firing them in a burst. The deployed page now shows "Build: <sha>" so a stale cached copy is recognisable.
- Verified headless: voices scheduled over 2–3 loop cycles in Riptide (loop 64–72), Pulse (4–12) and Vortex (80–84) all within the exact expected range, zero late starts; clicks one beat apart across every seam; a tempo change mid-play kept clicks at the new beat length with the position continuous; seek and loop changes while running behaved. Earlier regressions pass. **Needs the user's confirmation in Chrome.**
- Commit(s): see the scheduler commit

### 2026-10-15 — Demo polish pass (all four), with velocity-sensitive filter envelopes
- Agent/Model: Claude Fable 5.1
- What: The user asked to iterate and polish every demo before adding more. Built a measurement harness (scratch, not committed): per section, K-weighted momentary loudness (max and mean), peak, energy per band (sub/low/low-mid/mid/high), the fraction of spectral-peak energy on the song's scale and more than 25 cents off any semitone, plus per-track notes/bar, velocities and unique-bar counts from the data. Findings: all demos pitch-clean (98–100% in scale) except Vortex's busy sections (85–87%, mostly noise hats and resonant sweeps; the snare roll put 9% on F); Pulse's intro was nearly as loud as its groove; Pulse/Vortex drum parts had one unique bar per section; both dance demos carry over 60% of their energy below 60 Hz.
- Engine: `patch.filter.velocitySensitivity` (0–1, default 0, "Vel → env" in the editor) scales the filter envelope by velocity; seeded A/B renders of Tide and Pulse were identical (−136 dB).
- **Neon Tide** (light touch): pad velocity swell 72/78/78/82, arp velocity sensitivity 0.5, bass walks G–E into the loop, master 0.5 → 0.55. Full sections −13.7 max.
- **Neon Pulse**: kick waits until bar 3 (intro mean −16.3 → −18.8); phrase-end fills (extra kick, snare pickup, hat swell, open-hat "a" of 4, bass octave jump), ghost snare every other bar, a Crash track (Open Hat preset, 0.9 s, reverb) on section downbeats, a snare roll out of the break, a second tom fill into the loop return, velocity sensitivity on arp (0.6) and bass (0.5), kick 0.7 → 0.64, bass 0.6 → 0.56. Groove −11.7, finale −11.9, peaks ≤ 0.74.
- **Neon Vortex**: half-beat gap before the drop (kick/bass/hats stop under the roll), second riff and G-major gate chord in the drop's second half, per-beat kick velocities, hat accent/swell variations, bass filter 170 → 240 Hz with 2 kHz envelope and velocity sensitivity 0.5, acid velocity sensitivity 0.6, snare pitch sweep 7 → 3 semitones (build's F share 9% → 5%), kick 0.75 → 0.64, bass 0.6 → 0.55, master 0.42 → 0.46. Drop −12.8, peaks ≤ 0.80.
- **Neon Riptide**: only converted hand-timed delays/LFO rates to tempo sync (the user likes it as is); section loudness identical; the sample-level A/B differs only by the 0.2 ms echo shift of exact vs rounded delay times. Noise-oscillator drums would change its sound, so not done.
- **Not listened to:** all of it needs the user's ear.
- Commit(s): a7e7be8 (engine) and the four demo commits

### 2026-10-15 — Glitch follow-up (horizon 0.2 s, audio-buffer setting) and the Neon Aurora overture
- Agent/Model: Claude Fable 5.1
- What: The user said the glitching may have got worse, happened while using the page too, and settled after a while: the signature of audio-thread CPU starvation (likely Chrome resampling the 48 kHz engine to the 192 kHz device) rather than scheduling, and a 0.5 s horizon keeps every early-scheduled voice alive on the audio thread for longer, which can only hurt. The horizon is now 0.2 s (1 s hidden). A k-rate filter-automation experiment was inconclusive (render-time noise exceeded the gain) and would alter the sound, so it was not kept. New **Audio: Low latency / Stable (more buffer)** picker in the header: a `latencyHint` kept in localStorage and applied when the AudioContext is created (reloads to apply). The picker got its own `.audio-select` class after the shared `.demo-select` class broke a test selector.
- **Neon Aurora** (`demo/neonAurora.js`): a symphonic overture at 92 BPM, 64 bars (2:47), D minor → D major, 16 tracks of synthesized orchestra, Dawn → Theme → Storm → Climax (with a breath on A7) → Hymn → Finale with a held final chord. Composed as one 8-bar theme (minor and major forms), chord tables with derived voicings, diatonic harmonies in thirds (`scaleStep`), walking cello lines, fanfare rhythms, timpani/snare rolls. First measurement pass found the contrabass and timpani an octave too low (74% of energy below 60 Hz), the timpani 10–20 dB above everything, and the 16th-note strings 11 dB too quiet because the bowed 220 ms attack never completed; fixed with octave moves, a spiccato Violas patch for the ostinato, and a full rebalance (all instruments within −20…−28 solo in the storm and hymn). Final: dawn −27 mean to climax −13 max, peaks ≤ 0.68, 98–100% in scale. **Not listened to.**
- Commit(s): the horizon/audio-buffer commit and the Neon Aurora commit

### 2026-10-15 — Dropout detector, session wrap-up
- Agent/Model: Claude Fable 5.1
- What: The user still gets garbled playback at times (after the 0.2 s horizon and with the Stable option available). Headless Chromium can't reproduce it, so instead of another blind change the level meter gained a dropout counter: each frame compares `context.currentTime` with `performance.now()`; an audio-thread underrun shows as a jump of more than 20 ms between them and is counted as "⚠ N" beside the clip light (click to reset). A stalled page thread moves both clocks together and is ignored (verified: a 400 ms busy loop added nothing; a simulated 30 ms audio-clock jump counted twice, the jump and the recovery; a clean 15 s run counted zero). The next session should start from the user's count and timing. PLAN and MEMORY updated with the diagnosis so far and the fix candidates (freeze/bounce playback first). Everything merged to master and deployed; the brain has a SynthDaw project now.
- Commit(s): see the dropout-detector commit
