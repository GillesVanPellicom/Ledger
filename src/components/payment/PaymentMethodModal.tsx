import React, {useState, useEffect} from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import {db} from '../../utils/db';
import {PaymentMethod} from '../../types';
import VisibilityCard from '../ui/VisibilityCard';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  methodToEdit: PaymentMethod | null;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({isOpen, onClose, onSave, methodToEdit}) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (methodToEdit) {
        setName(methodToEdit.PaymentMethodName);
        setIsActive(methodToEdit.PaymentMethodIsActive === 1);
      } else {
        setName('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, methodToEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Method name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (methodToEdit) {
        await db.execute('UPDATE PaymentMethods SET PaymentMethodName = ?, PaymentMethodIsActive = ? WHERE PaymentMethodID = ?', [name, isActive ? 1 : 0, methodToEdit.PaymentMethodID]);
      } else {
        await db.execute('INSERT INTO PaymentMethods (PaymentMethodName, PaymentMethodFunds, PaymentMethodIsActive) VALUES (?, ?, ?)', [name, 0, isActive ? 1 : 0]);
      }
      onSave();
      onClose();
    } catch (err: any) {
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
      title={methodToEdit ? "Edit Payment Method" : "Add New Payment Method"}
      onEnter={handleSubmit}
      footer={<><Button variant="secondary"
                        onClick={onClose}
                        disabled={loading}>Cancel</Button><Button onClick={handleSubmit}
                                                                  loading={loading}>Save</Button></>}
    >
      <div className="space-y-4">
        {error &&
          <div className="p-3 bg-red/10 text-red text-sm rounded-lg ">{error}</div>}
        <Input label="Method Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PayPal"/>

        <VisibilityCard 
          isActive={isActive}
          onToggle={() => setIsActive(!isActive)}
          entityName="payment method"
        />
      </div>
    </Modal>
  );
};

export default PaymentMethodModal;
