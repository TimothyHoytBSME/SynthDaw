# delay.js

Feedback delay effect: `input` splits into a dry path and a `DelayNode` path with a feedback loop (`delayNode -> feedbackGain -> delayNode`) for repeats, both summing at `output`. Params: `time` (delay in seconds, up to 2s), `feedback` (0–0.9; keep below 1 or repeats grow forever), `mix` (dry/wet balance). Same shape as every other file in `effects/`: exports one factory returning `{ input, output, setParam(name, value), dispose() }` — see [effectChain.md](../effectChain.md) for how these get wired together and why the interface is this specific shape.
