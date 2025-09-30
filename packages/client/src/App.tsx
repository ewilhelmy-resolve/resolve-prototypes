import type React from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { AppRouter } from './router';
import { Toaster } from '@/components/ui/sonner';

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AppRouter />
      <Toaster />
    </QueryProvider>
  );
};

export default App;
