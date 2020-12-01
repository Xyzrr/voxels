export interface DirtVoxel {
  type: 'dirt';
}

export interface StoneVoxel {
  type: 'stone';
}

export interface WaterVoxel {
  type: 'water';
}

export type Voxel = DirtVoxel | StoneVoxel | WaterVoxel;
