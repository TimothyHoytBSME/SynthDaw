# mixer.js

Renders one channel strip per track plus a master strip. Tracks get volume/pan sliders and mute/solo buttons, and every strip gets an effects rack (`renderEffectsSection`, shared by track and master) generated from [effectTypes.js](../audio/effectTypes.md)'s `paramDefs`.

Every control only calls a [project.js](../core/project.md) mutator. The audio graph follows via [audioEngine.js](../audio/audioEngine.md)'s project sync, so this file never imports audio code. Select params (the delay's Sync) render as dropdowns, and `syncedBy` sliders are disabled while synced. Effect param sliders update in place (no re-render, so focus and scroll are kept). Adding or removing an effect re-renders just that rack.

Re-renders all strips on `project:tracks-changed` (emitted by [timeline.js](./timeline.md) on track add/remove/rename). `renderMixer` returns an unsubscribe disposer, which [main.js](../main.md) calls before any full re-render so listeners don't stack.
