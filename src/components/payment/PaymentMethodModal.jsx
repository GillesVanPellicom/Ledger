import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';

const PaymentMethodModal = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Method name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await db.execute('INSERT INTO PaymentMethods (PaymentMethodName, PaymentMethodFunds) VALUES (?, ?)', [name, 0]);
      onSave();
      onClose();
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This payment method name already exists.');
      } else {
        setError(err.message || 'Failed to save payment method');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Payment Method"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
        <Input label="Method Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PayPal" />
      </form>
    </Modal>
  );
};

export default PaymentMethodModal;
