const A4_MIDI_NOTE = 69;
const A4_FREQUENCY = 440;

export function noteToFrequency(note) {
  return A4_FREQUENCY * 2 ** ((note - A4_MIDI_NOTE) / 12);
}
