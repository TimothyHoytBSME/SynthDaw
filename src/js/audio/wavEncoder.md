# wavEncoder.js

`audioBufferToWavBlob(audioBuffer)`: encodes a Web Audio `AudioBuffer` (the result of [exportRender.js](./exportRender.md)'s offline render) as an uncompressed 16-bit PCM WAV file — the standard 44-byte RIFF/WAVE header followed by interleaved, clamped-to-`[-1,1]` sample data. There's no Web Audio API for this (`OfflineAudioContext` gives you raw float samples, not a file), so this is a from-scratch implementation of a well-known, fixed format — no external encoding library needed for something this simple and stable.
