import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { db } from '../../utils/db';
import { format, parseISO, startOfDay, startOfToday } from 'date-fns';
import { TopUp } from '../../types';
import Combobox from '../ui/Combobox';
import { useQueryClient } from '@tanstack/react-query';
import Divider from '../ui/Divider';
import StepperInput from '../ui/StepperInput';
import CategoryModal from '../categories/CategoryModal';
import EntityModal from '../debt/EntityModal';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useActiveCategories, useEntities } from '../../hooks/useReferenceData';
import { useActivePaymentMethods } from '../../hooks/usePaymentMethods';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  topUpToEdit: (TopUp & { RecipientID?: number; CategoryID?: number; EntityID?: number; PaymentMethodID?: number }) | null;
  paymentMethodId?: string;
}

const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSave, topUpToEdit, paymentMethodId }) => {
  const { settings } = useSettingsStore();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { data: activePaymentMethods = [] } = useActivePaymentMethods();
  const { data: activeCategories = [] } = useActiveCategories();
  const { data: entitiesData } = useEntities({ page: 1, pageSize: 1000 });
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);

  const getCurrentDate = useCallback(() => {
    if (settings.dev?.mockTime?.enabled && settings.dev.mockTime.date) {
      return startOfDay(parseISO(settings.dev.mockTime.date));
    }
    return startOfToday();
  }, [settings.dev?.mockTime]);

  const [formData, setFormData] = useState({ 
    amount: '0', 
    date: getCurrentDate(), 
    notes: '',
    recipientId: '',
    categoryId: '',
    paymentMethodId: paymentMethodId || '',
  });

  const initializedRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      if (topUpToEdit && initializedRef.current !== topUpToEdit.IncomeID) {
        setFormData({
          amount: String(topUpToEdit.IncomeAmount),
          date: parseISO(topUpToEdit.IncomeDate),
          notes: topUpToEdit.IncomeNote || '',
          recipientId: String(topUpToEdit.RecipientID || ''),
          categoryId: String(topUpToEdit.CategoryID || ''),
          paymentMethodId: String(topUpToEdit.PaymentMethodID),
        });
        initializedRef.current = topUpToEdit.IncomeID;
      } else if (!topUpToEdit && initializedRef.current !== null) {
        const today = getCurrentDate();
        setFormData({ 
          amount: '0', 
          date: today, 
          notes: '',
          recipientId: '',
          categoryId: '',
          paymentMethodId: paymentMethodId || (activePaymentMethods.length > 0 ? String(activePaymentMethods[0].PaymentMethodID) : ''),
        });
        initializedRef.current = null;
      }
      setErrors({});
    } else {
      initializedRef.current = undefined;
    }
  }, [isOpen, topUpToEdit, paymentMethodId, getCurrentDate, activePaymentMethods]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (!formData.recipientId) newErrors.recipientId = 'Source is required.';
    if (!formData.paymentMethodId) newErrors.paymentMethodId = 'Payment method is required.';
    if (!formData.date) newErrors.date = 'Date is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (topUpToEdit) {
        await db.execute(
          'UPDATE Income SET IncomeAmount = ?, IncomeDate = ?, IncomeNote = ?, PaymentMethodID = ?, RecipientID = ?, CategoryID = ? WHERE IncomeID = ?',
          [Number(formData.amount), format(formData.date, 'yyyy-MM-dd'), formData.notes, Number(formData.paymentMethodId), Number(formData.recipientId) || null, Number(formData.categoryId) || null, topUpToEdit.IncomeID]
        );
      } else {
        await db.execute(
          'INSERT INTO Income (IncomeAmount, IncomeDate, IncomeNote, PaymentMethodID, RecipientID, CategoryID) VALUES (?, ?, ?, ?, ?, ?)',
          [Number(formData.amount), format(formData.date, 'yyyy-MM-dd'), formData.notes, Number(formData.paymentMethodId), Number(formData.recipientId) || null, Number(formData.categoryId) || null]
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ['paymentMethodBalance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['incomeSchedules'] });
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });

      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save income' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const methodOptions = useMemo(() => activePaymentMethods.map(pm => ({ value: String(pm.PaymentMethodID), label: pm.PaymentMethodName })), [activePaymentMethods]);
  const categoryOptions = useMemo(() => activeCategories.map(c => ({ value: String(c.CategoryID), label: c.CategoryName })), [activeCategories]);
  const entityOptions = useMemo(() => (entitiesData?.entities || []).map((e: any) => ({ value: String(e.EntityID), label: e.EntityName })), [entitiesData]);

  const handleEntitySave = async (newId?: number) => {
    queryClient.invalidateQueries({ queryKey: ['entities'] });
    if (newId) {
      setFormData(prev => ({...prev, recipientId: String(newId)}));
    }
    setIsEntityModalOpen(false);
  };

  const handleCategorySave = async (newId?: number) => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    if (newId) {
      setFormData(prev => ({...prev, categoryId: String(newId)}));
    }
    setIsCategoryModalOpen(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={topUpToEdit ? "Edit Income" : "Add Income"}
        onEnter={handleSubmit}
        isDatabaseTransaction
        successToastMessage={topUpToEdit ? "Income updated successfully" : "Income added successfully"}
        errorToastMessage="Failed to save income"
        loadingMessage="Saving income..."
        size="lg"
        footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
      >
        <div className="space-y-6">
          {errors.form && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{errors.form}</div>}
          
          <div className="flex flex-col items-center py-4">
            <div className="w-full max-w-md space-y-4">
              {/* 1. Amount / Method */}
              <div className="grid grid-cols-2 gap-4">
                <StepperInput
                  label="Amount"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  onIncrement={() => setFormData(prev => ({ ...prev, amount: String(Number(prev.amount) + 1) }))}
                  onDecrement={() => setFormData(prev => ({ ...prev, amount: String(Math.max(0, Number(prev.amount) - 1)) }))}
                  min={0}
                  error={errors.amount}
                />
                <Combobox
                  label="Method"
                  options={methodOptions}
                  value={formData.paymentMethodId}
                  onChange={val => setFormData(prev => ({...prev, paymentMethodId: val}))}
                  error={errors.paymentMethodId}
                />
              </div>

              {/* 2. Source */}
              <div className="flex items-end gap-2">
                <Combobox
                  label="Source"
                  placeholder="Select a source..."
                  searchPlaceholder="Search source..."
                  noResultsText="No sources found."
                  options={entityOptions}
                  value={formData.recipientId}
                  onChange={val => setFormData(prev => ({...prev, recipientId: val}))}
                  className="flex-1"
                  error={errors.recipientId}
                  variant="add"
                  onAdd={() => setIsEntityModalOpen(true)}
                />
              </div>

              {/* 3. Date */}
              <div className="grid grid-cols-1 gap-4">
                <DatePicker label="Date" selected={formData.date} onChange={(date: Date | null) => date && setFormData(prev => ({ ...prev, date }))} error={errors.date} />
              </div>

              {/* 4. Divider */}
              <Divider text="Optional Details" />

              {/* 5. Category */}
              <div className="flex items-end gap-2">
                <Combobox
                  label="Category"
                  placeholder="Select a category..."
                  searchPlaceholder="Search category..."
                  noResultsText="No categories found."
                  options={categoryOptions}
                  value={formData.categoryId}
                  onChange={val => setFormData(prev => ({...prev, categoryId: val}))}
                  className="flex-1"
                  variant="add"
                  onAdd={() => setIsCategoryModalOpen(true)}
                />
              </div>

              {/* 6. Note */}
              <Input label="Note" name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g., Birthday gift" />
            </div>
          </div>
        </div>
      </Modal>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleCategorySave}
        categoryToEdit={null}
      />

      <EntityModal
        isOpen={isEntityModalOpen}
        onClose={() => setIsEntityModalOpen(false)}
        onSave={handleEntitySave}
        entityToEdit={null}
      />
    </>
  );
};

export default IncomeModal;
