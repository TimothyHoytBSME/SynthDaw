# eventBus.js

The publish/subscribe mechanism that decouples the audio/data layer from the UI layer (see "Architecture decisions" in [.agents/PLAN.md](../../../.agents/PLAN.md)). Exports the `EventBus` class and a shared singleton `bus`. UI modules `emit()` intent events (e.g. `note:on`); model/audio modules `on()` them and never import UI code directly. `on()` returns an unsubscribe function.

No event names are enumerated/typed here on purpose — keep this file generic. As the event surface grows, consider documenting the event contract (name → payload shape) in this file rather than adding validation logic.
