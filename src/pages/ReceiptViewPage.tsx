import React, {useState, useMemo} from 'react';
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
  Paperclip
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
  const {receipt, lineItems, images: rawImages, splits: receiptSplits, payments} = data || {};

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

  const subtotal = useMemo(() => (lineItems || []).reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0), [lineItems]);
  const totalAmount = useMemo(() => {
    if (receipt?.IsNonItemised) {
      return receipt.NonItemisedTotal || 0;
    }
    return calculateTotalWithDiscount(lineItems || [], receipt?.Discount || 0);
  }, [receipt, lineItems]);

  const debtSummary = useMemo(() => {
    if (!debtEnabled || !receipt || !receiptSplits || !lineItems) return {debtors: [], ownShare: null};

    const summary: Record<string, any> = {};
    let ownShare: any = null;

    if (receipt.SplitType === 'total_split' && (receiptSplits.length > 0 || (receipt.OwnShares && receipt.OwnShares > 0))) {
      const totalShares = receipt.TotalShares && receipt.TotalShares > 0
        ? receipt.TotalShares
        : receiptSplits.reduce((acc, curr) => acc + curr.SplitPart, 0) + (receipt.OwnShares || 0);

      receiptSplits.forEach(split => {
        const amount = (totalAmount * split.SplitPart) / totalShares;
        summary[split.DebtorID] = {
          name: split.DebtorName,
          amount: (summary[split.DebtorID]?.amount || 0) + amount,
          debtorId: split.DebtorID,
          shares: split.SplitPart,
          totalShares: totalShares,
        };
      });

      if (receipt.OwnShares && receipt.OwnShares > 0) {
        const ownAmount = (totalAmount * receipt.OwnShares) / totalShares;
        ownShare = {
          amount: ownAmount,
          shares: receipt.OwnShares,
          totalShares: totalShares,
        };
      }
    } else if (receipt.SplitType === 'line_item' && !receipt.IsNonItemised) {
      const debtorItems: Record<string, { count: number, total: number }> = {};

      lineItems.forEach(item => {
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
            totalItems: lineItems.length,
          };
        }
      });
    }
    return {debtors: Object.values(summary), ownShare};
  }, [lineItems, receipt, receiptSplits, debtEnabled, totalAmount]);

  const totalItems = lineItems?.length || 0;
  const totalQuantity = (lineItems || []).reduce((total, item) => total + item.LineQuantity, 0);

  const handleSavePdf = async () => {
    if (!receipt) return;

    const fullReceipt = {
      ...receipt,
      lineItems: lineItems || [],
      images: images,
      totalAmount: totalAmount
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
        <div className="py-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {!!receipt.IsTentative && (
              <InfoCard
                variant="info"
                title="Tentative Expense"
                message="This is a draft expense. It won't affect analytics or debts until made permanent."
              >
                <Button onClick={() => setMakePermanentModalOpen(true)}>Make Permanent</Button>
              </InfoCard>
            )}

            {!!receipt.ReceiptNote && (
              <Card>
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-2">Note</h2>
                  <p className="text-gray-600 dark:text-gray-300">{receipt.ReceiptNote}</p>
                </div>
              </Card>
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
                    <table className="w-full text-sm select-none">
                      <thead className="text-left text-gray-500">
                      <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2 w-24 text-center">Qty</th>
                        <th className="p-2 w-32 text-right">Unit Price (€)</th>
                        <th className="p-2 w-32 text-right">Total (€)</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-800">
                      {Array.from({length: 6}).map((_, i) => (
                        <tr key={i}>
                          <td className="p-2" colSpan={4}>&nbsp;</td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
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
              <Card>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm select-none">
                      <thead className="text-left text-gray-500">
                      <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2 w-24 text-center">Qty</th>
                        <th className="p-2 w-32 text-right">Unit Price (€)</th>
                        <th className="p-2 w-32 text-right">Total (€)</th>
                        {debtEnabled && receipt.SplitType === 'line_item' &&
                          <th className="p-2 w-40 text-right">Debtor</th>}
                      </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-800">
                      {(lineItems || []).map((item) => {
                        const isDebtorUnpaid = item.DebtorID && !(payments || []).some(p => p.DebtorID === item.DebtorID);
                        return (
                          <tr key={item.LineItemID}>
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                {receipt.Discount > 0 && (
                                  <Tooltip content={item.IsExcludedFromDiscount ? 'Excluded from discount' : 'Included in discount'}>
                                    <div className={cn("w-2 h-2 rounded-full", item.IsExcludedFromDiscount ? "bg-gray-400" : "bg-green-500")}></div>
                                  </Tooltip>
                                )}
                                <div>
                                  <p className="font-medium">{item.ProductName}{item.ProductSize ? ` - ${item.ProductSize}${item.ProductUnitType || ''}` : ''}</p>
                                  <p className="text-xs text-gray-500">{item.ProductBrand}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-center">{item.LineQuantity}</td>
                            <td className="p-2 text-right">{(item.LineUnitPrice).toFixed(2)}</td>
                            <td className="p-2 text-right font-medium">
                              {(item.LineQuantity * item.LineUnitPrice).toFixed(2)}
                            </td>
                            {debtEnabled && receipt.SplitType === 'line_item' && (
                              <td className={cn("p-2 text-right", isDebtorUnpaid ? "text-red font-medium" : "text-gray-600 dark:text-gray-400")}>
                                {item.DebtorName || '-'}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 rounded-b-xl">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-4 text-gray-500">
                      <span className="text-sm">Subtotal</span>
                      <span className="font-medium">€{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-500">
                      <span className="text-sm">Discount ({receipt.Discount || 0}%)</span>
                      <span className="font-medium">-€{(subtotal - totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-lg font-bold">
                      <span>Total</span>
                      <span>€{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="col-span-1 space-y-6">
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold">€{totalAmount.toFixed(2)}</p>
                  </div>
                  <Tooltip content={receipt.Status === 'paid' ? 'This expense has been paid for.' : `Total amount is owed to ${receipt.OwedToDebtorName}.`}>
                    <span
                      className={cn(
                        'px-2 inline-flex text-xs leading-5 font-semibold rounded-full border',
                        receipt.Status === 'paid'
                          ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-100 dark:border-green-700'
                          : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-700'
                      )}
                    >
                      {receipt.Status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </Tooltip>
                </div>
                <div className="mt-6 space-y-4">
                  {paymentMethodsEnabled && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-gray-400"/>
                      <span className="text-sm">{receipt.PaymentMethodName || 'N/A'}</span>
                    </div>
                  )}
                  {images.length > 0 && (
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-5 w-5 text-gray-400" />
                      <span className="text-sm">{images.length} attachment{images.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {!receipt.IsNonItemised && (
                    <>
                      <div className="flex items-center gap-3">
                        <Tag className="h-5 w-5 text-gray-400"/>
                        <span className="text-sm">{totalItems} Unique Items</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 text-gray-400"/>
                        <span className="text-sm">{totalQuantity} Total Quantity</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {debtEnabled && receipt.SplitType !== 'none' && (debtSummary.debtors.length > 0 || debtSummary.ownShare) && (
              <div>
                <Divider text="Debt Breakdown"/>
                <div className="space-y-2 mt-4">
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
                          <div className="flex items-center justify-center w-40">
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
                            {receipt.SplitType === 'total_split' &&
                              <p className="text-sm text-gray-500">{debtor.shares} / {debtor.totalShares} shares</p>}
                            {receipt.SplitType === 'line_item' && !receipt.IsNonItemised &&
                              <p className="text-sm text-gray-500">{debtor.itemCount} / {totalItems} items</p>}
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
                </div>
              </div>
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
