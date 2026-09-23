const CLICK_GAIN = 0.3;
const CLICK_TAIL_SECONDS = 0.05;

export function playClick(audioContext, destination, time, accented) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.value = accented ? 1500 : 1000;

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(CLICK_GAIN, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_TAIL_SECONDS);

  oscillator.connect(gain).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + CLICK_TAIL_SECONDS + 0.01);
}
