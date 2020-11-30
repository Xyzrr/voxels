export interface Coord {
  x: number;
  y: number;
  z: number;
}

export interface CoordMap<T> {
  cache: Map<number, Map<number, Map<number, T>>>;
  get(coord: Coord): T | null;
  set(coord: Coord, block: T): void;
}

export function newCoordMap<T>(): CoordMap<T> {
  const m = new Map();
  return {
    cache: m,

    get({x, y, z}) {
      let xMap = m.get(x);
      if (xMap == null) {
        return null;
      }
      let yMap = xMap.get(y);
      if (yMap == null) {
        return null;
      }
      return yMap.get(z) ?? null;
    },

    set({x, y, z}, block) {
      let xMap = m.get(x);
      if (xMap == null) {
        xMap = new Map();
        m.set(x, xMap);
      }
      let yMap = xMap.get(y);
      if (yMap == null) {
        yMap = new Map();
        xMap.set(y, yMap);
      }
      yMap.set(z, block);
    },
  };
}
