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
    delta: Vector3
  ): {cappedDelta: Vector3; collided: Coord | null};
}

export const Physics: PhysicsInterface = {
  init(world) {
    return {
      world,
    };
  },

  getCappedDelta(physics, position, boundingBox, delta) {
    let collided = null;

    const xx = Math.floor(position.x);
    const zz = Math.floor(position.z);
    const yBottom = position.y;

    let deltaY = delta.y;
    for (
      let yy = Math.floor(yBottom + 0.01) - 1;
      yy + 1 > yBottom + deltaY;
      yy--
    ) {
      const voxel = VoxelWorld.getVoxel(physics.world, {
        x: xx,
        y: yy,
        z: zz,
      });
      if (voxel === Voxel.dirt || voxel === Voxel.unloaded) {
        // console.log(
        //   'detecting ground at',
        //   yy + 1,
        //   'player at',
        //   yBottom,
        //   'changing',
        //   deltaY,
        //   'to',
        //   yy + 1 - yBottom
        // );
        if (deltaY < yy + 1 - yBottom) {
          deltaY = yy + 1 - yBottom;
          collided = {x: xx, y: yy, z: zz};
        }
      }
    }

    // console.log('collided', collided);

    return {cappedDelta: new Vector3(0, deltaY, 0), collided};
  },
};
