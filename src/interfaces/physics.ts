import {Box3, Vector3} from 'three';
import {Coord} from './coord';
import {Voxel} from './voxel';
import {VoxelWorld} from './world';

export interface Physics {
  world: VoxelWorld;
}

export interface PhysicsInterface {
  init(world: VoxelWorld): Physics;
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
}

export const Physics: PhysicsInterface = {
  init(world) {
    return {
      world,
    };
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
            if (voxel === Voxel.dirt || voxel === Voxel.unloaded) {
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
            if (voxel === Voxel.dirt || voxel === Voxel.unloaded) {
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
};
