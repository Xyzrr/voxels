import * as S from './App.styles';

import React from 'react';
import {VoxelRenderer} from './interfaces/renderer';
import {VoxelWorld} from './interfaces/world';
import {Player} from './interfaces/player';
import {Physics} from './interfaces/physics';

(window as any).VoxelRenderer = VoxelRenderer;
(window as any).VoxelWorld = VoxelWorld;
(window as any).Player = Player;

const App: React.FC = React.memo(() => {
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (container != null) {
      const world = VoxelWorld.init();
      const renderer = VoxelRenderer.init();
      VoxelRenderer.bindToUserControls(renderer);
      VoxelRenderer.setWorld(renderer, world);

      const physics = Physics.init(world);

      const player = Player.init();
      Player.bindToUserControls(player);
      Player.setWorld(player, world);
      Player.setPhysics(player, physics);
      VoxelRenderer.setPlayer(renderer, player);

      VoxelRenderer.bindToElement(renderer, container);
      VoxelRenderer.animate(renderer);

      (window as any).world = world;
      (window as any).renderer = renderer;

      return () => {
        VoxelRenderer.unbindFromElement(renderer, container);
        Player.unbindFromUserControls(player);
        VoxelRenderer.unbindFromUserControls(renderer);
      };
    }
  }, [container]);

  return (
    <>
      <div
        ref={React.useCallback((node) => setContainer(node), [])}
        onClick={(e) => {
          e.currentTarget.requestPointerLock();
        }}
      />
      <S.CrosshairWrapper>
        <S.Crosshair>
          <S.CrosshairVertical></S.CrosshairVertical>
          <S.CrosshairHorizontal></S.CrosshairHorizontal>
        </S.Crosshair>
      </S.CrosshairWrapper>
    </>
  );
});

export default App;
