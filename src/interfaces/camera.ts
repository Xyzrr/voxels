import * as THREE from 'three';
import {Player} from './player';

const CAMERA_TO_EVENT_LISTENERS: WeakMap<PlayerCamera, any> = new WeakMap();

export type PlayerCameraMode = 'first' | 'third';

export interface PlayerCamera {
  camera: THREE.PerspectiveCamera;
  mode: PlayerCameraMode;
  player: Player;
  onSetMode?(mode: PlayerCameraMode): void;
}

export interface PlayerCameraInterface {
  init(player: Player): PlayerCamera;
  setMode(playerCamera: PlayerCamera, mode: PlayerCameraMode): void;
  setThirdPersonCameraPosition(playerCamera: PlayerCamera): void;
  setFirstPersonCameraPosition(playerCamera: PlayerCamera): void;
  update(playerCamera: PlayerCamera): void;
  adaptToScreenSize(
    playerCamera: PlayerCamera,
    width: number,
    height: number
  ): void;
  bindToUserControls(playerCamera: PlayerCamera): void;
  unbindFromUserControls(playerCamera: PlayerCamera): void;
}

export const PlayerCamera: PlayerCameraInterface = {
  init(player) {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      20000
    );
    camera.position.set(5, 15, 30);

    const playerCamera: PlayerCamera = {
      camera,
      mode: 'third',
      player,
    };

    const {update, onRotate} = player;

    player.update = (delta) => {
      update(delta);
      PlayerCamera.update(playerCamera);
    };

    player.onRotate = () => {
      onRotate?.();
      playerCamera.camera.quaternion.setFromEuler(player.rotation);
      PlayerCamera.update(playerCamera);
    };

    return playerCamera;
  },

  setMode(playerCamera, mode) {
    playerCamera.mode = mode;
    playerCamera.onSetMode?.(mode);
  },

  update(playerCamera) {
    if (playerCamera.mode === 'first') {
      PlayerCamera.setFirstPersonCameraPosition(playerCamera);
    } else if (playerCamera.mode === 'third') {
      PlayerCamera.setThirdPersonCameraPosition(playerCamera);
    }
  },

  setFirstPersonCameraPosition(playerCamera) {
    let cameraDirectionVector = new THREE.Vector3();
    playerCamera.camera.getWorldDirection(cameraDirectionVector);

    const eyePosition = Player.getEyePosition(playerCamera.player);

    playerCamera.camera.position.set(
      eyePosition.x,
      eyePosition.y,
      eyePosition.z
    );
  },

  setThirdPersonCameraPosition(playerCamera) {
    let cameraDirectionVector = new THREE.Vector3();
    playerCamera.camera.getWorldDirection(cameraDirectionVector);

    const eyePosition = Player.getEyePosition(playerCamera.player);
    const newCameraPosition = eyePosition.sub(
      cameraDirectionVector.multiplyScalar(10)
    );

    playerCamera.camera.position.set(
      newCameraPosition.x,
      newCameraPosition.y,
      newCameraPosition.z
    );
  },

  adaptToScreenSize(playerCamera, width, height) {
    playerCamera.camera.aspect = width / height;
    playerCamera.camera.updateProjectionMatrix();
  },

  bindToUserControls(playerCamera) {
    if (CAMERA_TO_EVENT_LISTENERS.has(playerCamera)) {
      PlayerCamera.unbindFromUserControls(playerCamera);
    }

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'F5') {
        if (playerCamera.mode === 'third') {
          PlayerCamera.setMode(playerCamera, 'first');
        } else {
          PlayerCamera.setMode(playerCamera, 'third');
        }
      }
    };

    CAMERA_TO_EVENT_LISTENERS.set(playerCamera, {onKeyDown});

    window.addEventListener('keydown', onKeyDown);
  },

  unbindFromUserControls(playerCamera) {
    window.removeEventListener(
      'keydown',
      CAMERA_TO_EVENT_LISTENERS.get(playerCamera).onKeyDown
    );

    CAMERA_TO_EVENT_LISTENERS.delete(playerCamera);
  },
};
