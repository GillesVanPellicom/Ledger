import React, {useState, useEffect, useMemo} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {format, parseISO} from 'date-fns';
import {db} from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import DatePicker from '../components/ui/DatePicker';
import ProductSelector from '../components/products/ProductSelector';
import {X, Plus, Image, RotateCw, Info, ArrowLeft, Lock, ArrowDown} from 'lucide-react';
import {nanoid} from 'nanoid';
import {cn} from '../utils/cn';
import Tooltip from '../components/ui/Tooltip';
import {ConfirmModal} from '../components/ui/Modal';
import LineItemSelectionModal from '../components/receipts/LineItemSelectionModal';
import StoreModal from '../components/stores/StoreModal';
import EntityModal from '../components/debt/EntityModal';
import PaymentMethodModal from '../components/payment/PaymentMethodModal';
import StepperInput from '../components/ui/StepperInput';
import {Debtor, LineItem, ReceiptImage, ReceiptSplit, Store} from '../types';
import InfoCard from '../components/ui/InfoCard';
import '../electron.d';
import Spinner from '../components/ui/Spinner';
import {Header} from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import {calculateLineItemTotalWithDiscount, calculateTotalWithDiscount} from '../utils/discountCalculator';
import {useSettingsStore} from '../store/useSettingsStore';
import {useBackupStore} from '../store/useBackupStore';
import {useQueryClient} from '@tanstack/react-query';
import Divider from '../components/ui/Divider';
import NanoDataTable from '../components/ui/NanoDataTable';
import DataGrid from '../components/ui/DataGrid';
import Combobox from '../components/ui/Combobox';

