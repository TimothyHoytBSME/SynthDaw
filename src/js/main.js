import { initAudioEngine, getPatch, setPatch } from "./audio/audioEngine.js";
import { initMIDIInput } from "./midi/midiInput.js";
import { createProject, addTrack } from "./core/project.js";
import { setProject } from "./core/transportController.js";
import { renderPianoTrigger } from "./ui/pianoTrigger.js";
import { renderMIDIStatus } from "./ui/midiStatus.js";
import { renderPatchEditor } from "./ui/patchEditor.js";
import { renderTimeline } from "./ui/timeline.js";

function init() {
  initAudioEngine();
  renderPianoTrigger(document.getElementById("piano-trigger"));
  renderMIDIStatus(document.getElementById("midi-status"));
  renderPatchEditor(document.getElementById("patch-editor"), { getPatch, setPatch });
  initMIDIInput();

  const project = createProject();
  addTrack(project, { name: "Track 1" });
  setProject(project);
  renderTimeline(document.getElementById("timeline"), project);
}

document.addEventListener("DOMContentLoaded", init);
