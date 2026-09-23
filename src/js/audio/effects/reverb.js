const DECAY_EXPONENT = 2.5;

function generateImpulseResponse(audioContext, durationSeconds) {
  const rate = audioContext.sampleRate;
  const length = Math.max(1, Math.floor(rate * durationSeconds));
  const impulse = audioContext.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** DECAY_EXPONENT;
    }
  }
  return impulse;
}

export function createReverbEffect(audioContext, params) {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const dry = audioContext.createGain();
  const wet = audioContext.createGain();
  const convolver = audioContext.createConvolver();
  convolver.buffer = generateImpulseResponse(audioContext, params.size);

  dry.gain.value = 1 - params.mix;
  wet.gain.value = params.mix;

  input.connect(dry).connect(output);
  input.connect(convolver).connect(wet).connect(output);

  return {
    input,
    output,
    setParam(name, value) {
      if (name === "size") {
        convolver.buffer = generateImpulseResponse(audioContext, value);
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
      convolver.disconnect();
    },
  };
}
