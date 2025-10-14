import type React from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { CitationProvider } from './contexts/CitationContext';
import { AppRouter } from './router';
import { Toaster } from '@/components/ui/sonner';

const App: React.FC = () => {
  return (
    <QueryProvider>
      <CitationProvider defaultVariant="collapsible-list">
        <AppRouter />
        <Toaster />
      </CitationProvider>
    </QueryProvider>
  );
};

export default App;
