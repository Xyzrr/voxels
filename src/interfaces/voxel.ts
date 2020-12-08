export type Voxel = number;

export const Voxel = {
  unloaded: -1,
  air: 0,
  dirt: 1,
  stone: 2,
  water: 3,
  isTransparent(voxel: Voxel) {
    return voxel === Voxel.water;
  },
};
