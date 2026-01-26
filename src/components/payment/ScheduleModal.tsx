import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { getDate, getDay, getMonth, parseISO, startOfDay, startOfToday, subMonths, isBefore } from 'date-fns';
import Combobox from '../ui/Combobox';
import { useQueryClient } from '@tanstack/react-query';
import Divider from '../ui/Divider';
import StepperInput from '../ui/StepperInput';
import Tooltip from '../ui/Tooltip';
import { Info } from 'lucide-react';
import EntityModal from '../debt/EntityModal';
import ButtonGroup from '../ui/ButtonGroup';
import { useSettingsStore } from '../../store/useSettingsStore';
import { IncomeSchedule } from '../../logic/incomeCommitments';
import { incomeLogic } from '../../logic/incomeLogic';
import { parseRecurrenceRule, calculateOccurrences } from '../../logic/incomeScheduling';
import Checkbox from '../ui/Checkbox';
import { cn } from '../../utils/cn';
import CategoryModal from '../categories/CategoryModal';
import { useActiveCategories, useEntities } from '../../hooks/useReferenceData';
import { useActivePaymentMethods } from '../../hooks/usePaymentMethods';

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
  const queryClient = useQueryClient();

  const [type, setType] = useState<'income' | 'expense'>('income');
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
    notes: '',
    recipientId: '',
    categoryId: '',
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

  useEffect(() => {
    if (isOpen) {
      if (scheduleToEdit && initializedRef.current !== scheduleToEdit.ScheduleID) {
        setType(scheduleToEdit.Type || 'income');
        
        setFormData({
          amount: String(scheduleToEdit.ExpectedAmount || 0),
          notes: scheduleToEdit.Note || '',
          recipientId: String(scheduleToEdit.RecipientID || ''),
          categoryId: String(scheduleToEdit.CategoryID || ''),
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
      } else if (!scheduleToEdit && initializedRef.current !== null) {
        const today = getCurrentDate();
        setFormData({ 
          amount: '0', 
          notes: '',
          recipientId: '',
          categoryId: '',
          paymentMethodId: activePaymentMethods.length > 0 ? String(activePaymentMethods[0].PaymentMethodID) : '',
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
        setType('income');
      }
      setErrors({});
    } else {
      initializedRef.current = undefined;
    }
  }, [isOpen, scheduleToEdit, getCurrentDate, activePaymentMethods]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0.';
    if (!formData.recipientId) newErrors.recipientId = `${type === 'income' ? 'Source' : 'Recipient'} is required.`;
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
        RecipientID: Number(formData.recipientId),
        CategoryID: Number(formData.categoryId) || null,
        PaymentMethodID: Number(formData.paymentMethodId),
        ExpectedAmount: Number(formData.amount),
        RecurrenceRule: formData.recurrenceRule,
        DayOfMonth: Number(formData.dayOfMonth),
        DayOfWeek: Number(formData.dayOfWeek),
        MonthOfYear: Number(formData.monthOfYear),
        RequiresConfirmation: formData.requiresConfirmation ? 1 : 0,
        LookaheadDays: formData.lookaheadDays,
        IsActive: formData.isActive ? 1 : 0,
        Note: formData.notes
      };

      if (scheduleToEdit) {
        await db.execute(
          'UPDATE Schedules SET Type = ?, RecipientID = ?, CategoryID = ?, PaymentMethodID = ?, ExpectedAmount = ?, RecurrenceRule = ?, DayOfMonth = ?, DayOfWeek = ?, MonthOfYear = ?, RequiresConfirmation = ?, LookaheadDays = ?, IsActive = ?, Note = ? WHERE ScheduleID = ?',
          [...Object.values(scheduleData), scheduleToEdit.ScheduleID]
        );
      } else {
        await db.execute(
          'INSERT INTO Schedules (Type, RecipientID, CategoryID, PaymentMethodID, ExpectedAmount, RecurrenceRule, DayOfMonth, DayOfWeek, MonthOfYear, RequiresConfirmation, LookaheadDays, IsActive, Note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          Object.values(scheduleData)
        );
      }
      
      // Run background processing without blocking
      incomeLogic.processSchedules().then(() => {
        queryClient.invalidateQueries({ queryKey: ['incomeSchedules'] });
        queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
      });

      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save schedule' });
      throw err;
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

  const showCreateForPastPeriodCheckbox = useMemo(() => {
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
  }, [formData.recurrenceRule, formData.dayOfMonth, formData.dayOfWeek, formData.monthOfYear, scheduleToEdit, getCurrentDate]);

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
        title={scheduleToEdit ? "Edit Schedule" : "Add Schedule"}
        onEnter={handleSubmit}
        isDatabaseTransaction
        successToastMessage={scheduleToEdit ? "Schedule updated successfully" : "Schedule created successfully"}
        errorToastMessage="Failed to save schedule"
        loadingMessage="Saving schedule..."
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

              {/* 3. Recipient / Source */}
              <div className="flex items-end gap-2">
                <Combobox
                  label={type === 'income' ? "Source" : "Recipient"}
                  placeholder={`Select a ${type === 'income' ? 'source' : 'recipient'}...`}
                  searchPlaceholder={`Search ${type === 'income' ? 'source' : 'recipient'}...`}
                  noResultsText={`No ${type === 'income' ? 'sources' : 'recipients'} found.`}
                  options={entityOptions}
                  value={formData.recipientId}
                  onChange={val => setFormData(prev => ({...prev, recipientId: val}))}
                  className="flex-1"
                  error={errors.recipientId}
                  variant="add"
                  onAdd={() => setIsEntityModalOpen(true)}
                />
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
                <div className={cn("flex items-center gap-2 transition-opacity", showCreateForPastPeriodCheckbox ? "opacity-100" : "opacity-0 pointer-events-none")}>
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
              
              <Input label="Note" name="notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g., Monthly salary" />
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

export default ScheduleModal;
