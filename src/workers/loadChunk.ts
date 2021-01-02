import {simplex2} from '../util/noise';
import {Coord} from '../interfaces/coord';
import {CHUNK_SIZE} from '../lib/consts';
import {Voxel} from '../interfaces/voxel';

function computeVoxel(coord: Coord): Voxel {
  const height =
    simplex2(coord.x / 94, coord.z / 94) * 5 +
    simplex2(coord.x / 100, coord.z / 100) * 4;
  if (coord.y <= height) {
    return Voxel.dirt;
  }
  if (coord.y <= -2) {
    return Voxel.water;
  }
  return Voxel.air;
}

export function loadChunk(data: {
  chunkCoord: Coord;
}): {message: any; transfer: Transferable[]} {
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

  let totalTime = Date.now() - startTime;

  console.log(
    'World (worker): Loaded chunk at',
    data.chunkCoord,
    'in',
    totalTime,
    'ms'
  );

  return {
    message: {type: 'loadChunk', coord: data.chunkCoord, voxels},
    transfer: [voxels.buffer],
  };
}
