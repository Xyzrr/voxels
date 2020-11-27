export const BIOME_TYPES = ['dirt', 'stone'] as const;
export type BiomeType = typeof BIOME_TYPES[number];

export interface Biome {
  type: BiomeType;
}

export function createBiome(type: BiomeType): Biome {
  return {type};
}
