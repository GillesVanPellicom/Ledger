import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { db } from '../../utils/db';

const ProductModal = ({ isOpen, onClose, productToEdit, onSave }) => {
  const [formData, setFormData] = useState({ ProductName: '', ProductBrand: '', ProductSize: '', ProductUnitID: '' });
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.ProductName) newErrors.ProductName = 'Product name is required.';
    if (!formData.ProductBrand) newErrors.ProductBrand = 'Brand is required.';
    if (!formData.ProductSize || formData.ProductSize <= 0) newErrors.ProductSize = 'Size must be > 0.';
    if (!formData.ProductUnitID) newErrors.ProductUnitID = 'Unit is required.';
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
    
    if (name === 'ProductName') {
      value = value.toLowerCase();
    } else if (name === 'ProductBrand') {
      value = capitalizeWords(value);
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (productToEdit) {
        await db.execute('UPDATE Products SET ProductName = ?, ProductBrand = ?, ProductSize = ?, ProductUnitID = ? WHERE ProductID = ?', [formData.ProductName, formData.ProductBrand, formData.ProductSize, formData.ProductUnitID, productToEdit.ProductID]);
      } else {
        await db.execute('INSERT INTO Products (ProductName, ProductBrand, ProductSize, ProductUnitID) VALUES (?, ?, ?, ?)', [formData.ProductName, formData.ProductBrand, formData.ProductSize, formData.ProductUnitID]);
      }
      onSave();
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? "Edit Product" : "Add New Product"}
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{errors.form}</div>}
        <Input label="Product Name" name="ProductName" value={formData.ProductName} onChange={handleChange} placeholder="e.g. gouda cheese" error={errors.ProductName} />
        <Input label="Brand" name="ProductBrand" value={formData.ProductBrand} onChange={handleChange} placeholder="e.g. Old Amsterdam" error={errors.ProductBrand} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Size" name="ProductSize" type="number" value={formData.ProductSize} onChange={handleChange} placeholder="e.g. 500" error={errors.ProductSize} />
          <Select label="Unit" name="ProductUnitID" value={formData.ProductUnitID} onChange={handleChange} options={units} placeholder="Select Unit" error={errors.ProductUnitID} />
        </div>
      </form>
    </Modal>
  );
};

export default ProductModal;
