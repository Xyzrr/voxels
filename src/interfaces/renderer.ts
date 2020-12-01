import * as THREE from 'three';
import {Coord, CoordMap} from './coord';
import {Player} from './player';
import {VoxelWorld} from './world';

(window as any).THREE = THREE;

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
  loadedCells: CoordMap<THREE.Mesh>;
}

interface VoxelRendererInterface {
  init(): VoxelRenderer;
  setWorld(renderer: VoxelRenderer, world: VoxelWorld): void;
  setPlayer(renderer: VoxelRenderer, player: Player): void;
  bindToElement(renderer: VoxelRenderer, container: HTMLElement): void;
  animate(renderer: VoxelRenderer): void;
  generateCellGeometry(
    renderer: VoxelRenderer,
    cellCoord: Coord
  ): THREE.BufferGeometry | null;
  generateCellMesh(
    renderer: VoxelRenderer,
    cellCoord: Coord
  ): THREE.Mesh | null;
  loadCell(renderer: VoxelRenderer, cellCoord: Coord): void;
  loadNearbyCells(renderer: VoxelRenderer): void;
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

      loadedCells: CoordMap.init(),
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
    const {update, rotate} = player;

    player.update = (delta) => {
      update(delta);
      renderer.camera.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      );
    };

    player.rotate = (deltaX, deltaY) => {
      rotate(deltaX, deltaY);
      renderer.camera.quaternion.setFromEuler(player.rotation);
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

      renderer.player?.update(delta);
      renderer.glRenderer.render(renderer.scene, renderer.camera);
      VoxelRenderer.loadNearbyCells(renderer);

      requestAnimationFrame(animate);
    }

    animate();
  },

  generateCellGeometry(renderer, {x: cellX, y: cellY, z: cellZ}) {
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

  generateCellMesh(renderer, cellCoord) {
    const material = new THREE.MeshLambertMaterial({color: 'green'});
    const geometry = VoxelRenderer.generateCellGeometry(renderer, cellCoord);

    if (!geometry) {
      return null;
    }

    return new THREE.Mesh(geometry, material);
  },

  loadCell(renderer, cellCoord) {
    const mesh = VoxelRenderer.generateCellMesh(renderer, cellCoord);

    if (mesh) {
      renderer.scene.add(mesh);
      mesh.position.set(
        cellCoord.x * renderer.cellSize,
        cellCoord.y * renderer.cellSize,
        cellCoord.z * renderer.cellSize
      );
      CoordMap.set(renderer.loadedCells, cellCoord, mesh);
    }
  },

  loadNearbyCells(renderer) {
    if (!renderer.player) {
      return;
    }

    const {x, y, z} = renderer.player.position;

    const playerCellCoord = {
      x: Math.floor(x / renderer.cellSize),
      y: Math.floor(y / renderer.cellSize),
      z: Math.floor(z / renderer.cellSize),
    };

    for (let dx = -8; dx < 9; dx++) {
      for (let dy = -8; dy < 9; dy++) {
        for (let dz = -8; dz < 9; dz++) {
          const coord = {
            x: playerCellCoord.x + dx,
            y: playerCellCoord.y + dy,
            z: playerCellCoord.z + dz,
          };
          if (CoordMap.get(renderer.loadedCells, coord) == null) {
            VoxelRenderer.loadCell(renderer, coord);
          }
        }
      }
    }
  },
};
