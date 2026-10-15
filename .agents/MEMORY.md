# Agent Memory

Durable facts and user preferences that agents learned while working on SynthDaw. They aren't obvious from the code. Until 2026-10-15 these lived only in Claude Code's local auto-memory on the user's Windows machine. They're copied here so that cloud and remote sessions have them too.

Add to this file when you learn something that should outlive your session. Don't duplicate what CLAUDE.md, PLAN.md, LOG.md or the code already record.

## Session start
- Before any task, read [CLAUDE.md](CLAUDE.md) (spec and rules) and the tail of [LOG.md](LOG.md) (recent decisions and open threads). Skim [PLAN.md](PLAN.md) for phase status and the backlog. The user asked for this explicitly (2026-09-22).

## Audio: never play it unless asked
- Don't play audible audio unless the user explicitly asks. That includes the Play button, live AudioContext playback, piano-roll or key previews, and the metronome. The user works on the same machine, and preview-pane audio interferes with what they're doing (2026-09-29).
- Silent verification that works:
  - `OfflineAudioContext` renders, for levels, spectra and DSP load.
  - Live tests with the output cut off. Monkeypatch `AudioNode.prototype.connect` to drop connections to `AudioDestinationNode`.
  - The reverb's impulse response uses `Math.random`. Seed `Math.random` to get a deterministic full-mix A/B.
  - A hidden preview pane pauses `requestAnimationFrame`. Use a timer-based rAF shim to test drawing code.
- Report sounds that only offline checks have verified as "not listened to", so the user knows to judge them by ear.

## Audio: the preview pane is not the user's Chrome
- The in-app preview pane grants audio without a user gesture. The user's Chrome enforces the autoplay policy, and it records mouse activation at `mousedown`, not `pointerdown`. The AudioContext must be created lazily, from a gesture.
- The user's output device runs at **192 kHz**. A real-time overload the pane tolerated silenced their Chrome completely. The engine is pinned to 48 kHz (`ENGINE_SAMPLE_RATE` in `src/js/audio/audioEngine.js`).
- For playback changes, measure against real-time deadlines:
  - offline render time ÷ audio duration;
  - `ctx.currentTime` against the wall clock;
  - an analyser on the master bus.
- Say explicitly that a playback change still needs confirming in the user's Chrome. Ask before driving their Chrome; they haven't taken up that offer.

## Environment
- Dev server: `python tools/devServer.py 4329` (no-store static server; `.claude/launch.json` names it `synthdaw-dev`). On the Windows machine the user often already has it running at http://localhost:4329, so check before starting another.
- If an edited module seems not to take effect, the page may be running a cached copy. Reload the page, or import it with a `?v=` cache-buster.
- Windows Git Bash: a heredoc containing "…" fails to parse, even with a quoted delimiter, and nothing in the command runs. Write multi-line edit scripts to a scratch `.py` file instead. A stray `cat > /dev/null` with no stdin hangs until the timeout.

## Repo
- GitHub: https://github.com/TimothyHoytBSME/SynthDaw (pushed 2026-10-15). The working branch is `master`.
- Commits are scoped checkpoints. Agents end their messages with a `Co-Authored-By:` line for the model.
- The user likes the Neon Riptide demo, so don't change its sound without asking. Two backlog fixes would change how existing demos sound: the distortion gain jump, and track volume sitting before the effects. Check with the user before doing either.
