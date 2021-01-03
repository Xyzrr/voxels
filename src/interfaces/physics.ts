import {Box3, Vector3} from 'three';
import {Coord} from './coord';
import {Voxel, VoxelHelper} from './voxel';
import {VoxelWorld} from './world';

export interface RaycastResult {
  position: Vector3;
  normal: Vector3;
  voxel: Voxel;
}

export interface Physics {
  world: VoxelWorld;
}

export interface PhysicsInterface {
  init(world: VoxelWorld): Physics;
  isIntersectingVoxel(
    position: Vector3,
    boundingBox: Box3,
    coord: Coord
  ): boolean;
  getCappedDelta(
    physics: Physics,
    position: Vector3,
    boundingBox: Box3,
    direction: 'x' | 'y' | 'z',
    delta: number
  ): {cappedDelta: number; collided: boolean};
  getCappedDelta3(
    physics: Physics,
    position: Vector3,
    boundingBox: Box3,
    delta: Vector3
  ): {cappedDelta: Vector3; collided: boolean};
  intersectRay(
    physics: Physics,
    start: Vector3,
    end: Vector3
  ): RaycastResult | null;
}

export const Physics: PhysicsInterface = {
  init(world) {
    return {
      world,
    };
  },

  isIntersectingVoxel(position, boundingBox, coord) {
    return (
      position.x + boundingBox.max.x > coord.x &&
      position.y + boundingBox.max.y > coord.y &&
      position.z + boundingBox.max.z > coord.z &&
      position.x + boundingBox.min.x < coord.x + 1 &&
      position.y + boundingBox.min.y < coord.y + 1 &&
      position.z + boundingBox.min.z < coord.z + 1
    );
  },

  getCappedDelta(physics, position, boundingBox, direction, delta) {
    let cappedDelta = delta;
    let collided = false;

    let axis1: 'x' | 'y' | 'z' = 'x';
    let axis2: 'x' | 'y' | 'z' = 'z';

    if (direction === 'x') {
      axis1 = 'y';
      axis2 = 'z';
    }

    if (direction === 'z') {
      axis1 = 'y';
      axis2 = 'x';
    }

    for (
      let xx = Math.floor(position[axis1]);
      xx < position[axis1] + boundingBox.max[axis1];
      xx++
    ) {
      for (
        let zz = Math.floor(position[axis2]);
        zz < position[axis2] + boundingBox.max[axis2];
        zz++
      ) {
        if (delta > 0) {
          const topY = position[direction] + boundingBox.max[direction];
          for (let yy = Math.ceil(topY - 0.01); yy < topY + delta; yy++) {
            const voxel = VoxelWorld.getVoxel(physics.world, ({
              [axis1]: xx,
              [direction]: yy,
              [axis2]: zz,
            } as unknown) as Coord);
            if (voxel == null || VoxelHelper.isSolid(voxel)) {
              if (cappedDelta > yy - topY) {
                cappedDelta = yy - topY;
                collided = true;
              }
            }
          }
        } else {
          for (
            let yy = Math.floor(position[direction] + 0.01) - 1;
            yy + 1 > position[direction] + delta;
            yy--
          ) {
            const voxel = VoxelWorld.getVoxel(physics.world, ({
              [axis1]: xx,
              [direction]: yy,
              [axis2]: zz,
            } as unknown) as Coord);
            if (voxel == null || VoxelHelper.isSolid(voxel)) {
              if (cappedDelta < yy + 1 - position[direction]) {
                cappedDelta = yy + 1 - position[direction];
                collided = true;
              }
            }
          }
        }
      }
    }

    return {cappedDelta, collided};
  },

  getCappedDelta3(physics, position, boundingBox, delta) {
    const {
      cappedDelta: cappedDeltaX,
      collided: collidedX,
    } = Physics.getCappedDelta(physics, position, boundingBox, 'x', delta.x);
    const {
      cappedDelta: cappedDeltaY,
      collided: collidedY,
    } = Physics.getCappedDelta(physics, position, boundingBox, 'y', delta.y);
    const {
      cappedDelta: cappedDeltaZ,
      collided: collidedZ,
    } = Physics.getCappedDelta(physics, position, boundingBox, 'z', delta.z);

    // console.log('collided', collided);

    return {
      cappedDelta: new Vector3(cappedDeltaX, cappedDeltaY, cappedDeltaZ),
      collided: collidedX || collidedY || collidedZ,
    };
  },

  intersectRay(physics, start, end) {
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    let dz = end.z - start.z;
    const lenSq = dx * dx + dy * dy + dz * dz;
    const len = Math.sqrt(lenSq);

    dx /= len;
    dy /= len;
    dz /= len;

    let t = 0.0;
    let ix = Math.floor(start.x);
    let iy = Math.floor(start.y);
    let iz = Math.floor(start.z);

    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    const txDelta = Math.abs(1 / dx);
    const tyDelta = Math.abs(1 / dy);
    const tzDelta = Math.abs(1 / dz);

    const xDist = stepX > 0 ? ix + 1 - start.x : start.x - ix;
    const yDist = stepY > 0 ? iy + 1 - start.y : start.y - iy;
    const zDist = stepZ > 0 ? iz + 1 - start.z : start.z - iz;

    // location of nearest voxel boundary, in units of t
    let txMax = txDelta < Infinity ? txDelta * xDist : Infinity;
    let tyMax = tyDelta < Infinity ? tyDelta * yDist : Infinity;
    let tzMax = tzDelta < Infinity ? tzDelta * zDist : Infinity;

    let steppedIndex = -1;

    // main loop along raycast vector
    while (t <= len) {
      const voxel = VoxelWorld.getVoxel(physics.world, {x: ix, y: iy, z: iz});
      if (voxel != null && VoxelHelper.isSolid(voxel)) {
        const position = new Vector3(
          start.x + t * dx,
          start.y + t * dy,
          start.z + t * dz
        );

        const normal = new Vector3(
          steppedIndex === 0 ? -stepX : 0,
          steppedIndex === 1 ? -stepY : 0,
          steppedIndex === 2 ? -stepZ : 0
        );

        return {
          position,
          normal,
          voxel,
        };
      }

      // advance t to next nearest voxel boundary
      if (txMax < tyMax) {
        if (txMax < tzMax) {
          ix += stepX;
          t = txMax;
          txMax += txDelta;
          steppedIndex = 0;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      } else {
        if (tyMax < tzMax) {
          iy += stepY;
          t = tyMax;
          tyMax += tyDelta;
          steppedIndex = 1;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      }
    }
    return null;
  },
};
