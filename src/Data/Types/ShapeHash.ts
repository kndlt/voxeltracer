import { Matrix4 } from "three";

export default interface ShapeHash {
  modelIndex: number;
  modelMatrix: number[];
  invertedModelMatrix: number[];
  size: number[],
  pos: number[],
  byteOffset: number
}
