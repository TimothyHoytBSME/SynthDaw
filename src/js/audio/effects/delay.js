const MAX_DELAY_SECONDS = 2;

export function createDelayEffect(audioContext, params) {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  const dry = audioContext.createGain();
  const wet = audioContext.createGain();
  const delayNode = audioContext.createDelay(MAX_DELAY_SECONDS);
  const feedbackGain = audioContext.createGain();

  delayNode.delayTime.value = params.time;
  feedbackGain.gain.value = params.feedback;
  dry.gain.value = 1 - params.mix;
  wet.gain.value = params.mix;

  input.connect(dry).connect(output);
  input.connect(delayNode);
  delayNode.connect(feedbackGain).connect(delayNode);
  delayNode.connect(wet).connect(output);

  return {
    input,
    output,
    setParam(name, value) {
      if (name === "time") {
        delayNode.delayTime.value = value;
      } else if (name === "feedback") {
        feedbackGain.gain.value = value;
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
      feedbackGain.disconnect();
    },
  };
}
