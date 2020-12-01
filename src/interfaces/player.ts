import {Euler, Vector3} from 'three';

export interface Player {
  position: Vector3;
  rotation: Euler;
  moveSpeed: number;

  movingForward: boolean;
  movingBackward: boolean;
  movingLeft: boolean;
  movingRight: boolean;

  startMovingForward?(): void;
  stopMovingForward?(): void;
  startMovingBackward?(): void;
  stopMovingBackward?(): void;
  startMovingLeft?(): void;
  stopMovingLeft?(): void;
  startMovingRight?(): void;
  stopMovingRight?(): void;

  rotate(deltaX: number, deltaY: number): void;

  update(delta: number): void;
}

export interface PlayerInterface {
  init(): Player;
  bindToUserControls(player: Player): void;
}

export const Player: PlayerInterface = {
  init() {
    const player: Player = {
      position: new Vector3(5, 15, 30),
      rotation: new Euler(0, 0, 0, 'YXZ'),
      moveSpeed: 20,
      movingForward: false,
      movingBackward: false,
      movingLeft: false,
      movingRight: false,

      startMovingForward() {
        player.movingForward = true;
      },

      stopMovingForward() {
        player.movingForward = false;
      },

      startMovingBackward() {
        player.movingBackward = true;
      },

      stopMovingBackward() {
        player.movingBackward = false;
      },

      startMovingLeft() {
        player.movingLeft = true;
      },

      stopMovingLeft() {
        player.movingLeft = false;
      },

      startMovingRight() {
        player.movingRight = true;
      },

      stopMovingRight() {
        player.movingRight = false;
      },

      rotate(deltaX, deltaY) {
        player.rotation.x += deltaX;
        player.rotation.y += deltaY;
      },

      update(delta) {
        if (player.movingForward) {
          player.position.sub(
            new Vector3(0, 0, delta * player.moveSpeed).applyEuler(
              player.rotation
            )
          );
          console.log(delta * player.moveSpeed * 60);
        }

        if (player.movingBackward) {
          player.position.add(
            new Vector3(0, 0, delta * player.moveSpeed).applyEuler(
              player.rotation
            )
          );
        }

        if (player.movingLeft) {
          player.position.sub(
            new Vector3(delta * player.moveSpeed, 0, 0).applyEuler(
              player.rotation
            )
          );
        }

        if (player.movingRight) {
          player.position.add(
            new Vector3(delta * player.moveSpeed, 0, 0).applyEuler(
              player.rotation
            )
          );
        }
      },
    };

    return player;
  },

  bindToUserControls(player) {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        player.startMovingForward?.();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 's') {
        player.startMovingBackward?.();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.startMovingLeft?.();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'd') {
        player.startMovingRight?.();
        return;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        player.stopMovingForward?.();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 's') {
        player.stopMovingBackward?.();
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.stopMovingLeft?.();
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'd') {
        player.stopMovingRight?.();
        return;
      }
    });

    window.addEventListener('mousemove', (e) => {
      player.rotate(-e.movementY * 0.005, -e.movementX * 0.005);
    });
  },
};
