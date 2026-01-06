import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import Select from '../ui/Select';
import { db } from '../../utils/db';
import { format } from 'date-fns';
import { useSettings } from '../../context/SettingsContext';

const DebtSettlementModal = ({ isOpen, onClose, onSave, debtInfo }) => {
  const [paidDate, setPaidDate] = useState(new Date());
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings } = useSettings();
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;

  useEffect(() => {
    if (isOpen && debtInfo) {
      const fetchPaymentMethods = async () => {
        if (paymentMethodsEnabled) {
          const methods = await db.query('SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods ORDER BY PaymentMethodName');
          setPaymentMethods(methods.map(pm => ({ value: pm.PaymentMethodID, label: pm.PaymentMethodName })));
          
          if (debtInfo.receiptPaymentMethodId) {
            setPaymentMethodId(debtInfo.receiptPaymentMethodId);
          } else if (methods.length > 0) {
            setPaymentMethodId(methods[0].PaymentMethodID);
          }
        } else {
          setPaymentMethodId(1); // Default to Cash
        }
      };
      fetchPaymentMethods();
      setPaidDate(new Date());
      setError('');
    }
  }, [isOpen, debtInfo, paymentMethodsEnabled]);

  const handleSubmit = async () => {
    if (!paymentMethodId) {
      setError('Please select a payment method.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const topUpNote = JSON.stringify({
        type: 'debt_settlement',
        debtorName: debtInfo.debtorName,
        receiptId: debtInfo.receiptId,
      });

      const topUpResult = await db.execute(
        'INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?, ?)',
        [paymentMethodId, debtInfo.amount, format(paidDate, 'yyyy-MM-dd'), topUpNote]
      );
      const topUpId = topUpResult.lastID;

      await db.execute(
        'INSERT INTO ReceiptDebtorPayments (ReceiptID, DebtorID, PaidDate, TopUpID) VALUES (?, ?, ?, ?)',
        [debtInfo.receiptId, debtInfo.debtorId, format(paidDate, 'yyyy-MM-dd'), topUpId]
      );
      
      onSave();
      onClose();
    } catch (err) {
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
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Settle</Button></>}
    >
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
        <p>You are about to mark a debt of <span className="font-bold">€{debtInfo.amount.toFixed(2)}</span> as paid.</p>
        <DatePicker
          label="Payment Date"
          selected={paidDate}
          onChange={setPaidDate}
          popperClassName="react-datepicker-in-modal"
        />
        {paymentMethodsEnabled && (
          <Select
            label="Paid into"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            options={paymentMethods}
            placeholder="Select a payment method"
          />
        )}
      </div>
    </Modal>
  );
};

export default DebtSettlementModal;
