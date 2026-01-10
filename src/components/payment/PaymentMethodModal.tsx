import React, {useState, useEffect} from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import {db} from '../../utils/db';
import {EyeIcon, EyeSlashIcon} from '@heroicons/react/24/solid';
import {PaymentMethod} from '../../types';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      footer={<><Button variant="secondary"
                        onClick={onClose}
                        disabled={loading}>Cancel</Button><Button onClick={handleSubmit}
                                                                  loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error &&
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red text-sm rounded-lg">{error}</div>}
        <Input label="Method Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PayPal"/>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100 text-green dark:bg-green-900/30' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
              {isActive ? <EyeIcon className="h-5 w-5"/> : <EyeSlashIcon className="h-5 w-5"/>}
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Visibility</p>
              <p className="text-xs text-gray-500">{isActive ? 'Shown in lists' : 'Hidden from lists'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`}/>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentMethodModal;
