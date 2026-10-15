import { bus } from "../core/eventBus.js";
import { getSelectedTrack, selectTrack } from "../core/selection.js";
import { EFFECT_TYPES, defaultParamsFor } from "../audio/effectTypes.js";
import {
  setTrackVolume,
  setTrackPan,
  setTrackMuted,
  setTrackSoloed,
  setMasterVolume,
  addEffect,
  removeEffect,
  setEffectParam,
  setEffectBypass,
} from "../core/project.js";

function renderEffectsSection(container, effectsOwner) {
  container.innerHTML = "";

  const addRow = document.createElement("div");
  addRow.className = "mixer-effect-add";
  const select = document.createElement("select");
  for (const [type, definition] of Object.entries(EFFECT_TYPES)) {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = definition.label;
    select.appendChild(option);
  }
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "+ Effect";
  addButton.addEventListener("click", () => {
    addEffect(effectsOwner, select.value, defaultParamsFor(select.value));
    renderEffectsSection(container, effectsOwner);
  });
  addRow.append(select, addButton);
  container.appendChild(addRow);

  for (const effect of effectsOwner.effects) {
    const definition = EFFECT_TYPES[effect.type];
    const row = document.createElement("div");
    row.className = "mixer-effect";

    const header = document.createElement("div");
    header.className = "mixer-effect-header";

    const label = document.createElement("span");
    label.textContent = definition.label;
    header.appendChild(label);

    const bypassLabel = document.createElement("label");
    const bypassCheckbox = document.createElement("input");
    bypassCheckbox.type = "checkbox";
    bypassCheckbox.checked = effect.bypassed;
    bypassCheckbox.addEventListener("change", () => {
      setEffectBypass(effect, bypassCheckbox.checked);
    });
    bypassLabel.append(bypassCheckbox, " bypass");
    header.appendChild(bypassLabel);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      removeEffect(effectsOwner, effect.id);
      renderEffectsSection(container, effectsOwner);
    });
    header.appendChild(removeButton);

    row.appendChild(header);

    const inputs = new Map();
    const refreshSyncedInputs = () => {
      for (const paramDef of definition.paramDefs) {
        if (paramDef.syncedBy) {
          inputs.get(paramDef.name).disabled = effect.params[paramDef.syncedBy] !== "off";
        }
      }
    };

    for (const paramDef of definition.paramDefs) {
      const fieldLabel = document.createElement("label");
      fieldLabel.className = "mixer-effect-field";
      const fieldText = document.createElement("span");
      fieldText.textContent = paramDef.label;
      fieldLabel.appendChild(fieldText);

      let input;
      if (paramDef.kind === "select") {
        input = document.createElement("select");
        for (const option of paramDef.options) {
          input.append(new Option(option, option));
        }
        input.value = effect.params[paramDef.name];
        input.addEventListener("change", () => {
          setEffectParam(effect, paramDef.name, input.value);
          refreshSyncedInputs();
        });
      } else {
        input = document.createElement("input");
        input.type = "range";
        input.min = String(paramDef.min);
        input.max = String(paramDef.max);
        input.step = String(paramDef.step);
        input.value = String(effect.params[paramDef.name]);
        input.addEventListener("input", () => {
          setEffectParam(effect, paramDef.name, Number(input.value));
        });
      }
      inputs.set(paramDef.name, input);
      fieldLabel.appendChild(input);
      row.appendChild(fieldLabel);
    }
    refreshSyncedInputs();

    container.appendChild(row);
  }
}

