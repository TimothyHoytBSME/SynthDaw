export function createCompressorEffect(audioContext, params) {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = params.threshold;
  compressor.ratio.value = params.ratio;
  compressor.attack.value = params.attack;
  compressor.release.value = params.release;

  input.connect(compressor).connect(output);

  return {
    input,
    output,
    setParam(name, value) {
      if (compressor[name] instanceof AudioParam) {
        compressor[name].value = value;
      }
    },
    dispose() {
      input.disconnect();
      output.disconnect();
      compressor.disconnect();
    },
  };
}
