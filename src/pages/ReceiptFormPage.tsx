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
import { XMarkIcon, PlusIcon, PhotoIcon, ArrowPathIcon, InformationCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { nanoid } from 'nanoid';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../utils/cn';
import Tooltip from '../components/ui/Tooltip';
import { ConfirmModal } from '../components/ui/Modal';
import { useBackupContext } from '../context/BackupContext';
import LineItemSelectionModal from '../components/receipts/LineItemSelectionModal';
import StoreModal from '../components/stores/StoreModal';
import { Debtor, LineItem, ReceiptImage, ReceiptSplit, Store } from '../types';
import InfoCard from '../components/ui/InfoCard';
import '../electron.d';
import Spinner from '../components/ui/Spinner';
import { Header } from '../components/ui/Header';

const ReceiptFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { settings } = useSettings();
  const { incrementEdits } = useBackupContext();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;

  const [stores, setStores] = useState<{ value: number, label: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ value: number, label: string }[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [formData, setFormData] = useState({ 
    storeId: '', 
    receiptDate: new Date(), 
    note: '', 
    paymentMethodId: '1', 
    ownShares: 0,
    status: 'paid' as 'paid' | 'unpaid',
    owedToDebtorId: null as number | null,
    discount: 0,
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [images, setImages] = useState<ReceiptImage[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState<boolean>(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [receiptFormat, setReceiptFormat] = useState<'itemised' | 'item-less' | null>(null);
  const [formatChangeModal, setFormatChangeModal] = useState<{ isOpen: boolean, newFormat: 'itemised' | 'item-less' | null }>({ isOpen: false, newFormat: null });
  const [nonItemisedTotal, setNonItemisedTotal] = useState<number>(0);

  const [splitType, setSplitType] = useState<'none' | 'total_split' | 'line_item'>('none');
  const [receiptSplits, setReceiptSplits] = useState<ReceiptSplit[]>([]);
  const [paidDebtorIds, setPaidDebtorIds] = useState<number[]>([]);
  const [splitTypeChangeModal, setSplitTypeChangeModal] = useState<{ isOpen: boolean, newType: 'none' | 'total_split' | 'line_item' | null }>({ isOpen: false, newType: null });
  const [unpaidConfirmModalOpen, setUnpaidConfirmModalOpen] = useState<boolean>(false);
  const [isConcept, setIsConcept] = useState<boolean>(false);
  const [initialIsTentative, setInitialIsTentative] = useState<boolean>(false);
  const [excludedLineItemKeys, setExcludedLineItemKeys] = useState<Set<string>>(new Set());
  const [isExclusionMode, setIsExclusionMode] = useState<boolean>(false);
  const [exclusionConfirmModalOpen, setExclusionConfirmModalOpen] = useState<boolean>(false);
  const [selectionModal, setSelectionModal] = useState<{ isOpen: boolean, mode: 'debtor' | 'discount' | null }>({ isOpen: false, mode: null });

  const hasSettledDebts = useMemo(() => paidDebtorIds.length > 0, [paidDebtorIds]);
  const isUnpaid = formData.status === 'unpaid';
  const isDebtDisabled = hasSettledDebts || isUnpaid;

  const hasData = useMemo(() => {
    return lineItems.length > 0 ||
           nonItemisedTotal > 0 ||
           images.length > 0 ||
           formData.note.trim() !== '' ||
           receiptSplits.length > 0;
  }, [lineItems, nonItemisedTotal, images, formData.note, receiptSplits]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.storeId) newErrors.storeId = 'Store is required.';
    if (!formData.receiptDate) newErrors.receiptDate = 'Date is required.';
    if (formData.status === 'unpaid' && !formData.owedToDebtorId) newErrors.owedToDebtorId = 'Owed to is required.';
    if (receiptFormat === 'itemised' && lineItems.length === 0) newErrors.lineItems = 'At least one line item is required.';
    if (receiptFormat === 'item-less' && nonItemisedTotal <= 0) newErrors.nonItemisedTotal = 'Total must be greater than 0.';
    
    const discount = parseFloat(String(formData.discount));
    if (isNaN(discount) || discount < 0 || discount > 100) newErrors.discount = 'Must be 0-100.';

    if (receiptFormat === 'itemised') {
      lineItems.forEach(item => {
        if (parseFloat(String(item.LineQuantity)) <= 0) newErrors[`qty_${item.key}`] = 'Must be > 0';
        if (parseFloat(String(item.LineUnitPrice)) < 0) newErrors[`price_${item.key}`] = 'Cannot be negative';
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchStores = async () => {
    const storeData = await db.query<Store[]>('SELECT StoreID, StoreName FROM Stores WHERE StoreIsActive = 1 ORDER BY StoreName');
    setStores(storeData.map(s => ({ value: s.StoreID, label: s.StoreName })));
  };

  const handleStoreSave = async (newStoreId?: number) => {
    await fetchStores();
    if (newStoreId) {
      setFormData(prev => ({ ...prev, storeId: String(newStoreId) }));
    }
    setIsStoreModalOpen(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchStores();

      if (paymentMethodsEnabled) {
        const paymentMethodData = await db.query<{ PaymentMethodID: number, PaymentMethodName: string }[]>('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName');
        setPaymentMethods(paymentMethodData.map(pm => ({ value: pm.PaymentMethodID, label: pm.PaymentMethodName })));
      }

      if (debtEnabled) {
        const debtorsData = await db.query<Debtor[]>('SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsActive = 1 ORDER BY DebtorName');
        setDebtors(debtorsData);
      }

      if (isEditing) {
        const receiptData = await db.queryOne<any>('SELECT * FROM Receipts WHERE ReceiptID = ?', [id]);
        if (receiptData) {
          setInitialIsTentative(receiptData.IsTentative === 1);
          setReceiptFormat(receiptData.IsNonItemised ? 'item-less' : 'itemised');
          if (receiptData.IsNonItemised) {
            setNonItemisedTotal(receiptData.NonItemisedTotal);
          }
          setFormData(prev => ({
            ...prev,
            storeId: receiptData.StoreID,
            receiptDate: parseISO(receiptData.ReceiptDate),
            note: receiptData.ReceiptNote || '',
            paymentMethodId: receiptData.PaymentMethodID,
            ownShares: receiptData.OwnShares || 0,
            status: receiptData.Status || 'paid',
            owedToDebtorId: receiptData.OwedToDebtorID,
            discount: receiptData.Discount || 0,
          }));
          setSplitType(receiptData.SplitType || 'none');

          if (!receiptData.IsNonItemised) {
            const lineItemData = await db.query<any[]>(`
              SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorName
              FROM LineItems li
              JOIN Products p ON li.ProductID = p.ProductID
              LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
              LEFT JOIN Debtors d ON li.DebtorID = d.DebtorID
              WHERE li.ReceiptID = ?
            `, [id]);
            
            const items: LineItem[] = lineItemData.map(li => ({ ...li, key: nanoid() }));
            setLineItems(items);
            
            const excludedKeys = new Set<string>();
            items.forEach(item => {
              if (item.IsExcludedFromDiscount) {
                excludedKeys.add(item.key);
              }
            });
            setExcludedLineItemKeys(excludedKeys);
            if (excludedKeys.size > 0) {
              setIsExclusionMode(true);
            }
          }

          const imageData = await db.query<ReceiptImage[]>('SELECT * FROM ReceiptImages WHERE ReceiptID = ?', [id]);
          setImages(imageData.map(img => ({ ...img, key: nanoid() })));

          if (debtEnabled) {
            const paymentsData = await db.query<{ DebtorID: number }[]>('SELECT DebtorID FROM ReceiptDebtorPayments WHERE ReceiptID = ?', [id]);
            setPaidDebtorIds(paymentsData.map(p => p.DebtorID));

            if (receiptData.SplitType === 'total_split') {
              const splitsData = await db.query<any[]>(`
                SELECT rs.*, d.DebtorName 
                FROM ReceiptSplits rs
                JOIN Debtors d ON rs.DebtorID = d.DebtorID
                WHERE rs.ReceiptID = ?
              `, [id]);
              setReceiptSplits(splitsData.map(s => ({ ...s, key: nanoid() })));
            }
          }
        }
      } else {
        // Load concept from localStorage
        const concept = localStorage.getItem('receipt_concept');
        if (concept) {
          try {
            const parsedConcept = JSON.parse(concept);
            setReceiptFormat(parsedConcept.isItemless ? 'item-less' : (parsedConcept.lineItems.length > 0 ? 'itemised' : null));
            setNonItemisedTotal(parsedConcept.nonItemisedTotal || 0);
            setFormData({
              ...parsedConcept.formData,
              receiptDate: new Date(parsedConcept.formData.receiptDate)
            });
            setLineItems(parsedConcept.lineItems);
            setImages(parsedConcept.images); // Note: file objects won't be restored, only paths/keys
            setSplitType(parsedConcept.splitType);
            setReceiptSplits(parsedConcept.receiptSplits);
            if (parsedConcept.excludedLineItemKeys) {
              setExcludedLineItemKeys(new Set(parsedConcept.excludedLineItemKeys));
              setIsExclusionMode(parsedConcept.isExclusionMode);
            }
            setIsConcept(true);
          } catch (e) {
            console.error("Failed to load concept", e);
          }
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [id, isEditing, paymentMethodsEnabled, debtEnabled]);

  // Save concept to localStorage
  useEffect(() => {
    if (!isEditing && !loading) {
      const concept = {
        formData,
        lineItems,
        images: images.filter(img => !img.file), // Only save images that are already paths (not file objects)
        splitType,
        receiptSplits,
        excludedLineItemKeys: Array.from(excludedLineItemKeys),
        isExclusionMode,
        isItemless: receiptFormat === 'item-less',
        nonItemisedTotal,
      };
      localStorage.setItem('receipt_concept', JSON.stringify(concept));
      setIsConcept(true);
    }
  }, [formData, lineItems, images, splitType, receiptSplits, isEditing, loading, excludedLineItemKeys, isExclusionMode, receiptFormat, nonItemisedTotal]);

  const clearConcept = () => {
    localStorage.removeItem('receipt_concept');
    setFormData({ 
      storeId: '', 
      receiptDate: new Date(), 
      note: '', 
      paymentMethodId: '1', 
      ownShares: 0,
      status: 'paid',
      owedToDebtorId: null,
      discount: 0,
    });
    setLineItems([]);
    setImages([]);
    setSplitType('none');
    setReceiptSplits([]);
    setExcludedLineItemKeys(new Set());
    setIsExclusionMode(false);
    setIsConcept(false);
    setReceiptFormat(null);
    setNonItemisedTotal(0);
  };

  const totalShares = useMemo(() => {
    const debtorShares = receiptSplits.reduce((acc, curr) => acc + Number(curr.SplitPart || 0), 0);
    const ownShares = Number(formData.ownShares) || 0;
    return debtorShares + ownShares;
  }, [receiptSplits, formData.ownShares]);

  const calculateSubtotal = () => lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0);
  
  const calculateTotal = () => {
    if (receiptFormat === 'item-less') {
      return nonItemisedTotal;
    }
    const subtotal = calculateSubtotal();
    const discountPercentage = parseFloat(String(formData.discount)) || 0;
    
    if (discountPercentage === 0) return subtotal;

    let discountAmount = 0;
    if (isExclusionMode) {
      const discountableAmount = lineItems.reduce((sum, item) => {
        if (!excludedLineItemKeys.has(item.key)) {
          return sum + (item.LineQuantity * item.LineUnitPrice);
        }
        return sum;
      }, 0);
      discountAmount = (discountableAmount * discountPercentage) / 100;
    } else {
      discountAmount = (subtotal * discountPercentage) / 100;
    }
    
    return Math.max(0, subtotal - discountAmount);
  };

  const debtSummary = useMemo(() => {
    if (!debtEnabled) return { debtors: [], self: null };
    
    const summary: Record<string, any> = {};
    const totalAmount = calculateTotal();
    let selfAmount: number | null = null;

    if (splitType === 'total_split' && totalShares > 0) {
      receiptSplits.forEach(split => {
        const amount = (totalAmount * Number(split.SplitPart || 0)) / totalShares;
        summary[split.DebtorName] = {
          name: split.DebtorName,
          amount: (summary[split.DebtorName]?.amount || 0) + amount
        };
      });
      if (formData.ownShares > 0) {
        selfAmount = (totalAmount * Number(formData.ownShares)) / totalShares;
      }
    } else if (splitType === 'line_item' && receiptFormat === 'itemised') {
      const discountPercentage = parseFloat(String(formData.discount)) || 0;
      const discountFactor = 1 - (discountPercentage / 100);
      
      lineItems.forEach(item => {
        if (item.DebtorID) {
          const debtorName = item.DebtorName || debtors.find(d => d.DebtorID === Number(item.DebtorID))?.DebtorName;
          if (debtorName) {
            let itemAmount = item.LineQuantity * item.LineUnitPrice;
            if (discountPercentage > 0) {
               if (!isExclusionMode || (isExclusionMode && !excludedLineItemKeys.has(item.key))) {
                 itemAmount *= discountFactor;
               }
            }
            summary[debtorName] = {
              name: debtorName,
              amount: (summary[debtorName]?.amount || 0) + itemAmount,
              debtorId: item.DebtorID
            };
          }
        }
      });
    }

    return { 
      debtors: Object.values(summary),
      self: selfAmount
    };
  }, [lineItems, receiptSplits, splitType, debtEnabled, debtors, totalShares, formData.ownShares, formData.discount, isExclusionMode, excludedLineItemKeys, receiptFormat, nonItemisedTotal]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (newStatus: 'paid' | 'unpaid') => {
    if (hasSettledDebts) return;
    if (newStatus === 'unpaid' && (splitType !== 'none' || receiptSplits.length > 0 || lineItems.some(li => li.DebtorID))) {
      setUnpaidConfirmModalOpen(true);
    } else {
      setFormData(prev => ({ ...prev, status: newStatus, paymentMethodId: newStatus === 'paid' ? '1' : null }));
    }
  };

  const confirmStatusChange = () => {
    setFormData(prev => ({ ...prev, status: 'unpaid', paymentMethodId: null }));
    setSplitType('none');
    setReceiptSplits([]);
    setLineItems(prev => prev.map(item => ({ ...item, DebtorID: null, DebtorName: null })));
    setUnpaidConfirmModalOpen(false);
  };

  const handleDateChange = (date: Date | null) => setFormData(prev => ({ ...prev, receiptDate: date as Date }));

  const handleProductSelect = (product: any) => {
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

  const handleLineItemChange = (key: string, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map(item => item.key === key ? { ...item, [field]: value } : item));
  };

  const handleLineItemBlur = (key: string, field: keyof LineItem, value: any) => {
    let processedValue = value;
    if (field === 'LineQuantity') {
      processedValue = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'LineUnitPrice') {
      processedValue = Math.max(0, parseFloat(value) || 0);
    }
    setLineItems(prev => prev.map(item => item.key === key ? { ...item, [field]: processedValue } : item));
  };

  const removeLineItem = (key: string) => {
    setLineItems(prev => prev.filter(item => item.key !== key));
    if (excludedLineItemKeys.has(key)) {
      const newExcluded = new Set(excludedLineItemKeys);
      newExcluded.delete(key);
      setExcludedLineItemKeys(newExcluded);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: ReceiptImage[] = files.map(file => ({
      key: nanoid(),
      ImagePath: (file as any).path,
      file,
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (key: string) => {
    setImages(prev => prev.filter(img => img.key !== key));
  };

  const getImagePath = (image: ReceiptImage) => {
    if (image.file) {
      return URL.createObjectURL(image.file);
    }
    if (window.electronAPI) {
      return `local-file://${settings.datastore.folderPath}/receipt_images/${image.ImagePath}`;
    }
    return image.ImagePath;
  };

  const handleSplitTypeChange = (newType: 'none' | 'total_split' | 'line_item') => {
    if (isDebtDisabled) return;
    const hasUnsavedDebt = (splitType === 'total_split' && receiptSplits.length > 0) || (splitType === 'line_item' && lineItems.some(li => li.DebtorID));
    if (hasUnsavedDebt && newType !== splitType) {
      setSplitTypeChangeModal({ isOpen: true, newType });
    } else {
      setSplitType(newType);
    }
  };

  const confirmSplitTypeChange = () => {
    const { newType } = splitTypeChangeModal;
    if (newType) {
      setSplitType(newType);
      if (newType !== 'total_split') setReceiptSplits([]);
      if (newType !== 'line_item') setLineItems(prev => prev.map(item => ({ ...item, DebtorID: null, DebtorName: null })));
    }
    setSplitTypeChangeModal({ isOpen: false, newType: null });
  };

  const handleAddSplit = (debtorId: string) => {
    if (!debtorId || isDebtDisabled) return;
    const debtor = debtors.find(d => d.DebtorID === parseInt(debtorId));
    if (debtor) {
      setReceiptSplits(prev => [...prev, { key: nanoid(), DebtorID: debtor.DebtorID, DebtorName: debtor.DebtorName, SplitPart: 1 }]);
    }
  };

  const handleUpdateSplitPart = (key: string, newPart: string) => {
    setReceiptSplits(prev => prev.map(s => s.key === key ? { ...s, SplitPart: parseInt(newPart) || 1 } : s));
  };

  const handleRemoveSplit = (key: string) => {
    setReceiptSplits(prev => prev.filter(s => s.key !== key));
  };

  const handleAssignDebtorSave = (assignments: { key: string, debtorId: string }[]) => {
    const assignmentsMap = new Map(assignments.map(a => [a.key, a.debtorId]));
    setLineItems(prev => prev.map(item => {
      if (assignmentsMap.has(item.key)) {
        const debtorId = assignmentsMap.get(item.key);
        const debtor = debtors.find(d => d.DebtorID === parseInt(debtorId!));
        return { ...item, DebtorID: debtor ? parseInt(debtorId!) : null, DebtorName: debtor ? debtor.DebtorName : null };
      }
      return item;
    }));
  };

  const handleDiscountExclusionSave = (excludedKeys: string[]) => {
    setExcludedLineItemKeys(new Set(excludedKeys));
    if (excludedKeys.length > 0) {
      setIsExclusionMode(true);
    } else {
      setIsExclusionMode(false);
    }
  };

  const toggleExclusionMode = () => {
    if (isExclusionMode) {
      if (excludedLineItemKeys.size > 0) {
        setExclusionConfirmModalOpen(true);
      } else {
        setIsExclusionMode(false);
      }
    } else {
      setIsExclusionMode(true);
    }
  };

  const confirmDisableExclusion = () => {
    setExcludedLineItemKeys(new Set());
    setIsExclusionMode(false);
    setExclusionConfirmModalOpen(false);
  };

  const handleFormatChange = (newFormat: 'itemised' | 'item-less') => {
    if (hasSettledDebts) return;

    if (receiptFormat && receiptFormat !== newFormat && hasData) {
      setFormatChangeModal({ isOpen: true, newFormat });
    } else {
      setReceiptFormat(newFormat);
    }
  };

  const confirmFormatChange = () => {
    const { newFormat } = formatChangeModal;
    if (newFormat) {
      setReceiptFormat(newFormat);
      if (newFormat === 'item-less') {
        setLineItems([]);
        setExcludedLineItemKeys(new Set());
        setIsExclusionMode(false);
        if (splitType === 'line_item') {
          setSplitType('none');
        }
      } else {
        setNonItemisedTotal(0);
      }
    }
    setFormatChangeModal({ isOpen: false, newFormat: null });
  };

  const handleRemoveDebtorFromItems = (debtorId: number) => {
    setLineItems(prev => prev.map(item => item.DebtorID === debtorId ? { ...item, DebtorID: null, DebtorName: null } : item));
  };

  const handleSubmit = async (isTentative: boolean) => {
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
        Discount: receiptFormat === 'item-less' ? 0 : formData.discount,
        IsNonItemised: receiptFormat === 'item-less' ? 1 : 0,
        NonItemisedTotal: receiptFormat === 'item-less' ? nonItemisedTotal : null,
        IsTentative: isTentative ? 1 : 0,
      };

      if (isEditing) {
        await db.execute(
          `UPDATE Receipts SET 
            StoreID = ?, ReceiptDate = ?, ReceiptNote = ?, PaymentMethodID = ?, 
            SplitType = ?, OwnShares = ?, TotalShares = ?, Status = ?, OwedToDebtorID = ?, 
            Discount = ?, IsNonItemised = ?, NonItemisedTotal = ?, IsTentative = ?
           WHERE ReceiptID = ?`, 
          [...Object.values(receiptPayload), id]
        );
        
        await db.execute('DELETE FROM LineItems WHERE ReceiptID = ?', [id]);
        await db.execute('DELETE FROM ReceiptSplits WHERE ReceiptID = ?', [id]);
        
        const existingImages = await db.query<{ ImagePath: string }[]>('SELECT ImagePath FROM ReceiptImages WHERE ReceiptID = ?', [id]);
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
            (StoreID, ReceiptDate, ReceiptNote, PaymentMethodID, SplitType, OwnShares, 
             TotalShares, Status, OwedToDebtorID, Discount, IsNonItemised, NonItemisedTotal, IsTentative) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
          Object.values(receiptPayload)
        );
        receiptId = String(result.lastID);
      }
  
      if (receiptFormat === 'itemised') {
        for (const item of lineItems) {
          await db.execute('INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice, DebtorID, IsExcludedFromDiscount) VALUES (?, ?, ?, ?, ?, ?)', 
            [receiptId, item.ProductID, item.LineQuantity, item.LineUnitPrice, item.DebtorID || null, excludedLineItemKeys.has(item.key) ? 1 : 0]);
        }
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
      
      if (!isEditing) {
        localStorage.removeItem('receipt_concept');
      }
  
      navigate(`/receipts/view/${receiptId}`, { replace: true });
    } catch (error) {
      console.error("Failed to save receipt:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner className="h-8 w-8 text-accent animate-spin" /></div>;

  const SplitTypeSelector = () => {
    const buttons = [
      { type: 'none' as const, label: 'None', tooltip: 'No debt splitting.' },
      { type: 'total_split' as const, label: 'Split Total', tooltip: 'Split the total receipt amount by shares.' },
      ...(receiptFormat === 'itemised' ? [{ type: 'line_item' as const, label: 'Per Item', tooltip: 'Assign specific items to debtors.' }] : [])
    ];

    const content = (
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {buttons.map(btn => (
          <Tooltip key={btn.type} content={btn.tooltip}>
            <button 
              onClick={() => handleSplitTypeChange(btn.type)} 
              disabled={isDebtDisabled}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                splitType === btn.type 
                  ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" 
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
                isDebtDisabled ? "opacity-50 cursor-not-allowed" : ""
              )}
            >
              {btn.label}
            </button>
          </Tooltip>
        ))}
      </div>
    );

    return content;
  };

  return (
    <div>
      <Header
        title={isEditing ? 'Edit Receipt' : 'Create New Receipt'}
        backButton={
          <Tooltip content="Go Back">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Button>
          </Tooltip>
        }
        actions={
          !isEditing && isConcept && (
            <Tooltip content="Clear Concept">
              <Button variant="ghost" size="icon" onClick={clearConcept}>
                <ArrowPathIcon className="h-5 w-5" />
              </Button>
            </Tooltip>
          )
        }
      />
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        {hasSettledDebts && (
          <InfoCard
            variant="warning"
            title="Debts Settled"
            message="One or more debts on this receipt have been settled. Debt configuration is now locked."
          />
        )}

        {isUnpaid && (
          <InfoCard
            variant="warning"
            title="Unpaid Receipt"
            message="Debt management is disabled for unpaid receipts."
          />
        )}
        
        <Card>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Tooltip content={hasSettledDebts ? "Cannot switch to itemised when debts are settled" : "Enter each product individually."}>
                <button onClick={() => handleFormatChange('itemised')} disabled={hasSettledDebts} className={cn("w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors", receiptFormat === 'itemised' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300", hasSettledDebts && "cursor-not-allowed opacity-50")}>Itemised</button>
              </Tooltip>
              <Tooltip content={hasSettledDebts ? "Cannot switch to item-less when debts are settled" : "Enter only the final total of the receipt."}>
                <button onClick={() => handleFormatChange('item-less')} disabled={hasSettledDebts} className={cn("w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors", receiptFormat === 'item-less' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300", hasSettledDebts && "cursor-not-allowed opacity-50")}>Item-less</button>
              </Tooltip>
            </div>
          </div>
        </Card>

        {receiptFormat && (
          <>
            <Card>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {debtEnabled && (
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Type</label>
                        <Tooltip content="Define if this is a receipt you paid for, or one that you owe."><InformationCircleIcon className="h-4 w-4 text-gray-400" /></Tooltip>
                      </div>
                      <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <Tooltip content={hasSettledDebts ? "Cannot switch to paid when debts are settled" : "A standard expense you've paid."}>
                          <button 
                            onClick={() => handleStatusChange('paid')} 
                            disabled={hasSettledDebts}
                            className={cn(
                              "w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors", 
                              formData.status === 'paid' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
                              hasSettledDebts && "opacity-50 cursor-not-allowed"
                            )}>
                              Paid
                          </button>
                        </Tooltip>
                        <Tooltip content={hasSettledDebts ? "Cannot switch to unpaid when debts are settled" : "An expense you owe to someone else."}>
                          <button 
                            onClick={() => handleStatusChange('unpaid')} 
                            disabled={hasSettledDebts}
                            className={cn(
                              "w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors", 
                              formData.status === 'unpaid' ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
                              hasSettledDebts && "opacity-50 cursor-not-allowed"
                            )}>
                              Unpaid
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                  <div className="col-span-1">
                    <div className="flex items-end gap-2">
                      <div className="flex-grow">
                        <Select label="Store" name="storeId" value={String(formData.storeId)} onChange={handleFormChange} options={stores} placeholder="Select a store" error={errors.storeId} />
                      </div>
                      <Tooltip content="Add Store">
                        <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsStoreModalOpen(true)}>
                          <PlusIcon className="h-5 w-5" />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="col-span-1"><DatePicker label="Receipt Date" selected={formData.receiptDate} onChange={handleDateChange} error={errors.receiptDate} /></div>
                  <div className="col-span-2"><Input label="Note (Optional)" name="note" value={formData.note} onChange={handleFormChange} placeholder="e.g., Weekly groceries" /></div>
                  
                  {formData.status === 'paid' && paymentMethodsEnabled && (
                    <div className="col-span-2"><Select label="Payment Method" name="paymentMethodId" value={String(formData.paymentMethodId)} onChange={handleFormChange} options={paymentMethods} placeholder="Select a method" /></div>
                  )}
                  {formData.status === 'unpaid' && debtEnabled && (
                    <div className="col-span-2"><Select label="Owed To" name="owedToDebtorId" value={String(formData.owedToDebtorId)} onChange={handleFormChange} options={debtors.map(d => ({ value: d.DebtorID, label: d.DebtorName }))} placeholder="Select a person" error={errors.owedToDebtorId} /></div>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold">Images</h2>
                  <Tooltip content="Attach images of the physical receipt for your records."><InformationCircleIcon className="h-5 w-5 text-gray-400" /></Tooltip>
                </div>
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

            {debtEnabled && !isDebtDisabled && (
              <Card>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Debt Management</h2>
                      <Tooltip content="Split the cost of this receipt with others."><InformationCircleIcon className="h-5 w-5 text-gray-400" /></Tooltip>
                    </div>
                    <SplitTypeSelector />
                  </div>

                  {splitType === 'total_split' && (
                    <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                      <div className="grid grid-cols-2 gap-4 items-end">
                        <Select 
                          label="Add Debtor"
                          value=""
                          onChange={(e) => { if (e.target.value) { handleAddSplit(e.target.value); } }}
                          options={[{ value: '', label: 'Choose...' }, ...debtors.filter(d => !receiptSplits.some(s => s.DebtorID === d.DebtorID)).map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
                          className="bg-white dark:bg-gray-800"
                          disabled={isDebtDisabled}
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Own Shares</label>
                            <Tooltip content="How many shares of the total cost you are responsible for."><InformationCircleIcon className="h-4 w-4 text-gray-400" /></Tooltip>
                          </div>
                          <Input 
                            type="number"
                            name="ownShares"
                            value={String(formData.ownShares)}
                            onChange={handleFormChange}
                            min="0"
                            disabled={isDebtDisabled}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {receiptSplits.map(split => (
                          <div key={split.key} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                            <span className="font-medium">{split.DebtorName}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Shares:</span>
                                <input type="number" min="1" value={split.SplitPart} onChange={(e) => handleUpdateSplitPart(split.key, e.target.value)} className="w-16 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm" disabled={isDebtDisabled} />
                              </div>
                              {!isDebtDisabled && <button onClick={() => handleRemoveSplit(split.key)} className="text-red-500 hover:text-red-700"><XMarkIcon className="h-4 w-4" /></button>}
                            </div>
                          </div>
                        ))}
                        {totalShares > 0 && <div className="text-sm text-gray-500 text-right mt-2">Total Shares: {totalShares}</div>}
                      </div>
                    </div>
                  )}

                  {splitType === 'line_item' && receiptFormat === 'itemised' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center justify-between">
                      <p className="text-sm text-blue-700 dark:text-blue-300">Assign items to debtors.</p>
                      <Button onClick={() => setSelectionModal({ isOpen: true, mode: 'debtor' })} disabled={isDebtDisabled}>
                        Assign Debtors
                      </Button>
                    </div>
                  )}

                  {splitType !== 'none' && (debtSummary.debtors.length > 0 || debtSummary.self) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Debt</h3>
                        <Tooltip content="Projected debt amounts based on current split configuration."><InformationCircleIcon className="h-4 w-4 text-gray-400" /></Tooltip>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {debtSummary.debtors.map((debtor) => (
                          <div key={debtor.name} className="w-full">
                            <div className="relative group p-2 rounded border text-sm w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                              {splitType === 'line_item' && !isDebtDisabled && (
                                <button 
                                  onClick={() => handleRemoveDebtorFromItems(debtor.debtorId)}
                                  className="absolute top-1 right-1 bg-gray-200 dark:bg-gray-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <XMarkIcon className="h-3 w-3" />
                                </button>
                              )}
                              <span className="text-gray-500 block">{debtor.name}</span>
                              <span className="font-bold">€{debtor.amount.toFixed(2)}</span>
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

            {receiptFormat === 'item-less' ? (
              <Card>
                <div className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Total</h2>
                  <Input 
                    type="number"
                    label="Total Amount (€)"
                    value={String(nonItemisedTotal)}
                    onChange={(e) => setNonItemisedTotal(parseFloat(e.target.value) || 0)}
                    error={errors.nonItemisedTotal}
                    disabled={hasSettledDebts}
                  />
                </div>
              </Card>
            ) : (
              <Card>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-semibold">Items</h2>
                    {errors.lineItems && <p className="text-sm text-danger">{errors.lineItems}</p>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
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
                          <tr key={item.key}>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                {parseFloat(String(formData.discount)) > 0 && (
                                  <Tooltip content={excludedLineItemKeys.has(item.key) ? 'Excluded from discount' : 'Included in discount'}>
                                    <div className={cn("w-2 h-2 rounded-full", excludedLineItemKeys.has(item.key) ? "bg-gray-400" : "bg-green-500")}></div>
                                  </Tooltip>
                                )}
                                <div>
                                  <p className="font-medium">{item.ProductName}{item.ProductSize ? ` - ${item.ProductSize}${item.ProductUnitType || ''}` : ''}</p>
                                  <p className="text-xs text-gray-500">{item.ProductBrand}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-2">
                              <Input 
                                type="text" 
                                value={String(item.LineQuantity)} 
                                onChange={(e) => handleLineItemChange(item.key, 'LineQuantity', e.target.value)} 
                                onBlur={(e) => handleLineItemBlur(item.key, 'LineQuantity', e.target.value)}
                                className="h-9" 
                                error={errors[`qty_${item.key}`]} 
                                disabled={isDebtDisabled} 
                              />
                            </td>
                            <td className="p-2">
                              <Input 
                                type="text" 
                                value={String(item.LineUnitPrice)} 
                                onChange={(e) => handleLineItemChange(item.key, 'LineUnitPrice', e.target.value)} 
                                onBlur={(e) => handleLineItemBlur(item.key, 'LineUnitPrice', e.target.value)}
                                className="h-9" 
                                error={errors[`price_${item.key}`]} 
                                disabled={isDebtDisabled} 
                              />
                            </td>
                            <td className="p-2 text-right font-medium">
                              {(item.LineQuantity * item.LineUnitPrice).toFixed(2)}
                            </td>
                            {debtEnabled && splitType === 'line_item' && (
                              <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                                {item.DebtorName || '-'}
                              </td>
                            )}
                            <td className="p-2 text-center">
                              {!isDebtDisabled && <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.key)}><XMarkIcon className="h-4 w-4 text-danger" /></Button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button variant="secondary" onClick={() => setIsProductSelectorOpen(true)} disabled={isDebtDisabled}><PlusIcon className="h-4 w-4 mr-2" />Add Item</Button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 rounded-b-xl">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Discount (%)</span>
                      <div className="w-24">
                        <Input 
                          type="text" 
                          name="discount" 
                          value={String(formData.discount)} 
                          onChange={handleFormChange}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val < 0) setFormData(prev => ({ ...prev, discount: 0 }));
                            else if (val > 100) setFormData(prev => ({ ...prev, discount: 100 }));
                          }}
                          className="h-8 text-right"
                          error={errors.discount}
                          disabled={hasSettledDebts}
                        />
                      </div>
                    </div>
                    {parseFloat(String(formData.discount)) > 0 && (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <button 
                            onClick={() => setSelectionModal({ isOpen: true, mode: 'discount' })}
                            className={cn(
                              "text-xs text-accent hover:underline flex items-center gap-1",
                              hasSettledDebts && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={hasSettledDebts}
                          >
                            {isExclusionMode ? (excludedLineItemKeys.size > 0 ? "Edit Exclusions" : "No Exclusions") : "Exclude Items"}
                          </button>
                        </div>
                        <div className="flex items-center gap-4 text-gray-500">
                          <span className="text-sm">Subtotal</span>
                          <span className="font-medium">€{calculateSubtotal().toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-4 text-lg font-bold">
                      <span>Total</span>
                      <span>€{calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex justify-end gap-4">
              <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
              {isEditing && initialIsTentative && (
                <Tooltip content="This receipt is currently tentative. Saving it will make it permanent.">
                  <Button onClick={() => handleSubmit(false)} loading={saving}>
                    Save as Permanent
                  </Button>
                </Tooltip>
              )}
              {!isEditing && (
                <Tooltip content="Tentative receipts are drafts and won't affect analytics or debts until made permanent.">
                  <Button onClick={() => handleSubmit(true)} loading={saving}>
                    Save Tentatively
                  </Button>
                </Tooltip>
              )}
              <Button onClick={() => handleSubmit(isEditing ? initialIsTentative : false)} loading={saving}>
                {isEditing ? (initialIsTentative ? 'Update Tentative Receipt' : 'Save') : 'Save'}
              </Button>
            </div>
          </>
        )}

        <ProductSelector isOpen={isProductSelectorOpen} onClose={() => setIsProductSelectorOpen(false)} onSelect={handleProductSelect} />
        
        <StoreModal
          isOpen={isStoreModalOpen}
          onClose={() => setIsStoreModalOpen(false)}
          onSave={handleStoreSave}
          storeToEdit={null}
        />

        <ConfirmModal
          isOpen={splitTypeChangeModal.isOpen}
          onClose={() => setSplitTypeChangeModal({ isOpen: false, newType: null })}
          onConfirm={confirmSplitTypeChange}
          title="Discard Unsaved Debt?"
          message="You have unsaved debt assignments. Are you sure you want to discard them by changing the split type?"
        />

        <ConfirmModal
          isOpen={unpaidConfirmModalOpen}
          onClose={() => setUnpaidConfirmModalOpen(false)}
          onConfirm={confirmStatusChange}
          title="Discard Debt Information?"
          message="Changing status to 'Unpaid' will clear all existing debt splits and assignments for this receipt. Are you sure?"
        />

        <ConfirmModal
          isOpen={exclusionConfirmModalOpen}
          onClose={() => setExclusionConfirmModalOpen(false)}
          onConfirm={confirmDisableExclusion}
          title="Discard Exclusions?"
          message="Turning off exclusion mode will discard your current item exclusions. Are you sure?"
        />

        <ConfirmModal
          isOpen={formatChangeModal.isOpen}
          onClose={() => setFormatChangeModal({ isOpen: false, newFormat: null })}
          onConfirm={confirmFormatChange}
          title="Change Receipt Format?"
          message="Are you sure you want to change the receipt format? Some data will be cleared."
        />

        <LineItemSelectionModal
          isOpen={selectionModal.isOpen}
          onClose={() => setSelectionModal({ isOpen: false, mode: null })}
          lineItems={lineItems}
          onSave={selectionModal.mode === 'debtor' ? handleAssignDebtorSave : handleDiscountExclusionSave}
          selectionMode={selectionModal.mode!}
          debtors={debtors}
          initialSelectedKeys={selectionModal.mode === 'debtor' ? [] : Array.from(excludedLineItemKeys)}
          disabled={hasSettledDebts}
        />
      </div>
    </div>
  );
};

export default ReceiptFormPage;
