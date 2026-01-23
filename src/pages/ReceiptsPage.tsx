import React, {useState, useEffect} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {format, parseISO} from 'date-fns';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import {
  Plus,
  Trash,
  FileDown,
  AlertCircle,
  CheckCircle,
  Users,
  AlertTriangle,
  ClipboardList,
  Clipboard,
  HelpCircle,
  RotateCcw,
  Filter,
  Paperclip,
  MoreHorizontal,
  Eye,
  CreditCard,
  User,
  FileText,
  Edit,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  HandCoins,
  Clock,
  Info
} from 'lucide-react';
import {db} from '../utils/db';
import {ConfirmModal} from '../components/ui/Modal';
import DatePicker from '../components/ui/DatePicker';
import ProgressModal from '../components/ui/ProgressModal';
import Tooltip from '../components/ui/Tooltip';
import BulkDebtModal from '../components/debt/BulkDebtModal';
import {Receipt, LineItem, ReceiptImage, Transaction, Debtor, PaymentMethod} from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { useDeleteReceipt } from '../hooks/useReceipts';
import { useTransactions } from '../hooks/useTransactions';
import { useSettingsStore } from '../store/useSettingsStore';
import { useErrorStore } from '../store/useErrorStore';
import Select from '../components/ui/Select';
import { usePdfGenerator } from '../hooks/usePdfGenerator';
import { calculateTotalWithDiscount } from '../logic/expense';
import FilterModal, { FilterOption } from '../components/ui/FilterModal';
import ButtonGroup from '../components/ui/ButtonGroup';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/DropdownMenu"
import { cn } from '../utils/cn';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import Badge from '../components/ui/Badge';
import Divider from '../components/ui/Divider';
import Combobox from '../components/ui/Combobox';

interface FullReceipt extends Receipt {
  lineItems: LineItem[];
  totalAmount: number;
  images: ReceiptImage[];
}

const ReceiptsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get('pageSize')) || 10);
  
  // Initial state from URL params
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
    debtor: searchParams.get('debtor') || 'all',
    fromMethod: searchParams.get('fromMethod') || 'all',
    toMethod: searchParams.get('toMethod') || 'all',
    method: searchParams.get('method') || 'all',
  };

  // Applied filters (what is shown in the table)
  const [appliedDateRange, setAppliedDateRange] = useState<[Date | null, Date | null]>(initialDateRange);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  // Pending filters (what is shown in the modal)
  const [pendingDateRange, setPendingDateRange] = useState<[Date | null, Date | null]>(initialDateRange);
  const [pendingFilters, setPendingFilters] = useState(initialFilters);

  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);

  const { generatePdf, isGenerating: isGeneratingPdf, progress: pdfProgress } = usePdfGenerator();
  const [isBulkDebtModalOpen, setIsBulkDebtModalOpen] = useState<boolean>(false);

  const {showError} = useErrorStore();
  const { settings } = useSettingsStore();
  const debtEnabled = settings.modules.debt?.enabled;
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const indicatorSettings = settings.receipts?.indicators;

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
    };
    loadReferenceData();
  }, []);

  // Sync URL with applied filters
  useEffect(() => {
    const params = new URLSearchParams();
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
    if (appliedFilters.debtor !== 'all') params.set('debtor', appliedFilters.debtor);
    if (appliedFilters.fromMethod !== 'all') params.set('fromMethod', appliedFilters.fromMethod);
    if (appliedFilters.toMethod !== 'all') params.set('toMethod', appliedFilters.toMethod);
    if (appliedFilters.method !== 'all') params.set('method', appliedFilters.method);
    setSearchParams(params, { replace: true });
  }, [currentPage, pageSize, searchTerm, appliedDateRange, appliedFilters, setSearchParams]);

  // Sync pending filters when modal opens
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
    debtorFilter: appliedFilters.debtor,
    fromMethodFilter: appliedFilters.fromMethod,
    toMethodFilter: appliedFilters.toMethod,
    methodFilter: appliedFilters.method,
    debtEnabled
  });

  const handlePendingFilterChange = (filterName: keyof typeof pendingFilters, value: string) => {
    setPendingFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const deleteReceiptMutation = useDeleteReceipt();

  const applyFilters = () => {
    setAppliedFilters(pendingFilters);
    setAppliedDateRange(pendingDateRange);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters = { 
      type: 'all', debt: 'all', expenseType: 'all', tentative: 'all', attachment: 'all',
      incomeSource: 'all', incomeCategory: 'all', debtor: 'all', fromMethod: 'all', toMethod: 'all', method: 'all'
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
      type: 'all', debt: 'all', expenseType: 'all', tentative: 'all', attachment: 'all',
      incomeSource: 'all', incomeCategory: 'all', debtor: 'all', fromMethod: 'all', toMethod: 'all', method: 'all'
    };
    const defaultDateRange: [Date | null, Date | null] = [null, null];
    
    setPendingFilters(defaultFilters);
    setPendingDateRange(defaultDateRange);
  };

  const hasActiveFilters = 
    appliedFilters.type !== 'all' || 
    appliedFilters.debt !== 'all' || 
    appliedFilters.expenseType !== 'all' || 
    appliedFilters.tentative !== 'all' || 
    appliedFilters.attachment !== 'all' || 
    appliedFilters.incomeSource !== 'all' ||
    appliedFilters.incomeCategory !== 'all' ||
    appliedFilters.debtor !== 'all' ||
    appliedFilters.fromMethod !== 'all' ||
    appliedFilters.toMethod !== 'all' ||
    appliedFilters.method !== 'all' ||
    appliedDateRange[0] !== null || 
    appliedDateRange[1] !== null || 
    searchTerm !== '';

  const hasPendingFilters = 
    pendingFilters.type !== 'all' || 
    pendingFilters.debt !== 'all' || 
    pendingFilters.expenseType !== 'all' || 
    pendingFilters.tentative !== 'all' || 
    pendingFilters.attachment !== 'all' || 
    pendingFilters.incomeSource !== 'all' || 
    pendingFilters.incomeCategory !== 'all' || 
    pendingFilters.debtor !== 'all' || 
    pendingFilters.fromMethod !== 'all' || 
    pendingFilters.toMethod !== 'all' || 
    pendingFilters.method !== 'all' ||
    pendingDateRange[0] !== null || 
    pendingDateRange[1] !== null;

  const activeFilterCount = [
    pendingFilters.type !== 'all',
    pendingFilters.debt !== 'all',
    pendingFilters.expenseType !== 'all',
    pendingFilters.tentative !== 'all',
    pendingFilters.attachment !== 'all',
    pendingFilters.incomeSource !== 'all',
    pendingFilters.incomeCategory !== 'all',
    pendingFilters.debtor !== 'all',
    pendingFilters.fromMethod !== 'all',
    pendingFilters.toMethod !== 'all',
    pendingFilters.method !== 'all',
    pendingDateRange[0] !== null || pendingDateRange[1] !== null
  ].filter(Boolean).length;

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
      return {...receipt, lineItems: items, totalAmount: total || 0, images: []};
    });

    await generatePdf(fullReceipts, settings.pdf);
  };

  const columns: any[] = [
    {
      header: 'Date', 
      width: '12%', 
      render: (row: Transaction) => format(new Date(row.date), 'dd/MM/yyyy')
    },
    {
      header: 'Type',
      width: '10%',
      render: (row: Transaction) => {
        if (row.type === 'expense' && row.status === 'unpaid') {
          return (
            <Tooltip content="Unpaid expense - not yet deducted from balance">
              <Badge variant="yellow" className="flex items-center gap-1 w-fit">
                <Clock className="h-3 w-3"/> Unpaid
              </Badge>
            </Tooltip>
          );
        }
        switch (row.type) {
          case 'expense':
            return <Badge variant="red" className="flex items-center gap-1 w-fit"><ArrowUpRight className="h-3 w-3"/> Expense</Badge>;
          case 'income':
            return <Badge variant="green" className="flex items-center gap-1 w-fit"><ArrowDownLeft className="h-3 w-3"/> Income</Badge>;
          case 'transfer':
            return <Badge variant="blue" className="flex items-center gap-1 w-fit"><ArrowRightLeft className="h-3 w-3"/> Transfer</Badge>;
          case 'repayment':
            return <Badge variant="green" className="flex items-center gap-1 w-fit"><HandCoins className="h-3 w-3"/> Repayment</Badge>;
          default:
            return row.type;
        }
      }
    },
    {
      header: 'Description',
      width: '20%',
      render: (row: Transaction) => {
        if (row.type === 'expense') return row.storeName;
        if (row.type === 'repayment') return `Repayment from ${row.debtorName}`;
        if (row.type === 'income') {
          return row.debtorName || 'Income'; // debtorName field is used for SourceName in incomeQuery
        }
        if (row.type === 'transfer') return 'Transfer';
        return '';
      }
    },
    {header: 'Note', accessor: 'note', width: '23%'},
  ];

  if (paymentMethodsEnabled) {
    columns.push({header: 'Method', accessor: 'methodName', width: '15%'});
  }

  columns.push({
    header: 'Amount',
    width: '10%',
    className: 'text-right',
    render: (row: Transaction) => {
      const isUnpaid = row.type === 'expense' && row.status === 'unpaid';
      return (
        <Tooltip content={isUnpaid ? "This expense is unpaid and hasn't affected your balance yet." : ""}>
          <div className="inline-block">
            <MoneyDisplay 
              amount={row.amount} 
              useSignum={true} 
              colorNegative={!isUnpaid && row.amount < 0} 
              colorPositive={row.amount > 0}
              colorNeutral={isUnpaid}
            />
          </div>
        </Tooltip>
      );
    }
  });

  // Indicators Column
  columns.push({
    header: '',
    width: '10%',
    className: 'text-right',
    render: (row: Transaction) => {
      const enabledCount = [
        indicatorSettings?.type,
        indicatorSettings?.debt && debtEnabled,
        indicatorSettings?.tentative,
        indicatorSettings?.attachments
      ].filter(Boolean).length;

      if (enabledCount === 0) return <span className="text-font-2">-</span>;

      if (row.type !== 'expense') {
        return (
          <div className="flex justify-end">
            <div 
              className="border border-border rounded-lg p-1 flex items-center justify-center gap-2 h-8"
              style={{ minWidth: `${enabledCount * 28}px` }}
            >
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
              <Clipboard className="h-4 w-4 text-font-2"/>
            </Tooltip>
          ) : (
            <Tooltip key="type" content="Detailed Expense">
              <ClipboardList className="h-4 w-4 text-font-2"/>
            </Tooltip>
          )
        );
      }

      if (indicatorSettings?.debt && debtEnabled) {
        if (row.status === 'unpaid') {
          visibleIndicators.push(
            <Tooltip key="debt" content="Unpaid expense">
              <AlertTriangle className="h-4 w-4 text-yellow"/>
            </Tooltip>
          );
        } else if ((row.unpaidDebtorCount || 0) > 0) {
          visibleIndicators.push(
            <Tooltip key="debt" content={`${row.unpaidDebtorCount} unpaid debtor(s)`}>
              <AlertCircle className="h-4 w-4 text-red"/>
            </Tooltip>
          );
        } else if ((row.totalDebtorCount || 0) > 0) {
          visibleIndicators.push(
            <Tooltip key="debt" content="All debts settled">
              <CheckCircle className="h-4 w-4 text-green"/>
            </Tooltip>
          );
        }
      }

      if (indicatorSettings?.tentative && row.isTentative) {
        visibleIndicators.push(
          <Tooltip key="tentative" content="Tentative Expense">
            <HelpCircle className="h-4 w-4 text-font-2"/>
          </Tooltip>
        );
      }

      if (indicatorSettings?.attachments && (row.attachmentCount || 0) > 0) {
        visibleIndicators.push(
          <Tooltip key="attachments" content={`${row.attachmentCount} attachment(s)`}>
            <Paperclip className="h-4 w-4 text-font-2"/>
          </Tooltip>
        );
      }

      return (
        <div className="flex justify-end">
          <div 
            className="border border-border rounded-lg p-1 flex items-center justify-center gap-2 h-8"
            style={{ minWidth: `${enabledCount * 28}px` }}
          >
            {visibleIndicators.length > 0 ? visibleIndicators : <span className="text-font-2">-</span>}
          </div>
        </div>
      );
    }
  });

  columns.push({
    header: '',
    width: '5%',
    className: 'text-right',
    render: (row: Transaction) => (
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
                      <Clipboard className="h-4 w-4 text-font-2"/>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Detailed Expense">
                      <ClipboardList className="h-4 w-4 text-font-2"/>
                    </Tooltip>
                  )}
                  {debtEnabled && (
                    row.status === 'unpaid' ? (
                      <Tooltip content="Unpaid expense">
                        <AlertTriangle className="h-4 w-4 text-yellow"/>
                      </Tooltip>
                    ) : (row.unpaidDebtorCount || 0) > 0 ? (
                      <Tooltip content={`${row.unpaidDebtorCount} unpaid debtor(s)`}>
                        <AlertCircle className="h-4 w-4 text-red"/>
                      </Tooltip>
                    ) : (row.totalDebtorCount || 0) > 0 ? (
                      <Tooltip content="All debts settled">
                        <CheckCircle className="h-4 w-4 text-green"/>
                      </Tooltip>
                    ) : (
                      <Tooltip content="No debts">
                        <AlertCircle className="h-4 w-4 text-text-disabled"/>
                      </Tooltip>
                    )
                  )}
                  {row.isTentative ? (
                    <Tooltip content="Tentative Expense">
                      <HelpCircle className="h-4 w-4 text-font-2"/>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Finished Expense">
                      <CheckCircle className="h-4 w-4 text-text-disabled"/>
                    </Tooltip>
                  )}
                  {(row.attachmentCount || 0) > 0 ? (
                    <Tooltip content={`${row.attachmentCount} attachment(s)`}>
                      <Paperclip className="h-4 w-4 text-font-2"/>
                    </Tooltip>
                  ) : (
                    <Tooltip content="No attachments">
                      <Paperclip className="h-4 w-4 text-text-disabled"/>
                    </Tooltip>
                  )}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel>Go To</DropdownMenuLabel>
            <DropdownMenuItem 
              disabled={!row.methodId}
              onClick={(e) => {
                e.stopPropagation();
                if (row.methodId) navigate(`/payment-methods/${row.methodId}`);
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Method
            </DropdownMenuItem>
            {(row.type === 'expense' || row.type === 'repayment') && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                const receiptId = row.type === 'expense' ? row.originalId : row.receiptId;
                if (receiptId) navigate(`/receipts/view/${receiptId}`);
              }}>
                <Eye className="mr-2 h-4 w-4" />
                Expense
              </DropdownMenuItem>
            )}
            {row.type === 'repayment' && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                if (row.debtorId) navigate(`/entities/${row.debtorId}`);
              }}>
                <User className="mr-2 h-4 w-4" />
                Entity
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {row.type === 'expense' && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                navigate(`/receipts/edit/${row.originalId}`);
              }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-red"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal(row);
              }}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  });

  const typeFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'expense', label: 'Expenses' },
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

  return (
    <div>
      <Header
        title="History"
        actions={
          <div className="flex items-center gap-2">
            {selectedTransactionIds.length > 0 && (
              <>
                <Tooltip content={`Delete ${selectedTransactionIds.length} item(s)`}>
                  <Button variant="secondary" size="icon" onClick={() => openDeleteModal()}>
                    <Trash className="h-5 w-5"/>
                  </Button>
                </Tooltip>
                {selectedTransactionIds.some(id => id.startsWith('expense-')) && (
                  <Tooltip content="Feature broken, WIP">
                    <Button variant="secondary" size="icon" onClick={handleMassPdfSave} disabled>
                      <FileDown className="h-5 w-5"/>
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
            <Tooltip content="New Expense">
              <Button variant="ghost" size="icon" onClick={() => navigate('/receipts/new')}>
                <Plus className="h-5 w-5"/>
              </Button>
            </Tooltip>
          </div>
        }
      />
      <PageWrapper>
        <div className="py-6">
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
              if (row.type === 'expense') navigate(`/receipts/view/${row.originalId}`);
            }}
            selectable={true}
            onSelectionChange={setSelectedTransactionIds}
            selectedIds={selectedTransactionIds}
            itemKey="id"
            actions={
              <ButtonGroup>
                <Tooltip content="Filters">
                  <Button variant="secondary" size="icon" onClick={() => setIsFilterModalOpen(true)}>
                    <Filter className="h-4 w-4"/>
                  </Button>
                </Tooltip>
                <Tooltip content="Reset Filters">
                  <Button variant="secondary" size="icon" onClick={resetFilters} disabled={!hasActiveFilters}>
                    <RotateCcw className="h-4 w-4"/>
                  </Button>
                </Tooltip>
              </ButtonGroup>
            }
          />

          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            onApply={applyFilters}
            onResetAll={resetPendingFilters}
            filterCount={activeFilterCount}
            hasActiveFilters={hasPendingFilters}
          >
            <div className="flex items-center gap-2 mb-4 p-3 bg-bg-2 rounded-lg border border-border">
              <Info className="h-4 w-4 text-accent flex-shrink-0" />
              <p className="text-xs text-font-2">
                Select a <strong>Transaction Type</strong> to reveal specific filters for that category.
              </p>
            </div>

            <FilterOption 
              title="Date Range" 
              onReset={() => setPendingDateRange([null, null])}
              isModified={pendingDateRange[0] !== null || pendingDateRange[1] !== null}
            >
              <DatePicker
                selectsRange
                startDate={pendingDateRange[0]}
                endDate={pendingDateRange[1]}
                onChange={(update: any) => setPendingDateRange(update)}
                isClearable={true}
                placeholderText="Filter by date range"
              />
            </FilterOption>

            {paymentMethodsEnabled && (
              <FilterOption 
                title="Method" 
                onReset={() => handlePendingFilterChange('method', 'all')}
                isModified={pendingFilters.method !== 'all'}
              >
                <Combobox 
                  options={[{value: 'all', label: 'All'}, ...methods.map(m => ({value: String(m.PaymentMethodID), label: m.PaymentMethodName}))]} 
                  value={pendingFilters.method} 
                  onChange={val => handlePendingFilterChange('method', val)} 
                />
              </FilterOption>
            )}

            <FilterOption 
              title="Transaction Type" 
              onReset={() => handlePendingFilterChange('type', 'all')}
              isModified={pendingFilters.type !== 'all'}
            >
              <Combobox 
                options={typeFilterOptions} 
                value={pendingFilters.type} 
                onChange={val => handlePendingFilterChange('type', val)} 
              />
            </FilterOption>

            {pendingFilters.type === 'expense' && (
              <>
                <Divider text="Expense Filters" className="my-4" />
                
                {debtEnabled && (
                  <FilterOption 
                    title="Debt Status" 
                    onReset={() => handlePendingFilterChange('debt', 'all')}
                    isModified={pendingFilters.debt !== 'all'}
                  >
                    <Combobox 
                      options={debtFilterOptions} 
                      value={pendingFilters.debt} 
                      onChange={val => handlePendingFilterChange('debt', val)} 
                    />
                  </FilterOption>
                )}

                <FilterOption 
                  title="Expense Format" 
                  onReset={() => handlePendingFilterChange('expenseType', 'all')}
                  isModified={pendingFilters.expenseType !== 'all'}
                >
                  <Combobox 
                    options={expenseTypeFilterOptions} 
                    value={pendingFilters.expenseType} 
                    onChange={val => handlePendingFilterChange('expenseType', val)} 
                  />
                </FilterOption>

                <FilterOption 
                  title="Status" 
                  onReset={() => handlePendingFilterChange('tentative', 'all')}
                  isModified={pendingFilters.tentative !== 'all'}
                >
                  <Combobox 
                    options={tentativeFilterOptions} 
                    value={pendingFilters.tentative} 
                    onChange={val => handlePendingFilterChange('tentative', val)} 
                  />
                </FilterOption>

                <FilterOption 
                  title="Attachments" 
                  onReset={() => handlePendingFilterChange('attachment', 'all')}
                  isModified={pendingFilters.attachment !== 'all'}
                >
                  <Combobox 
                    options={attachmentFilterOptions} 
                    value={pendingFilters.attachment} 
                    onChange={val => handlePendingFilterChange('attachment', val)} 
                  />
                </FilterOption>
              </>
            )}

            {pendingFilters.type === 'income' && (
              <>
                <Divider text="Income Filters" className="my-4" />
                <FilterOption 
                  title="Source" 
                  onReset={() => handlePendingFilterChange('incomeSource', 'all')}
                  isModified={pendingFilters.incomeSource !== 'all'}
                >
                  <Combobox 
                    options={[{value: 'all', label: 'All'}, ...incomeSources.map(s => ({value: String(s.IncomeSourceID), label: s.IncomeSourceName}))]} 
                    value={pendingFilters.incomeSource} 
                    onChange={val => handlePendingFilterChange('incomeSource', val)} 
                  />
                </FilterOption>
                <FilterOption 
                  title="Category" 
                  onReset={() => handlePendingFilterChange('incomeCategory', 'all')}
                  isModified={pendingFilters.incomeCategory !== 'all'}
                >
                  <Combobox 
                    options={[{value: 'all', label: 'All'}, ...incomeCategories.map(c => ({value: String(c.IncomeCategoryID), label: c.IncomeCategoryName}))]} 
                    value={pendingFilters.incomeCategory} 
                    onChange={val => handlePendingFilterChange('incomeCategory', val)} 
                  />
                </FilterOption>
              </>
            )}

            {pendingFilters.type === 'repayment' && (
              <>
                <Divider text="Repayment Filters" className="my-4" />
                <FilterOption 
                  title="Entity" 
                  onReset={() => handlePendingFilterChange('debtor', 'all')}
                  isModified={pendingFilters.debtor !== 'all'}
                >
                  <Combobox 
                    options={[{value: 'all', label: 'All'}, ...debtors.map(d => ({value: String(d.DebtorID), label: d.DebtorName}))]} 
                    value={pendingFilters.debtor} 
                    onChange={val => handlePendingFilterChange('debtor', val)} 
                  />
                </FilterOption>
              </>
            )}

            {pendingFilters.type === 'transfer' && (
              <>
                <Divider text="Transfer Filters" className="my-4" />
                <FilterOption 
                  title="From Method" 
                  onReset={() => handlePendingFilterChange('fromMethod', 'all')}
                  isModified={pendingFilters.fromMethod !== 'all'}
                >
                  <Combobox 
                    options={[{value: 'all', label: 'All'}, ...methods.map(m => ({value: String(m.PaymentMethodID), label: m.PaymentMethodName}))]} 
                    value={pendingFilters.fromMethod} 
                    onChange={val => handlePendingFilterChange('fromMethod', val)} 
                  />
                </FilterOption>
                <FilterOption 
                  title="To Method" 
                  onReset={() => handlePendingFilterChange('toMethod', 'all')}
                  isModified={pendingFilters.toMethod !== 'all'}
                >
                  <Combobox 
                    options={[{value: 'all', label: 'All'}, ...methods.map(m => ({value: String(m.PaymentMethodID), label: m.PaymentMethodName}))]} 
                    value={pendingFilters.toMethod} 
                    onChange={val => handlePendingFilterChange('toMethod', val)}
                  />
                </FilterOption>
              </>
            )}
          </FilterModal>

          <ConfirmModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setTransactionToDelete(null);
            }}
            onConfirm={handleDelete}
            title={`Delete ${transactionToDelete ? 'Transaction' : `${selectedTransactionIds.length} Transactions`}`}
            message={`Are you sure you want to permanently delete ${transactionToDelete ? 'this transaction' : `${selectedTransactionIds.length} selected transactions`}? This action cannot be undone.`}
          />

          <ProgressModal
            isOpen={isGeneratingPdf}
            progress={pdfProgress}
            title="Generating PDF Report..."
          />
        </div>
      </PageWrapper>
    </div>
  );
};

export default ReceiptsPage;
