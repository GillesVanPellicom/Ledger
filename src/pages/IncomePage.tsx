import React, {useState, useEffect} from 'react';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {useNavigate, useLocation} from 'react-router-dom';
import {
  Calendar,
  Clock,
  Plus,
  Trash,
  Edit,
  Info,
  Check,
  X,
  FilePlus2,
  CalendarPlus,
  MoreHorizontal,
  CreditCard,
  Wallet,
  User
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import {Header} from '../components/ui/Header';
import {incomeCommitments} from '../logic/incomeCommitments';
import {incomeLogic} from '../logic/incomeLogic';
import {humanizeRecurrenceRule, parseRecurrenceRule, calculateOccurrences} from '../logic/incomeScheduling';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Combobox from '../components/ui/Combobox';
import StepperInput from '../components/ui/StepperInput';
import Checkbox from '../components/ui/Checkbox';
import Modal, {ConfirmModal} from '../components/ui/Modal';
import IncomeCategoryModal from '../components/categories/IncomeCategoryModal';
import IncomeSourceModal from '../components/income/IncomeSourceModal';
import {format, parseISO, isBefore, startOfToday, getDay, getDate, getMonth, subMonths, startOfDay} from 'date-fns';
import {cn} from '../utils/cn';
import {useErrorStore} from '../store/useErrorStore';
import {db} from '../utils/db';
import Tooltip from '../components/ui/Tooltip';
import Divider from '../components/ui/Divider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/DropdownMenu"
import ButtonGroup from '../components/ui/ButtonGroup';
import {Tabs, TabsList, TabsTrigger} from '../components/ui/Tabs';
import {useSettingsStore} from '../store/useSettingsStore';
import IncomeModal from '../components/payment/IncomeModal';
import ScheduleModal from '../components/payment/ScheduleModal';

const IncomePage: React.FC = () => {
  const queryClient = useQueryClient();
  const {showError} = useErrorStore();
  const {settings} = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'to-check' | 'scheduled'>('to-check');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<any>(null);
  const [confirmData, setConfirmData] = useState({amount: 0, date: '', paymentMethodId: ''});

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    // Load reference data
    const loadReferenceData = () => {
      db.query("SELECT * FROM PaymentMethods").then(rows => {
        setPaymentMethods(rows.map((r: any) => ({
          value: String(r.PaymentMethodID),
          label: r.PaymentMethodName
        })));
      }).catch(err => showError(err));
    };

    loadReferenceData();
  }, []);

  // Queries
  const {data: pendingIncomes, isLoading: loadingPending} = useQuery({
    queryKey: ['pendingIncome'],
    queryFn: () => incomeCommitments.getPendingIncomes()
  });

  const {data: schedules, isLoading: loadingSchedules} = useQuery({
    queryKey: ['incomeSchedules'],
    queryFn: () => incomeCommitments.getSchedules()
  });

  // Mutations
  const processSchedulesMutation = useMutation({
    mutationFn: () => incomeLogic.processSchedules(),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['pendingIncome']});
    },
    onError: (err) => showError(err)
  });

  const confirmMutation = useMutation({
    mutationFn: ({pending, amount, date, paymentMethodId}: {
      pending: any,
      amount: number,
      date: string,
      paymentMethodId: number
    }) =>
      incomeLogic.confirmPendingIncome(pending, amount, date, paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['pendingIncome']});
      queryClient.invalidateQueries({queryKey: ['transactions']});
      setIsConfirmModalOpen(false);
    },
    onError: (err) => showError(err)
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => incomeLogic.rejectPendingIncome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['pendingIncome']});
    },
    onError: (err) => showError(err)
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: ({id, cascade}: { id: number, cascade: boolean }) => incomeCommitments.deleteSchedule(id, cascade),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['incomeSchedules']});
      processSchedulesMutation.mutate();
      setIsDeleteModalOpen(false);
      setCascadeDelete(false);
    },
    onError: (err) => showError(err)
  });

  useEffect(() => {
    // Process schedules on page load
    processSchedulesMutation.mutate();
  }, []);

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setCascadeDelete(false);
  };

  const renderTabs = () => {
    return (
      <Tabs value={activeTab} onValueChange={(val: any) => {
        setActiveTab(val);
        setCurrentPage(1);
        navigate('.', {state: {activeTab: val}, replace: true});
      }}>
        <TabsList>
          <TabsTrigger value="to-check" badge={pendingIncomes?.length} badgeColor="bg-red-500">
            <Clock className="h-4 w-4"/>
            To Check
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="h-4 w-4"/>
            Scheduled
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

  const handleConfirmIncome = async () => {
    await confirmMutation.mutateAsync({
      pending: selectedPending,
      amount: confirmData.amount,
      date: confirmData.date,
      paymentMethodId: Number(confirmData.paymentMethodId)
    });
  };

  return (
    <div>
      <Header
        title="Income"
        variant="tabs"
        tabs={renderTabs()}
        actions={
          <div className="flex gap-2">
            <Tooltip content="Add Income">
              <Button variant="ghost" size="icon" onClick={() => setIsIncomeModalOpen(true)}>
                <Wallet className="h-5 w-5"/>
              </Button>
            </Tooltip>
            <Tooltip content="Add New Income Schedule">
              <Button variant="ghost" size="icon" onClick={() => {
                setEditingSchedule(null);
                setIsScheduleModalOpen(true);
              }}>
                <CalendarPlus className="h-5 w-5"/>
              </Button>
            </Tooltip>
          </div>
        }
      />
      <PageWrapper>
        <div className="flex flex-col gap-6 pt-6">
          <div className="flex-1">
            {activeTab === 'to-check' && (
              <div className="space-y-4">
                <DataTable
                  loading={loadingPending}
                  data={paginatedData(pendingIncomes)}
                  emptyStateText="No pending items to review."
                  emptyStateIcon={<Check className="h-10 w-10 opacity-50 text-green-500"/>}
                  columns={[
                    {
                      header: 'Planned Date',
                      accessor: 'PlannedDate',
                      render: (row) => format(parseISO(row.PlannedDate), 'MMM d, yyyy')
                    },
                    {
                      header: 'Source', 
                      accessor: 'SourceName',
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          {row.SourceName}
                          {row.EntityID && (
                            <Tooltip content="Associated with an entity.">
                              <User className="h-3 w-3 text-accent" />
                            </Tooltip>
                          )}
                        </div>
                      )
                    },
                    {header: 'Category', accessor: 'Category'},
                    {header: 'Method', accessor: 'PaymentMethodName'},
                    {
                      header: 'Expected Amount',
                      accessor: 'Amount',
                      render: (row) => row.Amount ? `€${row.Amount.toFixed(2)}` : '-'
                    },
                    {
                      header: '',
                      width: '10%',
                      className: 'text-right',
                      render: (row) => (
                        <div className="flex items-center justify-end gap-2">
                          <ButtonGroup variant="ghost-bordered">
                            <Tooltip content="Confirm">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:bg-green-50 hover:text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPending(row);
                                  setConfirmData({
                                    amount: row.Amount || 0,
                                    date: format(parseISO(row.PlannedDate), 'yyyy-MM-dd'),
                                    paymentMethodId: row.PaymentMethodID
                                  });
                                  setIsConfirmModalOpen(true);
                                }}
                              >
                                <Check className="h-4 w-4"/>
                              </Button>
                            </Tooltip>
                            <Tooltip content="Dismiss">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPending(row);
                                  setIsDismissModalOpen(true);
                                }}
                              >
                                <X className="h-4 w-4"/>
                              </Button>
                            </Tooltip>
                          </ButtonGroup>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 p-0"
                                      onClick={(e) => e.stopPropagation()}>
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4"/>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Go To</DropdownMenuLabel>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/payment-methods/${row.PaymentMethodID}`);
                              }}>
                                <CreditCard className="mr-2 h-4 w-4"/>
                                Method
                              </DropdownMenuItem>
                              {row.EntityID && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/entities/${row.EntityID}`);
                                }}>
                                  <User className="mr-2 h-4 w-4"/>
                                  Entity
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator/>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                const schedule = schedules?.find(s => s.ScheduleID === row.ScheduleID);
                                if (schedule) {
                                  setEditingSchedule(schedule);
                                  setIsScheduleModalOpen(true);
                                }
                              }}>
                                <Edit className="mr-2 h-4 w-4"/>
                                Edit
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
              </div>
            )}

            {activeTab === 'scheduled' && (
              <div className="space-y-4">
                <DataTable
                  loading={loadingSchedules}
                  data={paginatedData(schedules)}
                  onRowClick={(row) => {
                    setEditingSchedule(row);
                    setIsScheduleModalOpen(true);
                  }}
                  columns={[
                    {
                      header: 'Source', 
                      accessor: 'SourceName',
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          {row.SourceName}
                          {row.EntityID && (
                            <Tooltip content="Associated with an entity.">
                              <User className="h-3 w-3 text-accent" />
                            </Tooltip>
                          )}
                        </div>
                      )
                    },
                    {header: 'Category', accessor: 'Category'},
                    {header: 'Method', accessor: 'PaymentMethodName'},
                    {
                      header: 'Expected Amount',
                      accessor: 'ExpectedAmount',
                      render: (row) => row.ExpectedAmount ? `€${row.ExpectedAmount.toFixed(2)}` : '-'
                    },
                    {
                      header: 'Recurrence',
                      accessor: 'RecurrenceRule',
                      render: (row) => humanizeRecurrenceRule(row)
                    },
                    {
                      header: 'Status',
                      render: (row) => (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          row.IsActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {row.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      )
                    },
                    {
                      header: '',
                      width: '5%',
                      className: 'text-right',
                      render: (row) => (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4"/>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Go To</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/payment-methods/${row.PaymentMethodID}`);
                            }}>
                              <CreditCard className="mr-2 h-4 w-4"/>
                              Method
                            </DropdownMenuItem>
                            {row.EntityID && (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/entities/${row.EntityID}`);
                              }}>
                                <User className="mr-2 h-4 w-4"/>
                                Entity
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator/>
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setEditingSchedule(row);
                              setIsScheduleModalOpen(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4"/>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setScheduleToDelete(row.ScheduleID);
                                setCascadeDelete(false);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash className="mr-2 h-4 w-4"/>
                              Delete
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
              </div>
            )}
          </div>
        </div>
      </PageWrapper>

      {/* Modals */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title="Delete Schedule"
        className="max-w-lg"
        isDatabaseTransaction
        successToastMessage="Schedule deleted successfully"
        errorToastMessage="Failed to delete schedule"
        loadingMessage="Deleting schedule..."
        onEnter={async () => {
          if (scheduleToDelete) {
            await deleteScheduleMutation.mutateAsync({id: scheduleToDelete, cascade: cascadeDelete});
          }
        }}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCloseDeleteModal}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (scheduleToDelete) {
                  await deleteScheduleMutation.mutateAsync({id: scheduleToDelete, cascade: cascadeDelete});
                }
              }}
              loading={deleteScheduleMutation.isPending}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete this income schedule?
                                                                This will deactivate it, but not remove historical
                                                                records.</p>
        <div className="flex items-start gap-3 pt-4">
          <Checkbox
            id="cascadeDelete"
            checked={cascadeDelete}
            onChange={(e) => setCascadeDelete(e.target.checked)}
          />
          <div className="grid gap-1.5 leading-none">
            <label htmlFor="cascadeDelete"
                   className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Also delete all pending 'To Check' items from this schedule.
            </label>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDismissModalOpen}
        onClose={() => setIsDismissModalOpen(false)}
        onConfirm={async () => {
          if (selectedPending) {
            await rejectMutation.mutateAsync(selectedPending.SchedulePendingID);
            setIsDismissModalOpen(false);
          }
        }}
        title="Dismiss Income"
        message={`Are you sure you want to dismiss ${selectedPending?.SourceName}? This occurrence will be ignored.`}
        confirmText="Dismiss"
        isDatabaseTransaction
        successToastMessage="Income dismissed successfully"
        errorToastMessage="Failed to dismiss income"
      />

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Income"
        onEnter={handleConfirmIncome}
        isDatabaseTransaction
        successToastMessage="Income confirmed successfully"
        errorToastMessage="Failed to confirm income"
        loadingMessage="Confirming income..."
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmIncome}
              loading={confirmMutation.isPending}
            >
              Confirm
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
            step={1}
            value={String(confirmData.amount)}
            onChange={e => setConfirmData(prev => ({
              ...prev, amount: Number.parseFloat(e.target.value)
            }))}
            onIncrement={() => setConfirmData(prev => ({
              ...prev, amount: (prev.amount || 0) + 1
            }))}
            onDecrement={() => setConfirmData(prev => ({
              ...prev, amount: (prev.amount || 0) - 1
            }))}
          />
          <Input
            label="Date"
            type="date"
            value={confirmData.date}
            onChange={e => setConfirmData(prev => ({...prev, date: e.target.value}))}
          />
          <Combobox
            label="Method"
            options={paymentMethods}
            value={confirmData.paymentMethodId}
            onChange={val => setConfirmData(prev => ({...prev, paymentMethodId: val}))}
          />
        </div>
      </Modal>

      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onSave={() => {
          queryClient.invalidateQueries({queryKey: ['pendingIncome']});
          queryClient.invalidateQueries({queryKey: ['transactions']});
        }}
        topUpToEdit={null}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSave={() => {
          queryClient.invalidateQueries({queryKey: ['incomeSchedules']});
          queryClient.invalidateQueries({queryKey: ['pendingIncome']});
        }}
        scheduleToEdit={editingSchedule}
      />
    </div>
  );
};

export default IncomePage;
