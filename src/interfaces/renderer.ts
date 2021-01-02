// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!../workers/worker';

import * as THREE from 'three';
import {Coord, CoordMap} from './coord';
import {Player} from './player';
import {VoxelWorld} from './world';
import {
  BLACK,
  CHUNK_SIZE,
  DRAW_DISTANCE,
  DRAW_DISTANCE_Y,
  VOXEL_FACES,
  WHITE,
} from '../lib/consts';
import {ChunkGeometryData} from '../workers/generateChunkGeometry';
import {Chunk} from './chunk';
import {PlayerCamera} from './camera';
import {messageWorker} from '../util/messageWorker';

(window as any).THREE = THREE;

const RENDERER_TO_EVENT_LISTENERS: WeakMap<VoxelRenderer, any> = new WeakMap();

const worker = new Worker();

export interface VoxelRenderer {
  world?: VoxelWorld;
  player?: Player;
  lastFrameTime: number;
  texture: THREE.Texture;
  glRenderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera?: PlayerCamera;
  loadedChunks: CoordMap<Chunk>;
  chunkQueue: Coord[];
  rendering: boolean;
  resizeHandler?: () => void;
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
  renderChunk(renderer: VoxelRenderer, chunkCoord: Coord): Promise<Chunk>;
  loadChunk(renderer: VoxelRenderer, cellCoord: Coord): Promise<Chunk>;
  addNearbyCellsToQueue(renderer: VoxelRenderer): void;
  flushQueue(renderer: VoxelRenderer): Promise<void>;
  bindToUserControls(renderer: VoxelRenderer): void;
  unbindFromUserControls(renderer: VoxelRenderer): void;
}

