import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import Button from '../components/ui/Button';
import PaymentMethodModal from '../components/payment/PaymentMethodModal';
import { db } from '../utils/db';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

const PaymentMethodCard = ({ method }) => {
    const navigate = useNavigate();
    return (
        <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200"
            onClick={() => navigate(`/payment-methods/${method.PaymentMethodID}`)}
        >
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{method.PaymentMethodName}</h3>
            </div>
            <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
                <p className={cn("text-2xl font-semibold", method.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100')}>
                    € {method.balance.toFixed(2)}
                </p>
            </div>
        </div>
    );
};

const PaymentMethodsPage = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [methodToEdit, setMethodToEdit] = useState(null);
  const { settings } = useSettings();
  const navigate = useNavigate();

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    try {
      const methodsData = await db.query('SELECT * FROM PaymentMethods');
      
      const methodsWithBalance = await Promise.all(methodsData.map(async (method) => {
        const expensesResult = await db.queryOne(
          'SELECT SUM(li.LineQuantity * li.LineUnitPrice) as total FROM LineItems li JOIN Receipts r ON li.ReceiptID = r.ReceiptID WHERE r.PaymentMethodID = ?',
          [method.PaymentMethodID]
        );
        const topupsResult = await db.queryOne(
          'SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?',
          [method.PaymentMethodID]
        );
        
        const expenses = expensesResult?.total || 0;
        const topups = topupsResult?.total || 0;
        const balance = method.PaymentMethodFunds + topups - expenses;
        
        return { ...method, balance };
      }));

      setMethods(methodsWithBalance);
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!settings.modules.paymentMethods?.enabled) {
      navigate('/');
    } else {
      fetchPaymentMethods();
    }
  }, [settings.modules.paymentMethods, fetchPaymentMethods, navigate]);

  const handleSave = () => {
    fetchPaymentMethods();
    setMethodToEdit(null);
  };

  const openModal = (method = null) => {
    setMethodToEdit(method);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payment Methods</h1>
        <Button onClick={() => openModal()}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Method
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {methods.map(method => (
          <PaymentMethodCard key={method.PaymentMethodID} method={method} />
        ))}
      </div>

      <PaymentMethodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        methodToEdit={methodToEdit}
        onSave={handleSave}
      />
    </div>
  );
};

export default PaymentMethodsPage;
