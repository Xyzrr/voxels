// eslint-disable-next-line import/no-webpack-loader-syntax
import WorldWorker from 'worker-loader!../workers/world';

import {Voxel} from './voxel';
import {Coord, CoordMap} from './coord';
import {CHUNK_SIZE, VOXEL_FACES} from '../lib/consts';
import {ChunkData} from './chunk';

const worker = new WorldWorker();

export interface Neighbors {
  left?: ChunkData;
  right?: ChunkData;
  bottom?: ChunkData;
  top?: ChunkData;
  back?: ChunkData;
  front?: ChunkData;
}

export interface VoxelWorld {
  cache: CoordMap<ChunkData>;
  getVoxel(coord: Coord): Voxel | null;
  updateVoxel(coord: Coord, newVoxel: Voxel | null): void;
}

export interface VoxelWorldInterface {
  init(): VoxelWorld;
  getVoxel(world: VoxelWorld, coord: Coord): Voxel | null;
  getChunk(world: VoxelWorld, chunkCoord: Coord): ChunkData | null;
  getNeighbors(world: VoxelWorld, chunkCoord: Coord): Neighbors;
  updateVoxel(world: VoxelWorld, coord: Coord, newVoxel: Voxel | null): void;
  loadChunk(world: VoxelWorld, chunkCoord: Coord): Promise<ChunkData>;
}

export const VoxelWorld: VoxelWorldInterface = {
  init() {
    const world: VoxelWorld = {
      cache: CoordMap.init(),

      getVoxel(coord) {
        const chunkCoord = {
          x: Math.floor(coord.x / CHUNK_SIZE),
          y: Math.floor(coord.y / CHUNK_SIZE),
          z: Math.floor(coord.z / CHUNK_SIZE),
        };
        const chunk = CoordMap.get(world.cache, chunkCoord);
        if (chunk == null) {
          return Voxel.unloaded;
        }
        return chunk[
          (coord.x % CHUNK_SIZE) * CHUNK_SIZE * CHUNK_SIZE +
            (coord.y % CHUNK_SIZE) * CHUNK_SIZE +
            (coord.z % CHUNK_SIZE)
        ];
      },

      updateVoxel(coord, newVoxel) {},
    };

    return world;
  },

  getChunk(world, chunkCoord) {
    return CoordMap.get(world.cache, chunkCoord);
  },

  getNeighbors(world, chunkCoord) {
    const neighbors: Neighbors = {};

    for (const {name, dir} of VOXEL_FACES) {
      const neighbor = VoxelWorld.getChunk(world, {
        x: chunkCoord.x + dir[0],
        y: chunkCoord.y + dir[1],
        z: chunkCoord.z + dir[2],
      });

      if (neighbor != null) {
        neighbors[name as keyof Neighbors] = neighbor;
      }
    }

    return neighbors;
  },

  getVoxel(world, coord) {
    return world.getVoxel(coord);
  },

  updateVoxel(world, coord, newVoxel) {
    return world.updateVoxel(coord, newVoxel);
  },

  loadChunk(world, chunkCoord) {
    return new Promise((resolve) => {
      console.log('World: Posting load chunk message', chunkCoord);
      worker.postMessage({type: 'loadChunk', coord: chunkCoord});
      worker.onmessage = (event) => {
        console.log('World: Received message from worker', event);
        if (event.data.type === 'loadChunk') {
          CoordMap.set(world.cache, event.data.coord, event.data.voxels);
          resolve(event.data.voxels);
        }
      };
    });
  },
};
