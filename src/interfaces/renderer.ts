// eslint-disable-next-line import/no-webpack-loader-syntax
import Worker from 'worker-loader!../workers/worker';

import * as THREE from 'three';
import {Coord, CoordMap} from './coord';
import {Player} from './player';
import {VoxelWorld} from './world';
import {
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
import * as _ from 'lodash';

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
  voxelHighlight?: THREE.LineSegments;
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
  renderChunksAroundVoxel(renderer: VoxelRenderer, voxelCoord: Coord): void;
  renderChunk(renderer: VoxelRenderer, chunkCoord: Coord): Promise<Chunk>;
  loadChunk(renderer: VoxelRenderer, chunkCoord: Coord): Promise<Chunk>;
  addNearbyChunksToQueue(renderer: VoxelRenderer): void;
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

        const loader = new THREE.TextureLoader();
        const texture = loader.load('skybox.png', () => {
          const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
          rt.fromEquirectangularTexture(renderer.glRenderer, texture);
          scene.background = rt;
        });

        scene.fog = new THREE.FogExp2(WHITE, 0.00015);

        const light = new THREE.DirectionalLight(WHITE, 0.8);
        light.position.set(0, 100, 0);
        light.target.position.set(-40, 0, -40);
        light.castShadow = true;
        light.shadow.camera.left = -128;
        light.shadow.camera.right = 128;
        light.shadow.camera.top = 128;
        light.shadow.camera.bottom = -128;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        // apparently need negative bias for self-shadows
        light.shadow.bias = -0.001;
        scene.add(light);
        scene.add(light.target);

        const ambient = new THREE.AmbientLight(WHITE, 0.45);
        scene.add(ambient);

        return scene;
      })(),

      glRenderer: (() => {
        const glRenderer = new THREE.WebGLRenderer();
        glRenderer.setPixelRatio(window.devicePixelRatio);
        glRenderer.setSize(window.innerWidth, window.innerHeight);
        glRenderer.shadowMap.enabled = true;
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

    world.updateVoxel = (coord, newVoxel) => {
      updateVoxel(coord, newVoxel);
      VoxelRenderer.renderChunksAroundVoxel(renderer, coord);
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

    const camera = PlayerCamera.init(player);

    camera.onSetMode = (mode) => {
      if (mode === 'first') {
        line.visible = false;
      } else {
        line.visible = true;
      }
    };

    renderer.player = player;
    renderer.camera = camera;

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

      VoxelRenderer.addNearbyChunksToQueue(renderer);

      if (renderer.player != null) {
        renderer.player.update(delta);

        if (renderer.voxelHighlight != null) {
          renderer.scene.remove(renderer.voxelHighlight);
        }

        const geometry = new THREE.BoxBufferGeometry(1.001, 1.001, 1.001);
        geometry.translate(0.5, 0.5, 0.5);
        const wireframe = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
          color: 0x000000,
          linewidth: 40,
        });
        const line = new THREE.LineSegments(wireframe, material);

        const intersection = Player.raycast(renderer.player);

        if (intersection != null) {
          const adjustedPosition = intersection.position.sub(
            intersection.normal.multiplyScalar(0.5)
          );

          line.position.set(
            Math.floor(adjustedPosition.x),
            Math.floor(adjustedPosition.y),
            Math.floor(adjustedPosition.z)
          );

          renderer.voxelHighlight = line;
          renderer.scene.add(line);
        }
      }

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

    const mesh = new THREE.Mesh(geometry, material);

    if (!transparent) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    return mesh;
  },

  async renderChunksAroundVoxel(renderer, voxelCoord) {
    if (renderer.world == null) {
      return;
    }

    const chunkCoordsToRender = [
      VoxelWorld.chunkCoordFromVoxelCoord(renderer.world, voxelCoord),
    ];

    for (let face of VOXEL_FACES) {
      let neighborVoxelCoord = {
        x: voxelCoord.x + face.dir[0],
        y: voxelCoord.y + face.dir[1],
        z: voxelCoord.z + face.dir[2],
      };
      const chunkCoord = VoxelWorld.chunkCoordFromVoxelCoord(
        renderer.world,
        neighborVoxelCoord
      );
      const dupe = _.find(chunkCoordsToRender, (c) =>
        Coord.equals(c, chunkCoord)
      );
      if (dupe == null) {
        chunkCoordsToRender.push(chunkCoord);
      }
    }

    for (let chunkCoord of chunkCoordsToRender) {
      await VoxelRenderer.renderChunk(renderer, chunkCoord);
    }
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

          const existing = CoordMap.get(renderer.loadedChunks, chunkCoord);
          if (existing?.opaqueMesh != null) {
            renderer.scene.remove(existing.opaqueMesh);
          }
          if (existing?.transparentMesh != null) {
            renderer.scene.remove(existing.transparentMesh);
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

  addNearbyChunksToQueue(renderer) {
    if (renderer.player == null || renderer.world == null) {
      return;
    }

    const playerChunkCoord = VoxelWorld.chunkCoordFromVoxelCoord(
      renderer.world,
      renderer.player.position
    );

    for (let dx = -DRAW_DISTANCE; dx <= DRAW_DISTANCE; dx++) {
      for (let dy = -DRAW_DISTANCE_Y; dy <= DRAW_DISTANCE_Y; dy++) {
        for (let dz = -DRAW_DISTANCE; dz <= DRAW_DISTANCE; dz++) {
          const coord = {
            x: playerChunkCoord.x + dx,
            y: playerChunkCoord.y + dy,
            z: playerChunkCoord.z + dz,
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
