import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProductsPage from './pages/ProductsPage';
import ReceiptsPage from './pages/ReceiptsPage';

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
          
          {/* Future Routes */}
          <Route path="receipts/new" element={<div>New Receipt</div>} />
          <Route path="receipts/view/:id" element={<div>View Receipt</div>} />
          <Route path="receipts/edit/:id" element={<div>Edit Receipt</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
