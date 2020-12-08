// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!../workers/worker';

import {Voxel} from './voxel';
import {Coord, CoordMap} from './coord';
import {CHUNK_SIZE, VOXEL_FACES} from '../lib/consts';
import {ChunkData} from './chunk';

const worker = new Worker();

export interface Neighbors {
  left: ChunkData;
  right: ChunkData;
  bottom: ChunkData;
  top: ChunkData;
  back: ChunkData;
  front: ChunkData;
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
  loadChunkAndNeighbors(
    world: VoxelWorld,
    chunkCoord: Coord
  ): Promise<{chunk: ChunkData; neighbors: Neighbors}>;
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
    const neighbors: any = {};

    for (const {name, dir} of VOXEL_FACES) {
      const neighbor = VoxelWorld.getChunk(world, {
        x: chunkCoord.x + dir[0],
        y: chunkCoord.y + dir[1],
        z: chunkCoord.z + dir[2],
      });

      if (neighbor == null) {
        throw new Error('Attempted to neighbor before loading it');
      }

      neighbors[name as keyof Neighbors] = neighbor;
    }

    return neighbors;
  },

  getVoxel(world, coord) {
    return world.getVoxel(coord);
  },

  updateVoxel(world, coord, newVoxel) {
    return world.updateVoxel(coord, newVoxel);
  },

  async loadChunk(world, chunkCoord) {
    return new Promise((resolve) => {
      console.log('World: Posting load chunk message', chunkCoord);
      worker.postMessage({type: 'loadChunk', chunkCoord});
      worker.onmessage = (event) => {
        console.log('World: Received message from worker', event);
        if (event.data.type === 'loadChunk') {
          CoordMap.set(world.cache, event.data.coord, event.data.voxels);
          resolve(event.data.voxels);
        }
      };
    });
  },

  async loadChunkAndNeighbors(world, chunkCoord) {
    let chunk = CoordMap.get(world.cache, chunkCoord);
    if (chunk == null) {
      chunk = await VoxelWorld.loadChunk(world, chunkCoord);
    }

    let neighbors: any = {};
    for (const {name, dir} of VOXEL_FACES) {
      const neighborCoord = {
        x: chunkCoord.x + dir[0],
        y: chunkCoord.y + dir[1],
        z: chunkCoord.z + dir[2],
      };
      neighbors[name] = VoxelWorld.getChunk(world, neighborCoord);
      if (neighbors[name] == null) {
        neighbors[name] = await VoxelWorld.loadChunk(world, neighborCoord);
      }
    }

    return {chunk, neighbors};
  },
};
