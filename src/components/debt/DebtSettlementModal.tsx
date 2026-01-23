import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { db } from '../../utils/db';
import { format } from 'date-fns';
import { useSettingsStore } from '../../store/useSettingsStore';

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
  const [paymentMethods, setPaymentMethods] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings } = useSettingsStore();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;

  useEffect(() => {
    if (isOpen && debtInfo) {
      const fetchPaymentMethods = async () => {
        if (paymentMethodsEnabled) {
          const methods = await db.query<{ PaymentMethodID: number; PaymentMethodName: string }>(
            'SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods ORDER BY PaymentMethodName'
          );
          setPaymentMethods(methods.map(pm => ({ value: pm.PaymentMethodID, label: pm.PaymentMethodName })));
          
          if (debtInfo.receiptPaymentMethodId) {
            setPaymentMethodId(String(debtInfo.receiptPaymentMethodId));
          } else if (methods.length > 0) {
            setPaymentMethodId(String(methods[0].PaymentMethodID));
          }
        } else {
          setPaymentMethodId('1'); // Default to Cash
        }
      };
      fetchPaymentMethods();
      setPaidDate(new Date());
      setNote('');
      setError('');
    }
  }, [isOpen, debtInfo, paymentMethodsEnabled]);

  const handleSubmit = async () => {
    if (!paymentMethodId) {
      setError('Please select a method.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Use the user-provided note if available, otherwise fallback to the default description
      // But the user requested that "note" should NOT be populated with "Repayment from..."
      // So we store the user note in the TopUpNote field.
      // However, if the note is empty, we might want to store SOMETHING or just leave it empty?
      // The previous code was: const topUpNote = `Repayment from ${debtInfo!.debtorName}`;
      // The user said: "Make sure "note" does not get populated with "Repayment from Charlie" or whatever"
      // This likely means the input field should start empty.
      // But what should be saved to the DB?
      // If the user leaves it empty, we probably still want the system generated note for context in the transaction list?
      // Or maybe we append the user note to the system note?
      // Let's assume the user wants to control the note field entirely.
      // If they leave it empty, we can default to the system message in the DB, OR just save an empty note.
      // Given the request "Make sure 'note' does not get populated with...", it refers to the UI input.
      // But usually, a transaction needs a description.
      // Let's use the user note if provided, otherwise use the default system note for the DB record.
      
      const systemNote = `Repayment from ${debtInfo!.debtorName}`;
      const finalNote = note.trim() ? note.trim() : systemNote;

      const topUpResult = await db.execute(
        'INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?, ?)',
        [paymentMethodId, debtInfo!.amount, format(paidDate, 'yyyy-MM-dd'), finalNote]
      );
      const topUpId = topUpResult.lastID;

      await db.execute(
        'INSERT INTO ReceiptDebtorPayments (ReceiptID, DebtorID, PaidDate, TopUpID) VALUES (?, ?, ?, ?)',
        [debtInfo!.receiptId, debtInfo!.debtorId, format(paidDate, 'yyyy-MM-dd'), topUpId]
      );
      
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to settle debt.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!debtInfo) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Settle Debt for ${debtInfo.debtorName}`}
      onEnter={handleSubmit}
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
            options={paymentMethods}
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
