import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useSettingsStore } from './store/useSettingsStore';
import PageSpinner from './components/ui/PageSpinner';
import { useErrorStore } from './store/useErrorStore';
import ErrorModal from './components/ui/ErrorModal';

const Main = () => {
  const { loadSettings, loading } = useSettingsStore();
  const { error, isOpen, closeError } = useErrorStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <>
      <App />
      <ErrorModal isOpen={isOpen} onClose={closeError} error={error} />
    </>
  );
};

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Main />
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);
