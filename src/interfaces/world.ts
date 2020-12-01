import {Voxel} from './voxel';
import {Coord, CoordMap} from './coord';
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
      cache: CoordMap.init(),

      getVoxel(coord) {
        const fromCache = CoordMap.get(world.cache, coord);
        if (fromCache != null) {
          return fromCache;
        }
        const block = world.computeVoxel(coord);
        if (block != null) {
          CoordMap.set(world.cache, coord, block);
        }
        return block;
      },

      computeVoxel(coord) {
        const height = simplex2(coord.x / 64, coord.z / 64) * 8;
        if (coord.y <= height) {
          return {type: 'dirt'};
        }
        if (coord.y <= -2) {
          return {type: 'water'};
        }
        return null;
      },

      updateVoxel(coord, newVoxel) {
        if (newVoxel != null) {
          CoordMap.set(world.cache, coord, newVoxel);
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
