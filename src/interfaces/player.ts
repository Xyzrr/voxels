import {Box3, BoxBufferGeometry, Euler, Vector3} from 'three';
import {Physics} from './physics';
import {Voxel} from './voxel';
import {VoxelWorld} from './world';

const GRAVITY = 9.8;

const PLAYER_TO_EVENT_LISTENER: WeakMap<Player, any> = new WeakMap();

export interface Player {
  position: Vector3;
  rotation: Euler;
  moveSpeed: number;
  boundingBox: Box3;
  physics?: Physics;

  flying: boolean;

  movingForward: boolean;
  movingBackward: boolean;
  movingLeft: boolean;
  movingRight: boolean;
  flyingUp: boolean;
  flyingDown: boolean;

  yVelocity: number;

  onRotate?(): void;
  update(delta: number): void;
}

export interface PlayerInterface {
  init(): Player;

  setPhysics(player: Player, physics: Physics): void;

  jump(player: Player): void;
  setMovingForward(player: Player, value: boolean): void;
  setMovingBackward(player: Player, value: boolean): void;
  setMovingLeft(player: Player, value: boolean): void;
  setMovingRight(player: Player, value: boolean): void;
  setFlyingUp(player: Player, value: boolean): void;
  setFlyingDown(player: Player, value: boolean): void;
  setRotation(player: Player, euler: Euler): void;

  bindToUserControls(player: Player): void;
  unbindFromUserControls(player: Player): void;
}

export const Player: PlayerInterface = {
  init() {
    const player: Player = {
      position: new Vector3(0, 2, 0),
      rotation: new Euler(0, 0, 0, 'YXZ'),
      moveSpeed: 40,
      boundingBox: new Box3(new Vector3(0, 0, 0), new Vector3(1, 2, 1)),

      flying: false,

      movingForward: false,
      movingBackward: false,
      movingLeft: false,
      movingRight: false,

      flyingUp: false,
      flyingDown: false,

      yVelocity: 0,

      update(deltaTime) {
        const moveForwardBy = (distance: number): boolean => {
          if (player.physics != null) {
            const rawDelta = new Vector3(0, 0, -distance).applyEuler(
              new Euler(0, player.rotation.y, player.rotation.z, 'YXZ')
            );
            const {cappedDelta, collided} = Physics.getCappedDelta3(
              player.physics,
              player.position,
              player.boundingBox,
              rawDelta
            );
            player.position.add(cappedDelta);
            return collided;
          }
          return false;
        };

        const moveRightBy = (distance: number): boolean => {
          if (player.physics != null) {
            const rawDelta = new Vector3(distance, 0, 0).applyEuler(
              player.rotation
            );
            const {cappedDelta, collided} = Physics.getCappedDelta3(
              player.physics,
              player.position,
              player.boundingBox,
              rawDelta
            );
            player.position.add(cappedDelta);
            return collided;
          }
          return false;
        };

        const moveUpBy = (distance: number): boolean => {
          if (player.physics != null) {
            const rawDelta = new Vector3(0, distance, 0);
            const {cappedDelta, collided} = Physics.getCappedDelta3(
              player.physics,
              player.position,
              player.boundingBox,
              rawDelta
            );
            player.position.add(cappedDelta);
            return collided;
          }
          return false;
        };

        if (player.movingForward) {
          moveForwardBy(deltaTime * player.moveSpeed);
        }

        if (player.movingBackward) {
          moveForwardBy(-deltaTime * player.moveSpeed);
        }

        if (player.movingLeft) {
          moveRightBy(-deltaTime * player.moveSpeed);
        }

        if (player.movingRight) {
          moveRightBy(deltaTime * player.moveSpeed);
        }

        if (player.flying) {
          if (player.flyingUp) {
            moveUpBy(deltaTime * player.moveSpeed);
          }

          if (player.flyingDown) {
            moveUpBy(-deltaTime * player.moveSpeed);
          }
        } else {
          if (player.physics != null) {
            player.yVelocity -= deltaTime * GRAVITY;
            const collided = moveUpBy(deltaTime * player.yVelocity);
            if (collided) {
              player.yVelocity = 0;
            }
          }
        }
      },
    };

    return player;
  },

  setPhysics(player, physics) {
    player.physics = physics;
  },

  jump(player) {
    player.yVelocity = 5;
  },

  setMovingForward(player, value) {
    player.movingForward = value;
  },

  setMovingBackward(player, value) {
    player.movingBackward = value;
  },

  setMovingLeft(player, value) {
    player.movingLeft = value;
  },

  setMovingRight(player, value) {
    player.movingRight = value;
  },

  setFlyingUp(player, value) {
    player.flyingUp = value;
  },

  setFlyingDown(player, value) {
    player.flyingDown = value;
  },

  setRotation(player, euler) {
    player.rotation.set(euler.x, euler.y, euler.z);
    player.onRotate?.();
  },

  bindToUserControls(player) {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) {
        Player.setMovingForward(player, true);
        return;
      }

      if (['ArrowDown', 's', 'S'].includes(e.key)) {
        Player.setMovingBackward(player, true);
        return;
      }

      if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        Player.setMovingLeft(player, true);
        return;
      }

      if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        Player.setMovingRight(player, true);
        return;
      }

      if (e.key === ' ') {
        Player.setFlyingUp(player, true);
        if (!player.flying) {
          Player.jump(player);
        }
        return;
      }

      if (e.key === 'Shift') {
        Player.setFlyingDown(player, true);
        return;
      }
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) {
        Player.setMovingForward(player, false);
        return;
      }

      if (['ArrowDown', 's', 'S'].includes(e.key)) {
        Player.setMovingBackward(player, false);
        return;
      }

      if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        Player.setMovingLeft(player, false);
        return;
      }

      if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        Player.setMovingRight(player, false);
        return;
      }

      if (e.key === ' ') {
        Player.setFlyingUp(player, false);
        return;
      }

      if (e.key === 'Shift') {
        Player.setFlyingDown(player, false);
        return;
      }
    };

    const onMouseMove = (e: MouseEvent): void => {
      Player.setRotation(
        player,
        new Euler(
          Math.max(
            Math.min(player.rotation.x - e.movementY * 0.005, 1.57),
            -1.57
          ),
          player.rotation.y - e.movementX * 0.005,
          player.rotation.z
        )
      );
    };

    PLAYER_TO_EVENT_LISTENER.set(player, {onKeyDown, onKeyUp, onMouseMove});

    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', onMouseMove);
  },

  unbindFromUserControls(player) {
    window.removeEventListener(
      'keyup',
      PLAYER_TO_EVENT_LISTENER.get(player).onKeyUp
    );
    window.removeEventListener(
      'keydown',

      PLAYER_TO_EVENT_LISTENER.get(player).onKeyDown
    );
    window.removeEventListener(
      'mousemove',
      PLAYER_TO_EVENT_LISTENER.get(player).onMouseMove
    );
  },
};
