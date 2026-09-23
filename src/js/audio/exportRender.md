# exportRender.js

Offline render of the whole project to an `AudioBuffer` (then [wavEncoder.js](./wavEncoder.md) -> file). It builds a throwaway [synthEngine](./synthEngine.md) plus a [mixer](./mixer.md) on an `OfflineAudioContext`, calls `mixer.syncProject(project)`, and schedules every note from [`playableNotes`](../core/project.md), clipped to block bounds just like live playback. This needs no DSP duplication because every audio module takes its `AudioContext` as a parameter. Keep them context-agnostic: a module that reaches for the live context would silently render into the wrong graph.

Length = the last playable note's end + `RELEASE_TAIL_SECONDS` (2s), with a minimum of 1s.
