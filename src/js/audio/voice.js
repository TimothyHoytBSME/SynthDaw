const ATTACK_SECONDS = 0.01;
const RELEASE_SECONDS = 0.08;
const PEAK_GAIN = 0.8;

export function createVoice(audioContext, destination, frequency) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = frequency;

  const gain = audioContext.createGain();
  gain.gain.value = 0;

  oscillator.connect(gain).connect(destination);

  let started = false;

  return {
    start() {
      const now = audioContext.currentTime;
      oscillator.start(now);
      started = true;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, now + ATTACK_SECONDS);
    },
    stop() {
      const now = audioContext.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS);
      if (started) {
        oscillator.stop(now + RELEASE_SECONDS + 0.02);
      }
    },
  };
}
