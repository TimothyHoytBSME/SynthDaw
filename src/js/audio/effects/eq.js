const LOW_SHELF_FREQUENCY = 320;
const MID_FREQUENCY = 1000;
const MID_Q = 0.7;
const HIGH_SHELF_FREQUENCY = 3200;

export function createEQEffect(audioContext, params) {
  const input = audioContext.createGain();
  const output = audioContext.createGain();

  const low = audioContext.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = LOW_SHELF_FREQUENCY;
  low.gain.value = params.low;

  const mid = audioContext.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = MID_FREQUENCY;
  mid.Q.value = MID_Q;
  mid.gain.value = params.mid;

  const high = audioContext.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = HIGH_SHELF_FREQUENCY;
  high.gain.value = params.high;

  input.connect(low).connect(mid).connect(high).connect(output);

  return {
    input,
    output,
    setParam(name, value) {
      if (name === "low") {
        low.gain.value = value;
      } else if (name === "mid") {
        mid.gain.value = value;
      } else if (name === "high") {
        high.gain.value = value;
      }
    },
    dispose() {
      input.disconnect();
      output.disconnect();
      low.disconnect();
      mid.disconnect();
      high.disconnect();
    },
  };
}
