import {Block, createBlock} from './blocks';
import {Biome, BIOME_TYPES, createBiome} from './biomes';
import {BIOME_SIZE, MAX_BIOME_GENERATION_DEPTH, MIN_Z} from './consts';

interface Coord2D {
  x: number;
  y: number;
}
interface Coord extends Coord2D {
  z: number;
}

interface World {
  [coordStr: string]: Block;
}

interface Biomes {
  [coord2DStr: string]: Biome;
}

const biomes: Biomes = {};
const world: World = {};

function populateBiomes(depth: number, x: number, y: number): void {
  if (depth > MAX_BIOME_GENERATION_DEPTH) {
    return;
  }
  const coord2DStr = `${x},${y}`;
  if (biomes[coord2DStr] == null) {
    biomes[coord2DStr] = createBiome(
      BIOME_TYPES[Math.floor(Math.random() * BIOME_TYPES.length)]
    );
  }
  populateBiomes(depth + 1, x, y - BIOME_SIZE);
  populateBiomes(depth + 1, x, y + BIOME_SIZE);
  populateBiomes(depth + 1, x - BIOME_SIZE, y);
  populateBiomes(depth + 1, x + BIOME_SIZE, y);
}
populateBiomes(0, 0, 0);

function populateWorld(depth: number, x: number, y: number): void {
  if (depth > MAX_BIOME_GENERATION_DEPTH) {
    return;
  }
  if (world[coordToStr({x, y, z: 0})] == null) {
    fillWorldChunk(x, y);
  }
  populateWorld(depth + 1, x, y - BIOME_SIZE);
  populateWorld(depth + 1, x, y + BIOME_SIZE);
  populateWorld(depth + 1, x - BIOME_SIZE, y);
  populateWorld(depth + 1, x + BIOME_SIZE, y);
}
populateWorld(0, 0, 0);

function fillWorldChunk(startX: number, startY: number): void {
  const biome = getBiome({x: startX, y: startY});
  for (let x = startX; x < startX + BIOME_SIZE; x++) {
    for (let y = startY; y < startY + BIOME_SIZE; y++) {
      for (let z = MIN_Z; z <= 0; z++) {
        world[coordToStr({x, y, z})] = createBlock(biome.type);
      }
    }
  }
}

export function getBlock(c: Coord): Block | null {
  return world[coordToStr(c)] ?? null;
}

export function getBiome(c: Coord2D): Biome {
  return biomes[coord2DToStr(c)];
}

export function coordToStr({x, y, z}: Coord): string {
  return `${x},${y},${z}`;
}
export function strToCoord(str: string): Coord {
  const split = str.split(',').map(Number);
  if (split.length !== 3 || split.some(Number.isNaN)) {
    throw new Error(`invalid Coord string: ${str}`);
  }
  return {x: split[0], y: split[1], z: split[2]};
}

export function coord2DToStr({x, y}: Coord2D): string {
  return `${x},${y}`;
}
export function strToCoord2D(str: string): Coord2D {
  const split = str.split(',').map(Number);
  if (split.length !== 2 || split.some(Number.isNaN)) {
    throw new Error(`invalid Coord2D string: ${str}`);
  }
  return {x: split[0], y: split[1]};
}
