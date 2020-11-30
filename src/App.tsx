import './App.css';

import React from 'react';
import {getBlock} from './lib/worldGeneration';
import {initVoxelRenderer, VoxelRenderer} from './perf-test/renderer';
import {initVoxelWorld} from './perf-test/world';
console.log('fzu');

const App: React.FC = React.memo(() => {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    console.log('what', container);
    if (container != null) {
      const world = initVoxelWorld();
      const renderer = initVoxelRenderer();
      VoxelRenderer.setWorld(renderer, world);
      VoxelRenderer.bindToElement(renderer, container);
      VoxelRenderer.animate(renderer);
      VoxelRenderer.loadCell(renderer, {x: 0, y: 0, z: 0});
      console.log('world', world, world.getVoxel({x: 0, y: 0, z: 0}));
    }
  }, [container]);

  return <div ref={React.useCallback((node) => setContainer(node), [])}></div>;
});

export default App;

const WorldGenTest: React.FC = React.memo(() => {
  console.log(getBlock({x: 0, y: 0, z: 0}));
  return null;
});
