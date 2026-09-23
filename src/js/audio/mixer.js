import { createEffectChain } from "./effectChain.js";

function setParamIfChanged(param, value) {
  if (param.value !== value) {
    param.value = value;
  }
}

export function createMixer(audioContext, masterGain) {
  const masterChain = createEffectChain(audioContext, audioContext.destination);
  masterGain.disconnect();
  masterGain.connect(masterChain.input);

  const trackBuses = new Map();

  function getTrackBus(trackId) {
    if (!trackBuses.has(trackId)) {
      const gainNode = audioContext.createGain();
      const panNode = new StereoPannerNode(audioContext);
      const effectChain = createEffectChain(audioContext, panNode);
      gainNode.connect(effectChain.input);
      panNode.connect(masterGain);
      trackBuses.set(trackId, { gainNode, panNode, effectChain });
    }
    return trackBuses.get(trackId);
  }

  function disposeTrackBus(trackId) {
    const bus = trackBuses.get(trackId);
    bus.effectChain.dispose();
    bus.gainNode.disconnect();
    bus.panNode.disconnect();
    trackBuses.delete(trackId);
  }

  return {
    getTrackBus,
    // Reconciles the whole audio graph against the project's plain data: disposes buses for
    // tracks that no longer exist, creates buses for new ones, and applies volume/pan/mute/solo
    // and effect changes. Idempotent and cheap when nothing changed, so it's safe to call after
    // every project change (see audioEngine.js).
    syncProject(project) {
      const trackIds = new Set(project.tracks.map((track) => track.id));
      for (const trackId of Array.from(trackBuses.keys())) {
        if (!trackIds.has(trackId)) {
          disposeTrackBus(trackId);
        }
      }

      // Solo isn't a per-track property in isolation: soloing any track silences every
      // non-soloed track, so all tracks' effective gains are recomputed together.
      const anySoloed = project.tracks.some((track) => track.soloed);
      for (const track of project.tracks) {
        const bus = getTrackBus(track.id);
        const silent = track.muted || (anySoloed && !track.soloed);
        setParamIfChanged(bus.gainNode.gain, silent ? 0 : track.volume);
        setParamIfChanged(bus.panNode.pan, track.pan);
        bus.effectChain.sync(track.effects);
      }

      setParamIfChanged(masterGain.gain, project.master.volume);
      masterChain.sync(project.master.effects);
    },
  };
}
