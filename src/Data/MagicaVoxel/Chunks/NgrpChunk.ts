import Chunk from "./Chunk";

export default class NgrpChunk extends Chunk {
  nodeId: number;
  childNodeIds: number[];

  constructor(nodeId: number, childNodeIds: number[]) {
    super();
    this.nodeId = nodeId;
    this.childNodeIds = childNodeIds;
  }
}
