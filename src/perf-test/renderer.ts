import * as THREE from 'three';
import {Coord} from './coord';
import {Player} from './player';
import {VoxelWorld} from './world';

const VOXEL_FACES = [
  {
    // left
    dir: [-1, 0, 0],
    corners: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
  },
  {
    // right
    dir: [1, 0, 0],
    corners: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
  {
    // bottom
    dir: [0, -1, 0],
    corners: [
      [1, 0, 1],
      [0, 0, 1],
      [1, 0, 0],
      [0, 0, 0],
    ],
  },
  {
    // top
    dir: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  {
    // back
    dir: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    // front
    dir: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
    ],
  },
];

export interface VoxelRenderer {
  world?: VoxelWorld;
  player?: Player;
  cellSize: number;
  lastFrameTime: number;
  glRenderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

interface VoxelRendererInterface {
  init(): VoxelRenderer;
  setWorld(renderer: VoxelRenderer, world: VoxelWorld): void;
  setPlayer(renderer: VoxelRenderer, player: Player): void;
  bindToElement(renderer: VoxelRenderer, container: HTMLElement): void;
  animate(renderer: VoxelRenderer): void;
  generateGeometryForCell(
    renderer: VoxelRenderer,
    cellCoord: Coord
  ): THREE.BufferGeometry | null;
  loadCell(renderer: VoxelRenderer, cellCoord: Coord): void;
}

export const VoxelRenderer: VoxelRendererInterface = {
  init() {
    const renderer: VoxelRenderer = {
      cellSize: 16,
      lastFrameTime: Date.now(),

      camera: (() => {
        const camera = new THREE.PerspectiveCamera(
          50,
          window.innerWidth / window.innerHeight,
          1,
          20000
        );
        camera.position.set(5, 15, 30);
        return camera;
      })(),

      scene: (() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x93d5ed);
        scene.fog = new THREE.FogExp2(0xffffff, 0.00015);

        function addLight(x: number, y: number, z: number): void {
          const color = 0xffffff;
          const intensity = 1;
          const light = new THREE.DirectionalLight(color, intensity);
          light.position.set(x, y, z);
          scene.add(light);
        }
        addLight(-1, 2, 4);
        addLight(1, -1, -2);

        return scene;
      })(),

      glRenderer: (() => {
        const glRenderer = new THREE.WebGLRenderer();
        glRenderer.setPixelRatio(window.devicePixelRatio);
        glRenderer.setSize(window.innerWidth, window.innerHeight);
        return glRenderer;
      })(),
    };

    return renderer;
  },

  setWorld(renderer, world) {
    const {updateVoxel} = world;

    world.updateVoxel = (coord, newBlock) => {
      updateVoxel(coord, newBlock);
    };

    renderer.world = world;
  },

  setPlayer(renderer, player) {
    const {update} = player;

    player.update = (delta) => {
      update(delta);
      renderer.camera.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      );
    };

    renderer.player = player;
  },

  bindToElement(renderer, container) {
    container.appendChild(renderer.glRenderer.domElement);
  },

  animate(renderer) {
    function animate(): void {
      const now = Date.now() / 1000;
      const delta = now - renderer.lastFrameTime;
      renderer.lastFrameTime = now;

      requestAnimationFrame(animate);
      renderer.player?.update(delta);
      renderer.glRenderer.render(renderer.scene, renderer.camera);
    }

    animate();
  },

  generateGeometryForCell(renderer, {x: cellX, y: cellY, z: cellZ}) {
    const {world} = renderer;
    if (!world) {
      return null;
    }

    const positions = [];
    const normals = [];
    const indices = [];

    const startX = cellX * renderer.cellSize;
    const startY = cellY * renderer.cellSize;
    const startZ = cellZ * renderer.cellSize;

    for (let x = 0; x < renderer.cellSize; ++x) {
      const voxelX = startX + x;
      for (let y = 0; y < renderer.cellSize; ++y) {
        const voxelY = startY + y;
        for (let z = 0; z < renderer.cellSize; ++z) {
          const voxelZ = startZ + z;
          const voxel = VoxelWorld.getVoxel(world, {
            x: voxelX,
            y: voxelY,
            z: voxelZ,
          });
          if (voxel) {
            for (const {dir, corners} of VOXEL_FACES) {
              const neighbor = VoxelWorld.getVoxel(world, {
                x: voxelX + dir[0],
                y: voxelY + dir[1],
                z: voxelZ + dir[2],
              });
              if (!neighbor) {
                // this voxel has no neighbor in this direction so we need a face.
                const ndx = positions.length / 3;
                for (const pos of corners) {
                  positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                  normals.push(...dir);
                }
                indices.push(ndx, ndx + 1, ndx + 2, ndx + 2, ndx + 1, ndx + 3);
              }
            }
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), 3)
    );
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(normals), 3)
    );
    geometry.setIndex(indices);

    return geometry;
  },

  loadCell(renderer, cellCoord) {
    const material = new THREE.MeshLambertMaterial({color: 'green'});
    const geometry = VoxelRenderer.generateGeometryForCell(renderer, cellCoord);
    console.log('geoemtry', geometry);

    if (geometry) {
      const mesh = new THREE.Mesh(geometry, material);
      renderer.scene.add(mesh);
    }
  },
};
