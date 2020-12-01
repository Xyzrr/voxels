import * as THREE from 'three';
import {Coord, CoordMap} from './coord';
import {Player} from './player';
import {VoxelWorld} from './world';
import {BLACK, DRAW_DISTANCE, WHITE} from '../lib/consts';
import {isTransparentVoxel} from './voxel';

(window as any).THREE = THREE;

const VOXEL_FACES = [
  {
    // left
    uvRow: 0,
    dir: [-1, 0, 0],
    corners: [
      {pos: [0, 1, 0], uv: [0, 1]},
      {pos: [0, 0, 0], uv: [0, 0]},
      {pos: [0, 1, 1], uv: [1, 1]},
      {pos: [0, 0, 1], uv: [1, 0]},
    ],
  },
  {
    // right
    uvRow: 0,
    dir: [1, 0, 0],
    corners: [
      {pos: [1, 1, 1], uv: [0, 1]},
      {pos: [1, 0, 1], uv: [0, 0]},
      {pos: [1, 1, 0], uv: [1, 1]},
      {pos: [1, 0, 0], uv: [1, 0]},
    ],
  },
  {
    // bottom
    uvRow: 2,
    dir: [0, -1, 0],
    corners: [
      {pos: [1, 0, 1], uv: [1, 0]},
      {pos: [0, 0, 1], uv: [0, 0]},
      {pos: [1, 0, 0], uv: [1, 1]},
      {pos: [0, 0, 0], uv: [0, 1]},
    ],
  },
  {
    // top
    uvRow: 1,
    dir: [0, 1, 0],
    corners: [
      {pos: [0, 1, 1], uv: [1, 1]},
      {pos: [1, 1, 1], uv: [0, 1]},
      {pos: [0, 1, 0], uv: [1, 0]},
      {pos: [1, 1, 0], uv: [0, 0]},
    ],
  },
  {
    // back
    uvRow: 0,
    dir: [0, 0, -1],
    corners: [
      {pos: [1, 0, 0], uv: [0, 0]},
      {pos: [0, 0, 0], uv: [1, 0]},
      {pos: [1, 1, 0], uv: [0, 1]},
      {pos: [0, 1, 0], uv: [1, 1]},
    ],
  },
  {
    // front
    uvRow: 0,
    dir: [0, 0, 1],
    corners: [
      {pos: [0, 0, 1], uv: [0, 0]},
      {pos: [1, 0, 1], uv: [1, 0]},
      {pos: [0, 1, 1], uv: [0, 1]},
      {pos: [1, 1, 1], uv: [1, 1]},
    ],
  },
];

export interface VoxelRenderer {
  world?: VoxelWorld;
  player?: Player;
  cellSize: number;
  cellSliceSize: number;
  tileSize: number;
  tileTextureWidth: number;
  tileTextureHeight: number;
  lastFrameTime: number;
  texture: THREE.Texture;
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
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/atlas.png');
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const renderer: VoxelRenderer = {
      cellSize: 16,
      cellSliceSize: 256,
      tileSize: 16,
      tileTextureWidth: 256,
      tileTextureHeight: 64,
      lastFrameTime: Date.now(),
      texture,

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
        scene.background = new THREE.Color(BLACK);
        scene.fog = new THREE.FogExp2(WHITE, 0.00015);

        function addLight(x: number, y: number, z: number): void {
          const color = WHITE;
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

      VoxelRenderer.loadNearbyCells(renderer);

      // change render order to use distance from camera instead of z
      CoordMap.forEach(
        renderer.loadedCells,
        (cell) =>
          (cell.renderOrder = -cell.position.distanceTo(
            renderer.camera.position
          ))
      );

      renderer.player?.update(delta);
      renderer.glRenderer.render(renderer.scene, renderer.camera);

      requestAnimationFrame(animate);
    }

    animate();
  },

  generateCellGeometry(renderer, {x: cellX, y: cellY, z: cellZ}) {
    const {
      world,
      cellSize,
      tileSize,
      tileTextureWidth,
      tileTextureHeight,
    } = renderer;
    if (!world) {
      return null;
    }

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const startX = cellX * cellSize;
    const startY = cellY * cellSize;
    const startZ = cellZ * cellSize;

    const getGeometryData = (transparent: boolean): void => {
      for (let x = 0; x < cellSize; ++x) {
        const voxelX = startX + x;
        for (let y = 0; y < cellSize; ++y) {
          const voxelY = startY + y;
          for (let z = 0; z < cellSize; ++z) {
            const voxelZ = startZ + z;
            const voxel = VoxelWorld.getVoxel(world, {
              x: voxelX,
              y: voxelY,
              z: voxelZ,
            });

            if (voxel && isTransparentVoxel(voxel) === transparent) {
              let uvVoxel;
              switch (voxel.type) {
                case 'dirt':
                  uvVoxel = 7;
                  break;
                case 'stone':
                  uvVoxel = 1;
                  break;
                case 'water':
                  uvVoxel = 12;
                  break;
              }

              for (const {dir, corners, uvRow} of VOXEL_FACES) {
                const neighbor = VoxelWorld.getVoxel(world, {
                  x: voxelX + dir[0],
                  y: voxelY + dir[1],
                  z: voxelZ + dir[2],
                });
                if (
                  !neighbor ||
                  (voxel.type !== 'water' && neighbor.type === 'water')
                ) {
                  // this voxel has no neighbor in this direction so we need a face.
                  const ndx = positions.length / 3;
                  for (const {pos, uv} of corners) {
                    positions.push(
                      pos[0] + x - cellSize / 2,
                      pos[1] + y - cellSize / 2,
                      pos[2] + z - cellSize / 2
                    );
                    normals.push(...dir);
                    uvs.push(
                      ((uvVoxel + uv[0]) * tileSize) / tileTextureWidth,
                      1 - ((uvRow + 1 - uv[1]) * tileSize) / tileTextureHeight
                    );
                  }
                  indices.push(
                    ndx,
                    ndx + 1,
                    ndx + 2,
                    ndx + 2,
                    ndx + 1,
                    ndx + 3
                  );
                }
              }
            }
          }
        }
      }
    };
    getGeometryData(false);
    getGeometryData(true);

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), 3)
    );
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(normals), 3)
    );
    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array(uvs), 2)
    );
    geometry.setIndex(indices);

    return geometry;
  },

  generateCellMesh(renderer, cellCoord) {
    const {world, texture} = renderer;
    if (!world) {
      return null;
    }

    const material = new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    });
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
        cellCoord.x * renderer.cellSize + renderer.cellSize / 2,
        cellCoord.y * renderer.cellSize + renderer.cellSize / 2,
        cellCoord.z * renderer.cellSize + renderer.cellSize / 2
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

    for (let dx = -DRAW_DISTANCE; dx <= DRAW_DISTANCE; dx++) {
      for (let dy = -DRAW_DISTANCE; dy <= DRAW_DISTANCE; dy++) {
        for (let dz = -DRAW_DISTANCE; dz <= DRAW_DISTANCE; dz++) {
          const coord = {
            x: playerCellCoord.x + dx,
            y: playerCellCoord.y + dy,
            z: playerCellCoord.z + dz,
          };
          if (!CoordMap.get(renderer.loadedCells, coord)) {
            VoxelRenderer.loadCell(renderer, coord);
          }
        }
      }
    }
  },
};
