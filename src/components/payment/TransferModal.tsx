import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { db } from '../../utils/db';
import { format } from 'date-fns';
import { PaymentMethod, TopUp } from '../../types';
import Select from '../ui/Select';

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
        setFormData({
          amount: String(Math.abs(topUpToEdit.TopUpAmount)),
          date: new Date(topUpToEdit.TopUpDate),
          notes: topUpToEdit.TopUpNote || '',
        });
        setTransferType(topUpToEdit.TopUpAmount > 0 ? 'deposit' : 'transfer');
      } else {
        setFormData({ amount: '', date: new Date(), notes: '' });
        setTransferType('deposit');
      }
      setErrors({});
    }
  }, [isOpen, topUpToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const amount = Number(formData.amount);
      const date = format(formData.date, 'yyyy-MM-dd');
      const notes = formData.notes;

      if (topUpToEdit) {
        await db.execute(
          'UPDATE TopUps SET TopUpAmount = ?, TopUpDate = ?, TopUpNote = ? WHERE TopUpID = ?',
          [transferType === 'deposit' ? amount : -amount, date, notes, topUpToEdit.TopUpID]
        );
      } else if (transferType === 'deposit') {
        await db.execute(
          'INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?, ?)',
          [paymentMethodId, amount, date, notes]
        );
      } else { // New transfer
        const targetMethodId = transferTo;
        const currentMethodName = (await db.queryOne<PaymentMethod>('SELECT PaymentMethodName FROM PaymentMethods WHERE PaymentMethodID = ?', [paymentMethodId]))?.PaymentMethodName;
        const targetMethodName = (await db.queryOne<PaymentMethod>('SELECT PaymentMethodName FROM PaymentMethods WHERE PaymentMethodID = ?', [targetMethodId]))?.PaymentMethodName;

        await db.execute(
          'INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?, ?)',
          [paymentMethodId, -amount, date, `Transfer to ${targetMethodName}${notes ? ` - ${notes}`: ''}`]
        );
        await db.execute(
          'INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?, ?)',
          [targetMethodId, amount, date, `Transfer from ${currentMethodName}${notes ? ` - ${notes}`: ''}`]
        );
      }
      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save transfer' });
    } finally {
      setLoading(false);
    }
  };

  const transferToOptions = paymentMethods.map(pm => ({ value: String(pm.PaymentMethodID), label: pm.PaymentMethodName }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={topUpToEdit ? "Edit Transaction" : "New Transfer"}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Input label="Amount" name="amount" type="number" value={formData.amount} onChange={handleChange} placeholder="0.00" error={errors.amount} />
        
        <div className="z-100">
          <DatePicker label="Date" selected={formData.date} onChange={handleDateChange} error={errors.date} />
        </div>

        <Input label="Notes (Optional)" name="notes" value={formData.notes} onChange={handleChange} placeholder="e.g., Monthly savings" />
      </form>
    </Modal>
  );
};

export default TransferModal;
