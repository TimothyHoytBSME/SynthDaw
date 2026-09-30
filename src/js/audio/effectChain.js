import { EFFECT_TYPES, resolveEffectParams } from "./effectTypes.js";

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

  function rebuild(descriptors, tempo) {
    disposeStages();
    stages = descriptors.map((descriptor) => {
      const params = { ...resolveEffectParams(descriptor.type, descriptor.params, tempo) };
      return {
        node: EFFECT_TYPES[descriptor.type].create(audioContext, { ...params }),
        params,
        bypassed: descriptor.bypassed,
      };
    });
    signature = structureSignature(descriptors);
    rewire();
  }

  // Applies only what differs between each stage and its descriptor, so a slider drag is a
  // cheap setParam call instead of tearing down and recreating every node in the chain.
  // Diffs resolved params, so a tempo change reaches synced effects as an ordinary param change.
  function applyDiffs(descriptors, tempo) {
    let needsRewire = false;
    stages.forEach((stage, index) => {
      const descriptor = descriptors[index];
      if (stage.bypassed !== descriptor.bypassed) {
        stage.bypassed = descriptor.bypassed;
        needsRewire = true;
      }
      const params = resolveEffectParams(descriptor.type, descriptor.params, tempo);
      for (const [name, value] of Object.entries(params)) {
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
    sync(descriptors, tempo) {
      if (structureSignature(descriptors) === signature) {
        applyDiffs(descriptors, tempo);
      } else {
        rebuild(descriptors, tempo);
      }
    },
    dispose() {
      headInput.disconnect();
      disposeStages();
    },
  };
}