function renderTrackStrip(track, selected) {
  const strip = document.createElement("div");
  strip.className = `mixer-strip${selected ? " mixer-strip--selected" : ""}`;

  const name = document.createElement("button");
  name.type = "button";
  name.className = "mixer-strip-name";
  name.title = "Select track";
  name.textContent = track.name;
  name.addEventListener("click", () => selectTrack(track.id));
  strip.appendChild(name);

  const volumeLabel = document.createElement("label");
  volumeLabel.className = "mixer-field";
  volumeLabel.textContent = "Vol";
  const volumeInput = document.createElement("input");
  volumeInput.type = "range";
  volumeInput.min = "0";
  volumeInput.max = "1.5";
  volumeInput.step = "0.01";
  volumeInput.value = String(track.volume);
  volumeInput.addEventListener("input", () => {
    setTrackVolume(track, Number(volumeInput.value));
  });
  volumeLabel.appendChild(volumeInput);
  strip.appendChild(volumeLabel);

  const panLabel = document.createElement("label");
  panLabel.className = "mixer-field";
  panLabel.textContent = "Pan";
  const panInput = document.createElement("input");
  panInput.type = "range";
  panInput.min = "-1";
  panInput.max = "1";
  panInput.step = "0.05";
  panInput.value = String(track.pan);
  panInput.addEventListener("input", () => {
    setTrackPan(track, Number(panInput.value));
  });
  panLabel.appendChild(panInput);
  strip.appendChild(panLabel);

  const toggles = document.createElement("div");
  toggles.className = "mixer-toggles";

  const muteButton = document.createElement("button");
  muteButton.type = "button";
  muteButton.textContent = "Mute";
  muteButton.className = "mixer-toggle";
  muteButton.addEventListener("click", () => setTrackMuted(track, !track.muted));
  toggles.appendChild(muteButton);

  const soloButton = document.createElement("button");
  soloButton.type = "button";
  soloButton.textContent = "Solo";
  soloButton.className = "mixer-toggle";
  soloButton.addEventListener("click", () => setTrackSoloed(track, !track.soloed));
  toggles.appendChild(soloButton);

  // Mute/solo can also change from the timeline's header buttons or undo.
  strip.refreshToggles = () => {
    muteButton.classList.toggle("mixer-toggle--active", track.muted);
    soloButton.classList.toggle("mixer-toggle--active", track.soloed);
    strip.style.setProperty("--track-color", track.color);
  };
  strip.refreshToggles();

  strip.appendChild(toggles);

  const effectsContainer = document.createElement("div");
  effectsContainer.className = "mixer-effects";
  renderEffectsSection(effectsContainer, track);
  strip.appendChild(effectsContainer);

  return strip;
}

function renderMasterStrip(project) {
  const strip = document.createElement("div");
  strip.className = "mixer-strip mixer-strip--master";

  const name = document.createElement("div");
  name.className = "mixer-strip-name";
  name.textContent = "Master";
  strip.appendChild(name);

  const volumeLabel = document.createElement("label");
  volumeLabel.className = "mixer-field";
  volumeLabel.textContent = "Vol";
  const volumeInput = document.createElement("input");
  volumeInput.type = "range";
  volumeInput.min = "0";
  volumeInput.max = "1";
  volumeInput.step = "0.01";
  volumeInput.value = String(project.master.volume);
  volumeInput.addEventListener("input", () => {
    setMasterVolume(project, Number(volumeInput.value));
  });
  volumeLabel.appendChild(volumeInput);
  strip.appendChild(volumeLabel);

  const effectsContainer = document.createElement("div");
  effectsContainer.className = "mixer-effects";
  renderEffectsSection(effectsContainer, project.master);
  strip.appendChild(effectsContainer);

  return strip;
}

// Module-level so the strip scroll survives full re-renders (undo/redo/import).
let stripsScrollLeft = 0;

export function renderMixer(container, project) {
  let strips = null;

  function render() {
    stripsScrollLeft = strips?.scrollLeft ?? stripsScrollLeft;
    container.innerHTML = "";
    strips = document.createElement("div");
    strips.className = "mixer-strips";
    const selectedTrack = getSelectedTrack(project);
    for (const track of project.tracks) {
      strips.appendChild(renderTrackStrip(track, track === selectedTrack));
    }
    strips.appendChild(renderMasterStrip(project));
    container.appendChild(strips);
    strips.scrollLeft = stripsScrollLeft;
  }

  // Selection only changes a highlight class, so it's patched in place rather than re-rendering
  // (which would reset every strip's scroll position and slider focus).
  function highlightSelected() {
    const selectedIndex = project.tracks.indexOf(getSelectedTrack(project));
    container.querySelectorAll(".mixer-strip:not(.mixer-strip--master)").forEach((strip, index) => {
      strip.classList.toggle("mixer-strip--selected", index === selectedIndex);
    });
  }

  function refreshToggles() {
    container.querySelectorAll(".mixer-strip").forEach((strip) => strip.refreshToggles?.());
  }

  const unsubscribers = [
    bus.on("project:tracks-changed", render),
    bus.on("selection:changed", highlightSelected),
    bus.on("project:changed", refreshToggles),
  ];
  render();
  return () => {
    stripsScrollLeft = strips.scrollLeft;
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
