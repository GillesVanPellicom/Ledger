import React, {useState, useEffect} from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import {db} from '../../utils/db';
import {cn} from '../../utils/cn';
import {Debtor} from '../../types';
import Switch from '../ui/Switch';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  debtorToEdit: Debtor | null;
}

const DebtModal: React.FC<DebtModalProps> = ({isOpen, onClose, onSave, debtorToEdit}) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (debtorToEdit) {
        setName(debtorToEdit.DebtorName);
        setIsActive(debtorToEdit.DebtorIsActive);
      } else {
        setName('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, debtorToEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (debtorToEdit) {
        await db.execute(
          'UPDATE Entities SET EntityName = ?, EntityIsActive = ? WHERE EntityID = ?',
          [name.trim(), isActive ? 1 : 0, debtorToEdit.DebtorID]
        );
      } else {
        await db.execute(
          'INSERT INTO Entities (EntityName, EntityIsActive) VALUES (?, ?)',
          [name.trim(), isActive ? 1 : 0]
        );
      }
      onSave();
      onClose();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This name already exists.');
      } else {
        setError(err.message || 'Failed to save debtor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={debtorToEdit ? 'Edit Debtor' : 'Add New Debtor'}
      onEnter={handleSubmit}
      footer={<><Button variant="secondary"
                        onClick={onClose}
                        disabled={loading}>Cancel</Button><Button onClick={handleSubmit}
                                                                  loading={loading}>Save</Button></>}
    >
      <div className="space-y-4">
        {error &&
          <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{error}</div>}
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., John Doe"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-font-1">Status</span>
          <Switch isEnabled={isActive} onToggle={() => setIsActive(!isActive)} />
        </div>
      </div>
    </Modal>
  );
};

export default DebtModal;
