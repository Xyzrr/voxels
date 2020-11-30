export interface Coord {
  x: number;
  y: number;
  z: number;
}

export type CoordMap<T> = Map<number, Map<number, Map<number, T>>>;

export interface CoordMapInterface {
  init<T>(): CoordMap<T>;
  get<T>(map: CoordMap<T>, coord: Coord): T | null;
  set<T>(map: CoordMap<T>, coord: Coord, block: T): void;
}

export const CoordMap: CoordMapInterface = {
  init() {
    return new Map();
  },

  get(map, {x, y, z}) {
    let xMap = map.get(x);
    if (xMap == null) {
      return null;
    }
    let yMap = xMap.get(y);
    if (yMap == null) {
      return null;
    }
    return yMap.get(z) ?? null;
  },

  set(map, {x, y, z}, block) {
    let xMap = map.get(x);
    if (xMap == null) {
      xMap = new Map();
      map.set(x, xMap);
    }
    let yMap = xMap.get(y);
    if (yMap == null) {
      yMap = new Map();
      xMap.set(y, yMap);
    }
    yMap.set(z, block);
  },
};
