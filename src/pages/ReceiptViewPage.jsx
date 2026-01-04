import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { db } from '../utils/db';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Gallery from '../components/ui/Gallery';
import { PencilIcon, ShoppingCartIcon, TagIcon, CurrencyEuroIcon } from '@heroicons/react/24/outline';

const ReceiptViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceiptData = async () => {
      setLoading(true);
      try {
        const receiptData = await db.queryOne(`
          SELECT r.*, s.StoreName 
          FROM Receipts r 
          JOIN Stores s ON r.StoreID = s.StoreID 
          WHERE r.ReceiptID = ?
        `, [id]);

        if (receiptData) {
          setReceipt(receiptData);

          const lineItemData = await db.query(`
            SELECT li.*, p.ProductName, p.ProductBrand
            FROM LineItems li
            JOIN Products p ON li.ProductID = p.ProductID
            WHERE li.ReceiptID = ?
          `, [id]);
          setLineItems(lineItemData);

          const imageData = await db.query('SELECT ImagePath FROM ReceiptImages WHERE ReceiptID = ?', [id]);
          setImages(imageData.map(img => ({ src: img.ImagePath })));
        }
      } catch (error) {
        console.error("Failed to load receipt data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReceiptData();
  }, [id]);

  const totalAmount = lineItems.reduce((total, item) => total + (item.LineQuantity * item.LineUnitPrice), 0);
  const totalItems = lineItems.length;
  const totalQuantity = lineItems.reduce((total, item) => total + item.LineQuantity, 0);

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
        <Button onClick={() => navigate(`/receipts/edit/${id}`)}>
          <PencilIcon className="h-5 w-5 mr-2" />
          Edit
        </Button>
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
        <div className="p-6 grid grid-cols-3 gap-4 text-center">
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
          <div className="flex flex-col items-center gap-1">
            <CurrencyEuroIcon className="h-6 w-6 text-gray-400" />
            <span className="text-sm text-gray-500">Total Amount</span>
            <span className="text-xl font-bold">€{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Line Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2 w-24 text-center">Qty</th>
                  <th className="p-2 w-32 text-right">Unit Price (€)</th>
                  <th className="p-2 w-32 text-right">Total (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {lineItems.map((item) => (
                  <tr key={item.LineItemID}>
                    <td className="p-2">
                      <p className="font-medium">{item.ProductName}</p>
                      <p className="text-xs text-gray-500">{item.ProductBrand}</p>
                    </td>
                    <td className="p-2 text-center">{item.LineQuantity}</td>
                    <td className="p-2 text-right">{(item.LineUnitPrice).toFixed(2)}</td>
                    <td className="p-2 text-right font-medium">
                      {(item.LineQuantity * item.LineUnitPrice).toFixed(2)}
                    </td>
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
