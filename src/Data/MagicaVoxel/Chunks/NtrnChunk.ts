import Chunk from "./Chunk";
import { Matrix4 } from "three";

export default class NtrnChunk extends Chunk {
  nodeId: number = 0;
  name: string = '';
  hidden: boolean = false;
  childNodeId: number;
  transform: Matrix4;
  layerId: number;

  constructor(nodeId: number, name: string, hidden: boolean, childNodeId: number, layerId: number, transform: Matrix4) {
    super();
    this.nodeId = nodeId;
    this.name = name;
    this.hidden = hidden;
    this.childNodeId = childNodeId;
    this.layerId = layerId;
    this.transform = transform;
  }
}
