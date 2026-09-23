import { EFFECT_TYPES } from "./effectTypes.js";

let idCounter = 0;

function nextStageId() {
  idCounter += 1;
  return `stage-${idCounter}`;
}

export function createEffectChain(audioContext, destination) {
  const headInput = audioContext.createGain();
  const stages = [];

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

  rewire();

  return {
    input: headInput,
    addEffect(type, params) {
      const definition = EFFECT_TYPES[type];
      const node = definition.create(audioContext, { ...params });
      const stage = { id: nextStageId(), type, node, bypassed: false };
      stages.push(stage);
      rewire();
      return stage.id;
    },
    removeEffect(stageId) {
      const index = stages.findIndex((stage) => stage.id === stageId);
      if (index === -1) {
        return;
      }
      stages[index].node.dispose();
      stages.splice(index, 1);
      rewire();
    },
    setBypass(stageId, bypassed) {
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) {
        return;
      }
      stage.bypassed = bypassed;
      rewire();
    },
    setParam(stageId, name, value) {
      stages.find((s) => s.id === stageId)?.node.setParam(name, value);
    },
    getStageIds() {
      return stages.map((stage) => stage.id);
    },
    dispose() {
      headInput.disconnect();
      for (const stage of stages) {
        stage.node.dispose();
      }
      stages.length = 0;
    },
  };
}
