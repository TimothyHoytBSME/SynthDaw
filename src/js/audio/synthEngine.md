# synthEngine.js

Polyphony manager sitting between [audioEngine.js](./audioEngine.md) and [voice.js](./voice.md): tracks one active voice per note number, enforces `MAX_VOICES` (8) via oldest-voice stealing (insertion-order, not fixed — a stolen/retriggered voice always gets a fast forced release via `voice.stop(true)`, never a hard cut), and holds the current [patch](./patch.md) that new voices are built from. `setPatch()` only affects voices created *after* the call — already-sounding notes keep the patch they started with, which is standard synth-engine behavior and avoids retroactively distorting live envelopes.

Re-pressing an already-sounding note (`noteOn` called again before its `noteOff`) retriggers: the old voice is force-stopped and a new one starts, rather than being ignored or stacked.
