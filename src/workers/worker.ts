import {generateChunkGeometry} from './generateChunkGeometry';
import {loadChunk} from './loadChunk';

// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any;

ctx.addEventListener('message', (e) => {
  if (e.data.type === 'loadChunk') {
    loadChunk(e.data);
  }

  if (e.data.type === 'generateChunkGeometry') {
    generateChunkGeometry(e.data);
  }
});

export {};
