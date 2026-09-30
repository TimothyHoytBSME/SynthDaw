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
