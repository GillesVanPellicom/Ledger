import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Button from '../components/ui/Button';
import { Plus, CheckCircle, ClipboardList, RotateCcw, ArrowRightLeft, Wallet, Calendar, X, Check, Clock, MoreHorizontal, CreditCard, User, Edit, Trash } from 'lucide-react';
import { db } from '../utils/db';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import { useSettingsStore } from '../store/useSettingsStore';
import { useErrorStore } from '../store/useErrorStore';
import Combobox from '../components/ui/Combobox';
import TransferModal from '../components/payment/TransferModal';
import IncomeModal from '../components/payment/IncomeModal';
import ScheduleModal from '../components/payment/ScheduleModal';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { incomeCommitments } from '../logic/incomeCommitments';
import { incomeLogic } from '../logic/incomeLogic';
import { humanizeRecurrenceRule } from '../logic/incomeScheduling';
import StepperInput from '../components/ui/StepperInput';
import Checkbox from '../components/ui/Checkbox';
import Input from '../components/ui/Input';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { useReceiptsStore } from '../store/useReceiptsStore';
import TransactionDataTable from '../components/receipts/TransactionDataTable';
import DataTable from '../components/ui/DataTable';
import DateDisplay from '../components/ui/DateDisplay';
import Badge from '../components/ui/Badge';
import ButtonGroup from '../components/ui/ButtonGroup';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/DropdownMenu";
import { cn } from '../utils/cn';

import type { PaymentMethod } from '../types';

const ReceiptsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError } = useErrorStore();
  const { settings } = useSettingsStore();

  const {
    activeTab, setActiveTab,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
  } = useReceiptsStore();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  // Income Page States
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<any>(null);
  const [confirmData, setConfirmData] = useState({ amount: 0, date: '', paymentMethodId: '' });
  const [isDeleteScheduleModalOpen, setIsDeleteScheduleModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(false);

  useEffect(() => {
    const loadReferenceData = async () => {
      const methodsData = await db.query<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName');
      setMethods(methodsData);
    };
    loadReferenceData();
  }, []);

  // Income Queries & Mutations
  const { data: pendingIncomes, isLoading: loadingPending } = useQuery({
    queryKey: ['pendingIncome'],
    queryFn: () => incomeCommitments.getPendingIncomes(),
    enabled: activeTab !== 'overview'
  });
  const { data: schedules, isLoading: loadingSchedules } = useQuery({
    queryKey: ['incomeSchedules'],
    queryFn: () => incomeCommitments.getSchedules(),
    enabled: activeTab !== 'overview'
  });
  const processSchedulesMutation = useMutation({
    mutationFn: () => incomeLogic.processSchedules(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
    },
    onError: (err) => showError(err)
  });
  const confirmMutation = useMutation({
    mutationFn: ({ pending, amount, date, paymentMethodId }: { pending: any, amount: number, date: string, paymentMethodId: number }) => incomeLogic.confirmPendingIncome(pending, amount, date, paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
  const deleteScheduleMutation = useMutation({
    mutationFn: ({ id, cascade }: { id: number, cascade: boolean }) => incomeCommitments.deleteSchedule(id, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomeSchedules'] });
      processSchedulesMutation.mutate();
      setIsDeleteScheduleModalOpen(false);
      setCascadeDelete(false);
    },
    onError: (err) => showError(err)
  });

  useEffect(() => {
    if (activeTab !== 'overview') {
      processSchedulesMutation.mutate();
    }
  }, [activeTab]);

  const renderTabs = () => {
    return (
      <Tabs value={activeTab} onValueChange={(val: any) => {
        setActiveTab(val);
        setCurrentPage(1);
      }}>
        <TabsList>
          <TabsTrigger value="overview">
            <ClipboardList className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="to-check" badge={pendingIncomes?.length} badgeColor="bg-red-500">
            <Clock className="h-4 w-4" /> To Check
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="h-4 w-4" /> Scheduled
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );
  };

  const paginatedData = (data: any[] | undefined) => {
    if (!data) return [];
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  };

  const handleConfirmIncome = () => {
    confirmMutation.mutate({
      pending: selectedPending,
      amount: confirmData.amount,
      date: confirmData.date,
      paymentMethodId: Number(confirmData.paymentMethodId)
    });
  };

  const handleRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return (
    <div>
      <Header title="Home" variant="tabs" tabs={renderTabs()} actions={
        <div className="flex items-center gap-2">
          <Tooltip content="New Transfer">
            <Button variant="ghost" size="icon" onClick={() => setIsTransferModalOpen(true)}>
              <ArrowRightLeft className="h-5 w-5" />
            </Button>
          </Tooltip>
          <Tooltip content="Add Schedule">
            <Button variant="ghost" size="icon" onClick={() => setIsScheduleModalOpen(true)}>
              <Calendar className="h-5 w-5" />
            </Button>
          </Tooltip>
          <Tooltip content="Add Income">
            <Button variant="ghost" size="icon" onClick={() => setIsIncomeModalOpen(true)}>
              <Wallet className="h-5 w-5" />
            </Button>
          </Tooltip>
          <Tooltip content="New Expense">
            <Button variant="ghost" size="icon" onClick={() => navigate('/receipts/new')}>
              <Plus className="h-5 w-5" />
            </Button>
          </Tooltip>
        </div>
      } />
      <PageWrapper>
        <div className="py-6">
          {activeTab === 'overview' && (
            <TransactionDataTable onRefetch={handleRefetch} />
          )}
          {activeTab === 'to-check' && (
            <DataTable
              loading={loadingPending}
              data={paginatedData(pendingIncomes)}
              emptyStateText="No pending items to review."
              emptyStateIcon={<CheckCircle className="h-10 w-10 opacity-50 text-green-500" />}
              columns={[
                { header: 'Planned Date', accessor: 'PlannedDate', render: (row) => <DateDisplay date={row.PlannedDate} /> },
                {
                  header: 'Source/Recipient', accessor: 'RecipientName', render: (row) => (
                    <div className="flex items-center gap-2">
                      {row.RecipientName}
                    </div>
                  )
                },
                { header: 'Category', accessor: 'CategoryName' },
                { header: 'Method', accessor: 'PaymentMethodName' },
                { header: 'Expected Amount', accessor: 'Amount', render: (row) => row.Amount ? `€${row.Amount.toFixed(2)}` : '-' },
                {
                  header: 'Type', render: (row) => (
                    <Badge variant={row.Type === 'expense' ? 'red' : 'green'}>
                      {row.Type === 'expense' ? 'Expense' : 'Income'}
                    </Badge>
                  )
                },
                {
                  header: '', width: '10%', className: 'text-right', render: (row) => (
                    <div className="flex items-center justify-end gap-2">
                      <ButtonGroup variant="ghost-bordered">
                        <Tooltip content="Confirm">
                          <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50 hover:text-green-700" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPending(row);
                            setConfirmData({ amount: row.Amount || 0, date: format(parseISO(row.PlannedDate), 'yyyy-MM-dd'), paymentMethodId: row.PaymentMethodID });
                            setIsConfirmModalOpen(true);
                          }}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Dismiss">
                          <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPending(row);
                            setIsDismissModalOpen(true);
                          }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </ButtonGroup>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Go To</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/payment-methods/${row.PaymentMethodID}`); }}>
                            <CreditCard className="mr-2 h-4 w-4" /> Method
                          </DropdownMenuItem>
                          {row.RecipientID && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/entities/${row.RecipientID}`); }}>
                              <User className="mr-2 h-4 w-4" /> {row.Type === 'income' ? 'Source' : 'Recipient'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            const schedule = schedules?.find(s => s.ScheduleID === row.ScheduleID);
                            if (schedule) {
                              setEditingSchedule(schedule);
                              setIsScheduleModalOpen(true);
                            }
                          }}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                }
              ]}
              searchable
              searchPlaceholder="Filter pending items..."
              totalCount={pendingIncomes?.length || 0}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
          {activeTab === 'scheduled' && (
            <DataTable
              loading={loadingSchedules}
              data={paginatedData(schedules)}
              onRowClick={(row) => {
                setEditingSchedule(row);
                setIsScheduleModalOpen(true);
              }}
              columns={[
                {
                  header: 'Source/Recipient', accessor: 'RecipientName', render: (row) => (
                    <div className="flex items-center gap-2">
                      {row.RecipientName}
                    </div>
                  )
                },
                { header: 'Category', accessor: 'CategoryName' },
                { header: 'Method', accessor: 'PaymentMethodName' },
                { header: 'Expected Amount', accessor: 'Amount', render: (row) => row.Amount ? `€${row.Amount.toFixed(2)}` : '-' },
                { header: 'Recurrence', accessor: 'RecurrenceRule', render: (row) => humanizeRecurrenceRule(row as any) },
                {
                  header: 'Type', render: (row) => (
                    <Badge variant={row.Type === 'expense' ? 'red' : 'green'}>
                      {row.Type === 'expense' ? 'Expense' : 'Income'}
                    </Badge>
                  )
                },
                {
                  header: 'Status', render: (row) => (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      row.IsActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {row.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  )
                },
                {
                  header: '', width: '5%', className: 'text-right', render: (row) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Go To</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/payment-methods/${row.PaymentMethodID}`); }}>
                          <CreditCard className="mr-2 h-4 w-4" /> Method
                        </DropdownMenuItem>
                        {row.RecipientID && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/entities/${row.RecipientID}`); }}>
                            <User className="mr-2 h-4 w-4" /> {row.Type === 'income' ? 'Source' : 'Recipient'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingSchedule(row);
                          setIsScheduleModalOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => {
                          e.stopPropagation();
                          setScheduleToDelete(row.ScheduleID);
                          setCascadeDelete(false);
                          setIsDeleteScheduleModalOpen(true);
                        }}>
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }
              ]}
              totalCount={schedules?.length || 0}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
          
          <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} onSave={handleRefetch} topUpToEdit={null} paymentMethodId={methods[0]?.PaymentMethodID?.toString() || ''} currentBalance={0} />
          <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} onSave={handleRefetch} topUpToEdit={null} />
          <ScheduleModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} onSave={handleRefetch} scheduleToEdit={editingSchedule} />

          {/* Income Modals */}
          <Modal isOpen={isDeleteScheduleModalOpen} onClose={() => { setIsDeleteScheduleModalOpen(false); setCascadeDelete(false); }} title="Delete Schedule" className="max-w-lg" isDatabaseTransaction successToastMessage="Schedule deleted successfully" errorToastMessage="Failed to delete schedule" loadingMessage="Deleting schedule..." onEnter={async () => { if (scheduleToDelete) { await deleteScheduleMutation.mutateAsync({ id: scheduleToDelete, cascade: cascadeDelete }); } }} footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsDeleteScheduleModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={async () => { if (scheduleToDelete) { await deleteScheduleMutation.mutateAsync({ id: scheduleToDelete, cascade: cascadeDelete }); } }} loading={deleteScheduleMutation.isPending}>
                Delete
              </Button>
            </div>
          }>
            <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete this income schedule? This will deactivate it, but not remove historical records.</p>
            <div className="flex items-start gap-3 pt-4">
              <Checkbox id="cascadeDelete" checked={cascadeDelete} onChange={(e) => setCascadeDelete(e.target.checked)} />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="cascadeDelete" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Also delete all pending 'To Check' items from this schedule.
                </label>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
          </Modal>
          <ConfirmModal isOpen={isDismissModalOpen} onClose={() => setIsDismissModalOpen(false)} onConfirm={async () => { if (selectedPending) { await rejectMutation.mutateAsync(selectedPending.SchedulePendingID); setIsDismissModalOpen(false); } }} title="Dismiss Income" message={`Are you sure you want to dismiss ${selectedPending?.RecipientName}? This occurrence will be ignored.`} confirmText="Dismiss" isDatabaseTransaction successToastMessage="Income dismissed successfully" errorToastMessage="Failed to dismiss income" />
          <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Income" onEnter={handleConfirmIncome} isDatabaseTransaction successToastMessage="Income confirmed successfully" errorToastMessage="Failed to confirm income" loadingMessage="Confirming income..." footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmIncome} loading={confirmMutation.isPending}>
                Confirm
              </Button>
            </div>
          }>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400"> Verify the amount and date for <strong>{selectedPending?.RecipientName}</strong>. </p>
              <StepperInput label="Amount" step={1} value={String(confirmData.amount)} onChange={e => setConfirmData(prev => ({ ...prev, amount: Number.parseFloat(e.target.value) }))} onIncrement={() => setConfirmData(prev => ({ ...prev, amount: (prev.amount || 0) + 1 }))} onDecrement={() => setConfirmData(prev => ({ ...prev, amount: (prev.amount || 0) - 1 }))} />
              <Input label="Date" type="date" value={confirmData.date} onChange={e => setConfirmData(prev => ({...prev, date: e.target.value}))} />
              <Combobox label="Method" options={methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))} value={confirmData.paymentMethodId} onChange={val => setConfirmData(prev => ({...prev, paymentMethodId: val}))} />
            </div>
          </Modal>
        </div>
      </PageWrapper>
    </div>
  );
};

export default ReceiptsPage;
