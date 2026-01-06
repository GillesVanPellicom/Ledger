import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Gallery from '../components/ui/Gallery';
import { PencilIcon, ShoppingCartIcon, TagIcon, CurrencyEuroIcon, DocumentArrowDownIcon, CreditCardIcon, ExclamationTriangleIcon, UserGroupIcon } from '@heroicons/react/24/solid';
import { generateReceiptsPdf } from '../utils/pdfGenerator';
import { useSettings } from '../context/SettingsContext';
import { useError } from '../context/ErrorContext';
import { cn } from '../utils/cn';

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
  const [debtSummary, setDebtSummary] = useState([]);

  useEffect(() => {
    const fetchReceiptData = async () => {
      setLoading(true);
      try {
        const receiptData = await db.queryOne(`
          SELECT r.*, s.StoreName, pm.PaymentMethodName
          FROM Receipts r 
          JOIN Stores s ON r.StoreID = s.StoreID 
          LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
          WHERE r.ReceiptID = ?
        `, [id]);

        if (receiptData) {
          setReceipt(receiptData);
          setSplitType(receiptData.SplitType || 'none');

          const lineItemData = await db.query(`
            SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorName
            FROM LineItems li
            JOIN Products p ON li.ProductID = p.ProductID
            JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
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
          }
        }
      } catch (error) {
        showError(error);
      } finally {
        setLoading(false);
      }
    };

    if (settings.datastore.folderPath || !window.electronAPI) {
      fetchReceiptData();
    } else {
      setLoading(false);
    }
  }, [id, showError, settings.datastore.folderPath, debtEnabled]);

  useEffect(() => {
    if (!debtEnabled || !receipt) return;

    const calculateDebtSummary = () => {
      const summary = {};
      const totalAmount = lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0);

      if (splitType === 'total_split' && receiptSplits.length > 0) {
        const totalParts = receiptSplits.reduce((acc, curr) => acc + curr.SplitPart, 0);
        receiptSplits.forEach(split => {
          const amount = (totalAmount * split.SplitPart) / totalParts;
          summary[split.DebtorName] = (summary[split.DebtorName] || 0) + amount;
        });
      } else if (splitType === 'line_item') {
        lineItems.forEach(item => {
          if (item.DebtorName) {
            const amount = item.LineQuantity * item.LineUnitPrice;
            summary[item.DebtorName] = (summary[item.DebtorName] || 0) + amount;
          }
        });
      }

      setDebtSummary(Object.entries(summary).map(([name, amount]) => ({ name, amount })));
    };

    calculateDebtSummary();
  }, [lineItems, receiptSplits, splitType, debtEnabled, receipt]);

  const totalAmount = lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0);
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
          <Button onClick={() => navigate(`/receipts/edit/${id}`)}>
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit
          </Button>
        </div>
      </div>

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

      {debtEnabled && splitType !== 'none' && debtSummary.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserGroupIcon className="h-6 w-6 text-accent" />
              <h2 className="text-lg font-semibold">Debt Breakdown</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {debtSummary.map((debtor) => (
                <div key={debtor.name} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">{debtor.name}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">€{debtor.amount.toFixed(2)}</p>
                </div>
              ))}
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
                  {debtEnabled && splitType === 'line_item' && <th className="p-2 w-32 text-right">Debtor</th>}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {lineItems.map((item) => (
                  <tr key={item.LineItemID}>
                    <td className="p-2">
                      <p className="font-medium">{item.ProductName} - {item.ProductSize}{item.ProductUnitType}</p>
                      <p className="text-xs text-gray-500">{item.ProductBrand}</p>
                    </td>
                    <td className="p-2 text-center">{item.LineQuantity}</td>
                    <td className="p-2 text-right">{(item.LineUnitPrice).toFixed(2)}</td>
                    <td className="p-2 text-right font-medium">
                      {(item.LineQuantity * item.LineUnitPrice).toFixed(2)}
                    </td>
                    {debtEnabled && splitType === 'line_item' && (
                      <td className="p-2 text-right text-gray-600 dark:text-gray-400">
                        {item.DebtorName || '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 text-right font-bold text-lg rounded-b-xl">
          Total: €{totalAmount.toFixed(2)}
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
    </div>
  );
};

export default ReceiptViewPage;
