const BASE_DELAY_SECONDS = 0.015;
const MAX_DELAY_SECONDS = 0.05;

export function createChorusEffect(audioContext, params) {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const dry = audioContext.createGain();
  const wet = audioContext.createGain();
  const delayNode = audioContext.createDelay(MAX_DELAY_SECONDS);
  delayNode.delayTime.value = BASE_DELAY_SECONDS;

  const lfo = audioContext.createOscillator();
  lfo.frequency.value = params.rate;
  const lfoDepth = audioContext.createGain();
  lfoDepth.gain.value = params.depth;
  lfo.connect(lfoDepth).connect(delayNode.delayTime);
  lfo.start();

  dry.gain.value = 1 - params.mix;
  wet.gain.value = params.mix;

  input.connect(dry).connect(output);
  input.connect(delayNode).connect(wet).connect(output);

  return {
    input,
    output,
    setParam(name, value) {
      if (name === "rate") {
        lfo.frequency.value = value;
      } else if (name === "depth") {
        lfoDepth.gain.value = value;
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
      delayNode.disconnect();
      lfo.stop();
      lfo.disconnect();
      lfoDepth.disconnect();
    },
  };
}
