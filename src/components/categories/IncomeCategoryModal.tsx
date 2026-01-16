import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import VisibilityCard from '../ui/VisibilityCard';

interface IncomeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCategoryId?: number) => void;
  categoryToEdit: any | null;
}

const IncomeCategoryModal: React.FC<IncomeCategoryModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.IncomeCategoryName);
        setIsActive(!!categoryToEdit.IncomeCategoryIsActive);
      } else {
        setName('');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, categoryToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (categoryToEdit) {
        await db.execute(
          'UPDATE IncomeCategories SET IncomeCategoryName = ?, IncomeCategoryIsActive = ? WHERE IncomeCategoryID = ?',
          [name.trim(), isActive ? 1 : 0, categoryToEdit.IncomeCategoryID]
        );
        onSave();
      } else {
        const result = await db.execute(
          'INSERT INTO IncomeCategories (IncomeCategoryName, IncomeCategoryIsActive) VALUES (?, ?)',
          [name.trim(), isActive ? 1 : 0]
        );
        onSave(result.lastID);
      }
      onClose();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This category name already exists.');
      } else {
        setError(err.message || 'Failed to save category');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? 'Edit Income Category' : 'Add New Income Category'}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
        <Input
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Salary, Investment"
        />
        <VisibilityCard 
          isActive={isActive}
          onToggle={() => setIsActive(!isActive)}
          entityName="category"
        />
      </form>
    </Modal>
  );
};

export default IncomeCategoryModal;
