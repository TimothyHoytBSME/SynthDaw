import { bus } from "../core/eventBus.js";
import { EFFECT_TYPES, defaultParamsFor } from "../audio/effectTypes.js";
import { getMixer } from "../audio/audioEngine.js";
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

function renderEffectsSection(container, effectsOwner, onEffectsChanged) {
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
    onEffectsChanged();
    renderEffectsSection(container, effectsOwner, onEffectsChanged);
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
      onEffectsChanged();
    });
    bypassLabel.append(bypassCheckbox, " bypass");
    header.appendChild(bypassLabel);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      removeEffect(effectsOwner, effect.id);
      onEffectsChanged();
      renderEffectsSection(container, effectsOwner, onEffectsChanged);
    });
    header.appendChild(removeButton);

    row.appendChild(header);

    for (const paramDef of definition.paramDefs) {
      const fieldLabel = document.createElement("label");
      fieldLabel.className = "mixer-effect-field";
      const fieldText = document.createElement("span");
      fieldText.textContent = paramDef.label;
      fieldLabel.appendChild(fieldText);

      const input = document.createElement("input");
      input.type = "range";
      input.min = String(paramDef.min);
      input.max = String(paramDef.max);
      input.step = String(paramDef.step);
      input.value = String(effect.params[paramDef.name]);
      input.addEventListener("input", () => {
        const value = Number(input.value);
        setEffectParam(effect, paramDef.name, value);
        onEffectsChanged();
      });
      fieldLabel.appendChild(input);
      row.appendChild(fieldLabel);
    }

    container.appendChild(row);
  }
}

function renderTrackStrip(project, track) {
  const strip = document.createElement("div");
  strip.className = "mixer-strip";

  const name = document.createElement("div");
  name.className = "mixer-strip-name";
  name.textContent = track.name;
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
    getMixer().syncTrackGains(project);
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
    getMixer().syncTrackGains(project);
  });
  panLabel.appendChild(panInput);
  strip.appendChild(panLabel);

  const toggles = document.createElement("div");
  toggles.className = "mixer-toggles";

  const muteButton = document.createElement("button");
  muteButton.type = "button";
  muteButton.textContent = "Mute";
  muteButton.className = `mixer-toggle${track.muted ? " mixer-toggle--active" : ""}`;
  muteButton.addEventListener("click", () => {
    setTrackMuted(track, !track.muted);
    muteButton.classList.toggle("mixer-toggle--active", track.muted);
    getMixer().syncTrackGains(project);
  });
  toggles.appendChild(muteButton);

  const soloButton = document.createElement("button");
  soloButton.type = "button";
  soloButton.textContent = "Solo";
  soloButton.className = `mixer-toggle${track.soloed ? " mixer-toggle--active" : ""}`;
  soloButton.addEventListener("click", () => {
    setTrackSoloed(track, !track.soloed);
    soloButton.classList.toggle("mixer-toggle--active", track.soloed);
    getMixer().syncTrackGains(project);
  });
  toggles.appendChild(soloButton);

  strip.appendChild(toggles);

  const effectsContainer = document.createElement("div");
  effectsContainer.className = "mixer-effects";
  const onEffectsChanged = () => getMixer().syncTrackEffects(track);
  renderEffectsSection(effectsContainer, track, onEffectsChanged);
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
    const value = Number(volumeInput.value);
    setMasterVolume(project, value);
    getMixer().syncMasterVolume(value);
  });
  volumeLabel.appendChild(volumeInput);
  strip.appendChild(volumeLabel);

  const effectsContainer = document.createElement("div");
  effectsContainer.className = "mixer-effects";
  const onEffectsChanged = () => getMixer().syncMasterEffects(project.master.effects);
  renderEffectsSection(effectsContainer, project.master, onEffectsChanged);
  strip.appendChild(effectsContainer);

  return strip;
}

export function renderMixer(container, project) {
  function render() {
    container.innerHTML = "";
    const strips = document.createElement("div");
    strips.className = "mixer-strips";
    for (const track of project.tracks) {
      strips.appendChild(renderTrackStrip(project, track));
    }
    strips.appendChild(renderMasterStrip(project));
    container.appendChild(strips);
  }

  bus.on("project:tracks-changed", render);
  render();
}
