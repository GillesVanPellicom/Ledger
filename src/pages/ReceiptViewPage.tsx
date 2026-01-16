import React, {useState, useEffect, useMemo} from 'react';
import {useParams, useNavigate, Link} from 'react-router-dom';
import {format, parseISO} from 'date-fns';
import {db} from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Gallery from '../components/ui/Gallery';
import {
  Pencil,
  ShoppingCart,
  Tag,
  FileDown,
  CreditCard,
  CheckCircle,
  AlertCircle,
  User,
  Landmark,
  Link as LinkIcon,
  Trash2,
  ArrowLeft,
  Info,
  Store,
  Calendar,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import {generateReceiptsPdf} from '../utils/pdfGenerator';
import {cn} from '../utils/cn';
import DebtSettlementModal from '../components/debt/DebtSettlementModal';
import Tooltip from '../components/ui/Tooltip';
import Modal, {ConfirmModal} from '../components/ui/Modal';
import Select from '../components/ui/Select';
import {Receipt, LineItem, ReceiptImage, ReceiptSplit, ReceiptDebtorPayment} from '../types';
import InfoCard from '../components/ui/InfoCard';
import {Header} from '../components/ui/Header';
import Divider from '../components/ui/Divider';
import PageWrapper from '../components/layout/PageWrapper';
import {calculateLineItemTotalWithDiscount, calculateTotalWithDiscount} from '../utils/discountCalculator';
import {Image} from 'jspdf';
import {useSettingsStore} from '../store/useSettingsStore';
import {useErrorStore} from '../store/useErrorStore';
import {useReceipt, useDeleteReceipt} from '../hooks/useReceipts';
import {useActivePaymentMethods} from '../hooks/usePaymentMethods';
import Combobox from '../components/ui/Combobox';
import NanoDataTable from '../components/ui/NanoDataTable';

interface MarkAsPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethodId: string) => void;
  paymentMethods: { value: number; label: string }[];
}

const MarkAsPaidModal: React.FC<MarkAsPaidModalProps> = ({isOpen, onClose, onConfirm, paymentMethods}) => {
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.value.toString() || '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark as Paid"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(paymentMethodId)} disabled={!paymentMethodId}>Confirm Payment</Button>
        </>
      }
    >
      <Select
        label="Payment Method"
        value={paymentMethodId}
        onChange={(e) => setPaymentMethodId(e.target.value)}
        options={paymentMethods}
      />
    </Modal>
  );
};

