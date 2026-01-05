import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';

const PaymentMethodModal = ({ isOpen, onClose, methodToEdit, onSave }) => {
  const [formData, setFormData] = useState({ PaymentMethodName: '', initialBalance: 0 });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.PaymentMethodName) newErrors.PaymentMethodName = 'Method name is required.';
    if (formData.initialBalance < 0) newErrors.initialBalance = 'Initial balance cannot be negative.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (isOpen) {
      if (methodToEdit) {
        setFormData({ PaymentMethodName: methodToEdit.PaymentMethodName, initialBalance: 0 });
      } else {
        setFormData({ PaymentMethodName: '', initialBalance: 0 });
      }
      setErrors({});
    }
  }, [isOpen, methodToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (methodToEdit) {
        await db.execute('UPDATE PaymentMethods SET PaymentMethodName = ? WHERE PaymentMethodID = ?', [formData.PaymentMethodName, methodToEdit.PaymentMethodID]);
      } else {
        const result = await db.execute('INSERT INTO PaymentMethods (PaymentMethodName, PaymentMethodFunds) VALUES (?, ?)', [formData.PaymentMethodName, formData.initialBalance]);
        const newMethodId = result.lastID;
      }
      onSave();
      onClose();
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setErrors({ form: 'This payment method name already exists.' });
      } else {
        setErrors({ form: err.message || 'Failed to save payment method' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={methodToEdit ? "Edit Payment Method" : "Add New Payment Method"}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{errors.form}</div>}
        <Input label="Method Name" name="PaymentMethodName" value={formData.PaymentMethodName} onChange={handleChange} placeholder="e.g. PayPal" error={errors.PaymentMethodName} />
        {!methodToEdit && (
          <Input label="Initial Balance" name="initialBalance" type="number" value={formData.initialBalance} onChange={handleChange} placeholder="0.00" error={errors.initialBalance} />
        )}
      </form>
    </Modal>
  );
};

export default PaymentMethodModal;
