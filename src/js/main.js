import { initAudioEngine } from "./audio/audioEngine.js";
import { initMIDIInput } from "./midi/midiInput.js";
import { renderPianoTrigger } from "./ui/pianoTrigger.js";
import { renderMIDIStatus } from "./ui/midiStatus.js";

function init() {
  initAudioEngine();
  renderPianoTrigger(document.getElementById("piano-trigger"));
  renderMIDIStatus(document.getElementById("midi-status"));
  initMIDIInput();
}

document.addEventListener("DOMContentLoaded", init);
