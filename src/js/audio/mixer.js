import { createEffectChain } from "./effectChain.js";

export function createMixer(audioContext, masterGain) {
  let masterChain = createEffectChain(audioContext, audioContext.destination);
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

  function rebuildEffects(effectChain, effectDescriptors) {
    for (const stageId of effectChain.getStageIds()) {
      effectChain.removeEffect(stageId);
    }
    for (const descriptor of effectDescriptors) {
      const stageId = effectChain.addEffect(descriptor.type, descriptor.params);
      effectChain.setBypass(stageId, descriptor.bypassed);
    }
  }

  function disposeTrackBus(trackId) {
    const bus = trackBuses.get(trackId);
    if (!bus) {
      return;
    }
    bus.effectChain.dispose();
    bus.gainNode.disconnect();
    bus.panNode.disconnect();
    trackBuses.delete(trackId);
  }

  return {
    getTrackBus,
    syncMasterVolume(value) {
      masterGain.gain.value = value;
    },
    syncTrackEffects(track) {
      rebuildEffects(getTrackBus(track.id).effectChain, track.effects);
    },
    syncMasterEffects(masterEffects) {
      rebuildEffects(masterChain, masterEffects);
    },
    syncTrackGains(project) {
      const anySoloed = project.tracks.some((track) => track.soloed);
      for (const track of project.tracks) {
        const bus = getTrackBus(track.id);
        const silent = track.muted || (anySoloed && !track.soloed);
        bus.gainNode.gain.value = silent ? 0 : track.volume;
        bus.panNode.pan.value = track.pan;
      }
    },
    removeTrackBus: disposeTrackBus,
    // Full reset for "New Project" / import: the old tracks' ids are meaningless once the
    // project's content is wholesale-replaced, so every existing bus (and the master chain,
    // in case it had effects) is torn down rather than trying to reconcile old vs. new ids.
    reset() {
      for (const trackId of Array.from(trackBuses.keys())) {
        disposeTrackBus(trackId);
      }
      masterChain.dispose();
      masterChain = createEffectChain(audioContext, audioContext.destination);
      masterGain.disconnect();
      masterGain.connect(masterChain.input);
    },
  };
}
