import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import DatePicker from '../ui/DatePicker';
import { db } from '../../utils/db';
import { format, parseISO, startOfDay, startOfToday } from 'date-fns';
import { PaymentMethod, TopUp } from '../../types';
import Combobox from '../ui/Combobox';
import { useQueryClient } from '@tanstack/react-query';
import Divider from '../ui/Divider';
import StepperInput from '../ui/StepperInput';
import Tooltip from '../ui/Tooltip';
import { Plus, Info } from 'lucide-react';
import IncomeCategoryModal from '../categories/IncomeCategoryModal';
import IncomeSourceModal from '../income/IncomeSourceModal';
import EntityModal from '../debt/EntityModal';
import { useSettingsStore } from '../../store/useSettingsStore';
import { incomeCommitments } from '../../logic/incomeCommitments';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  topUpToEdit: (TopUp & { IncomeSourceID?: number; IncomeCategoryID?: number; DebtorID?: number; PaymentMethodID?: number }) | null;
  paymentMethodId?: string;
}

const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSave, topUpToEdit, paymentMethodId }) => {
  const { settings } = useSettingsStore();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  
  const [isIncomeCategoryModalOpen, setIsIncomeCategoryModalOpen] = useState(false);
  const [isIncomeSourceModalOpen, setIsIncomeSourceModalOpen] = useState(false);
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
    sourceName: '',
    debtorName: '',
    category: '',
    paymentMethodId: paymentMethodId || '',
  });

  const initializedRef = useRef<number | null | undefined>(undefined);

  const fetchReferenceData = useCallback(async () => {
    const [pmRows, catRows, srcRows, entRows] = await Promise.all([
      db.query<PaymentMethod>("SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName"),
      db.query<any>("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName"),
      db.query<any>("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName"),
      db.query<any>("SELECT EntityID as DebtorID, EntityName as DebtorName FROM Entities WHERE EntityIsActive = 1 ORDER BY EntityName")
    ]);
    setPaymentMethods(pmRows);
    setIncomeCategories(catRows.map(r => ({ value: r.IncomeCategoryName, label: r.IncomeCategoryName })));
    setIncomeSources(srcRows.map(r => ({ value: r.IncomeSourceName, label: r.IncomeSourceName })));
    setEntities(entRows.map(r => ({ value: r.DebtorName, label: r.DebtorName })));
    
    return { pmRows, catRows, srcRows, entRows };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initialize = async () => {
        const { pmRows, catRows, srcRows, entRows } = await fetchReferenceData();
        
        if (topUpToEdit && initializedRef.current !== topUpToEdit.IncomeID) {
          const sourceName = srcRows.find((s: any) => s.IncomeSourceID === topUpToEdit.IncomeSourceID)?.IncomeSourceName || '';
          const categoryName = catRows.find((c: any) => c.IncomeCategoryID === topUpToEdit.IncomeCategoryID)?.IncomeCategoryName || '';
          const debtorName = entRows.find((d: any) => d.DebtorID === topUpToEdit.EntityID)?.DebtorName || '';

          setFormData({
            amount: String(topUpToEdit.IncomeAmount),
            date: parseISO(topUpToEdit.IncomeDate),
            notes: topUpToEdit.IncomeNote || '',
            sourceName,
            category: categoryName,
            debtorName,
            paymentMethodId: String(topUpToEdit.PaymentMethodID),
          });
          initializedRef.current = topUpToEdit.IncomeID;
        } else if (!topUpToEdit) {
          const today = getCurrentDate();
          setFormData({ 
            amount: '0', 
            date: today, 
            notes: '',
            sourceName: '',
            debtorName: '',
            category: '',
            paymentMethodId: paymentMethodId || (pmRows.length > 0 ? String(pmRows[0].PaymentMethodID) : ''),
          });
          initializedRef.current = null;
        }
        setErrors({});
      };
      
      initialize();
    } else {
      initializedRef.current = undefined;
    }
  }, [isOpen, topUpToEdit, paymentMethodId, fetchReferenceData, getCurrentDate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (!formData.sourceName) newErrors.sourceName = 'Source name is required.';
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
        const sourceId = (await db.queryOne<any>('SELECT IncomeSourceID FROM IncomeSources WHERE IncomeSourceName = ?', [formData.sourceName]))?.IncomeSourceID;
        const categoryId = (await db.queryOne<any>('SELECT IncomeCategoryID FROM IncomeCategories WHERE IncomeCategoryName = ?', [formData.category]))?.IncomeCategoryID;
        const debtorId = (await db.queryOne<any>('SELECT EntityID FROM Entities WHERE EntityName = ?', [formData.debtorName]))?.EntityID;

        await db.execute(
          'UPDATE Income SET IncomeAmount = ?, IncomeDate = ?, IncomeNote = ?, PaymentMethodID = ?, IncomeSourceID = ?, IncomeCategoryID = ?, EntityID = ? WHERE IncomeID = ?',
          [Number(formData.amount), format(formData.date, 'yyyy-MM-dd'), formData.notes, Number(formData.paymentMethodId), sourceId || null, categoryId || null, debtorId || null, topUpToEdit.IncomeID]
        );
      } else {
        await incomeCommitments.createOneTimeIncome({
          SourceName: formData.sourceName,
          Category: formData.category || null,
          DebtorName: formData.debtorName || null,
          PaymentMethodID: Number(formData.paymentMethodId),
          Amount: Number(formData.amount),
          Date: format(formData.date, 'yyyy-MM-dd'),
          Note: formData.notes
        });
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

              {/* 3. Date */}
              <div className="grid grid-cols-1 gap-4">
                <DatePicker label="Date" selected={formData.date} onChange={(date: Date | null) => date && setFormData(prev => ({ ...prev, date }))} error={errors.date} />
              </div>

              {/* 4. Divider */}
              <Divider text="Optional Details" />

              {/* 5. Entity */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-sm font-medium text-font-1">Entity</label>
                    <Tooltip content="Associate this income with an entity for extra context. Note: This does NOT settle any outstanding debts. To settle debt, please use the Repayment feature on the Entity page.">
                      <Info className="h-4 w-4 text-font-2 cursor-help"/>
                    </Tooltip>
                  </div>
                  <Combobox
                    placeholder="Select an entity..."
                    options={entities}
                    value={formData.debtorName}
                    onChange={val => setFormData(prev => ({...prev, debtorName: val}))}
                  />
                </div>
                <Tooltip content="Add Entity">
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsEntityModalOpen(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </Tooltip>
              </div>

              {/* 6. Category */}
              <div className="flex items-end gap-2">
                <Combobox
                  label="Category"
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

              {/* 7. Note */}
              <Input label="Note" name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g., Birthday gift" />
            </div>
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

      <EntityModal
        isOpen={isEntityModalOpen}
        onClose={() => setIsEntityModalOpen(false)}
        onSave={fetchReferenceData}
        entityToEdit={null}
      />
    </>
  );
};

export default IncomeModal;
