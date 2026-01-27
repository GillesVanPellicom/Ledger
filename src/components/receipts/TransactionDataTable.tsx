import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Trash, 
  FileDown, 
  AlertCircle, 
  CheckCircle, 
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
  Edit, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  HandCoins, 
  Clock, 
  Info 
} from 'lucide-react';

import DataTable from '../ui/DataTable';
import Button from '../ui/Button';
import { db } from '../../utils/db';
import { ConfirmModal } from '../ui/Modal';
import DatePicker from '../ui/DatePicker';
import ProgressModal from '../ui/ProgressModal';
import Tooltip from '../ui/Tooltip';
import { useDeleteReceipt } from '../../hooks/useReceipts';
import { useTransactions } from '../../hooks/useTransactions';
import { useSettingsStore } from '../../store/useSettingsStore';
import { usePdfGenerator } from '../../hooks/usePdfGenerator';
import { calculateTotalWithDiscount } from '../../logic/expense';
import FilterModal, { FilterOption } from '../ui/FilterModal';
import ButtonGroup from '../ui/ButtonGroup';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/DropdownMenu";
import MoneyDisplay from '../ui/MoneyDisplay';
import DateDisplay from '../ui/DateDisplay';
import Badge from '../ui/Badge';
import Divider from '../ui/Divider';
import Combobox from '../ui/Combobox';
import { useReceiptsStore } from '../../store/useReceiptsStore';

import type { Receipt, LineItem, ReceiptImage, Transaction, Entity, PaymentMethod, Category } from '../../types';

interface FullReceipt extends Receipt {
  lineItems: LineItem[];
  totalAmount: number;
  images: ReceiptImage[];
}

interface TransactionDataTableProps {
  onRefetch?: () => void;
  fixedFilters?: {
    method?: string;
    recipient?: string;
    category?: string;
    debtor?: string;
    type?: string;
  };
  hideColumns?: string[];
  instanceId?: string; // Optional ID to persist state per instance
}

const initialFilters = {
  type: 'all',
  debt: 'all',
  repayment: 'all',
  expenseType: 'all',
  tentative: 'all',
  attachment: 'all',
  recipient: 'all',
  category: 'all',
  incomeEntity: 'all',
  debtor: 'all',
  fromMethod: 'all',
  toMethod: 'all',
  method: 'all',
};

