# levelMeter.js

`createLevelMeter()` returns `{ element, dispose }`: a small stereo peak meter for the master output, shown in the [transport bar](./transportBar.md).

- Reads [audioEngine.js](../audio/audioEngine.md)'s `getMasterAnalysers()` (a `[left, right]` side tap on the mixer's `masterOutput`, the last node before the speakers, i.e. after master volume and master effects). Before audio has started that's `null`, and the meter draws its empty background once and then idles (the rAF loop keeps polling but touches the canvas only once audio exists), so it never creates the `AudioContext`.
- Scale −48 to +3 dBFS on a 96px canvas (device-pixel-ratio aware), green / yellow from −12 dB / red from −3 dB, with a 0 dBFS tick.
- Peak per animation frame from `getFloatTimeDomainData` (2048 samples ≈ 43 ms, longer than a frame, so no peaks are missed). A white hold marker stays for 1 s, then falls at 20 dB/s.
- **Clip light:** red for 2 s after any sample reaches ±1.0; clicking the meter resets it.
- **Dropout counter (2026-10-15):** every frame, `context.currentTime` minus `performance.now()` (read together; the rAF timestamp lags after a long frame) is compared with the previous frame's value. The audio thread keeping up means a steady difference; an underrun (heard as a crackle or garbled stretch) shows as a jump of more than 20 ms, counted and shown as "⚠ N" beside the clip light (click to reset). A stalled page thread moves both clocks together and doesn't count, and frames where the audio clock didn't advance are ignored. Added to turn the user's "garbled at times" reports into data: whether the count climbs in dense passages (audio-thread CPU) or with UI actions (page thread).
- Own `requestAnimationFrame` loop (cancelled by `dispose`). rAF doesn't run while the page is hidden, so the meter pauses too.
