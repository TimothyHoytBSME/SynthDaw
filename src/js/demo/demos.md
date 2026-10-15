# demos.js

`DEMOS` lists every built-in demo song as `{ name, description, create }`, in the order the header's **Load Demo…** picker shows them ([projectControls.js](../ui/projectControls.md)). `create()` returns a complete, fresh project.

Current entries: **Neon Tide** ([demoSong.js](./demoSong.md), the original 16-bar demo) **Neon Riptide** ([neonRiptide.js](./neonRiptide.md), a 64-bar extended remix) **Neon Pulse** ([neonPulse.js](./neonPulse.md), a 16-bar house loop built on the drum presets and tempo sync) **Neon Vortex** ([neonVortex.js](./neonVortex.md), a 32-bar psytrance loop: rolling off-beat bass, acid riff, trance gate) and **Neon Aurora** ([neonAurora.js](./neonAurora.md), a 64-bar symphonic overture, D minor to D major, not a loop). To add a demo, write a module exporting a `create…Project()` function and append it here.