const ReceiptFormPage: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const {settings} = useSettingsStore();
  const {incrementEdits} = useBackupStore();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;

  const [stores, setStores] = useState<{ value: string, label: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ value: string, label: string }[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [paidById, setPaidById] = useState<string>('me');

  const [formData, setFormData] = useState({
    storeId: '',
    receiptDate: new Date(),
    note: '',
    paymentMethodId: '1',
    ownShares: 0,
    discount: 0,
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [images, setImages] = useState<ReceiptImage[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState<boolean>(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState<boolean>(false);
  const [isEntityModalOpen, setIsEntityModalOpen] = useState<boolean>(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [receiptFormat, setReceiptFormat] = useState<'itemised' | 'item-less' | null>(null);
  const [formatChangeModal, setFormatChangeModal] = useState<{
    isOpen: boolean,
    newFormat: 'itemised' | 'item-less' | null
  }>({isOpen: false, newFormat: null});
  const [nonItemisedTotal, setNonItemisedTotal] = useState<number>(0);

  const [splitType, setSplitType] = useState<'none' | 'total_split' | 'line_item'>('none');
  const [receiptSplits, setReceiptSplits] = useState<ReceiptSplit[]>([]);
  const [paidDebtorIds, setPaidDebtorIds] = useState<number[]>([]);
  const [debtInfoModal, setDebtInfoModal] = useState<{ isOpen: boolean, onConfirm: () => void }>({
    isOpen: false,
    onConfirm: () => {
    }
  });
  const [isConcept, setIsConcept] = useState<boolean>(false);
  const [initialIsTentative, setInitialIsTentative] = useState<boolean>(false);
  const [excludedLineItemKeys, setExcludedLineItemKeys] = useState<Set<string>>(new Set());
  const [isExclusionMode, setIsExclusionMode] = useState<boolean>(false);
  const [exclusionConfirmModalOpen, setExclusionConfirmModalOpen] = useState<boolean>(false);
  const [selectionModal, setSelectionModal] = useState<{
    isOpen: boolean,
    mode: 'debtor' | 'discount' | null
  }>({isOpen: false, mode: null});

  const hasSettledDebts = useMemo(() => paidDebtorIds.length > 0, [paidDebtorIds]);
  const isUnpaid = paidById !== 'me';
  const isDebtDisabled = hasSettledDebts || isUnpaid;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.storeId) newErrors.storeId = 'Store is required.';
    if (!formData.receiptDate) newErrors.receiptDate = 'Date is required.';
    if (!paidById) newErrors.paidById = 'Paid by is required.';
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
    const storeData = await db.query<Store>('SELECT StoreID, StoreName FROM Stores WHERE StoreIsActive = 1 ORDER BY StoreName');
    setStores(storeData.map(s => ({value: String(s.StoreID), label: s.StoreName})));
  };

  const handleStoreSave = async (newStoreId?: number) => {
    await fetchStores();
    if (newStoreId) {
      setFormData(prev => ({...prev, storeId: String(newStoreId)}));
    }
    setIsStoreModalOpen(false);
  };

  const handleEntitySave = async () => {
    const debtorsData = await db.query<Debtor>('SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsActive = 1 ORDER BY DebtorName');
    setDebtors(debtorsData);

    const newDebtor = await db.queryOne<{
      DebtorID: number
    }>('SELECT DebtorID FROM Debtors ORDER BY DebtorID DESC LIMIT 1');
    if (newDebtor) {
      setPaidById(String(newDebtor.DebtorID));
    }

    setIsEntityModalOpen(false);
  };

  const handlePaymentMethodSave = async () => {
    if (paymentMethodsEnabled) {
      const paymentMethodData = await db.query<{
        PaymentMethodID: number,
        PaymentMethodName: string
      }>('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName');
      setPaymentMethods(paymentMethodData.map(pm => ({
        value: String(pm.PaymentMethodID),
        label: pm.PaymentMethodName
      })));

      const newMethod = await db.queryOne<{
        PaymentMethodID: number
      }>('SELECT PaymentMethodID FROM PaymentMethods ORDER BY PaymentMethodID DESC LIMIT 1');
      if (newMethod) {
        setFormData(prev => ({...prev, paymentMethodId: String(newMethod.PaymentMethodID)}));
      }
    }
    setIsPaymentMethodModalOpen(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchStores();

      if (paymentMethodsEnabled) {
        const paymentMethodData = await db.query<{
          PaymentMethodID: number,
          PaymentMethodName: string
        }>('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName');
        setPaymentMethods(paymentMethodData.map(pm => ({
          value: String(pm.PaymentMethodID),
          label: pm.PaymentMethodName
        })));
      }

      if (debtEnabled) {
        const debtorsData = await db.query<Debtor>('SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsActive = 1 ORDER BY DebtorName');
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
          setPaidById(receiptData.Status === 'unpaid' ? String(receiptData.OwedToDebtorID) : 'me');
          setFormData(prev => ({
            ...prev,
            storeId: String(receiptData.StoreID),
            receiptDate: parseISO(receiptData.ReceiptDate),
            note: receiptData.ReceiptNote || '',
            paymentMethodId: String(receiptData.PaymentMethodID),
            ownShares: receiptData.OwnShares || 0,
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

            const items: LineItem[] = lineItemData.map(li => ({...li, key: nanoid()}));
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

          const imageData = await db.query<ReceiptImage>('SELECT * FROM ReceiptImages WHERE ReceiptID = ?', [id]);
          setImages(imageData.map(img => ({...img, key: nanoid()})));

          if (debtEnabled) {
            const paymentsData = await db.query<{
              DebtorID: number
            }>('SELECT DebtorID FROM ReceiptDebtorPayments WHERE ReceiptID = ?', [id]);
            setPaidDebtorIds(paymentsData.map(p => p.DebtorID));

            if (receiptData.SplitType === 'total_split') {
              const splitsData = await db.query<any[]>(`
                  SELECT rs.*, d.DebtorName
                  FROM ReceiptSplits rs
                           JOIN Debtors d ON rs.DebtorID = d.DebtorID
                  WHERE rs.ReceiptID = ?
              `, [id]);
              setReceiptSplits(splitsData.map(s => ({...s, key: nanoid()})));
            }
          }
        }
      } else {
        // Load concept from localStorage
        const concept = localStorage.getItem('receipt_concept');
        if (concept) {
          try {
            const parsedConcept = JSON.parse(concept);
            setReceiptFormat(parsedConcept.receiptFormat || null);
            setNonItemisedTotal(parsedConcept.nonItemisedTotal || 0);
            setPaidById(parsedConcept.paidById || 'me');
            setFormData({
              ...parsedConcept.formData,
              receiptDate: new Date(parsedConcept.formData.receiptDate)
            });
            setLineItems(parsedConcept.lineItems || []);
            setImages(parsedConcept.images || []);
            setSplitType(parsedConcept.splitType);
            setReceiptSplits(parsedConcept.receiptSplits || []);
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
        paidById,
        lineItems,
        images: images.filter(img => !img.file),
        splitType,
        receiptSplits,
        excludedLineItemKeys: Array.from(excludedLineItemKeys),
        isExclusionMode,
        receiptFormat,
        nonItemisedTotal,
      };
      localStorage.setItem('receipt_concept', JSON.stringify(concept));
      setIsConcept(true);
    }
  }, [formData, paidById, lineItems, images, splitType, receiptSplits, isEditing, loading, excludedLineItemKeys, isExclusionMode, receiptFormat, nonItemisedTotal]);

  const clearConcept = () => {
    localStorage.removeItem('receipt_concept');
    setFormData({
      storeId: '',
      receiptDate: new Date(),
      note: '',
      paymentMethodId: '1',
      ownShares: 0,
      discount: 0,
    });
    setPaidById('me');
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
    const itemsToDiscount = isExclusionMode ? lineItems.filter(item => !excludedLineItemKeys.has(item.key)) : lineItems;
    return calculateTotalWithDiscount(itemsToDiscount, formData.discount);
  };

  const debtSummary = useMemo(() => {
    if (!debtEnabled) return {debtors: [], self: null};

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
      lineItems.forEach(item => {
        if (item.DebtorID) {
          const debtorName = item.DebtorName || debtors.find(d => d.DebtorID === Number(item.DebtorID))?.DebtorName;
          if (debtorName) {
            const itemAmount = calculateLineItemTotalWithDiscount(item, formData.discount);
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

  const handleFormChange = (name: string, value: string) => {
    setFormData(prev => ({...prev, [name]: value}));
  };

  const handlePaidByChange = (value: string) => {
    if (hasSettledDebts) return;

    if (value !== 'me' && (splitType !== 'none' || receiptSplits.length > 0 || lineItems.some(li => li.DebtorID))) {
      setDebtInfoModal({
        isOpen: true,
        onConfirm: () => {
          setPaidById(value);
          setSplitType('none');
          setReceiptSplits([]);
          setLineItems(prev => prev.map(item => ({...item, DebtorID: null, DebtorName: null})));
          setDebtInfoModal({
            isOpen: false, onConfirm: () => {
            }
          });
        }
      });
    } else {
      setPaidById(value);
    }
  };

  const handleDateChange = (date: Date | null) => setFormData(prev => ({...prev, receiptDate: date as Date}));

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
    setLineItems(prev => prev.map(item => item.key === key ? {...item, [field]: value} : item));
  };

  const handleLineItemBlur = (key: string, field: keyof LineItem, value: any) => {
    let processedValue = value;
    if (field === 'LineQuantity') {
      processedValue = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'LineUnitPrice') {
      processedValue = Math.max(0, parseFloat(value) || 0);
    }
    setLineItems(prev => prev.map(item => item.key === key ? {...item, [field]: processedValue} : item));
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
      setDebtInfoModal({
        isOpen: true,
        onConfirm: () => {
          setSplitType(newType);
          if (newType !== 'total_split') setReceiptSplits([]);
          if (newType !== 'line_item') setLineItems(prev => prev.map(item => ({
            ...item,
            DebtorID: null,
            DebtorName: null
          })));
          setDebtInfoModal({
            isOpen: false, onConfirm: () => {
            }
          });
        }
      });
    } else {
      setSplitType(newType);
    }
  };

  const handleAddSplit = (debtorId: string) => {
    if (!debtorId || isDebtDisabled) return;
    const debtor = debtors.find(d => d.DebtorID === parseInt(debtorId));
    if (debtor) {
      setReceiptSplits(prev => [...prev, {
        key: nanoid(),
        DebtorID: debtor.DebtorID,
        DebtorName: debtor.DebtorName,
        SplitPart: 1
      }]);
    }
  };

  const handleUpdateSplitPart = (key: string, newPart: string) => {
    setReceiptSplits(prev => prev.map(s => s.key === key ? {...s, SplitPart: parseInt(newPart) || 1} : s));
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
        return {...item, DebtorID: debtor ? parseInt(debtorId!) : null, DebtorName: debtor ? debtor.DebtorName : null};
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

    const willLoseData = (receiptFormat === 'itemised' && lineItems.length > 0) || (receiptFormat === 'item-less' && nonItemisedTotal > 0);

    if (receiptFormat !== newFormat && willLoseData) {
      setFormatChangeModal({isOpen: true, newFormat});
    } else {
      setReceiptFormat(newFormat);
    }
  };

  const confirmFormatChange = () => {
    const {newFormat} = formatChangeModal;
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
    setFormatChangeModal({isOpen: false, newFormat: null});
  };

  const handleRemoveDebtorFromItems = (debtorId: number) => {
    setLineItems(prev => prev.map(item => item.DebtorID === debtorId ? {
      ...item,
      DebtorID: null,
      DebtorName: null
    } : item));
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
        PaymentMethodID: paidById === 'me' ? formData.paymentMethodId : null,
        SplitType: splitType,
        OwnShares: splitType === 'total_split' ? (formData.ownShares || 0) : null,
        TotalShares: splitType === 'total_split' ? totalShares : null,
        Status: paidById === 'me' ? 'paid' : 'unpaid',
        OwedToDebtorID: paidById === 'me' ? null : paidById,
        Discount: receiptFormat === 'item-less' ? 0 : formData.discount,
        IsNonItemised: receiptFormat === 'item-less' ? 1 : 0,
        NonItemisedTotal: receiptFormat === 'item-less' ? nonItemisedTotal : null,
        IsTentative: isTentative ? 1 : 0,
      };

      if (isEditing) {
        await db.execute(
          `UPDATE Receipts
           SET StoreID          = ?,
               ReceiptDate      = ?,
               ReceiptNote      = ?,
               PaymentMethodID  = ?,
               SplitType        = ?,
               OwnShares        = ?,
               TotalShares      = ?,
               Status           = ?,
               OwedToDebtorID   = ?,
               Discount         = ?,
               IsNonItemised    = ?,
               NonItemisedTotal = ?,
               IsTentative      = ?
           WHERE ReceiptID = ?`,
          [...Object.values(receiptPayload), id]
        );

        await db.execute('DELETE FROM LineItems WHERE ReceiptID = ?', [id]);
        await db.execute('DELETE FROM ReceiptSplits WHERE ReceiptID = ?', [id]);

        const existingImages = await db.query<ReceiptImage>('SELECT ImagePath FROM ReceiptImages WHERE ReceiptID = ?', [id]);
        const imagesToKeep = images.filter(img => !img.file).map(img => img.ImagePath);
        const imagesToDelete = existingImages.filter(img => !imagesToKeep.includes(img.ImagePath));
        if (imagesToDelete.length > 0) {
          const placeholders = imagesToDelete.map(() => '?').join(',');
          await db.execute(`DELETE
                            FROM ReceiptImages
                            WHERE ReceiptID = ?
                              AND ImagePath IN (${placeholders})`, [id, ...imagesToDelete.map(i => i.ImagePath)]);
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

      // Invalidate relevant queries
      queryClient.invalidateQueries({queryKey: ['receipts']});
      queryClient.invalidateQueries({queryKey: ['receipt', receiptId]});
      queryClient.invalidateQueries({queryKey: ['analytics']});
      queryClient.invalidateQueries({queryKey: ['paymentMethodBalance']});
      queryClient.invalidateQueries({queryKey: ['debt']});

      if (!isEditing) {
        localStorage.removeItem('receipt_concept');
      }

      if (isEditing) {
        navigate(-1);
      } else {
        navigate(`/receipts/view/${receiptId}`, {replace: true});
      }
    } catch (error) {
      console.error("Failed to save receipt:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full">
    <Spinner className="h-8 w-8 text-accent animate-spin"/></div>;

  const paidByOptions = [
    {value: 'me', label: `${settings.userName || 'User'} (Me)`},
    ...debtors.map(d => ({value: String(d.DebtorID), label: d.DebtorName}))
  ];

  const SplitTypeSelector = () => {
    const buttons = [
      {type: 'none' as const, label: 'None', tooltip: 'No debt splitting.'},
      {type: 'total_split' as const, label: 'Split Total', tooltip: 'Split the total expense amount by shares.'},
      ...(receiptFormat === 'itemised' ? [{
        type: 'line_item' as const,
        label: 'Per Item',
        tooltip: 'Assign specific items to debtors.'
      }] : [])
    ];

    return (
      <div className="flex rounded-lg p-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
        {buttons.map(btn => (
          <Tooltip key={btn.type} content={btn.tooltip}>
            <button
              onClick={() => handleSplitTypeChange(btn.type)}
              disabled={isDebtDisabled}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors w-full",
                splitType === btn.type
                  ? "bg-gray-100 dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                isDebtDisabled ? "opacity-50 cursor-not-allowed" : ""
              )}
            >
              {btn.label}
            </button>
          </Tooltip>
        ))}
      </div>
    );
  };

  return (
    <div>
      <Header
        title={isEditing ? 'Edit Expense' : 'Create New Expense'}
        backButton={
          <Tooltip content="Go Back">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5"/>
            </Button>
          </Tooltip>
        }
        actions={
          !isEditing && (
            <Tooltip content="Clear Concept">
              <Button variant="ghost" size="icon" onClick={clearConcept} disabled={!isConcept}>
                <RotateCw className="h-5 w-5"/>
              </Button>
            </Tooltip>
          )
        }
      />
      <PageWrapper>
        <div className="py-6 space-y-6">
          <Card className="overflow-hidden">
            <div className="relative p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-1">
                  <div className="flex items-end gap-2">
                    <div className="flex-grow">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store</label>
                      <Combobox
                        options={stores}
                        value={formData.storeId}
                        onChange={(value) => handleFormChange('storeId', value)}
                        placeholder="Select a store"
                        searchPlaceholder="Search stores..."
                        noResultsText="No stores found."
                      />
                      {errors.storeId && <p className="mt-1 text-xs text-danger">{errors.storeId}</p>}
                    </div>
                    <Tooltip content="Add Store">
                      <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsStoreModalOpen(true)}>
                        <Plus className="h-5 w-5"/>
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div className="col-span-1"><DatePicker label="Expense Date"
                                                        selected={formData.receiptDate}
                                                        onChange={handleDateChange}
                                                        error={errors.receiptDate}/></div>

                <div className={cn("grid grid-cols-2 gap-6 col-span-2 items-end", !paymentMethodsEnabled && "grid-cols-1")}>
                  {debtEnabled && (
                    <div className={cn(!paymentMethodsEnabled && "col-span-2")}>
                      <div className="flex items-end gap-2">
                        <div className="flex-grow">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paid
                                                                                                             by</label>
                          <Tooltip className="w-full flex"
                                   content={hasSettledDebts ? "Cannot change payer when debts are settled." : ""}>
                            <Combobox
                              options={paidByOptions}
                              value={paidById}
                              onChange={handlePaidByChange}
                              placeholder="Select who paid"
                              searchPlaceholder="Search..."
                              noResultsText="No one found."
                              className="w-full"
                            />
                          </Tooltip>
                          {errors.paidById && <p className="mt-1 text-xs text-danger">{errors.paidById}</p>}
                        </div>
                        <Tooltip content="Add Entity">
                          <Button variant="secondary"
                                  className="h-10 w-10 p-0"
                                  onClick={() => setIsEntityModalOpen(true)}
                                  disabled={hasSettledDebts}>
                            <Plus className="h-5 w-5"/>
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  )}

                  {paymentMethodsEnabled && (
                    <div>
                      <div className="flex items-end gap-2">
                        <div className="flex-grow">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment
                                                                                                             Method</label>
                          <Tooltip className="w-full flex"
                                   content={paidById !== 'me' ? "Payment method is not required when you didn't pay." : ""}>
                            <Combobox
                              options={paymentMethods}
                              value={formData.paymentMethodId}
                              onChange={(value) => handleFormChange('paymentMethodId', value)}
                              placeholder="Select a method"
                              searchPlaceholder="Search methods..."
                              noResultsText="No methods found."
                              disabled={paidById !== 'me'}
                            />
                          </Tooltip>
                        </div>
                        <Tooltip content="Add Payment Method">
                          <Button variant="secondary"
                                  className="h-10 w-10 p-0"
                                  onClick={() => setIsPaymentMethodModalOpen(true)}
                                  disabled={paidById !== 'me'}>
                            <Plus className="h-5 w-5"/>
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <Divider text="Optional Details" className="mb-4"/>
                  <Input label="Note"
                         name="note"
                         value={formData.note}
                         onChange={(e) => handleFormChange('note', e.target.value)}
                         placeholder="e.g., Weekly groceries"/>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Images</h2>
                    <Tooltip content="Attach images of the physical receipt for your records."><Info className="h-4 w-4 text-gray-400"/></Tooltip>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {images.map(image => (
                      <div key={image.key} className="relative group">
                        <img src={getImagePath(image)} alt="Receipt" className="w-full h-24 object-cover rounded-lg"/>
                        <button onClick={() => removeImage(image.key)}
                                className="absolute top-1 right-1 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3"/>
                        </button>
                      </div>
                    ))}
                    <label className="w-full h-24 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                      <Image className="h-8 w-8 text-gray-400 dark:text-gray-500"/>
                      <span className="text-xs mt-1">Add Images</span>
                      <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden"/>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-1 rounded-lg p-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
                <Tooltip content={hasSettledDebts ? "Cannot change format when one or more debts are settled" : "Enter each product individually."}>
                  <button onClick={() => handleFormatChange('itemised')}
                          disabled={hasSettledDebts}
                          className={cn("w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors", receiptFormat === 'itemised' ? "bg-gray-100 dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50", hasSettledDebts && "cursor-not-allowed opacity-50")}>Enter
                                                                                                                                                                                                                                                                                                                                           Items
                  </button>
                </Tooltip>
                <Tooltip content={hasSettledDebts ? "Cannot change format when one or more debts are settled" : "Enter only the final total of the expense."}>
                  <button onClick={() => handleFormatChange('item-less')}
                          disabled={hasSettledDebts}
                          className={cn("w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors", receiptFormat === 'item-less' ? "bg-gray-100 dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50", hasSettledDebts && "cursor-not-allowed opacity-50")}>Enter
                                                                                                                                                                                                                                                                                                                                            Total
                                                                                                                                                                                                                                                                                                                                            Only
                  </button>
                </Tooltip>
              </div>
            </div>
          </Card>

          {receiptFormat && (
            <>
              <Card className="overflow-hidden">
                <div className="relative p-6">
                  {hasSettledDebts && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
                      <Info className="h-12 w-12 text-gray-400 dark:text-gray-500"/>
                      <h3 className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Debts Settled</h3>
                      <p className="mt-1 text-center text-sm text-gray-500">One or more debts on this expense have been
                                                                            settled.<br/>To preserve data accuracy, some
                                                                            configurations for this expense are now
                                                                            locked.</p>
                    </div>
                  )}
                  <div className={cn(hasSettledDebts && "blur-sm select-none pointer-events-none")}>
                    {receiptFormat === 'item-less' ? (
                      <div className="text-center py-4">
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total
                                                                                                           Amount</label>
                        <div className="relative inline-block">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-gray-400">€</span>
                          <StepperInput
                            value={String(nonItemisedTotal)}
                            onChange={(e) => setNonItemisedTotal(parseFloat(e.target.value) || 0)}
                            onIncrement={() => setNonItemisedTotal(prev => (prev || 0) + 1)}
                            onDecrement={() => setNonItemisedTotal(prev => Math.max(0, (prev || 0) - 1))}
                            min={0}
                            max={10000000}
                            step={1}
                            error={errors.nonItemisedTotal}
                            disabled={hasSettledDebts}
                            inputClassName="text-4xl font-bold text-center w-48 h-16 pl-10 pr-4"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {errors.lineItems && <p className="text-sm text-danger text-right -mb-2">{errors.lineItems}</p>}
                        <NanoDataTable
                          headers={[
                            {label: 'Product', className: splitType === 'line_item' ? 'w-[40%]' : 'w-[50%]'},
                            {label: 'Qty', className: 'w-[10%] text-center'},
                            {label: 'Unit Price (€)', className: 'w-[10%] text-center'},
                            {label: 'Total (€)', className: splitType === 'line_item' ? 'w-[15%]' : 'w-[20%]'},
                            ...(splitType === 'line_item' ? [{label: 'Debtor', className: 'w-[15%]'}] : []),
                            {label: '', className: 'w-auto'},
                          ]}
                          rows={lineItems.map(item => [
                            <div className="flex items-center gap-2">
                              {parseFloat(String(formData.discount)) > 0 && (
                                <Tooltip content={excludedLineItemKeys.has(item.key) ? 'Excluded from discount' : 'Included in discount'}>
                                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", excludedLineItemKeys.has(item.key) ? "bg-gray-400" : "bg-green-500")}></div>
                                </Tooltip>
                              )}
                              <div>
                                <p className="font-medium">{item.ProductName}{item.ProductSize ? ` - ${item.ProductSize}${item.ProductUnitType || ''}` : ''}</p>
                                <p className="text-xs text-gray-500">{item.ProductBrand}</p>
                              </div>
                            </div>,
                            <StepperInput
                              value={String(item.LineQuantity)}
                              onChange={(e) => handleLineItemChange(item.key, 'LineQuantity', e.target.value)}
                              onBlur={(e) => handleLineItemBlur(item.key, 'LineQuantity', e.target.value)}
                              onIncrement={() => handleLineItemChange(item.key, 'LineQuantity', (Number(item.LineQuantity) || 0) + 1)}
                              onDecrement={() => handleLineItemChange(item.key, 'LineQuantity', Math.max(0, (Number(item.LineQuantity) || 0) - 1))}
                              min={0}
                              max={1000000}
                              className="w-full"
                              inputClassName="text-center"
                              error={errors[`qty_${item.key}`]}
                              disabled={isDebtDisabled}
                            />,
                            <StepperInput
                              value={String(item.LineUnitPrice)}
                              onChange={(e) => handleLineItemChange(item.key, 'LineUnitPrice', e.target.value)}
                              onBlur={(e) => handleLineItemBlur(item.key, 'LineUnitPrice', e.target.value)}
                              onIncrement={() => handleLineItemChange(item.key, 'LineUnitPrice', (Number(item.LineUnitPrice) || 0) + 1)}
                              onDecrement={() => handleLineItemChange(item.key, 'LineUnitPrice', Math.max(0, (Number(item.LineUnitPrice) || 0) - 1))}
                              min={0}
                              max={1000000}
                              className="w-full"
                              inputClassName="text-center"
                              error={errors[`price_${item.key}`]}
                              disabled={isDebtDisabled}
                            />,
                            <span className="font-medium text-right block">{(item.LineQuantity * item.LineUnitPrice).toFixed(2)}</span>,
                            ...(splitType === 'line_item' ? [
                              <div className="text-right text-sm text-gray-600 dark:text-gray-400">{item.DebtorName || '-'}</div>] : []),
                            <div className="text-right">
                              {!isDebtDisabled && <Button variant="ghost"
                                                          size="icon"
                                                          onClick={() => removeLineItem(item.key)}><X className="h-4 w-4 text-danger"/></Button>}
                            </div>
                          ])}
                          emptyStateIcon={<ArrowDown className="h-10 w-10 opacity-50" />}
                          emptyStateText="Press the button below to get started."
                        />
                        <div className="grid grid-cols-3 items-start mt-4">
                          <div/>
                          <div className="flex justify-center">
                            <Button variant="secondary"
                                    size="lg"
                                    className="w-full"
                                    onClick={() => setIsProductSelectorOpen(true)}
                                    disabled={isDebtDisabled}><Plus className="h-5 w-5 mr-2"/>Add Item</Button>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-4 mb-1">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Discount (%)</span>
                              <div className="w-24">
                                <StepperInput
                                  value={String(formData.discount)}
                                  onChange={(e) => handleFormChange('discount', e.target.value)}
                                  onIncrement={() => handleFormChange('discount', String(Math.min(100, (Number(formData.discount) || 0) + 1)))}
                                  onDecrement={() => handleFormChange('discount', String(Math.max(0, (Number(formData.discount) || 0) - 1)))}
                                  min={0}
                                  max={100}
                                  step={1}
                                  className="h-8"
                                  inputClassName="text-right"
                                  error={errors.discount}
                                  disabled={hasSettledDebts}
                                />
                              </div>
                            </div>
                            <div className={cn("flex items-center gap-2 mb-1", parseFloat(String(formData.discount)) > 0 ? 'flex' : 'invisible')}>
                              <button
                                onClick={() => setSelectionModal({isOpen: true, mode: 'discount'})}
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
                            <div className="flex items-center gap-4 text-lg font-bold">
                              <span>Total</span>
                              <span>€{calculateTotal().toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {debtEnabled && (
                <Card className="overflow-hidden">
                  <div className="relative p-6 space-y-4 min-h-[300px]">
                    {hasSettledDebts && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
                        <Info className="h-12 w-12 text-gray-400 dark:text-gray-500"/>
                        <h3 className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Debts Settled</h3>
                        <p className="mt-1 text-center text-sm text-gray-500">One or more debts on this expense have been
                                                                              settled.<br/>To preserve data accuracy, some
                                                                              configurations for this expense are now
                                                                              locked.</p>
                      </div>
                    )}
                    <div className={cn(hasSettledDebts && "blur-sm select-none pointer-events-none")}>
                      {isUnpaid ? (
                        <div className="relative h-full">
                          <div className="blur-sm select-none pointer-events-none opacity-50">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold">Debt Management</h2>
                                <Tooltip content="Split the cost of this expense with others."><Info className="h-5 w-5 text-gray-400"/></Tooltip>
                              </div>
                              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <button className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-500">None</button>
                                <button className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100">Split
                                                                                                                                                                                      Total
                                </button>
                                {receiptFormat === 'itemised' &&
                                  <button className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-500">Per
                                                                                                                                 Item</button>}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <NanoDataTable
                                headers={[
                                  {label: 'Name', className: 'w-1/2'},
                                  {label: 'Shares', className: 'w-1/3 text-right'},
                                  {label: '', className: 'w-auto text-right'},
                                ]}
                                rows={[
                                  [
                                    <span className="font-medium">{settings.userName || 'User'} (Me)</span>,
                                    <StepperInput
                                      value="0"
                                      disabled={true}
                                      className="w-32 mx-auto"
                                    />,
                                    <div className="text-right text-gray-400">
                                      <Tooltip content="You cannot remove yourself">
                                        <Lock className="h-4 w-4"/>
                                      </Tooltip>
                                    </div>
                                  ]
                                ]}
                              />
                              <div className="flex items-center justify-between pt-2">
                                <div className="w-48">
                                  <Combobox
                                    value=""
                                    options={[]}
                                    onChange={() => {
                                    }}
                                    placeholder="Add Person..."
                                    className="bg-white dark:bg-gray-800"
                                    disabled={true}
                                  />
                                </div>
                                <div className="text-sm text-gray-500">Total Shares: 0</div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                            <Info className="h-12 w-12 text-gray-400 dark:text-gray-500"/>
                            <h3 className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Debt Management
                                                                                                        Disabled</h3>
                            <p className="mt-1 text-sm text-gray-500">Debt management is disabled when an expense isn't paid
                                                                      by you.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-semibold">Debt Management</h2>
                              <Tooltip content="Split the cost of this expense with others."><Info className="h-5 w-5 text-gray-400"/></Tooltip>
                            </div>
                            <SplitTypeSelector/>
                          </div>

                          {splitType === 'total_split' && (
                            <div className="space-y-4 min-h-[400px]">
                              <NanoDataTable
                                headers={[
                                  {label: 'Name', className: 'w-[55%]'},
                                  {label: 'Shares', className: 'w-[15%] text-center'},
                                  {label: '', className: 'w-auto text-right'},
                                ]}
                                rows={[
                                  [
                                    <span className="font-medium">{settings.userName || 'User'} (Me)</span>,
                                    <StepperInput
                                      value={String(formData.ownShares)}
                                      onChange={(e) => handleFormChange('ownShares', e.target.value)}
                                      name="ownShares"
                                      onDecrement={() => handleFormChange('ownShares', String(Math.max(0, (Number(formData.ownShares) || 0) - 1)))}
                                      onIncrement={() => handleFormChange('ownShares', String((Number(formData.ownShares) || 0) + 1))}
                                      min={0}
                                      max={1000}
                                      disabled={isDebtDisabled}
                                      className="w-full"
                                      inputClassName="text-center"
                                    />,
                                    <div className="text-right">
                                      <Tooltip content="You cannot remove yourself">
                                        <Button variant="ghost" size="icon" disabled className="opacity-50">
                                          <Lock className="h-4 w-4"/>
                                        </Button>
                                      </Tooltip>
                                    </div>
                                  ],
                                  ...receiptSplits.map(split => ([
                                    <span className="font-medium truncate">{split.DebtorName}</span>,
                                    <StepperInput
                                      value={String(split.SplitPart)}
                                      onChange={(e) => handleUpdateSplitPart(split.key, e.target.value)}
                                      onDecrement={() => handleUpdateSplitPart(split.key, String(Math.max(1, (Number(split.SplitPart) || 0) - 1)))}
                                      onIncrement={() => handleUpdateSplitPart(split.key, String((Number(split.SplitPart) || 0) + 1))}
                                      min={1}
                                      max={100}
                                      step={1}
                                      disabled={isDebtDisabled}
                                      className="w-full"
                                      inputClassName="text-center"
                                    />,
                                    <div className="text-right">
                                      {!isDebtDisabled &&
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSplit(split.key)}><X
                                          className="h-4 w-4 text-danger"/></Button>}
                                    </div>
                                  ]))
                                ]}
                              />
                              <div className="flex flex-col items-center gap-4 pt-2">
                                <div className="grid grid-cols-3 items-center w-full">
                                  <div></div>
                                  <div className="relative flex justify-center">
                                    <div className="relative w-full max-w-xs">
                                      <Combobox
                                        options={debtors.filter(d => !receiptSplits.some(s => s.DebtorID === d.DebtorID)).map(d => ({
                                          value: String(d.DebtorID),
                                          label: d.DebtorName
                                        }))}
                                        value=""
                                        onChange={handleAddSplit}
                                        placeholder="Add Person"
                                        searchPlaceholder="Search person..."
                                        noResultsText="No one found."
                                        disabled={isDebtDisabled}
                                      />
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-500 text-right">{totalShares > 0 ? `Total Shares: ${totalShares}` : 'Total Shares: 0'}</div>
                                </div>
                              </div>
                            </div>
                          )}

                          {splitType === 'line_item' && receiptFormat === 'itemised' && (
                            <div className="flex justify-center items-center h-full min-h-[400px]">
                              <div className="w-3/4 border border-gray-200 dark:border-gray-700 p-8 rounded-xl space-y-4 bg-transparent">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">Item
                                                                                                           Assignment</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {lineItems.filter(i => i.DebtorID).length} of {lineItems.length} items assigned
                                    </p>
                                  </div>
                                  <Button size="lg"
                                          variant="secondary"
                                          onClick={() => setSelectionModal({isOpen: true, mode: 'debtor'})}
                                          disabled={isDebtDisabled}>
                                    {lineItems.some(i => i.DebtorID) ? 'Edit Assignments' : 'Assign Items'}
                                  </Button>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-accent h-2 rounded-full transition-all duration-300"
                                    style={{width: `${(lineItems.filter(i => i.DebtorID).length / Math.max(1, lineItems.length)) * 100}%`}}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}

                          {splitType === 'none' && (
                            <div className="flex flex-col items-center justify-center py-8 text-center min-h-[400px]">
                              <Info className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2"/>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No Debt Splitting</h3>
                              <p className="text-sm text-gray-500 max-w-sm">The full amount of this expense is assigned to
                                                                            you. Select a split type above to share the
                                                                            cost.</p>
                            </div>
                          )}

                          <div className={cn("mt-4 pt-4 border-t border-gray-200 dark:border-gray-700", splitType === 'none' && "invisible")}>
                            <div className="flex items-center gap-2 mb-4">
                              <h2 className="text-lg font-semibold">Estimated Debt</h2>
                              <Tooltip content="This is an estimate of what each person owes based on the current split."><Info
                                className="h-5 w-5 text-gray-400"/></Tooltip>
                            </div>
                            <DataGrid
                              itemKey="name"
                              disableMinHeight
                              data={[
                                ...(debtSummary.self ? [{
                                  name: `${settings.userName || 'User'} (Me)`,
                                  amount: `€${debtSummary.self.toFixed(2)}`
                                }] : []),
                                ...debtSummary.debtors.map(d => ({name: d.name, amount: `€${d.amount.toFixed(2)}`}))
                              ]}
                              renderItem={(item) => (
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-lg font-semibold">{item.amount}</span>
                                </div>
                              )}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          <div className="flex justify-end gap-4">
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
            {isEditing && initialIsTentative && (
              <Tooltip content="This expense is currently tentative. Saving it will make it permanent.">
                <Button onClick={() => handleSubmit(false)} loading={saving}>
                  Save as Permanent
                </Button>
              </Tooltip>
            )}
            {!isEditing && (
              <Tooltip content="Tentative expenses are drafts and won't affect analytics or debts until made permanent.">
                <Button onClick={() => handleSubmit(true)} loading={saving}>
                  Save Tentatively
                </Button>
              </Tooltip>
            )}
            <Button onClick={() => handleSubmit(isEditing ? initialIsTentative : false)} loading={saving}>
              {isEditing ? (initialIsTentative ? 'Update Tentative Expense' : 'Save') : 'Save'}
            </Button>
          </div>

          <ProductSelector isOpen={isProductSelectorOpen}
                           onClose={() => setIsProductSelectorOpen(false)}
                           onSelect={handleProductSelect}/>

          <StoreModal
            isOpen={isStoreModalOpen}
            onClose={() => setIsStoreModalOpen(false)}
            onSave={handleStoreSave}
            storeToEdit={null}
          />

          <EntityModal
            isOpen={isEntityModalOpen}
            onClose={() => setIsEntityModalOpen(false)}
            onSave={handleEntitySave}
            entityToEdit={null}
          />

          <PaymentMethodModal
            isOpen={isPaymentMethodModalOpen}
            onClose={() => setIsPaymentMethodModalOpen(false)}
            onSave={handlePaymentMethodSave}
            methodToEdit={null}
          />

          <ConfirmModal
            isOpen={debtInfoModal.isOpen}
            onClose={() => setDebtInfoModal({
              isOpen: false, onConfirm: () => {
              }
            })}
            onConfirm={debtInfoModal.onConfirm}
            title="Discard Debt Information?"
            message="Changing this setting will clear all existing debt splits and assignments for this expense. Are you sure?"
            confirmText="Discard"
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
            onClose={() => setFormatChangeModal({isOpen: false, newFormat: null})}
            onConfirm={confirmFormatChange}
            title="Change Expense Format?"
            message="Are you sure you want to change the expense format? Some data will be cleared."
          />

          <LineItemSelectionModal
            isOpen={selectionModal.isOpen}
            onClose={() => setSelectionModal({isOpen: false, mode: null})}
            lineItems={lineItems}
            onSave={selectionModal.mode === 'debtor' ? handleAssignDebtorSave : handleDiscountExclusionSave}
            selectionMode={selectionModal.mode!}
            debtors={debtors}
            initialSelectedKeys={selectionModal.mode === 'debtor' ? [] : Array.from(excludedLineItemKeys)}
            disabled={hasSettledDebts}
          />
        </div>
      </PageWrapper>
    </div>
  );
};

export default ReceiptFormPage;
