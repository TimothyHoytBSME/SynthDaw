import { createDemoProject } from "./demoSong.js";
import { createNeonRiptideProject } from "./neonRiptide.js";
import { createNeonPulseProject } from "./neonPulse.js";
import { createNeonVortexProject } from "./neonVortex.js";

// Every built-in demo song, in the order the header's demo picker lists them.
export const DEMOS = [
  { name: "Neon Tide", description: "16-bar synthwave loop (the original demo)", create: createDemoProject },
  { name: "Neon Riptide", description: "64-bar extended remix with drums and a dubstep drop", create: createNeonRiptideProject },
  { name: "Neon Pulse", description: "16-bar house loop: noise drums, pitch-envelope kick, tempo-synced gate and delays", create: createNeonPulseProject },
  { name: "Neon Vortex", description: "32-bar psytrance loop: rolling off-beat bass, acid riff with a synced filter sweep, trance gate", create: createNeonVortexProject },
];
