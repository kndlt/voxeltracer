import VoxelScene from "../Models/VoxelScene";

export default abstract class Context {
  abstract parseScene(data: ArrayBuffer): VoxelScene
}
