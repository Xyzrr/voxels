export const BLOCK_TYPES = ['dirt', 'stone', 'water'] as const;
export type BlockType = typeof BLOCK_TYPES[number];

export interface Block {
  type: BlockType;
}

export function createBlock(type: BlockType): Block {
  return {type};
}