const ReceiptViewPage: React.FC = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {settings} = useSettingsStore();
  const {showError} = useErrorStore();
  const deleteReceiptMutation = useDeleteReceipt();

  const {data, isLoading, refetch} = useReceipt(id);
  const {receipt, lineItems: rawLineItems, images: rawImages, splits: receiptSplits, payments} = data || {};

  const {data: activePaymentMethods} = useActivePaymentMethods();

  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [selectedDebtForSettlement, setSelectedDebtForSettlement] = useState<any>(null);
  const [unsettleConfirmation, setUnsettleConfirmation] = useState<{
    isOpen: boolean,
    paymentId: number | null,
    topUpId: number | null
  }>({isOpen: false, paymentId: null, topUpId: null});
  const [isMarkAsPaidModalOpen, setIsMarkAsPaidModalOpen] = useState<boolean>(false);
  const [makePermanentModalOpen, setMakePermanentModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [excludedFilter, setExcludedFilter] = useState<string>('all');

  const filteredLineItems = useMemo(() => {
    if (!rawLineItems) return [];
    return (rawLineItems as (LineItem & { CategoryName?: string, CategoryID?: number })[]).filter(item => {
      if (categoryFilter !== 'all' && item.CategoryID?.toString() !== categoryFilter) return false;
      if (entityFilter !== 'all') {
        if (entityFilter === 'none' && (item.DebtorID !== null && item.DebtorID !== undefined)) return false;
        if (entityFilter !== 'none' && item.DebtorID?.toString() !== entityFilter) return false;
      }
      if (excludedFilter !== 'all') {
        const isExcluded = !!item.IsExcludedFromDiscount;
        if (excludedFilter === 'yes' && !isExcluded) return false;
        if (excludedFilter === 'no' && isExcluded) return false;
      }
      return true;
    });
  }, [rawLineItems, categoryFilter, entityFilter, excludedFilter]);

  const filterOptions = useMemo(() => {
    if (!rawLineItems) return { categories: [], entities: [], hasExclusions: false };
    const items = rawLineItems as (LineItem & { CategoryName?: string, CategoryID?: number })[];
    
    const categories = Array.from(new Set(items.filter(i => i.CategoryID).map(i => JSON.stringify({ value: i.CategoryID!.toString(), label: i.CategoryName }))))
      .map(s => JSON.parse(s));
    
    const entities = Array.from(new Set(items.filter(i => i.DebtorID).map(i => JSON.stringify({ value: i.DebtorID!.toString(), label: i.DebtorName }))))
      .map(s => JSON.parse(s));
    
    if (items.some(i => i.DebtorID === null || i.DebtorID === undefined)) {
      entities.unshift({ value: 'none', label: 'None' });
    }

    const hasExclusions = items.some(i => i.IsExcludedFromDiscount);

    return { categories, entities, hasExclusions };
  }, [rawLineItems]);

  const images = useMemo(() => {
    if (window.electronAPI && settings.datastore.folderPath && rawImages) {
      return rawImages.map(img => ({
        key: img.ImagePath,
        ImagePath: img.ImagePath,
        src: `local-file://${settings.datastore.folderPath}/receipt_images/${img.ImagePath}`
      }));
    }
    return [];
  }, [rawImages, settings.datastore.folderPath]);

  // Calculations for the static "Total Amount" box
  const displaySubtotal = useMemo(() => (rawLineItems || []).reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0), [rawLineItems]);
  const displayTotalAmount = useMemo(() => {
    if (receipt?.IsNonItemised) {
      return receipt.NonItemisedTotal || 0;
    }
    return calculateTotalWithDiscount(rawLineItems || [], receipt?.Discount || 0);
  }, [receipt, rawLineItems]);
  const displayTotalItems = rawLineItems?.length || 0;
  const displayTotalQuantity = (rawLineItems || []).reduce((total, item) => total + item.LineQuantity, 0);


  const debtSummary = useMemo(() => {
    if (!debtEnabled || !receipt || !receiptSplits || !rawLineItems) return {debtors: [], ownShare: null};

    const summary: Record<string, any> = {};
    let ownShare: any = null;

    if (receipt.SplitType === 'total_split' && (receiptSplits.length > 0 || (receipt.OwnShares && receipt.OwnShares > 0))) {
      const totalShares = receipt.TotalShares && receipt.TotalShares > 0
        ? receipt.TotalShares
        : receiptSplits.reduce((acc, curr) => acc + curr.SplitPart, 0) + (receipt.OwnShares || 0);

      receiptSplits.forEach(split => {
        const amount = (displayTotalAmount * split.SplitPart) / totalShares;
        summary[split.DebtorID] = {
          name: split.DebtorName,
          amount: (summary[split.DebtorID]?.amount || 0) + amount,
          debtorId: split.DebtorID,
          shares: split.SplitPart,
          totalShares: totalShares,
        };
      });

      if (receipt.OwnShares && receipt.OwnShares > 0) {
        const ownAmount = (displayTotalAmount * receipt.OwnShares) / totalShares;
        ownShare = {
          amount: ownAmount,
          shares: receipt.OwnShares,
          totalShares: totalShares,
        };
      }
    } else if (receipt.SplitType === 'line_item' && !receipt.IsNonItemised) {
      const debtorItems: Record<string, { count: number, total: number }> = {};

      (rawLineItems as LineItem[]).forEach(item => {
        if (item.DebtorID) {
          const itemAmount = calculateLineItemTotalWithDiscount(item, receipt.Discount || 0);

          if (!debtorItems[String(item.DebtorID)]) {
            debtorItems[String(item.DebtorID)] = {count: 0, total: 0};
          }
          debtorItems[String(item.DebtorID)].count += 1;
          debtorItems[String(item.DebtorID)].total += itemAmount;

          summary[String(item.DebtorID)] = {
            name: item.DebtorName,
            amount: debtorItems[String(item.DebtorID)].total,
            debtorId: item.DebtorID,
            itemCount: debtorItems[String(item.DebtorID)].count,
            totalItems: rawLineItems.length,
          };
        }
      });
    }
    return {debtors: Object.values(summary), ownShare};
  }, [rawLineItems, receipt, receiptSplits, debtEnabled, displayTotalAmount]);

  const debtStatus = useMemo(() => {
    if (!debtEnabled || !debtSummary.debtors.length) return null;
    const totalDebtors = debtSummary.debtors.length;
    const paidDebtors = debtSummary.debtors.filter(d =>
      (payments || []).some(p => p.DebtorID === d.debtorId)
    ).length;

    if (paidDebtors === 0) return { label: 'Not Paid to You', color: 'red' };
    if (paidDebtors === totalDebtors) return { label: 'Fully Paid to You', color: 'green' };
    return { label: `${paidDebtors}/${totalDebtors} Paid to You`, color: 'yellow' };
  }, [debtSummary, payments, debtEnabled]);

  const handleSavePdf = async () => {
    if (!receipt) return;

    const fullReceipt = {
      ...receipt,
      lineItems: rawLineItems || [], // Use rawLineItems for PDF generation
      images: images,
      totalAmount: displayTotalAmount // Use displayTotalAmount
    };

    await generateReceiptsPdf([fullReceipt], settings.pdf);
  };

  const handleSettleClick = (debtor: any) => {
    const payment = (payments || []).find(p => p.DebtorID === debtor.debtorId);
    if (payment) {
      confirmUnsettleDebt(payment.PaymentID, payment.TopUpID);
    } else {
      handleSettleDebt(debtor);
    }
  };

  const handleSettleDebt = (debtor: any) => {
    setSelectedDebtForSettlement({
      receiptId: receipt!.ReceiptID,
      debtorId: debtor.debtorId,
      debtorName: debtor.name,
      amount: debtor.amount,
      receiptDate: receipt!.ReceiptDate,
      receiptPaymentMethodId: receipt!.PaymentMethodID
    });
    setIsSettlementModalOpen(true);
  };

  const confirmUnsettleDebt = (paymentId: number, topUpId: number | undefined) => {
    setUnsettleConfirmation({isOpen: true, paymentId, topUpId: topUpId || null});
  };

  const handleUnsettleDebt = async () => {
    const {paymentId, topUpId} = unsettleConfirmation;
    if (!paymentId) return;
    try {
      await db.execute('DELETE FROM ReceiptDebtorPayments WHERE PaymentID = ?', [paymentId]);
      if (topUpId) {
        await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [topUpId]);
      }
      refetch();
    } catch (error) {
      showError(error as Error);
    } finally {
      setUnsettleConfirmation({isOpen: false, paymentId: null, topUpId: null});
    }
  };

  const handleMarkAsPaid = async (paymentMethodId: string) => {
    if (!receipt || !paymentMethodId) return;
    try {
      await db.execute(
        'UPDATE Receipts SET Status = ?, PaymentMethodID = ? WHERE ReceiptID = ?',
        ['paid', paymentMethodId, id]
      );
      refetch();
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsMarkAsPaidModalOpen(false);
    }
  };

  const handleMakePermanent = async () => {
    if (!receipt) return;
    try {
      await db.execute('UPDATE Receipts SET IsTentative = 0 WHERE ReceiptID = ?', [id]);
      refetch();
    } catch (error) {
      showError(error as Error);
    } finally {
      setMakePermanentModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;
    try {
      await deleteReceiptMutation.mutateAsync([receipt.ReceiptID]);
      navigate('/receipts');
    } catch (error) {
      showError(error as Error);
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const resetFilters = () => {
    setCategoryFilter('all');
    setEntityFilter('all');
    setExcludedFilter('all');
  };

  const hasActiveFilters = categoryFilter !== 'all' || entityFilter !== 'all' || excludedFilter !== 'all';

  const tableHeaders = useMemo(() => {
    const headers = [
      { label: 'Product' },
      { label: 'Category', className: 'w-32 text-right' },
      { label: 'Qty', className: 'w-24 text-right' },
      { label: 'Unit Price (€)', className: 'w-32 text-right' },
      { label: 'Total (€)', className: 'w-32 text-right' },
    ];
    if (debtEnabled && receipt?.SplitType === 'line_item') {
      headers.push({ label: 'Debtor', className: 'w-40 text-right' });
    }
    return headers;
  }, [debtEnabled, receipt?.SplitType]);

  const tableRows = useMemo(() => {
    return filteredLineItems.map((item, index) => {
      const isDebtorUnpaid = item.DebtorID && !(payments || []).some(p => p.DebtorID === item.DebtorID);
      const row: React.ReactNode[] = [
        <div className="flex items-center gap-2">
          {receipt?.Discount > 0 && filterOptions.hasExclusions && (
            <Tooltip content={item.IsExcludedFromDiscount ? 'Excluded from discount' : 'Included in discount'}>
              <div className={cn("w-2 h-2 rounded-full", item.IsExcludedFromDiscount ? "bg-gray-400" : "bg-green-500")}></div>
            </Tooltip>
          )}
          <div>
            <p className="font-medium">{item.ProductName}{item.ProductSize ? ` - ${item.ProductSize}${item.ProductUnitType || ''}` : ''}</p>
            <p className="text-xs text-gray-500">{item.ProductBrand}</p>
          </div>
        </div>,
        <div className="text-right text-gray-500">{item.CategoryName || '-'}</div>,
        <div className="text-right">{item.LineQuantity}</div>,
        <div className="text-right">{(item.LineUnitPrice).toFixed(2)}</div>,
        <div className="text-right font-medium">{(item.LineQuantity * item.LineUnitPrice).toFixed(2)}</div>,
      ];
      if (debtEnabled && receipt?.SplitType === 'line_item') {
        row.push(
          <div className={cn("text-right", isDebtorUnpaid ? "text-red font-medium" : "text-gray-600 dark:text-gray-400")}>
            {item.DebtorName || '-'}
          </div>
        );
      }
      return row;
    });
  }, [filteredLineItems, receipt?.Discount, filterOptions.hasExclusions, debtEnabled, receipt?.SplitType, payments]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner className="h-8 w-8 text-accent"/>
      </div>
    );
  }

  if (!receipt) {
    return <div className="text-center">Expense not found.</div>;
  }

  return (
    <div>
      <Header
        title={receipt.StoreName}
        subtitle={format(parseISO(receipt.ReceiptDate), 'EEEE, MMMM d, yyyy')}
        backButton={
          <Tooltip content="Go Back">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5"/>
            </Button>
          </Tooltip>
        }
        actions={
          <>
            <Tooltip content="Delete">
              <Button variant="ghost" size="icon" onClick={() => setDeleteModalOpen(true)}>
                <Trash2 className="h-5 w-5"/>
              </Button>
            </Tooltip>
            <Tooltip content="Edit">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/receipts/edit/${id}`)}>
                <Pencil className="h-5 w-5"/>
              </Button>
            </Tooltip>
            <Tooltip content="Save as PDF (WIP)">
              <Button variant="ghost" size="icon" onClick={handleSavePdf} disabled>
                <FileDown className="h-5 w-5"/>
              </Button>
            </Tooltip>
            {receipt.Status === 'unpaid' && (
              <Tooltip content={receipt.IsTentative ? "Cannot mark a tentative expense as paid" : "Mark as Paid"}>
                <div className={cn(!receipt.IsTentative && "cursor-pointer")}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => !receipt.IsTentative && setIsMarkAsPaidModalOpen(true)}
                    disabled={!!receipt.IsTentative}
                  >
                    <Landmark className="h-5 w-5"/>
                  </Button>
                </div>
              </Tooltip>
            )}
          </>
        }
      />
      <PageWrapper>
        <div className="py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Summary Card - Moved before Items List for mobile order */}
          <div className="col-span-1 space-y-6 lg:col-start-3">
            <Card>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* Total Amount */}
                  <div className="sm:col-start-1 sm:row-start-1 lg:col-start-1 lg:row-start-1 xl:col-start-1 xl:row-start-1">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold">€{displayTotalAmount.toFixed(2)}</p>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-col items-start sm:items-end lg:items-start xl:items-end gap-2 sm:col-start-2 sm:row-start-1 lg:col-start-1 lg:row-start-2 xl:col-start-2 xl:row-start-1">
                    <Tooltip content={receipt?.Status === 'paid' ? 'This expense has been paid to the vendor.' : `Total amount is owed to ${receipt?.OwedToDebtorName}.`}>
                      <span
                        className={cn(
                          'px-2 inline-flex text-xs leading-5 font-semibold rounded-full border',
                          receipt?.Status === 'paid'
                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-100 dark:border-green-700'
                            : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-700'
                        )}
                      >
                        {receipt?.Status === 'paid' ? 'Paid to Vendor' : 'Unpaid'}
                      </span>
                    </Tooltip>
                    {debtStatus && (
                      <Tooltip content="This indicates the status of debts owed to you by others for this receipt.">
                        <span
                          className={cn(
                            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full border cursor-help',
                            debtStatus.color === 'green' && 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-100 dark:border-green-700',
                            debtStatus.color === 'yellow' && 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-100 dark:border-yellow-700',
                            debtStatus.color === 'red' && 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-700'
                          )}
                        >
                          {debtStatus.label}
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  {/* Note */}
                  {receipt?.ReceiptNote && (
                    <div className="sm:col-start-2 sm:row-start-2 lg:col-start-1 lg:row-start-3 xl:col-start-2 xl:row-start-2 sm:text-right lg:text-left xl:text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Note</p>
                      <p className="text-base text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words">{receipt.ReceiptNote}</p>
                    </div>
                  )}

                  {/* Rest (Attributes) */}
                  <div className="flex flex-col gap-4 sm:col-start-1 sm:row-start-2 lg:col-start-1 lg:row-start-4 xl:col-start-1 xl:row-start-2">
                    {receipt?.StoreName && (
                      <Tooltip content="The vendor where this expense was incurred">
                        <div className="flex items-center gap-3 cursor-help">
                          <Store className="h-5 w-5 text-gray-400"/>
                          <span className="text-sm">{receipt.StoreName}</span>
                        </div>
                      </Tooltip>
                    )}
                    {receipt?.ReceiptDate && (
                      <Tooltip content="The date this expense was incurred">
                        <div className="flex items-center gap-3 cursor-help">
                          <Calendar className="h-5 w-5 text-gray-400"/>
                          <span className="text-sm">{format(parseISO(receipt.ReceiptDate), 'MMM d, yyyy')}</span>
                        </div>
                      </Tooltip>
                    )}
                    {paymentMethodsEnabled && (
                      <Tooltip content="The payment method used for this expense">
                        <div className="flex items-center gap-3 cursor-help">
                          <CreditCard className="h-5 w-5 text-gray-400"/>
                          <span className="text-sm">{receipt.PaymentMethodName || 'N/A'}</span>
                        </div>
                      </Tooltip>
                    )}
                    {!receipt?.IsNonItemised && (
                      <>
                        <Tooltip content="Number of unique items in this receipt">
                          <div className="flex items-center gap-3 cursor-help">
                            <Tag className="h-5 w-5 text-gray-400"/>
                            <span className="text-sm">{displayTotalItems} Unique Items</span>
                          </div>
                        </Tooltip>
                        <Tooltip content="Total quantity of all items purchased">
                          <div className="flex items-center gap-3 cursor-help">
                            <ShoppingCart className="h-5 w-5 text-gray-400"/>
                            <span className="text-sm">{displayTotalQuantity} Total Quantity</span>
                          </div>
                        </Tooltip>
                      </>
                    )}
                  </div>

                </div>
              </div>
            </Card>

            {debtEnabled && (
              <div>
                <Divider text="Debt Breakdown"/>
                <div className="space-y-2 mt-4">
                  {(debtSummary.debtors.length > 0 || debtSummary.ownShare) ? (
                    <>
                      {debtSummary.debtors.map((debtor) => {
                        const payment = (payments || []).find(p => p.DebtorID === debtor.debtorId);
                        const isPaid = !!payment;

                        return (
                          <Card
                            key={debtor.debtorId}
                            className="p-4 cursor-pointer transition-all duration-200"
                            onClick={() => handleSettleClick(debtor)}
                          >
                            <div className="flex justify-between items-start">
                              <Link to={`/entities/${debtor.debtorId}`}
                                    className="font-medium hover:underline flex items-center gap-1.5 group"
                                    onClick={(e) => e.stopPropagation()}>
                                <span className="text-gray-900 dark:text-gray-100">{debtor.name}</span>
                                <LinkIcon className="h-4 w-4 text-gray-400 dark:text-gray-500"/>
                              </Link>
                              <div className="flex items-center">
                                {isPaid ? (
                                  <Tooltip content={`Paid on ${payment.PaidDate}`}>
                                    <CheckCircle className="h-5 w-5 text-green"/>
                                  </Tooltip>
                                ) : (
                                  <Tooltip content="Unpaid">
                                    <AlertCircle className="h-5 w-5 text-red"/>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-baseline mt-1">
                              <p className={cn("font-bold truncate", isPaid ? "text-green" : "text-red")}
                                 style={{fontSize: '1.5rem', lineHeight: '2rem'}}>
                                €{debtor.amount.toFixed(2)}
                              </p>
                              <div className="text-right flex-shrink-0 pl-2">
                                {receipt?.SplitType === 'total_split' &&
                                  <p className="text-sm text-gray-500">{debtor.shares} / {debtor.totalShares} shares</p>}
                                {receipt?.SplitType === 'line_item' && !receipt.IsNonItemised &&
                                  <p className="text-sm text-gray-500">{debtor.itemCount} / {displayTotalItems} items</p>}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                      {!!debtSummary.ownShare && (
                        <Card className="p-4">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-gray-900 dark:text-gray-100">Own Share</p>
                            <User className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
                          </div>
                          <div className="flex justify-between items-baseline mt-1">
                            <p className="font-bold text-blue-700 dark:text-blue-300 truncate"
                               style={{fontSize: '1.5rem', lineHeight: '2rem'}}>
                              €{debtSummary.ownShare.amount.toFixed(2)}
                            </p>
                            <div className="text-right flex-shrink-0 pl-2">
                              <p className="text-sm text-gray-500">
                                {debtSummary.ownShare.shares} / {debtSummary.ownShare.totalShares} shares
                              </p>
                            </div>
                          </div>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card className="overflow-hidden">
                      <div className="relative p-6">
                        <div className="blur-sm space-y-3">
                          <div className="h-24 bg-gray-100 dark:bg-gray-900 rounded-xl w-full border border-gray-200 dark:border-gray-800 flex flex-col p-4 justify-between">
                            <div className="flex justify-between items-start">
                              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
                              <div className="h-5 w-5 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
                              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
                            </div>
                          </div>
                          <div className="h-24 bg-gray-100 dark:bg-gray-900 rounded-xl w-full border border-gray-200 dark:border-gray-800 flex flex-col p-4 justify-between">
                            <div className="flex justify-between items-start">
                              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
                              <div className="h-5 w-5 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
                              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 dark:bg-black/40 backdrop-blur-sm">
                          <Info className="h-8 w-8 text-gray-400 dark:text-gray-500"/>
                          <p className="mt-2 text-sm text-gray-500 font-medium">No debts owed to you for this receipt.</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items List - Moved after Summary Card for mobile order, but positioned correctly on desktop */}
          <div className="lg:col-span-2 space-y-6 lg:col-start-1 lg:row-start-1">
            {!!receipt.IsTentative && (
              <InfoCard
                variant="info"
                title="Tentative Expense"
                message="This is a draft expense. It won't affect analytics or debts until made permanent."
              >
                <Button onClick={() => setMakePermanentModalOpen(true)}>Make Permanent</Button>
              </InfoCard>
            )}

            {images.length > 0 && (
              <Card>
                <div className="p-6">
                  <Gallery images={images.map(i => i.src) as (string | Image)[]}/>
                </div>
              </Card>
            )}

            {receipt.IsNonItemised ? (
              <Card className="overflow-hidden">
                <div className="relative p-6">
                  <div className="blur-sm">
                    <NanoDataTable
                      headers={[
                        { label: 'Product' },
                        { label: 'Qty', className: 'w-24 text-center' },
                        { label: 'Unit Price (€)', className: 'w-32 text-right' },
                        { label: 'Total (€)', className: 'w-32 text-right' },
                      ]}
                      rows={[]} // Empty rows to trigger "No results found" for non-itemised
                    />
                  </div>
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
                    <Info className="h-12 w-12 text-gray-400 dark:text-gray-500"/>
                    <h3 className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Total-only Expense</h3>
                    <p className="mt-1 text-sm text-gray-500">Only the total amount was recorded for this expense.</p>
                  </div>
                </div>
              </Card>
            ) : (
              <>
                <div className="flex justify-end gap-4 mb-4 flex-wrap">
                  <Combobox
                    options={[{ value: 'all', label: 'All Categories' }, ...filterOptions.categories]}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder="Filter by Category"
                    className="w-full sm:w-48 shrink min-w-[120px]"
                  />
                  {filterOptions.entities.length > 0 && (
                    <Combobox
                      options={[{ value: 'all', label: 'All Entities' }, ...filterOptions.entities]}
                      value={entityFilter}
                      onChange={setEntityFilter}
                      placeholder="Filter by Entity"
                      className="w-full sm:w-48 shrink min-w-[120px]"
                    />
                  )}
                  {filterOptions.hasExclusions && (
                    <Combobox
                      options={[
                        { value: 'all', label: 'Included & Excluded' },
                        { value: 'yes', label: 'Excluded Only' },
                        { value: 'no', label: 'Included Only' }
                      ]}
                      value={excludedFilter}
                      onChange={setExcludedFilter}
                      placeholder="Filter by Exclusion"
                      className="w-full sm:w-48 shrink min-w-[120px]"
                    />
                  )}
                  <Tooltip content="Reset Filters">
                    <Button variant="ghost" size="icon" onClick={resetFilters} disabled={!hasActiveFilters}>
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                  </Tooltip>
                </div>
                <Card>
                  <div className="p-6">
                    <NanoDataTable
                      headers={tableHeaders}
                      rows={tableRows}
                    />
                  </div>
                  <div className="px-6 py-4 rounded-b-xl">
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-4 text-gray-500">
                        <span className="text-sm">Subtotal</span>
                        <span className="font-medium">€{displaySubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-gray-500">
                        {receipt?.Discount > 0 && filterOptions.hasExclusions ? (
                          <Tooltip content="Some items are excluded from this discount. You can see which items are excluded by the gray dot next to the product name.">
                            <div className="flex items-center gap-1 cursor-help">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm underline decoration-dotted">
                                Discount ({receipt.Discount || 0}%)
                              </span>
                            </div>
                          </Tooltip>
                        ) : (
                          <span className="text-sm">Discount ({receipt?.Discount || 0}%)</span>
                        )}
                        <span className="font-medium">-€{(displaySubtotal - displayTotalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-lg font-bold">
                        <span>Total</span>
                        <span>€{displayTotalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

        </div>
      </PageWrapper>

      <DebtSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSave={refetch}
        debtInfo={selectedDebtForSettlement}
      />

      <ConfirmModal
        isOpen={unsettleConfirmation.isOpen}
        onClose={() => setUnsettleConfirmation({isOpen: false, paymentId: null, topUpId: null})}
        onConfirm={handleUnsettleDebt}
        title="Unsettle Debt"
        message="Are you sure you want to mark this debt as unpaid? This will also delete the associated top-up transaction."
      />

      <MarkAsPaidModal
        isOpen={isMarkAsPaidModalOpen}
        onClose={() => setIsMarkAsPaidModalOpen(false)}
        onConfirm={handleMarkAsPaid}
        paymentMethods={(activePaymentMethods || []).map(pm => ({
          value: pm.PaymentMethodID,
          label: pm.PaymentMethodName
        }))}
      />

      <ConfirmModal
        isOpen={makePermanentModalOpen}
        onClose={() => setMakePermanentModalOpen(false)}
        onConfirm={handleMakePermanent}
        title="Make Expense Permanent"
        message="Are you sure you want to make this expense permanent? This action is irreversible."
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Are you sure you want to permanently delete this expense? This action cannot be undone."
      />
    </div>
  );
};

export default ReceiptViewPage;
