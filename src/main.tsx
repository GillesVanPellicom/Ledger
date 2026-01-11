import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorProvider } from './context/ErrorContext';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useSettingsStore } from './store/useSettingsStore';
import PageSpinner from './components/ui/PageSpinner';

const Main = () => {
  const { loadSettings, loading } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return <PageSpinner />;
  }

  return <App />;
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        <ErrorBoundary>
          <Main />
        </ErrorBoundary>
      </ErrorProvider>
    </QueryClientProvider>
  </StrictMode>,
);
