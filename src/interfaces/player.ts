import {Euler, Vector3} from 'three';

const GRAVITY = 9.8;

export interface Player {
  position: Vector3;
  rotation: Euler;
  moveSpeed: number;

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

  setFlyingForward(player: Player, value: boolean): void;
  setFlyingBackward(player: Player, value: boolean): void;
  setFlyingLeft(player: Player, value: boolean): void;
  setFlyingRight(player: Player, value: boolean): void;
  setFlyingUp(player: Player, value: boolean): void;
  setFlyingDown(player: Player, value: boolean): void;
  setRotation(player: Player, euler: Euler): void;

  bindToUserControls(player: Player): void;
}

export const Player: PlayerInterface = {
  init() {
    const player: Player = {
      position: new Vector3(5, 15, 30),
      rotation: new Euler(0, 0, 0, 'YXZ'),
      moveSpeed: 20,

      flying: true,

      flyingForward: false,
      flyingBackward: false,
      flyingLeft: false,
      flyingRight: false,
      flyingUp: false,
      flyingDown: false,

      yVelocity: 0,

      update(delta) {
        if (player.flying) {
          if (player.flyingForward) {
            player.position.sub(
              new Vector3(0, 0, delta * player.moveSpeed).applyEuler(
                new Euler(0, player.rotation.y, player.rotation.z, 'YXZ')
              )
            );
          }

          if (player.flyingBackward) {
            player.position.add(
              new Vector3(0, 0, delta * player.moveSpeed).applyEuler(
                new Euler(0, player.rotation.y, player.rotation.z, 'YXZ')
              )
            );
          }

          if (player.flyingLeft) {
            player.position.sub(
              new Vector3(delta * player.moveSpeed, 0, 0).applyEuler(
                player.rotation
              )
            );
          }

          if (player.flyingRight) {
            player.position.add(
              new Vector3(delta * player.moveSpeed, 0, 0).applyEuler(
                player.rotation
              )
            );
          }

          if (player.flyingUp) {
            player.position.add(new Vector3(0, delta * player.moveSpeed, 0));
          }

          if (player.flyingDown) {
            player.position.sub(new Vector3(0, delta * player.moveSpeed, 0));
          }
        } else {
          player.yVelocity -= delta * GRAVITY;
          player.position.add(new Vector3(0, delta * player.yVelocity, 0));
        }
      },
    };

    return player;
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
    window.addEventListener('keydown', (e) => {
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
    });

    window.addEventListener('keyup', (e) => {
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
    });

    window.addEventListener('mousemove', (e) => {
      Player.setRotation(
        player,
        new Euler(
          Math.max(Math.min(player.rotation.x - e.movementY * 0.005, 1), -1),
          player.rotation.y - e.movementX * 0.005,
          player.rotation.z
        )
      );
    });
  },
};
