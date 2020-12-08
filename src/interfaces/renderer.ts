// eslint-disable-next-line import/no-webpack-loader-syntax
import RendererWorker from 'worker-loader!../workers/worker';

import * as THREE from 'three';
import {Coord, CoordMap} from './coord';
import {Player} from './player';
import {VoxelWorld} from './world';
import {BLACK, CHUNK_SIZE, DRAW_DISTANCE, WHITE} from '../lib/consts';
import {ChunkGeometryData} from '../workers/generateChunkGeometry';
import {Chunk} from './chunk';

(window as any).THREE = THREE;

const worker = new RendererWorker();

export interface VoxelRenderer {
  world?: VoxelWorld;
  player?: Player;
  lastFrameTime: number;
  texture: THREE.Texture;
  glRenderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  loadedChunks: CoordMap<Chunk>;
}

interface VoxelRendererInterface {
  init(): VoxelRenderer;
  setWorld(renderer: VoxelRenderer, world: VoxelWorld): void;
  setPlayer(renderer: VoxelRenderer, player: Player): void;
  bindToElement(renderer: VoxelRenderer, container: HTMLElement): void;
  unbindFromElement(renderer: VoxelRenderer, container: HTMLElement): void;
  animate(renderer: VoxelRenderer): void;
  buildChunkGeometry(data: ChunkGeometryData): THREE.BufferGeometry;
  buildChunkMesh(
    renderer: VoxelRenderer,
    data: ChunkGeometryData,
    transparent: boolean
  ): THREE.Mesh | null;
  loadChunk(renderer: VoxelRenderer, cellCoord: Coord): void;
  loadNearbyCells(renderer: VoxelRenderer): void;
}

export const VoxelRenderer: VoxelRendererInterface = {
  init() {
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/atlas.png');
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const renderer: VoxelRenderer = {
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

      loadedChunks: CoordMap.init(),
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

  unbindFromElement(renderer, container) {
    container.removeChild(renderer.glRenderer.domElement);
  },

  animate(renderer) {
    function animate(): void {
      const now = Date.now() / 1000;
      const delta = now - renderer.lastFrameTime;
      renderer.lastFrameTime = now;

      VoxelRenderer.loadNearbyCells(renderer);

      renderer.player?.update(delta);
      renderer.glRenderer.render(renderer.scene, renderer.camera);

      requestAnimationFrame(animate);
    }

    animate();
  },

  buildChunkGeometry(data) {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(data.positions, 3)
    );
    geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
    // Shouldn't be converting back to an untyped array but
    // not sure what to set itemSize to!
    geometry.setIndex([...data.indices]);

    return geometry;
  },

  buildChunkMesh(renderer, data, transparent) {
    const {world, texture} = renderer;

    if (!world) {
      return null;
    }

    const material = new THREE.MeshLambertMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent,
    });
    const geometry = VoxelRenderer.buildChunkGeometry(data);

    return new THREE.Mesh(geometry, material);
  },

  loadChunk(renderer, chunkCoord) {
    return new Promise<Chunk>((resolve) => {
      if (renderer.world) {
        console.log('Renderer: Loading chunk', chunkCoord);
        // add dummy chunk so that renderer doesn't keep trying to load it
        CoordMap.set(renderer.loadedChunks, chunkCoord, {});

        VoxelWorld.loadChunk(renderer.world, chunkCoord).then((chunk) => {
          console.log('Renderer: Received loaded chunk', chunk);
          if (renderer.world != null && chunk != null) {
            // const neighbors = VoxelWorld.getNeighbors(
            //   renderer.world,
            //   chunkCoord
            // );

            // worker.postMessage(
            //   {
            //     type: 'generateChunkGeometry',
            //     chunkCoord,
            //     chunk,
            //     neighbors,
            //   },
            //   [
            //     chunk.buffer,
            //     ...Object.values(neighbors)
            //       .filter((n) => n != null)
            //       .map((n) => n.buffer),
            //   ]
            // );

            console.log('Renderer: Posting generate chunk message');
            worker.postMessage(
              {
                type: 'generateChunkGeometry',
                chunk,
                neighbors: {},
              },
              [chunk.buffer]
            );

            worker.onmessage = (e) => {
              console.log('Renderer: Received message from worker', e);
              if (e.data.type === 'generateChunkGeometry') {
                const {opaque, transparent} = e.data;

                const opaqueMesh =
                  opaque == null
                    ? undefined
                    : VoxelRenderer.buildChunkMesh(renderer, opaque, false);
                const transparentMesh =
                  transparent == null
                    ? undefined
                    : VoxelRenderer.buildChunkMesh(renderer, transparent, true);

                const chunk: Chunk = {};

                if (opaqueMesh) {
                  console.log('Renderer: Adding opaque mesh', opaqueMesh);
                  renderer.scene.add(opaqueMesh);
                  opaqueMesh.position.set(
                    chunkCoord.x * CHUNK_SIZE,
                    chunkCoord.y * CHUNK_SIZE,
                    chunkCoord.z * CHUNK_SIZE
                  );
                  chunk.opaqueMesh = opaqueMesh;
                }

                if (transparentMesh) {
                  console.log(
                    'Renderer: Adding transparent mesh',
                    transparentMesh
                  );
                  renderer.scene.add(transparentMesh);
                  transparentMesh.position.set(
                    chunkCoord.x * CHUNK_SIZE,
                    chunkCoord.y * CHUNK_SIZE,
                    chunkCoord.z * CHUNK_SIZE
                  );
                  chunk.transparentMesh = transparentMesh;
                }

                CoordMap.set(renderer.loadedChunks, chunkCoord, chunk);
                resolve(chunk);
              }
            };
          }
        });
      }
    });
  },

  loadNearbyCells(renderer) {
    if (!renderer.player) {
      return;
    }

    const {x, y, z} = renderer.player.position;

    const playerCellCoord = {
      x: Math.floor(x / CHUNK_SIZE),
      y: Math.floor(y / CHUNK_SIZE),
      z: Math.floor(z / CHUNK_SIZE),
    };

    const chunkCoordsToLoad = [];
    for (let dx = -DRAW_DISTANCE; dx <= DRAW_DISTANCE; dx++) {
      for (let dy = -DRAW_DISTANCE; dy <= DRAW_DISTANCE; dy++) {
        for (let dz = -DRAW_DISTANCE; dz <= DRAW_DISTANCE; dz++) {
          const coord = {
            x: playerCellCoord.x + dx,
            y: playerCellCoord.y + dy,
            z: playerCellCoord.z + dz,
          };
          if (!CoordMap.get(renderer.loadedChunks, coord)) {
            chunkCoordsToLoad.push(coord);
          }
        }
      }
    }

    chunkCoordsToLoad.reduce(
      (accumulator, coord) =>
        accumulator.then(() => VoxelRenderer.loadChunk(renderer, coord)),
      Promise.resolve()
    );
  },
};
