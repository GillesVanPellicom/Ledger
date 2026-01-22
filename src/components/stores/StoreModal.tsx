import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { Store } from '../../types';
import VisibilityCard from '../ui/VisibilityCard';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newStoreId?: number) => void;
  storeToEdit: Store | null;
}

const StoreModal: React.FC<StoreModalProps> = ({ isOpen, onClose, onSave, storeToEdit }) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (storeToEdit) {
        setName(storeToEdit.StoreName);
        setIsActive(storeToEdit.StoreIsActive);
      } else {
        setName('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, storeToEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Store name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (storeToEdit) {
        await db.execute(
          'UPDATE Stores SET StoreName = ?, StoreIsActive = ? WHERE StoreID = ?',
          [name.trim(), isActive ? 1 : 0, storeToEdit.StoreID]
        );
        onSave();
      } else {
        const result = await db.execute(
          'INSERT INTO Stores (StoreName, StoreIsActive) VALUES (?, ?)',
          [name.trim(), isActive ? 1 : 0]
        );
        onSave(result.lastID);
      }
      onClose();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This store name already exists.');
      } else {
        setError(err.message || 'Failed to save store');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={storeToEdit ? 'Edit Store' : 'Add New Store'}
      onEnter={handleSubmit}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <div className="space-y-4">
        {error && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{error}</div>}
        <Input
          label="Store Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Aldi"
        />
        <VisibilityCard 
          isActive={isActive}
          onToggle={() => setIsActive(!isActive)}
          entityName="store"
        />
      </div>
    </Modal>
  );
};

export default StoreModal;
