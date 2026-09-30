# tempoSync.js

Note divisions for tempo-synced parameters: `SYNC_DIVISIONS` (`off`, `4/1` … `1/32`, with dotted `.` and triplet `t` variants) and `syncedSeconds(division, tempo)`, which returns the length of one division in seconds, or `null` for `off`/unknown values (callers then use the free value).

Used by the delay effect's `sync` param (resolved to `time` in [effectTypes.js](./effectTypes.md)) and the LFO's `lfo.sync` ([voice.js](./voice.md), rate = 1 / synced seconds). The option list feeds both editors' dropdowns.
