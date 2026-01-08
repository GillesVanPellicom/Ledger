import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import { Entity } from '../../types';

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  entityToEdit: Entity | null;
}

const EntityModal: React.FC<EntityModalProps> = ({ isOpen, onClose, onSave, entityToEdit }) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (entityToEdit) {
        setName(entityToEdit.DebtorName);
        setIsActive(entityToEdit.EntityIsActive);
      } else {
        setName('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, entityToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (entityToEdit) {
        await db.execute(
          'UPDATE Debtors SET DebtorName = ?, DebtorIsActive = ? WHERE DebtorID = ?',
          [name.trim(), isActive ? 1 : 0, entityToEdit.DebtorID]
        );
      } else {
        await db.execute(
          'INSERT INTO Debtors (DebtorName, DebtorIsActive) VALUES (?, ?)',
          [name.trim(), isActive ? 1 : 0]
        );
      }
      onSave();
      onClose();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This name already exists.');
      } else {
        setError(err.message || 'Failed to save entity');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entityToEdit ? 'Edit Entity' : 'Add New Entity'}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
        <Input 
          label="Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g., John Doe"
        />
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
              {isActive ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
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
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EntityModal;
