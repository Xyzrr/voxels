import './App.css';

import React from 'react';
import {VoxelRenderer} from './interfaces/renderer';
import {VoxelWorld} from './interfaces/world';
import {Player} from './interfaces/player';

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

      return () => {
        VoxelRenderer.unbindFromElement(renderer, container);
      };
    }
  }, [container]);

  return (
    <div
      ref={React.useCallback((node) => setContainer(node), [])}
      onClick={(e) => {
        e.currentTarget.requestPointerLock();
      }}></div>
  );
});

export default App;
