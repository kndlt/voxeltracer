import Chunk from "./Chunk";

export default class NshpChunk extends Chunk {
  nodeId: number;
  modelId: number;

  constructor(nodeId: number, modelId: number) {
    super();
    this.nodeId = nodeId;
    this.modelId = modelId;
  }
}
