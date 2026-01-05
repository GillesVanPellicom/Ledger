import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { cn } from '../../utils/cn';

const StoreModal = ({ isOpen, onClose, onSave, storeToEdit }) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (storeToEdit) {
        setName(storeToEdit.StoreName);
        setIsActive(storeToEdit.StoreIsActive === 1);
      } else {
        setName('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, storeToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      } else {
        await db.execute(
          'INSERT INTO Stores (StoreName, StoreIsActive) VALUES (?, ?)',
          [name.trim(), isActive ? 1 : 0]
        );
      }
      onSave();
      onClose();
    } catch (err) {
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
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
        <Input 
          label="Store Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="e.g., Aldi"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={cn(
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
              isActive ? "bg-accent" : "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <span className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              isActive ? "translate-x-5" : "translate-x-0"
            )} />
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StoreModal;
