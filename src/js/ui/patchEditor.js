import { bus } from "../core/eventBus.js";
import { setTrackPatch, setTrackPatchParam } from "../core/project.js";
import { getSelectedTrack, getSelection } from "../core/selection.js";
import { OSC_TYPES, FILTER_TYPES, LFO_TARGETS } from "../audio/patch.js";
import { PRESET_NAMES, createPresetPatch } from "../audio/presets.js";
import {
  startLearning,
  cancelLearning,
  clearMapping,
  getLearnTarget,
  getMappedController,
} from "../midi/midiMap.js";

const LOG_SLIDER_STEPS = 1000;
const MIDI_TARGET_PREFIX = "patch:";

function oscillatorFields(index) {
  const prefix = `oscillators.${index}`;
  return [
    { path: `${prefix}.type`, label: "Wave", kind: "select", options: OSC_TYPES },
    { path: `${prefix}.octave`, label: "Octave", min: -3, max: 3, step: 1, format: signed },
    { path: `${prefix}.detune`, label: "Detune", min: -50, max: 50, step: 1, unit: "ct", format: signed },
    { path: `${prefix}.mix`, label: "Level", min: 0, max: 1, step: 0.01, format: percent },
  ];
}

function envelopeFields(prefix) {
  return [
    { path: `${prefix}.attack`, label: "Attack", min: 0.001, max: 4, scale: "log", format: seconds },
    { path: `${prefix}.decay`, label: "Decay", min: 0.001, max: 4, scale: "log", format: seconds },
    { path: `${prefix}.sustain`, label: "Sustain", min: 0, max: 1, step: 0.01, format: percent },
    { path: `${prefix}.release`, label: "Release", min: 0.001, max: 6, scale: "log", format: seconds },
  ];
}

// `scale: "log"` fields map the slider exponentially (frequencies and times are perceived
// logarithmically — a linear 100–8000 Hz slider spends almost all its travel on the top end).
export const PATCH_SECTIONS = [
  { title: "Oscillator 1", fields: oscillatorFields(0) },
  { title: "Oscillator 2", fields: oscillatorFields(1) },
  {
    title: "Filter",
    fields: [
      { path: "filter.type", label: "Type", kind: "select", options: FILTER_TYPES },
      { path: "filter.cutoff", label: "Cutoff", min: 40, max: 16000, scale: "log", format: hertz },
      { path: "filter.resonance", label: "Resonance", min: 0.1, max: 20, step: 0.1, format: fixed(1) },
      { path: "filter.envAmount", label: "Env amount", min: 0, max: 8000, step: 10, format: hertz },
    ],
  },
  { title: "Amp envelope", fields: envelopeFields("ampEnvelope") },
  { title: "Filter envelope", fields: envelopeFields("filterEnvelope") },
  {
    title: "Pitch envelope",
    fields: [
      { path: "pitchEnvelope.amount", label: "Amount", min: -48, max: 48, step: 1, unit: "st", format: signed },
      { path: "pitchEnvelope.decay", label: "Decay", min: 0.005, max: 2, scale: "log", format: seconds },
    ],
  },
  {
    title: "LFO",
    fields: [
      { path: "lfo.target", label: "Target", kind: "select", options: LFO_TARGETS },
      { path: "lfo.rate", label: "Rate", min: 0.05, max: 20, scale: "log", format: hertz },
      { path: "lfo.depth", label: "Depth", min: 0, max: 1, step: 0.01, format: percent },
    ],
  },
  { title: "Output", fields: [{ path: "gain", label: "Volume", min: 0, max: 1, step: 0.01, format: percent }] },
];

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function seconds(value) {
  return value < 1 ? `${Math.round(value * 1000)} ms` : `${value.toFixed(2)} s`;
}

