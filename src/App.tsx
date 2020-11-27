import './App.css';

import React from 'react';
import {getBlock} from './lib/worldGeneration';

const App: React.FC = React.memo(() => {
  return <WorldGenTest />;
});

export default App;

const WorldGenTest: React.FC = React.memo(() => {
  console.log(getBlock({x: 0, y: 0, z: 0}));
  return null;
});
