# effectChain.js

An ordered series of effect instances between one `input` `GainNode` and a fixed `destination` given at creation. Every effect factory ([effects/](effects/), registered in [effectTypes.js](./effectTypes.md)) has the same `{ input, output, setParam, dispose }` shape, so the chain can wire them generically.

API: `input`, `sync(descriptors, tempo)`, `dispose()`. `descriptors` is the project's plain effect list (`[{ id, type, params, bypassed }]`, see [project.js](../core/project.md)).

**`sync` is a reconciler:** if the chain's *structure* changed (the `id:type` sequence differs: an effect was added, removed or reordered), it disposes every stage and rebuilds. Otherwise it diffs each stage against its descriptor and applies only what changed: `setParam` for params, and a `rewire()` for bypass. Diffs run on *resolved* params (`resolveEffectParams`), so a tempo change reaches a tempo-synced delay as an ordinary `time` change. A slider drag therefore costs one `setParam` call per event. Before Phase 13 every drag event rebuilt every node, which audibly glitched, especially Reverb, which regenerates its impulse response.

`rewire()` disconnects everything and reconnects `input -> stage1 -> ... -> destination`, skipping bypassed stages. Those stay instantiated with their params, just disconnected.
