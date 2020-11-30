import './App.css';

import React from 'react';
import {getBlock} from './lib/worldGeneration';
import {VoxelRenderer} from './perf-test/renderer';
import {VoxelWorld} from './perf-test/world';
import {Player} from './perf-test/player';

const App: React.FC = React.memo(() => {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (container != null) {
      const world = VoxelWorld.init();
      const renderer = VoxelRenderer.init();
      VoxelRenderer.setWorld(renderer, world);

      const player = Player.init();
      Player.bindToUserControls(player);
      VoxelRenderer.setPlayer(renderer, player);

      VoxelRenderer.bindToElement(renderer, container);
      VoxelRenderer.animate(renderer);
      VoxelRenderer.loadCell(renderer, {x: 0, y: 0, z: 0});
    }
  }, [container]);

  return <div ref={React.useCallback((node) => setContainer(node), [])}></div>;
});

export default App;

const WorldGenTest: React.FC = React.memo(() => {
  console.log(getBlock({x: 0, y: 0, z: 0}));
  return null;
});
