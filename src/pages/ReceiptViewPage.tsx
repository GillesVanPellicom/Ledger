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
  RotateCcw,
  Filter,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownLeft as ArrowDownLeftIcon
} from 'lucide-react';
import {cn} from '../utils/cn';
import DebtSettlementModal from '../components/debt/DebtSettlementModal';
import Tooltip from '../components/ui/Tooltip';
import Modal, {ConfirmModal} from '../components/ui/Modal';
import Select from '../components/ui/Select';
import {LineItem} from '../types';
import {Header} from '../components/ui/Header';
import Divider from '../components/ui/Divider';
import PageWrapper from '../components/layout/PageWrapper';
import {
  calculateSubtotal,
  calculateTotalItems,
  calculateTotalQuantity,
  calculateTotalWithDiscount
} from '../logic/expense';
import {useSettingsStore} from '../store/useSettingsStore';
import {useReceipt, useDeleteReceipt} from '../hooks/useReceipts';
import {useActivePaymentMethods} from '../hooks/usePaymentMethods';
import NanoDataTable from '../components/ui/NanoDataTable';
import {useReceiptDebtCalculation} from '../hooks/useDebtCalculation';
import {usePdfGenerator} from '../hooks/usePdfGenerator';
import FilterModal, {FilterOption} from '../components/ui/FilterModal';
import ButtonGroup from '../components/ui/ButtonGroup';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import Badge, { BadgeVariant } from '../components/ui/Badge';
import { useQueryClient } from '@tanstack/react-query';
import NotFoundState from '../components/ui/NotFoundState';

interface MarkAsPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethodId: string) => void;
  paymentMethods: { value: number; label: string }[];
}

