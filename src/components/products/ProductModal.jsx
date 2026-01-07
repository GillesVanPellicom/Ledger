import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { useSettings } from '../../context/SettingsContext';

const ProductModal = ({ isOpen, onClose, productToEdit, onSave, showSaveAndSelect, onSaveAndSelect }) => {
  const [formData, setFormData] = useState({ ProductName: '', ProductBrand: '', ProductSize: '', ProductUnitID: '' });
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { settings } = useSettings();

  const validate = () => {
    const newErrors = {};
    if (!formData.ProductName) newErrors.ProductName = 'Product name is required.';
    // Brand, Size, and Unit are now optional
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const loadUnits = async () => {
      const result = await db.query('SELECT * FROM ProductUnits ORDER BY ProductUnitType');
      setUnits(result.map(u => ({ value: u.ProductUnitID, label: `${u.ProductUnitType} (${u.ProductUnitDescription})` })));
    };
    
    if (isOpen) {
      loadUnits();
      if (productToEdit) {
        setFormData({ ...productToEdit });
      } else {
        setFormData({ ProductName: '', ProductBrand: '', ProductSize: '', ProductUnitID: '' });
      }
      setErrors({});
    }
  }, [isOpen, productToEdit]);

  const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    if (settings.modules.capitalizationProtection?.enabled) {
      if (name === 'ProductName') {
        value = value.toLowerCase();
      } else if (name === 'ProductBrand') {
        value = capitalizeWords(value);
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
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
        ProductUnitID: formData.ProductUnitID || null
      };

      let result;
      if (productToEdit) {
        await db.execute('UPDATE Products SET ProductName = ?, ProductBrand = ?, ProductSize = ?, ProductUnitID = ? WHERE ProductID = ?', [productData.ProductName, productData.ProductBrand, productData.ProductSize, productData.ProductUnitID, productToEdit.ProductID]);
        result = { lastID: productToEdit.ProductID };
      } else {
        result = await db.execute('INSERT INTO Products (ProductName, ProductBrand, ProductSize, ProductUnitID) VALUES (?, ?, ?, ?)', [productData.ProductName, productData.ProductBrand, productData.ProductSize, productData.ProductUnitID]);
      }
      
      if (shouldSelect && onSaveAndSelect) {
        onSaveAndSelect(result.lastID);
      } else {
        onSave();
      }
      onClose();
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setErrors({ form: 'This product (Name + Brand + Size) already exists.' });
      } else {
        setErrors({ form: err.message || 'Failed to save product' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave(false);
  };

  return (
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
          <Button onClick={handleSubmit} loading={loading}>Save</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{errors.form}</div>}
        <Input label="Product Name" name="ProductName" value={formData.ProductName} onChange={handleChange} placeholder="e.g. gouda cheese" error={errors.ProductName} />
        
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 bg-white dark:bg-gray-800 text-sm text-gray-500">Optional Details</span>
          </div>
        </div>

        <Input label="Brand" name="ProductBrand" value={formData.ProductBrand} onChange={handleChange} placeholder="e.g. Old Amsterdam" error={errors.ProductBrand} />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Size
            </label>
            <div className="relative flex items-center shadow-sm rounded-lg">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, ProductSize: Math.max(0, (parseFloat(prev.ProductSize) || 0) - 1) }))}
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 rounded-l-lg text-sm px-3 focus:outline-none h-10 transition-colors"
              >
                <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"/></svg>
              </button>
              <input
                type="number"
                name="ProductSize"
                value={formData.ProductSize}
                onChange={handleChange}
                className="border-x-0 h-10 text-center w-full bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 py-2.5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0 focus:border-gray-300 dark:focus:border-gray-700"
                placeholder="0"
              />
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, ProductSize: (parseFloat(prev.ProductSize) || 0) + 1 }))}
                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:ring-2 focus:ring-accent font-medium leading-5 rounded-r-lg text-sm px-3 focus:outline-none h-10 transition-colors"
              >
                <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7V5"/></svg>
              </button>
            </div>
            {errors.ProductSize && <p className="mt-1 text-xs text-danger">{errors.ProductSize}</p>}
          </div>
          <Select label="Unit" name="ProductUnitID" value={formData.ProductUnitID} onChange={handleChange} options={units} placeholder="Select Unit" error={errors.ProductUnitID} />
        </div>
      </form>
    </Modal>
  );
};

export default ProductModal;
