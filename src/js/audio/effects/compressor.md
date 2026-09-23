# compressor.js

Thin wrapper around the built-in `DynamicsCompressorNode` — no custom dry/wet mixing (compression is normally used at unity, not blended). `setParam` is generic: it writes directly to `compressor[name]` for any of `threshold`/`ratio`/`attack`/`release`/`knee`, guarded by an `instanceof AudioParam` check rather than a hardcoded name list, since all five are native `AudioParam`s on this node. Same `{ input, output, setParam, dispose }` shape as the rest of `effects/` — see [effectChain.md](../effectChain.md).
