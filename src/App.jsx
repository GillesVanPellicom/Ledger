import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProductsPage from './pages/ProductsPage';
import ReceiptsPage from './pages/ReceiptsPage';
import ReceiptFormPage from './pages/ReceiptFormPage';
import ReceiptViewPage from './pages/ReceiptViewPage';

// Placeholder Pages
const AnalyticsPage = () => <div className="text-2xl font-bold">Analytics</div>;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<ReceiptsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          
          <Route path="receipts/new" element={<ReceiptFormPage />} />
          <Route path="receipts/edit/:id" element={<ReceiptFormPage />} />
          <Route path="receipts/view/:id" element={<ReceiptViewPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
