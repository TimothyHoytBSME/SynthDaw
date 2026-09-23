import { getTransport } from "./transportController.js";
import { undo, redo } from "./history.js";

const TEXT_INPUT_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

function isTypingInField() {
  return TEXT_INPUT_TAGS.has(document.activeElement?.tagName);
}

function handleKeydown(event) {
  if (isTypingInField()) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    const transport = getTransport();
    if (transport.isRunning()) {
      transport.pause();
    } else {
      transport.play();
    }
    return;
  }

  const primaryModifier = event.ctrlKey || event.metaKey;
  if (!primaryModifier) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "z" && event.shiftKey) {
    event.preventDefault();
    redo();
  } else if (key === "z") {
    event.preventDefault();
    undo();
  } else if (key === "y") {
    event.preventDefault();
    redo();
  }
}

export function initKeyboardShortcuts() {
  window.addEventListener("keydown", handleKeydown);
}
