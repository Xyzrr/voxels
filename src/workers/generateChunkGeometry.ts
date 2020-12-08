import {CHUNK_SIZE, VOXEL_FACES} from '../lib/consts';
import {Voxel} from '../interfaces/voxel';
import {ChunkData} from '../interfaces/chunk';
import {Neighbors} from '../interfaces/world';

// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any;

const tileSize = 16;
const tileTextureWidth = 256;
const tileTextureHeight = 64;

export interface ChunkGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

function getVoxel(
  x: number,
  y: number,
  z: number,
  chunk: ChunkData,
  neighbors: Neighbors
): Voxel {
  if (x < 0) {
    return 0;
  }

  if (x >= CHUNK_SIZE) {
    return 0;
  }

  if (y < 0) {
    return 0;
  }

  if (y >= CHUNK_SIZE) {
    return 0;
  }

  if (z < 0) {
    return 0;
  }

  if (z >= CHUNK_SIZE) {
    return 0;
  }

  const index = x * CHUNK_SIZE * CHUNK_SIZE + y * CHUNK_SIZE + z;
  return chunk[index];
}

export function getUv(voxel: Voxel): number {
  switch (voxel) {
    case Voxel.dirt:
      return 7;
      break;
    case Voxel.stone:
      return 1;
      break;
    case Voxel.water:
      return 12;
      break;
    default:
      return 0;
  }
}

function getGeometry(
  chunk: ChunkData,
  neighbors: Neighbors,
  transparent: boolean
): [ChunkGeometryData, ArrayBuffer[]] | [undefined, []] {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < CHUNK_SIZE; i++) {
    for (let j = 0; j < CHUNK_SIZE; j++) {
      for (let k = 0; k < CHUNK_SIZE; k++) {
        const voxel = getVoxel(i, j, k, chunk, neighbors);

        if (voxel !== Voxel.air && Voxel.isTransparent(voxel) === transparent) {
          const uvVoxel = getUv(voxel);

          for (const {dir, corners, uvRow} of VOXEL_FACES) {
            const neighbor = getVoxel(
              i + dir[0],
              j + dir[1],
              k + dir[2],
              chunk,
              neighbors
            );
            if (
              neighbor === Voxel.air ||
              (!Voxel.isTransparent(voxel) && Voxel.isTransparent(neighbor))
            ) {
              // this voxel has no neighbor in this direction so we need a face.
              const ndx = positions.length / 3;
              for (const {pos, uv} of corners) {
                positions.push(i + pos[0], j + pos[1], k + pos[2]);
                normals.push(...dir);
                uvs.push(
                  ((uvVoxel + uv[0]) * tileSize) / tileTextureWidth,
                  1 - ((uvRow + 1 - uv[1]) * tileSize) / tileTextureHeight
                );
              }
              indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
            }
          }
        }
      }
    }
  }

  if (positions.length === 0) {
    return [undefined, []];
  }

  const positionsBuffer = new Float32Array(positions);
  const normalsBuffer = new Float32Array(normals);
  const uvsBuffer = new Float32Array(uvs);
  const indicesBuffer = new Uint16Array(indices);

  return [
    {
      positions: positionsBuffer,
      normals: normalsBuffer,
      uvs: uvsBuffer,
      indices: indicesBuffer,
    },
    [
      positionsBuffer.buffer,
      normalsBuffer.buffer,
      uvsBuffer.buffer,
      indicesBuffer.buffer,
    ],
  ];
}

export function generateChunkGeometry(data: {
  chunk: ChunkData;
  neighbors: Neighbors;
}) {
  console.log('Renderer (worker): Generating geometry...');
  let startTime = Date.now();

  const chunk = data.chunk;
  const neighbors = data.neighbors;

  const [opaqueGeometry, opaqueBuffer] = getGeometry(chunk, neighbors, false);
  const [transparentGeometry, transparentBuffer] = getGeometry(
    chunk,
    neighbors,
    true
  );

  ctx.postMessage(
    {
      type: 'generateChunkGeometry',
      transparent: transparentGeometry,
      opaque: opaqueGeometry,
    },
    [...opaqueBuffer, ...transparentBuffer]
  );

  let totalTime = Date.now() - startTime;
  console.log('Renderer (worker): Generated geometry in', totalTime, 'ms');
}
