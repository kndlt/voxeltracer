import VoxelScene from "../Models/VoxelScene";
import ndarray from "ndarray";
import VoxelArt from "../Models/VoxelArt";
import Obj from "../Models/Obj";
import { Matrix4, Vector3 } from "three";
import ShapeHash from "../Types/ShapeHash"

// iOS 12.1 (16B91) Simulator's max is 4096.
export const MAX_TEXTURE_WIDTH = 4096;

function getTextureWidth(scene: VoxelScene): number {
  const { models } = scene;
  const fullVolume = models.reduce((
    volume, { size }) => volume + size.x * size.y * size.z,
    0
  );
  let width = 1;
  while (width * width * 4 < fullVolume) {
    width *= 2;
  }
  if (width > MAX_TEXTURE_WIDTH) {
    throw 'Texture size limit reached';
  }
  return width;
}

function invertModelMatrix(modelMatrix: Matrix4): Matrix4 {
  // Model = Translation * Rotation
  // inverse(Model) = inverse(Rotation) * inverse(Translation)
  // where inverse(Rotation) = transpose(Rotation) since it is orthogonal
  // and where inverse(Translation) = Translation.
  const invertedTranslationMatrix = (new Matrix4()).setPosition(new Vector3(
    - modelMatrix.elements[12],
    - modelMatrix.elements[13],
    - modelMatrix.elements[14]
  ));
  const invertedRotationMatrix = (new Matrix4()).extractRotation(modelMatrix).transpose();
  const invertedModelMatrix = (new Matrix4()).multiplyMatrices(invertedRotationMatrix, invertedTranslationMatrix);
  return invertedModelMatrix;
}

function getShapeHashes(obj: Obj, models: VoxelArt[], byteOffsets: number[], parentTransform: Matrix4 = new Matrix4()): ShapeHash[] {
  const { modelIndex, hidden } = obj;
  const modelMatrix: Matrix4 = parentTransform.clone().multiply(obj.transform);
  const invertedModelMatrix: Matrix4 = invertModelMatrix(modelMatrix);
  const shapeHashes: ShapeHash[] = [];
  if (!hidden) {
    if (modelIndex !== -1) {
      const model = models[modelIndex];
      const size = model.size.toArray();
      const pos = model.pos.toArray();
      const byteOffset = byteOffsets[modelIndex];
      shapeHashes.push({
        modelIndex,
        modelMatrix: modelMatrix.toArray(),
        invertedModelMatrix: invertedModelMatrix.toArray(),
        size,
        pos,
        byteOffset
      });
    }
    if (obj.children) {
      obj.children.forEach((childObj) => {
        shapeHashes.push(...getShapeHashes(childObj, models, byteOffsets, modelMatrix));
      })
    }
  }
  return shapeHashes;
}

export default class ScenePacker {
  pack(scene: VoxelScene): [ShapeHash[], ndarray] {
    const width = getTextureWidth(scene);
    const byteOffsets: number[] = [];
    const textureData = new Uint8Array(width * width * 4);
    const { models } = scene;
    let byteOffset = 0;
    models.forEach((model: VoxelArt, index: number) => {
      textureData.set(model.data, byteOffset);
      byteOffsets.push(byteOffset);
      byteOffset += model.data.length;
    });
    const packedTexture = ndarray(textureData, [width, width, 4]);
    const shapeHashes: ShapeHash[] = getShapeHashes(scene.rootObj, models, byteOffsets);
    return [shapeHashes, packedTexture];
  }
}
