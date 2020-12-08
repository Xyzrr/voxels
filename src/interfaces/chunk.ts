export type ChunkData = Uint8Array;

export interface Chunk {
  opaqueMesh?: THREE.Mesh;
  transparentMesh?: THREE.Mesh;
}