const MarkAsPaidModal: React.FC<MarkAsPaidModalProps> = ({isOpen, onClose, onConfirm, paymentMethods}) => {
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.value.toString() || '');

  useEffect(() => {
    if (isOpen && paymentMethods.length > 0 && !paymentMethodId) {
      setPaymentMethodId(paymentMethods[0].value.toString());
    }
  }, [isOpen, paymentMethods, paymentMethodId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark as Paid"
      onEnter={() => onConfirm(paymentMethodId)}
      isDatabaseTransaction
      successToastMessage="Marked as paid successfully"
      errorToastMessage="Failed to mark as paid"
      loadingMessage="Processing payment..."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(paymentMethodId)} disabled={!paymentMethodId}>Confirm Payment</Button>
        </>
      }
    >
      <Select
        label="Method"
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
  const queryClient = useQueryClient();
  const {settings} = useSettingsStore();
  const deleteReceiptMutation = useDeleteReceipt();
  const {generatePdf} = usePdfGenerator();

  const {data, isLoading} = useReceipt(id);
  const {receipt, lineItems: rawLineItems, images: rawImages, splits: receiptSplits, payments = []} = data || {};

  const {data: activePaymentMethods} = useActivePaymentMethods();

  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;

  const {debtSummary} = useReceiptDebtCalculation(id, receipt, rawLineItems, receiptSplits, payments);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [selectedDebtForSettlement, setSelectedDebtForSettlement] = useState<any>(null);
  const [unsettleConfirmation, setUnsettleConfirmation] = useState<{
    isOpen: boolean,
    paymentId: number | null,
    topUpId: number | null,
    type: 'me' | 'them'
  }>({isOpen: false, paymentId: null, topUpId: null, type: 'them'});
  const [isMarkAsPaidModalOpen, setIsMarkAsPaidModalOpen] = useState<boolean>(false);
  const [makePermanentModalOpen, setMakePermanentModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [excludedFilter, setExcludedFilter] = useState<string>('all');

  // Pending filters (for modal)
  const [pendingCategoryFilter, setPendingCategoryFilter] = useState<string>('all');
  const [pendingEntityFilter, setPendingEntityFilter] = useState<string>('all');
  const [pendingExcludedFilter, setPendingExcludedFilter] = useState<string>('all');

  // Sync pending filters when modal opens
  useEffect(() => {
    if (isFilterModalOpen) {
      setPendingCategoryFilter(categoryFilter);
      setPendingEntityFilter(entityFilter);
      setPendingExcludedFilter(excludedFilter);
    }
  }, [isFilterModalOpen, categoryFilter, entityFilter, excludedFilter]);

  const filteredLineItems = useMemo(() => {
    if (!rawLineItems) return [];
    return (rawLineItems as (LineItem & { CategoryName?: string, CategoryID?: number })[]).filter(item => {
      const matchesCategory = categoryFilter === 'all' || item.CategoryID?.toString() === categoryFilter;
      const matchesEntity = entityFilter === 'all' ||
        (entityFilter === 'none' && (item.DebtorID === null || item.DebtorID === undefined)) ||
        (entityFilter !== 'none' && item.DebtorID?.toString() === entityFilter);
      const matchesExclusion = excludedFilter === 'all' ||
        (excludedFilter === 'yes' && !!item.IsExcludedFromDiscount) ||
        (excludedFilter === 'no' && !item.IsExcludedFromDiscount);

      return matchesCategory && matchesEntity && matchesExclusion;
    });
  }, [rawLineItems, categoryFilter, entityFilter, excludedFilter]);

  const filterOptions = useMemo(() => {
    if (!rawLineItems) return {categories: [], entities: [], hasExclusions: false};
    const items = rawLineItems as (LineItem & { CategoryName?: string, CategoryID?: number })[];

    const categories = Array.from(new Set(items.filter(i => i.CategoryID).map(i => JSON.stringify({
      value: i.CategoryID!.toString(),
      label: i.CategoryName || 'Unknown'
    }))))
      .map(s => JSON.parse(s));

    const entities = Array.from(new Set(items.filter(i => i.DebtorID).map(i => JSON.stringify({
      value: i.DebtorID!.toString(),
      label: i.DebtorName
    }))))
      .map(s => JSON.parse(s));

    if (items.some(i => i.DebtorID === null || i.DebtorID === undefined)) {
      entities.unshift({value: 'none', label: 'None'});
    }

    const hasExclusions = items.some(i => i.IsExcludedFromDiscount);

    return {categories, entities, hasExclusions};
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
  const displaySubtotal = useMemo(() => calculateSubtotal(rawLineItems || []), [rawLineItems]);
  const displayTotalAmount = useMemo(() => {
    if (receipt?.IsNonItemised) {
      return receipt.NonItemisedTotal || 0;
    }
    return calculateTotalWithDiscount(rawLineItems || [], receipt?.Discount || 0);
  }, [receipt, rawLineItems]);
  const displayTotalItems = useMemo(() => calculateTotalItems(rawLineItems || []), [rawLineItems]);
  const displayTotalQuantity = useMemo(() => calculateTotalQuantity(rawLineItems || []), [rawLineItems]);

  const debtStatus = useMemo(() => {
    if (!debtEnabled || !debtSummary?.debtors.length) return null;
    const totalDebtors = debtSummary.debtors.length;
    const paidDebtors = debtSummary.debtors.filter(d => d.isPaid).length;

    if (paidDebtors === 0) return {label: 'Unpaid to You', variant: 'red' as BadgeVariant};
    if (paidDebtors === totalDebtors) return {label: 'Fully Paid to You', variant: 'green' as BadgeVariant};
    return {label: `${paidDebtors}/${totalDebtors} Paid to You`, variant: 'yellow' as BadgeVariant};
  }, [debtSummary, debtEnabled]);

  const handleSavePdf = async () => {
    if (!receipt) return;

    const fullReceipt = {
      ...receipt,
      lineItems: rawLineItems || [], // Use rawLineItems for PDF generation
      images: images,
      totalAmount: displayTotalAmount // Use displayTotalAmount
    };

    await generatePdf([fullReceipt], settings.pdf);
  };

  const handleSettleClick = (debtor: any) => {
    if (receipt?.IsTentative) return;
    const payment = (payments || []).find(p => p.DebtorID === debtor.debtorId);
    if (payment) {
      confirmUnsettleDebt(payment.PaymentID, payment.TopUpID, 'them');
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

  const confirmUnsettleDebt = (paymentId: number | null, topUpId: number | undefined, type: 'me' | 'them') => {
    setUnsettleConfirmation({isOpen: true, paymentId, topUpId: topUpId || null, type});
  };

  const handleUnsettleDebt = async () => {
    const {paymentId, topUpId, type} = unsettleConfirmation;
    
    try {
      if (type === 'me') {
        await db.execute(
          'UPDATE Expenses SET Status = ?, PaymentMethodID = NULL WHERE ExpenseID = ?',
          ['unpaid', id]
        );
      } else if (paymentId) {
        await db.execute('DELETE FROM ExpenseEntityPayments WHERE ExpenseEntityPaymentID = ?', [paymentId]);
        if (topUpId) {
          await db.execute('DELETE FROM Income WHERE IncomeID = ?', [topUpId]);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
    } catch (error) {
      throw error;
    } finally {
      setUnsettleConfirmation({isOpen: false, paymentId: null, topUpId: null, type: 'them'});
    }
  };

  const handleMarkAsPaid = async (paymentMethodId: string) => {
    if (!receipt || !paymentMethodId) return;
    try {
      await db.execute(
        'UPDATE Expenses SET Status = ?, PaymentMethodID = ? WHERE ExpenseID = ?',
        ['paid', paymentMethodId, id]
      );
      await queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
    } catch (error) {
      throw error;
    } finally {
      setIsMarkAsPaidModalOpen(false);
    }
  };

  const handleMakePermanent = async () => {
    if (!receipt) return;
    try {
      await db.execute('UPDATE Expenses SET IsTentative = 0 WHERE ExpenseID = ?', [id]);
      await queryClient.invalidateQueries({ queryKey: ['receipt', id] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error) {
      throw error;
    } finally {
      setMakePermanentModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;
    try {
      await deleteReceiptMutation.mutateAsync([receipt.ReceiptID]);
      navigate('/');
    } catch (error) {
      throw error;
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const applyFilters = () => {
    setCategoryFilter(pendingCategoryFilter);
    setEntityFilter(pendingEntityFilter);
    setExcludedFilter(pendingExcludedFilter);
    setIsFilterModalOpen(false);
  };

  const resetFilters = () => {
    setCategoryFilter('all');
    setEntityFilter('all');
    setExcludedFilter('all');
    setPendingCategoryFilter('all');
    setPendingEntityFilter('all');
    setPendingExcludedFilter('all');
  };

  const resetPendingFilters = () => {
    setPendingCategoryFilter('all');
    setPendingEntityFilter('all');
    setPendingExcludedFilter('all');
  };

  const hasActiveFilters = categoryFilter !== 'all' || entityFilter !== 'all' || excludedFilter !== 'all';
  const hasPendingFilters = pendingCategoryFilter !== 'all' || pendingEntityFilter !== 'all' || pendingExcludedFilter !== 'all';

  const activeFilterCount = [
    pendingCategoryFilter !== 'all',
    pendingEntityFilter !== 'all',
    pendingExcludedFilter !== 'all'
  ].filter(Boolean).length;

  const tableHeaders = useMemo(() => {
    const headers = [
      {label: 'Product'},
      {label: 'Category', className: 'w-32 text-right'},
      {label: 'Qty', className: 'w-24 text-right'},
      {label: 'Unit Price (€)', className: 'w-32 text-right'},
      {label: 'Total (€)', className: 'w-32 text-right'},
    ];
    if (debtEnabled && receipt?.SplitType === 'line_item') {
      headers.push({label: 'Debtor', className: 'w-40 text-right'});
    }
    return headers;
  }, [debtEnabled, receipt?.SplitType]);

  const tableRows = useMemo(() => {
    return filteredLineItems.map((item) => {
      const isDebtorUnpaid = item.DebtorID && !(payments || []).some(p => p.DebtorID === item.DebtorID);
      const row: React.ReactNode[] = [
        <div key={`product-${item.LineItemID}`} className="flex items-center gap-2">
          {(receipt?.Discount || 0) > 0 && filterOptions.hasExclusions && (
            <Tooltip content={item.IsExcludedFromDiscount ? 'Excluded from discount' : 'Included in discount'}>
              <div className={cn("w-2 h-2 rounded-full", item.IsExcludedFromDiscount ? "bg-text-disabled" : "bg-green")}></div>
            </Tooltip>
          )}
          <div>
            <p className="font-medium text-font-1">{item.ProductName}{item.ProductSize ? ` - ${item.ProductSize}${item.ProductUnitType || ''}` : ''}</p>
            <p className="text-xs text-font-2">{item.ProductBrand}</p>
          </div>
        </div>,
        <div key={`category-${item.LineItemID}`} className="text-right text-font-2">{item.CategoryName || '-'}</div>,
        <div key={`qty-${item.LineItemID}`} className="text-right text-font-1">{item.LineQuantity}</div>,
        <div key={`price-${item.LineItemID}`} className="text-right"><MoneyDisplay amount={item.LineUnitPrice} showSign={false} colorPositive={false} colorNegative={false} /></div>,
        <div key={`total-${item.LineItemID}`}
             className="text-right font-medium"><MoneyDisplay amount={item.LineQuantity * item.LineUnitPrice} showSign={false} colorPositive={false} colorNegative={false} /></div>,
      ];
      if (debtEnabled && receipt?.SplitType === 'line_item') {
        row.push(
          <div key={`debtor-${item.LineItemID}`}
               className={cn("text-right", isDebtorUnpaid ? "text-red font-medium" : "text-font-2")}>
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
    return <NotFoundState title="Expense Not Found" message="The expense you're looking for might have been deleted or moved." />;
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
          </>
        }
      />
      <PageWrapper>
        <div className="py-6 grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left Column (Notes, Filters, Images, Items) */}
          <div className="xl:col-span-2 xl:col-start-1 xl:row-start-1">
            {receipt?.ReceiptNote && (
              <Card className="mb-6">
                <div className="p-4 flex items-start gap-3">
                  <Tooltip content="Note about the contents of this page">
                    <FileText className="h-5 w-5 text-font-2 shrink-0 mt-0.5" />
                  </Tooltip>
                  <p className="text-base text-font-1 whitespace-pre-wrap break-words">{receipt.ReceiptNote}</p>
                </div>
              </Card>
            )}

            {/* Summary Card - Moved to top for responsive layout */}
            <div className="xl:hidden mb-6">
              <Card>
                <div className="p-8">
                  <div className="flex flex-col items-center gap-8">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Total Amount</p>
                      <MoneyDisplay 
                        amount={-displayTotalAmount} 
                        className="text-4xl font-bold text-font-1" 
                        colorNegative={true}
                        useSignum={true}
                        showSign={true}
                      />
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {receipt.OwedToDebtorID ? (
                        <>
                          <Tooltip content={`${receipt.OwedToDebtorName} physically paid the store/recipient for this expense.`}>
                            <Badge variant="green">Paid to recipient by {receipt.OwedToDebtorName}</Badge>
                          </Tooltip>
                          {receipt.Status === 'paid' ? (
                            <Tooltip content={`You have repaid ${receipt.OwedToDebtorName} for this expense.`}>
                              <Badge variant="green">Repaid to {receipt.OwedToDebtorName}</Badge>
                            </Tooltip>
                          ) : (
                            <Tooltip content={`Total amount is owed to ${receipt.OwedToDebtorName}.`}>
                              <Badge variant="red">Unpaid to {receipt.OwedToDebtorName}</Badge>
                            </Tooltip>
                          )}
                        </>
                      ) : (
                        <Tooltip content="This expense has been paid to the recipient.">
                          <Badge variant="green">Paid to Recipient</Badge>
                        </Tooltip>
                      )}
                      {debtStatus && (
                        <Tooltip content="This indicates the status of debts owed to you by others for this receipt.">
                          <Badge variant={debtStatus.variant} className="cursor-help">{debtStatus.label}</Badge>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-8 border-t border-border w-full">
                      {receipt?.StoreName && (
                        <Tooltip content="The recipient where this expense was incurred">
                          <div className="flex items-center gap-3 cursor-help">
                            <Store className="h-5 w-5 text-font-2"/>
                            <span className="text-sm text-font-1">{receipt.StoreName}</span>
                          </div>
                        </Tooltip>
                      )}
                      {receipt?.ReceiptDate && (
                        <Tooltip content="The date this expense was incurred">
                          <div className="flex items-center gap-3 cursor-help">
                            <Calendar className="h-5 w-5 text-font-2"/>
                            <span className="text-sm text-font-1">{format(parseISO(receipt.ReceiptDate), 'MMM d, yyyy')}</span>
                          </div>
                        </Tooltip>
                      )}
                      {paymentMethodsEnabled && (
                        <Tooltip content="The method used for this expense">
                          <div className="flex items-center gap-3 cursor-help">
                            <CreditCard className="h-5 w-5 text-font-2"/>
                            {receipt.PaymentMethodID ? (
                              <Link to={`/payment-methods/${receipt.PaymentMethodID}`} className="text-sm text-font-1 hover:underline flex items-center gap-1 group">
                                {receipt.PaymentMethodName}
                                <LinkIcon className="h-3.5 w-3.5 text-font-2 group-hover:text-accent" />
                              </Link>
                            ) : (
                              <span className="text-sm text-font-1">N/A</span>
                            )}
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {!!receipt.IsTentative && (
              <Card className="p-4 border-border bg-accent/5 mb-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-accent" />
                    <div>
                      <h4 className="text-sm font-semibold text-font-1">Tentative Expense</h4>
                      <p className="text-xs text-font-2">This is a draft expense. It won't affect analytics or debts until made permanent.</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setMakePermanentModalOpen(true)}>Make Permanent</Button>
                </div>
              </Card>
            )}

            {images.length > 0 && (
              <Card className="mb-6">
                <div className="p-6">
                  <Gallery images={images.map(i => i.src) as (string | { src: string })[]}/>
                </div>
              </Card>
            )}

            {receipt.IsNonItemised ? (
              <Card className="overflow-hidden">
                <div className="relative p-6">
                  <div className="blur-sm">
                    <NanoDataTable
                      headers={[
                        {label: 'Product'},
                        {label: 'Qty', className: 'w-24 text-center'},
                        {label: 'Unit Price (€)', className: 'w-32 text-right'},
                        {label: 'Total (€)', className: 'w-32 text-right'},
                      ]}
                      rows={[]} // Empty rows to trigger "No results found" for non-itemised
                    />
                  </div>
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-bg/30 backdrop-blur-sm">
                    <Info className="h-12 w-12 text-font-2"/>
                    <h3 className="mt-2 text-lg font-semibold text-font-1">Total-only Expense</h3>
                    <p className="mt-1 text-sm text-font-2">Only the total amount was recorded for this expense.</p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="p-6">
                  <div className="flex justify-end items-center mb-4">
                    <ButtonGroup>
                      <Tooltip content="Filters">
                        <Button variant={hasActiveFilters ? "primary" : "secondary"} size="icon" onClick={() => setIsFilterModalOpen(true)}>
                          <Filter className="h-4 w-4"/>
                        </Button>
                      </Tooltip>
                      <Tooltip content="Reset Filters">
                        <Button variant="secondary" size="icon" onClick={resetFilters} disabled={!hasActiveFilters}>
                          <RotateCcw className="h-4 w-4"/>
                        </Button>
                      </Tooltip>
                    </ButtonGroup>
                  </div>
                  <NanoDataTable
                    headers={tableHeaders}
                    rows={tableRows}
                  />
                </div>
                <div className="px-6 py-4 rounded-b-xl">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-4 text-font-2">
                      <span className="text-sm">Subtotal</span>
                      <MoneyDisplay amount={displaySubtotal} showSign={false} colorPositive={false} colorNegative={false} className="font-medium" />
                    </div>
                    <div className="flex items-center gap-4 text-font-2">
                      {(receipt?.Discount || 0) > 0 && filterOptions.hasExclusions ? (
                        <Tooltip content="Some items are excluded from this discount. You can see which items are excluded by the gray dot next to the product name.">
                          <div className="flex items-center gap-1 cursor-help">
                            <AlertTriangle className="h-4 w-4 text-yellow"/>
                            <span className="text-sm underline decoration-dotted">
                              Discount ({receipt.Discount || 0}%)
                            </span>
                          </div>
                        </Tooltip>
                      ) : (
                        <span className="text-sm">Discount ({receipt?.Discount || 0}%)</span>
                      )}
                      <span className="font-medium">-<MoneyDisplay amount={displaySubtotal - displayTotalAmount} showSign={false} colorPositive={false} colorNegative={false} /></span>
                    </div>
                    <div className="flex items-center gap-4 text-lg font-bold text-font-1">
                      <span>Total</span>
                      <MoneyDisplay amount={displayTotalAmount} showSign={false} colorPositive={false} colorNegative={false} />
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column (Summary, Debt) */}
          <div className="col-span-1 space-y-6 xl:col-start-3">
            <Card className="hidden xl:block">
              <div className="p-8">
                <div className="flex flex-col items-center gap-8">

                  {/* Total Amount */}
                  <div className="text-center">
                    <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Total Amount</p>
                    <MoneyDisplay 
                      amount={-displayTotalAmount} 
                      className="text-4xl font-bold text-font-1" 
                      colorNegative={true}
                      useSignum={true}
                      showSign={true}
                    />
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {receipt.OwedToDebtorID ? (
                      <>
                        <Tooltip content={`${receipt.OwedToDebtorName} physically paid the store/recipient for this expense.`}>
                          <Badge variant="green">Paid to recipient by {receipt.OwedToDebtorName}</Badge>
                        </Tooltip>
                        {receipt.Status === 'paid' ? (
                          <Tooltip content={`You have repaid ${receipt.OwedToDebtorName} for this expense.`}>
                            <Badge variant="green">Repaid to {receipt.OwedToDebtorName}</Badge>
                          </Tooltip>
                        ) : (
                          <Tooltip content={`Total amount is owed to ${receipt.OwedToDebtorName}.`}>
                            <Badge variant="red">Unpaid to {receipt.OwedToDebtorName}</Badge>
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      <Tooltip content="This expense has been paid to the recipient.">
                        <Badge variant="green">Paid to Recipient by Me</Badge>
                      </Tooltip>
                    )}
                    {debtStatus && (
                      <Tooltip content="This indicates the status of debts owed to you by others for this receipt.">
                        <Badge variant={debtStatus.variant} className="cursor-help">
                          {debtStatus.label}
                        </Badge>
                      </Tooltip>
                    )}
                  </div>

                  {/* Rest (Attributes) */}
                  <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-8 border-t border-border w-full">
                    {receipt?.StoreName && (
                      <Tooltip content="The recipient where this expense was incurred">
                        <div className="flex items-center gap-3 cursor-help">
                          <Store className="h-5 w-5 text-font-2"/>
                          <span className="text-sm text-font-1">{receipt.StoreName}</span>
                        </div>
                      </Tooltip>
                    )}
                    {receipt?.ReceiptDate && (
                      <Tooltip content="The date this expense was incurred">
                        <div className="flex items-center gap-3 cursor-help">
                          <Calendar className="h-5 w-5 text-font-2"/>
                          <span className="text-sm text-font-1">{format(parseISO(receipt.ReceiptDate), 'MMM d, yyyy')}</span>
                        </div>
                      </Tooltip>
                    )}
                    {paymentMethodsEnabled && (
                      <Tooltip content="The method used for this expense">
                        <div className="flex items-center gap-3 cursor-help">
                          <CreditCard className="h-5 w-5 text-font-2"/>
                          {receipt.PaymentMethodID ? (
                            <Link to={`/payment-methods/${receipt.PaymentMethodID}`} className="text-sm text-font-1 hover:underline flex items-center gap-1 group">
                              {receipt.PaymentMethodName}
                              <LinkIcon className="h-3.5 w-3.5 text-font-2 group-hover:text-accent" />
                            </Link>
                          ) : (
                            <span className="text-sm text-font-1">N/A</span>
                          )}
                        </div>
                      </Tooltip>
                    )}
                    {!receipt?.IsNonItemised && (
                      <>
                        <Tooltip content="Number of unique items in this receipt">
                          <div className="flex items-center gap-3 cursor-help">
                            <Tag className="h-5 w-5 text-font-2"/>
                            <span className="text-sm text-font-1">{displayTotalItems} Unique Items</span>
                          </div>
                        </Tooltip>
                        <Tooltip content="Total quantity of all items purchased">
                          <div className="flex items-center gap-3 cursor-help">
                            <ShoppingCart className="h-5 w-5 text-font-2"/>
                            <span className="text-sm text-font-1">{displayTotalQuantity} Total Quantity</span>
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
                  {(debtSummary && (debtSummary.debtors.length > 0 || debtSummary.ownShare || receipt?.OwedToDebtorID)) ? (
                    <>
                      {receipt?.OwedToDebtorID && (
                        <Card
                          className={cn(
                            "p-4 border-2 border-border",
                            receipt.Status === 'paid' ? "bg-green/5" : "bg-red/5",
                            !receipt?.IsTentative && "cursor-pointer hover:border-accent/50"
                          )}
                          onClick={() => {
                            if (receipt.Status === 'unpaid') {
                              setIsMarkAsPaidModalOpen(true);
                            } else {
                              confirmUnsettleDebt(null, undefined, 'me');
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <ArrowDownLeft className={cn("h-4 w-4", receipt.Status === 'paid' ? "text-green" : "text-red")} />
                                <span className="text-xs font-semibold text-font-2 uppercase tracking-wider">Debt (Me)</span>
                              </div>
                              <Link to={`/entities/${receipt.OwedToDebtorID}`}
                                    className="font-medium hover:underline flex items-center gap-1.5 group"
                                    onClick={(e) => e.stopPropagation()}>
                                <span className="text-font-1">{receipt.OwedToDebtorName}</span>
                                <LinkIcon className="h-4 w-4 text-font-2 group-hover:text-accent"/>
                              </Link>
                            </div>
                            <div className="flex items-center">
                              {receipt.Status === 'paid' ? (
                                <CheckCircle className="h-5 w-5 text-green"/>
                              ) : (
                                <Tooltip content={receipt?.IsTentative ? "Cannot settle debts for tentative expenses" : "Unpaid"}>
                                  <AlertCircle className={cn("h-5 w-5", receipt?.IsTentative ? "text-text-disabled" : "text-red")}/>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-baseline mt-1">
                            <p className={cn("font-bold truncate", receipt.Status === 'paid' ? "text-green" : (receipt?.IsTentative ? "text-text-disabled" : "text-red"))}
                               style={{fontSize: '1.5rem', lineHeight: '2rem'}}>
                              <MoneyDisplay amount={displayTotalAmount} showSign={false} colorPositive={false} colorNegative={false} />
                            </p>
                            <div className="text-right flex-shrink-0 pl-2">
                              <p className="text-sm text-font-2">Repayment</p>
                            </div>
                          </div>
                        </Card>
                      )}

                      {debtSummary.debtors.map((debtor) => (
                        <Card
                          key={debtor.debtorId}
                          className={cn(
                            "p-4 border-2 border-border",
                            debtor.isPaid ? "bg-green/5" : "bg-red/5",
                            !receipt?.IsTentative && "cursor-pointer hover:border-accent/50"
                          )}
                          onClick={() => handleSettleClick(debtor)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <ArrowUpRight className={cn("h-4 w-4", debtor.isPaid ? "text-green" : "text-red")} />
                                <span className="text-xs font-semibold text-font-2 uppercase tracking-wider">Debt (Them)</span>
                              </div>
                              <Link to={`/entities/${debtor.debtorId}`}
                                    className="font-medium hover:underline flex items-center gap-1.5 group"
                                    onClick={(e) => e.stopPropagation()}>
                                <span className="text-font-1">{debtor.name}</span>
                                <LinkIcon className="h-4 w-4 text-font-2 group-hover:text-accent"/>
                              </Link>
                            </div>
                            <div className="flex items-center">
                              {debtor.isPaid ? (
                                <Tooltip content={`Paid on ${payments.find(p => p.DebtorID === debtor.debtorId)?.PaidDate}`}>
                                  <CheckCircle className="h-5 w-5 text-green"/>
                                </Tooltip>
                              ) : (
                                <Tooltip content={receipt?.IsTentative ? "Cannot settle debts for tentative expenses" : "Unpaid"}>
                                  <AlertCircle className={cn("h-5 w-5", receipt?.IsTentative ? "text-text-disabled" : "text-red")}/>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-baseline mt-1">
                            <p className={cn("font-bold truncate", debtor.isPaid ? "text-green" : (receipt?.IsTentative ? "text-text-disabled" : "text-red"))}
                               style={{fontSize: '1.5rem', lineHeight: '2rem'}}>
                              <MoneyDisplay amount={debtor.amount} showSign={false} colorPositive={false} colorNegative={false} />
                            </p>
                            <div className="text-right flex-shrink-0 pl-2">
                              {receipt?.SplitType === 'total_split' &&
                                <p className="text-sm text-font-2">{debtor.shares} / {debtor.totalShares} shares</p>}
                              {receipt?.SplitType === 'line_item' && !receipt.IsNonItemised &&
                                <p className="text-sm text-font-2">{debtor.itemCount} / {displayTotalItems} items</p>}
                            </div>
                          </div>
                        </Card>
                      ))}
                      {!!debtSummary.ownShare && (
                        <Card className="p-4 border-2 border-border bg-field/5">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="h-4 w-4 text-font-2" />
                                <span className="text-xs font-semibold text-font-2 uppercase tracking-wider">Own Share</span>
                              </div>
                              <p className="font-medium text-font-1">Me</p>
                            </div>
                            <div className="flex items-center">
                               <CheckCircle className="h-5 w-5 text-font-2"/>
                            </div>
                          </div>
                          <div className="flex justify-between items-baseline mt-1">
                            <p className="font-bold text-font-2 truncate"
                               style={{fontSize: '1.5rem', lineHeight: '2rem'}}>
                              <MoneyDisplay amount={debtSummary.ownShare.amount} showSign={false} colorPositive={false} colorNegative={false} />
                            </p>
                            <div className="text-right flex-shrink-0 pl-2">
                              <p className="text-sm text-font-2">
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
                          <div className="h-24 bg-field-disabled rounded-xl w-full border border-border flex flex-col p-4 justify-between">
                            <div className="flex justify-between items-start">
                              <div className="h-4 w-24 bg-field rounded"></div>
                              <div className="h-5 w-5 bg-field rounded-full"></div>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <div className="h-8 w-20 bg-field rounded"></div>
                              <div className="h-4 w-16 bg-field rounded"></div>
                            </div>
                          </div>
                          <div className="h-24 bg-field-disabled rounded-xl w-full border border-border flex flex-col p-4 justify-between">
                            <div className="flex justify-between items-start">
                              <div className="h-4 w-24 bg-field rounded"></div>
                              <div className="h-5 w-5 bg-field rounded-full"></div>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <div className="h-8 w-20 bg-field rounded"></div>
                              <div className="h-4 w-16 bg-field rounded"></div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/30 backdrop-blur-sm">
                          <span className="text-font-2 font-medium">No debts owed for this expense.</span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </PageWrapper>

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={applyFilters}
        onResetAll={resetPendingFilters}
        filterCount={activeFilterCount}
        hasActiveFilters={hasPendingFilters}
      >
        <FilterOption
          title="Category"
          onReset={() => setPendingCategoryFilter('all')}
          isModified={pendingCategoryFilter !== 'all'}
        >
          <Select
            options={[{value: 'all', label: 'All Categories'}, ...filterOptions.categories]}
            value={pendingCategoryFilter}
            onChange={e => setPendingCategoryFilter(e.target.value)}
          />
        </FilterOption>

        {filterOptions.entities.length > 0 && (
          <FilterOption
            title="Entity"
            onReset={() => setPendingEntityFilter('all')}
            isModified={pendingEntityFilter !== 'all'}
          >
            <Select
              options={[{value: 'all', label: 'All Entities'}, ...filterOptions.entities]}
              value={pendingEntityFilter}
              onChange={e => setPendingEntityFilter(e.target.value)}
            />
          </FilterOption>
        )}

        {filterOptions.hasExclusions && (
          <FilterOption
            title="Discount Exclusion"
            onReset={() => setPendingExcludedFilter('all')}
            isModified={pendingExcludedFilter !== 'all'}
          >
            <Select
              options={[
                {value: 'all', label: 'Included & Excluded'},
                {value: 'yes', label: 'Excluded Only'},
                {value: 'no', label: 'Included Only' }
              ]}
              value={pendingExcludedFilter}
              onChange={e => setPendingExcludedFilter(e.target.value)}
            />
          </FilterOption>
        )}
      </FilterModal>

      <DebtSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSave={async () => {
          await queryClient.invalidateQueries({ queryKey: ['receipt', id] });
          await queryClient.invalidateQueries({ queryKey: ['transactions'] });
          await queryClient.invalidateQueries({ queryKey: ['receiptDebt', id] });
          await queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
        }}
        debtInfo={selectedDebtForSettlement}
      />

      <ConfirmModal
        isOpen={unsettleConfirmation.isOpen}
        onClose={() => setUnsettleConfirmation({isOpen: false, paymentId: null, topUpId: null, type: 'them'})}
        onConfirm={handleUnsettleDebt}
        title="Unsettle Debt"
        message={`Are you sure you want to mark this debt as unpaid?`}
        confirmText="Confirm"
        variant="primary"
        isDatabaseTransaction
        successToastMessage="Debt unsettled successfully"
        errorToastMessage="Failed to unsettle debt"
      />

      <MarkAsPaidModal
        isOpen={isMarkAsPaidModalOpen}
        onClose={() => setIsMarkAsPaidModalOpen(false)}
        onConfirm={handleMarkAsPaid}
        paymentMethods={(activePaymentMethods || []).map(pm => ({value: pm.PaymentMethodID, label: pm.PaymentMethodName}))}
      />

      <ConfirmModal
        isOpen={makePermanentModalOpen}
        onClose={() => setMakePermanentModalOpen(false)}
        onConfirm={handleMakePermanent}
        title="Make Expense Permanent"
        message="Are you sure you want to make this expense permanent? This action is irreversible."
        confirmText="Confirm"
        isDatabaseTransaction
        successToastMessage="Expense made permanent"
        errorToastMessage="Failed to make expense permanent"
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Are you sure you want to permanently delete this expense? This action cannot be undone."
        isDatabaseTransaction
        successToastMessage="Expense deleted successfully"
        errorToastMessage="Failed to delete expense"
        loadingMessage="Deleting expense..."
      />
    </div>
  );
};

export default ReceiptViewPage;
