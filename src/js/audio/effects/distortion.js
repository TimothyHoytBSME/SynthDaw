const CURVE_SAMPLES = 4096;

function makeDistortionCurve(amount) {
  const curve = new Float32Array(CURVE_SAMPLES);
  const k = amount * 100;
  for (let i = 0; i < CURVE_SAMPLES; i += 1) {
    const x = (i * 2) / CURVE_SAMPLES - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export function createDistortionEffect(audioContext, params) {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const dry = audioContext.createGain();
  const wet = audioContext.createGain();
  const shaper = audioContext.createWaveShaper();
  shaper.curve = makeDistortionCurve(params.drive);
  shaper.oversample = "2x";

  dry.gain.value = 1 - params.mix;
  wet.gain.value = params.mix;

  input.connect(dry).connect(output);
  input.connect(shaper).connect(wet).connect(output);

  return {
    input,
    output,
    setParam(name, value) {
      if (name === "drive") {
        shaper.curve = makeDistortionCurve(value);
      } else if (name === "mix") {
        dry.gain.value = 1 - value;
        wet.gain.value = value;
      }
    },
    dispose() {
      input.disconnect();
      output.disconnect();
      dry.disconnect();
      wet.disconnect();
      shaper.disconnect();
    },
  };
}
