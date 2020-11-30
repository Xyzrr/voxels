import {Voxel} from './voxel';
import {Coord, CoordMap, newCoordMap} from './coord';
import {simplex2} from '../util/noise';

export interface VoxelWorld {
  cache: CoordMap<Voxel>;
  getVoxel(coord: Coord): Voxel | null;
  computeVoxel(coord: Coord): Voxel | null;
  updateVoxel(coord: Coord, newVoxel: Voxel | null): void;
}

export interface VoxelWorldInterface {
  init(): VoxelWorld;
  getVoxel(world: VoxelWorld, coord: Coord): Voxel | null;
  updateVoxel(world: VoxelWorld, coord: Coord, newVoxel: Voxel | null): void;
}

export const VoxelWorld: VoxelWorldInterface = {
  init() {
    const world: VoxelWorld = {
      cache: newCoordMap(),

      getVoxel(coord) {
        const fromCache = world.cache.get(coord);
        if (fromCache != null) {
          return fromCache;
        }
        const block = world.computeVoxel(coord);
        if (block != null) {
          world.cache.set(coord, block);
        }
        return block;
      },

      computeVoxel(coord) {
        const height = simplex2(coord.x / 16, coord.z / 16) * 8;
        if (coord.y <= height) {
          return {type: 'dirt'};
        }
        return null;
      },

      updateVoxel(coord, newVoxel) {
        if (newVoxel != null) {
          world.cache.set(coord, newVoxel);
        }
      },
    };

    return world;
  },

  getVoxel(world, coord) {
    return world.getVoxel(coord);
  },

  updateVoxel(world, coord, newVoxel) {
    return world.updateVoxel(coord, newVoxel);
  },
};
