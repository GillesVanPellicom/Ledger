import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { format, getDate, getDay, getMonth, parseISO, startOfDay, startOfToday, subMonths, isBefore } from 'date-fns';
import { PaymentMethod, Store } from '../../types';
import Combobox from '../ui/Combobox';
import { useQueryClient } from '@tanstack/react-query';
import Divider from '../ui/Divider';
import StepperInput from '../ui/StepperInput';
import Tooltip from '../ui/Tooltip';
import { Plus, Info } from 'lucide-react';
import IncomeCategoryModal from '../categories/IncomeCategoryModal';
import IncomeSourceModal from '../income/IncomeSourceModal';
import StoreModal from '../stores/StoreModal';
import EntityModal from '../debt/EntityModal';
import ButtonGroup from '../ui/ButtonGroup';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useErrorStore } from '../../store/useErrorStore';
import { incomeCommitments, IncomeSchedule } from '../../logic/incomeCommitments';
import { incomeLogic } from '../../logic/incomeLogic';
import { parseRecurrenceRule, calculateOccurrences } from '../../logic/incomeScheduling';
import Checkbox from '../ui/Checkbox';
import { cn } from '../../utils/cn';
import CategoryModal from '../categories/CategoryModal';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  scheduleToEdit: IncomeSchedule | null;
}

