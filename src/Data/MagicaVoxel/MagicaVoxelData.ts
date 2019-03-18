import MainChunk from "./Chunks/MainChunk";

export default class MagicaVoxelData {
  mainChunk: MainChunk;
  constructor (mainChunk: MainChunk) {
    this.mainChunk = mainChunk;
  }
}
