import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { Category } from '../../types';
import VisibilityCard from '../ui/VisibilityCard';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCategoryId?: number, name?: string) => void;
  categoryToEdit: Category | null;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, categoryToEdit }) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        setName(categoryToEdit.CategoryName);
        setIsActive(!!categoryToEdit.CategoryIsActive);
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
          'UPDATE ProductCategories SET ProductCategoryName = ?, ProductCategoryIsActive = ? WHERE ProductCategoryID = ?',
          [name.trim(), isActive ? 1 : 0, categoryToEdit.CategoryID]
        );
        onSave(categoryToEdit.CategoryID, name.trim());
      } else {
        const result = await db.execute(
          'INSERT INTO ProductCategories (ProductCategoryName, ProductCategoryIsActive) VALUES (?, ?)',
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
      title={categoryToEdit ? 'Edit Category' : 'Add New Category'}
      onEnter={handleSubmit}
      isDatabaseTransaction
      successToastMessage={categoryToEdit ? 'Category updated successfully' : 'Category created successfully'}
      errorToastMessage="Failed to save category"
      loadingMessage="Saving category..."
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <div className="space-y-4">
        {error && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{error}</div>}
        <Input
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Groceries"
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

export default CategoryModal;
