import { bus } from "../core/eventBus.js";
import {
  serializeProject,
  parseProject,
  replaceProjectContents,
  createProject,
  addTrack,
} from "../core/project.js";
import { loadProject, BACKUP_KEY } from "../core/persistence.js";
import { renderProjectToBuffer } from "../audio/exportRender.js";
import { getLatencyMode, setLatencyMode } from "../audio/audioEngine.js";
import { audioBufferToWavBlob } from "../audio/wavEncoder.js";
import { undo, redo, canUndo, canRedo } from "../core/history.js";
import { DEMOS } from "../demo/demos.js";

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

  // A picker rather than a button, so every demo stays loadable on its own.
  const demoSelect = document.createElement("select");
  demoSelect.className = "demo-select";
  demoSelect.title = "Replace the current project with a demo song (undoable)";
  demoSelect.append(new Option("Load Demo…", ""));
  DEMOS.forEach((demo, index) => {
    const option = new Option(demo.name, String(index));
    option.title = demo.description;
    demoSelect.append(option);
  });
  demoSelect.addEventListener("change", () => {
    const demo = DEMOS[Number(demoSelect.value)];
    demoSelect.value = "";
    if (!demo || !window.confirm(`Load the demo "${demo.name}"? It replaces the current project (Undo brings it back).`)) {
      return;
    }
    replaceProjectContents(project, demo.create());
    onReplaced();
  });

  // The project that New / Import / Load Demo replaced. Hidden until a backup exists; recovering
  // backs up the current project in turn, so it's a swap, not a one-way trip.
  const recoverButton = document.createElement("button");
  recoverButton.type = "button";
  recoverButton.textContent = "↩ Recover previous";
  recoverButton.title = "Bring back the project that was replaced by New Project, Import or Load Demo";
  recoverButton.hidden = true;
  recoverButton.addEventListener("click", async () => {
    const backup = await loadProject(BACKUP_KEY).catch(() => null);
    if (!backup) {
      window.alert("There is no previous project to recover.");
      return;
    }
    if (!window.confirm("Recover the previous project? The current one becomes the backup.")) {
      return;
    }
    replaceProjectContents(project, backup);
    onReplaced();
  });
  bus.on("project:backup-saved", () => (recoverButton.hidden = false));
  loadProject(BACKUP_KEY)
    .then((backup) => (recoverButton.hidden = !backup))
    .catch(() => {});

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "Export JSON";
  const exportJson = () => {
    downloadBlob(new Blob([serializeProject(project)], { type: "application/json" }), DOWNLOAD_FILENAME);
  };
  exportButton.addEventListener("click", exportJson);
  bus.on("shortcut:export-json", exportJson);

  const exportWavButton = document.createElement("button");
  exportWavButton.type = "button";
  exportWavButton.textContent = "Export WAV";
  exportWavButton.addEventListener("click", async () => {
    exportWavButton.disabled = true;
    exportWavButton.textContent = "Rendering…";
    try {
      const audioBuffer = await renderProjectToBuffer(project, {
        onProgress: (fraction) => (exportWavButton.textContent = `Rendering… ${Math.round(fraction * 100)}%`),
      });
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

  // Output buffer: "Stable" trades live-note latency for tolerance of CPU spikes. The context
  // is created with the hint, so changing it reloads the page (the project is autosaved).
  const latencySelect = document.createElement("select");
  latencySelect.className = "audio-select";
  latencySelect.title = "Audio buffer: Low latency for playing live; Stable (bigger buffer) if playback glitches";
  latencySelect.setAttribute("aria-label", "Audio buffer");
  latencySelect.append(new Option("Audio: Low latency", "interactive"), new Option("Audio: Stable (more buffer)", "playback"));
  latencySelect.value = getLatencyMode();
  latencySelect.addEventListener("change", () => {
    setLatencyMode(latencySelect.value);
    if (window.confirm("The audio buffer setting takes effect after a reload. Reload now? (Your project is autosaved.)")) {
      window.location.reload();
    }
  });

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
    demoSelect,
    exportButton,
    exportWavButton,
    importButton,
    importInput,
    recoverButton,
    latencySelect,
    status,
  );
}
