import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ReferenceDataPage from './pages/ReferenceDataPage';
import ReceiptsPage from './pages/ReceiptsPage';
import ReceiptFormPage from './pages/ReceiptFormPage';
import ReceiptViewPage from './pages/ReceiptViewPage';
import IncomeViewPage from './pages/IncomeViewPage';
import TransferViewPage from './pages/TransferViewPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import PaymentMethodDetailsPage from './pages/PaymentMethodDetailsPage';
import EntitiesPage from './pages/EntitiesPage';
import EntityDetailsPage from './pages/EntityDetailsPage';
import SettingsModal from './components/settings/SettingsModal';
import { useSettingsStore } from './store/useSettingsStore';
import { useErrorStore } from './store/useErrorStore';
import { useUIStore } from './store/useUIStore';
import { incomeLogic } from './logic/incomeLogic';
import { useQueryClient } from '@tanstack/react-query';
import ProfilerOverlay from './components/ui/ProfilerOverlay';

export const MainApp = () => {
  const { showError } = useErrorStore();
  const { settings } = useSettingsStore();
  const { isSettingsModalOpen, closeSettingsModal, settingsModalInitialTab } = useUIStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only process schedules if we have a datastore path
    if (!settings.datastore?.folderPath) {
      return;
    }

    const processSchedules = async () => {
      try {
        await incomeLogic.processSchedules();
        queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
      } catch (error) {
        showError(error as Error);
      }
    };

    // Process on startup
    processSchedules();

    // Process every day at midnight
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msToMidnight = midnight.getTime() - now.getTime();

    const dailyTimer = setTimeout(() => {
      processSchedules(); // First run at midnight
      setInterval(processSchedules, 24 * 60 * 60 * 1000); // Then every 24 hours
    }, msToMidnight);

    return () => clearTimeout(dailyTimer);
  }, [queryClient, showError, settings.datastore?.folderPath]);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<ReceiptsPage />} />
            <Route path="reference-data" element={<ReferenceDataPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="payment-methods" element={<PaymentMethodsPage />} />
            <Route path="payment-methods/:id" element={<PaymentMethodDetailsPage />} />
            <Route path="entities" element={<EntitiesPage />} />
            <Route path="entities/:id" element={<EntityDetailsPage />} />
            
            <Route path="receipts/new" element={<ReceiptFormPage />} />
            <Route path="receipts/edit/:id" element={<ReceiptFormPage />} />
            <Route path="receipts/view/:id" element={<ReceiptViewPage />} />
            <Route path="income/view/:id" element={<IncomeViewPage />} />
            <Route path="transfers/view/:id" element={<TransferViewPage />} />
          </Route>
        </Routes>
      </Router>
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={closeSettingsModal}
        initialTab={settingsModalInitialTab}
      />
      <ProfilerOverlay />
    </>
  );
};
