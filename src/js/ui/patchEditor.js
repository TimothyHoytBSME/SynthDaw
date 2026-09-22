import { clonePatch } from "../audio/patch.js";

const OSC_TYPES = ["sine", "sawtooth", "square", "triangle"];
const FILTER_TYPES = ["lowpass", "highpass", "bandpass"];
const LFO_TARGETS = ["pitch", "filter"];

const FIELDS = [
  { path: "oscillators.0.type", label: "Osc 1 wave", kind: "select", options: OSC_TYPES },
  { path: "oscillators.0.mix", label: "Osc 1 mix", kind: "range", min: 0, max: 1, step: 0.01 },
  { path: "oscillators.1.type", label: "Osc 2 wave", kind: "select", options: OSC_TYPES },
  {
    path: "oscillators.1.detune",
    label: "Osc 2 detune (cents)",
    kind: "range",
    min: -50,
    max: 50,
    step: 1,
  },
  { path: "oscillators.1.mix", label: "Osc 2 mix", kind: "range", min: 0, max: 1, step: 0.01 },
  { path: "filter.type", label: "Filter type", kind: "select", options: FILTER_TYPES },
  {
    path: "filter.cutoff",
    label: "Filter cutoff (Hz)",
    kind: "range",
    min: 100,
    max: 8000,
    step: 10,
  },
  {
    path: "filter.resonance",
    label: "Filter resonance (Q)",
    kind: "range",
    min: 0.1,
    max: 20,
    step: 0.1,
  },
  {
    path: "filter.envAmount",
    label: "Filter env amount (Hz)",
    kind: "range",
    min: 0,
    max: 6000,
    step: 10,
  },
  {
    path: "ampEnvelope.attack",
    label: "Amp attack (s)",
    kind: "range",
    min: 0.001,
    max: 2,
    step: 0.001,
  },
  {
    path: "ampEnvelope.decay",
    label: "Amp decay (s)",
    kind: "range",
    min: 0.001,
    max: 2,
    step: 0.001,
  },
  { path: "ampEnvelope.sustain", label: "Amp sustain", kind: "range", min: 0, max: 1, step: 0.01 },
  {
    path: "ampEnvelope.release",
    label: "Amp release (s)",
    kind: "range",
    min: 0.001,
    max: 3,
    step: 0.001,
  },
  {
    path: "filterEnvelope.attack",
    label: "Filter env attack (s)",
    kind: "range",
    min: 0.001,
    max: 2,
    step: 0.001,
  },
  {
    path: "filterEnvelope.decay",
    label: "Filter env decay (s)",
    kind: "range",
    min: 0.001,
    max: 2,
    step: 0.001,
  },
  {
    path: "filterEnvelope.sustain",
    label: "Filter env sustain",
    kind: "range",
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    path: "filterEnvelope.release",
    label: "Filter env release (s)",
    kind: "range",
    min: 0.001,
    max: 3,
    step: 0.001,
  },
  { path: "lfo.rate", label: "LFO rate (Hz)", kind: "range", min: 0.1, max: 20, step: 0.1 },
  { path: "lfo.depth", label: "LFO depth", kind: "range", min: 0, max: 50, step: 0.5 },
  { path: "lfo.target", label: "LFO target", kind: "select", options: LFO_TARGETS },
  { path: "gain", label: "Voice gain", kind: "range", min: 0, max: 1, step: 0.01 },
];

function getByPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setByPath(object, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((value, key) => value[key], object);
  target[lastKey] = value;
}

export function renderPatchEditor(container, { getPatch, setPatch }) {
  const patch = clonePatch(getPatch());

  for (const field of FIELDS) {
    const row = document.createElement("label");
    row.className = "patch-field";

    const labelText = document.createElement("span");
    labelText.textContent = field.label;
    row.appendChild(labelText);

    const currentValue = getByPath(patch, field.path);
    let input;

    if (field.kind === "select") {
      input = document.createElement("select");
      for (const option of field.options) {
        const optionElement = document.createElement("option");
        optionElement.value = option;
        optionElement.textContent = option;
        optionElement.selected = option === currentValue;
        input.appendChild(optionElement);
      }
    } else {
      input = document.createElement("input");
      input.type = "range";
      input.min = String(field.min);
      input.max = String(field.max);
      input.step = String(field.step);
      input.value = String(currentValue);
    }

    input.addEventListener("input", () => {
      const value = field.kind === "select" ? input.value : Number(input.value);
      setByPath(patch, field.path, value);
      setPatch(clonePatch(patch));
    });

    row.appendChild(input);
    container.appendChild(row);
  }
}
