import './App.css';

import React, {FC, memo} from 'react';

const App: FC = memo(() => {
  React.useEffect(() => {
    init();
    animate();
  }, []);

  return <></>;
});

export default App;
