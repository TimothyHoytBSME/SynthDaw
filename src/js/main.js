import { initAudioEngine, getPatch, setPatch } from "./audio/audioEngine.js";
import { initMIDIInput } from "./midi/midiInput.js";
import { renderPianoTrigger } from "./ui/pianoTrigger.js";
import { renderMIDIStatus } from "./ui/midiStatus.js";
import { renderPatchEditor } from "./ui/patchEditor.js";

function init() {
  initAudioEngine();
  renderPianoTrigger(document.getElementById("piano-trigger"));
  renderMIDIStatus(document.getElementById("midi-status"));
  renderPatchEditor(document.getElementById("patch-editor"), { getPatch, setPatch });
  initMIDIInput();
}

document.addEventListener("DOMContentLoaded", init);
