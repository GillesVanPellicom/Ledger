import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProductsPage from './pages/ProductsPage';
import ReceiptsPage from './pages/ReceiptsPage';
import ReceiptFormPage from './pages/ReceiptFormPage';
import ReceiptViewPage from './pages/ReceiptViewPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import PaymentMethodDetailsPage from './pages/PaymentMethodDetailsPage';
import StoresPage from './pages/StoresPage';
import EntitiesPage from './pages/EntitiesPage';
import EntityDetailsPage from './pages/EntityDetailsPage';
import { useError } from './context/ErrorContext';
import { useSettings } from './context/SettingsContext';
import WelcomeScreen from './components/layout/WelcomeScreen';
import SettingsModal from './components/settings/SettingsModal';

function App() {
  const { showError } = useError();
  const { settings, loading } = useSettings();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState('appearance');

  useEffect(() => {
    const unhandledRejectionHandler = (event) => {
      showError(event.reason);
    };

    const errorHandler = (event) => {
      showError(event.error);
    };

    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    window.addEventListener('error', errorHandler);

    return () => {
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      window.removeEventListener('error', errorHandler);
    };
  }, [showError]);

  const openSettingsModal = (tab = 'appearance') => {
    setInitialSettingsTab(tab);
    setIsSettingsModalOpen(true);
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!settings.datastore.folderPath && window.electronAPI) {
    return <WelcomeScreen />;
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout openSettingsModal={openSettingsModal} />}>
            <Route index element={<ReceiptsPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="stores" element={<StoresPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="payment-methods" element={<PaymentMethodsPage />} />
            <Route path="payment-methods/:id" element={<PaymentMethodDetailsPage />} />
            <Route path="entities" element={<EntitiesPage />} />
            <Route path="entities/:id" element={<EntityDetailsPage />} />
            
            <Route path="receipts/new" element={<ReceiptFormPage />} />
            <Route path="receipts/edit/:id" element={<ReceiptFormPage />} />
            <Route path="receipts/view/:id" element={<ReceiptViewPage openSettingsModal={openSettingsModal} />} />
          </Route>
        </Routes>
      </Router>
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={initialSettingsTab}
      />
    </>
  );
}

export default App;
