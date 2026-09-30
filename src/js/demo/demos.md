# demos.js

`DEMOS` lists every built-in demo song as `{ name, description, create }`, in the order the header's **Load Demo…** picker shows them ([projectControls.js](../ui/projectControls.md)). `create()` returns a complete, fresh project.

Current entries: **Neon Tide** ([demoSong.js](./demoSong.md), the original 16-bar demo) **Neon Riptide** ([neonRiptide.js](./neonRiptide.md), a 64-bar extended remix) and **Neon Pulse** ([neonPulse.js](./neonPulse.md), a 16-bar house loop built on the drum presets and tempo sync). To add a demo, write a module exporting a `create…Project()` function and append it here.
