import Chunk from "./Chunk";

export default class NtrnChunk extends Chunk {
  nodeId: number = 0;
  name: string = '';
  hidden: boolean = false;
  childNodeId: number;
  layerId: number;

  constructor(nodeId: number, name: string, hidden: boolean, childNodeId: number, layerId: number) {
    super();
    this.nodeId = nodeId;
    this.name = name;
    this.hidden = hidden;
    this.childNodeId = childNodeId;
    this.layerId = layerId;
    // TODO: Need frame attribute dicts.
  }
}
