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
- Commit(s): (pending)
