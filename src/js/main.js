import { initAudioEngine, attachProject, getPatch, setPatch } from "./audio/audioEngine.js";
import { initMIDIInput } from "./midi/midiInput.js";
import { createProject, addTrack, syncIdCounter, normalizeProject } from "./core/project.js";
import { setProject, initTransportController } from "./core/transportController.js";
import { loadProject, initAutosave } from "./core/persistence.js";
import { initHistory } from "./core/history.js";
import { initKeyboardShortcuts } from "./core/keyboardShortcuts.js";
import { renderPianoTrigger } from "./ui/pianoTrigger.js";
import { renderMIDIStatus } from "./ui/midiStatus.js";
import { renderPatchEditor } from "./ui/patchEditor.js";
import { renderTimeline } from "./ui/timeline.js";
import { renderMixer } from "./ui/mixer.js";
import { renderProjectControls } from "./ui/projectControls.js";

async function init() {
  initAudioEngine();
  renderPianoTrigger(document.getElementById("piano-trigger"));
  renderMIDIStatus(document.getElementById("midi-status"));
  renderPatchEditor(document.getElementById("patch-editor"), { getPatch, setPatch });
  initMIDIInput();

  let project;
  try {
    project = await loadProject();
  } catch {
    project = null;
  }
  if (project) {
    normalizeProject(project);
    syncIdCounter(project);
  } else {
    project = createProject();
    addTrack(project, { name: "Track 1" });
  }
  attachProject(project);
  initTransportController();
  setProject(project);

  const timelineContainer = document.getElementById("timeline");
  const mixerContainer = document.getElementById("mixer");
  let disposers = [];

  // Full re-render, used at startup and whenever the project is replaced wholesale (New,
  // Import, undo/redo). Each view returns a disposer so re-rendering never stacks listeners.
  function renderProjectUI() {
    disposers.forEach((dispose) => dispose());
    timelineContainer.innerHTML = "";
    mixerContainer.innerHTML = "";
    disposers = [renderTimeline(timelineContainer, project), renderMixer(mixerContainer, project)];
  }

  renderProjectUI();
  renderProjectControls(document.getElementById("project-controls"), project, renderProjectUI);
  initAutosave(() => project);
  initHistory(project, renderProjectUI);
  initKeyboardShortcuts();

  // Debug/verification handle for the browser console; nothing in the app reads it.
  window.synthDaw = { project };
}

document.addEventListener("DOMContentLoaded", init);
