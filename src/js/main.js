import { initAudioEngine } from "./audio/audioEngine.js";
import { renderPianoTrigger } from "./ui/pianoTrigger.js";

function init() {
  initAudioEngine();
  renderPianoTrigger(document.getElementById("piano-trigger"));
}

document.addEventListener("DOMContentLoaded", init);
