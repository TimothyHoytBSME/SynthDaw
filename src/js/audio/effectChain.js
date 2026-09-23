import { EFFECT_TYPES } from "./effectTypes.js";

function structureSignature(descriptors) {
  return descriptors.map((descriptor) => `${descriptor.id}:${descriptor.type}`).join("|");
}

export function createEffectChain(audioContext, destination) {
  const headInput = audioContext.createGain();
  let stages = [];
  let signature = "";

  function rewire() {
    headInput.disconnect();
    for (const stage of stages) {
      stage.node.output.disconnect();
    }
    let current = headInput;
    for (const stage of stages) {
      if (stage.bypassed) {
        continue;
      }
      current.connect(stage.node.input);
      current = stage.node.output;
    }
    current.connect(destination);
  }

  function disposeStages() {
    for (const stage of stages) {
      stage.node.dispose();
    }
    stages = [];
  }

  function rebuild(descriptors) {
    disposeStages();
    stages = descriptors.map((descriptor) => ({
      node: EFFECT_TYPES[descriptor.type].create(audioContext, { ...descriptor.params }),
      params: { ...descriptor.params },
      bypassed: descriptor.bypassed,
    }));
    signature = structureSignature(descriptors);
    rewire();
  }

  // Applies only what differs between each stage and its descriptor, so a slider drag is a
  // cheap setParam call instead of tearing down and recreating every node in the chain.
  function applyDiffs(descriptors) {
    let needsRewire = false;
    stages.forEach((stage, index) => {
      const descriptor = descriptors[index];
      if (stage.bypassed !== descriptor.bypassed) {
        stage.bypassed = descriptor.bypassed;
        needsRewire = true;
      }
      for (const [name, value] of Object.entries(descriptor.params)) {
        if (stage.params[name] !== value) {
          stage.params[name] = value;
          stage.node.setParam(name, value);
        }
      }
    });
    if (needsRewire) {
      rewire();
    }
  }

  rewire();

  return {
    input: headInput,
    // `descriptors` is the plain-data effect list from the project (`[{ id, type, params, bypassed }]`).
    sync(descriptors) {
      if (structureSignature(descriptors) === signature) {
        applyDiffs(descriptors);
      } else {
        rebuild(descriptors);
      }
    },
    dispose() {
      headInput.disconnect();
      disposeStages();
    },
  };
}
