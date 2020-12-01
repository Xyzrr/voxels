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

export function isTransparentVoxel(v: Voxel): boolean {
  return v.type === 'water';
}
