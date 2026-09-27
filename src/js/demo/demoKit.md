# demoKit.js

Plain-data builders shared by the demo songs ([demoSong.js](./demoSong.md), [neonRiptide.js](./neonRiptide.md)): `note()`, `block()`, `effect()` (fills in [effect defaults](../audio/effectTypes.md) under your overrides) and `track()`. Together they produce the same shapes as [project.js](../core/project.md).

`resetDemoIds()` restarts the id counter. Each demo calls it first, so a freshly built song always numbers its ids from 1. `replaceProjectContents` runs `syncIdCounter` afterwards, so later edits never collide with them.
