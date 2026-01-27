import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { db } from '../../utils/db';
import { format } from 'date-fns';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useActivePaymentMethods } from '../../hooks/usePaymentMethods';

interface DebtInfo {
  receiptId: number;
  debtorId: number;
  debtorName: string;
  amount: number;
  receiptPaymentMethodId: number;
}

interface DebtSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  debtInfo: DebtInfo | null;
}

const DebtSettlementModal: React.FC<DebtSettlementModalProps> = ({ isOpen, onClose, onSave, debtInfo }) => {
  const [paidDate, setPaidDate] = useState(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings } = useSettingsStore();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;

  const { data: activePaymentMethods = [] } = useActivePaymentMethods();

  useEffect(() => {
    if (isOpen && debtInfo) {
      if (paymentMethodsEnabled) {
        if (debtInfo.receiptPaymentMethodId) {
          setPaymentMethodId(String(debtInfo.receiptPaymentMethodId));
        } else if (activePaymentMethods.length > 0) {
          setPaymentMethodId(String(activePaymentMethods[0].PaymentMethodID));
        }
      } else {
        setPaymentMethodId('1'); // Default to Cash
      }
      setPaidDate(new Date());
      setNote('');
      setError('');
    }
  }, [isOpen, debtInfo, paymentMethodsEnabled, activePaymentMethods]);

  const handleSubmit = async () => {
    if (!paymentMethodId) {
      setError('Please select a method.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const finalNote = note.trim() ? note.trim() : null;

      const topUpResult = await db.execute(
        'INSERT INTO Income (PaymentMethodID, IncomeAmount, IncomeDate, IncomeNote) VALUES (?, ?, ?, ?)',
        [paymentMethodId, debtInfo!.amount, format(paidDate, 'yyyy-MM-dd'), finalNote]
      );
      const topUpId = topUpResult.lastID;

      await db.execute(
        'INSERT INTO ExpenseEntityPayments (ExpenseID, EntityID, PaidDate, IncomeID) VALUES (?, ?, ?, ?)',
        [debtInfo!.receiptId, debtInfo!.debtorId, format(paidDate, 'yyyy-MM-dd'), topUpId]
      );
      
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to settle debt.');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const methodOptions = useMemo(() => activePaymentMethods.map(pm => ({ value: pm.PaymentMethodID, label: pm.PaymentMethodName })), [activePaymentMethods]);

  if (!debtInfo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Settle Debt for ${debtInfo.debtorName}`}
      onEnter={handleSubmit}
      isDatabaseTransaction
      successToastMessage="Debt settled successfully"
      errorToastMessage="Failed to settle debt"
      loadingMessage="Settling debt..."
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Settle</Button></>}
    >
      <div className="space-y-4">
        {error && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{error}</div>}
        <p className="text-font-1">You are about to mark a debt of <span className="font-bold">€{debtInfo.amount.toFixed(2)}</span> as paid.</p>
        <DatePicker
          label="Payment Date"
          selected={paidDate}
          onChange={(date: any) => setPaidDate(date as Date)}
        />
        {paymentMethodsEnabled && (
          <Select
            label="Paid into"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            options={methodOptions}
            placeholder="Select a method"
          />
        )}
        <Input
          label="Note (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
        />
      </div>
    </Modal>
  );
};

export default DebtSettlementModal;
