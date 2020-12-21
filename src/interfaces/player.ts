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

  flyingForward: boolean;
  flyingBackward: boolean;
  flyingLeft: boolean;
  flyingRight: boolean;
  flyingUp: boolean;
  flyingDown: boolean;

  yVelocity: number;

  onRotate?(): void;
  update(delta: number): void;
}

export interface PlayerInterface {
  init(): Player;

  setPhysics(player: Player, physics: Physics): void;
  setFlyingForward(player: Player, value: boolean): void;
  setFlyingBackward(player: Player, value: boolean): void;
  setFlyingLeft(player: Player, value: boolean): void;
  setFlyingRight(player: Player, value: boolean): void;
  setFlyingUp(player: Player, value: boolean): void;
  setFlyingDown(player: Player, value: boolean): void;
  setRotation(player: Player, euler: Euler): void;

  bindToUserControls(player: Player): void;
  unbindFromUserControls(player: Player): void;
}

export const Player: PlayerInterface = {
  init() {
    const player: Player = {
      position: new Vector3(5, 15, 30),
      rotation: new Euler(0, 0, 0, 'YXZ'),
      moveSpeed: 50,
      boundingBox: new Box3(new Vector3(0, 0, 0), new Vector3(1, 2, 1)),

      flying: false,

      flyingForward: false,
      flyingBackward: false,
      flyingLeft: false,
      flyingRight: false,
      flyingUp: false,
      flyingDown: false,

      yVelocity: 0,

      update(deltaTime) {
        if (player.flying) {
          if (player.flyingForward) {
            player.position.sub(
              new Vector3(0, 0, deltaTime * player.moveSpeed).applyEuler(
                new Euler(0, player.rotation.y, player.rotation.z, 'YXZ')
              )
            );
          }

          if (player.flyingBackward) {
            player.position.add(
              new Vector3(0, 0, deltaTime * player.moveSpeed).applyEuler(
                new Euler(0, player.rotation.y, player.rotation.z, 'YXZ')
              )
            );
          }

          if (player.flyingLeft) {
            player.position.sub(
              new Vector3(deltaTime * player.moveSpeed, 0, 0).applyEuler(
                player.rotation
              )
            );
          }

          if (player.flyingRight) {
            player.position.add(
              new Vector3(deltaTime * player.moveSpeed, 0, 0).applyEuler(
                player.rotation
              )
            );
          }

          if (player.flyingUp) {
            player.position.add(
              new Vector3(0, deltaTime * player.moveSpeed, 0)
            );
          }

          if (player.flyingDown) {
            player.position.sub(
              new Vector3(0, deltaTime * player.moveSpeed, 0)
            );
          }
        } else {
          if (player.physics != null) {
            player.yVelocity -= deltaTime * GRAVITY;
            let deltaY = deltaTime * player.yVelocity;
            const delta = Physics.getCappedDelta(
              player.physics,
              player.position,
              player.boundingBox,
              new Vector3(0, deltaY, 0)
            );
            player.position.add(delta);
          }
        }
      },
    };

    return player;
  },

  setPhysics(player, physics) {
    player.physics = physics;
  },

  setFlyingForward(player, value) {
    player.flyingForward = value;
  },

  setFlyingBackward(player, value) {
    player.flyingBackward = value;
  },

  setFlyingLeft(player, value) {
    player.flyingLeft = value;
  },

  setFlyingRight(player, value) {
    player.flyingRight = value;
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
        Player.setFlyingForward(player, true);
        return;
      }

      if (['ArrowDown', 's', 'S'].includes(e.key)) {
        Player.setFlyingBackward(player, true);
        return;
      }

      if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        Player.setFlyingLeft(player, true);
        return;
      }

      if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        Player.setFlyingRight(player, true);
        return;
      }

      if (e.key === ' ') {
        Player.setFlyingUp(player, true);
        return;
      }

      if (e.key === 'Shift') {
        Player.setFlyingDown(player, true);
        return;
      }
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) {
        Player.setFlyingForward(player, false);
        return;
      }

      if (['ArrowDown', 's', 'S'].includes(e.key)) {
        Player.setFlyingBackward(player, false);
        return;
      }

      if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
        Player.setFlyingLeft(player, false);
        return;
      }

      if (['ArrowRight', 'd', 'D'].includes(e.key)) {
        Player.setFlyingRight(player, false);
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
