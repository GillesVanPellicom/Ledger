import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
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

    // Service Worker Logic
    if ('serviceWorker' in navigator) {
      const isElectron = window.navigator.userAgent.includes('Electron');
      
      if (isElectron || dev) {
        // Unregister existing service workers in Electron or Dev mode
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('Service Worker unregistered');
          }
        });
      } else {
        // Register service worker only in non-Electron production environment
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
          }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
        });
      }
    }
  }, [loadSettings]);

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <>
      <App />
      <ErrorModal isOpen={isOpen} onClose={closeError} error={error} />
      <ReactQueryDevtools initialIsOpen={false} />
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
