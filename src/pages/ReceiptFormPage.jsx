import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import DatePicker from '../components/ui/DatePicker';
import ProductSelector from '../components/products/ProductSelector';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/solid';
import { nanoid } from 'nanoid';

const ReceiptFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [stores, setStores] = useState([]);
  const [formData, setFormData] = useState({ storeId: '', receiptDate: new Date(), note: '' });
  const [lineItems, setLineItems] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.storeId) newErrors.storeId = 'Store is required.';
    if (!formData.receiptDate) newErrors.receiptDate = 'Date is required.';
    if (lineItems.length === 0) newErrors.lineItems = 'At least one line item is required.';
    
    lineItems.forEach(item => {
      if (item.LineQuantity <= 0) newErrors[`qty_${item.key}`] = 'Must be > 0';
      if (item.LineUnitPrice < 0) newErrors[`price_${item.key}`] = 'Cannot be negative';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const storeData = await db.query('SELECT StoreID, StoreName FROM Stores WHERE StoreIsActive = 1 ORDER BY StoreName');
      setStores(storeData.map(s => ({ value: s.StoreID, label: s.StoreName })));

      if (isEditing) {
        const receiptData = await db.queryOne('SELECT * FROM Receipts WHERE ReceiptID = ?', [id]);
        if (receiptData) {
          setFormData({
            storeId: receiptData.StoreID,
            receiptDate: parseISO(receiptData.ReceiptDate),
            note: receiptData.ReceiptNote || '',
          });
          const lineItemData = await db.query('SELECT li.*, p.ProductName, p.ProductBrand FROM LineItems li JOIN Products p ON li.ProductID = p.ProductID WHERE li.ReceiptID = ?', [id]);
          setLineItems(lineItemData.map(li => ({ ...li, key: nanoid() })));
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, isEditing]);

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDateChange = (date) => setFormData(prev => ({ ...prev, receiptDate: date }));

  const handleProductSelect = (product) => {
    setLineItems(prev => [...prev, { key: nanoid(), ProductID: product.ProductID, ProductName: product.ProductName, ProductBrand: product.ProductBrand, LineQuantity: 1, LineUnitPrice: 0.00 }]);
    setIsProductSelectorOpen(false);
  };

  const handleLineItemChange = (key, field, value) => {
    setLineItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
  };

  const removeLineItem = (key) => setLineItems(prev => prev.filter(item => item.key !== key));
  const calculateTotal = () => lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0).toFixed(2);

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let currentReceiptId = id;
      if (isEditing) {
        await db.execute('UPDATE Receipts SET StoreID = ?, ReceiptDate = ?, ReceiptNote = ? WHERE ReceiptID = ?', [formData.storeId, format(formData.receiptDate, 'yyyy-MM-dd'), formData.note, id]);
      } else {
        const result = await db.execute('INSERT INTO Receipts (StoreID, ReceiptDate, ReceiptNote) VALUES (?, ?, ?)', [formData.storeId, format(formData.receiptDate, 'yyyy-MM-dd'), formData.note]);
        currentReceiptId = result.lastID;
      }

      await db.execute('DELETE FROM LineItems WHERE ReceiptID = ?', [currentReceiptId]);
      for (const item of lineItems) {
        await db.execute('INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice) VALUES (?, ?, ?, ?)', [currentReceiptId, item.ProductID, item.LineQuantity, item.LineUnitPrice]);
      }
      
      // Use replace: true to ensure back button goes to Receipts list, not back to Edit form
      navigate(`/receipts/view/${currentReceiptId}`, { replace: true });
    } catch (error) {
      console.error("Failed to save receipt:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><p>Loading form...</p></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold">{isEditing ? 'Edit Receipt' : 'Create New Receipt'}</h1>
      
      <Card>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select label="Store" name="storeId" value={formData.storeId} onChange={handleFormChange} options={stores} placeholder="Select a store" error={errors.storeId} />
          <DatePicker label="Receipt Date" selected={formData.receiptDate} onChange={handleDateChange} error={errors.receiptDate} />
          <div className="md:col-span-2"><Input label="Note (Optional)" name="note" value={formData.note} onChange={handleFormChange} placeholder="e.g., Weekly groceries" /></div>
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold">Line Items</h2>
            {errors.lineItems && <p className="text-sm text-danger">{errors.lineItems}</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr><th className="p-2">Product</th><th className="p-2 w-24">Qty</th><th className="p-2 w-32">Unit Price (€)</th><th className="p-2 w-32 text-right">Total (€)</th><th className="p-2 w-12"></th></tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.key} className="border-b dark:border-gray-800">
                    <td className="p-2"><p className="font-medium">{item.ProductName}</p><p className="text-xs text-gray-500">{item.ProductBrand}</p></td>
                    <td className="p-2"><Input type="number" value={item.LineQuantity} onChange={(e) => handleLineItemChange(item.key, 'LineQuantity', parseFloat(e.target.value) || 0)} className="h-9" error={errors[`qty_${item.key}`]} /></td>
                    <td className="p-2"><Input type="number" value={item.LineUnitPrice} onChange={(e) => handleLineItemChange(item.key, 'LineUnitPrice', parseFloat(e.target.value) || 0)} className="h-9" error={errors[`price_${item.key}`]} /></td>
                    <td className="p-2 text-right font-medium">{(item.LineQuantity * item.LineUnitPrice).toFixed(2)}</td>
                    <td className="p-2 text-center"><Button variant="ghost" size="icon" onClick={() => removeLineItem(item.key)}><XMarkIcon className="h-4 w-4 text-danger" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="secondary" onClick={() => setIsProductSelectorOpen(true)}><PlusIcon className="h-4 w-4 mr-2" />Add Item</Button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 text-right font-bold text-lg rounded-b-xl">Total: €{calculateTotal()}</div>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving}>Save</Button>
      </div>

      <ProductSelector isOpen={isProductSelectorOpen} onClose={() => setIsProductSelectorOpen(false)} onSelect={handleProductSelect} />
    </div>
  );
};

export default ReceiptFormPage;
