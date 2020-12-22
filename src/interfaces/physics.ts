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

  getCappedDelta(physics, position, boundingBox, delta) {
    let cappedDelta = delta;
    let collided = false;

    for (
      let xx = Math.floor(position.x);
      xx < position.x + boundingBox.max.x;
      xx++
    ) {
      for (
        let zz = Math.floor(position.z);
        zz < position.z + boundingBox.max.z;
        zz++
      ) {
        if (delta > 0) {
          const topY = position.y + boundingBox.max.y;
          for (let yy = Math.ceil(topY - 0.01); yy < topY + delta; yy++) {
            const voxel = VoxelWorld.getVoxel(physics.world, {
              x: xx,
              y: yy,
              z: zz,
            });
            if (voxel === Voxel.dirt || voxel === Voxel.unloaded) {
              if (cappedDelta > yy - topY) {
                cappedDelta = yy - topY;
                collided = true;
              }
            }
          }
        } else {
          for (
            let yy = Math.floor(position.y + 0.01) - 1;
            yy + 1 > position.y + delta;
            yy--
          ) {
            const voxel = VoxelWorld.getVoxel(physics.world, {
              x: xx,
              y: yy,
              z: zz,
            });
            if (voxel === Voxel.dirt || voxel === Voxel.unloaded) {
              if (cappedDelta < yy + 1 - position.y) {
                cappedDelta = yy + 1 - position.y;
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
    const {cappedDelta: cappedDeltaY, collided} = Physics.getCappedDelta(
      physics,
      position,
      boundingBox,
      delta.y
    );

    // console.log('collided', collided);

    return {cappedDelta: new Vector3(0, cappedDeltaY, 0), collided};
  },
};
