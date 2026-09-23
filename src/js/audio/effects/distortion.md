# distortion.js

Waveshaping distortion: a `WaveShaperNode` driven by a curve generated from `params.drive` (the standard `(π+k)x / (π+k|x|)` soft-clip formula, `k = drive * 100`), blended with the dry signal via `mix`. `oversample: "2x"` reduces aliasing from the nonlinearity. Regenerating the curve (a 4096-sample `Float32Array`) on every `setParam("drive", ...)` call is cheap enough to do on every slider `input` event without debouncing. Same `{ input, output, setParam, dispose }` shape as the rest of `effects/` — see [effectChain.md](../effectChain.md).
