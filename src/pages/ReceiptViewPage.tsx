import React, {useState, useEffect, useMemo} from 'react';
import {useParams, useNavigate, Link} from 'react-router-dom';
import {format, parseISO} from 'date-fns';
import {db} from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Gallery from '../components/ui/Gallery';
import {
  PencilIcon,
  ShoppingCartIcon,
  TagIcon,
  CurrencyEuroIcon,
  DocumentArrowDownIcon,
  CreditCardIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserIcon,
  BanknotesIcon,
  LinkIcon,
  TrashIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/solid';
import {generateReceiptsPdf} from '../utils/pdfGenerator';
import {useSettings} from '../context/SettingsContext';
import {useError} from '../context/ErrorContext';
import {cn} from '../utils/cn';
import DebtSettlementModal from '../components/debt/DebtSettlementModal';
import Tooltip from '../components/ui/Tooltip';
import Modal, {ConfirmModal} from '../components/ui/Modal';
import Select from '../components/ui/Select';
import {Receipt, LineItem, ReceiptImage, ReceiptSplit, ReceiptDebtorPayment} from '../types';
import InfoCard from '../components/ui/InfoCard';
import {useDebtCalculation} from '../hooks/useDebtCalculation';
import {Header} from '../components/ui/Header';

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

interface ReceiptViewPageProps {
  openSettingsModal: (tab: string) => void;
}

const ReceiptViewPage: React.FC<ReceiptViewPageProps> = ({openSettingsModal}) => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [images, setImages] = useState<ReceiptImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const {settings} = useSettings();
  const {showError} = useError();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;
  const {calculate: calculateDebt} = useDebtCalculation();

  const [splitType, setSplitType] = useState<'none' | 'total_split' | 'line_item'>('none');
  const [receiptSplits, setReceiptSplits] = useState<ReceiptSplit[]>([]);
  const [payments, setPayments] = useState<ReceiptDebtorPayment[]>([]);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [selectedDebtForSettlement, setSelectedDebtForSettlement] = useState<any>(null);
  const [unsettleConfirmation, setUnsettleConfirmation] = useState<{
    isOpen: boolean,
    paymentId: number | null,
    topUpId: number | null
  }>({isOpen: false, paymentId: null, topUpId: null});
  const [isMarkAsPaidModalOpen, setIsMarkAsPaidModalOpen] = useState<boolean>(false);
  const [paymentMethods, setPaymentMethods] = useState<{ value: number; label: string }[]>([]);
  const [makePermanentModalOpen, setMakePermanentModalOpen] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  const fetchReceiptData = async () => {
    setLoading(true);
    try {
      const receiptData = await db.queryOne<Receipt>(`
          SELECT r.*, s.StoreName, pm.PaymentMethodName, d.DebtorName as OwedToDebtorName
          FROM Receipts r
                   JOIN Stores s ON r.StoreID = s.StoreID
                   LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
                   LEFT JOIN Debtors d ON r.OwedToDebtorID = d.DebtorID
          WHERE r.ReceiptID = ?
      `, [id]);

      if (receiptData) {
        setReceipt(receiptData);
        setSplitType(receiptData.SplitType || 'none');

        if (!receiptData.IsNonItemised) {
          const lineItemData = await db.query<LineItem[]>(`
              SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorName, d.DebtorID
              FROM LineItems li
                       JOIN Products p ON li.ProductID = p.ProductID
                       LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
                       LEFT JOIN Debtors d ON li.DebtorID = d.DebtorID
              WHERE li.ReceiptID = ?
          `, [id]);
          setLineItems(lineItemData);
        }

        const imageData = await db.query<{
          ImagePath: string
        }[]>('SELECT ImagePath FROM ReceiptImages WHERE ReceiptID = ?', [id]);
        if (window.electronAPI && settings.datastore.folderPath) {
          setImages(imageData.map(img => ({
            key: img.ImagePath,
            ImagePath: img.ImagePath,
            src: `local-file://${settings.datastore.folderPath}/receipt_images/${img.ImagePath}`
          })));
        }

        if (debtEnabled) {
          if (receiptData.SplitType === 'total_split') {
            const splitsData = await db.query<ReceiptSplit[]>(`
                SELECT rs.*, d.DebtorName
                FROM ReceiptSplits rs
                         JOIN Debtors d ON rs.DebtorID = d.DebtorID
                WHERE rs.ReceiptID = ?
            `, [id]);
            setReceiptSplits(splitsData);
          }

          const paymentsData = await db.query<ReceiptDebtorPayment[]>('SELECT * FROM ReceiptDebtorPayments WHERE ReceiptID = ?', [id]);
          setPayments(paymentsData);
        }

        if (paymentMethodsEnabled) {
          const pmData = await db.query<{
            PaymentMethodID: number,
            PaymentMethodName: string
          }[]>('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName');
          setPaymentMethods(pmData.map(pm => ({value: pm.PaymentMethodID, label: pm.PaymentMethodName})));
        }
      }
    } catch (error) {
      showError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings.datastore.folderPath || !window.electronAPI) {
      fetchReceiptData();
    } else {
      setLoading(false);
    }
  }, [id, showError, settings.datastore.folderPath, debtEnabled]);

  const subtotal = useMemo(() => lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0), [lineItems]);
  const totalAmount = useMemo(() => {
    if (receipt?.IsNonItemised) {
      return receipt.NonItemisedTotal || 0;
    }
    const discountPercentage = receipt?.Discount || 0;
    if (discountPercentage === 0) return subtotal;

    const discountableAmount = lineItems.reduce((sum, item) => {
      if (!item.IsExcludedFromDiscount) {
        return sum + (item.LineQuantity * item.LineUnitPrice);
      }
      return sum;
    }, 0);

    const discountAmount = (discountableAmount * discountPercentage) / 100;
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, receipt, lineItems]);

  const debtSummary = useMemo(() => {
    if (!debtEnabled || !receipt) return {debtors: [], ownShare: null};

    const summary: Record<string, any> = {};
    let ownShare: any = null;

    if (splitType === 'total_split' && (receiptSplits.length > 0 || (receipt.OwnShares && receipt.OwnShares > 0))) {
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
    } else if (splitType === 'line_item' && !receipt.IsNonItemised) {
      const debtorItems: Record<string, { count: number, total: number }> = {};
      const discountPercentage = receipt.Discount || 0;
      const discountFactor = 1 - (discountPercentage / 100);

      lineItems.forEach(item => {
        if (item.DebtorID) {
          let itemAmount = item.LineQuantity * item.LineUnitPrice;
          if (discountPercentage > 0 && !item.IsExcludedFromDiscount) {
            itemAmount *= discountFactor;
          }

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
  }, [lineItems, receipt, receiptSplits, splitType, debtEnabled, totalAmount]);

  const totalItems = lineItems.length;
  const totalQuantity = lineItems.reduce((total, item) => total + item.LineQuantity, 0);

  const handleSavePdf = async () => {
    if (!receipt) return;

    const fullReceipt = {
      ...receipt,
      lineItems: lineItems,
      images: images,
      totalAmount: totalAmount
    };

    await generateReceiptsPdf([fullReceipt], settings.pdf);
  };

  const handleSettleClick = (debtor: any) => {
    const payment = payments.find(p => p.DebtorID === debtor.debtorId);
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
      fetchReceiptData();
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
      fetchReceiptData();
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
      fetchReceiptData();
    } catch (error) {
      showError(error as Error);
    } finally {
      setMakePermanentModalOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;
    try {
      await db.execute('DELETE FROM Receipts WHERE ReceiptID = ?', [id]);
      navigate('/receipts');
    } catch (error) {
      showError(error as Error);
    } finally {
      setDeleteModalOpen(false);
    }
  };

  if (!settings.datastore.folderPath && window.electronAPI) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <InfoCard
          variant="warning"
          title="Datastore Not Configured"
          message="Please set the datastore folder in the settings to view receipts and their images."
        >
          <Button onClick={() => openSettingsModal('data')}>Go to Settings</Button>
        </InfoCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner className="h-8 w-8 text-accent"/>
      </div>
    );
  }

  if (!receipt) {
    return <div className="text-center">Receipt not found.</div>;
  }

  return (
    <div>
      <Header
        title={receipt.StoreName}
        subtitle={format(parseISO(receipt.ReceiptDate), 'EEEE, MMMM d, yyyy')}
        contentClassName="max-w-7xl mx-auto px-4"
        backButton={
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeftIcon className="h-5 w-5"/>
          </Button>
        }
        actions={
          <div className="flex gap-2">
            {receipt.Status === 'unpaid' && (
              <Tooltip content="Mark as Paid">
                <Button variant="minimal" onClick={() => setIsMarkAsPaidModalOpen(true)}>
                  <BanknotesIcon className="h-5 w-5 mr-2"/>
                </Button>
              </Tooltip>
            )}

            <Tooltip content="Save as PDF">
              <Button variant="minimal" onClick={handleSavePdf}>
                <DocumentArrowDownIcon className="h-5 w-5 mr-2"/>
              </Button>
            </Tooltip>

            <Tooltip content="Edit">
              <Button variant="minimal" onClick={() => navigate(`/receipts/edit/${id}`)}>
                <PencilIcon className="h-5 w-5 mr-2"/>

              </Button>
            </Tooltip>

            <Tooltip content="Delete">
              <Button variant="minimal" onClick={() => setDeleteModalOpen(true)}>
                <TrashIcon className="h-5 w-5 mr-2"/>
              </Button>
            </Tooltip>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6 max-w-7xl mx-auto px-4 pt-6 pb-12">
        <div className="col-span-2 space-y-6">
          {!!receipt.IsTentative && (
            <InfoCard
              variant="info"
              title="Tentative Receipt"
              message="This is a draft receipt. It won't affect analytics or debts until made permanent."
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
                <h2 className="text-lg font-semibold mb-4">Images</h2>
                <Gallery images={images}/>
              </div>
            </Card>
          )}

          {receipt.IsNonItemised ? (
            <Card>
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
                  <InformationCircleIcon className="h-12 w-12 text-gray-400 dark:text-gray-500"/>
                  <h3 className="mt-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Item-less
                                                                                              Receipt</h3>
                  <p className="mt-1 text-sm text-gray-500">Only the total amount was recorded for this
                                                            receipt.</p>
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
                      {debtEnabled && splitType === 'line_item' && <th className="p-2 w-40 text-right">Debtor</th>}
                    </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                    {lineItems.map((item) => {
                      const isDebtorUnpaid = item.DebtorID && !payments.some(p => p.DebtorID === item.DebtorID);
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
                          {debtEnabled && splitType === 'line_item' && (
                            <td className={cn("p-2 text-right", isDebtorUnpaid ? "text-red-600 font-medium" : "text-gray-600 dark:text-gray-400")}>
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
                <Tooltip content={receipt.Status === 'paid' ? 'This receipt has been paid for.' : `Total amount is owed to ${receipt.OwedToDebtorName}.`}>
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
                    <CreditCardIcon className="h-5 w-5 text-gray-400"/>
                    <span className="text-sm">{receipt.PaymentMethodName || 'N/A'}</span>
                  </div>
                )}
                {!receipt.IsNonItemised && (
                  <>
                    <div className="flex items-center gap-3">
                      <TagIcon className="h-5 w-5 text-gray-400"/>
                      <span className="text-sm">{totalItems} Unique Items</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShoppingCartIcon className="h-5 w-5 text-gray-400"/>
                      <span className="text-sm">{totalQuantity} Total Quantity</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>

          {debtEnabled && splitType !== 'none' && (debtSummary.debtors.length > 0 || debtSummary.ownShare) && (
            <div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700"/>
                </div>
                <div className="relative flex justify-center">
                  <span className=" px-2 text-sm text-gray-500">Debt Breakdown</span>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {debtSummary.debtors.map((debtor) => {
                  const payment = payments.find(p => p.DebtorID === debtor.debtorId);
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
                              <CheckCircleIcon className="h-5 w-5 text-green-400 dark:text-green-400"/>
                            </Tooltip>
                          ) : (
                            <Tooltip content="Unpaid">
                              <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400"/>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline mt-1">
                        <p className={cn("font-bold truncate", isPaid ? "text-green-500 dark:text-green-300" : "text-red-500 dark:text-red-400")}
                           style={{fontSize: '1.5rem', lineHeight: '2rem'}}>
                          €{debtor.amount.toFixed(2)}
                        </p>
                        <div className="text-right flex-shrink-0 pl-2">
                          {splitType === 'total_split' &&
                            <p className="text-sm text-gray-500">{debtor.shares} / {debtor.totalShares} shares</p>}
                          {splitType === 'line_item' && !receipt.IsNonItemised &&
                            <p className="text-sm text-gray-500">{debtor.itemCount} / {debtor.totalItems} items</p>}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {!!debtSummary.ownShare && (
                  <Card className="p-4">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-gray-900 dark:text-gray-100">Own Share</p>
                      <UserIcon className="h-5 w-5 text-blue-500 dark:text-blue-400"/>
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                      <p className="font-bold text-blue-500 dark:text-blue-400 truncate"
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

      <DebtSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSave={fetchReceiptData}
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
        paymentMethods={paymentMethods}
      />

      <ConfirmModal
        isOpen={makePermanentModalOpen}
        onClose={() => setMakePermanentModalOpen(false)}
        onConfirm={handleMakePermanent}
        title="Make Receipt Permanent"
        message="Are you sure you want to make this receipt permanent? This action is irreversible."
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Receipt"
        message="Are you sure you want to permanently delete this receipt? This action cannot be undone."
      />
    </div>
  );
};

export default ReceiptViewPage;
