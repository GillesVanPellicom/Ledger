import React, { useEffect, useState } from 'react';
import { useSettingsStore } from './store/useSettingsStore';
import { useErrorStore } from './store/useErrorStore';
import { WizardController } from './wizard/WizardController';
import { MainApp } from './MainApp';

function App() {
  const { showError } = useErrorStore();
  const { loading } = useSettingsStore();
  const [wizardFinished, setWizardFinished] = useState(false);

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

  if (loading) {
    return null; // Or a loading spinner
  }

  // If we are in Electron, we might need to run the wizard.
  // The wizard controller itself determines if it needs to show anything.
  // If it finishes (or decides not to show anything), it calls onFinish.
  // However, we need to know if we should even mount the WizardController.
  // The spec says: "On app launch (before database initialization)... Check for existing wizard metadata... If empty, proceed directly to database initialization"
  // But WizardController handles this logic inside its useEffect.
  // So we can just render WizardController if we haven't finished it yet.
  
  if (window.electronAPI && !wizardFinished) {
    return <WizardController onFinish={() => setWizardFinished(true)} />;
  }

  return <MainApp />;
}

export default App;
