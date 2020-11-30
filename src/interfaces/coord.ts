export interface Coord {
  x: number;
  y: number;
  z: number;
}

export interface CoordInterface {
  toString(coord: Coord): string;
  fromString(str: string): Coord;
}

export const Coord: CoordInterface = {
  toString({x, y, z}) {
    return `${x},${y},${z}`;
  },

  fromString(str) {
    const split = str.split(',').map(Number);
    if (split.length !== 3 || split.some(Number.isNaN)) {
      throw new Error(`invalid Coord string: ${str}`);
    }
    return {x: split[0], y: split[1], z: split[2]};
  },
};
