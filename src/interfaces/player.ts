import {Euler, Vector3} from 'three';

export interface Player {
  position: Vector3;
  rotation: Euler;
  moveSpeed: number;

  movingForward: boolean;
  movingBackward: boolean;

  startMovingForward?(): void;
  stopMovingForward?(): void;
  startMovingBackward?(): void;
  stopMovingBackward?(): void;
  update(delta: number): void;

  rotate(deltaX: number, deltaY: number): void;
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
      moveSpeed: 10,
      movingForward: false,
      movingBackward: false,

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

      update(delta) {
        if (player.movingForward) {
          player.position.sub(
            new Vector3(0, 0, delta * player.moveSpeed).applyEuler(
              player.rotation
            )
          );
        }

        if (player.movingBackward) {
          player.position.add(
            new Vector3(0, 0, delta * player.moveSpeed).applyEuler(
              player.rotation
            )
          );
        }
      },

      rotate(deltaX, deltaY) {
        player.rotation.x += deltaX;
        player.rotation.y += deltaY;
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
    });

    window.addEventListener('mousemove', (e) => {
      player.rotate(-e.movementY * 0.01, -e.movementX * 0.01);
    });
  },
};
