import { bus } from "../core/eventBus.js";
import { getSelectedTrack, getSelectedBlock } from "../core/selection.js";
import {
  copySelectedBlock,
  hasClipboardBlock,
  pasteBlock,
  duplicateSelectedBlock,
  deleteSelectedBlock,
  transposeSelectedBlock,
  transposeSelectedBlockByOctaves,
  loopSelectedBlock,
} from "../core/blockActions.js";
import { formatPosition } from "./transportBar.js";

const MESSAGE_DURATION_MS = 4000;
const MAX_OCTAVES = 10;
const HINT =
  "Double-click a lane to add a block. Click a block to select it, drag to move (also between tracks).";

function button(label, title, onClick) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.title = title;
  element.addEventListener("click", onClick);
  return element;
}

// Actions for the selected block: edit, duplicate, transpose (by X octaves or ±1 semitone),
// delete. With nothing selected it shows a short how-to hint instead, so the row never
// collapses and shifts the timeline below it. Returns `{ element, dispose }`.
export function createBlockToolbar(project, { onEditNotes }) {
  const bar = document.createElement("div");
  bar.className = "block-toolbar";

  const label = document.createElement("span");
  label.className = "block-toolbar-label";

  const actions = document.createElement("div");
  actions.className = "block-toolbar-actions";

  const octaveCount = document.createElement("input");
  octaveCount.type = "number";
  octaveCount.min = "1";
  octaveCount.max = String(MAX_OCTAVES);
  octaveCount.step = "1";
  octaveCount.value = "1";
  octaveCount.className = "block-toolbar-octaves";
  octaveCount.setAttribute("aria-label", "Octaves to transpose by");

  function octaves() {
    const value = Math.round(Number(octaveCount.value));
    return Math.min(MAX_OCTAVES, Math.max(1, Number.isFinite(value) ? value : 1));
  }

  const transposeGroup = document.createElement("span");
  transposeGroup.className = "block-toolbar-group";
  transposeGroup.append(
    "Transpose",
    button("▼ Oct", "Transpose down by the octave count (Shift+↓ for one octave)", () =>
      transposeSelectedBlockByOctaves(project, -octaves()),
    ),
    octaveCount,
    button("▲ Oct", "Transpose up by the octave count (Shift+↑ for one octave)", () =>
      transposeSelectedBlockByOctaves(project, octaves()),
    ),
    button("−1 st", "Transpose down one semitone (↓)", () => transposeSelectedBlock(project, -1)),
    button("+1 st", "Transpose up one semitone (↑)", () => transposeSelectedBlock(project, 1)),
  );

  actions.append(
    button("✎ Edit notes", "Open in the piano roll (or double-click the block)", () => {
      const block = getSelectedBlock(project);
      if (block) {
        onEditNotes(getSelectedTrack(project), block);
      }
    }),
    button("⧉ Duplicate", "Duplicate after itself (Ctrl+D)", () => duplicateSelectedBlock(project)),
    button("⎘ Copy", "Copy block (Ctrl+C; Ctrl+X cuts)", () => copySelectedBlock(project)),
    button("⟲ Loop", "Loop this block: set the loop range to its bounds and enable looping", () =>
      loopSelectedBlock(project),
    ),
    transposeGroup,
    button("🗑 Delete", "Delete block (Delete)", () => deleteSelectedBlock(project)),
  );

  const message = document.createElement("span");
  message.className = "block-toolbar-message";
  message.setAttribute("role", "status");
  let messageTimer = null;

  // Outside `actions` so it's also there with no block selected (paste needs only a track).
  const pasteButton = button("📋 Paste", "Paste the copied block at the playhead on the selected track (Ctrl+V)", () =>
    pasteBlock(project),
  );

  bar.append(label, actions, pasteButton, message);

  function refresh() {
    const block = getSelectedBlock(project);
    actions.hidden = !block;
    pasteButton.hidden = !hasClipboardBlock() || !getSelectedTrack(project);
    if (!block) {
      label.textContent = HINT;
      return;
    }
    const track = getSelectedTrack(project);
    const where = formatPosition(block.startBeat, project.timeSignature.beatsPerBar);
    label.textContent = `${track.name} · block at ${where} · ${block.notes.length} note${block.notes.length === 1 ? "" : "s"}`;
  }

  function showMessage({ text }) {
    message.textContent = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => (message.textContent = ""), MESSAGE_DURATION_MS);
  }

  const unsubscribers = [
    bus.on("selection:changed", refresh),
    bus.on("project:changed", refresh),
    bus.on("status:message", showMessage),
    bus.on("clipboard:changed", refresh),
  ];
  refresh();

  return {
    element: bar,
    dispose() {
      clearTimeout(messageTimer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
  };
}
