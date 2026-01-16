import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { Product } from '../../types';
import Separator from '../ui/Separator';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Plus } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import CategoryModal from '../categories/CategoryModal';
import StepperInput from '../ui/StepperInput';
import Combobox from '../ui/Combobox';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  onSave: () => void;
  showSaveAndSelect?: boolean;
  onSaveAndSelect?: (productId: number) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, productToEdit, onSave, showSaveAndSelect, onSaveAndSelect }) => {
  const [formData, setFormData] = useState({ ProductName: '', ProductBrand: '', ProductSize: '', ProductUnitID: '', CategoryID: '' });
  const [units, setUnits] = useState<{ value: number; label: string }[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { settings } = useSettingsStore();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.ProductName) newErrors.ProductName = 'Product name is required.';
    // Brand, Size, Unit, and Category are now optional
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const loadUnits = async () => {
    const result = await db.query<{ ProductUnitID: number; ProductUnitType: string; ProductUnitDescription: string }[]>('SELECT * FROM ProductUnits ORDER BY ProductUnitType');
    setUnits(result.map(u => ({ value: u.ProductUnitID, label: `${u.ProductUnitType} (${u.ProductUnitDescription})` })));
  };

  const loadCategories = async () => {
    const result = await db.query<{ CategoryID: number; CategoryName: string }[]>('SELECT CategoryID, CategoryName FROM Categories WHERE CategoryIsActive = 1 ORDER BY CategoryName');
    setCategories(result.map(c => ({ value: String(c.CategoryID), label: c.CategoryName })));
  };

  useEffect(() => {
    if (isOpen) {
      loadUnits();
      loadCategories();
      if (productToEdit) {
        setFormData({ 
          ...productToEdit, 
          ProductSize: String(productToEdit.ProductSize), 
          ProductUnitID: String(productToEdit.ProductUnitID),
          CategoryID: productToEdit.CategoryID ? String(productToEdit.CategoryID) : ''
        });
      } else {
        setFormData({ ProductName: '', ProductBrand: '', ProductSize: '', ProductUnitID: '', CategoryID: '' });
      }
      setErrors({});
    }
  }, [isOpen, productToEdit]);

  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleChange = (name: string, value: string) => {
    let processedValue = value;
    if ((settings.modules as any).capitalizationProtection?.enabled) {
      if (name === 'ProductName') {
        processedValue = value.toLowerCase();
      } else if (name === 'ProductBrand') {
        processedValue = capitalizeWords(value);
      }
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange(e.target.name, e.target.value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e.target.name, e.target.value);
  };

  const handleSave = async (shouldSelect = false) => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const productData = {
        ProductName: formData.ProductName,
        ProductBrand: formData.ProductBrand || null,
        ProductSize: formData.ProductSize || null,
        ProductUnitID: formData.ProductUnitID || null,
        CategoryID: formData.CategoryID || null
      };

      let result;
      if (productToEdit) {
        await db.execute('UPDATE Products SET ProductName = ?, ProductBrand = ?, ProductSize = ?, ProductUnitID = ?, CategoryID = ? WHERE ProductID = ?', [productData.ProductName, productData.ProductBrand, productData.ProductSize, productData.ProductUnitID, productData.CategoryID, productToEdit.ProductID]);
        result = { lastID: productToEdit.ProductID };
      } else {
        result = await db.execute('INSERT INTO Products (ProductName, ProductBrand, ProductSize, ProductUnitID, CategoryID) VALUES (?, ?, ?, ?, ?)', [productData.ProductName, productData.ProductBrand, productData.ProductSize, productData.ProductUnitID, productData.CategoryID]);
      }
      
      if (shouldSelect && onSaveAndSelect) {
        onSaveAndSelect(result.lastID);
      } else {
        onSave();
      }
      onClose();
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setErrors({ form: 'This product (Name + Brand + Size) already exists.' });
      } else {
        setErrors({ form: err.message || 'Failed to save product' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(false);
  };

  const handleCategorySave = async (newCategoryId?: number) => {
    await loadCategories();
    if (newCategoryId) {
      setFormData(prev => ({ ...prev, CategoryID: String(newCategoryId) }));
    }
    setIsCategoryModalOpen(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={productToEdit ? "Edit Product" : "Add New Product"}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            {showSaveAndSelect && !productToEdit && (
              <Button onClick={() => handleSave(true)} loading={loading}>Save & Select</Button>
            )}
            <Button onClick={() => handleSave(false)} loading={loading}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{errors.form}</div>}
          <Input label="Product Name" name="ProductName" value={formData.ProductName} onChange={handleInputChange} placeholder="e.g. gouda cheese" error={errors.ProductName} />
          
          <div className="relative py-2">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="px-2 bg-white dark:bg-black text-sm text-gray-500">Optional Details</span>
            </div>
          </div>

          <Input label="Brand" name="ProductBrand" value={formData.ProductBrand} onChange={handleInputChange} placeholder="e.g. Old Amsterdam" error={errors.ProductBrand} />
          
          <div className="flex items-end gap-2">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <Combobox
                options={categories}
                value={formData.CategoryID}
                onChange={(value) => handleChange('CategoryID', value)}
                placeholder="Select Category"
                searchPlaceholder="Search categories..."
                noResultsText="No categories found."
              />
            </div>
            <Tooltip content="Add Category">
              <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsCategoryModalOpen(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StepperInput
              label="Size"
              name="ProductSize"
              value={formData.ProductSize}
              onChange={handleInputChange}
              onDecrement={() => handleChange('ProductSize', String(Math.max(0, (parseFloat(formData.ProductSize) || 0) - 1)))}
              onIncrement={() => handleChange('ProductSize', String((parseFloat(formData.ProductSize) || 0) + 1))}
              error={errors.ProductSize}
              className="col-span-1"
            />
            <Select label="Unit" name="ProductUnitID" value={formData.ProductUnitID} onChange={handleSelectChange} options={units} placeholder="Select Unit" error={errors.ProductUnitID} />
          </div>
        </form>
      </Modal>
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleCategorySave}
        categoryToEdit={null}
      />
    </>
  );
};

export default ProductModal;
