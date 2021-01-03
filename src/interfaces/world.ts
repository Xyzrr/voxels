// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!../workers/worker';

import {Voxel} from './voxel';
import {Coord, CoordMap} from './coord';
import {CHUNK_SIZE, VOXEL_FACES} from '../lib/consts';
import {ChunkData} from './chunk';
import {messageWorker} from '../util/messageWorker';

const worker = new Worker();

const mod = (a: number, n: number): number => ((a % n) + n) % n;

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
  updateVoxel(coord: Coord, newVoxel: Voxel): void;
}

export interface VoxelWorldInterface {
  init(): VoxelWorld;
  chunkCoordFromVoxelCoord(world: VoxelWorld, voxelCoord: Coord): Coord;
  getVoxel(world: VoxelWorld, coord: Coord): Voxel | null;
  getChunk(world: VoxelWorld, chunkCoord: Coord): ChunkData | null;
  getNeighbors(world: VoxelWorld, chunkCoord: Coord): Neighbors;
  updateVoxel(world: VoxelWorld, coord: Coord, newVoxel: Voxel): void;
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
        const chunkCoord = VoxelWorld.chunkCoordFromVoxelCoord(world, coord);
        const chunk = CoordMap.get(world.cache, chunkCoord);
        if (chunk == null || chunk.byteLength === 0) {
          return null;
        }
        const index =
          mod(coord.x, CHUNK_SIZE) * CHUNK_SIZE * CHUNK_SIZE +
          mod(coord.y, CHUNK_SIZE) * CHUNK_SIZE +
          mod(coord.z, CHUNK_SIZE);
        return chunk[index];
      },

      updateVoxel(coord, newVoxel) {
        const chunkCoord = VoxelWorld.chunkCoordFromVoxelCoord(world, coord);
        const chunk = CoordMap.get(world.cache, chunkCoord);
        if (chunk == null) {
          return;
        }
        const index =
          mod(coord.x, CHUNK_SIZE) * CHUNK_SIZE * CHUNK_SIZE +
          mod(coord.y, CHUNK_SIZE) * CHUNK_SIZE +
          mod(coord.z, CHUNK_SIZE);
        chunk[index] = newVoxel;
      },
    };

    return world;
  },

  chunkCoordFromVoxelCoord(world, voxelCoord) {
    return {
      x: Math.floor(voxelCoord.x / CHUNK_SIZE),
      y: Math.floor(voxelCoord.y / CHUNK_SIZE),
      z: Math.floor(voxelCoord.z / CHUNK_SIZE),
    };
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
    console.log('World: Posting load chunk message', chunkCoord);
    return new Promise((resolve) =>
      messageWorker(worker, {type: 'loadChunk', chunkCoord}).then(
        ({coord, voxels}) => {
          console.log('World: Received message from worker', voxels);
          CoordMap.set(world.cache, coord, voxels);
          resolve(voxels);
        }
      )
    );
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
