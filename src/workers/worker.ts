import {generateChunkGeometry} from './generateChunkGeometry';
import {loadChunk} from './loadChunk';

// eslint-disable-next-line no-restricted-globals
const ctx: Worker = self as any;

ctx.addEventListener('message', (e) => {
  const {id, message} = e.data;

  let result: {message: any; transfer: Transferable[]} | null = null;

  if (message.type === 'loadChunk') {
    result = loadChunk(message);
  }

  if (message.type === 'generateChunkGeometry') {
    result = generateChunkGeometry(message);
  }

  if (result == null) {
    throw new Error('Bad message received by worker');
  }

  ctx.postMessage({id, message: result.message}, result.transfer);
});

export {};
