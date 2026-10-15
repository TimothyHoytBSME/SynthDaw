import { bus } from "./eventBus.js";

const DB_NAME = "synthdaw";
const DB_VERSION = 1;
const STORE_NAME = "projects";
const AUTOSAVE_KEY = "autosave";
export const BACKUP_KEY = "backup";
const AUTOSAVE_DEBOUNCE_MS = 800;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project, key = AUTOSAVE_KEY) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    // IndexedDB structured-clones plain JSON-shaped data directly — no JSON.stringify needed,
    // matching project.js's "plain data, no Web Audio/DOM references" guarantee.
    transaction.objectStore(STORE_NAME).put(project, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadProject(key = AUTOSAVE_KEY) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

let debounceTimer = null;

export function initAutosave(getProject) {
  // The project being replaced wholesale (New, Import, Load Demo) goes to the backup slot
  // before the autosave slot is overwritten by its replacement.
  bus.on("project:replacing", ({ outgoing }) => {
    saveProject(outgoing, BACKUP_KEY)
      .then(() => bus.emit("project:backup-saved", {}))
      .catch(() => {});
  });
  bus.on("project:changed", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveProject(getProject())
        .then(() => bus.emit("project:saved", {}))
        .catch(() => {
          // Best-effort: a failed autosave (private browsing, quota, etc.) shouldn't break
          // the app. The user still has Export JSON as a manual fallback.
        });
    }, AUTOSAVE_DEBOUNCE_MS);
  });
}