const dayOfMonthOptions = Array.from({length: 31}, (_, i) => ({value: String(i + 1), label: String(i + 1)}));
const dayOfWeekOptions = [
  {value: '1', label: 'Monday'}, {value: '2', label: 'Tuesday'}, {value: '3', label: 'Wednesday'},
  {value: '4', label: 'Thursday'}, {value: '5', label: 'Friday'}, {value: '6', label: 'Saturday'}, {
    value: '0',
    label: 'Sunday'
  }
];
const monthOfYearOptions = [
  {value: '0', label: 'January'}, {value: '1', label: 'February'}, {value: '2', label: 'March'},
  {value: '3', label: 'April'}, {value: '4', label: 'May'}, {value: '5', label: 'June'},
  {value: '6', label: 'July'}, {value: '7', label: 'August'}, {value: '8', label: 'September'},
  {value: '9', label: 'October'}, {value: '10', label: 'November'}, {value: '11', label: 'December'}
];

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSave, scheduleToEdit }) => {
  const { settings } = useSettingsStore();
  const { showError } = useErrorStore();
  const queryClient = useQueryClient();

  const [type, setType] = useState<'income' | 'expense'>('income');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  
  const [isIncomeCategoryModalOpen, setIsIncomeCategoryModalOpen] = useState(false);
  const [isProductCategoryModalOpen, setIsProductCategoryModalOpen] = useState(false);
  const [isIncomeSourceModalOpen, setIsIncomeSourceModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);

  const getCurrentDate = useCallback(() => {
    if (settings.dev?.mockTime?.enabled && settings.dev.mockTime.date) {
      return startOfDay(parseISO(settings.dev.mockTime.date));
    }
    return startOfToday();
  }, [settings.dev?.mockTime]);

  const [formData, setFormData] = useState({ 
    amount: '0', 
    notes: '',
    sourceName: '',
    debtorName: '',
    category: '',
    paymentMethodId: '',
    recurrenceRule: 'FREQ=MONTHLY;INTERVAL=1',
    dayOfMonth: String(getDate(getCurrentDate())),
    dayOfWeek: String(getDay(getCurrentDate())),
    monthOfYear: String(getMonth(getCurrentDate())),
    requiresConfirmation: true,
    lookaheadDays: 7,
    isActive: true,
    createForPastPeriod: false
  });

  const initializedRef = useRef<number | null | undefined>(undefined);

  const fetchReferenceData = useCallback(async () => {
    const [pmRows, catRows, prodCatRows, srcRows, entRows, storeRows] = await Promise.all([
      db.query<PaymentMethod>("SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName"),
      db.query<any>("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName"),
      db.query<any>("SELECT ProductCategoryID as CategoryID, ProductCategoryName as CategoryName FROM ProductCategories WHERE ProductCategoryIsActive = 1 ORDER BY ProductCategoryName"),
      db.query<any>("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName"),
      db.query<any>("SELECT EntityID as DebtorID, EntityName as DebtorName FROM Entities WHERE EntityIsActive = 1 ORDER BY EntityName"),
      db.query<Store>("SELECT VendorID as StoreID, VendorName as StoreName FROM Vendors WHERE VendorIsActive = 1 ORDER BY VendorName")
    ]);
    setPaymentMethods(pmRows);
    setIncomeCategories(catRows.map(r => ({ value: r.IncomeCategoryName, label: r.IncomeCategoryName })));
    setProductCategories(prodCatRows.map(r => ({ value: r.CategoryName, label: r.CategoryName })));
    setIncomeSources(srcRows.map(r => ({ value: r.IncomeSourceName, label: r.IncomeSourceName })));
    setEntities(entRows.map(r => ({ value: r.DebtorName, label: r.DebtorName })));
    setStores(storeRows.map(r => ({ value: r.StoreName, label: r.StoreName })));
    
    return { pmRows, catRows, prodCatRows, srcRows, entRows, storeRows };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initialize = async () => {
        const { pmRows, entRows } = await fetchReferenceData();
        
        if (scheduleToEdit && initializedRef.current !== scheduleToEdit.ScheduleID) {
          setType(scheduleToEdit.Type || 'income');
          
          // Find debtor name if ID exists
          let debtorName = '';
          if (scheduleToEdit.EntityID) {
             const debtor = entRows.find((d: any) => d.DebtorID === scheduleToEdit.EntityID);
             if (debtor) debtorName = debtor.DebtorName;
          }

          setFormData({
            amount: String(scheduleToEdit.ExpectedAmount || 0),
            notes: scheduleToEdit.Note || '',
            sourceName: scheduleToEdit.SourceName || '',
            category: scheduleToEdit.Category || '',
            debtorName,
            paymentMethodId: String(scheduleToEdit.PaymentMethodID),
            recurrenceRule: scheduleToEdit.RecurrenceRule || 'FREQ=MONTHLY;INTERVAL=1',
            dayOfMonth: String(scheduleToEdit.DayOfMonth || getDate(getCurrentDate())),
            dayOfWeek: String(scheduleToEdit.DayOfWeek || getDay(getCurrentDate())),
            monthOfYear: String(scheduleToEdit.MonthOfYear || getMonth(getCurrentDate())),
            requiresConfirmation: scheduleToEdit.RequiresConfirmation,
            lookaheadDays: scheduleToEdit.LookaheadDays || 7,
            isActive: scheduleToEdit.IsActive,
            createForPastPeriod: false
          });
          initializedRef.current = scheduleToEdit.ScheduleID;
        } else if (!scheduleToEdit) {
          const today = getCurrentDate();
          setFormData({ 
            amount: '0', 
            notes: '',
            sourceName: '',
            debtorName: '',
            category: '',
            paymentMethodId: pmRows.length > 0 ? String(pmRows[0].PaymentMethodID) : '',
            recurrenceRule: 'FREQ=MONTHLY;INTERVAL=1',
            dayOfMonth: String(getDate(today)),
            dayOfWeek: String(getDay(today)),
            monthOfYear: String(getMonth(today)),
            requiresConfirmation: true,
            lookaheadDays: 7,
            isActive: true,
            createForPastPeriod: false
          });
          initializedRef.current = null;
          setType('income'); // Default to income
        }
        setErrors({});
      };
      
      initialize();
    } else {
      initializedRef.current = undefined;
    }
  }, [isOpen, scheduleToEdit, fetchReferenceData, getCurrentDate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (!formData.sourceName) newErrors.sourceName = type === 'income' ? 'Source name is required.' : 'Store name is required.';
    if (!formData.paymentMethodId) newErrors.paymentMethodId = 'Payment method is required.';
    
    if (formData.monthOfYear === '1' && Number(formData.dayOfMonth) > 28) {
        newErrors.date = "February cannot have more than 28 days.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const scheduleData = {
        Type: type,
        SourceName: formData.sourceName,
        Category: formData.category,
        DebtorName: formData.debtorName,
        PaymentMethodID: Number(formData.paymentMethodId),
        ExpectedAmount: Number(formData.amount),
        RecurrenceRule: formData.recurrenceRule,
        DayOfMonth: Number(formData.dayOfMonth),
        DayOfWeek: Number(formData.dayOfWeek),
        MonthOfYear: Number(formData.monthOfYear),
        RequiresConfirmation: formData.requiresConfirmation,
        LookaheadDays: formData.lookaheadDays,
        IsActive: formData.isActive,
        Note: formData.notes,
        CreateForPastPeriod: formData.createForPastPeriod
      };

      if (scheduleToEdit) {
        await incomeCommitments.updateSchedule(scheduleToEdit.ScheduleID, scheduleData);
      } else {
        await incomeCommitments.createSchedule(scheduleData);
      }
      
      await incomeLogic.processSchedules();
      
      queryClient.invalidateQueries({ queryKey: ['incomeSchedules'] });
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });

      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save schedule' });
    } finally {
      setLoading(false);
    }
  };

  const renderRecurrenceDetails = () => {
    const {type} = parseRecurrenceRule(formData.recurrenceRule);

    switch (type) {
      case 'MONTHLY':
        return (
          <Combobox
            label="Day of Month"
            options={dayOfMonthOptions}
            value={formData.dayOfMonth}
            onChange={val => setFormData(prev => ({...prev, dayOfMonth: val}))}
            showSearch={false}
          />
        );
      case 'WEEKLY':
        return (
          <Combobox
            label="Day of Week"
            options={dayOfWeekOptions}
            value={formData.dayOfWeek}
            onChange={val => setFormData(prev => ({...prev, dayOfWeek: val}))}
            showSearch={false}
          />
        );
      case 'YEARLY':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Combobox
              label="Month"
              options={monthOfYearOptions}
              value={formData.monthOfYear}
              onChange={val => setFormData(prev => ({...prev, monthOfYear: val}))}
              showSearch={false}
            />
            <Combobox
              label="Day"
              options={dayOfMonthOptions.slice(0, formData.monthOfYear === '1' ? 28 : 31)}
              value={formData.dayOfMonth}
              onChange={val => setFormData(prev => ({...prev, dayOfMonth: val}))}
              showSearch={false}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const showCreateForPastPeriodCheckbox = () => {
    if (scheduleToEdit) return false;
    try {
      const today = getCurrentDate();
      const oneMonthAgo = subMonths(today, 1);
      const occurrences = calculateOccurrences(
        {
          RecurrenceRule: formData.recurrenceRule,
          DayOfMonth: Number(formData.dayOfMonth),
          DayOfWeek: Number(formData.dayOfWeek),
          MonthOfYear: Number(formData.monthOfYear),
          CreationTimestamp: new Date().toISOString()
        } as any,
        oneMonthAgo,
        today
      );
      return occurrences.some(occ => isBefore(occ, today));
    } catch (e) {
      return false;
    }
  };

  const methodOptions = paymentMethods.map(pm => ({ value: String(pm.PaymentMethodID), label: pm.PaymentMethodName }));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={scheduleToEdit ? "Edit Schedule" : "Add Schedule"}
        onEnter={handleSubmit}
        size="lg"
        footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSubmit} loading={loading}>Save</Button></>}
      >
        <div className="space-y-6">
          {errors.form && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{errors.form}</div>}
          {errors.date && <div className="p-3 bg-red/10 text-red text-sm rounded-lg">{errors.date}</div>}
          
          <div className="flex flex-col items-center py-4">
            <div className="w-full max-w-md space-y-6">
              
              {/* 1. Toggle */}
              {!scheduleToEdit && (
                <div className="flex justify-center w-full">
                   <ButtonGroup variant="toggle" className="w-full" fullWidth>
                    <Tooltip content="Income Schedule">
                      <Button active={type === 'income'} onClick={() => setType('income')}>Income</Button>
                    </Tooltip>
                    <Tooltip content="Expense Schedule">
                      <Button active={type === 'expense'} onClick={() => setType('expense')}>Expense</Button>
                    </Tooltip>
                  </ButtonGroup>
                </div>
              )}

              {/* 2. Amount / Method */}
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

              {/* 3. Source / Store */}
              <div className="flex items-end gap-2">
                <Combobox
                  label={type === 'income' ? "Source Name" : "Store Name"}
                  placeholder={type === 'income' ? "e.g. Bonus, Tax Return" : "e.g. Netflix, Rent"}
                  options={type === 'income' ? incomeSources : stores}
                  value={formData.sourceName}
                  onChange={val => setFormData(prev => ({...prev, sourceName: val}))}
                  className="flex-1"
                  error={errors.sourceName}
                />
                <Tooltip content={type === 'income' ? "Add Source" : "Add Store"}>
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => type === 'income' ? setIsIncomeSourceModalOpen(true) : setIsStoreModalOpen(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </Tooltip>
              </div>

              {/* 4. Scheduling Details */}
              <Divider text="Scheduling Details" />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-sm font-medium text-font-1">Recurrence</label>
                    <Tooltip content={`How often this ${type} is expected.`}>
                      <Info className="h-4 w-4 text-font-2 cursor-help"/>
                    </Tooltip>
                  </div>
                  <Combobox
                    options={[
                      {value: 'FREQ=DAILY;INTERVAL=1', label: 'Daily'},
                      {value: 'FREQ=WEEKLY;INTERVAL=1', label: 'Weekly'},
                      {value: 'FREQ=MONTHLY;INTERVAL=1', label: 'Monthly'},
                      {value: 'FREQ=YEARLY;INTERVAL=1', label: 'Yearly'},
                    ]}
                    value={formData.recurrenceRule}
                    onChange={val => setFormData(prev => ({...prev, recurrenceRule: val}))}
                    showSearch={false}
                  />
                </div>
                {renderRecurrenceDetails()}
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium text-font-1">Lookahead Days</label>
                  <Tooltip content="How many days in advance to generate a 'To Check' item.">
                    <Info className="h-4 w-4 text-font-2 cursor-help"/>
                  </Tooltip>
                </div>
                <StepperInput
                  value={String(formData.lookaheadDays)}
                  onChange={e => setFormData(prev => ({
                    ...prev, lookaheadDays: Number.parseInt(e.target.value) || 0
                  }))}
                  onIncrement={() => setFormData(prev => ({
                    ...prev,
                    lookaheadDays: (prev.lookaheadDays || 0) + 1
                  }))}
                  onDecrement={() => setFormData(prev => ({
                    ...prev,
                    lookaheadDays: Math.max(1, (prev.lookaheadDays || 0) - 1)
                  }))}
                  min={1}
                  max={1000}
                  precision={0}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    label="Requires manual confirmation"
                    checked={formData.requiresConfirmation}
                    onChange={e => setFormData(prev => ({ ...prev, requiresConfirmation: e.target.checked }))}
                  />
                  <Tooltip content={`If enabled, you must confirm each occurrence before it's deposited. Must be confirmed in tab "To Check"`}>
                    <Info className="h-4 w-4 text-font-2 cursor-help"/>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    label="Schedule is active"
                    checked={formData.isActive}
                    onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <Tooltip content="Whether this schedule should currently generate reminders or deposits.">
                    <Info className="h-4 w-4 text-font-2 cursor-help"/>
                  </Tooltip>
                </div>
                <div className={cn("flex items-center gap-2 transition-opacity", showCreateForPastPeriodCheckbox() ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  <Checkbox
                    label="Create for current period"
                    checked={formData.createForPastPeriod}
                    onChange={e => setFormData(prev => ({ ...prev, createForPastPeriod: e.target.checked }))}
                  />
                  <Tooltip content="The scheduled date for the current period is in the past. Check this to create a 'To Check' item for it anyway.">
                    <Info className="h-4 w-4 text-font-2 cursor-help"/>
                  </Tooltip>
                </div>
              </div>

              {/* 5. Optional Details */}
              <Divider text="Optional Details" />
              
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-sm font-medium text-font-1">Entity</label>
                    <Tooltip content="Associate this income with an entity for extra context.">
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

              <div className="flex items-end gap-2">
                <Combobox
                  label="Category"
                  options={type === 'income' ? incomeCategories : productCategories}
                  value={formData.category}
                  onChange={val => setFormData(prev => ({...prev, category: val}))}
                  className="flex-1"
                />
                <Tooltip content="Add Category">
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => type === 'income' ? setIsIncomeCategoryModalOpen(true) : setIsProductCategoryModalOpen(true)}>
                    <Plus className="h-5 w-5"/>
                  </Button>
                </Tooltip>
              </div>
              
              <Input label="Note" name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g., Monthly salary" />
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

      <CategoryModal
        isOpen={isProductCategoryModalOpen}
        onClose={() => setIsProductCategoryModalOpen(false)}
        onSave={fetchReferenceData}
        categoryToEdit={null}
      />

      <IncomeSourceModal
        isOpen={isIncomeSourceModalOpen}
        onClose={() => setIsIncomeSourceModalOpen(false)}
        onSave={fetchReferenceData}
        sourceToEdit={null}
      />

      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        onSave={fetchReferenceData}
        storeToEdit={null}
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

export default ScheduleModal;
