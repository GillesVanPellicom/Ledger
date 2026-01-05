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
import { useSettings } from '../context/SettingsContext';

const ReceiptFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { settings } = useSettings();
  const paymentMethodsEnabled = settings.paymentMethods?.enabled;

  const [stores, setStores] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [formData, setFormData] = useState({ storeId: '', receiptDate: new Date(), note: '', paymentMethodId: '', paid: false });
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

      if (paymentMethodsEnabled) {
        const paymentMethodData = await db.query('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods ORDER BY PaymentMethodName');
        setPaymentMethods(paymentMethodData.map(pm => ({ value: pm.PaymentMethodID, label: pm.PaymentMethodName })));
      }

      if (isEditing) {
        const receiptData = await db.queryOne('SELECT * FROM Receipts WHERE ReceiptID = ?', [id]);
        if (receiptData) {
          setFormData({
            storeId: receiptData.StoreID,
            receiptDate: parseISO(receiptData.ReceiptDate),
            note: receiptData.ReceiptNote || '',
            paymentMethodId: receiptData.PaymentMethodID || '',
            paid: receiptData.Paid === 1,
          });
          const lineItemData = await db.query(`
            SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType
            FROM LineItems li
            JOIN Products p ON li.ProductID = p.ProductID
            JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
            WHERE li.ReceiptID = ?
          `, [id]);
          setLineItems(lineItemData.map(li => ({ ...li, key: nanoid() })));
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, isEditing, paymentMethodsEnabled]);

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDateChange = (date) => setFormData(prev => ({ ...prev, receiptDate: date }));
  const handleCheckboxChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.checked }));

  const handleProductSelect = (product) => {
    setLineItems(prev => [...prev, { 
      key: nanoid(), 
      ProductID: product.ProductID, 
      ProductName: product.ProductName, 
      ProductBrand: product.ProductBrand,
      ProductSize: product.ProductSize,
      ProductUnitType: product.ProductUnitType,
      LineQuantity: 1, 
      LineUnitPrice: 0.00 
    }]);
    setIsProductSelectorOpen(false);
  };

  const handleLineItemChange = (key, field, value) => {
    let processedValue = value;
    if (field === 'LineQuantity') {
      processedValue = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'LineUnitPrice') {
      processedValue = Math.max(0, parseFloat(value) || 0);
    }
    setLineItems(prev => prev.map(item => item.key === key ? { ...item, [field]: processedValue } : item));
  };

  const removeLineItem = (key) => setLineItems(prev => prev.filter(item => item.key !== key));
  const calculateTotal = () => lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0);

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const totalAmount = calculateTotal();
    try {
      if (isEditing) {
        await db.execute('UPDATE Receipts SET StoreID = ?, ReceiptDate = ?, ReceiptNote = ?, PaymentMethodID = ? WHERE ReceiptID = ?', [formData.storeId, format(formData.receiptDate, 'yyyy-MM-dd'), formData.note, formData.paymentMethodId || null, id]);
        await db.execute('DELETE FROM LineItems WHERE ReceiptID = ?', [id]);
        for (const item of lineItems) {
          await db.execute('INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice) VALUES (?, ?, ?, ?)', [id, item.ProductID, item.LineQuantity, item.LineUnitPrice]);
        }
        navigate(-1); // Go back to the view page
      } else {
        const result = await db.execute('INSERT INTO Receipts (StoreID, ReceiptDate, ReceiptNote, PaymentMethodID) VALUES (?, ?, ?, ?)', [formData.storeId, format(formData.receiptDate, 'yyyy-MM-dd'), formData.note, formData.paymentMethodId || null]);
        const newId = result.lastID;
        for (const item of lineItems) {
          await db.execute('INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice) VALUES (?, ?, ?, ?)', [newId, item.ProductID, item.LineQuantity, item.LineUnitPrice]);
        }
        navigate(`/receipts/view/${newId}`, { replace: true });
      }
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
        <div className="p-6 grid grid-cols-2 gap-6">
          <div className="col-span-1"><Select label="Store" name="storeId" value={formData.storeId} onChange={handleFormChange} options={stores} placeholder="Select a store" error={errors.storeId} /></div>
          <div className="col-span-1"><DatePicker label="Receipt Date" selected={formData.receiptDate} onChange={handleDateChange} error={errors.receiptDate} /></div>
          <div className="col-span-2"><Input label="Note (Optional)" name="note" value={formData.note} onChange={handleFormChange} placeholder="e.g., Weekly groceries" /></div>
          {paymentMethodsEnabled && (
            <>
              <div className="col-span-1"><Select label="Payment Method" name="paymentMethodId" value={formData.paymentMethodId} onChange={handleFormChange} options={paymentMethods} placeholder="Select a method" /></div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold">Items</h2>
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
                    <td className="p-2">
                      <p className="font-medium">{item.ProductName} - {item.ProductSize}{item.ProductUnitType}</p>
                      <p className="text-xs text-gray-500">{item.ProductBrand}</p>
                    </td>
                    <td className="p-2"><Input type="number" value={item.LineQuantity} onChange={(e) => handleLineItemChange(item.key, 'LineQuantity', e.target.value)} className="h-9" error={errors[`qty_${item.key}`]} min="0" /></td>
                    <td className="p-2"><Input type="number" value={item.LineUnitPrice} onChange={(e) => handleLineItemChange(item.key, 'LineUnitPrice', e.target.value)} className="h-9" error={errors[`price_${item.key}`]} min="0" /></td>
                    <td className="p-2 text-right font-medium">{(item.LineQuantity * item.LineUnitPrice).toFixed(2)}</td>
                    <td className="p-2 text-center"><Button variant="ghost" size="icon" onClick={() => removeLineItem(item.key)}><XMarkIcon className="h-4 w-4 text-danger" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="secondary" onClick={() => setIsProductSelectorOpen(true)}><PlusIcon className="h-4 w-4 mr-2" />Add Item</Button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 text-right font-bold text-lg rounded-b-xl">Total: €{calculateTotal().toFixed(2)}</div>
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