const TransactionDataTable: React.FC<TransactionDataTableProps> = ({ onRefetch, fixedFilters = {}, hideColumns = [], instanceId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useSettingsStore();
  const deleteReceiptMutation = useDeleteReceipt();
  const { generatePdf, isGenerating: isGeneratingPdf, progress: pdfProgress } = usePdfGenerator();

  const store = useReceiptsStore();
  
  // Get state for this specific instance or the global state
  const instanceState = instanceId ? (store.instances[instanceId] || {
    currentPage: 1,
    pageSize: 10,
    searchTerm: '',
    appliedDateRange: [null, null],
    appliedFilters: initialFilters,
  }) : {
    currentPage: store.currentPage,
    pageSize: store.pageSize,
    searchTerm: store.searchTerm,
    appliedDateRange: store.appliedDateRange,
    appliedFilters: store.appliedFilters,
  };

  const { currentPage, pageSize, searchTerm, appliedDateRange, appliedFilters } = instanceState;

  const setCurrentPage = (page: number) => store.setCurrentPage(page, instanceId);
  const setPageSize = (size: number) => store.setPageSize(size, instanceId);
  const setSearchTerm = (term: string) => store.setSearchTerm(term, instanceId);
  const setDateRange = (range: [string | null, string | null]) => store.setDateRange(range, instanceId);
  const setFilters = (f: any) => store.setFilters(f, instanceId);
  const resetFilters = () => store.resetFilters(instanceId);

  const debtEnabled = settings.modules.debt?.enabled;
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const indicatorSettings = settings.receipts?.indicators;

  const [pendingDateRange, setPendingDateRange] = useState<[Date | null, Date | null]>([
    appliedDateRange[0] ? parseISO(appliedDateRange[0]) : null,
    appliedDateRange[1] ? parseISO(appliedDateRange[1]) : null,
  ]);
  const [pendingFilters, setPendingFilters] = useState(appliedFilters);

  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadReferenceData = async () => {
      const [entitiesData, methodsData, categoriesData] = await Promise.all([
        db.query<Entity>('SELECT EntityID, EntityName FROM Entities WHERE EntityIsActive = 1 ORDER BY EntityName'),
        db.query<PaymentMethod>('SELECT * FROM PaymentMethods WHERE PaymentMethodIsActive = 1 ORDER BY PaymentMethodName'),
        db.query<Category>('SELECT CategoryID, CategoryName FROM Categories WHERE CategoryIsActive = 1 ORDER BY CategoryName'),
      ]);
      setEntities(entitiesData);
      setMethods(methodsData);
      setCategories(categoriesData);
    };
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (isFilterModalOpen) {
      setPendingDateRange([
        appliedDateRange[0] ? parseISO(appliedDateRange[0]) : null,
        appliedDateRange[1] ? parseISO(appliedDateRange[1]) : null,
      ]);
      setPendingFilters(appliedFilters);
    }
  }, [isFilterModalOpen, appliedDateRange, appliedFilters]);

  const { data, isLoading, refetch } = useTransactions({
    page: currentPage,
    pageSize,
    searchTerm,
    startDate: appliedDateRange[0] ? parseISO(appliedDateRange[0]) : null,
    endDate: appliedDateRange[1] ? parseISO(appliedDateRange[1]) : null,
    typeFilter: fixedFilters.type || appliedFilters.type,
    debtFilter: appliedFilters.debt,
    repaymentFilter: appliedFilters.repayment,
    expenseTypeFilter: appliedFilters.expenseType,
    tentativeFilter: appliedFilters.tentative,
    attachmentFilter: appliedFilters.attachment,
    recipientFilter: fixedFilters.recipient || appliedFilters.recipient,
    categoryFilter: fixedFilters.category || appliedFilters.category,
    debtorFilter: fixedFilters.debtor || appliedFilters.debtor,
    fromMethodFilter: appliedFilters.fromMethod,
    toMethodFilter: appliedFilters.toMethod,
    methodFilter: fixedFilters.method || appliedFilters.method,
    debtEnabled
  });

  const handleDelete = async () => {
    const transactionsToDelete = transactionToDelete ? [transactionToDelete] : data?.transactions.filter(t => selectedTransactionIds.includes(t.id)) || [];
    if (transactionsToDelete.length === 0) return;
    try {
      for (const tx of transactionsToDelete) {
        if (tx.type === 'expense') {
          await deleteReceiptMutation.mutateAsync([tx.originalId]);
        } else if (tx.type === 'income' || tx.type === 'repayment') {
          await db.execute('DELETE FROM Income WHERE IncomeID = ?', [tx.originalId]);
        } else if (tx.type === 'transfer') {
          await db.execute('DELETE FROM Transfers WHERE TransferID = ?', [tx.originalId]);
        }
      }
      setSelectedTransactionIds([]);
      setDeleteModalOpen(false);
      setTransactionToDelete(null);
      refetch();
      if (onRefetch) onRefetch();
    } catch (error) {
      throw error;
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
      SELECT r.ExpenseID as ReceiptID, r.ExpenseDate as ReceiptDate, r.ExpenseNote as ReceiptNote, r.Discount, r.IsNonItemised, r.IsTentative, r.NonItemisedTotal, r.PaymentMethodID, r.Status, r.SplitType, r.OwnShares, r.TotalShares, r.OwedToEntityID as OwedToDebtorID, r.CreationTimestamp, r.UpdatedAt, r.RecipientID as StoreID,
             s.EntityName as StoreName, pm.PaymentMethodName
      FROM Expenses r
      JOIN Entities s ON r.RecipientID = s.EntityID
      LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
      WHERE r.ExpenseID IN (${placeholders})
      ORDER BY r.ExpenseDate DESC
    `, expenseIds);
    const lineItemsData: LineItem[] = await db.query(`
      SELECT li.ExpenseLineItemID as LineItemID, li.ExpenseID as ReceiptID, li.ProductID, li.LineQuantity, li.LineUnitPrice, li.EntityID as DebtorID, li.IsExcludedFromDiscount, li.CreationTimestamp, li.UpdatedAt,
             p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType
      FROM ExpenseLineItems li
      JOIN Products p ON li.ProductID = p.ProductID
      LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
      WHERE li.ExpenseID IN (${placeholders})
    `, expenseIds);
    const fullReceipts: FullReceipt[] = receiptsData.map(receipt => {
      const items = lineItemsData.filter(li => li.ReceiptID === receipt.ReceiptID);
      const total = receipt.IsNonItemised ? receipt.NonItemisedTotal : calculateTotalWithDiscount(items, receipt.Discount || 0);
      return { ...receipt, lineItems: items, totalAmount: total || 0, images: [] };
    });
    await generatePdf(fullReceipts, settings.pdf);
  };

  const columns = useMemo(() => {
    const cols: any[] = [
      { header: 'Date', width: '7%', render: (row: Transaction) => <DateDisplay date={row.date} /> },
      {
        header: 'Description', render: (row: Transaction) => {
          if (row.type === 'expense') return row.storeName;
          if (row.type === 'repayment') return `Repayment from ${row.debtorName}`;
          if (row.type === 'income') {
            return row.debtorName || 'Income';
          }
          if (row.type === 'transfer') return 'Transfer';
          return '';
        }
      },
      { header: 'Note', accessor: 'note' },
    ];

    if (paymentMethodsEnabled && !hideColumns.includes('method')) {
      cols.push({ header: 'Method', accessor: 'methodName', width: '6%' });
    }

    cols.push({
      header: 'Amount', width: '10%', className: 'text-right', render: (row: Transaction) => {
        const isUnpaid = row.type === 'expense' && row.status === 'unpaid';
        const isTransfer = row.type === 'transfer';
        return (
          <Tooltip content={isUnpaid ? "This expense is unpaid and hasn't affected your balance yet." : ""}>
            <div className="inline-block">
              <MoneyDisplay
                amount={row.amount}
                useSignum={!isTransfer}
                showSign={!isTransfer}
                colorNegative={!isUnpaid && row.amount < 0}
                colorPositive={row.amount > 0}
                colorNeutral={isUnpaid}
                colored={!isTransfer}
                className={isTransfer ? "text-font-1 font-normal" : ""}
              />
            </div>
          </Tooltip>
        );
      }
    });

    cols.push({
      header: 'Type', width: '7%', render: (row: Transaction) => {
        if (row.type === 'expense' && row.status === 'unpaid') {
          return (
            <Tooltip content={row.owedToEntityId ? `Owed to ${row.debtorName || 'entity'}` : "Unpaid expense - not yet deducted from balance"}>
              <Badge variant="yellow" className="flex items-center gap-1 w-fit">
                <Clock className="h-3 w-3" /> {row.owedToEntityId ? 'Owed' : 'Unpaid'}
              </Badge>
            </Tooltip>
          );
        }
        switch (row.type) {
          case 'expense':
            if (row.owedToEntityId) {
              return (
                <Tooltip content={`Repaid to ${row.debtorName || 'entity'}`}>
                  <Badge variant="red" className="flex items-center gap-1 w-fit"><ArrowUpRight className="h-3 w-3" /> Repaid</Badge>
                </Tooltip>
              );
            }
            return (
              <Tooltip content="Expense - money spent">
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
    cols.push({
      header: '', width: '5%', className: 'text-right', render: (row: Transaction) => {
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

    cols.push({
      header: '', width: '1%', className: 'text-right', render: (row: Transaction) => (
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

    return cols;
  }, [paymentMethodsEnabled, hideColumns, indicatorSettings, debtEnabled, navigate]);

  const typeFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'paid_expense', label: 'Expenses' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfers' },
    { value: 'repayment', label: 'Repayments' },
  ];

  const debtFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'none', label: 'No Debt' },
    { value: 'unpaid', label: 'Unpaid Debt' },
    { value: 'paid', label: 'Paid Debt' },
  ];

  const repaymentFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'none', label: 'No Debt' },
    { value: 'unpaid', label: 'Unpaid Debt' },
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

  const applyFilters = () => {
    setFilters(pendingFilters);
    setDateRange([
      pendingDateRange[0] ? pendingDateRange[0].toISOString() : null,
      pendingDateRange[1] ? pendingDateRange[1].toISOString() : null,
    ]);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    resetFilters();
    setPendingFilters(initialFilters);
    setPendingDateRange([null, null]);
  };

  const resetPendingFilters = () => {
    setPendingFilters(initialFilters);
    setPendingDateRange([null, null]);
  };

  const hasActiveFilters = appliedFilters.type !== 'all' || appliedFilters.debt !== 'all' || appliedFilters.repayment !== 'all' || appliedFilters.expenseType !== 'all' || appliedFilters.tentative !== 'all' || appliedFilters.attachment !== 'all' || appliedFilters.recipient !== 'all' || appliedFilters.category !== 'all' || appliedFilters.incomeEntity !== 'all' || appliedFilters.debtor !== 'all' || appliedFilters.fromMethod !== 'all' || appliedFilters.toMethod !== 'all' || appliedFilters.method !== 'all' || appliedDateRange[0] !== null || appliedDateRange[1] !== null || searchTerm !== '';

  const hasPendingFilters = pendingFilters.type !== 'all' || pendingFilters.debt !== 'all' || pendingFilters.repayment !== 'all' || pendingFilters.expenseType !== 'all' || pendingFilters.tentative !== 'all' || pendingFilters.attachment !== 'all' || pendingFilters.recipient !== 'all' || pendingFilters.category !== 'all' || pendingFilters.incomeEntity !== 'all' || pendingFilters.debtor !== 'all' || pendingFilters.fromMethod !== 'all' || pendingFilters.toMethod !== 'all' || pendingFilters.method !== 'all' || appliedDateRange[0] !== null || appliedDateRange[1] !== null;

  const activeFilterCount = [
    pendingFilters.type !== 'all',
    pendingFilters.debt !== 'all',
    pendingFilters.repayment !== 'all',
    pendingFilters.expenseType !== 'all',
    pendingFilters.tentative !== 'all',
    pendingFilters.attachment !== 'all',
    pendingFilters.recipient !== 'all',
    pendingFilters.category !== 'all',
    pendingFilters.incomeEntity !== 'all',
    pendingFilters.debtor !== 'all',
    pendingFilters.fromMethod !== 'all',
    pendingFilters.toMethod !== 'all',
    pendingFilters.method !== 'all',
    pendingDateRange[0] !== null || pendingDateRange[1] !== null
  ].filter(Boolean).length;

  const handlePendingFilterChange = (key, value) => {
    setPendingFilters(prev => {
      const newState = { ...prev, [key]: value };
      if (key === 'debt' && value !== 'all') {
        newState.repayment = 'all';
      } else if (key === 'repayment' && value !== 'all') {
        newState.debt = 'all';
      }
      return newState;
    });
  };

  return (
    <>
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
        showMonthSeparators={true}
        dateAccessor="date"
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
            <ButtonGroup>
              <Tooltip content="Filters">
                <Button variant={hasActiveFilters ? "primary" : "secondary"} size="icon" onClick={() => setIsFilterModalOpen(true)}>
                  <Filter className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Reset Filters">
                <Button variant="secondary" size="icon" onClick={handleResetFilters} disabled={!hasActiveFilters}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </Tooltip>
            </ButtonGroup>
          </div>
        }
      />

      <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} onApply={applyFilters} onResetAll={resetPendingFilters} filterCount={activeFilterCount} hasActiveFilters={hasPendingFilters}>
        <div className="flex items-center gap-2 mb-4 p-3 bg-bg-2 rounded-lg border border-border">
          <Info className="h-4 w-4 text-accent flex-shrink-0" />
          <p className="text-xs text-font-2"> Select a <strong>Transaction Type</strong> to reveal specific filters for that category. </p>
        </div>
        <FilterOption title="Date Range" onReset={() => setPendingDateRange([null, null])} isModified={pendingDateRange[0] !== null || pendingDateRange[1] !== null}>
          <DatePicker selectsRange startDate={pendingDateRange[0]} endDate={pendingDateRange[1]} onChange={(update: any) => setPendingDateRange(update)} isClearable={true} placeholderText="Filter by date range" />
        </FilterOption>
        <FilterOption title="Status" onReset={() => handlePendingFilterChange('tentative', 'all')} isModified={pendingFilters.tentative !== 'all'}>
          <Combobox options={tentativeFilterOptions} value={pendingFilters.tentative} onChange={val => handlePendingFilterChange('tentative', val)} />
        </FilterOption>
        {!fixedFilters.type && (
          <FilterOption title="Transaction Type" onReset={() => handlePendingFilterChange('type', 'all')} isModified={pendingFilters.type !== 'all'}>
            <Combobox options={typeFilterOptions} value={pendingFilters.type} onChange={val => handlePendingFilterChange('type', val)} />
          </FilterOption>
        )}

        {(pendingFilters.type === 'paid_expense' || fixedFilters.type === 'paid_expense') && (
          <>
            <Divider text="Expense Filters" className="my-4" />
            {paymentMethodsEnabled && !fixedFilters.method && (
              <FilterOption title="Method" onReset={() => handlePendingFilterChange('method', 'all')} isModified={pendingFilters.method !== 'all'}>
                <Combobox options={[{ value: 'all', label: 'All' }, ...methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))]} value={pendingFilters.method} onChange={val => handlePendingFilterChange('method', val)} />
              </FilterOption>
            )}
            {debtEnabled && (
              <FilterOption title="Owed to You" onReset={() => handlePendingFilterChange('debt', 'all')} isModified={pendingFilters.debt !== 'all'}>
                <Combobox options={debtFilterOptions} value={pendingFilters.debt} onChange={val => handlePendingFilterChange('debt', val)} disabled={pendingFilters.repayment !== 'all'} />
              </FilterOption>
            )}
            {debtEnabled && (
              <FilterOption title="Owed by You" onReset={() => handlePendingFilterChange('repayment', 'all')} isModified={pendingFilters.repayment !== 'all'}>
                <Combobox options={repaymentFilterOptions} value={pendingFilters.repayment} onChange={val => handlePendingFilterChange('repayment', val)} disabled={pendingFilters.debt !== 'all'} />
              </FilterOption>
            )}
            <FilterOption title="Expense Format" onReset={() => handlePendingFilterChange('expenseType', 'all')} isModified={pendingFilters.expenseType !== 'all'}>
              <Combobox options={expenseTypeFilterOptions} value={pendingFilters.expenseType} onChange={val => handlePendingFilterChange('expenseType', val)} />
            </FilterOption>
            <FilterOption title="Attachments" onReset={() => handlePendingFilterChange('attachment', 'all')} isModified={pendingFilters.attachment !== 'all'}>
              <Combobox options={attachmentFilterOptions} value={pendingFilters.attachment} onChange={val => handlePendingFilterChange('attachment', val)} />
            </FilterOption>
            {!fixedFilters.recipient && (
              <FilterOption title="Recipient" onReset={() => handlePendingFilterChange('recipient', 'all')} isModified={pendingFilters.recipient !== 'all'}>
                <Combobox options={[{ value: 'all', label: 'All' }, ...entities.map(e => ({ value: String(e.EntityID), label: e.EntityName }))]} value={pendingFilters.recipient} onChange={val => handlePendingFilterChange('recipient', val)} />
              </FilterOption>
            )}
          </>
        )}

        {(pendingFilters.type === 'income' || fixedFilters.type === 'income') && (
          <>
            <Divider text="Income Filters" className="my-4" />
            {paymentMethodsEnabled && !fixedFilters.method && (
              <FilterOption title="Method" onReset={() => handlePendingFilterChange('method', 'all')} isModified={pendingFilters.method !== 'all'}>
                <Combobox options={[{ value: 'all', label: 'All' }, ...methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))]} value={pendingFilters.method} onChange={val => handlePendingFilterChange('method', val)} />
              </FilterOption>
            )}
            {!fixedFilters.recipient && (
              <FilterOption title="Source" onReset={() => handlePendingFilterChange('recipient', 'all')} isModified={pendingFilters.recipient !== 'all'}>
                <Combobox options={[{ value: 'all', label: 'All' }, ...entities.map(e => ({ value: String(e.EntityID), label: e.EntityName }))]} value={pendingFilters.recipient} onChange={val => handlePendingFilterChange('recipient', val)} />
              </FilterOption>
            )}
            {!fixedFilters.category && (
              <FilterOption title="Category" onReset={() => handlePendingFilterChange('category', 'all')} isModified={pendingFilters.category !== 'all'}>
                <Combobox options={[{ value: 'all', label: 'All' }, ...categories.map(c => ({ value: String(c.CategoryID), label: c.CategoryName }))]} value={pendingFilters.category} onChange={val => handlePendingFilterChange('category', val)} />
              </FilterOption>
            )}
          </>
        )}

        {(pendingFilters.type === 'repayment' || fixedFilters.type === 'repayment') && (
          <>
            <Divider text="Repayment Filters" className="my-4" />
            {paymentMethodsEnabled && !fixedFilters.method && (
              <FilterOption title="Method" onReset={() => handlePendingFilterChange('method', 'all')} isModified={pendingFilters.method !== 'all'}>
                <Combobox options={[{ value: 'all', label: 'All' }, ...methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))]} value={pendingFilters.method} onChange={val => handlePendingFilterChange('method', val)} />
              </FilterOption>
            )}
            {!fixedFilters.debtor && (
              <FilterOption title="Entity" onReset={() => handlePendingFilterChange('debtor', 'all')} isModified={pendingFilters.debtor !== 'all'}>
                <Combobox options={[{ value: 'all', label: 'All' }, ...entities.map(e => ({ value: String(e.EntityID), label: e.EntityName }))]} value={pendingFilters.debtor} onChange={val => handlePendingFilterChange('debtor', val)} />
              </FilterOption>
            )}
          </>
        )}

        {(pendingFilters.type === 'transfer' || fixedFilters.type === 'transfer') && (
          <>
            <Divider text="Transfer Filters" className="my-4" />
            {!fixedFilters.method && (
              <>
                <FilterOption title="From Method" onReset={() => handlePendingFilterChange('fromMethod', 'all')} isModified={pendingFilters.fromMethod !== 'all'}>
                  <Combobox options={[{ value: 'all', label: 'All' }, ...methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))]} value={pendingFilters.fromMethod} onChange={val => handlePendingFilterChange('fromMethod', val)} />
                </FilterOption>
                <FilterOption title="To Method" onReset={() => handlePendingFilterChange('toMethod', 'all')} isModified={pendingFilters.toMethod !== 'all'}>
                  <Combobox options={[{ value: 'all', label: 'All' }, ...methods.map(m => ({ value: String(m.PaymentMethodID), label: m.PaymentMethodName }))]} value={pendingFilters.toMethod} onChange={val => handlePendingFilterChange('toMethod', val)} />
                </FilterOption>
              </>
            )}
          </>
        )}
      </FilterModal>

      <ConfirmModal 
        isOpen={deleteModalOpen} 
        onClose={() => { setDeleteModalOpen(false); setTransactionToDelete(null); }} 
        onConfirm={handleDelete} 
        title={`Delete ${transactionToDelete ? 'Transaction' : `${selectedTransactionIds.length} Transactions`}`} 
        message={`Are you sure you want to permanently delete ${transactionToDelete ? 'this transaction' : `${selectedTransactionIds.length} selected transactions`}? This action cannot be undone.`} 
        isDatabaseTransaction 
        successToastMessage="Transaction deleted successfully" 
        errorToastMessage="Failed to delete transaction" 
        loadingMessage="Deleting transaction..." 
      />
      
      <ProgressModal isOpen={isGeneratingPdf} progress={pdfProgress} title="Generating PDF Report..." />
    </>
  );
};

export default TransactionDataTable;
