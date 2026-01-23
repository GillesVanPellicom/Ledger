import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { db } from '../../utils/db';
import { format } from 'date-fns';
import { PaymentMethod, TopUp } from '../../types';
import Combobox from '../ui/Combobox';
import Select from '../ui/Select';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import MoneyDisplay from '../ui/MoneyDisplay';
import Divider from '../ui/Divider';
import StepperInput from '../ui/StepperInput';

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
  const [transferType, setTransferType] = useState<'deposit' | 'transfer'>('deposit');
  const [transferFrom, setTransferFrom] = useState<string>(paymentMethodId);
  const [transferTo, setTransferTo] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [fromMethodBalance, setFromMethodBalance] = useState(currentBalance);
  const queryClient = useQueryClient();

  // Initialize and fetch methods
  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        const methods = await db.query<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1');
        setPaymentMethods(methods);
        
        if (topUpToEdit) {
          setFormData({ amount: '0', date: new Date(), notes: '' });
        } else {
          setFormData({ amount: '0', date: new Date(), notes: '' });
          setTransferType('deposit');
          setTransferFrom(paymentMethodId);
          
          const otherMethods = methods.filter(m => String(m.PaymentMethodID) !== paymentMethodId);
          if (otherMethods.length > 0) {
            setTransferTo(String(otherMethods[0].PaymentMethodID));
          }
        }
        setErrors({});
      };
      init();
    }
  }, [isOpen, topUpToEdit, paymentMethodId]);

  // Update balance when origin changes
  useEffect(() => {
    if (isOpen && transferFrom) {
      const updateBalance = async () => {
        const methodData = await db.queryOne<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodID = ?', [transferFrom]);
        if (methodData) {
          const receipts = await db.queryOne<{ total: number }>(`
            SELECT SUM(CASE WHEN IsNonItemised = 1 THEN NonItemisedTotal ELSE (SELECT SUM(LineQuantity * LineUnitPrice) FROM LineItems WHERE ReceiptID = Receipts.ReceiptID) END) as total
            FROM Receipts WHERE PaymentMethodID = ?
          `, [transferFrom]);
          
          const topups = await db.queryOne<{ total: number }>(`
            SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?
          `, [transferFrom]);

          const current = (methodData.PaymentMethodFunds || 0) + (topups?.total || 0) - (receipts?.total || 0);
          setFromMethodBalance(current);
        }
      };
      updateBalance();
    }
  }, [isOpen, transferFrom]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const amount = Number(formData.amount);
    if (!formData.amount || amount <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (transferType === 'transfer' && amount > fromMethodBalance) {
      newErrors.amount = `Insufficient funds. Max: €${fromMethodBalance.toFixed(2)}`;
    }
    if (!formData.date) newErrors.date = 'Date is required.';
    if (transferType === 'transfer' && !transferTo) newErrors.transferTo = 'Please select a destination account.';
    if (transferType === 'transfer' && transferFrom === transferTo) newErrors.transferTo = 'Origin and destination must be different.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const transactionDetails = {
        type: transferType,
        amount: Number(formData.amount),
        date: format(formData.date, 'yyyy-MM-dd'),
        note: formData.notes,
        from: transferFrom,
        to: transferTo,
      };

      await window.electronAPI.createTransaction(transactionDetails);
      
      queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save transaction' });
    } finally {
      setLoading(false);
    }
  };

  const methodOptions = paymentMethods.map(pm => ({ value: String(pm.PaymentMethodID), label: pm.PaymentMethodName }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={topUpToEdit ? "Edit Transaction" : "New Transaction"}
      onEnter={handleSubmit}
      size="lg"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
    >
      <div className="space-y-8">
        {errors.form && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{errors.form}</div>}
        
        <div className="flex justify-center">
          <div className="w-48">
            <Select
              value={transferType}
              onChange={(e) => setTransferType(e.target.value as 'deposit' | 'transfer')}
              options={[
                { value: 'deposit', label: 'Deposit' },
                { value: 'transfer', label: 'Transfer' }
              ]}
            />
          </div>
        </div>

        {transferType === 'transfer' ? (
          <div className="flex flex-col items-center gap-12 py-4">
            <div className="flex items-center justify-between w-full gap-4">
              {/* Origin */}
              <div className="flex-1 flex flex-col items-center text-center space-y-4">
                <div className="w-full flex flex-col items-center">
                  <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Origin</p>
                  <Combobox
                    options={methodOptions}
                    value={transferFrom}
                    onChange={setTransferFrom}
                  />
                </div>
                <div className="w-full">
                  <StepperInput
                    label="Amount"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    onIncrement={() => setFormData(prev => ({ ...prev, amount: String(Number(prev.amount) + 1) }))}
                    onDecrement={() => setFormData(prev => ({ ...prev, amount: String(Math.max(0, Number(prev.amount) - 1)) }))}
                    min={0}
                    max={fromMethodBalance}
                    error={errors.amount}
                  />
                  <p className="text-[10px] text-font-2 mt-1">Available: €{fromMethodBalance.toFixed(2)}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-bg-2 text-font-2">
                  <ArrowRight className="h-12 w-12" />
                </div>
              </div>

              {/* Destination */}
              <div className="flex-1 flex flex-col items-center text-center space-y-4">
                <div className="w-full flex flex-col items-center">
                  <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Destination</p>
                  <Combobox
                    options={methodOptions}
                    value={transferTo}
                    onChange={setTransferTo}
                  />
                </div>
                <div className="w-full pt-2">
                  <p className="text-xs font-medium text-font-2 mb-2">Receiving</p>
                  <MoneyDisplay 
                    amount={Number(formData.amount) || 0} 
                    className="text-4xl font-bold" 
                    colorPositive={true}
                    useSignum={true}
                    showSign={true}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 py-4">
            <div className="flex items-center justify-center w-full gap-12">
              <div className="w-64 space-y-4">
                <Combobox
                  label="Method"
                  options={methodOptions}
                  value={transferFrom}
                  onChange={setTransferFrom}
                />
                <StepperInput
                  label="Amount"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  onIncrement={() => setFormData(prev => ({ ...prev, amount: String(Number(prev.amount) + 1) }))}
                  onDecrement={() => setFormData(prev => ({ ...prev, amount: String(Math.max(0, Number(prev.amount) - 1)) }))}
                  min={0}
                  error={errors.amount}
                />
              </div>
              <div className="flex flex-col justify-center items-center bg-bg-2 rounded-xl p-8 border border-border min-w-[200px]">
                 <p className="text-xs font-semibold text-font-2 uppercase tracking-wider mb-2">Deposit Preview</p>
                 <MoneyDisplay 
                  amount={Number(formData.amount) || 0} 
                  className="text-4xl font-bold" 
                  colorPositive={true}
                  useSignum={true}
                  showSign={true}
                />
              </div>
            </div>
          </div>
        )}

        <Divider />

        <div className="grid grid-cols-2 gap-4">
          <DatePicker label="Date" selected={formData.date} onChange={(date: Date | null) => date && setFormData(prev => ({ ...prev, date }))} error={errors.date} />
          <Input label="Note" name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g., Monthly savings" />
        </div>
      </div>
    </Modal>
  );
};

export default TransferModal;
