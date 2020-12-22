export const MAX_BIOME_GENERATION_DEPTH = 5;
export const BIOME_SIZE = 10;

export const MIN_Z = -50;
export const MAX_Z = 50;

export const DRAW_DISTANCE = 4;
export const DRAW_DISTANCE_Y = 2;

// colors
export const BLACK = 0x000000;
export const WHITE = 0xffffff;
export const BLUE = 0x93d5ed;

export const CHUNK_SIZE = 32;

export const VOXEL_FACES = [
  {
    name: 'left',
    uvRow: 0,
    dir: [-1, 0, 0],
    corners: [
      {pos: [0, 1, 0], uv: [0, 1]},
      {pos: [0, 0, 0], uv: [0, 0]},
      {pos: [0, 1, 1], uv: [1, 1]},
      {pos: [0, 0, 1], uv: [1, 0]},
    ],
  },
  {
    name: 'right',
    uvRow: 0,
    dir: [1, 0, 0],
    corners: [
      {pos: [1, 1, 1], uv: [0, 1]},
      {pos: [1, 0, 1], uv: [0, 0]},
      {pos: [1, 1, 0], uv: [1, 1]},
      {pos: [1, 0, 0], uv: [1, 0]},
    ],
  },
  {
    name: 'bottom',
    uvRow: 2,
    dir: [0, -1, 0],
    corners: [
      {pos: [1, 0, 1], uv: [1, 0]},
      {pos: [0, 0, 1], uv: [0, 0]},
      {pos: [1, 0, 0], uv: [1, 1]},
      {pos: [0, 0, 0], uv: [0, 1]},
    ],
  },
  {
    name: 'top',
    uvRow: 1,
    dir: [0, 1, 0],
    corners: [
      {pos: [0, 1, 1], uv: [1, 1]},
      {pos: [1, 1, 1], uv: [0, 1]},
      {pos: [0, 1, 0], uv: [1, 0]},
      {pos: [1, 1, 0], uv: [0, 0]},
    ],
  },
  {
    name: 'back',
    uvRow: 0,
    dir: [0, 0, -1],
    corners: [
      {pos: [1, 0, 0], uv: [0, 0]},
      {pos: [0, 0, 0], uv: [1, 0]},
      {pos: [1, 1, 0], uv: [0, 1]},
      {pos: [0, 1, 0], uv: [1, 1]},
    ],
  },
  {
    name: 'front',
    uvRow: 0,
    dir: [0, 0, 1],
    corners: [
      {pos: [0, 0, 1], uv: [0, 0]},
      {pos: [1, 0, 1], uv: [1, 0]},
      {pos: [0, 1, 1], uv: [0, 1]},
      {pos: [1, 1, 1], uv: [1, 1]},
    ],
  },
];
