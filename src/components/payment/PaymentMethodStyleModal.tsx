import React from 'react';
import AppearanceModal from '../ui/AppearanceModal';
import { PaymentMethod, PaymentMethodStyle } from '../../types';

interface PaymentMethodStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (methodId: number, style: Omit<PaymentMethodStyle, 'color'>) => void;
  method: PaymentMethod;
  currentStyle?: PaymentMethodStyle;
}

const PaymentMethodStyleModal: React.FC<PaymentMethodStyleModalProps> = ({ isOpen, onClose, onSave, method, currentStyle }) => {
  return (
    <AppearanceModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={(style) => onSave(method.PaymentMethodID, style)}
      title={`Style: ${method?.PaymentMethodName}`}
      initialSymbol={currentStyle?.symbol}
      initialType={currentStyle?.type}
      defaultIcon="CreditCard"
    />
  );
};

export default PaymentMethodStyleModal;
