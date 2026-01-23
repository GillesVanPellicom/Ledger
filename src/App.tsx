import React, { useEffect, useState } from 'react';
import { useSettingsStore } from './store/useSettingsStore';
import { useErrorStore } from './store/useErrorStore';
import { WizardController } from './wizard/WizardController';
import { MainApp } from './MainApp';
import PageSpinner from './components/ui/PageSpinner';
import Button from './components/ui/Button';
import { Database, AlertCircle, RefreshCw } from 'lucide-react';

function App() {
  const { showError } = useErrorStore();
  const { loading, settings } = useSettingsStore();
  const [wizardFinished, setWizardFinished] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error: string | null } | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  useEffect(() => {
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      showError(event.reason);
    };

    const errorHandler = (event: ErrorEvent) => {
      showError(event.error);
    };

    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    window.addEventListener('error', errorHandler);

    return () => {
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      window.removeEventListener('error', errorHandler);
    };
  }, [showError]);

  const checkDbStatus = async () => {
    if (window.electronAPI) {
      setCheckingDb(true);
      try {
        const status = await window.electronAPI.getDbStatus();
        setDbStatus(status);
      } catch (err) {
        console.error('Failed to check DB status:', err);
      } finally {
        setCheckingDb(false);
      }
    }
  };

  useEffect(() => {
    if (!loading && wizardFinished) {
      checkDbStatus();
    }
  }, [loading, wizardFinished]);

  if (loading) {
    return <PageSpinner />;
  }

  if (window.electronAPI && !wizardFinished) {
    return <WizardController onFinish={() => setWizardFinished(true)} />;
  }

  // Show spinner while checking DB status if we have a datastore path
  if (window.electronAPI && wizardFinished && settings.datastore?.folderPath && !dbStatus) {
    return <PageSpinner />;
  }

  // If wizard is finished but DB is not connected and we have a path, show error state
  if (window.electronAPI && wizardFinished && settings.datastore?.folderPath && dbStatus && !dbStatus.connected) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-bg p-6">
        <div className="max-w-md w-full bg-bg-2 border border-border rounded-2xl p-8 shadow-xl space-y-6 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-red/10 rounded-full">
              <Database className="h-12 w-12 text-red" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-font-1">Database Connection Failed</h1>
            <p className="text-font-2">
              We couldn't connect to your database at:
              <br />
              <code className="text-xs bg-bg p-1 rounded mt-2 block break-all">{settings.datastore.folderPath}</code>
            </p>
          </div>

          {dbStatus.error && (
            <div className="flex items-start gap-3 p-4 bg-red/5 border border-red/10 rounded-lg text-left">
              <AlertCircle className="h-5 w-5 text-red shrink-0 mt-0.5" />
              <div className="text-sm text-red/90 font-medium break-all">
                {dbStatus.error}
              </div>
            </div>
          )}

          <div className="pt-4 space-y-3">
            <Button 
              onClick={checkDbStatus} 
              className="w-full flex items-center justify-center gap-2"
              disabled={checkingDb}
            >
              <RefreshCw className={`h-4 w-4 ${checkingDb ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setWizardFinished(false)} 
              className="w-full"
            >
              Open Setup Wizard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <MainApp />;
}

export default App;
