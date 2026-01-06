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
import { XMarkIcon, PlusIcon, PhotoIcon, UserGroupIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import { nanoid } from 'nanoid';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../utils/cn';
import Tooltip from '../components/ui/Tooltip';
import { ConfirmModal } from '../components/ui/Modal';

const ReceiptFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { settings } = useSettings();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;

  const [stores, setStores] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [formData, setFormData] = useState({ storeId: '', receiptDate: new Date(), note: '', paymentMethodId: '1' });
  const [lineItems, setLineItems] = useState([]);
  const [images, setImages] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [errors, setErrors] = useState({});

  // Debt state
  const [splitType, setSplitType] = useState('none');
  const [receiptSplits, setReceiptSplits] = useState([]);
  const [selectedLineItems, setSelectedLineItems] = useState([]);
  const [lastSelectedLineItemIndex, setLastSelectedLineItemIndex] = useState(null);
  const [debtSummary, setDebtSummary] = useState([]);
  const [paidDebtorIds, setPaidDebtorIds] = useState([]);
  const [splitTypeChangeModal, setSplitTypeChangeModal] = useState({ isOpen: false, newType: null });

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

      if (debtEnabled) {
        const debtorsData = await db.query('SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsActive = 1 ORDER BY DebtorName');
        setDebtors(debtorsData);
      }

      if (isEditing) {
        const receiptData = await db.queryOne('SELECT * FROM Receipts WHERE ReceiptID = ?', [id]);
        if (receiptData) {
          setFormData({
            storeId: receiptData.StoreID,
            receiptDate: parseISO(receiptData.ReceiptDate),
            note: receiptData.ReceiptNote || '',
            paymentMethodId: receiptData.PaymentMethodID || '1',
          });
          setSplitType(receiptData.SplitType || 'none');

          const lineItemData = await db.query(`
            SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorName
            FROM LineItems li
            JOIN Products p ON li.ProductID = p.ProductID
            JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
            LEFT JOIN Debtors d ON li.DebtorID = d.DebtorID
            WHERE li.ReceiptID = ?
          `, [id]);
          setLineItems(lineItemData.map(li => ({ ...li, key: nanoid() })));

          const imageData = await db.query('SELECT * FROM ReceiptImages WHERE ReceiptID = ?', [id]);
          setImages(imageData.map(img => ({ ...img, key: nanoid() })));

          if (debtEnabled) {
            const paymentsData = await db.query('SELECT DebtorID FROM ReceiptDebtorPayments WHERE ReceiptID = ?', [id]);
            setPaidDebtorIds(paymentsData.map(p => p.DebtorID));

            if (receiptData.SplitType === 'total_split') {
              const splitsData = await db.query(`
                SELECT rs.*, d.DebtorName 
                FROM ReceiptSplits rs
                JOIN Debtors d ON rs.DebtorID = d.DebtorID
                WHERE rs.ReceiptID = ?
              `, [id]);
              setReceiptSplits(splitsData.map(s => ({ ...s, key: nanoid() })));
            }
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, isEditing, paymentMethodsEnabled, debtEnabled]);

  useEffect(() => {
    if (!debtEnabled) return;

    const calculateDebtSummary = () => {
      const summary = {};
      const totalAmount = lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0);

      if (splitType === 'total_split' && receiptSplits.length > 0) {
        const totalParts = receiptSplits.reduce((acc, curr) => acc + parseInt(curr.SplitPart || 0), 0);
        if (totalParts > 0) {
          receiptSplits.forEach(split => {
            const amount = (totalAmount * parseInt(split.SplitPart || 0)) / totalParts;
            summary[split.DebtorName] = (summary[split.DebtorName] || 0) + amount;
          });
        }
      } else if (splitType === 'line_item') {
        lineItems.forEach(item => {
          if (item.DebtorID) {
            const debtorName = item.DebtorName || debtors.find(d => d.DebtorID === parseInt(item.DebtorID))?.DebtorName;
            if (debtorName) {
              const amount = item.LineQuantity * item.LineUnitPrice;
              summary[debtorName] = (summary[debtorName] || 0) + amount;
            }
          }
        });
      }

      setDebtSummary(Object.entries(summary).map(([name, amount]) => ({ name, amount })));
    };

    calculateDebtSummary();
  }, [lineItems, receiptSplits, splitType, debtEnabled, debtors]);

  const handleFormChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleDateChange = (date) => setFormData(prev => ({ ...prev, receiptDate: date }));

  const handleProductSelect = (product) => {
    setLineItems(prev => [...prev, { 
      key: nanoid(), 
      ProductID: product.ProductID, 
      ProductName: product.ProductName, 
      ProductBrand: product.ProductBrand,
      ProductSize: product.ProductSize,
      ProductUnitType: product.ProductUnitType,
      LineQuantity: 1, 
      LineUnitPrice: 0.00,
      DebtorID: null
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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      key: nanoid(),
      ImagePath: file.path,
      file,
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (key) => {
    setImages(prev => prev.filter(img => img.key !== key));
  };

  const getImagePath = (image) => {
    if (image.file) {
      return URL.createObjectURL(image.file);
    }
    if (window.electronAPI) {
      return `local-file://${settings.datastore.folderPath}/receipt_images/${image.ImagePath}`;
    }
    return image.ImagePath;
  };

  // Debt Handlers
  const handleSplitTypeChange = (newType) => {
    const hasUnsavedDebt = (splitType === 'total_split' && receiptSplits.length > 0) || (splitType === 'line_item' && lineItems.some(li => li.DebtorID));
    if (hasUnsavedDebt && newType !== splitType) {
      setSplitTypeChangeModal({ isOpen: true, newType });
    } else {
      setSplitType(newType);
    }
  };

  const confirmSplitTypeChange = () => {
    const { newType } = splitTypeChangeModal;
    setSplitType(newType);
    if (newType !== 'total_split') setReceiptSplits([]);
    if (newType !== 'line_item') setLineItems(prev => prev.map(item => ({ ...item, DebtorID: null, DebtorName: null })));
    setSplitTypeChangeModal({ isOpen: false, newType: null });
  };

  const handleAddSplit = (debtorId) => {
    if (!debtorId) return;
    const debtor = debtors.find(d => d.DebtorID === parseInt(debtorId));
    if (debtor && !paidDebtorIds.includes(debtor.DebtorID)) {
      setReceiptSplits(prev => [...prev, { key: nanoid(), DebtorID: debtor.DebtorID, DebtorName: debtor.DebtorName, SplitPart: 1 }]);
    }
  };

  const handleUpdateSplitPart = (key, newPart) => {
    setReceiptSplits(prev => prev.map(s => s.key === key ? { ...s, SplitPart: parseInt(newPart) || 1 } : s));
  };

  const handleRemoveSplit = (key) => {
    setReceiptSplits(prev => prev.filter(s => s.key !== key));
  };

  const handleLineItemClick = (index, event) => {
    if (splitType !== 'line_item' || paidDebtorIds.includes(lineItems[index].DebtorID)) return;

    let newSelected = [...selectedLineItems];
    
    if (event.shiftKey && lastSelectedLineItemIndex !== null) {
      const start = Math.min(lastSelectedLineItemIndex, index);
      const end = Math.max(lastSelectedLineItemIndex, index);
      for (let i = start; i <= end; i++) {
        if (!newSelected.includes(i) && !paidDebtorIds.includes(lineItems[i].DebtorID)) newSelected.push(i);
      }
    } else if (event.ctrlKey || event.metaKey) {
      if (newSelected.includes(index)) {
        newSelected = newSelected.filter(i => i !== index);
      } else {
        newSelected.push(index);
      }
      setLastSelectedLineItemIndex(index);
    } else {
      if (newSelected.includes(index) && newSelected.length === 1) {
          newSelected = [];
          setLastSelectedLineItemIndex(null);
      } else {
          newSelected = [index];
          setLastSelectedLineItemIndex(index);
      }
    }
    
    setSelectedLineItems(newSelected);
  };

  const handleAssignDebtorToLineItems = (debtorId) => {
    const debtorName = debtorId ? debtors.find(d => d.DebtorID === parseInt(debtorId))?.DebtorName : null;
    
    const updatedLineItems = [...lineItems];
    selectedLineItems.forEach(idx => {
      updatedLineItems[idx] = { 
        ...updatedLineItems[idx], 
        DebtorID: debtorId ? parseInt(debtorId) : null, 
        DebtorName: debtorName 
      };
    });
    setLineItems(updatedLineItems);
    setSelectedLineItems([]);
    setLastSelectedLineItemIndex(null);
  };

  const handleRemoveDebtorFromItem = (index) => {
    const updatedLineItems = [...lineItems];
    updatedLineItems[index] = { ...updatedLineItems[index], DebtorID: null, DebtorName: null };
    setLineItems(updatedLineItems);
  };

  const handleRemoveDebtorFromReceipt = (debtorName) => {
    const debtor = debtors.find(d => d.DebtorName === debtorName);
    if (paidDebtorIds.includes(debtor?.DebtorID)) return;

    if (splitType === 'total_split') {
      setReceiptSplits(prev => prev.filter(s => s.DebtorName !== debtorName));
    } else if (splitType === 'line_item') {
      setLineItems(prev => prev.map(item => item.DebtorName === debtorName ? { ...item, DebtorID: null, DebtorName: null } : item));
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let receiptId = id;
      if (isEditing) {
        await db.execute('UPDATE Receipts SET StoreID = ?, ReceiptDate = ?, ReceiptNote = ?, PaymentMethodID = ?, SplitType = ? WHERE ReceiptID = ?', [formData.storeId, format(formData.receiptDate, 'yyyy-MM-dd'), formData.note, formData.paymentMethodId, splitType, id]);
        
        const lineItemsToDelete = await db.query('SELECT LineItemID FROM LineItems WHERE ReceiptID = ? AND DebtorID NOT IN (SELECT DebtorID FROM ReceiptDebtorPayments WHERE ReceiptID = ?)', [id, id]);
        if (lineItemsToDelete.length > 0) {
          const placeholders = lineItemsToDelete.map(() => '?').join(',');
          await db.execute(`DELETE FROM LineItems WHERE LineItemID IN (${placeholders})`, lineItemsToDelete.map(li => li.LineItemID));
        }
        
        await db.execute('DELETE FROM ReceiptSplits WHERE ReceiptID = ? AND DebtorID NOT IN (SELECT DebtorID FROM ReceiptDebtorPayments WHERE ReceiptID = ?)', [id, id]);
        
        // This assumes we don't want to delete images on edit, just add new ones.
        // If we need to sync (delete removed), we'd need more complex logic.
      } else {
        const result = await db.execute('INSERT INTO Receipts (StoreID, ReceiptDate, ReceiptNote, PaymentMethodID, SplitType) VALUES (?, ?, ?, ?, ?)', [formData.storeId, format(formData.receiptDate, 'yyyy-MM-dd'), formData.note, formData.paymentMethodId, splitType]);
        receiptId = result.lastID;
      }

      for (const item of lineItems.filter(li => !li.LineItemID)) { // Only insert new items
        await db.execute('INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice, DebtorID) VALUES (?, ?, ?, ?, ?)', [receiptId, item.ProductID, item.LineQuantity, item.LineUnitPrice, item.DebtorID || null]);
      }

      if (splitType === 'total_split') {
        for (const split of receiptSplits.filter(s => !s.ReceiptSplitID)) { // Only insert new splits
          await db.execute('INSERT INTO ReceiptSplits (ReceiptID, DebtorID, SplitPart) VALUES (?, ?, ?)', [receiptId, split.DebtorID, split.SplitPart]);
        }
      }

      if (window.electronAPI && settings.datastore.folderPath) {
        for (const image of images) {
          if (image.file) {
            const newFileName = await window.electronAPI.saveImage(settings.datastore.folderPath, image.ImagePath);
            await db.execute('INSERT INTO ReceiptImages (ReceiptID, ImagePath) VALUES (?, ?)', [receiptId, newFileName]);
          } else if (!image.ReceiptImageID) { // Only insert new images that are not yet in DB
            await db.execute('INSERT INTO ReceiptImages (ReceiptID, ImagePath) VALUES (?, ?)', [receiptId, image.ImagePath]);
          }
        }
      }

      if (isEditing) {
        navigate(-1);
      } else {
        navigate(`/receipts/view/${receiptId}`, { replace: true });
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
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Images</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {images.map(image => (
              <div key={image.key} className="relative group">
                <img src={getImagePath(image)} alt="Receipt" className="w-full h-24 object-cover rounded-lg" />
                <button onClick={() => removeImage(image.key)} className="absolute top-1 right-1 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-gray-600 hover:border-gray-400 cursor-pointer">
              <PhotoIcon className="h-8 w-8" />
              <span className="text-xs mt-1">Add Images</span>
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
        </div>
      </Card>

      {debtEnabled && (
        <Card>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-6 w-6 text-accent" />
                <h2 className="text-lg font-semibold">Debt Management</h2>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button onClick={() => handleSplitTypeChange('none')} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", splitType === 'none' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>None</button>
                <button onClick={() => handleSplitTypeChange('total_split')} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", splitType === 'total_split' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>Split Total</button>
                <button onClick={() => handleSplitTypeChange('line_item')} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", splitType === 'line_item' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>Per Item</button>
              </div>
            </div>

            {splitType === 'total_split' && (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select 
                      value=""
                      onChange={(e) => { if (e.target.value) { handleAddSplit(e.target.value); } }}
                      options={[{ value: '', label: 'Add Debtor...' }, ...debtors.filter(d => !receiptSplits.some(s => s.DebtorID === d.DebtorID) && !paidDebtorIds.includes(d.DebtorID)).map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {receiptSplits.map(split => {
                    const isPaid = paidDebtorIds.includes(split.DebtorID);
                    return (
                      <div key={split.key} className={cn("flex items-center justify-between p-3 rounded-lg border", isPaid ? "bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700")}>
                        <span className="font-medium">{split.DebtorName}</span>
                        <div className="flex items-center gap-3">
                          {isPaid ? (
                            <Tooltip content="This debt has been settled and cannot be edited.">
                              <LockClosedIcon className="h-5 w-5 text-gray-400" />
                            </Tooltip>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Parts:</span>
                                <input type="number" min="1" value={split.SplitPart} onChange={(e) => handleUpdateSplitPart(split.key, e.target.value)} className="w-16 rounded-md border-gray-300 dark:border-gray-700 text-sm" />
                              </div>
                              <button onClick={() => handleRemoveSplit(split.key)} className="text-red-500 hover:text-red-700"><XMarkIcon className="h-4 w-4" /></button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {receiptSplits.length > 0 && <div className="text-sm text-gray-500 text-right mt-2">Total Parts: {receiptSplits.reduce((acc, curr) => acc + parseInt(curr.SplitPart || 0), 0)}</div>}
                </div>
              </div>
            )}

            {splitType === 'line_item' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center justify-between">
                <p className="text-sm text-blue-700 dark:text-blue-300">Select items below to assign debtors. Settled debts cannot be changed.</p>
                <div className="flex items-center gap-2">
                  <div className="w-48">
                    <Select 
                      value=""
                      onChange={(e) => handleAssignDebtorToLineItems(e.target.value)}
                      options={[{ value: '', label: 'Assign to...' }, { value: '', label: '(Clear Assignment)' }, ...debtors.filter(d => !paidDebtorIds.includes(d.DebtorID)).map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
                      disabled={selectedLineItems.length === 0}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{selectedLineItems.length} selected</span>
                </div>
              </div>
            )}

            {splitType !== 'none' && debtSummary.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Debt</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {debtSummary.map((debtor) => {
                    const isPaid = paidDebtorIds.includes(debtors.find(d => d.DebtorName === debtor.name)?.DebtorID);
                    return (
                      <div key={debtor.name} className={cn("relative group p-2 rounded border text-sm", isPaid ? "bg-gray-100 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700")}>
                        <span className="text-gray-500 block">{debtor.name}</span>
                        <span className="font-bold">€{debtor.amount.toFixed(2)}</span>
                        {!isPaid && (
                          <button 
                            onClick={() => handleRemoveDebtorFromReceipt(debtor.name)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold">Items</h2>
            {errors.lineItems && <p className="text-sm text-danger">{errors.lineItems}</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm select-none">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2 w-24">Qty</th>
                  <th className="p-2 w-32">Unit Price (€)</th>
                  <th className="p-2 w-32 text-right">Total (€)</th>
                  {debtEnabled && splitType === 'line_item' && <th className="p-2 w-32 text-right">Debtor</th>}
                  <th className="p-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {lineItems.map((item, index) => {
                  const isPaid = paidDebtorIds.includes(item.DebtorID);
                  return (
                    <tr 
                      key={item.key} 
                      onClick={(e) => handleLineItemClick(index, e)}
                      className={cn(
                        "transition-colors border-b dark:border-gray-800",
                        splitType === 'line_item' && !isPaid ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : "",
                        selectedLineItems.includes(index) ? "bg-blue-50 dark:bg-blue-900/30" : "",
                        isPaid ? "bg-gray-50 dark:bg-gray-800/50" : ""
                      )}
                    >
                      <td className="p-2">
                        <p className="font-medium">{item.ProductName} - {item.ProductSize}{item.ProductUnitType}</p>
                        <p className="text-xs text-gray-500">{item.ProductBrand}</p>
                      </td>
                      <td className="p-2"><Input type="number" value={item.LineQuantity} onChange={(e) => handleLineItemChange(item.key, 'LineQuantity', e.target.value)} className="h-9" error={errors[`qty_${item.key}`]} min="0" /></td>
                      <td className="p-2"><Input type="number" value={item.LineUnitPrice} onChange={(e) => handleLineItemChange(item.key, 'LineUnitPrice', e.target.value)} className="h-9" error={errors[`price_${item.key}`]} min="0" /></td>
                      <td className="p-2 text-right font-medium">{(item.LineQuantity * item.LineUnitPrice).toFixed(2)}</td>
                      {debtEnabled && splitType === 'line_item' && (
                        <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                          {item.DebtorName ? (
                            <div className="flex items-center justify-end gap-2 group">
                              <span>{item.DebtorName}</span>
                              {isPaid ? (
                                <Tooltip content="Settled debt cannot be changed.">
                                  <LockClosedIcon className="h-4 w-4 text-gray-400" />
                                </Tooltip>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRemoveDebtorFromItem(index); }}
                                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                      )}
                      <td className="p-2 text-center"><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeLineItem(item.key); }}><XMarkIcon className="h-4 w-4 text-danger" /></Button></td>
                    </tr>
                  );
                })}
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

      <ConfirmModal
        isOpen={splitTypeChangeModal.isOpen}
        onClose={() => setSplitTypeChangeModal({ isOpen: false, newType: null })}
        onConfirm={confirmSplitTypeChange}
        title="Discard Unsaved Debt?"
        message="You have unsaved debt assignments. Are you sure you want to discard them by changing the split type?"
      />
    </div>
  );
};

export default ReceiptFormPage;
