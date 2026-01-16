import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  Trash,
  Edit,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Info
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { Header } from '../components/ui/Header';
import { incomeCommitments, PendingIncome } from '../logic/incomeCommitments';
import { incomeLogic } from '../logic/incomeLogic';
import { humanizeRecurrenceRule } from '../logic/incomeScheduling';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Combobox from '../components/ui/Combobox';
import StepperInput from '../components/ui/StepperInput';
import Checkbox from '../components/ui/Checkbox';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import IncomeCategoryModal from '../components/categories/IncomeCategoryModal';
import IncomeSourceModal from '../components/income/IncomeSourceModal';
import { format, parseISO } from 'date-fns';
import { cn } from '../utils/cn';
import { useErrorStore } from '../store/useErrorStore';
import { db } from '../utils/db';
import Tooltip from '../components/ui/Tooltip';

const IncomePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { showError } = useErrorStore();
  const [activeTab, setActiveTab] = useState<'to-check' | 'scheduled' | 'confirmed' | 'repayments'>('to-check');

  // Modal states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [isOneTimeModalOpen, setIsOneTimeModalOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<any>(null);
  const [confirmData, setConfirmData] = useState({ amount: 0, date: '' });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);

  const [newSchedule, setNewSchedule] = useState({
    SourceName: '',
    Category: '',
    PaymentMethodID: '',
    ExpectedAmount: '',
    RecurrenceRule: 'FREQ=MONTHLY;INTERVAL=1',
    RequiresConfirmation: true,
    LookaheadDays: 7,
    IsActive: true
  });

  useEffect(() => {
    if (editingSchedule) {
      setNewSchedule({
        SourceName: editingSchedule.SourceName || '',
        Category: editingSchedule.Category || '',
        PaymentMethodID: String(editingSchedule.PaymentMethodID),
        ExpectedAmount: String(editingSchedule.ExpectedAmount || ''),
        RecurrenceRule: editingSchedule.RecurrenceRule || 'FREQ=MONTHLY;INTERVAL=1',
        RequiresConfirmation: !!editingSchedule.RequiresConfirmation,
        LookaheadDays: editingSchedule.LookaheadDays || 7,
        IsActive: !!editingSchedule.IsActive
      });
    } else {
      setNewSchedule({
        SourceName: '',
        Category: '',
        PaymentMethodID: paymentMethods[0]?.value || '',
        ExpectedAmount: '',
        RecurrenceRule: 'FREQ=MONTHLY;INTERVAL=1',
        RequiresConfirmation: true,
        LookaheadDays: 7,
        IsActive: true
      });
    }
  }, [editingSchedule, paymentMethods]);

  const [oneTimeIncome, setOneTimeIncome] = useState({
    SourceName: '',
    Category: '',
    PaymentMethodID: '',
    Amount: '',
    Date: format(new Date(), 'yyyy-MM-dd')
  });

  const [isIncomeCategoryModalOpen, setIsIncomeCategoryModalOpen] = useState(false);
  const [isIncomeSourceModalOpen, setIsIncomeSourceModalOpen] = useState(false);

  useEffect(() => {
    // Load reference data
    const loadReferenceData = () => {
      db.query("SELECT * FROM PaymentMethods").then(rows => {
        setPaymentMethods(rows.map((r: any) => ({
          value: String(r.PaymentMethodID),
          label: r.PaymentMethodName
        })));
      });
      db.query("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName").then(rows => {
        setIncomeCategories(rows.map((r: any) => ({
          value: r.IncomeCategoryName,
          label: r.IncomeCategoryName
        })));
      });
      db.query("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName").then(rows => {
        setIncomeSources(rows.map((r: any) => ({
          value: r.IncomeSourceName,
          label: r.IncomeSourceName
        })));
      });
    };

    loadReferenceData();
  }, []);

  const handleIncomeCategorySave = (newId?: number) => {
    db.query("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName").then(rows => {
      setIncomeCategories(rows.map((r: any) => ({
        value: r.IncomeCategoryName,
        label: r.IncomeCategoryName
      })));
      if (newId) {
        db.queryOne("SELECT IncomeCategoryName FROM IncomeCategories WHERE IncomeCategoryID = ?", [newId]).then(cat => {
          if (cat) {
            if (isOneTimeModalOpen) setOneTimeIncome(prev => ({ ...prev, Category: cat.IncomeCategoryName }));
            if (isScheduleModalOpen) setNewSchedule(prev => ({ ...prev, Category: cat.IncomeCategoryName }));
          }
        });
      }
    });
  };

  const handleIncomeSourceSave = (newId?: number) => {
    db.query("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName").then(rows => {
      setIncomeSources(rows.map((r: any) => ({
        value: r.IncomeSourceName,
        label: r.IncomeSourceName
      })));
      if (newId) {
        db.queryOne("SELECT IncomeSourceName FROM IncomeSources WHERE IncomeSourceID = ?", [newId]).then(src => {
          if (src) {
            if (isOneTimeModalOpen) setOneTimeIncome(prev => ({ ...prev, SourceName: src.IncomeSourceName }));
            if (isScheduleModalOpen) setNewSchedule(prev => ({ ...prev, SourceName: src.IncomeSourceName }));
          }
        });
      }
    });
  };

  // Queries
  const { data: pendingIncomes, isLoading: loadingPending } = useQuery({
    queryKey: ['pendingIncome'],
    queryFn: () => incomeCommitments.getPendingIncomes()
  });

  const { data: schedules, isLoading: loadingSchedules } = useQuery({
    queryKey: ['incomeSchedules'],
    queryFn: () => incomeCommitments.getSchedules()
  });

  const { data: confirmedIncomes, isLoading: loadingConfirmed } = useQuery({
    queryKey: ['confirmedIncome'],
    queryFn: () => incomeCommitments.getConfirmedIncomeTopUps()
  });

  const { data: debtRepayments, isLoading: loadingRepayments } = useQuery({
    queryKey: ['debtRepayments'],
    queryFn: () => incomeCommitments.getDebtRepayments()
  });

  // Mutations
  const processSchedulesMutation = useMutation({
    mutationFn: () => incomeLogic.processSchedules(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
      queryClient.invalidateQueries({ queryKey: ['confirmedIncome'] });
    },
    onError: (err) => showError(err)
  });

  const confirmMutation = useMutation({
    mutationFn: ({ pending, amount, date }: { pending: any, amount: number, date: string }) =>
      incomeLogic.confirmPendingIncome(pending, amount, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
      queryClient.invalidateQueries({ queryKey: ['confirmedIncome'] });
      setIsConfirmModalOpen(false);
    },
    onError: (err) => showError(err)
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => incomeLogic.rejectPendingIncome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
    },
    onError: (err) => showError(err)
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => incomeCommitments.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSchedules'] });
      setIsScheduleModalOpen(false);
      setEditingSchedule(null);
      processSchedulesMutation.mutate();
    },
    onError: (err) => showError(err)
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: any) => incomeCommitments.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSchedules'] });
      setIsScheduleModalOpen(false);
      processSchedulesMutation.mutate();
    },
    onError: (err) => showError(err)
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: ({ id, cascade }: { id: number, cascade: boolean }) => incomeCommitments.deleteSchedule(id, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSchedules'] });
      processSchedulesMutation.mutate();
    },
    onError: (err) => showError(err)
  });

  const createOneTimeMutation = useMutation({
    mutationFn: (data: any) => incomeCommitments.createOneTimeIncome(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
      setIsOneTimeModalOpen(false);
      setOneTimeIncome({
        SourceName: '',
        Category: '',
        PaymentMethodID: '',
        Amount: '',
        Date: format(new Date(), 'yyyy-MM-dd')
      });
    },
    onError: (err) => showError(err)
  });

  useEffect(() => {
    // Process schedules on page load
    processSchedulesMutation.mutate();
  }, []);

  const renderTabs = () => {
    const tabItems = [
      { id: 'to-check', label: 'To Check', icon: Clock, count: pendingIncomes?.length },
      { id: 'scheduled', label: 'Scheduled', icon: Calendar },
      { id: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { id: 'repayments', label: 'Debt Repayments', icon: TrendingUp },
    ] as const;

    return (
      <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-800" aria-label="Tabs">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap px-1 border-b-2 font-medium text-sm transition-colors -mb-px py-3",
              activeTab === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="flex items-center justify-center bg-accent text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full ml-1 tabular-nums">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    );
  };

  const splitTopUpNote = (note: string) => {
    if (!note.startsWith('[Income] ')) return { source: note, category: '' };
    const content = note.substring(9);
    const match = content.match(/^(.*?)(?:\s\((.*?)\))?$/);
    if (match) {
      return { source: match[1], category: match[2] || '' };
    }
    return { source: content, category: '' };
  };

  const handleSaveSchedule = () => {
    const data = {
      ...newSchedule,
      ExpectedAmount: parseFloat(String(newSchedule.ExpectedAmount)) || null,
      LookaheadDays: parseInt(String(newSchedule.LookaheadDays)) || 0
    };
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.IncomeScheduleID, data });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  return (
    <div>
      <Header
        title="Income"
        subtitle="Manage expected and confirmed income"
        actions={
          <div className="flex gap-2">
            <Tooltip content="One-time Income">
              <Button variant="ghost" size="icon" onClick={() => {
                setOneTimeIncome({
                  SourceName: '',
                  Category: '',
                  PaymentMethodID: paymentMethods[0]?.value || '',
                  Amount: '',
                  Date: format(new Date(), 'yyyy-MM-dd')
                });
                setIsOneTimeModalOpen(true);
              }}>
                <CheckCircle className="h-5 w-5" />
              </Button>
            </Tooltip>
            <Tooltip content="New Schedule">
              <Button variant="ghost" size="icon" onClick={() => {
                setEditingSchedule(null);
                setIsScheduleModalOpen(true);
              }}>
                <Plus className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
        }
      />
      <PageWrapper>
        <div className="flex flex-col gap-6 py-6 px-[100px]">
          {renderTabs()}
          <div className="flex-1">
            {activeTab === 'to-check' && (
              <div className="space-y-4">
                <DataTable
                  loading={loadingPending}
                  data={pendingIncomes}
                  columns={[
                    {
                      header: 'Planned Date',
                      accessor: 'PlannedDate',
                      render: (row) => format(parseISO(row.PlannedDate), 'MMM d, yyyy')
                    },
                    { header: 'Source', accessor: 'SourceName' },
                    { header: 'Category', accessor: 'Category' },
                    {
                      header: 'Expected Amount',
                      accessor: 'Amount',
                      render: (row) => row.Amount ? `€${row.Amount.toFixed(2)}` : '-'
                    },
                    {
                      header: 'Actions',
                      render: (row) => (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPending(row);
                              setConfirmData({ amount: row.Amount || 0, date: row.PlannedDate });
                              setIsConfirmModalOpen(true);
                            }}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => {
                              setSelectedPending(row);
                              setIsDismissModalOpen(true);
                            }}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )
                    }
                  ]}
                  searchable
                  searchPlaceholder="Filter pending items..."
                />
                {(!pendingIncomes || pendingIncomes.length === 0) && !loadingPending && (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-zinc-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>All caught up! No pending income to check.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'scheduled' && (
              <div className="space-y-4">
                <DataTable
                  loading={loadingSchedules}
                  data={schedules}
                  onRowClick={(row) => {
                    setEditingSchedule(row);
                    setIsScheduleModalOpen(true);
                  }}
                  columns={[
                    { header: 'Source', accessor: 'SourceName' },
                    { header: 'Category', accessor: 'Category' },
                    {
                      header: 'Expected Amount',
                      accessor: 'ExpectedAmount',
                      render: (row) => row.ExpectedAmount ? `€${row.ExpectedAmount.toFixed(2)}` : '-'
                    },
                    {
                      header: 'Recurrence',
                      accessor: 'RecurrenceRule',
                      render: (row) => humanizeRecurrenceRule(row.RecurrenceRule)
                    },
                    {
                      header: 'Status',
                      render: (row) => (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          row.IsActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        )}>
                          {row.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      )
                    },
                    {
                      header: 'Actions',
                      className: 'text-right',
                      render: (row) => (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSchedule(row);
                              setIsScheduleModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setScheduleToDelete(row.IncomeScheduleID);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            )}

            {activeTab === 'confirmed' && (
              <DataTable
                loading={loadingConfirmed}
                data={confirmedIncomes}
                onRowClick={(row) => {
                  navigate(`/payment-methods/${row.PaymentMethodID}`);
                }}
                columns={[
                  {
                    header: 'Date',
                    accessor: 'TopUpDate',
                    render: (row) => format(parseISO(row.TopUpDate), 'MMM d, yyyy')
                  },
                  {
                    header: 'Source',
                    render: (row) => splitTopUpNote(row.TopUpNote).source
                  },
                  {
                    header: 'Category',
                    render: (row) => splitTopUpNote(row.TopUpNote).category
                  },
                  { header: 'Account', accessor: 'PaymentMethodName' },
                  {
                    header: 'Amount',
                    accessor: 'TopUpAmount',
                    render: (row) => (
                      <span className="text-green-600 font-semibold">
                        +€{row.TopUpAmount.toFixed(2)}
                      </span>
                    )
                  }
                ]}
                searchable
              />
            )}

            {activeTab === 'repayments' && (
              <DataTable
                loading={loadingRepayments}
                data={debtRepayments}
                onRowClick={(row) => {
                  navigate(`/payment-methods/${row.PaymentMethodID}`);
                }}
                columns={[
                  {
                    header: 'Date',
                    accessor: 'TopUpDate',
                    render: (row) => format(parseISO(row.TopUpDate || row.PaidDate), 'MMM d, yyyy')
                  },
                  { header: 'Debtor', accessor: 'DebtorName' },
                  { header: 'Account', accessor: 'PaymentMethodName' },
                  {
                    header: 'Amount',
                    accessor: 'TopUpAmount',
                    render: (row) => (
                      <span className="text-green-600 font-semibold">
                        +€{(row.TopUpAmount || 0).toFixed(2)}
                      </span>
                    )
                  }
                ]}
                searchable
              />
            )}
          </div>
        </div>
      </PageWrapper>

      {/* Modals */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (scheduleToDelete) {
            deleteScheduleMutation.mutate({ id: scheduleToDelete, cascade: cascadeDelete });
            setIsDeleteModalOpen(false);
          }
        }}
        title="Delete Schedule"
        message="Are you sure you want to delete this income schedule? This will deactivate it, but not remove historical records."
      >
        <div className="pt-4">
          <Checkbox
            id="cascadeDelete"
            checked={cascadeDelete}
            onChange={(e) => setCascadeDelete(e.target.checked)}
            label="Also delete all pending 'To Check' items from this schedule."
          />
        </div>
      </ConfirmModal>

      <ConfirmModal
        isOpen={isDismissModalOpen}
        onClose={() => setIsDismissModalOpen(false)}
        onConfirm={() => {
          if (selectedPending) {
            rejectMutation.mutate(selectedPending.PendingIncomeID);
            setIsDismissModalOpen(false);
          }
        }}
        title="Dismiss Income"
        message={`Are you sure you want to dismiss ${selectedPending?.SourceName}? This occurrence will be ignored.`}
        confirmText="Dismiss"
      />

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Income"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => confirmMutation.mutate({
                pending: selectedPending,
                amount: confirmData.amount,
                date: confirmData.date
              })}
              loading={confirmMutation.isPending}
            >
              Confirm & Deposit
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verify the amount and date for <strong>{selectedPending?.SourceName}</strong>.
          </p>
          <StepperInput
            label="Amount"
            step={0.01}
            value={String(confirmData.amount)}
            onChange={e => setConfirmData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
          />
          <Input
            label="Date"
            type="date"
            value={confirmData.date}
            onChange={e => setConfirmData(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isOneTimeModalOpen}
        onClose={() => setIsOneTimeModalOpen(false)}
        title="Add One-time Income"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsOneTimeModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createOneTimeMutation.mutate({
                ...oneTimeIncome,
                Amount: parseFloat(oneTimeIncome.Amount) || 0
              })}
              loading={createOneTimeMutation.isPending}
            >
              Deposit
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <Combobox
              label="Source Name"
              placeholder="e.g. Bonus, Tax Return"
              options={incomeSources}
              value={oneTimeIncome.SourceName}
              onChange={val => setOneTimeIncome(prev => ({ ...prev, SourceName: val }))}
              className="flex-1"
            />
            <Tooltip content="Add Source">
              <Button variant="secondary" className="h-10 w-10 p-0 mb-0.5" onClick={() => setIsIncomeSourceModalOpen(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-end gap-2">
              <Combobox
                label="Category (Optional)"
                options={incomeCategories}
                value={oneTimeIncome.Category}
                onChange={val => setOneTimeIncome(prev => ({ ...prev, Category: val }))}
                className="flex-1"
              />
              <Tooltip content="Add Category">
                <Button variant="secondary" className="h-10 w-10 p-0 mb-0.5" onClick={() => setIsIncomeCategoryModalOpen(true)}>
                  <Plus className="h-5 w-5" />
                </Button>
              </Tooltip>
            </div>
            <StepperInput
              label="Amount"
              step={0.01}
              value={oneTimeIncome.Amount}
              onChange={e => setOneTimeIncome(prev => ({ ...prev, Amount: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Combobox
              label="Payment Method"
              options={paymentMethods}
              value={oneTimeIncome.PaymentMethodID}
              onChange={val => setOneTimeIncome(prev => ({ ...prev, PaymentMethodID: val }))}
            />
            <Input
              label="Date"
              type="date"
              value={oneTimeIncome.Date}
              onChange={e => setOneTimeIncome(prev => ({ ...prev, Date: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={editingSchedule ? "Edit Income Schedule" : "Add Income Schedule"}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsScheduleModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveSchedule}
              loading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
            >
              {editingSchedule ? "Save Changes" : "Save Schedule"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <Combobox
              label="Source Name"
              placeholder="e.g. Salary, Rent"
              options={incomeSources}
              value={newSchedule.SourceName}
              onChange={val => setNewSchedule(prev => ({ ...prev, SourceName: val }))}
              className="flex-1"
            />
            <Tooltip content="Add Source">
              <Button variant="secondary" className="h-10 w-10 p-0 mb-0.5" onClick={() => setIsIncomeSourceModalOpen(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-end gap-2">
              <Combobox
                label="Category (Optional)"
                options={incomeCategories}
                value={newSchedule.Category}
                onChange={val => setNewSchedule(prev => ({ ...prev, Category: val }))}
                className="flex-1"
              />
              <Tooltip content="Add Category">
                <Button variant="secondary" className="h-10 w-10 p-0 mb-0.5" onClick={() => setIsIncomeCategoryModalOpen(true)}>
                  <Plus className="h-5 w-5" />
                </Button>
              </Tooltip>
            </div>
            <StepperInput
              label="Expected Amount"
              step={0.01}
              max={10000000}
              value={newSchedule.ExpectedAmount}
              onChange={e => setNewSchedule(prev => ({ ...prev, ExpectedAmount: e.target.value }))}
            />
          </div>
          <Combobox
            label="Payment Method"
            options={paymentMethods}
            value={newSchedule.PaymentMethodID}
            onChange={val => setNewSchedule(prev => ({ ...prev, PaymentMethodID: val }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurrence</label>
                <Tooltip content="How often this income is expected.">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </Tooltip>
              </div>
              <Select
                options={[
                  { value: 'FREQ=DAILY;INTERVAL=1', label: 'Daily' },
                  { value: 'FREQ=WEEKLY;INTERVAL=1', label: 'Weekly' },
                  { value: 'FREQ=MONTHLY;INTERVAL=1', label: 'Monthly' },
                  { value: 'FREQ=YEARLY;INTERVAL=1', label: 'Yearly' },
                ]}
                value={newSchedule.RecurrenceRule}
                onChange={e => setNewSchedule(prev => ({ ...prev, RecurrenceRule: e.target.value }))}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lookahead Days</label>
                <Tooltip content="How many days in advance to generate a 'To Check' item.">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                </Tooltip>
              </div>
              <StepperInput
                value={String(newSchedule.LookaheadDays)}
                onChange={e => setNewSchedule(prev => ({ ...prev, LookaheadDays: parseInt(e.target.value) || 0 }))}
                min={1}
                max={1000}
              />
            </div>
          </div>
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="requiresConfirmation"
              checked={newSchedule.RequiresConfirmation}
              onChange={e => setNewSchedule(prev => ({ ...prev, RequiresConfirmation: e.target.checked }))}
            />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="requiresConfirmation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Requires manual confirmation
              </label>
              <p className="text-xs text-gray-500">If enabled, you must confirm each occurrence before it's deposited.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="isActive"
              checked={newSchedule.IsActive}
              onChange={e => setNewSchedule(prev => ({ ...prev, IsActive: e.target.checked }))}
            />
            <label htmlFor="isActive" className="text-sm font-medium leading-none">Schedule is active</label>
          </div>
        </div>
      </Modal>

      <IncomeCategoryModal
        isOpen={isIncomeCategoryModalOpen}
        onClose={() => setIsIncomeCategoryModalOpen(false)}
        onSave={handleIncomeCategorySave}
        categoryToEdit={null}
      />

      <IncomeSourceModal
        isOpen={isIncomeSourceModalOpen}
        onClose={() => setIsIncomeSourceModalOpen(false)}
        onSave={handleIncomeSourceSave}
        sourceToEdit={null}
      />
    </div>
  );
};

export default IncomePage;
