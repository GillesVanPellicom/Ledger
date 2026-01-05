import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProductsPage from './pages/ProductsPage';
import ReceiptsPage from './pages/ReceiptsPage';
import ReceiptFormPage from './pages/ReceiptFormPage';
import ReceiptViewPage from './pages/ReceiptViewPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import PaymentMethodDetailsPage from './pages/PaymentMethodDetailsPage';
import { useError } from './context/ErrorContext';

function App() {
  const { showError } = useError();

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

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<ReceiptsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="payment-methods" element={<PaymentMethodsPage />} />
          <Route path="payment-methods/:id" element={<PaymentMethodDetailsPage />} />
          
          <Route path="receipts/new" element={<ReceiptFormPage />} />
          <Route path="receipts/edit/:id" element={<ReceiptFormPage />} />
          <Route path="receipts/view/:id" element={<ReceiptViewPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