export const VoxelRenderer: VoxelRendererInterface = {
  init() {
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/atlas.png');
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const renderer: VoxelRenderer = {
      lastFrameTime: Date.now() / 1000,
      texture,

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

      chunkQueue: [],

      rendering: false,
    };

    return renderer;
  },

  setWorld(renderer, world) {
    const {updateVoxel} = world;

    world.updateVoxel = (coord, newBlock) => {
      updateVoxel(coord, newBlock);
      const chunkCoord = VoxelWorld.chunkCoordFromVoxelCoord(world, coord);
      console.log('re-rendering chunk', chunkCoord);
      VoxelRenderer.renderChunk(renderer, chunkCoord);
    };

    renderer.world = world;
  },

  setPlayer(renderer, player) {
    const {update} = player;

    const geometry = new THREE.BoxBufferGeometry(
      player.boundingBox.max.x,
      player.boundingBox.max.y,
      player.boundingBox.max.z
    );
    geometry.translate(
      player.boundingBox.max.x / 2,
      player.boundingBox.max.y / 2,
      player.boundingBox.max.z / 2
    );
    const wireframe = new THREE.WireframeGeometry(geometry);
    const line = new THREE.LineSegments(wireframe);
    renderer.scene.add(line);
    if (!Array.isArray(line.material)) {
      line.material.opacity = 0.25;
      line.material.transparent = true;
    }

    player.update = (delta) => {
      update(delta);
      line.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      );
    };

    renderer.player = player;
    renderer.camera = PlayerCamera.init(player);

    if (RENDERER_TO_EVENT_LISTENERS.has(renderer)) {
      PlayerCamera.bindToUserControls(renderer.camera);
    }
  },

  bindToElement(renderer, container) {
    container.appendChild(renderer.glRenderer.domElement);
    renderer.resizeHandler = () => {
      renderer.glRenderer.setSize(window.innerWidth, window.innerHeight);
      if (renderer.camera != null) {
        PlayerCamera.adaptToScreenSize(
          renderer.camera,
          window.innerWidth,
          window.innerHeight
        );
      }
    };
    window.addEventListener('resize', renderer.resizeHandler);
  },

  unbindFromElement(renderer, container) {
    container.removeChild(renderer.glRenderer.domElement);
    if (renderer.resizeHandler) {
      window.removeEventListener('resize', renderer.resizeHandler);
    }
  },

  animate(renderer) {
    function animate(): void {
      const now = Date.now() / 1000;
      const delta = now - renderer.lastFrameTime;
      renderer.lastFrameTime = now;

      VoxelRenderer.addNearbyCellsToQueue(renderer);

      renderer.player?.update(delta);
      if (renderer.camera != null) {
        renderer.glRenderer.render(renderer.scene, renderer.camera.camera);
      }

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
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));

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

  async renderChunk(renderer, chunkCoord) {
    return new Promise((resolve) => {
      if (renderer.world == null) {
        throw new Error('Must set world before rendering chunks');
      }

      const chunk = VoxelWorld.getChunk(renderer.world, chunkCoord);

      if (chunk == null) {
        throw new Error('Attempted to render null chunk');
      }

      const neighbors = VoxelWorld.getNeighbors(renderer.world, chunkCoord);

      messageWorker(
        worker,
        {
          type: 'generateChunkGeometry',
          chunkCoord,
          chunk,
          neighbors,
        },
        [chunk.buffer, ...Object.values(neighbors).map((n) => n.buffer)]
      ).then(
        ({
          opaque,
          transparent,
          chunk: returnedChunk,
          neighbors: returnedNeighbors,
        }) => {
          console.log('Renderer: Received message from worker', returnedChunk);
          if (renderer.world) {
            // Reactivate buffers in cache
            CoordMap.set(renderer.world.cache, chunkCoord, returnedChunk);
            for (let key of Object.keys(returnedNeighbors)) {
              for (let face of VOXEL_FACES) {
                if (face.name === key) {
                  CoordMap.set(
                    renderer.world.cache,
                    {
                      x: chunkCoord.x + face.dir[0],
                      y: chunkCoord.y + face.dir[1],
                      z: chunkCoord.z + face.dir[2],
                    },
                    returnedNeighbors[key]
                  );
                }
              }
            }
          }

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
            console.log('Renderer: Adding transparent mesh', transparentMesh);
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
      );
    });
  },

  async loadChunk(renderer, chunkCoord) {
    return new Promise<Chunk>((resolve) => {
      if (renderer.world) {
        console.log('Renderer: Loading chunk and neighbors', chunkCoord);

        VoxelWorld.loadChunkAndNeighbors(renderer.world, chunkCoord).then(
          () => {
            console.log('Renderer: Loaded chunk and neighbors at', chunkCoord);

            VoxelRenderer.renderChunk(renderer, chunkCoord).then(resolve);
          }
        );
      }
    });
  },

  addNearbyCellsToQueue(renderer) {
    if (!renderer.player) {
      return;
    }

    const {x, y, z} = renderer.player.position;

    const playerCellCoord = {
      x: Math.floor(x / CHUNK_SIZE),
      y: Math.floor(y / CHUNK_SIZE),
      z: Math.floor(z / CHUNK_SIZE),
    };

    for (let dx = -DRAW_DISTANCE; dx <= DRAW_DISTANCE; dx++) {
      for (let dy = -DRAW_DISTANCE_Y; dy <= DRAW_DISTANCE_Y; dy++) {
        for (let dz = -DRAW_DISTANCE; dz <= DRAW_DISTANCE; dz++) {
          const coord = {
            x: playerCellCoord.x + dx,
            y: playerCellCoord.y + dy,
            z: playerCellCoord.z + dz,
          };
          if (!CoordMap.get(renderer.loadedChunks, coord)) {
            renderer.chunkQueue.push(coord);
            // add dummy chunk so that renderer doesn't keep trying to load it
            CoordMap.set(renderer.loadedChunks, coord, {loading: true});
          }
        }
      }
    }

    VoxelRenderer.flushQueue(renderer);
  },

  async flushQueue(renderer) {
    if (renderer.rendering) {
      return;
    }
    renderer.rendering = true;
    while (renderer.chunkQueue.length > 0) {
      const chunkCoord = renderer.chunkQueue.shift()!;
      await VoxelRenderer.loadChunk(renderer, chunkCoord);
    }
    renderer.rendering = false;
  },

  bindToUserControls(renderer) {
    if (renderer.camera != null) {
      PlayerCamera.bindToUserControls(renderer.camera);
    }

    RENDERER_TO_EVENT_LISTENERS.set(renderer, true);
  },

  unbindFromUserControls(renderer) {
    if (renderer.camera != null) {
      PlayerCamera.unbindFromUserControls(renderer.camera);
    }

    RENDERER_TO_EVENT_LISTENERS.delete(renderer);
  },
};
