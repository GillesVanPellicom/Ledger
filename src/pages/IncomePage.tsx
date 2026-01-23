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
  CreditCard
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
  const [isOneTimeModalOpen, setIsOneTimeModalOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<any>(null);
  const [confirmData, setConfirmData] = useState({amount: 0, date: '', paymentMethodId: ''});

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);

  const getCurrentDate = () => {
    if (settings.dev?.mockTime?.enabled && settings.dev.mockTime.date) {
      return startOfDay(parseISO(settings.dev.mockTime.date));
    }
    return startOfToday();
  };

  const [newSchedule, setNewSchedule] = useState({
    SourceName: '',
    Category: '',
    PaymentMethodID: '',
    ExpectedAmount: '0',
    RecurrenceRule: 'FREQ=MONTHLY;INTERVAL=1',
    DayOfMonth: String(getDate(getCurrentDate())),
    DayOfWeek: String(getDay(getCurrentDate())),
    MonthOfYear: String(getMonth(getCurrentDate())),
    RequiresConfirmation: true,
    LookaheadDays: 7,
    IsActive: true,
    Note: ''
  });
  const [createForPastPeriod, setCreateForPastPeriod] = useState(false);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    const today = getCurrentDate();
    if (editingSchedule) {
      setNewSchedule({
        SourceName: editingSchedule.SourceName || '',
        Category: editingSchedule.Category || '',
        PaymentMethodID: String(editingSchedule.PaymentMethodID),
        ExpectedAmount: String(editingSchedule.ExpectedAmount || '0'),
        RecurrenceRule: editingSchedule.RecurrenceRule || 'FREQ=MONTHLY;INTERVAL=1',
        DayOfMonth: String(editingSchedule.DayOfMonth || getDate(today)),
        DayOfWeek: String(editingSchedule.DayOfWeek || getDay(today)),
        MonthOfYear: String(editingSchedule.MonthOfYear || getMonth(today)),
        RequiresConfirmation: !!editingSchedule.RequiresConfirmation,
        LookaheadDays: editingSchedule.LookaheadDays || 7,
        IsActive: !!editingSchedule.IsActive,
        Note: editingSchedule.Note || ''
      });
    } else {
      setNewSchedule({
        SourceName: '',
        Category: '',
        PaymentMethodID: paymentMethods[0]?.value || '',
        ExpectedAmount: '0',
        RecurrenceRule: 'FREQ=MONTHLY;INTERVAL=1',
        DayOfMonth: String(getDate(today)),
        DayOfWeek: String(getDay(today)),
        MonthOfYear: String(getMonth(today)),
        RequiresConfirmation: true,
        LookaheadDays: 7,
        IsActive: true,
        Note: ''
      });
    }
  }, [editingSchedule, paymentMethods, settings.dev?.mockTime]);

  const [oneTimeIncome, setOneTimeIncome] = useState({
    SourceName: '',
    Category: '',
    PaymentMethodID: '',
    Amount: '0',
    Date: format(getCurrentDate(), 'yyyy-MM-dd'),
    Note: ''
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
      }).catch(err => showError(err));

      db.query("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName").then(rows => {
        setIncomeCategories(rows.map((r: any) => ({
          value: r.IncomeCategoryName,
          label: r.IncomeCategoryName
        })));
      }).catch(err => showError(err));

      db.query("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName").then(rows => {
        setIncomeSources(rows.map((r: any) => ({
          value: r.IncomeSourceName,
          label: r.IncomeSourceName
        })));
      }).catch(err => showError(err));
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
        db.queryOne<{
          IncomeCategoryName: string
        }>("SELECT IncomeCategoryName FROM IncomeCategories WHERE IncomeCategoryID = ?", [newId]).then(cat => {
          if (cat) {
            if (isOneTimeModalOpen) setOneTimeIncome(prev => ({...prev, Category: cat.IncomeCategoryName}));
            if (isScheduleModalOpen) setNewSchedule(prev => ({...prev, Category: cat.IncomeCategoryName}));
          }
        }).catch(err => showError(err));
      }
    }).catch(err => showError(err));
  };

  const handleIncomeSourceSave = (newId?: number) => {
    db.query("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName").then(rows => {
      setIncomeSources(rows.map((r: any) => ({
        value: r.IncomeSourceName,
        label: r.IncomeSourceName
      })));
      if (newId) {
        db.queryOne<{
          IncomeSourceName: string
        }>("SELECT IncomeSourceName FROM IncomeSources WHERE IncomeSourceID = ?", [newId]).then(src => {
          if (src) {
            if (isOneTimeModalOpen) setOneTimeIncome(prev => ({...prev, SourceName: src.IncomeSourceName}));
            if (isScheduleModalOpen) setNewSchedule(prev => ({...prev, SourceName: src.IncomeSourceName}));
          }
        }).catch(err => showError(err));
      }
    }).catch(err => showError(err));
  };

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

  const updateScheduleMutation = useMutation({
    mutationFn: ({id, data}: { id: number, data: any }) => incomeCommitments.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['incomeSchedules']});
      setIsScheduleModalOpen(false);
      setEditingSchedule(null);
      processSchedulesMutation.mutate();
    },
    onError: (err) => showError(err)
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: any) => incomeCommitments.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['incomeSchedules']});
      queryClient.invalidateQueries({queryKey: ['pendingIncome']});
      setIsScheduleModalOpen(false);
      processSchedulesMutation.mutate();
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

  const createOneTimeMutation = useMutation({
    mutationFn: (data: any) => incomeCommitments.createOneTimeIncome(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['pendingIncome']});
      queryClient.invalidateQueries({queryKey: ['transactions']});
      setIsOneTimeModalOpen(false);
      setOneTimeIncome({
        SourceName: '',
        Category: '',
        PaymentMethodID: '',
        Amount: '0',
        Date: format(getCurrentDate(), 'yyyy-MM-dd'),
        Note: ''
      });
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

  const handleSaveSchedule = () => {
    if (newSchedule.MonthOfYear === '1' && Number.parseInt(newSchedule.DayOfMonth) > 28) {
      showError(new Error("February cannot have more than 28 days."));
      return;
    }

    const data = {
      ...newSchedule,
      ExpectedAmount: Number.parseFloat(String(newSchedule.ExpectedAmount)) || null,
      LookaheadDays: Number.parseInt(String(newSchedule.LookaheadDays)) || 0,
      PaymentMethodID: Number(newSchedule.PaymentMethodID) || null,
      DayOfMonth: Number(newSchedule.DayOfMonth) || null,
      DayOfWeek: Number(newSchedule.DayOfWeek) || null,
      MonthOfYear: Number(newSchedule.MonthOfYear) || null,
      CreateForPastPeriod: createForPastPeriod,
    };
    if (editingSchedule) {
      updateScheduleMutation.mutate({id: editingSchedule.IncomeScheduleID, data});
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const renderRecurrenceDetails = () => {
    const {type} = parseRecurrenceRule(newSchedule.RecurrenceRule);

    switch (type) {
      case 'MONTHLY':
        return (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day of Month</label>
            <Select
              options={dayOfMonthOptions}
              value={newSchedule.DayOfMonth}
              onChange={e => setNewSchedule(prev => ({...prev, DayOfMonth: e.target.value}))}
            />
          </div>
        );
      case 'WEEKLY':
        return (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day of Week</label>
            <Select
              options={dayOfWeekOptions}
              value={newSchedule.DayOfWeek}
              onChange={e => setNewSchedule(prev => ({...prev, DayOfWeek: e.target.value}))}
            />
          </div>
        );
      case 'YEARLY':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
              <Select
                options={monthOfYearOptions}
                value={newSchedule.MonthOfYear}
                onChange={e => setNewSchedule(prev => ({...prev, MonthOfYear: e.target.value}))}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day</label>
              <Select
                options={dayOfMonthOptions.slice(0, newSchedule.MonthOfYear === '1' ? 28 : 31)}
                value={newSchedule.DayOfMonth}
                onChange={e => setNewSchedule(prev => ({...prev, DayOfMonth: e.target.value}))}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const showCreateForPastPeriodCheckbox = () => {
    if (editingSchedule) return false;
    try {
      const today = getCurrentDate();
      const oneMonthAgo = subMonths(today, 1);
      const occurrences = calculateOccurrences(
        {...newSchedule, CreationTimestamp: new Date().toISOString()} as any,
        oneMonthAgo,
        today
      );
      return occurrences.some(occ => isBefore(occ, today));
    } catch (e) {
      return false;
    }
  };

  const paginatedData = (data: any[] | undefined) => {
    if (!data) return [];
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  };

  const handleStepperChange = (setter: React.Dispatch<React.SetStateAction<any>>, field: string, increment: boolean, step: number) => {
    setter((prev: any) => {
      const currentValue = Number.parseFloat(prev[field]) || 0;
      const newValue = increment ? currentValue + step : currentValue - step;
      return {...prev, [field]: String(newValue)};
    });
  };

  const handleConfirmIncome = () => {
    confirmMutation.mutate({
      pending: selectedPending,
      amount: confirmData.amount,
      date: confirmData.date,
      paymentMethodId: Number(confirmData.paymentMethodId)
    });
  };

  const handleCreateOneTimeIncome = () => {
    createOneTimeMutation.mutate({
      ...oneTimeIncome,
      Amount: Number.parseFloat(oneTimeIncome.Amount) || 0,
      PaymentMethodID: Number(oneTimeIncome.PaymentMethodID) || null,
      Category: oneTimeIncome.Category || null
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
            <Tooltip content="Add One-Time Income">
              <Button variant="ghost" size="icon" onClick={() => {
                setOneTimeIncome({
                  SourceName: '',
                  Category: '',
                  PaymentMethodID: paymentMethods[0]?.value || '',
                  Amount: '0',
                  Date: format(getCurrentDate(), 'yyyy-MM-dd'),
                  Note: ''
                });
                setIsOneTimeModalOpen(true);
              }}>
                <FilePlus2 className="h-5 w-5"/>
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
                    {header: 'Source', accessor: 'SourceName'},
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
                              <DropdownMenuSeparator/>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                const schedule = schedules?.find(s => s.IncomeScheduleID === row.IncomeScheduleID);
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
                    {header: 'Source', accessor: 'SourceName'},
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
                                setScheduleToDelete(row.IncomeScheduleID);
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
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleCloseDeleteModal}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (scheduleToDelete) {
                  deleteScheduleMutation.mutate({id: scheduleToDelete, cascade: cascadeDelete});
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
        onEnter={handleConfirmIncome}
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

      <Modal
        isOpen={isOneTimeModalOpen}
        onClose={() => setIsOneTimeModalOpen(false)}
        title="Add One-time Income"
        onEnter={handleCreateOneTimeIncome}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsOneTimeModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateOneTimeIncome}
              loading={createOneTimeMutation.isPending}
            >
              Confirm
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
              onChange={val => setOneTimeIncome(prev => ({...prev, SourceName: val}))}
              className="flex-1"
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
              value={oneTimeIncome.Category}
              onChange={val => setOneTimeIncome(prev => ({...prev, Category: val}))}
              className="flex-1"
            />
            <Tooltip content="Add Category">
              <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsIncomeCategoryModalOpen(true)}>
                <Plus className="h-5 w-5"/>
              </Button>
            </Tooltip>
          </div>
          <Divider className="my-2"/>
          <div className="grid grid-cols-2 gap-4">
            <StepperInput
              label="Amount"
              step={1}
              min={0}
              max={10000000}
              value={oneTimeIncome.Amount}
              onChange={e => setOneTimeIncome(prev => ({...prev, Amount: e.target.value}))}
              onIncrement={() => handleStepperChange(setOneTimeIncome, 'Amount', true, 1)}
              onDecrement={() => handleStepperChange(setOneTimeIncome, 'Amount', false, 1)}
            />
            <Combobox
              label="Method"
              options={paymentMethods}
              value={oneTimeIncome.PaymentMethodID}
              onChange={val => setOneTimeIncome(prev => ({...prev, PaymentMethodID: val}))}
            />
          </div>
          <Divider className="my-2"/>
          <Input
            label="Date"
            type="date"
            value={oneTimeIncome.Date}
            onChange={e => setOneTimeIncome(prev => ({...prev, Date: e.target.value}))}
          />
          <Input
            type="text"
            label="Note"
            value={oneTimeIncome.Note}
            onChange={e => setOneTimeIncome(prev => ({...prev, Note: e.target.value}))}
            placeholder="e.g., Birthday gift"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title={editingSchedule ? "Edit Income Schedule" : "Add Income Schedule"}
        onEnter={handleSaveSchedule}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsScheduleModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveSchedule}
              loading={createScheduleMutation.isPending || updateScheduleMutation.isPending}
            >
              Confirm
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
              onChange={val => setNewSchedule(prev => ({...prev, SourceName: val}))}
              className="flex-1"
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
              value={newSchedule.Category}
              onChange={val => setNewSchedule(prev => ({...prev, Category: val}))}
              className="flex-1"
            />
            <Tooltip content="Add Category">
              <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsIncomeCategoryModalOpen(true)}>
                <Plus className="h-5 w-5"/>
              </Button>
            </Tooltip>
          </div>
          <Divider className="my-2"/>
          <div className="grid grid-cols-2 gap-4">
            <StepperInput
              label="Expected Amount"
              step={1}
              min={0}
              max={10000000}
              value={newSchedule.ExpectedAmount}
              onChange={e => setNewSchedule(prev => ({...prev, ExpectedAmount: e.target.value}))}
              onIncrement={() => handleStepperChange(setNewSchedule, 'ExpectedAmount', true, 1)}
              onDecrement={() => handleStepperChange(setNewSchedule, 'ExpectedAmount', false, 1)}
            />
            <Combobox
              label="Method"
              options={paymentMethods}
              value={newSchedule.PaymentMethodID}
              onChange={val => setNewSchedule(prev => ({...prev, PaymentMethodID: val}))}
            />
          </div>
          <Divider className="my-2"/>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurrence</label>
                <Tooltip content="How often this income is expected.">
                  <Info className="h-4 w-4 text-gray-400 cursor-help"/>
                </Tooltip>
              </div>
              <Select
                options={[
                  {value: 'FREQ=DAILY;INTERVAL=1', label: 'Daily'},
                  {value: 'FREQ=WEEKLY;INTERVAL=1', label: 'Weekly'},
                  {value: 'FREQ=MONTHLY;INTERVAL=1', label: 'Monthly'},
                  {value: 'FREQ=YEARLY;INTERVAL=1', label: 'Yearly'},
                ]}
                value={newSchedule.RecurrenceRule}
                onChange={e => setNewSchedule(prev => ({...prev, RecurrenceRule: e.target.value}))}
              />
            </div>
            {renderRecurrenceDetails()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 mb-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lookahead Days</label>
              <Tooltip content="How many days in advance to generate a 'To Check' item.">
                <Info className="h-4 w-4 text-gray-400 cursor-help"/>
              </Tooltip>
            </div>
            <StepperInput
              value={String(newSchedule.LookaheadDays)}
              onChange={e => setNewSchedule(prev => ({
                ...prev, LookaheadDays: Number.parseInt(e.target.value) || 0
              }))}
              onIncrement={() => setNewSchedule(prev => ({
                ...prev,
                LookaheadDays: (prev.LookaheadDays || 0) + 1
              }))}
              onDecrement={() => setNewSchedule(prev => ({
                ...prev,
                LookaheadDays: Math.max(1, (prev.LookaheadDays || 0) - 1)
              }))}
              min={1}
              max={1000}
            />
          </div>
          <Input
            type="text"
            label="Note"
            value={newSchedule.Note}
            onChange={e => setNewSchedule(prev => ({...prev, Note: e.target.value}))}
            placeholder="e.g., Monthly salary"
          />
          <div className="pt-2">
            {showCreateForPastPeriodCheckbox() && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="createForPastPeriod"
                  checked={createForPastPeriod}
                  onChange={e => setCreateForPastPeriod(e.target.checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="createForPastPeriod"
                         className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Create for current period
                  </label>
                  <p className="text-xs text-gray-500">The scheduled date for the current period is in the past. Check
                                                       this to create a "To Check" item for it anyway.</p>
                </div>
              </div>
            )}
            <Divider className="my-4"/>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="requiresConfirmation"
              checked={newSchedule.RequiresConfirmation}
              onChange={e => setNewSchedule(prev => ({...prev, RequiresConfirmation: e.target.checked}))}
            />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="requiresConfirmation"
                     className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Requires manual confirmation
              </label>
              <p className="text-xs text-gray-500">If enabled, you must confirm each occurrence before it's
                                                   deposited.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="isActive"
              checked={newSchedule.IsActive}
              onChange={e => setNewSchedule(prev => ({...prev, IsActive: e.target.checked}))}
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
