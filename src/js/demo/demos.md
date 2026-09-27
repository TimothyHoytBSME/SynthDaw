# demos.js

`DEMOS` lists every built-in demo song as `{ name, description, create }`, in the order the header's **Load Demo…** picker shows them ([projectControls.js](../ui/projectControls.md)). `create()` returns a complete, fresh project.

Current entries: **Neon Tide** ([demoSong.js](./demoSong.md), the original 16-bar demo) and **Neon Riptide** ([neonRiptide.js](./neonRiptide.md), a 64-bar extended remix). To add a demo, write a module exporting a `create…Project()` function and append it here.
