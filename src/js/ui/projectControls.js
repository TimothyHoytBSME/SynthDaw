import { bus } from "../core/eventBus.js";
import { serializeProject, parseProject, replaceProjectContents, addTrack } from "../core/project.js";
import { resetMixer, getPatch } from "../audio/audioEngine.js";
import { renderProjectToBuffer } from "../audio/exportRender.js";
import { audioBufferToWavBlob } from "../audio/wavEncoder.js";

const DOWNLOAD_FILENAME = "synthdaw-project.json";
const WAV_FILENAME = "synthdaw-export.wav";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function renderProjectControls(container, project, onReplaced) {
  const newButton = document.createElement("button");
  newButton.type = "button";
  newButton.textContent = "New Project";
  newButton.addEventListener("click", () => {
    if (!window.confirm("Start a new project? Unsaved changes will be lost.")) {
      return;
    }
    replaceProjectContents(project, { tracks: [], master: { volume: 0.2, effects: [] }, loop: { enabled: false, startBeat: 0, endBeat: 8 }, tempo: 120, timeSignature: { beatsPerBar: 4 } });
    addTrack(project, { name: "Track 1" });
    resetMixer();
    onReplaced();
  });

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "Export JSON";
  exportButton.addEventListener("click", () => {
    downloadBlob(new Blob([serializeProject(project)], { type: "application/json" }), DOWNLOAD_FILENAME);
  });

  const exportWavButton = document.createElement("button");
  exportWavButton.type = "button";
  exportWavButton.textContent = "Export WAV";
  exportWavButton.addEventListener("click", async () => {
    exportWavButton.disabled = true;
    exportWavButton.textContent = "Rendering…";
    try {
      const audioBuffer = await renderProjectToBuffer(project, getPatch());
      downloadBlob(audioBufferToWavBlob(audioBuffer), WAV_FILENAME);
    } catch (error) {
      window.alert(`Could not render audio: ${error.message}`);
    } finally {
      exportWavButton.disabled = false;
      exportWavButton.textContent = "Export WAV";
    }
  });

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json";
  importInput.hidden = true;
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    importInput.value = "";
    if (!file) {
      return;
    }
    try {
      const imported = parseProject(await file.text());
      replaceProjectContents(project, imported);
      resetMixer();
      onReplaced();
    } catch (error) {
      window.alert(`Could not import project: ${error.message}`);
    }
  });

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.textContent = "Import JSON";
  importButton.addEventListener("click", () => importInput.click());

  const status = document.createElement("span");
  status.className = "project-status";
  status.textContent = "";
  bus.on("project:changed", () => {
    status.textContent = "Unsaved changes…";
  });
  bus.on("project:saved", () => {
    status.textContent = "Saved";
  });

  container.append(newButton, exportButton, exportWavButton, importButton, importInput, status);
}
