import * as THREE from 'three';
import {Player} from './player';

const CAMERA_TO_EVENT_LISTENERS: WeakMap<PlayerCamera, any> = new WeakMap();

export interface PlayerCamera {
  camera: THREE.PerspectiveCamera;
  mode: 'first' | 'third';
  player: Player;
}

export interface PlayerCameraInterface {
  init(player: Player): PlayerCamera;
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

  update(playerCamera) {
    if (playerCamera.mode === 'first') {
      PlayerCamera.setFirstPersonCameraPosition(playerCamera);
    } else if (playerCamera.mode === 'third') {
      PlayerCamera.setThirdPersonCameraPosition(playerCamera);
    }
  },

  setFirstPersonCameraPosition(playerCamera) {
    let boundingBoxCenter = new THREE.Vector3();
    playerCamera.player.boundingBox.getCenter(boundingBoxCenter);
    const playerCenter = playerCamera.player.position
      .clone()
      .add(boundingBoxCenter);

    let cameraDirectionVector = new THREE.Vector3();
    playerCamera.camera.getWorldDirection(cameraDirectionVector);

    const newPosition = playerCenter.setY(
      playerCamera.player.position.y + 1.75
    );

    playerCamera.camera.position.set(
      newPosition.x,
      newPosition.y,
      newPosition.z
    );
  },

  setThirdPersonCameraPosition(playerCamera) {
    let boundingBoxCenter = new THREE.Vector3();
    playerCamera.player.boundingBox.getCenter(boundingBoxCenter);
    const playerCenter = playerCamera.player.position
      .clone()
      .add(boundingBoxCenter);

    let cameraDirectionVector = new THREE.Vector3();
    playerCamera.camera.getWorldDirection(cameraDirectionVector);

    const newPosition = playerCenter
      .setY(playerCamera.player.position.y + 1.75)
      .sub(cameraDirectionVector.multiplyScalar(10));

    playerCamera.camera.position.set(
      newPosition.x,
      newPosition.y,
      newPosition.z
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
          playerCamera.mode = 'first';
        } else {
          playerCamera.mode = 'third';
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
