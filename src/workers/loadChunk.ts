import {simplex2} from '../util/noise';
import {Coord} from '../interfaces/coord';
import {CHUNK_SIZE} from '../lib/consts';
import {Voxel} from '../interfaces/voxel';

function computeVoxel(coord: Coord): Voxel {
  const height = simplex2(coord.x / 64, coord.z / 64) * 8;
  if (coord.y <= height) {
    return Voxel.dirt;
  }
  if (coord.y <= -2) {
    return Voxel.water;
  }
  return Voxel.air;
}

// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any;

export function loadChunk(data: {chunkCoord: Coord}) {
  console.log('World (worker): Loading chunk', data.chunkCoord, '...');
  let startTime = Date.now();

  const chunkCoord = data.chunkCoord;
  const voxels = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);

  for (let i = 0; i < CHUNK_SIZE; i++) {
    for (let j = 0; j < CHUNK_SIZE; j++) {
      for (let k = 0; k < CHUNK_SIZE; k++) {
        const coord = {
          x: chunkCoord.x * CHUNK_SIZE + i,
          y: chunkCoord.y * CHUNK_SIZE + j,
          z: chunkCoord.z * CHUNK_SIZE + k,
        };

        const voxel = computeVoxel(coord);
        voxels[i * CHUNK_SIZE * CHUNK_SIZE + j * CHUNK_SIZE + k] = voxel;
      }
    }
  }

  ctx.postMessage({type: 'loadChunk', coord: data.chunkCoord, voxels}, [
    voxels.buffer,
  ]);

  let totalTime = Date.now() - startTime;
  console.log(
    'World (worker): Loaded chunk at',
    data.chunkCoord,
    'in',
    totalTime,
    'ms'
  );
}
