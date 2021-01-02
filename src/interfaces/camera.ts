import * as THREE from 'three';
import {Player} from './player';

export interface PlayerCamera {
  camera: THREE.PerspectiveCamera;
  mode: 'first' | 'third';
  player: Player;
}

export interface PlayerCameraInterface {
  init(player: Player): PlayerCamera;
  setThirdPersonCameraPosition(playerCamera: PlayerCamera): void;
  adaptToScreenSize(
    playerCamera: PlayerCamera,
    width: number,
    height: number
  ): void;
}

export const PlayerCamera: PlayerCameraInterface = {
  init(player) {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      1,
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
      PlayerCamera.setThirdPersonCameraPosition(playerCamera);
    };

    player.onRotate = () => {
      onRotate?.();
      playerCamera.camera.quaternion.setFromEuler(player.rotation);
      PlayerCamera.setThirdPersonCameraPosition(playerCamera);
    };

    return playerCamera;
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
      .setY(playerCamera.player.position.y + 1.5)
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
};
