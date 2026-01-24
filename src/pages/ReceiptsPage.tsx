import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO, isBefore, startOfToday, getDay, getDate, getMonth, subMonths, startOfDay } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { Plus, Trash, FileDown, AlertCircle, CheckCircle, Users, ClipboardList, Clipboard, HelpCircle, RotateCcw, Filter, Paperclip, MoreHorizontal, Eye, CreditCard, User, Edit, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, HandCoins, Clock, Info, Wallet, Calendar, CalendarPlus, X, Check } from 'lucide-react';
import { db } from '../utils/db';
import Modal, { ConfirmModal } from '../components/ui/Modal';
import DatePicker from '../components/ui/DatePicker';
import ProgressModal from '../components/ui/ProgressModal';
import Tooltip from '../components/ui/Tooltip';
import { useDeleteReceipt } from '../hooks/useReceipts';
import { useTransactions } from '../hooks/useTransactions';
import { useSettingsStore } from '../store/useSettingsStore';
import { useErrorStore } from '../store/useErrorStore';
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import { calculateTotalWithDiscount } from '../logic/expense';
import FilterModal, { FilterOption } from '../components/ui/FilterModal';
import ButtonGroup from '../components/ui/ButtonGroup';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/DropdownMenu";
import { cn } from '../utils/cn';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import Badge from '../components/ui/Badge';
import Divider from '../components/ui/Divider';
import Combobox from '../components/ui/Combobox';
import TransferModal from '../components/payment/TransferModal';
import IncomeModal from '../components/payment/IncomeModal';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { incomeCommitments } from '../logic/incomeCommitments';
import { incomeLogic } from '../logic/incomeLogic';
import { humanizeRecurrenceRule, parseRecurrenceRule, calculateOccurrences } from '../logic/incomeScheduling';
import StepperInput from '../components/ui/StepperInput';
import Checkbox from '../components/ui/Checkbox';
import IncomeCategoryModal from '../components/categories/IncomeCategoryModal';
import IncomeSourceModal from '../components/income/IncomeSourceModal';
import Input from '../components/ui/Input';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';

import type { Receipt, LineItem, ReceiptImage, Transaction, Debtor, PaymentMethod } from '../types';

interface FullReceipt extends Receipt {
  lineItems: LineItem[];
  totalAmount: number;
  images: ReceiptImage[];
}

const dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const dayOfWeekOptions = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' }
];
const monthOfYearOptions = [
  { value: '0', label: 'January' }, { value: '1', label: 'February' },
  { value: '2', label: 'March' }, { value: '3', label: 'April' },
  { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' },
  { value: '8', label: 'September' }, { value: '9', label: 'October' },
  { value: '10', label: 'November' }, { value: '11', label: 'December' }
];

const ReceiptsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showError } = useErrorStore();
  const { settings } = useSettingsStore();
  const deleteReceiptMutation = useDeleteReceipt();
  const { generatePdf, isGenerating: isGeneratingPdf, progress: pdfProgress } = usePdfGenerator();

  const debtEnabled = settings.modules.debt?.enabled;
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const indicatorSettings = settings.receipts?.indicators;

  const [activeTab, setActiveTab] = useState<'overview' | 'to-check' | 'scheduled'>((searchParams.get('tab') as any) || 'overview');
  const [currentPage, setCurrentPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get('pageSize')) || 10);

  const initialDateRange: [Date | null, Date | null] = [
    searchParams.get('startDate') ? parseISO(searchParams.get('startDate')!) : null,
    searchParams.get('endDate') ? parseISO(searchParams.get('endDate')!) : null,
  ];

  const initialFilters = {
    type: searchParams.get('type') || 'all',
    debt: searchParams.get('debt') || 'all',
    expenseType: searchParams.get('expenseType') || 'all',
    tentative: searchParams.get('tentative') || 'all',
    attachment: searchParams.get('attachment') || 'all',
    incomeSource: searchParams.get('incomeSource') || 'all',
    incomeCategory: searchParams.get('incomeCategory') || 'all',
    incomeEntity: searchParams.get('incomeEntity') || 'all',
    debtor: searchParams.get('debtor') || 'all',
    fromMethod: searchParams.get('fromMethod') || 'all',
    toMethod: searchParams.get('toMethod') || 'all',
    method: searchParams.get('method') || 'all',
  };

  const [appliedDateRange, setAppliedDateRange] = useState<[Date | null, Date | null]>(initialDateRange);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [pendingDateRange, setPendingDateRange] = useState<[Date | null, Date | null]>(initialDateRange);
  const [pendingFilters, setPendingFilters] = useState(initialFilters);

  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);

  // Income Page States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<any>(null);
  const [confirmData, setConfirmData] = useState({ amount: 0, date: '', paymentMethodId: '' });
  const [isDeleteScheduleModalOpen, setIsDeleteScheduleModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(false);
  const [isIncomeCategoryModalOpen, setIsIncomeCategoryModalOpen] = useState(false);
  const [isIncomeSourceModalOpen, setIsIncomeSourceModalOpen] = useState(false);

  const getCurrentDate = () => {
    if (settings.dev?.mockTime?.enabled && settings.dev.mockTime.date) {
      return startOfDay(parseISO(settings.dev.mockTime.date));
    }
    return startOfToday();
  };

  const [newSchedule, setNewSchedule] = useState({
    SourceName: '',
    DebtorName: '',
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
    const loadReferenceData = async () => {
      const [debtorsData, methodsData, sourcesData, categoriesData] = await Promise.all([
        db.query<Debtor>('SELECT * FROM Debtors WHERE DebtorIsActive = 1 ORDER BY DebtorName'),
        db.query<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName'),
        db.query<any>('SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName'),
        db.query<any>('SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName'),
      ]);
      setDebtors(debtorsData);
      setMethods(methodsData);
      setIncomeSources(sourcesData);
      setIncomeCategories(categoriesData);
      setEntities(debtorsData.map(d => ({ value: d.DebtorName, label: d.DebtorName, id: d.DebtorID })));
    };
    loadReferenceData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    if (currentPage !== 1) params.set('page', String(currentPage));
    if (pageSize !== 10) params.set('pageSize', String(pageSize));
    if (searchTerm) params.set('search', searchTerm);
    if (appliedDateRange[0]) params.set('startDate', appliedDateRange[0].toISOString());
    if (appliedDateRange[1]) params.set('endDate', appliedDateRange[1].toISOString());
    if (appliedFilters.type !== 'all') params.set('type', appliedFilters.type);
    if (appliedFilters.debt !== 'all') params.set('debt', appliedFilters.debt);
    if (appliedFilters.expenseType !== 'all') params.set('expenseType', appliedFilters.expenseType);
    if (appliedFilters.tentative !== 'all') params.set('tentative', appliedFilters.tentative);
    if (appliedFilters.attachment !== 'all') params.set('attachment', appliedFilters.attachment);
    if (appliedFilters.incomeSource !== 'all') params.set('incomeSource', appliedFilters.incomeSource);
    if (appliedFilters.incomeCategory !== 'all') params.set('incomeCategory', appliedFilters.incomeCategory);
    if (appliedFilters.incomeEntity !== 'all') params.set('incomeEntity', appliedFilters.incomeEntity);
    if (appliedFilters.debtor !== 'all') params.set('debtor', appliedFilters.debtor);
    if (appliedFilters.fromMethod !== 'all') params.set('fromMethod', appliedFilters.fromMethod);
    if (appliedFilters.toMethod !== 'all') params.set('toMethod', appliedFilters.toMethod);
    if (appliedFilters.method !== 'all') params.set('method', appliedFilters.method);
    setSearchParams(params, { replace: true });
  }, [activeTab, currentPage, pageSize, searchTerm, appliedDateRange, appliedFilters, setSearchParams]);

  useEffect(() => {
    if (isFilterModalOpen) {
      setPendingDateRange(appliedDateRange);
      setPendingFilters(appliedFilters);
    }
  }, [isFilterModalOpen, appliedDateRange, appliedFilters]);

  const { data, isLoading, refetch } = useTransactions({
    page: currentPage,
    pageSize,
    searchTerm,
    startDate: appliedDateRange[0],
    endDate: appliedDateRange[1],
    typeFilter: appliedFilters.type,
    debtFilter: appliedFilters.debt,
    expenseTypeFilter: appliedFilters.expenseType,
    tentativeFilter: appliedFilters.tentative,
    attachmentFilter: appliedFilters.attachment,
    incomeSourceFilter: appliedFilters.incomeSource,
    incomeCategoryFilter: appliedFilters.incomeCategory,
    incomeEntityFilter: appliedFilters.incomeEntity,
    debtorFilter: appliedFilters.debtor,
    fromMethodFilter: appliedFilters.fromMethod,
    toMethodFilter: appliedFilters.toMethod,
    methodFilter: appliedFilters.method,
    debtEnabled
  });

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
      queryClient.invalidateQueries({ queryKey: ['pendingIncome'] });
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

  const handleDelete = async () => {
    const transactionsToDelete = transactionToDelete ? [transactionToDelete] : data?.transactions.filter(t => selectedTransactionIds.includes(t.id)) || [];
    if (transactionsToDelete.length === 0) return;
    try {
      for (const tx of transactionsToDelete) {
        if (tx.type === 'expense') {
          await deleteReceiptMutation.mutateAsync([tx.originalId]);
        } else if (tx.type === 'income' || tx.type === 'repayment') {
          await db.execute('DELETE FROM TopUps WHERE TopUpID = ?', [tx.originalId]);
        } else if (tx.type === 'transfer') {
          await db.execute('DELETE FROM Transfers WHERE TransferID = ?', [tx.originalId]);
        }
      }
      setSelectedTransactionIds([]);
      setDeleteModalOpen(false);
      setTransactionToDelete(null);
      refetch();
    } catch (error) {
      showError(error as Error);
    }
  };

  const openDeleteModal = (tx: Transaction | null = null) => {
    setTransactionToDelete(tx);
    setDeleteModalOpen(true);
  };

  const handleMassPdfSave = async () => {
    const selectedExpenses = data?.transactions.filter(t => selectedTransactionIds.includes(t.id) && t.type === 'expense') || [];
    if (selectedExpenses.length === 0) return;
    const expenseIds = selectedExpenses.map(t => t.originalId);
    const placeholders = expenseIds.map(() => '?').join(',');
    const receiptsData: (Receipt & { lineItems: LineItem[], totalAmount: number })[] = await db.query(`
      SELECT r.*, s.StoreName, pm.PaymentMethodName
      FROM Receipts r
      JOIN Stores s ON r.StoreID = s.StoreID
      LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
      WHERE r.ReceiptID IN (${placeholders})
      ORDER BY r.ReceiptDate DESC
    `, expenseIds);
    const lineItemsData: LineItem[] = await db.query(`
      SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType
      FROM LineItems li
      JOIN Products p ON li.ProductID = p.ProductID
      LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
      WHERE li.ReceiptID IN (${placeholders})
    `, expenseIds);
    const fullReceipts: FullReceipt[] = receiptsData.map(receipt => {
      const items = lineItemsData.filter(li => li.ReceiptID === receipt.ReceiptID);
      const total = receipt.IsNonItemised ? receipt.NonItemisedTotal : calculateTotalWithDiscount(items, receipt.Discount || 0);
      return { ...receipt, lineItems: items, totalAmount: total || 0, images: [] };
    });
    await generatePdf(fullReceipts, settings.pdf);
  };

  const columns: any[] = [
    { header: 'Date', width: '12%', render: (row: Transaction) => format(new Date(row.date), 'dd/MM/yyyy') },
    {
      header: 'Description', width: '20%', render: (row: Transaction) => {
        if (row.type === 'expense') return row.storeName;
        if (row.type === 'repayment') return `Repayment from ${row.debtorName}`;
        if (row.type === 'income') {
          return row.debtorName || 'Income'; // debtorName field is used for SourceName in incomeQuery
        }
        if (row.type === 'transfer') return 'Transfer';
        return '';
      }
    },
    { header: 'Note', accessor: 'note', width: '23%' },
  ];

  if (paymentMethodsEnabled) {
    columns.push({ header: 'Method', accessor: 'methodName', width: '15%' });
  }

  columns.push({
    header: 'Amount', width: '10%', className: 'text-right', render: (row: Transaction) => {
      const isUnpaid = row.type === 'expense' && row.status === 'unpaid';
      const isTransfer = row.type === 'transfer';
      return (
        <Tooltip content={isUnpaid ? "This expense is unpaid and hasn't affected your balance yet." : ""}>
          <div className="inline-block">
            <MoneyDisplay
              amount={row.amount}
              useSignum={true}
              showSign={true}
              colorNegative={!isUnpaid && row.amount < 0}
              colorPositive={row.amount > 0}
              colorNeutral={isUnpaid}
              colored={true}
              className={isTransfer ? "text-font-1 font-normal" : ""}
            />
          </div>
        </Tooltip>
      );
    }
  });

  columns.push({
    header: 'Type', width: '10%', render: (row: Transaction) => {
      if (row.type === 'expense' && row.status === 'unpaid') {
        return (
          <Tooltip content="Unpaid expense - not yet deducted from balance">
            <Badge variant="yellow" className="flex items-center gap-1 w-fit">
              <Clock className="h-3 w-3" /> Unpaid
            </Badge>
          </Tooltip>
        );
      }
      switch (row.type) {
        case 'expense':
          return (
            <Tooltip content="Expense - money spent at a vendor">
              <Badge variant="red" className="flex items-center gap-1 w-fit"><ArrowUpRight className="h-3 w-3" /> Expense</Badge>
            </Tooltip>
          );
        case 'income':
          return (
            <Tooltip content="Income - money received from a source">
              <Badge variant="green" className="flex items-center gap-1 w-fit"><ArrowDownLeft className="h-3 w-3" /> Income</Badge>
            </Tooltip>
          );
        case 'transfer':
          return (
            <Tooltip content="Transfer - money moved between payment methods">
              <Badge variant="gray" className="flex items-center gap-1 w-fit text-font-1 border-font-1/20 bg-font-1/10"><ArrowRightLeft className="h-3 w-3" /> Transfer</Badge>
            </Tooltip>
          );
        case 'repayment':
          return (
            <Tooltip content="Repayment - money received from a debtor">
              <Badge variant="green" className="flex items-center gap-1 w-fit"><HandCoins className="h-3 w-3" /> Repayment</Badge>
            </Tooltip>
          );
        default:
          return row.type;
      }
    }
  });

  // Indicators Column
  columns.push({
    header: '', width: '10%', className: 'text-right', render: (row: Transaction) => {
      const enabledCount = [indicatorSettings?.type, indicatorSettings?.debt && debtEnabled, indicatorSettings?.tentative, indicatorSettings?.attachments].filter(Boolean).length;
      if (enabledCount === 0) return <span className="text-font-2">-</span>;
      if (row.type !== 'expense') {
        return (
          <div className="flex justify-end">
            <div className="border border-border rounded-lg p-1 flex items-center justify-center gap-2 h-10" style={{ minWidth: `${enabledCount * 32}px` }}>
              <span className="text-font-2">-</span>
            </div>
          </div>
        );
      }
      const visibleIndicators = [];
      if (indicatorSettings?.type) {
        visibleIndicators.push(
          row.isNonItemised ? (
            <Tooltip key="type" content="Total-only expense">
              <Clipboard className="h-5 w-5 text-font-2" />
            </Tooltip>
          ) : (
            <Tooltip key="type" content="Detailed Expense">
              <ClipboardList className="h-5 w-5 text-font-2" />
            </Tooltip>
          )
        );
      }
      if (indicatorSettings?.debt && debtEnabled) {
        if ((row.unpaidDebtorCount || 0) > 0) {
          visibleIndicators.push(
            <Tooltip key="debt" content={`${row.unpaidDebtorCount} unpaid debtor(s)`}>
              <AlertCircle className="h-5 w-5 text-red" />
            </Tooltip>
          );
        } else if ((row.totalDebtorCount || 0) > 0) {
          visibleIndicators.push(
            <Tooltip key="debt" content="All debts settled">
              <CheckCircle className="h-5 w-5 text-green" />
            </Tooltip>
          );
        }
      }
      if (indicatorSettings?.tentative && row.isTentative) {
        visibleIndicators.push(
          <Tooltip key="tentative" content="Tentative Expense">
            <HelpCircle className="h-5 w-5 text-yellow" />
          </Tooltip>
        );
      }
      if (indicatorSettings?.attachments && (row.attachmentCount || 0) > 0) {
        visibleIndicators.push(
          <Tooltip key="attachments" content={`${row.attachmentCount} attachment(s)`}>
            <Paperclip className="h-5 w-5 text-font-2" />
          </Tooltip>
        );
      }
      return (
        <div className="flex justify-end">
          <div className="border border-border rounded-lg p-1 flex items-center justify-center gap-2 h-10" style={{ minWidth: `${enabledCount * 32}px` }}>
            {visibleIndicators.length > 0 ? visibleIndicators : <span className="text-font-2">-</span>}
          </div>
        </div>
      );
    }
  });

  columns.push({
    header: '', width: '5%', className: 'text-right', render: (row: Transaction) => (
      <div className="flex justify-end items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.type === 'expense' && (
              <>
                <DropdownMenuLabel>Indicators</DropdownMenuLabel>
                <div className="flex items-center gap-2 px-2 py-1.5 pointer-events-none">
                  {row.isNonItemised ? (
                    <Tooltip content="Total-only expense">
                      <Clipboard className="h-4 w-4 text-font-2" />
                    </Tooltip>
                  ) : (
                    <Tooltip content="Detailed Expense">
                      <ClipboardList className="h-4 w-4 text-font-2" />
                    </Tooltip>
                  )}
                  {debtEnabled && (
                    (row.unpaidDebtorCount || 0) > 0 ? (
                      <Tooltip content={`${row.unpaidDebtorCount} unpaid debtor(s)`}>
                        <AlertCircle className="h-4 w-4 text-red" />
                      </Tooltip>
                    ) : (row.totalDebtorCount || 0) > 0 ? (
                      <Tooltip content="All debts settled">
                        <CheckCircle className="h-4 w-4 text-green" />
                      </Tooltip>
                    ) : (
                      <Tooltip content="No debts">
                        <AlertCircle className="h-4 w-4 text-text-disabled" />
                      </Tooltip>
                    )
                  )}
                  {row.isTentative ? (
                    <Tooltip content="Tentative Expense">
                      <HelpCircle className="h-4 w-4 text-yellow" />
                    </Tooltip>
                  ) : (
                    <Tooltip content="Finished Expense">
                      <CheckCircle className="h-4 w-4 text-text-disabled" />
                    </Tooltip>
                  )}
                  {(row.attachmentCount || 0) > 0 ? (
                    <Tooltip content={`${row.attachmentCount} attachment(s)`}>
                      <Paperclip className="h-4 w-4 text-font-2" />
                    </Tooltip>
                  ) : (
                    <Tooltip content="No attachments">
                      <Paperclip className="h-4 w-4 text-text-disabled" />
                    </Tooltip>
                  )}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel>Go To</DropdownMenuLabel>
            {row.type === 'transfer' ? (
              <>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (row.fromMethodId) navigate(`/payment-methods/${row.fromMethodId}`); }}>
                  <CreditCard className="mr-2 h-4 w-4" /> Origin Method
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (row.toMethodId) navigate(`/payment-methods/${row.toMethodId}`); }}>
                  <CreditCard className="mr-2 h-4 w-4" /> Destination Method
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled={!row.methodId} onClick={(e) => { e.stopPropagation(); if (row.methodId) navigate(`/payment-methods/${row.methodId}`); }}>
                <CreditCard className="mr-2 h-4 w-4" /> Method
              </DropdownMenuItem>
            )}
            {(row.type === 'expense' || row.type === 'repayment' || row.type === 'income' || row.type === 'transfer') && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                if (row.type === 'expense') {
                  navigate(`/receipts/view/${row.originalId}`);
                } else if (row.type === 'income' || row.type === 'repayment') {
                  navigate(`/income/view/${row.originalId}`);
                } else if (row.type === 'transfer') {
                  navigate(`/transfers/view/${row.originalId}`);
                }
              }}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
            )}
            {(row.type === 'repayment' || row.type === 'income') && (
              <DropdownMenuItem disabled={!row.debtorId} onClick={(e) => { e.stopPropagation(); if (row.debtorId) navigate(`/entities/${row.debtorId}`); }}>
                <User className="mr-2 h-4 w-4" /> Entity
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {row.type === 'expense' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/receipts/edit/${row.originalId}`); }}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red" onClick={(e) => { e.stopPropagation(); openDeleteModal(row); }}>
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  });

  const typeFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'expense', label: 'Expenses' },
    { value: 'paid_expense', label: 'Paid Expenses' },
    { value: 'unpaid_expense', label: 'Unpaid Expenses' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfers' },
    { value: 'repayment', label: 'Repayments' },
  ];

  const debtFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'none', label: 'No Debt' },
    { value: 'unpaid', label: 'Unpaid Debt' },
    { value: 'own_debt', label: 'Own Debt' },
    { value: 'paid', label: 'Paid Debt' },
  ];

  const expenseTypeFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'detailed', label: 'Detailed' },
    { value: 'total-only', label: 'Total-only' },
  ];

  const tentativeFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'finished', label: 'Finished' },
    { value: 'tentative', label: 'Tentative' },
  ];

  const attachmentFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'none', label: 'No Attachments' },
    { value: 'yes', label: 'Has Attachments' },
  ];

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

  // Income Page Helpers
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
      updateScheduleMutation.mutate({ id: editingSchedule.IncomeScheduleID, data });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const renderRecurrenceDetails = () => {
    const { type } = parseRecurrenceRule(newSchedule.RecurrenceRule);
    switch (type) {
      case 'MONTHLY':
        return (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day of Month</label>
            <Combobox options={dayOfMonthOptions} value={newSchedule.DayOfMonth} onChange={val => setNewSchedule(prev => ({ ...prev, DayOfMonth: val }))} showSearch={false} />
          </div>
        );
      case 'WEEKLY':
        return (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day of Week</label>
            <Combobox options={dayOfWeekOptions} value={newSchedule.DayOfWeek} onChange={val => setNewSchedule(prev => ({ ...prev, DayOfWeek: val }))} showSearch={false} />
          </div>
        );
      case 'YEARLY':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
              <Combobox options={monthOfYearOptions} value={newSchedule.MonthOfYear} onChange={val => setNewSchedule(prev => ({ ...prev, MonthOfYear: val }))} showSearch={false} />
            </div>
            <div className="col-span-1 flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Day</label>
              <Combobox options={dayOfMonthOptions.slice(0, newSchedule.MonthOfYear === '1' ? 28 : 31)} value={newSchedule.DayOfMonth} onChange={val => setNewSchedule(prev => ({ ...prev, DayOfMonth: val }))} showSearch={false} />
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
        { ...newSchedule, CreationTimestamp: new Date().toISOString() } as any,
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
      return { ...prev, [field]: String(newValue) };
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

  const applyFilters = () => {
    setAppliedFilters(pendingFilters);
    setAppliedDateRange(pendingDateRange);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters = {
      type: 'all',
      debt: 'all',
      expenseType: 'all',
      tentative: 'all',
      attachment: 'all',
      incomeSource: 'all',
      incomeCategory: 'all',
      incomeEntity: 'all',
      debtor: 'all',
      fromMethod: 'all',
      toMethod: 'all',
      method: 'all'
    };
    const defaultDateRange: [Date | null, Date | null] = [null, null];
    setAppliedFilters(defaultFilters);
    setAppliedDateRange(defaultDateRange);
    setPendingFilters(defaultFilters);
    setPendingDateRange(defaultDateRange);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const resetPendingFilters = () => {
    const defaultFilters = {
      type: 'all',
      debt: 'all',
      expenseType: 'all',
      tentative: 'all',
      attachment: 'all',
      incomeSource: 'all',
      incomeCategory: 'all',
      incomeEntity: 'all',
      debtor: 'all',
      fromMethod: 'all',
      toMethod: 'all',
      method: 'all'
    };
    const defaultDateRange: [Date | null, Date | null] = [null, null];
    setPendingFilters(defaultFilters);
    setPendingDateRange(defaultDateRange);
  };

  const hasActiveFilters = appliedFilters.type !== 'all' || appliedFilters.debt !== 'all' || appliedFilters.expenseType !== 'all' || appliedFilters.tentative !== 'all' || appliedFilters.attachment !== 'all' || appliedFilters.incomeSource !== 'all' || appliedFilters.incomeCategory !== 'all' || appliedFilters.incomeEntity !== 'all' || appliedFilters.debtor !== 'all' || appliedFilters.fromMethod !== 'all' || appliedFilters.toMethod !== 'all' || appliedFilters.method !== 'all' || appliedDateRange[0] !== null || appliedDateRange[1] !== null || searchTerm !== '';

  const hasPendingFilters = pendingFilters.type !== 'all' || pendingFilters.debt !== 'all' || pendingFilters.expenseType !== 'all' || pendingFilters.tentative !== 'all' || pendingFilters.attachment !== 'all' || pendingFilters.incomeSource !== 'all' || pendingFilters.incomeCategory !== 'all' || pendingFilters.incomeEntity !== 'all' || pendingFilters.debtor !== 'all' || pendingFilters.fromMethod !== 'all' || pendingFilters.toMethod !== 'all' || pendingFilters.method !== 'all' || pendingDateRange[0] !== null || pendingDateRange[1] !== null;

  const activeFilterCount = [
    pendingFilters.type !== 'all',
    pendingFilters.debt !== 'all',
    pendingFilters.expenseType !== 'all',
    pendingFilters.tentative !== 'all',
    pendingFilters.attachment !== 'all',
    pendingFilters.incomeSource !== 'all',
    pendingFilters.incomeCategory !== 'all',
    pendingFilters.incomeEntity !== 'all',
    pendingFilters.debtor !== 'all',
    pendingFilters.fromMethod !== 'all',
    pendingFilters.toMethod !== 'all',
    pendingFilters.method !== 'all',
    pendingDateRange[0] !== null || pendingDateRange[1] !== null
  ].filter(Boolean).length;

  const handlePendingFilterChange = (key, value) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <Header title="Home" variant="tabs" tabs={renderTabs()} actions={
        <div className="flex items-center gap-2">
          {selectedTransactionIds.length > 0 && (
            <>
              <Tooltip content={`Delete ${selectedTransactionIds.length} item(s)`}>
                <Button variant="secondary" size="icon" onClick={() => openDeleteModal()}>
                  <Trash className="h-5 w-5" />
                </Button>
              </Tooltip>
              {selectedTransactionIds.some(id => id.startsWith('expense-')) && (
                <Tooltip content="Feature broken, WIP">
                  <Button variant="secondary" size="icon" onClick={handleMassPdfSave} disabled>
                    <FileDown className="h-5 w-5" />
                  </Button>
                </Tooltip>
              )}
            </>
          )}
          <Tooltip content="New Transfer">
            <Button variant="ghost" size="icon" onClick={() => setIsTransferModalOpen(true)}>
              <ArrowRightLeft className="h-5 w-5" />
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
            <DataTable
              data={data?.transactions || []}
              columns={columns}
              totalCount={data?.totalCount || 0}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onSearch={setSearchTerm}
              searchable={true}
              loading={isLoading}
              onRowClick={(row: Transaction) => {
                if (row.type === 'expense') {
                  navigate(`/receipts/view/${row.originalId}`);
                } else if (row.type === 'income' || row.type === 'repayment') {
                  navigate(`/income/view/${row.originalId}`);
                } else if (row.type === 'transfer') {
                  navigate(`/transfers/view/${row.originalId}`);
                }
              }}
              selectable={true}
              onSelectionChange={setSelectedTransactionIds}
              selectedIds={selectedTransactionIds}
              itemKey="id"
              actions={
                <ButtonGroup>
                  <Tooltip content="Filters">
                    <Button variant={hasActiveFilters ? "primary" : "secondary"} size="icon" onClick={() => setIsFilterModalOpen(true)}>
                      <Filter className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Reset Filters">
                    <Button variant="secondary" size="icon" onClick={resetFilters} disabled={!hasActiveFilters}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </ButtonGroup>
              }
            />
          )}
          {activeTab === 'to-check' && (
            <DataTable
              loading={loadingPending}
              data={paginatedData(pendingIncomes)}
              emptyStateText="No pending items to review."
              emptyStateIcon={<CheckCircle className="h-10 w-10 opacity-50 text-green-500" />}
              columns={[
                { header: 'Planned Date', accessor: 'PlannedDate', render: (row) => format(parseISO(row.PlannedDate), 'MMM d, yyyy') },
                {
                  header: 'Source', accessor: 'SourceName', render: (row) => (
                    <div className="flex items-center gap-2">
                      {row.SourceName}
                      {row.DebtorID && (
                        <Tooltip content="Associated with an entity.">
                          <User className="h-3 w-3 text-accent" />
                        </Tooltip>
                      )}
                    </div>
                  )
                },
                { header: 'Category', accessor: 'Category' },
                { header: 'Method', accessor: 'PaymentMethodName' },
                { header: 'Expected Amount', accessor: 'Amount', render: (row) => row.Amount ? `€${row.Amount.toFixed(2)}` : '-' },
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
                          {row.DebtorID && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/entities/${row.DebtorID}`); }}>
                              <User className="mr-2 h-4 w-4" /> Entity
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            const schedule = schedules?.find(s => s.IncomeScheduleID === row.IncomeScheduleID);
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
                  header: 'Source', accessor: 'SourceName', render: (row) => (
                    <div className="flex items-center gap-2">
                      {row.SourceName}
                      {row.DebtorID && (
                        <Tooltip content="Associated with an entity.">
                          <User className="h-3 w-3 text-accent" />
                        </Tooltip>
                      )}
                    </div>
                  )
                },
                { header: 'Category', accessor: 'Category' },
                { header: 'Method', accessor: 'PaymentMethodName' },
                { header: 'Expected Amount', accessor: 'Amount', render: (row) => row.Amount ? `€${row.Amount.toFixed(2)}` : '-' },
                { header: 'Recurrence', accessor: 'RecurrenceRule', render: (row) => humanizeRecurrenceRule(row) },
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
                        {row.DebtorID && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/entities/${row.DebtorID}`); }}>
                            <User className="mr-2 h-4 w-4" /> Entity
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingSchedule(row);
                          setIsScheduleModalOpen(true);
                          setNewSchedule({
                            SourceName: row.SourceName || '',
                            DebtorName: entities.find(e => e.id === row.DebtorID)?.label || '',
                            Category: row.Category || '',
                            PaymentMethodID: String(row.PaymentMethodID),
                            ExpectedAmount: String(row.ExpectedAmount || '0'),
                            RecurrenceRule: row.RecurrenceRule || 'FREQ=MONTHLY;INTERVAL=1',
                            DayOfMonth: String(row.DayOfMonth || getDate(getCurrentDate())),
                            DayOfWeek: String(row.DayOfWeek || getDay(getCurrentDate())),
                            MonthOfYear: String(row.MonthOfYear || getMonth(getCurrentDate())),
                            RequiresConfirmation: !!row.RequiresConfirmation,
                            LookaheadDays: row.LookaheadDays || 7,
                            IsActive: !!row.IsActive,
                            Note: row.Note || ''
                          });
                        }}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={(e) => {
                          e.stopPropagation();
                          setScheduleToDelete(row.IncomeScheduleID);
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
          <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} onApply={applyFilters} onResetAll={resetPendingFilters} filterCount={activeFilterCount} hasActiveFilters={hasPendingFilters}>
            <div className="flex items-center gap-2 mb-4 p-3 bg-bg-2 rounded-lg border border-border">
              <Info className="h-4 w-4 text-accent flex-shrink-0" />
              <p className="text-xs text-font-2"> Select a <strong>Transaction Type</strong> to reveal specific filters for that category. </p>
            </div>
            <FilterOption title="Date Range" onReset={() => setPendingDateRange([null, null])} isModified={pendingDateRange[0] !== null || pendingDateRange[1] !== null}>
              <DatePicker selectsRange startDate={pendingDateRange[0]} endDate={pendingDateRange[1]} onChange={(update: any) => setPendingDateRange(update)} isClearable={true} placeholderText="Filter by date range" />
            </FilterOption>
            {paymentMethodsEnabled && (
              <FilterOption title="Method" onReset={() => handlePendingFilterChange('method', 'all')} isModified={pendingFilters.method !== 'all'}>
                <Combobox options={[{ value: 'all', label: 'All' }, ...methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))]} value={pendingFilters.method} onChange={val => handlePendingFilterChange('method', val)} />
              </FilterOption>
            )}
            <FilterOption title="Transaction Type" onReset={() => handlePendingFilterChange('type', 'all')} isModified={pendingFilters.type !== 'all'}>
              <Combobox options={typeFilterOptions} value={pendingFilters.type} onChange={val => handlePendingFilterChange('type', val)} />
            </FilterOption>
            {(pendingFilters.type === 'expense' || pendingFilters.type === 'paid_expense' || pendingFilters.type === 'unpaid_expense') && (
              <>
                <Divider text="Expense Filters" className="my-4" />
                {debtEnabled && (
                  <FilterOption title="Debt Status" onReset={() => handlePendingFilterChange('debt', 'all')} isModified={pendingFilters.debt !== 'all'}>
                    <Combobox options={debtFilterOptions} value={pendingFilters.debt} onChange={val => handlePendingFilterChange('debt', val)} />
                  </FilterOption>
                )}
                <FilterOption title="Expense Format" onReset={() => handlePendingFilterChange('expenseType', 'all')} isModified={pendingFilters.expenseType !== 'all'}>
                  <Combobox options={expenseTypeFilterOptions} value={pendingFilters.expenseType} onChange={val => handlePendingFilterChange('expenseType', val)} />
                </FilterOption>
                <FilterOption title="Status" onReset={() => handlePendingFilterChange('tentative', 'all')} isModified={pendingFilters.tentative !== 'all'}>
                  <Combobox options={tentativeFilterOptions} value={pendingFilters.tentative} onChange={val => handlePendingFilterChange('tentative', val)} />
                </FilterOption>
                <FilterOption title="Attachments" onReset={() => handlePendingFilterChange('attachment', 'all')} isModified={pendingFilters.attachment !== 'all'}>
                  <Combobox options={attachmentFilterOptions} value={pendingFilters.attachment} onChange={val => handlePendingFilterChange('attachment', val)} />
                </FilterOption>
              </>
            )}
            {pendingFilters.type === 'income' && (
              <>
                <Divider text="Income Filters" className="my-4" />
                <FilterOption title="Source" onReset={() => handlePendingFilterChange('incomeSource', 'all')} isModified={pendingFilters.incomeSource !== 'all'}>
                  <Combobox options={[{ value: 'all', label: 'All' }, ...incomeSources.map(s => ({ value: String(s.IncomeSourceID), label: s.IncomeSourceName }))]} value={pendingFilters.incomeSource} onChange={val => handlePendingFilterChange('incomeSource', val)} />
                </FilterOption>
                <FilterOption title="Category" onReset={() => handlePendingFilterChange('incomeCategory', 'all')} isModified={pendingFilters.incomeCategory !== 'all'}>
                  <Combobox options={[{ value: 'all', label: 'All' }, ...incomeCategories.map(c => ({ value: String(c.IncomeCategoryID), label: c.IncomeCategoryName }))]} value={pendingFilters.incomeCategory} onChange={val => handlePendingFilterChange('incomeCategory', val)} />
                </FilterOption>
                <FilterOption title="Entity" onReset={() => handlePendingFilterChange('incomeEntity', 'all')} isModified={pendingFilters.incomeEntity !== 'all'}>
                  <Combobox options={[{ value: 'all', label: 'All' }, ...debtors.map(d => ({ value: String(d.DebtorID), label: d.DebtorName }))]} value={pendingFilters.incomeEntity} onChange={val => handlePendingFilterChange('incomeEntity', val)} />
                </FilterOption>
              </>
            )}
            {pendingFilters.type === 'repayment' && (
              <>
                <Divider text="Repayment Filters" className="my-4" />
                <FilterOption title="Entity" onReset={() => handlePendingFilterChange('debtor', 'all')} isModified={pendingFilters.debtor !== 'all'}>
                  <Combobox options={[{ value: 'all', label: 'All' }, ...debtors.map(d => ({ value: String(d.DebtorID), label: d.DebtorName }))]} value={pendingFilters.debtor} onChange={val => handlePendingFilterChange('debtor', val)} />
                </FilterOption>
              </>
            )}
            {pendingFilters.type === 'transfer' && (
              <>
                <Divider text="Transfer Filters" className="my-4" />
                <FilterOption title="From Method" onReset={() => handlePendingFilterChange('fromMethod', 'all')} isModified={pendingFilters.fromMethod !== 'all'}>
                  <Combobox options={[{ value: 'all', label: 'All' }, ...methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))]} value={pendingFilters.fromMethod} onChange={val => handlePendingFilterChange('fromMethod', val)} />
                </FilterOption>
                <FilterOption title="To Method" onReset={() => handlePendingFilterChange('toMethod', 'all')} isModified={pendingFilters.toMethod !== 'all'}>
                  <Combobox options={[{ value: 'all', label: 'All' }, ...methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))]} value={pendingFilters.toMethod} onChange={val => handlePendingFilterChange('toMethod', val)} />
                </FilterOption>
              </>
            )}
          </FilterModal>
          <ConfirmModal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setTransactionToDelete(null); }} onConfirm={handleDelete} title={`Delete ${transactionToDelete ? 'Transaction' : `${selectedTransactionIds.length} Transactions`}`} message={`Are you sure you want to permanently delete ${transactionToDelete ? 'this transaction' : `${selectedTransactionIds.length} selected transactions`}? This action cannot be undone.`} />
          <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} onSave={refetch} topUpToEdit={null} paymentMethodId={methods[0]?.PaymentMethodID?.toString() || ''} currentBalance={0} />
          <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} onSave={refetch} topUpToEdit={null} />
          <ProgressModal isOpen={isGeneratingPdf} progress={pdfProgress} title="Generating PDF Report..." />
          {/* Income Modals */}
          <Modal isOpen={isDeleteScheduleModalOpen} onClose={() => { setIsDeleteScheduleModalOpen(false); setCascadeDelete(false); }} title="Delete Schedule" className="max-w-lg" footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsDeleteScheduleModalOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => { if (scheduleToDelete) { deleteScheduleMutation.mutate({ id: scheduleToDelete, cascade: cascadeDelete }); } }} loading={deleteScheduleMutation.isPending}>
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
          <ConfirmModal isOpen={isDismissModalOpen} onClose={() => setIsDismissModalOpen(false)} onConfirm={() => { if (selectedPending) { rejectMutation.mutate(selectedPending.PendingIncomeID); setIsDismissModalOpen(false); } }} title="Dismiss Income" message={`Are you sure you want to dismiss ${selectedPending?.SourceName}? This occurrence will be ignored.`} confirmText="Dismiss" />
          <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Income" onEnter={handleConfirmIncome} footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmIncome} loading={confirmMutation.isPending}>
                Confirm
              </Button>
            </div>
          }>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400"> Verify the amount and date for <strong>{selectedPending?.SourceName}</strong>. </p>
              <StepperInput label="Amount" step={1} value={String(confirmData.amount)} onChange={e => setConfirmData(prev => ({ ...prev, amount: Number.parseFloat(e.target.value) }))} onIncrement={() => setConfirmData(prev => ({ ...prev, amount: (prev.amount || 0) + 1 }))} onDecrement={() => setConfirmData(prev => ({ ...prev, amount: (prev.amount || 0) - 1 }))} />
              <Input label="Date" type="date" value={confirmData.date} onChange={e => setConfirmData(prev => ({ ...prev, date: e.target.value }))} />
              <Combobox label="Method" options={methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))} value={confirmData.paymentMethodId} onChange={val => setConfirmData(prev => ({ ...prev, paymentMethodId: val }))} />
            </div>
          </Modal>
          <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title={editingSchedule ? "Edit Income Schedule" : "Add Income Schedule"} onEnter={handleSaveSchedule} footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setIsScheduleModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSchedule} loading={createScheduleMutation.isPending || updateScheduleMutation.isPending}>
                Confirm
              </Button>
            </div>
          }>
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <Combobox label="Source Name" placeholder="e.g. Salary, Rent" options={incomeSources} value={newSchedule.SourceName} onChange={val => setNewSchedule(prev => ({ ...prev, SourceName: val }))} className="flex-1" />
                <Tooltip content="Add Source">
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsIncomeSourceModalOpen(true)}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </Tooltip>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Entity (Optional)</label>
                    <Tooltip content="Associate this income with an entity for extra context. Note: This does NOT settle any outstanding debts. To settle debt, please use the Repayment feature on the Entity page.">
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <Combobox placeholder="Select an entity..." options={entities} value={newSchedule.DebtorName} onChange={val => setNewSchedule(prev => ({ ...prev, DebtorName: val }))} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Combobox label="Category (Optional)" options={incomeCategories} value={newSchedule.Category} onChange={val => setNewSchedule(prev => ({ ...prev, Category: val }))} className="flex-1" />
                <Tooltip content="Add Category">
                  <Button variant="secondary" className="h-10 w-10 p-0" onClick={() => setIsIncomeCategoryModalOpen(true)}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </Tooltip>
              </div>
              <Divider className="my-2" />
              <div className="grid grid-cols-2 gap-4">
                <StepperInput label="Expected Amount" step={1} min={0} max={10000000} value={newSchedule.ExpectedAmount} onChange={e => setNewSchedule(prev => ({ ...prev, ExpectedAmount: e.target.value }))} onIncrement={() => handleStepperChange(setNewSchedule, 'ExpectedAmount', true, 1)} onDecrement={() => handleStepperChange(setNewSchedule, 'ExpectedAmount', false, 1)} />
                <Combobox label="Method" options={methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))} value={newSchedule.PaymentMethodID} onChange={val => setNewSchedule(prev => ({ ...prev, PaymentMethodID: val }))} />
              </div>
              <Divider className="my-2" />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Recurrence</label>
                    <Tooltip content="How often this income is expected.">
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <Combobox options={[
                    { value: 'FREQ=DAILY;INTERVAL=1', label: 'Daily' },
                    { value: 'FREQ=WEEKLY;INTERVAL=1', label: 'Weekly' },
                    { value: 'FREQ=MONTHLY;INTERVAL=1', label: 'Monthly' },
                    { value: 'FREQ=YEARLY;INTERVAL=1', label: 'Yearly' },
                  ]} value={newSchedule.RecurrenceRule} onChange={val => setNewSchedule(prev => ({ ...prev, RecurrenceRule: val }))} showSearch={false} />
                </div>
                {renderRecurrenceDetails()}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lookahead Days</label>
                  <Tooltip content="How many days in advance to generate a 'To Check' item.">
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
                <StepperInput value={String(newSchedule.LookaheadDays)} onChange={e => setNewSchedule(prev => ({ ...prev, LookaheadDays: Number.parseInt(e.target.value) || 0 }))} onIncrement={() => setNewSchedule(prev => ({ ...prev, LookaheadDays: (prev.LookaheadDays || 0) + 1 }))} onDecrement={() => setNewSchedule(prev => ({ ...prev, LookaheadDays: Math.max(1, (prev.LookaheadDays || 0) - 1) }))} min={1} max={1000} precision={0} />
              </div>
              <Input type="text" label="Note" value={newSchedule.Note} onChange={e => setNewSchedule(prev => ({ ...prev, Note: e.target.value }))} placeholder="e.g., Monthly salary" />
              <div className="pt-2">
                {showCreateForPastPeriodCheckbox() && (
                  <div className="flex items-start gap-3">
                    <Checkbox id="createForPastPeriod" checked={createForPastPeriod} onChange={e => setCreateForPastPeriod(e.target.checked)} />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="createForPastPeriod" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Create for current period
                      </label>
                      <p className="text-xs text-gray-500">The scheduled date for the current period is in the past. Check this to create a "To Check" item for it anyway.</p>
                    </div>
                  </div>
                )}
                <Divider className="my-4" />
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="requiresConfirmation" checked={newSchedule.RequiresConfirmation} onChange={e => setNewSchedule(prev => ({ ...prev, RequiresConfirmation: e.target.checked }))} />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="requiresConfirmation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Requires manual confirmation
                  </label>
                  <p className="text-xs text-gray-500">If enabled, you must confirm each occurrence before it's deposited.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="isActive" checked={newSchedule.IsActive} onChange={e => setNewSchedule(prev => ({ ...prev, IsActive: e.target.checked }))} />
                <label htmlFor="isActive" className="text-sm font-medium leading-none">Schedule is active</label>
              </div>
            </div>
          </Modal>
          <IncomeCategoryModal isOpen={isIncomeCategoryModalOpen} onClose={() => setIsIncomeCategoryModalOpen(false)} onSave={() => {
            db.query("SELECT * FROM IncomeCategories WHERE IncomeCategoryIsActive = 1 ORDER BY IncomeCategoryName").then(rows => {
              setIncomeCategories(rows.map((r: any) => ({ value: r.IncomeCategoryName, label: r.IncomeCategoryName })));
            });
          }} categoryToEdit={null} />
          <IncomeSourceModal isOpen={isIncomeSourceModalOpen} onClose={() => setIsIncomeSourceModalOpen(false)} onSave={() => {
            db.query("SELECT * FROM IncomeSources WHERE IncomeSourceIsActive = 1 ORDER BY IncomeSourceName").then(rows => {
              setIncomeSources(rows.map((r: any) => ({ value: r.IncomeSourceName, label: r.IncomeSourceName })));
            });
          }} sourceToEdit={null} />
        </div>
      </PageWrapper>
    </div>
  );
};

export default ReceiptsPage;