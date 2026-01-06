import React, { useState, useEffect, useMemo } from 'react';
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
import { useBackupContext } from '../context/BackupContext';

const ReceiptFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { settings } = useSettings();
  const { incrementEdits } = useBackupContext();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;

  const [stores, setStores] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [debtors, setDebtors] = useState([]);
  const [formData, setFormData] = useState({ 
    storeId: '', 
    receiptDate: new Date(), 
    note: '', 
    paymentMethodId: '1', 
    ownShares: 0,
    status: 'paid',
    owedToDebtorId: null,
  });
  const [lineItems, setLineItems] = useState([]);
  const [images, setImages] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const [splitType, setSplitType] = useState('none');
  const [receiptSplits, setReceiptSplits] = useState([]);
  const [selectedLineItems, setSelectedLineItems] = useState([]);
  const [lastSelectedLineItemIndex, setLastSelectedLineItemIndex] = useState(null);
  const [paidDebtorIds, setPaidDebtorIds] = useState([]);
  const [splitTypeChangeModal, setSplitTypeChangeModal] = useState({ isOpen: false, newType: null });

  const hasSettledDebts = useMemo(() => paidDebtorIds.length > 0, [paidDebtorIds]);

  const validate = () => {
    const newErrors = {};
    if (!formData.storeId) newErrors.storeId = 'Store is required.';
    if (!formData.receiptDate) newErrors.receiptDate = 'Date is required.';
    if (formData.status === 'unpaid' && !formData.owedToDebtorId) newErrors.owedToDebtorId = 'Owed to is required.';
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
          setFormData(prev => ({
            ...prev,
            storeId: receiptData.StoreID,
            receiptDate: parseISO(receiptData.ReceiptDate),
            note: receiptData.ReceiptNote || '',
            paymentMethodId: receiptData.PaymentMethodID,
            ownShares: receiptData.OwnShares || 0,
            status: receiptData.Status || 'paid',
            owedToDebtorId: receiptData.OwedToDebtorID,
          }));
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

  const totalShares = useMemo(() => {
    const debtorShares = receiptSplits.reduce((acc, curr) => acc + parseInt(curr.SplitPart || 0), 0);
    const ownShares = parseInt(formData.ownShares) || 0;
    return debtorShares + ownShares;
  }, [receiptSplits, formData.ownShares]);

  const debtSummary = useMemo(() => {
    if (!debtEnabled) return { debtors: [], self: null };
    
    const summary = {};
    const totalAmount = lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0);
    let selfAmount = null;

    if (splitType === 'total_split' && totalShares > 0) {
      receiptSplits.forEach(split => {
        const amount = (totalAmount * parseInt(split.SplitPart || 0)) / totalShares;
        summary[split.DebtorName] = (summary[split.DebtorName] || 0) + amount;
      });
      if (formData.ownShares > 0) {
        selfAmount = (totalAmount * parseInt(formData.ownShares)) / totalShares;
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

    return { 
      debtors: Object.entries(summary).map(([name, amount]) => ({ name, amount })),
      self: selfAmount
    };
  }, [lineItems, receiptSplits, splitType, debtEnabled, debtors, totalShares, formData.ownShares]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'status') {
      setFormData(prev => ({
        ...prev,
        paymentMethodId: value === 'paid' ? '1' : null,
        owedToDebtorId: value === 'unpaid' ? prev.owedToDebtorId : null,
      }));
    }
  };
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

  const handleSplitTypeChange = (newType) => {
    if (hasSettledDebts) return;
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
    if (!debtorId || hasSettledDebts) return;
    const debtor = debtors.find(d => d.DebtorID === parseInt(debtorId));
    if (debtor) {
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
    if (splitType !== 'line_item' || hasSettledDebts) return;

    let newSelected = [...selectedLineItems];
    
    if (event.shiftKey && lastSelectedLineItemIndex !== null) {
      const start = Math.min(lastSelectedLineItemIndex, index);
      const end = Math.max(lastSelectedLineItemIndex, index);
      for (let i = start; i <= end; i++) {
        if (!newSelected.includes(i)) newSelected.push(i);
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
    if (debtorId === '_placeholder_' || hasSettledDebts) return;
    const debtorName = debtorId && debtorId !== '_clear_' ? debtors.find(d => d.DebtorID === parseInt(debtorId))?.DebtorName : null;
    
    const updatedLineItems = [...lineItems];
    selectedLineItems.forEach(idx => {
      updatedLineItems[idx] = { 
        ...updatedLineItems[idx], 
        DebtorID: debtorId && debtorId !== '_clear_' ? parseInt(debtorId) : null, 
        DebtorName: debtorName 
      };
    });
    setLineItems(updatedLineItems);
    setSelectedLineItems([]);
    setLastSelectedLineItemIndex(null);
  };

  const handleRemoveDebtorFromItem = (index) => {
    if (hasSettledDebts) return;
    const updatedLineItems = [...lineItems];
    updatedLineItems[index] = { ...updatedLineItems[index], DebtorID: null, DebtorName: null };
    setLineItems(updatedLineItems);
  };

  const handleRemoveDebtorFromReceipt = (debtorName) => {
    if (hasSettledDebts) return;
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
  
      const receiptPayload = {
        StoreID: formData.storeId,
        ReceiptDate: format(formData.receiptDate, 'yyyy-MM-dd'),
        ReceiptNote: formData.note,
        PaymentMethodID: formData.status === 'paid' ? formData.paymentMethodId : null,
        SplitType: splitType,
        OwnShares: splitType === 'total_split' ? (formData.ownShares || 0) : null,
        TotalShares: splitType === 'total_split' ? totalShares : null,
        Status: formData.status,
        OwedToDebtorID: formData.status === 'unpaid' ? formData.owedToDebtorId : null,
      };

      if (isEditing) {
        await db.execute(
          `UPDATE Receipts SET 
            StoreID = ?, ReceiptDate = ?, ReceiptNote = ?, PaymentMethodID = ?, 
            SplitType = ?, OwnShares = ?, TotalShares = ?, Status = ?, OwedToDebtorID = ? 
           WHERE ReceiptID = ?`, 
          [...Object.values(receiptPayload), id]
        );
        
        await db.execute('DELETE FROM LineItems WHERE ReceiptID = ?', [id]);
        await db.execute('DELETE FROM ReceiptSplits WHERE ReceiptID = ?', [id]);
        
        const existingImages = await db.query('SELECT ImagePath FROM ReceiptImages WHERE ReceiptID = ?', [id]);
        const imagesToKeep = images.filter(img => !img.file).map(img => img.ImagePath);
        const imagesToDelete = existingImages.filter(img => !imagesToKeep.includes(img.ImagePath));
        if (imagesToDelete.length > 0) {
          const placeholders = imagesToDelete.map(() => '?').join(',');
          await db.execute(`DELETE FROM ReceiptImages WHERE ReceiptID = ? AND ImagePath IN (${placeholders})`, [id, ...imagesToDelete.map(i => i.ImagePath)]);
        }
        
        receiptId = id;
      } else {
        const result = await db.execute(
          `INSERT INTO Receipts 
            (StoreID, ReceiptDate, ReceiptNote, PaymentMethodID, SplitType, OwnShares, TotalShares, Status, OwedToDebtorID) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          Object.values(receiptPayload)
        );
        receiptId = result.lastID;
      }
  
      for (const item of lineItems) {
        await db.execute('INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice, DebtorID) VALUES (?, ?, ?, ?, ?)', [receiptId, item.ProductID, item.LineQuantity, item.LineUnitPrice, item.DebtorID || null]);
      }
  
      if (splitType === 'total_split') {
        for (const split of receiptSplits) {
          await db.execute('INSERT INTO ReceiptSplits (ReceiptID, DebtorID, SplitPart) VALUES (?, ?, ?)', [receiptId, split.DebtorID, split.SplitPart]);
        }
      }
  
      if (window.electronAPI && settings.datastore.folderPath) {
        const newImages = images.filter(img => img.file);
        for (const image of newImages) {
          const imagePathToSave = await window.electronAPI.saveImage(settings.datastore.folderPath, image.ImagePath);
          await db.execute('INSERT INTO ReceiptImages (ReceiptID, ImagePath) VALUES (?, ?)', [receiptId, imagePathToSave]);
        }
      }
      
      await incrementEdits();
  
      navigate(`/receipts/view/${receiptId}`, { replace: true });
    } catch (error) {
      console.error("Failed to save receipt:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><p>Loading form...</p></div>;

  const SplitTypeSelector = () => {
    const buttons = [
      { type: 'none', label: 'None' },
      { type: 'total_split', label: 'Split Total' },
      { type: 'line_item', label: 'Per Item' },
    ];

    const content = (
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {buttons.map(btn => (
          <button 
            key={btn.type}
            onClick={() => handleSplitTypeChange(btn.type)} 
            disabled={hasSettledDebts}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              splitType === btn.type 
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" 
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
              hasSettledDebts ? "opacity-50 cursor-not-allowed" : ""
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>
    );

    if (hasSettledDebts) {
      return (
        <Tooltip content="Cannot change split type when debts are settled.">
          {content}
        </Tooltip>
      );
    }
    return content;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold">{isEditing ? 'Edit Receipt' : 'Create New Receipt'}</h1>
      
      <Card>
        <div className="p-6 grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Type</label>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button onClick={() => handleFormChange({ target: { name: 'status', value: 'paid' }})} className={cn("flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors", formData.status === 'paid' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>Paid</button>
              <button onClick={() => handleFormChange({ target: { name: 'status', value: 'unpaid' }})} className={cn("flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors", formData.status === 'unpaid' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>Unpaid</button>
            </div>
          </div>
          <div className="col-span-1"><Select label="Store" name="storeId" value={formData.storeId} onChange={handleFormChange} options={stores} placeholder="Select a store" error={errors.storeId} /></div>
          <div className="col-span-1"><DatePicker label="Receipt Date" selected={formData.receiptDate} onChange={handleDateChange} error={errors.receiptDate} /></div>
          <div className="col-span-2"><Input label="Note (Optional)" name="note" value={formData.note} onChange={handleFormChange} placeholder="e.g., Weekly groceries" /></div>
          
          {formData.status === 'paid' && paymentMethodsEnabled && (
            <div className="col-span-2"><Select label="Payment Method" name="paymentMethodId" value={formData.paymentMethodId} onChange={handleFormChange} options={paymentMethods} placeholder="Select a method" /></div>
          )}
          {formData.status === 'unpaid' && (
            <div className="col-span-2"><Select label="Owed To" name="owedToDebtorId" value={formData.owedToDebtorId} onChange={handleFormChange} options={debtors.map(d => ({ value: d.DebtorID, label: d.DebtorName }))} placeholder="Select a person" error={errors.owedToDebtorId} /></div>
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
              <SplitTypeSelector />
            </div>

            {hasSettledDebts && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-sm rounded-lg flex items-center gap-2">
                <LockClosedIcon className="h-5 w-5" />
                <span>One or more debts on this receipt have been settled. Debt configuration is now locked.</span>
              </div>
            )}

            {splitType === 'total_split' && (
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                <div className="grid grid-cols-2 gap-4 items-end">
                  <Select 
                    label="Add Debtor"
                    value=""
                    onChange={(e) => { if (e.target.value) { handleAddSplit(e.target.value); } }}
                    options={[{ value: '', label: 'Choose...' }, ...debtors.filter(d => !receiptSplits.some(s => s.DebtorID === d.DebtorID)).map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
                    className="bg-white dark:bg-gray-800"
                    disabled={hasSettledDebts}
                  />
                  <Input 
                    label="Own Shares"
                    type="number"
                    name="ownShares"
                    value={formData.ownShares}
                    onChange={handleFormChange}
                    min="0"
                    disabled={hasSettledDebts}
                  />
                </div>
                <div className="space-y-2">
                  {receiptSplits.map(split => (
                    <div key={split.key} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <span className="font-medium">{split.DebtorName}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Shares:</span>
                          <input type="number" min="1" value={split.SplitPart} onChange={(e) => handleUpdateSplitPart(split.key, e.target.value)} className="w-16 rounded-md border-gray-300 dark:border-gray-700 text-sm" disabled={hasSettledDebts} />
                        </div>
                        {!hasSettledDebts && <button onClick={() => handleRemoveSplit(split.key)} className="text-red-500 hover:text-red-700"><XMarkIcon className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  ))}
                  {totalShares > 0 && <div className="text-sm text-gray-500 text-right mt-2">Total Shares: {totalShares}</div>}
                </div>
              </div>
            )}

            {splitType === 'line_item' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center justify-between">
                <p className="text-sm text-blue-700 dark:text-blue-300">Select items below to assign debtors. Settled debts cannot be changed.</p>
                <div className="flex items-center gap-2">
                  <div className="w-48">
                    <Select 
                      value="_placeholder_"
                      onChange={(e) => handleAssignDebtorToLineItems(e.target.value)}
                      options={[{ value: '_placeholder_', label: 'Assign to...' }, { value: '_clear_', label: '(Clear Assignment)' }, ...debtors.map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
                      disabled={selectedLineItems.length === 0 || hasSettledDebts}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{selectedLineItems.length} selected</span>
                </div>
              </div>
            )}

            {splitType !== 'none' && (debtSummary.debtors.length > 0 || debtSummary.self) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Debt</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {debtSummary.debtors.map((debtor) => (
                    <div key={debtor.name} className="w-full">
                      <div className="relative group p-2 rounded border text-sm w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <span className="text-gray-500 block">{debtor.name}</span>
                        <span className="font-bold">€{debtor.amount.toFixed(2)}</span>
                        {!hasSettledDebts && (
                          <button 
                            onClick={() => handleRemoveDebtorFromReceipt(debtor.name)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {debtSummary.self && (
                    <div className="w-full">
                      <div className="p-2 rounded border text-sm w-full bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                        <span className="text-blue-500 block">Self</span>
                        <span className="font-bold text-blue-800 dark:text-blue-200">€{debtSummary.self.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
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
                {lineItems.map((item, index) => (
                  <tr 
                    key={item.key} 
                    onClick={(e) => handleLineItemClick(index, e)}
                    className={cn(
                      "transition-colors border-b dark:border-gray-800",
                      splitType === 'line_item' && !hasSettledDebts ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : "",
                      selectedLineItems.includes(index) ? "bg-blue-50 dark:bg-blue-900/30" : "",
                      hasSettledDebts ? "bg-gray-50 dark:bg-gray-800/50" : ""
                    )}
                  >
                    <td className="p-2">
                      <p className="font-medium">{item.ProductName} - {item.ProductSize}{item.ProductUnitType}</p>
                      <p className="text-xs text-gray-500">{item.ProductBrand}</p>
                    </td>
                    <td className="p-2"><Input type="number" value={item.LineQuantity} onChange={(e) => handleLineItemChange(item.key, 'LineQuantity', e.target.value)} className="h-9" error={errors[`qty_${item.key}`]} min="0" disabled={hasSettledDebts} /></td>
                    <td className="p-2"><Input type="number" value={item.LineUnitPrice} onChange={(e) => handleLineItemChange(item.key, 'LineUnitPrice', e.target.value)} className="h-9" error={errors[`price_${item.key}`]} min="0" disabled={hasSettledDebts} /></td>
                    <td className="p-2 text-right font-medium">{(item.LineQuantity * item.LineUnitPrice).toFixed(2)}</td>
                    {debtEnabled && splitType === 'line_item' && (
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                        {item.DebtorName ? (
                          <div className="flex items-center justify-end gap-2 group">
                            <span>{item.DebtorName}</span>
                            {hasSettledDebts ? (
                              <LockClosedIcon className="h-4 w-4 text-gray-400" />
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
                    <td className="p-2 text-center">
                      {!hasSettledDebts && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeLineItem(item.key); }}><XMarkIcon className="h-4 w-4 text-danger" /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="secondary" onClick={() => setIsProductSelectorOpen(true)} disabled={hasSettledDebts}><PlusIcon className="h-4 w-4 mr-2" />Add Item</Button>
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