function hertz(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(2)} kHz` : `${value < 10 ? value.toFixed(2) : Math.round(value)} Hz`;
}

function fixed(digits) {
  return (value) => value.toFixed(digits);
}

function getByPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

// Slider position <-> parameter value, shared with MIDI CC mapping (a CC value is just
// another slider position, normalized to 0–1).
export function valueFromNormalized(field, normalized) {
  if (field.scale === "log") {
    const value = field.min * (field.max / field.min) ** normalized;
    return Number(value.toPrecision(4));
  }
  const raw = field.min + normalized * (field.max - field.min);
  const snapped = Math.round(raw / field.step) * field.step;
  return Number(Math.min(field.max, Math.max(field.min, snapped)).toFixed(4));
}

function normalizedFromValue(field, value) {
  if (field.scale === "log") {
    return Math.log(value / field.min) / Math.log(field.max / field.min);
  }
  return (value - field.min) / (field.max - field.min);
}

function describeValue(field, value) {
  const text = field.format ? field.format(value) : String(value);
  return field.unit ? `${text} ${field.unit}` : text;
}

function createSelectField(field, value, onChange) {
  const select = document.createElement("select");
  for (const option of field.options) {
    const optionElement = document.createElement("option");
    optionElement.value = option;
    optionElement.textContent = option;
    optionElement.selected = option === value;
    select.appendChild(optionElement);
  }
  select.addEventListener("change", () => onChange(select.value));
  return { element: select, setValue: (next) => (select.value = next) };
}

function createRangeField(field, value, onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "patch-range";

  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = String(LOG_SLIDER_STEPS);
  input.step = "1";

  const readout = document.createElement("output");
  readout.className = "patch-readout";

  function show(next) {
    input.value = String(Math.round(normalizedFromValue(field, next) * LOG_SLIDER_STEPS));
    readout.textContent = describeValue(field, next);
  }

  input.addEventListener("input", () => {
    const next = valueFromNormalized(field, Number(input.value) / LOG_SLIDER_STEPS);
    readout.textContent = describeValue(field, next);
    onChange(next);
  });

  show(value);
  wrapper.append(input, readout);
  return { element: wrapper, setValue: show };
}

// Small per-slider button for MIDI learn: click, then move a controller knob to map it.
// Clicking again while waiting cancels and clears any existing mapping for that slider.
function createLearnButton(path) {
  const target = `${MIDI_TARGET_PREFIX}${path}`;
  const learnButton = document.createElement("button");
  learnButton.type = "button";
  learnButton.className = "patch-learn";

  function refresh() {
    const learning = getLearnTarget() === target;
    const controller = getMappedController(target);
    learnButton.classList.toggle("patch-learn--learning", learning);
    learnButton.classList.toggle("patch-learn--mapped", controller !== null);
    learnButton.textContent = learning ? "…" : controller !== null ? `CC${controller}` : "MIDI";
    learnButton.title = learning
      ? "Move a knob/slider on your MIDI controller to map it (click again to cancel and unmap)"
      : "MIDI learn: click, then move a controller knob/slider";
  }

  learnButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (getLearnTarget() === target) {
      cancelLearning();
      clearMapping(target);
    } else {
      startLearning(target);
    }
  });
  refresh();
  return { element: learnButton, refresh };
}

export function renderPatchEditor(container, project) {
  // path -> { field, setValue }, so external changes (MIDI CC) can update the matching control.
  const controls = new Map();
  const learnButtons = [];
  let renderedTrackId = null;

  function render() {
    container.innerHTML = "";
    controls.clear();
    learnButtons.length = 0;
    const track = getSelectedTrack(project);
    renderedTrackId = track?.id ?? null;

    const header = document.createElement("div");
    header.className = "patch-header";
    const title = document.createElement("h2");
    title.textContent = track ? `Instrument — ${track.name}` : "Instrument";
    header.appendChild(title);
    container.appendChild(header);

    if (!track) {
      const empty = document.createElement("p");
      empty.className = "patch-empty";
      empty.textContent = "Add a track to design its sound.";
      container.appendChild(empty);
      return;
    }

    const presetSelect = document.createElement("select");
    presetSelect.className = "patch-preset";
    presetSelect.setAttribute("aria-label", "Load preset");
    presetSelect.append(new Option("Load preset…", ""));
    for (const name of PRESET_NAMES) {
      presetSelect.append(new Option(name, name));
    }
    presetSelect.addEventListener("change", () => {
      if (presetSelect.value) {
        setTrackPatch(track, createPresetPatch(presetSelect.value));
        render();
      }
    });
    header.appendChild(presetSelect);

    const sections = document.createElement("div");
    sections.className = "patch-sections";
    for (const section of PATCH_SECTIONS) {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "patch-section";
      const legend = document.createElement("legend");
      legend.textContent = section.title;
      fieldset.appendChild(legend);

      for (const field of section.fields) {
        const row = document.createElement("label");
        row.className = "patch-field";
        const labelText = document.createElement("span");
        labelText.textContent = field.label;
        row.appendChild(labelText);

        const value = getByPath(track.patch, field.path);
        const onChange = (next) => setTrackPatchParam(track, field.path, next);
        const control =
          field.kind === "select"
            ? createSelectField(field, value, onChange)
            : createRangeField(field, value, onChange);
        controls.set(field.path, { field, setValue: control.setValue });
        if (field.kind !== "select") {
          const learnButton = createLearnButton(field.path);
          learnButtons.push(learnButton);
          control.element.appendChild(learnButton.element);
        }
        row.appendChild(control.element);
        fieldset.appendChild(row);
      }
      sections.appendChild(fieldset);
    }
    container.appendChild(sections);
  }

  // A mapped controller moved: drive that parameter on whichever track is selected.
  function handleMIDIControl({ target, normalized }) {
    const track = getSelectedTrack(project);
    const control = controls.get(target.slice(MIDI_TARGET_PREFIX.length));
    if (!track || !control || !target.startsWith(MIDI_TARGET_PREFIX)) {
      return;
    }
    const value = valueFromNormalized(control.field, normalized);
    setTrackPatchParam(track, control.field.path, value);
    control.setValue(value);
  }

  const unsubscribers = [
    bus.on("midimap:changed", () => learnButtons.forEach((learnButton) => learnButton.refresh())),
    bus.on("midimap:control", handleMIDIControl),
    bus.on("selection:changed", () => {
      if (getSelection().trackId !== renderedTrackId) {
        render();
      }
    }),
    bus.on("project:tracks-changed", render),
  ];

  render();
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
