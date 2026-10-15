# SynthDaw

A browser-based Digital Audio Workstation focused on from-scratch synthesis and MIDI. Runs in Chrome on Windows, Linux, and (eventually) Android; fully responsive; mouse/touch first; MIDI controller compatible.

- Full project spec and agent operating rules: [.agents/CLAUDE.md](.agents/CLAUDE.md)
- Development roadmap: [.agents/PLAN.md](.agents/PLAN.md)
- Notable-action history: [.agents/LOG.md](.agents/LOG.md)
- Durable agent memory: [.agents/MEMORY.md](.agents/MEMORY.md)
- Document index: [docs/INDEX.md](docs/INDEX.md)

## Stack

Vanilla HTML/CSS/JS (ES modules, no framework). No build step is required to run the app; any static file server works for local development.

## Status

Working DAW: tracks and blocks with a piano roll, a per-track 2-oscillator subtractive synth (with a noise oscillator, pitch envelope and tempo-synced LFO) with instrument and drum presets, live patch editing of sounding notes, effects (with tempo-synced delay) and a mixer with a master level meter, looping, block copy/paste, playhead follow, recording from MIDI or the computer keyboard, MIDI learn and pitch bend, undo/redo, autosave, and JSON/WAV export. Pick a song from **Load Demo…** in the header: **Neon Tide**, a 16-bar song that shows off the features ([demoSong.md](src/js/demo/demoSong.md)), **Neon Riptide**, its 64-bar extended remix with drums and a dubstep drop ([neonRiptide.md](src/js/demo/neonRiptide.md)), or **Neon Pulse**, a house loop built on the drum presets and tempo sync ([neonPulse.md](src/js/demo/neonPulse.md)). See [.agents/PLAN.md](.agents/PLAN.md) for phase status and the backlog.

Run it with any static file server over `src/`, e.g. `python tools/devServer.py` and then open http://localhost:4329.
