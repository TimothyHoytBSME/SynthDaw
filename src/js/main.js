import { initAudioEngine, attachProject } from "./audio/audioEngine.js";
import { initMIDIInput } from "./midi/midiInput.js";
import { initMIDIMap } from "./midi/midiMap.js";
import { initRecorder } from "./core/recorder.js";
import { createProject, addTrack, syncIdCounter, normalizeProject } from "./core/project.js";
import { setProject, initTransportController } from "./core/transportController.js";
import { loadProject, initAutosave } from "./core/persistence.js";
import { initHistory } from "./core/history.js";
import { initKeyboardShortcuts } from "./core/keyboardShortcuts.js";
import { initComputerKeyboard } from "./ui/computerKeyboard.js";
import { renderMIDIStatus } from "./ui/midiStatus.js";
import { renderPatchEditor } from "./ui/patchEditor.js";
import { renderTimeline } from "./ui/timeline.js";
import { renderMixer } from "./ui/mixer.js";
import { renderProjectControls } from "./ui/projectControls.js";

async function init() {
  initAudioEngine();
  initComputerKeyboard(document.getElementById("keyboard-status"));
  renderMIDIStatus(document.getElementById("midi-status"));
  initMIDIInput();
  initMIDIMap();

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
  initRecorder(project);

  const timelineContainer = document.getElementById("timeline");
  const mixerContainer = document.getElementById("mixer");
  const patchEditorContainer = document.getElementById("patch-editor");
  let disposers = [];

  // Full re-render, used at startup and whenever the project is replaced wholesale (New,
  // Import, undo/redo). Each view returns a disposer so re-rendering never stacks listeners.
  // Each view also keeps its own scroll position across the rebuild; the page scroll is kept
  // here, since emptying the containers momentarily shortens the page.
  const main = document.querySelector("main");
  function renderProjectUI() {
    const pageScrollTop = main.scrollTop;
    disposers.forEach((dispose) => dispose());
    for (const container of [timelineContainer, mixerContainer, patchEditorContainer]) {
      container.innerHTML = "";
    }
    disposers = [
      renderTimeline(timelineContainer, project),
      renderPatchEditor(patchEditorContainer, project),
      renderMixer(mixerContainer, project),
    ];
    main.scrollTop = pageScrollTop;
  }

  renderProjectUI();
  renderProjectControls(document.getElementById("project-controls"), project, renderProjectUI);
  initAutosave(() => project);
  initHistory(project, renderProjectUI);
  initKeyboardShortcuts(project);

  // Debug/verification handle for the browser console; nothing in the app reads it.
  window.synthDaw = { project };
}

document.addEventListener("DOMContentLoaded", init);
