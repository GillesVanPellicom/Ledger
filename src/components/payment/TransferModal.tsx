import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { db } from '../../utils/db';
import { format } from 'date-fns';
import { PaymentMethod, TopUp } from '../../types';
import Select from '../ui/Select';
import { useQueryClient } from '@tanstack/react-query';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  topUpToEdit: TopUp | null;
  paymentMethodId: string;
  currentBalance: number;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onSave, topUpToEdit, paymentMethodId, currentBalance }) => {
  const [formData, setFormData] = useState({ amount: '', date: new Date(), notes: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [transferType, setTransferType] = useState<'deposit' | 'transfer'>('deposit');
  const [transferTo, setTransferTo] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      const methods = await db.query<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1 AND PaymentMethodID != ?', [paymentMethodId]);
      setPaymentMethods(methods);
      if (methods.length > 0) {
        setTransferTo(String(methods[0].PaymentMethodID));
      }
    };
    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [isOpen, paymentMethodId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const amount = Number(formData.amount);
    if (!formData.amount || amount <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (transferType === 'transfer' && amount > currentBalance) newErrors.amount = 'Transfer amount cannot exceed current balance.';
    if (!formData.date) newErrors.date = 'Date is required.';
    if (transferType === 'transfer' && !transferTo) newErrors.transferTo = 'Please select a destination account.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (isOpen) {
      if (topUpToEdit) {
        // Editing is disabled for now with the new system
        // This can be re-implemented if needed
        setFormData({ amount: '', date: new Date(), notes: '' });
        setTransferType('deposit');
      } else {
        setFormData({ amount: '', date: new Date(), notes: '' });
        setTransferType('deposit');
      }
      setErrors({});
    }
  }, [isOpen, topUpToEdit]);

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const transactionDetails = {
        type: transferType,
        amount: Number(formData.amount),
        date: format(formData.date, 'yyyy-MM-dd'),
        note: formData.notes,
        from: paymentMethodId,
        to: transferTo,
      };

      await window.electronAPI.createTransaction(transactionDetails);
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance', parseInt(paymentMethodId)] });
      if (transferType === 'transfer') {
        queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance', parseInt(transferTo)] });
      }
      queryClient.invalidateQueries({ queryKey: ['analytics'] });

      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save transaction' });
    } finally {
      setLoading(false);
    }
  };

  const transferToOptions = paymentMethods.map(pm => ({ value: String(pm.PaymentMethodID), label: pm.PaymentMethodName }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={topUpToEdit ? "Edit Transaction" : "New Transaction"}
      onEnter={handleSubmit}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <div className="space-y-4">
        {errors.form && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red text-sm rounded-lg">{errors.form}</div>}
        
        {!topUpToEdit && (
          <Select
            label="Type"
            value={transferType}
            onChange={(e) => setTransferType(e.target.value as 'deposit' | 'transfer')}
            options={[
              { value: 'deposit', label: 'Deposit' },
              { value: 'transfer', label: 'Transfer' }
            ]}
          />
        )}

        {transferType === 'transfer' && !topUpToEdit && (
          <Select
            label="Transfer to"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            options={transferToOptions}
            error={errors.transferTo}
          />
        )}

        <Input label="Amount" name="amount" type="number" value={formData.amount} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" error={errors.amount} />
        
        <div className="z-100">
          <DatePicker label="Date" selected={formData.date} onChange={(date: Date | null) => date && setFormData(prev => ({ ...prev, date }))} error={errors.date} />
        </div>

        <Input label="Notes (Optional)" name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g., Monthly savings" />
      </div>
    </Modal>
  );
};

export default TransferModal;
