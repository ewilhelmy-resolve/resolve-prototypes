import React from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { AppRouter } from './router';

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  );
};

export default App;
