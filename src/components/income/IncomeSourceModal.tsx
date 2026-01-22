import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import VisibilityCard from '../ui/VisibilityCard';

interface IncomeSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSourceId?: number) => void;
  sourceToEdit: any | null;
}

const IncomeSourceModal: React.FC<IncomeSourceModalProps> = ({ isOpen, onClose, onSave, sourceToEdit }) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (sourceToEdit) {
        setName(sourceToEdit.IncomeSourceName);
        setIsActive(!!sourceToEdit.IncomeSourceIsActive);
      } else {
        setName('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, sourceToEdit]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Source name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (sourceToEdit) {
        await db.execute(
          'UPDATE IncomeSources SET IncomeSourceName = ?, IncomeSourceIsActive = ? WHERE IncomeSourceID = ?',
          [name.trim(), isActive ? 1 : 0, sourceToEdit.IncomeSourceID]
        );
        onSave();
      } else {
        const result = await db.execute(
          'INSERT INTO IncomeSources (IncomeSourceName, IncomeSourceIsActive) VALUES (?, ?)',
          [name.trim(), isActive ? 1 : 0]
        );
        onSave(result.lastID);
      }
      onClose();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This source name already exists.');
      } else {
        setError(err.message || 'Failed to save source');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sourceToEdit ? 'Edit Income Source' : 'Add New Income Source'}
      onEnter={handleSubmit}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <div className="space-y-4">
        {error && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{error}</div>}
        <Input
          label="Source Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Company X, Tenant Y"
        />
        <VisibilityCard 
          isActive={isActive}
          onToggle={() => setIsActive(!isActive)}
          entityName="source"
        />
      </div>
    </Modal>
  );
};

export default IncomeSourceModal;
