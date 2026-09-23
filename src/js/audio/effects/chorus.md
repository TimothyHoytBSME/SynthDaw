# chorus.js

Modulated-delay chorus: a short `DelayNode` (base 15ms) whose `delayTime` is continuously modulated by an always-running LFO (`rate`/`depth`), blended with dry via `mix`. The LFO is created and `start()`ed once at construction — unlike [voice.js](../voice.md)'s per-note LFO, this one lives for the effect's whole lifetime and only stops in `dispose()`. Same `{ input, output, setParam, dispose }` shape as the rest of `effects/` — see [effectChain.md](../effectChain.md).
