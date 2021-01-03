export enum Voxel {
  Air = 0,
  Dirt,
  Stone,
  Water,
}

export interface VoxelInterface {
  isTransparent(voxel: Voxel): boolean;
  isSolid(voxel: Voxel): boolean;
}

export const VoxelHelper: VoxelInterface = {
  isTransparent(voxel: Voxel) {
    return voxel === Voxel.Water;
  },
  isSolid(voxel: Voxel) {
    return ![Voxel.Air, Voxel.Water].includes(voxel);
  },
};
