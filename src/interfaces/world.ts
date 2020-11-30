import {Voxel} from './voxel';
import {Coord} from './coord';

export interface VoxelWorld {
  cache: {[coordStr: string]: Voxel | null};
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
      cache: {},

      getVoxel(coord) {
        const key = Coord.toString(coord);
        if (world.cache[key] != null) {
          return world.cache[key];
        }
        const block = world.computeVoxel(coord);
        world.cache[key] = block;
        return block;
      },

      computeVoxel(coord) {
        const height = Math.sin(coord.x / 10) + Math.sin(coord.z / 10) * 5;
        // if (
        //   coord.x >= 0 &&
        //   coord.y >= 0 &&
        //   coord.z >= 0 &&
        //   coord.x < 16 &&
        //   coord.y < height &&
        //   coord.z < 16
        // ) {
        //   return {type: 'dirt'};
        // }
        // return null;
        if (coord.y <= height) {
          return {type: 'dirt'};
        }
        return null;
      },

      updateVoxel(coord, newVoxel) {
        const key = Coord.toString(coord);
        world.cache[key] = newVoxel;
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
