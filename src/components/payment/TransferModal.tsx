import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { db } from '../../utils/db';
import { format } from 'date-fns';
import { PaymentMethod, TopUp } from '../../types';
import Combobox from '../ui/Combobox';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import Divider from '../ui/Divider';
import StepperInput from '../ui/StepperInput';
import { cn } from '../../utils/cn';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  topUpToEdit: TopUp | null;
  paymentMethodId: string;
  currentBalance: number;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onSave, topUpToEdit, paymentMethodId, currentBalance }) => {
  const [formData, setFormData] = useState({ amount: '0', date: new Date(), notes: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [transferFrom, setTransferFrom] = useState<string>('');
  const [transferTo, setTransferTo] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [methodBalances, setMethodBalances] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const fromMethodBalance = transferFrom ? (methodBalances[transferFrom] || 0) : 0;

  // Initialize and fetch methods
  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        const methods = await db.query<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1');
        
        const balances: Record<string, number> = {};
        for (const m of methods) {
          const receipts = await db.queryOne<{ total: number }>(`
            SELECT SUM(CASE WHEN IsNonItemised = 1 THEN NonItemisedTotal ELSE (SELECT SUM(LineQuantity * LineUnitPrice) FROM LineItems WHERE ReceiptID = Receipts.ReceiptID) END) as total
            FROM Receipts WHERE PaymentMethodID = ?
          `, [m.PaymentMethodID]);
          
          const topups = await db.queryOne<{ total: number }>(`
            SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?
          `, [m.PaymentMethodID]);

          balances[String(m.PaymentMethodID)] = (m.PaymentMethodFunds || 0) + (topups?.total || 0) - (receipts?.total || 0);
        }
        
        setMethodBalances(balances);
        setPaymentMethods(methods);
        
        if (topUpToEdit) {
          setFormData({ 
            amount: String(Math.abs(topUpToEdit.TopUpAmount)), 
            date: new Date(topUpToEdit.TopUpDate), 
            notes: topUpToEdit.TopUpNote || '' 
          });
          setTransferFrom(String(topUpToEdit.PaymentMethodID));
          if (topUpToEdit.TransferID) {
            const otherTu = await db.queryOne<TopUp>('SELECT * FROM TopUps WHERE TransferID = ? AND TopUpID != ?', [topUpToEdit.TransferID, topUpToEdit.TopUpID]);
            if (otherTu) {
              setTransferTo(String(otherTu.PaymentMethodID));
            }
          }
        } else {
          setFormData({ amount: '0', date: new Date(), notes: '' });
          setTransferFrom('');
          setTransferTo('');
        }
        setErrors({});
      };
      init();
    }
  }, [isOpen, topUpToEdit]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const amount = Number(formData.amount);
    if (!transferFrom) newErrors.transferFrom = 'Please select an origin account.';
    if (!transferTo) newErrors.transferTo = 'Please select a destination account.';
    if (transferFrom && transferTo && transferFrom === transferTo) newErrors.transferTo = 'Origin and destination must be different.';
    if (!formData.amount || amount <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (transferFrom && amount > fromMethodBalance) {
      newErrors.amount = `Insufficient funds. Max: €${fromMethodBalance.toFixed(2)}`;
    }
    if (!formData.date) newErrors.date = 'Date is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (topUpToEdit && topUpToEdit.TransferID) {
        // Update existing transfer
        await db.execute(
          'UPDATE Transfers SET FromPaymentMethodID = ?, ToPaymentMethodID = ?, Amount = ?, TransferDate = ?, Note = ? WHERE TransferID = ?',
          [transferFrom, transferTo, Number(formData.amount), format(formData.date, 'yyyy-MM-dd'), formData.notes, topUpToEdit.TransferID]
        );
        
        // Update associated TopUps
        await db.execute(
          'UPDATE TopUps SET PaymentMethodID = ?, TopUpAmount = ?, TopUpDate = ?, TopUpNote = ? WHERE TransferID = ? AND TopUpAmount < 0',
          [transferFrom, -Number(formData.amount), format(formData.date, 'yyyy-MM-dd'), formData.notes, topUpToEdit.TransferID]
        );
        await db.execute(
          'UPDATE TopUps SET PaymentMethodID = ?, TopUpAmount = ?, TopUpDate = ?, TopUpNote = ? WHERE TransferID = ? AND TopUpAmount > 0',
          [transferTo, Number(formData.amount), format(formData.date, 'yyyy-MM-dd'), formData.notes, topUpToEdit.TransferID]
        );
      } else {
        // Create new transfer
        const transactionDetails = {
          type: 'transfer',
          amount: Number(formData.amount),
          date: format(formData.date, 'yyyy-MM-dd'),
          note: formData.notes,
          from: transferFrom,
          to: transferTo,
        };
        await window.electronAPI.createTransaction(transactionDetails);
      }
      
      queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transfer'] });

      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save transfer' });
    } finally {
      setLoading(false);
    }
  };

  const methodOptions = paymentMethods.map(pm => ({ value: String(pm.PaymentMethodID), label: pm.PaymentMethodName }));
  const originOptions = paymentMethods
    .filter(m => (methodBalances[String(m.PaymentMethodID)] || 0) > 0)
    .map(pm => ({ value: String(pm.PaymentMethodID), label: pm.PaymentMethodName }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={topUpToEdit ? "Edit Transfer" : "New Transfer"}
      onEnter={handleSubmit}
      size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <div className="space-y-8">
        {errors.form && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{errors.form}</div>}
        
        <div className="flex flex-col items-center py-4">
          <div className="flex items-center justify-between w-full gap-8">
            {/* Origin */}
            <div className="flex-1 flex flex-col gap-2">
              <p className="text-sm font-medium text-font-1 text-center">Origin</p>
              <Combobox
                options={topUpToEdit ? methodOptions : originOptions}
                value={transferFrom}
                onChange={setTransferFrom}
                error={errors.transferFrom}
                placeholder="Select origin..."
              />
              <p className={cn("text-[10px] text-font-2 text-center transition-opacity", transferFrom ? "opacity-100" : "opacity-0 invisible")}>
                Available: €{fromMethodBalance.toFixed(2)}
              </p>
            </div>

            {/* Arrow */}
            <div className="text-font-2 mt-2">
              <ArrowRight className="h-12 w-12" />
            </div>

            {/* Destination */}
            <div className="flex-1 flex flex-col gap-2">
              <p className="text-sm font-medium text-font-1 text-center">Destination</p>
              <Combobox
                options={methodOptions}
                value={transferTo}
                onChange={setTransferTo}
                error={errors.transferTo}
                placeholder="Select destination..."
              />
              <div className="h-4" />
            </div>
          </div>

          {/* Amount */}
          <div className="w-64 mt-6 flex flex-col items-center">
            <StepperInput
              label="Amount"
              className="w-full"
              inputClassName="text-center"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              onIncrement={() => setFormData(prev => ({ ...prev, amount: String(Number(prev.amount) + 1) }))}
              onDecrement={() => setFormData(prev => ({ ...prev, amount: String(Math.max(0, Number(prev.amount) - 1)) }))}
              min={0}
              max={fromMethodBalance || undefined}
              error={errors.amount}
            />
          </div>
        </div>

        <Divider />

        <div className="grid grid-cols-2 gap-4">
          <DatePicker label="Date" selected={formData.date} onChange={(date: Date | null) => date && setFormData(prev => ({ ...prev, date }))} error={errors.date} />
          <Input label="Note (Optional)" name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g., Monthly savings" />
        </div>
      </div>
    </Modal>
  );
};

export default TransferModal;
