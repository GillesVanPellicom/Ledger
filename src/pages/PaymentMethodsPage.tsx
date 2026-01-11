import React, { useState, useEffect } from 'react';
import { PlusIcon, PaintBrushIcon, PencilIcon, EyeIcon, EyeSlashIcon, CreditCardIcon } from '@heroicons/react/24/solid';
import Button from '../components/ui/Button';
import PaymentMethodModal from '../components/payment/PaymentMethodModal';
import PaymentMethodStyleModal from '../components/payment/PaymentMethodStyleModal';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import * as SolidIcons from '@heroicons/react/24/solid';
import Tooltip from '../components/ui/Tooltip';
import { PaymentMethod, PaymentMethodStyle } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import PageSpinner from '../components/ui/PageSpinner';
import DataGrid from '../components/ui/DataGrid';
import Spinner from '../components/ui/Spinner';
import { usePaymentMethods, usePaymentMethodBalance, useInvalidatePaymentMethods } from '../hooks/usePaymentMethods';
import { useSettingsStore } from '../store/useSettingsStore';

interface PaymentMethodItemProps {
  method: PaymentMethod;
  onStyleClick: (method: PaymentMethod) => void;
  onEditClick: (method: PaymentMethod) => void;
}

const PaymentMethodItem: React.FC<PaymentMethodItemProps> = ({ method, onStyleClick, onEditClick }) => {
    const { settings } = useSettingsStore();
    const style = settings.paymentMethodStyles?.[method.PaymentMethodID];
    const IconComponent = style?.type === 'icon' && style.symbol && (SolidIcons as any)[style.symbol];
    
    const { data: balance, isLoading } = usePaymentMethodBalance(method.PaymentMethodID, method.PaymentMethodFunds);

    return (
        <div className={cn("flex flex-col justify-between h-full relative group", method.PaymentMethodIsActive === 0 && "opacity-60")}>
            <div className="absolute top-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip content="Edit Style">
                <button onClick={(e) => { e.stopPropagation(); onStyleClick(method); }} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><PaintBrushIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" /></button>
              </Tooltip>
              <Tooltip content="Edit">
                <button onClick={(e) => { e.stopPropagation(); onEditClick(method); }} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><PencilIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" /></button>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{method.PaymentMethodName}</h3>
                <div className="w-8 h-8 flex items-center justify-center">
                  {IconComponent ? <IconComponent className="h-8 w-8 text-gray-400" /> :
                   style?.type === 'emoji' ? <span className="text-3xl">{style.symbol}</span> :
                   <CreditCardIcon className="h-8 w-8 text-gray-300 dark:text-gray-700" />}
                </div>
            </div>
            <div className="mt-4 text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
                {isLoading || balance === undefined ? (
                  <div className="flex justify-end items-center h-7">
                    <Spinner className="h-5 w-5 text-gray-400" />
                  </div>
                ) : (
                  <p className={cn("text-2xl font-semibold", balance < 0 ? 'text-red' : 'text-gray-900 dark:text-gray-100')}>
                      € {balance.toFixed(2)}
                  </p>
                )}
            </div>
            {method.PaymentMethodIsActive === 0 && (
              <div className="absolute bottom-0 left-0">
                <Tooltip content="Hidden">
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                </Tooltip>
              </div>
            )}
        </div>
    );
};

const PaymentMethodsPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const { settings, updateSettings } = useSettingsStore();
  const navigate = useNavigate();
  const invalidatePaymentMethods = useInvalidatePaymentMethods();

  const { data: methods, isLoading } = usePaymentMethods();

  useEffect(() => {
    if (!settings.modules.paymentMethods?.enabled) {
      navigate('/');
    }
  }, [settings.modules.paymentMethods, navigate]);

  const handleSave = () => {
    invalidatePaymentMethods();
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
  };

  const handleStyleSave = async (methodId: number, newStyle: PaymentMethodStyle) => {
    const newStyles = { ...settings.paymentMethodStyles, [methodId]: newStyle };
    await updateSettings({ ...settings, paymentMethodStyles: newStyles });
    setIsStyleModalOpen(false);
  };

  const openStyleModal = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsStyleModalOpen(true);
  };

  const openEditModal = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsEditModalOpen(true);
  };

  const filteredMethods = (methods || []).filter(m => showHidden || m.PaymentMethodIsActive === 1);

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <div>
      <Header
        title="Payment Methods"
        actions={
          <>
            <Tooltip content={showHidden ? 'Hide Inactive' : 'Show Hidden'}>
              <Button variant="ghost" size="icon" onClick={() => setShowHidden(!showHidden)}>
                {showHidden ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </Button>
            </Tooltip>
            <Tooltip content="Add Method">
              <Button variant="ghost" size="icon" onClick={() => { setSelectedMethod(null); setIsAddModalOpen(true); }}>
                <PlusIcon className="h-5 w-5" />
              </Button>
            </Tooltip>
          </>
        }
      />
      <PageWrapper>
        <div className="py-6">
          <DataGrid
            data={filteredMethods}
            itemKey="PaymentMethodID"
            onItemClick={(method) => navigate(`/payment-methods/${method.PaymentMethodID}`)}
            renderItem={(method) => (
              <PaymentMethodItem
                method={method}
                onStyleClick={openStyleModal}
                onEditClick={openEditModal}
              />
            )}
            minItemWidth={320}
          />

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
      </PageWrapper>
    </div>
  );
};

export default PaymentMethodsPage;
