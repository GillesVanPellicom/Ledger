import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PaintBrushIcon, PencilIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import Button from '../components/ui/Button';
import PaymentMethodModal from '../components/payment/PaymentMethodModal';
import PaymentMethodStyleModal from '../components/payment/PaymentMethodStyleModal';
import { db } from '../utils/db';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import * as SolidIcons from '@heroicons/react/24/solid';
import Tooltip from '../components/ui/Tooltip';

const PaymentMethodCard = ({ method, onStyleClick, onEditClick }) => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const style = settings.paymentMethodStyles?.[method.PaymentMethodID];
    const IconComponent = style?.type === 'icon' && style.symbol && SolidIcons[style.symbol];

    return (
        <div 
            className={cn(
                "rounded-lg shadow-md p-6 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 relative group",
                !style && "bg-white dark:bg-gray-800",
                method.PaymentMethodIsActive === 0 && "opacity-60"
            )}
            style={style ? { backgroundColor: style.color } : {}}
            onClick={() => navigate(`/payment-methods/${method.PaymentMethodID}`)}
        >
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip content="Edit Style">
                <button onClick={(e) => { e.stopPropagation(); onStyleClick(method); }} className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"><PaintBrushIcon className="h-4 w-4 text-white/80" /></button>
              </Tooltip>
              <Tooltip content="Edit">
                <button onClick={(e) => { e.stopPropagation(); onEditClick(method); }} className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"><PencilIcon className="h-4 w-4 text-white/80" /></button>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between">
                <h3 className={cn("text-lg font-bold", style ? 'text-white' : 'text-gray-900 dark:text-gray-100')}>{method.PaymentMethodName}</h3>
                {IconComponent && <IconComponent className={cn("h-8 w-8", style ? 'text-white/70' : 'text-gray-400')} />}
                {style?.type === 'emoji' && <span className="text-3xl">{style.symbol}</span>}
            </div>
            <div className="mt-4 text-right">
                <p className={cn("text-xs", style ? 'text-white/80' : 'text-gray-500 dark:text-gray-400')}>Current Balance</p>
                <p className={cn("text-2xl font-semibold", style ? 'text-white' : (method.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'))}>
                    € {method.balance.toFixed(2)}
                </p>
            </div>
            {method.PaymentMethodIsActive === 0 && (
              <div className="absolute bottom-2 left-2">
                <Tooltip content="Hidden">
                  <EyeSlashIcon className={cn("h-5 w-5", style ? 'text-white/60' : 'text-gray-400')} />
                </Tooltip>
              </div>
            )}
        </div>
    );
};

const PaymentMethodsPage = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();

  const fetchPaymentMethods = useCallback(async () => {
    setLoading(true);
    try {
      const methodsData = await db.query('SELECT * FROM PaymentMethods');
      const methodsWithBalance = await Promise.all(methodsData.map(async (method) => {
        const expensesResult = await db.queryOne('SELECT SUM(li.LineQuantity * li.LineUnitPrice) as total FROM LineItems li JOIN Receipts r ON li.ReceiptID = r.ReceiptID WHERE r.PaymentMethodID = ?', [method.PaymentMethodID]);
        const topupsResult = await db.queryOne('SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?', [method.PaymentMethodID]);
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
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
  };

  const handleStyleSave = async (methodId, newStyle) => {
    const newStyles = { ...settings.paymentMethodStyles, [methodId]: newStyle };
    await updateSettings({ ...settings, paymentMethodStyles: newStyles });
    fetchPaymentMethods();
  };

  const openStyleModal = (method) => {
    setSelectedMethod(method);
    setIsStyleModalOpen(true);
  };

  const openEditModal = (method) => {
    setSelectedMethod(method);
    setIsEditModalOpen(true);
  };

  const filteredMethods = methods.filter(m => showHidden || m.PaymentMethodIsActive === 1);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payment Methods</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowHidden(!showHidden)}>
            {showHidden ? <EyeSlashIcon className="h-5 w-5 mr-2" /> : <EyeIcon className="h-5 w-5 mr-2" />}
            {showHidden ? 'Hide Inactive' : 'Show Hidden'}
          </Button>
          <Button onClick={() => { setSelectedMethod(null); setIsAddModalOpen(true); }}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Method
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMethods.map(method => (
          <PaymentMethodCard key={method.PaymentMethodID} method={method} onStyleClick={openStyleModal} onEditClick={openEditModal} />
        ))}
      </div>

      <PaymentMethodModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setSelectedMethod(null); }}
        onSave={handleSave}
        methodToEdit={selectedMethod}
      />
      {selectedMethod && (
        <PaymentMethodStyleModal
          isOpen={isStyleModalOpen}
          onClose={() => setIsStyleModalOpen(false)}
          onSave={handleStyleSave}
          method={selectedMethod}
          currentStyle={settings.paymentMethodStyles?.[selectedMethod.PaymentMethodID]}
        />
      )}
    </div>
  );
};

export default PaymentMethodsPage;
