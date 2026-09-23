# project.js

The project data model: `Project { tempo, timeSignature: { beatsPerBar }, tracks: [] }`, `Track { id, name, blocks: [] }`, `Block { id, startBeat, lengthBeats }`. Plain data, no Web Audio/DOM references — mutated in place by the exported functions (`addTrack`, `removeTrack`, `addBlock`, `removeBlock`, `moveBlock`, `resizeBlock`) rather than returning new copies, since [timeline.js](../ui/timeline.md) re-renders from the same object after every mutation.

Blocks are pure time regions for now — no note content. Piano-roll note data gets added to blocks in a later phase; this file's shape will need a `notes` array on `Block` at that point. IDs are a simple incrementing counter (`track-1`, `block-1`, ...), unique for the page's lifetime — fine for an in-memory single-session project, but will need revisiting once projects can be saved/reloaded (Phase 9) without ID collisions across sessions.
