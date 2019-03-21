import Chunk from "./Chunk";

export default class LayrChunk extends Chunk {
  layerId: number;
  name: string;
  hidden: boolean;

  constructor(layerId: number, name: string, hidden: boolean) {
    super();
    this.layerId = layerId;
    this.name = name;
    this.hidden = hidden;
  }
}
