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
import MoneyDisplay from '../ui/MoneyDisplay';
import Divider from '../ui/Divider';
import StepperInput from '../ui/StepperInput';
import Tooltip from '../ui/Tooltip';
import { Plus } from 'lucide-react';
import IncomeCategoryModal from '../categories/IncomeCategoryModal';
import IncomeSourceModal from '../income/IncomeSourceModal';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  topUpToEdit: TopUp | null;
  paymentMethodId?: string;
}

const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSave, topUpToEdit, paymentMethodId }) => {
  const [formData, setFormData] = useState({ 
    amount: '0', 
    date: new Date(), 
    notes: '',
    sourceName: '',
    category: '',
    paymentMethodId: paymentMethodId || ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  
  const [isIncomeCategoryModalOpen, setIsIncomeCategoryModalOpen] = useState(false);
  const [isIncomeSourceModalOpen, setIsIncomeSourceModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const fetchReferenceData = async () => {
    const [pmRows, catRows, srcRows] = await Promise.all([
      db.query<PaymentMethod>("SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1"),
      db.query<any>("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName"),
      db.query<any>("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName")
    ]);
    setPaymentMethods(pmRows);
    setIncomeCategories(catRows.map(r => ({ value: r.IncomeCategoryName, label: r.IncomeCategoryName })));
    setIncomeSources(srcRows.map(r => ({ value: r.IncomeSourceName, label: r.IncomeSourceName })));
    
    if (!formData.paymentMethodId && pmRows.length > 0) {
        setFormData(prev => ({ ...prev, paymentMethodId: String(pmRows[0].PaymentMethodID) }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReferenceData();
      if (topUpToEdit) {
        setFormData({
          amount: String(topUpToEdit.TopUpAmount),
          date: new Date(topUpToEdit.TopUpDate),
          notes: topUpToEdit.TopUpNote || '',
          sourceName: '', // Need to fetch source name if editing
          category: '', // Need to fetch category if editing
          paymentMethodId: String(topUpToEdit.PaymentMethodID)
        });
      } else {
        setFormData({ 
          amount: '0', 
          date: new Date(), 
          notes: '',
          sourceName: '',
          category: '',
          paymentMethodId: paymentMethodId || ''
        });
      }
      setErrors({});
    }
  }, [isOpen, topUpToEdit, paymentMethodId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const amount = Number(formData.amount);
    if (!formData.amount || amount <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (!formData.date) newErrors.date = 'Date is required.';
    if (!formData.sourceName) newErrors.sourceName = 'Source name is required.';
    if (!formData.paymentMethodId) newErrors.paymentMethodId = 'Payment method is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (topUpToEdit) {
        // Update logic (if needed)
      } else {
        const transactionDetails = {
          type: 'deposit',
          amount: Number(formData.amount),
          date: format(formData.date, 'yyyy-MM-dd'),
          note: formData.notes,
          from: formData.paymentMethodId,
          sourceName: formData.sourceName,
          category: formData.category
        };
        await window.electronAPI.createTransaction(transactionDetails);
      }
      
      queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });

      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save income' });
    } finally {
      setLoading(false);
    }
  };

  const methodOptions = paymentMethods.map(pm => ({ value: String(pm.PaymentMethodID), label: pm.PaymentMethodName }));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={topUpToEdit ? "Edit Income" : "Add Income"}
        onEnter={handleSubmit}
        size="lg"
        footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
      >
        <div className="space-y-6">
          {errors.form && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{errors.form}</div>}
          
          <div className="flex flex-col items-center gap-8 py-4">
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-end gap-2">
                <Combobox
                  label="Source Name"
                  placeholder="e.g. Bonus, Tax Return"
                  options={incomeSources}
                  value={formData.sourceName}
                  onChange={val => setFormData(prev => ({...prev, sourceName: val}))}
                  className="flex-1"
                  error={errors.sourceName}
                />
                <Tooltip content="Add Source">
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsIncomeSourceModalOpen(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </Tooltip>
              </div>
              <div className="flex items-end gap-2">
                <Combobox
                  label="Category (Optional)"
                  options={incomeCategories}
                  value={formData.category}
                  onChange={val => setFormData(prev => ({...prev, category: val}))}
                  className="flex-1"
                />
                <Tooltip content="Add Category">
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsIncomeCategoryModalOpen(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Combobox
                  label="Method"
                  options={methodOptions}
                  value={formData.paymentMethodId}
                  onChange={val => setFormData(prev => ({...prev, paymentMethodId: val}))}
                  error={errors.paymentMethodId}
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
            </div>
          </div>

          <Divider />

          <div className="grid grid-cols-2 gap-4">
            <DatePicker label="Date" selected={formData.date} onChange={(date: Date | null) => date && setFormData(prev => ({ ...prev, date }))} error={errors.date} />
            <Input label="Note" name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g., Birthday gift" />
          </div>
        </div>
      </Modal>

      <IncomeCategoryModal
        isOpen={isIncomeCategoryModalOpen}
        onClose={() => setIsIncomeCategoryModalOpen(false)}
        onSave={fetchReferenceData}
        categoryToEdit={null}
      />

      <IncomeSourceModal
        isOpen={isIncomeSourceModalOpen}
        onClose={() => setIsIncomeSourceModalOpen(false)}
        onSave={fetchReferenceData}
        sourceToEdit={null}
      />
    </>
  );
};

export default IncomeModal;
