import { bus } from "../core/eventBus.js";
import {
  serializeProject,
  parseProject,
  replaceProjectContents,
  createProject,
  addTrack,
} from "../core/project.js";
import { renderProjectToBuffer } from "../audio/exportRender.js";
import { audioBufferToWavBlob } from "../audio/wavEncoder.js";
import { undo, redo, canUndo, canRedo } from "../core/history.js";
import { createDemoProject } from "../demo/demoSong.js";

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
  const undoButton = document.createElement("button");
  undoButton.type = "button";
  undoButton.textContent = "↶ Undo";
  undoButton.disabled = !canUndo();
  undoButton.addEventListener("click", () => undo());

  const redoButton = document.createElement("button");
  redoButton.type = "button";
  redoButton.textContent = "↷ Redo";
  redoButton.disabled = !canRedo();
  redoButton.addEventListener("click", () => redo());

  bus.on("history:changed", ({ canUndo: undoAvailable, canRedo: redoAvailable }) => {
    undoButton.disabled = !undoAvailable;
    redoButton.disabled = !redoAvailable;
  });

  const newButton = document.createElement("button");
  newButton.type = "button";
  newButton.textContent = "New Project";
  newButton.addEventListener("click", () => {
    if (!window.confirm("Start a new project? Unsaved changes will be lost.")) {
      return;
    }
    replaceProjectContents(project, createProject());
    addTrack(project, { name: "Track 1" });
    onReplaced();
  });

  const demoButton = document.createElement("button");
  demoButton.type = "button";
  demoButton.textContent = "Load Demo";
  demoButton.title = "Replace the current project with a demo song (undoable)";
  demoButton.addEventListener("click", () => {
    if (!window.confirm("Load the demo song? It replaces the current project (Undo brings it back).")) {
      return;
    }
    replaceProjectContents(project, createDemoProject());
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
      const audioBuffer = await renderProjectToBuffer(project);
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

  container.append(
    undoButton,
    redoButton,
    newButton,
    demoButton,
    exportButton,
    exportWavButton,
    importButton,
    importInput,
    status,
  );
}
