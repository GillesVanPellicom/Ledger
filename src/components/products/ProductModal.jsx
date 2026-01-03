import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { db } from '../../utils/db';

const ProductModal = ({ isOpen, onClose, productToEdit, onSave }) => {
  const [formData, setFormData] = useState({
    ProductName: '',
    ProductBrand: '',
    ProductSize: '',
    ProductUnitID: '',
  });
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load units
    const loadUnits = async () => {
      const result = await db.query('SELECT * FROM ProductUnits ORDER BY ProductUnitType');
      setUnits(result.map(u => ({ 
        value: u.ProductUnitID, 
        label: `${u.ProductUnitType} (${u.ProductUnitDescription})` 
      })));
    };
    
    if (isOpen) {
      loadUnits();
      if (productToEdit) {
        setFormData({
          ProductName: productToEdit.ProductName,
          ProductBrand: productToEdit.ProductBrand,
          ProductSize: productToEdit.ProductSize,
          ProductUnitID: productToEdit.ProductUnitID,
        });
      } else {
        setFormData({
          ProductName: '',
          ProductBrand: '',
          ProductSize: '',
          ProductUnitID: '',
        });
      }
      setError('');
    }
  }, [isOpen, productToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.ProductName || !formData.ProductBrand || !formData.ProductSize || !formData.ProductUnitID) {
        throw new Error("All fields are required");
      }

      if (productToEdit) {
        // Update
        await db.execute(
          `UPDATE Products 
           SET ProductName = ?, ProductBrand = ?, ProductSize = ?, ProductUnitID = ? 
           WHERE ProductID = ?`,
          [formData.ProductName, formData.ProductBrand, formData.ProductSize, formData.ProductUnitID, productToEdit.ProductID]
        );
      } else {
        // Insert
        await db.execute(
          `INSERT INTO Products (ProductName, ProductBrand, ProductSize, ProductUnitID) 
           VALUES (?, ?, ?, ?)`,
          [formData.ProductName, formData.ProductBrand, formData.ProductSize, formData.ProductUnitID]
        );
      }
      
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      // Check for unique constraint violation
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        setError('This product (Name + Brand + Size) already exists.');
      } else {
        setError(err.message || 'Failed to save product');
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
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Save Product
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}
        
        <Input
          label="Product Name"
          name="ProductName"
          value={formData.ProductName}
          onChange={handleChange}
          placeholder="e.g. Gouda Cheese"
          required
        />
        
        <Input
          label="Brand"
          name="ProductBrand"
          value={formData.ProductBrand}
          onChange={handleChange}
          placeholder="e.g. Old Amsterdam"
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Size"
            name="ProductSize"
            type="number"
            value={formData.ProductSize}
            onChange={handleChange}
            placeholder="e.g. 500"
            required
          />
          
          <Select
            label="Unit"
            name="ProductUnitID"
            value={formData.ProductUnitID}
            onChange={handleChange}
            options={units}
            placeholder="Select Unit"
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default ProductModal;
