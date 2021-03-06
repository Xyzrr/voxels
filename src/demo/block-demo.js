import * as THREE from 'three';

import Stats from './stats.module.js';

import {FirstPersonControls} from './FirstPersonControls.js';
import {ImprovedNoise} from './ImprovedNoise.js';

let container, stats;

let camera, controls, scene, renderer;

const worldWidth = 200,
  worldDepth = 200;
const worldHalfWidth = worldWidth / 2;
const worldHalfDepth = worldDepth / 2;
const data = generateHeight(worldWidth, worldDepth);

const clock = new THREE.Clock();

export function init() {
  container = document.getElementById('container');

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    20000
  );
  camera.position.y = getY(worldHalfWidth, worldHalfDepth) * 100 + 100;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.FogExp2(0xffffff, 0.00015);

  // sides

  const light = new THREE.Color(0xffffff);
  const shadow = new THREE.Color(0x505050);

  const matrix = new THREE.Matrix4();

  const pxGeometry = new THREE.PlaneGeometry(100, 100);
  pxGeometry.faces[0].vertexColors = [light, shadow, light];
  pxGeometry.faces[1].vertexColors = [shadow, shadow, light];
  pxGeometry.faceVertexUvs[0][0][0].y = 0.5;
  pxGeometry.faceVertexUvs[0][0][2].y = 0.5;
  pxGeometry.faceVertexUvs[0][1][2].y = 0.5;
  pxGeometry.rotateY(Math.PI / 2);
  pxGeometry.translate(50, 0, 0);

  const nxGeometry = new THREE.PlaneGeometry(100, 100);
  nxGeometry.faces[0].vertexColors = [light, shadow, light];
  nxGeometry.faces[1].vertexColors = [shadow, shadow, light];
  nxGeometry.faceVertexUvs[0][0][0].y = 0.5;
  nxGeometry.faceVertexUvs[0][0][2].y = 0.5;
  nxGeometry.faceVertexUvs[0][1][2].y = 0.5;
  nxGeometry.rotateY(-Math.PI / 2);
  nxGeometry.translate(-50, 0, 0);

  const pyGeometry = new THREE.PlaneGeometry(100, 100);
  pyGeometry.faces[0].vertexColors = [light, light, light];
  pyGeometry.faces[1].vertexColors = [light, light, light];
  pyGeometry.faceVertexUvs[0][0][1].y = 0.5;
  pyGeometry.faceVertexUvs[0][1][0].y = 0.5;
  pyGeometry.faceVertexUvs[0][1][1].y = 0.5;
  pyGeometry.rotateX(-Math.PI / 2);
  pyGeometry.translate(0, 50, 0);

  const py2Geometry = new THREE.PlaneGeometry(100, 100);
  py2Geometry.faces[0].vertexColors = [light, light, light];
  py2Geometry.faces[1].vertexColors = [light, light, light];
  py2Geometry.faceVertexUvs[0][0][1].y = 0.5;
  py2Geometry.faceVertexUvs[0][1][0].y = 0.5;
  py2Geometry.faceVertexUvs[0][1][1].y = 0.5;
  py2Geometry.rotateX(-Math.PI / 2);
  py2Geometry.rotateY(Math.PI / 2);
  py2Geometry.translate(0, 50, 0);

  const pzGeometry = new THREE.PlaneGeometry(100, 100);
  pzGeometry.faces[0].vertexColors = [light, shadow, light];
  pzGeometry.faces[1].vertexColors = [shadow, shadow, light];
  pzGeometry.faceVertexUvs[0][0][0].y = 0.5;
  pzGeometry.faceVertexUvs[0][0][2].y = 0.5;
  pzGeometry.faceVertexUvs[0][1][2].y = 0.5;
  pzGeometry.translate(0, 0, 50);

  const nzGeometry = new THREE.PlaneGeometry(100, 100);
  nzGeometry.faces[0].vertexColors = [light, shadow, light];
  nzGeometry.faces[1].vertexColors = [shadow, shadow, light];
  nzGeometry.faceVertexUvs[0][0][0].y = 0.5;
  nzGeometry.faceVertexUvs[0][0][2].y = 0.5;
  nzGeometry.faceVertexUvs[0][1][2].y = 0.5;
  nzGeometry.rotateY(Math.PI);
  nzGeometry.translate(0, 0, -50);

  //

  let geometry = new THREE.Geometry();

  for (let z = 0; z < worldDepth; z++) {
    for (let x = 0; x < worldWidth; x++) {
      const h = getY(x, z);

      matrix.makeTranslation(
        x * 100 - worldHalfWidth * 100,
        h * 100,
        z * 100 - worldHalfDepth * 100
      );

      const px = getY(x + 1, z);
      const nx = getY(x - 1, z);
      const pz = getY(x, z + 1);
      const nz = getY(x, z - 1);

      const pxpz = getY(x + 1, z + 1);
      const nxpz = getY(x - 1, z + 1);
      const pxnz = getY(x + 1, z - 1);
      const nxnz = getY(x - 1, z - 1);

      const a = nx > h || nz > h || nxnz > h ? 0 : 1;
      const b = nx > h || pz > h || nxpz > h ? 0 : 1;
      const c = px > h || pz > h || pxpz > h ? 0 : 1;
      const d = px > h || nz > h || pxnz > h ? 0 : 1;

      if (a + c > b + d) {
        let colors = py2Geometry.faces[0].vertexColors;
        colors[0] = b === 0 ? shadow : light;
        colors[1] = c === 0 ? shadow : light;
        colors[2] = a === 0 ? shadow : light;

        colors = py2Geometry.faces[1].vertexColors;
        colors[0] = c === 0 ? shadow : light;
        colors[1] = d === 0 ? shadow : light;
        colors[2] = a === 0 ? shadow : light;

        geometry.merge(py2Geometry, matrix);
      } else {
        let colors = pyGeometry.faces[0].vertexColors;
        colors[0] = a === 0 ? shadow : light;
        colors[1] = b === 0 ? shadow : light;
        colors[2] = d === 0 ? shadow : light;

        colors = pyGeometry.faces[1].vertexColors;
        colors[0] = b === 0 ? shadow : light;
        colors[1] = c === 0 ? shadow : light;
        colors[2] = d === 0 ? shadow : light;

        geometry.merge(pyGeometry, matrix);
      }

      if ((px != h && px != h + 1) || x == 0) {
        let colors = pxGeometry.faces[0].vertexColors;
        colors[0] = pxpz > px && x > 0 ? shadow : light;
        colors[2] = pxnz > px && x > 0 ? shadow : light;

        colors = pxGeometry.faces[1].vertexColors;
        colors[2] = pxnz > px && x > 0 ? shadow : light;

        geometry.merge(pxGeometry, matrix);
      }

      if ((nx != h && nx != h + 1) || x == worldWidth - 1) {
        let colors = nxGeometry.faces[0].vertexColors;
        colors[0] = nxnz > nx && x < worldWidth - 1 ? shadow : light;
        colors[2] = nxpz > nx && x < worldWidth - 1 ? shadow : light;

        colors = nxGeometry.faces[1].vertexColors;
        colors[2] = nxpz > nx && x < worldWidth - 1 ? shadow : light;

        geometry.merge(nxGeometry, matrix);
      }

      if ((pz != h && pz != h + 1) || z == worldDepth - 1) {
        let colors = pzGeometry.faces[0].vertexColors;
        colors[0] = nxpz > pz && z < worldDepth - 1 ? shadow : light;
        colors[2] = pxpz > pz && z < worldDepth - 1 ? shadow : light;

        colors = pzGeometry.faces[1].vertexColors;
        colors[2] = pxpz > pz && z < worldDepth - 1 ? shadow : light;

        geometry.merge(pzGeometry, matrix);
      }

      if ((nz != h && nz != h + 1) || z == 0) {
        let colors = nzGeometry.faces[0].vertexColors;
        colors[0] = pxnz > nz && z > 0 ? shadow : light;
        colors[2] = nxnz > nz && z > 0 ? shadow : light;

        colors = nzGeometry.faces[1].vertexColors;
        colors[2] = nxnz > nz && z > 0 ? shadow : light;

        geometry.merge(nzGeometry, matrix);
      }
    }
  }

  geometry = new THREE.BufferGeometry().fromGeometry(geometry);

  const texture = new THREE.TextureLoader().load('atlas.png');
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({
      map: texture,
      vertexColors: true,
      side: THREE.DoubleSide,
    })
  );
  scene.add(mesh);

  const ambientLight = new THREE.AmbientLight(0xcccccc);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 0.5).normalize();
  scene.add(directionalLight);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  controls = new FirstPersonControls(camera, renderer.domElement);

  controls.movementSpeed = 1000;
  controls.lookSpeed = 0.125;
  controls.lookVertical = true;
  controls.constrainVertical = true;
  controls.verticalMin = 1.1;
  controls.verticalMax = 2.2;

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  controls.handleResize();
}

function generateHeight(width, height) {
  const data = [],
    perlin = new ImprovedNoise(),
    size = width * height,
    z = Math.random() * 100;

  let quality = 2;

  for (let j = 0; j < 4; j++) {
    if (j == 0) for (let i = 0; i < size; i++) data[i] = 0;

    for (let i = 0; i < size; i++) {
      const x = i % width,
        y = (i / width) | 0;
      data[i] += perlin.noise(x / quality, y / quality, z) * quality;
    }

    quality *= 4;
  }

  return data;
}

function getY(x, z) {
  return (data[x + z * worldWidth] * 0.2) | 0;
}

//

export function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  controls.update(clock.getDelta());
  renderer.render(scene, camera);
}
