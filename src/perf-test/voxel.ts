export interface DirtVoxel {
  type: 'dirt';
}

export interface StoneVoxel {
  type: 'stone';
}

export type Voxel = DirtVoxel | StoneVoxel;
