import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Gallery from '../components/ui/Gallery';
import { PencilIcon, ShoppingCartIcon, TagIcon, CurrencyEuroIcon, DocumentArrowDownIcon, CreditCardIcon, ExclamationTriangleIcon, UserGroupIcon, CheckCircleIcon, ExclamationCircleIcon, UserIcon, BanknotesIcon } from '@heroicons/react/24/solid';
import { generateReceiptsPdf } from '../utils/pdfGenerator';
import { useSettings } from '../context/SettingsContext';
import { useError } from '../context/ErrorContext';
import { cn } from '../utils/cn';
import DebtSettlementModal from '../components/debt/DebtSettlementModal';
import Tooltip from '../components/ui/Tooltip';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import Select from '../components/ui/Select';

const MarkAsPaidModal = ({ isOpen, onClose, onConfirm, paymentMethods }) => {
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.value || '');

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

const ReceiptViewPage = ({ openSettingsModal }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const { showError } = useError();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const debtEnabled = settings.modules.debt?.enabled;

  const [splitType, setSplitType] = useState('none');
  const [receiptSplits, setReceiptSplits] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedDebtForSettlement, setSelectedDebtForSettlement] = useState(null);
  const [unsettleConfirmation, setUnsettleConfirmation] = useState({ isOpen: false, paymentId: null, topUpId: null });
  const [isMarkAsPaidModalOpen, setIsMarkAsPaidModalOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const fetchReceiptData = async () => {
    setLoading(true);
    try {
      const receiptData = await db.queryOne(`
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

        const lineItemData = await db.query(`
          SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorName, d.DebtorID
          FROM LineItems li
          JOIN Products p ON li.ProductID = p.ProductID
          LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
          LEFT JOIN Debtors d ON li.DebtorID = d.DebtorID
          WHERE li.ReceiptID = ?
        `, [id]);
        setLineItems(lineItemData);

        const imageData = await db.query('SELECT ImagePath FROM ReceiptImages WHERE ReceiptID = ?', [id]);
        if (window.electronAPI && settings.datastore.folderPath) {
          setImages(imageData.map(img => ({ 
            src: `local-file://${settings.datastore.folderPath}/receipt_images/${img.ImagePath}`
          })));
        }

        if (debtEnabled) {
          if (receiptData.SplitType === 'total_split') {
            const splitsData = await db.query(`
              SELECT rs.*, d.DebtorName 
              FROM ReceiptSplits rs
              JOIN Debtors d ON rs.DebtorID = d.DebtorID
              WHERE rs.ReceiptID = ?
            `, [id]);
            setReceiptSplits(splitsData);
          }

          const paymentsData = await db.query('SELECT * FROM ReceiptDebtorPayments WHERE ReceiptID = ?', [id]);
          setPayments(paymentsData);
        }
        
        if (paymentMethodsEnabled) {
          const pmData = await db.query('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods ORDER BY PaymentMethodName');
          setPaymentMethods(pmData.map(pm => ({ value: pm.PaymentMethodID, label: pm.PaymentMethodName })));
        }
      }
    } catch (error) {
      showError(error);
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
    const discountAmount = (subtotal * (receipt?.Discount || 0)) / 100;
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, receipt]);

  const debtSummary = useMemo(() => {
    if (!debtEnabled || !receipt) return { debtors: [], ownShare: null };

    const summary = {};
    let ownShare = null;

    if (splitType === 'total_split' && (receiptSplits.length > 0 || receipt.OwnShares > 0)) {
      const totalShares = receipt.TotalShares > 0 
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

      if (receipt.OwnShares > 0) {
        const ownAmount = (totalAmount * receipt.OwnShares) / totalShares;
        ownShare = {
          amount: ownAmount,
          shares: receipt.OwnShares,
          totalShares: totalShares,
        };
      }
    } else if (splitType === 'line_item') {
      const debtorItems = {};
      const discountFactor = 1 - ((receipt.Discount || 0) / 100);

      lineItems.forEach(item => {
        if (item.DebtorID) {
          const amount = item.LineQuantity * item.LineUnitPrice * discountFactor;
          if (!debtorItems[item.DebtorID]) {
            debtorItems[item.DebtorID] = { count: 0, total: 0 };
          }
          debtorItems[item.DebtorID].count += 1;
          debtorItems[item.DebtorID].total += amount;

          summary[item.DebtorID] = {
            name: item.DebtorName,
            amount: debtorItems[item.DebtorID].total,
            debtorId: item.DebtorID,
            itemCount: debtorItems[item.DebtorID].count,
            totalItems: lineItems.length,
          };
        }
      });
    }
    return { debtors: Object.values(summary), ownShare };
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

  const handleSettleDebt = (debtor) => {
    setSelectedDebtForSettlement({
      receiptId: receipt.ReceiptID,
      debtorId: debtor.debtorId,
      debtorName: debtor.name,
      amount: debtor.amount,
      receiptDate: receipt.ReceiptDate,
      receiptPaymentMethodId: receipt.PaymentMethodID
    });
    setIsSettlementModalOpen(true);
  };

  const confirmUnsettleDebt = (paymentId, topUpId) => {
    setUnsettleConfirmation({ isOpen: true, paymentId, topUpId });
  };

  const handleUnsettleDebt = async () => {
    const { paymentId, topUpId } = unsettleConfirmation;
    try {
      await db.execute('DELETE FROM ReceiptDebtorPayments WHERE PaymentID = ?', [paymentId]);
      if (topUpId) {
        await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [topUpId]);
      }
      fetchReceiptData();
    } catch (error) {
      showError(error);
    } finally {
      setUnsettleConfirmation({ isOpen: false, paymentId: null, topUpId: null });
    }
  };

  const handleMarkAsPaid = async (paymentMethodId) => {
    if (!receipt || !paymentMethodId) return;
    try {
      await db.execute(
        'UPDATE Receipts SET Status = ?, PaymentMethodID = ? WHERE ReceiptID = ?',
        ['paid', paymentMethodId, id]
      );
      fetchReceiptData();
    } catch (error) {
      showError(error);
    } finally {
      setIsMarkAsPaidModalOpen(false);
    }
  };

  if (!settings.datastore.folderPath && window.electronAPI) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <ExclamationTriangleIcon className="h-16 w-16 text-yellow-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Datastore Not Configured</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Please set the datastore folder in the settings to view receipts and their images.
        </p>
        <Button onClick={() => openSettingsModal('data')}>Go to Settings</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner className="h-8 w-8 text-accent" />
      </div>
    );
  }

  if (!receipt) {
    return <div className="text-center">Receipt not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{receipt.StoreName}</h1>
          <p className="text-gray-500">{format(parseISO(receipt.ReceiptDate), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSavePdf}>
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Save PDF
          </Button>
          {receipt.Status === 'unpaid' && (
            <Button onClick={() => setIsMarkAsPaidModalOpen(true)}>
              <BanknotesIcon className="h-5 w-5 mr-2" />
              Mark as Paid
            </Button>
          )}
          <Button onClick={() => navigate(`/receipts/edit/${id}`)}>
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {receipt.Status === 'unpaid' && (
        <Card>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center gap-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            <div className="text-center">
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">This receipt is unpaid.</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Total amount is owed to <span className="font-bold">{receipt.OwedToDebtorName}</span>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {receipt.ReceiptNote && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-2">Note</h2>
            <p className="text-gray-600 dark:text-gray-300">{receipt.ReceiptNote}</p>
          </div>
        </Card>
      )}

      <Card>
        <div className={`p-6 grid ${paymentMethodsEnabled ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-center`}>
          <div className="flex flex-col items-center gap-1">
            <TagIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm text-gray-500">Unique Items</span>
            <span className="text-xl font-bold">{totalItems}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm text-gray-500">Total Quantity</span>
            <span className="text-xl font-bold">{totalQuantity}</span>
          </div>
          {paymentMethodsEnabled && (
            <div className="flex flex-col items-center gap-1">
              <CreditCardIcon className="h-6 w-6 text-gray-400" />
              <span className="text-sm text-gray-500">Payment Method</span>
              <span className="text-xl font-bold">{receipt.PaymentMethodName || 'N/A'}</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <CurrencyEuroIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm text-gray-500">Total Amount</span>
            <span className="text-xl font-bold">€{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </Card>
      
      {images.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Images</h2>
            <Gallery images={images} />
          </div>
        </Card>
      )}

      {debtEnabled && splitType !== 'none' && (debtSummary.debtors.length > 0 || debtSummary.ownShare) && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Debt Breakdown</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {debtSummary.debtors.map((debtor) => {
                const payment = payments.find(p => p.DebtorID === debtor.debtorId);
                const isPaid = !!payment;
                
                return (
                  <div key={debtor.debtorId} className={cn(
                    "p-4 rounded-lg border flex flex-col justify-between",
                    isPaid 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  )}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <p className={cn("font-medium", isPaid ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100")}>
                          {debtor.name}
                        </p>
                        {isPaid ? (
                          <Tooltip content={`Paid on ${payment.PaidDate}`}>
                            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </Tooltip>
                        ) : (
                          <Tooltip content="Unpaid">
                            <ExclamationCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </Tooltip>
                        )}
                      </div>
                      <p className={cn("text-2xl font-bold", isPaid ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
                        €{debtor.amount.toFixed(2)}
                      </p>
                      {splitType === 'total_split' && <p className="text-sm text-gray-500 mb-4">{debtor.shares} / {debtor.totalShares} shares</p>}
                      {splitType === 'line_item' && <p className="text-sm text-gray-500 mb-4">{debtor.itemCount} / {debtor.totalItems} items</p>}
                    </div>
                    
                    {isPaid ? (
                      <Button 
                        size="sm"
                        className="w-full text-green-800 bg-green-200 border-green-300 hover:bg-green-300 border dark:text-green-100 dark:bg-green-800/50 dark:border-green-700 dark:hover:bg-green-800"
                        onClick={() => confirmUnsettleDebt(payment.PaymentID, payment.TopUpID)}
                      >
                        Unsettle
                      </Button>
                    ) : (
      
                      <Button 
                        size="sm"
                        className="w-full text-red-800 bg-red-200 border-red-300 hover:bg-red-300 border dark:text-red-100 dark:bg-red-800/50 dark:border-red-700 dark:hover:bg-red-800"
                        onClick={() => handleSettleDebt(debtor)}
                      >
                        Settle
                      </Button>
                    )}
                  </div>
                );
              })}
              {debtSummary.ownShare && (
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-blue-900 dark:text-blue-100">Own Share</p>
                      <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      €{debtSummary.ownShare.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {debtSummary.ownShare.shares} / {debtSummary.ownShare.totalShares} shares
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Items</h2>
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
                        <p className="font-medium">{item.ProductName}{item.ProductSize ? ` - ${item.ProductSize}${item.ProductUnitType || ''}` : ''}</p>
                        <p className="text-xs text-gray-500">{item.ProductBrand}</p>
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
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 rounded-b-xl">
          <div className="flex flex-col items-end gap-2">
            {receipt.Discount > 0 && (
              <div className="flex items-center gap-4 text-gray-500">
                <span className="text-sm">Subtotal</span>
                <span className="font-medium">€{subtotal.toFixed(2)}</span>
              </div>
            )}
            {receipt.Discount > 0 && (
              <div className="flex items-center gap-4 text-gray-500">
                <span className="text-sm">Discount ({receipt.Discount}%)</span>
                <span className="font-medium">-€{(subtotal * receipt.Discount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center gap-4 text-lg font-bold">
              <span>Total</span>
              <span>€{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      <DebtSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSave={fetchReceiptData}
        debtInfo={selectedDebtForSettlement}
      />

      <ConfirmModal
        isOpen={unsettleConfirmation.isOpen}
        onClose={() => setUnsettleConfirmation({ isOpen: false, paymentId: null, topUpId: null })}
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
    </div>
  );
};

export default ReceiptViewPage;
