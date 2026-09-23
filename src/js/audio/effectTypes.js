import { createDelayEffect } from "./effects/delay.js";
import { createDistortionEffect } from "./effects/distortion.js";
import { createReverbEffect } from "./effects/reverb.js";
import { createCompressorEffect } from "./effects/compressor.js";
import { createChorusEffect } from "./effects/chorus.js";
import { createEQEffect } from "./effects/eq.js";

export const EFFECT_TYPES = {
  delay: {
    label: "Delay",
    create: createDelayEffect,
    paramDefs: [
      { name: "time", label: "Time (s)", min: 0.01, max: 1, step: 0.01, default: 0.3 },
      { name: "feedback", label: "Feedback", min: 0, max: 0.9, step: 0.01, default: 0.35 },
      { name: "mix", label: "Mix", min: 0, max: 1, step: 0.01, default: 0.3 },
    ],
  },
  distortion: {
    label: "Distortion",
    create: createDistortionEffect,
    paramDefs: [
      { name: "drive", label: "Drive", min: 0, max: 1, step: 0.01, default: 0.3 },
      { name: "mix", label: "Mix", min: 0, max: 1, step: 0.01, default: 0.6 },
    ],
  },
  reverb: {
    label: "Reverb",
    create: createReverbEffect,
    paramDefs: [
      { name: "size", label: "Size (s)", min: 0.2, max: 5, step: 0.1, default: 2 },
      { name: "mix", label: "Mix", min: 0, max: 1, step: 0.01, default: 0.3 },
    ],
  },
  compressor: {
    label: "Compressor",
    create: createCompressorEffect,
    paramDefs: [
      { name: "threshold", label: "Threshold (dB)", min: -60, max: 0, step: 1, default: -24 },
      { name: "ratio", label: "Ratio", min: 1, max: 20, step: 0.5, default: 4 },
      { name: "attack", label: "Attack (s)", min: 0, max: 1, step: 0.001, default: 0.003 },
      { name: "release", label: "Release (s)", min: 0, max: 1, step: 0.01, default: 0.25 },
    ],
  },
  chorus: {
    label: "Chorus",
    create: createChorusEffect,
    paramDefs: [
      { name: "rate", label: "Rate (Hz)", min: 0.1, max: 8, step: 0.1, default: 1.5 },
      { name: "depth", label: "Depth", min: 0, max: 0.01, step: 0.0005, default: 0.002 },
      { name: "mix", label: "Mix", min: 0, max: 1, step: 0.01, default: 0.5 },
    ],
  },
  eq: {
    label: "3-Band EQ",
    create: createEQEffect,
    paramDefs: [
      { name: "low", label: "Low (dB)", min: -15, max: 15, step: 1, default: 0 },
      { name: "mid", label: "Mid (dB)", min: -15, max: 15, step: 1, default: 0 },
      { name: "high", label: "High (dB)", min: -15, max: 15, step: 1, default: 0 },
    ],
  },
};

export function defaultParamsFor(type) {
  const params = {};
  for (const def of EFFECT_TYPES[type].paramDefs) {
    params[def.name] = def.default;
  }
  return params;
}
