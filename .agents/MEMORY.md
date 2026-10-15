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

## Playback glitches on the user's machine (open, 2026-10-15)
- The user hears garbled playback at times, also while actively using the page, settling after a while. It did not improve with a worker-based scheduler ticker, got worse with a 0.5 s scheduling horizon (now 0.2 s), and headless Chromium cannot reproduce it (it doesn't throttle background pages, and timers run normally). Current best guess: audio-thread CPU starvation, with Chrome resampling the 48 kHz engine to the 192 kHz device. Things to ask the user to try: the **Audio: Stable** picker (bigger buffer, reloads), setting the Windows output device to 48 kHz, and reading the level meter's **⚠ N** dropout counter while it happens.
- Don't widen the scheduling look-ahead to "fix" glitches: every early-scheduled voice is live on the audio thread for that much longer.

## Deployment and testing
- Live app: https://timothyhoytbsme.github.io/SynthDaw/ via `.github/workflows/pages.yml` on every push to master (the github-pages environment rejects other branches). The page header shows "Build: <sha>" so a stale CDN copy (up to ~10 min) is recognisable. The proxy in cloud sessions can't fetch github.io, so verify deploys through the Actions API.
- Cloud sessions can run the app headless: `python tools/devServer.py 4329`, then Playwright from `/opt/node-tools/node_modules/playwright` (CommonJS: `import pw from ...; const { chromium } = pw`). Accept the demo picker's confirm dialog (`page.on("dialog", d => d.accept())`) or the demo silently doesn't load. Import modules with a `?v=` cache-buster after edits.
- Silent verification that worked well: offline renders with seeded `Math.random` for A/B (identical code gives RMS diffs of about −135 dB; exact-vs-rounded delay times give −33 dB from the echo shift alone); K-weighted momentary loudness (two biquads: highshelf +3.99 dB at 1681.97 Hz, highpass 38.13 Hz) per section and per solo track for balance; spectral peaks mapped to pitch classes for in-scale and off-tune fractions. Headless render-time ratios are noisy (±30%) and only comparable within one sequential run.
- The user's working branch for cloud sessions is `claude/<name>`; master is kept fast-forwarded to it after each verified batch.
