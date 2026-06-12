import { describe, it, expect } from 'vitest';
import { buildVox } from '../../scripts/voxBuilder.mjs';
import MagicaVoxelContext from '../Data/MagicaVoxel/MagicaVoxelContext';
import { buildLightListData, collectShapeHashes } from './SceneTextures';
import { packAtlas } from '../Data/Packers/AtlasPacker';

function sceneFrom(bytes: Uint8Array<ArrayBuffer>) {
  const scene = new MagicaVoxelContext().parseScene(bytes.buffer);
  const layout = packAtlas(
    scene.models.map((m) => [m.size.x, m.size.y, m.size.z]),
    2048
  );
  const hashes = collectShapeHashes(scene, layout);
  return { scene, hashes };
}

describe('buildLightListData', () => {
  it('collects world-space centers of emissive voxels', () => {
    // 2x2x2 model: voxel (0,0,0) emissive palette 7, voxel (1,1,1) diffuse 1
    const bytes = buildVox({
      models: [{ size: [2, 2, 2], voxels: [[0, 0, 0, 7], [1, 1, 1, 1]] }],
      translations: [[10, 0, 1]],
      materials: [[7, { _type: '_emit', _emit: '0.9', _flux: '0.5' }]],
    });
    const { scene, hashes } = sceneFrom(bytes);
    const { data, count } = buildLightListData(scene, hashes);

    expect(count).toBe(1);
    expect(data[3]).toBe(7); // material index
    // MagicaVoxel voxel (0,0,0) of a 2x2x2 model translated by (10,0,1):
    // GL cell (0, 0, 1) => local center pos+(0.5,0.5,1.5); pos=(-1,-1,-1)
    // => local (-0.5,-0.5,0.5) + GL translation (10,1,0)
    expect(data[0]).toBeCloseTo(9.5);
    expect(data[1]).toBeCloseTo(0.5);
    expect(data[2]).toBeCloseTo(0.5);
  });

  it('multiplies lights per instance and respects the cap', () => {
    const voxels: Array<[number, number, number, number]> = [];
    for (let x = 0; x < 4; x++) voxels.push([x, 0, 0, 7]);
    const bytes = buildVox({
      models: [{ size: [4, 1, 1], voxels }],
      materials: [[7, { _type: '_emit', _emit: '1', _flux: '1' }]],
    });
    const { scene, hashes } = sceneFrom(bytes);

    const full = buildLightListData(scene, hashes);
    expect(full.count).toBe(4);

    const capped = buildLightListData(scene, hashes, 2);
    expect(capped.count).toBe(2);
    expect(capped.data).toHaveLength(8);
  });

  it('returns count 0 when the scene has no emissive materials', () => {
    const bytes = buildVox({
      models: [{ size: [1, 1, 1], voxels: [[0, 0, 0, 1]] }],
    });
    const { scene, hashes } = sceneFrom(bytes);
    expect(buildLightListData(scene, hashes).count).toBe(0);
  });
});
