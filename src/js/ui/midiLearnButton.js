import { startLearning, cancelLearning, clearMapping, getLearnTarget, getMappedController } from "../midi/midiMap.js";

// Small MIDI-learn button for any control: click, then move a controller knob/slider (or press
// a button) to map it to `target`. Clicking again while waiting cancels and clears the mapping.
// Returns `{ element, refresh }`; the owning view calls `refresh()` on `midimap:changed`.
export function createLearnButton(target) {
  const learnButton = document.createElement("button");
  learnButton.type = "button";
  learnButton.className = "patch-learn";

  function refresh() {
    const learning = getLearnTarget() === target;
    const controller = getMappedController(target);
    learnButton.classList.toggle("patch-learn--learning", learning);
    learnButton.classList.toggle("patch-learn--mapped", controller !== null);
    learnButton.textContent = learning ? "…" : controller !== null ? `CC${controller}` : "MIDI";
    learnButton.title = learning
      ? "Move a knob/slider (or press a button) on your MIDI controller to map it (click again to cancel and unmap)"
      : "MIDI learn: click, then move a controller knob/slider or press a button";
  }

  learnButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (getLearnTarget() === target) {
      cancelLearning();
      clearMapping(target);
    } else {
      startLearning(target);
    }
  });
  refresh();
  return { element: learnButton, refresh };
}
