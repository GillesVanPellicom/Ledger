import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import VisibilityCard from '../ui/VisibilityCard';

interface IncomeCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCategoryId?: number, name?: string) => void;
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

  const handleSubmit = async () => {
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
        onSave(categoryToEdit.IncomeCategoryID, name.trim());
      } else {
        const result = await db.execute(
          'INSERT INTO IncomeCategories (IncomeCategoryName, IncomeCategoryIsActive) VALUES (?, ?)',
          [name.trim(), isActive ? 1 : 0]
        );
        onSave(result.lastID, name.trim());
      }
      onClose();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This category name already exists.');
      } else {
        setError(err.message || 'Failed to save category');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? 'Edit Income Category' : 'Add New Income Category'}
      onEnter={handleSubmit}
      isDatabaseTransaction
      successToastMessage={categoryToEdit ? 'Income category updated successfully' : 'Income category created successfully'}
      errorToastMessage="Failed to save income category"
      loadingMessage="Saving income category..."
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <div className="space-y-4">
        {error && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{error}</div>}
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
      </div>
    </Modal>
  );
};

export default IncomeCategoryModal;
