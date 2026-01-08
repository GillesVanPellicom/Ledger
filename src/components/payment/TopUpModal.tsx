import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { db } from '../../utils/db';
import { format } from 'date-fns';
import { TopUp } from '../../types';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  topUpToEdit: TopUp | null;
  paymentMethodId: string;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onSave, topUpToEdit, paymentMethodId }) => {
  const [formData, setFormData] = useState({ amount: '', date: new Date(), notes: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (!formData.date) newErrors.date = 'Date is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (isOpen) {
      if (topUpToEdit) {
        setFormData({
          amount: String(topUpToEdit.TopUpAmount),
          date: new Date(topUpToEdit.TopUpDate),
          notes: topUpToEdit.TopUpNote || '',
        });
      } else {
        setFormData({ amount: '', date: new Date(), notes: '' });
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
      if (topUpToEdit) {
        await db.execute(
          'UPDATE TopUps SET TopUpAmount = ?, TopUpDate = ?, TopUpNote = ? WHERE TopUpID = ?',
          [formData.amount, format(formData.date, 'yyyy-MM-dd'), formData.notes, topUpToEdit.TopUpID]
        );
      } else {
        await db.execute(
          'INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?, ?)',
          [paymentMethodId, formData.amount, format(formData.date, 'yyyy-MM-dd'), formData.notes]
        );
      }
      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save top-up' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={topUpToEdit ? "Edit Top-Up" : "Add Top-Up"}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{errors.form}</div>}
        <Input label="Amount" name="amount" type="number" value={formData.amount} onChange={handleChange} placeholder="0.00" error={errors.amount} />
        <div className="z-100">
          <DatePicker label="Date" selected={formData.date} onChange={handleDateChange} error={errors.date} />
        </div>
        <Input label="Notes (Optional)" name="notes" value={formData.notes} onChange={handleChange} placeholder="e.g., Monthly savings" />
      </form>
    </Modal>
  );
};

export default TopUpModal;
