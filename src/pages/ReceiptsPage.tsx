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
  RotateCcw
} from 'lucide-react';
import {db} from '../utils/db';
import {ConfirmModal} from '../components/ui/Modal';
import DatePicker from '../components/ui/DatePicker';
import {generateReceiptsPdf} from '../utils/pdfGenerator';
import ProgressModal from '../components/ui/ProgressModal';
import Tooltip from '../components/ui/Tooltip';
import BulkDebtModal from '../components/debt/BulkDebtModal';
import {Receipt, LineItem, Debtor} from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { useReceipts, useDeleteReceipt } from '../hooks/useReceipts';
import { useSettingsStore } from '../store/useSettingsStore';
import { useErrorStore } from '../store/useErrorStore';
import Select from '../components/ui/Select';
import { cn } from '../utils/cn';

interface FullReceipt extends Receipt {
  lineItems: LineItem[];
  totalAmount: number;
}

const ReceiptsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get('pageSize')) || 10);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    searchParams.get('startDate') ? parseISO(searchParams.get('startDate')!) : null,
    searchParams.get('endDate') ? parseISO(searchParams.get('endDate')!) : null,
  ]);
  const [debtFilter, setDebtFilter] = useState<string>(searchParams.get('debt') || 'all');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') || 'all');
  const [tentativeFilter, setTentativeFilter] = useState<string>(searchParams.get('tentative') || 'all');
  const [attachmentFilter, setAttachmentFilter] = useState<string>(searchParams.get('attachment') || 'all');

  const [selectedReceiptIds, setSelectedReceiptIds] = useState<number[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [receiptToDelete, setReceiptToDelete] = useState<number | null>(null);

  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isBulkDebtModalOpen, setIsBulkDebtModalOpen] = useState<boolean>(false);

  const {showError} = useErrorStore();
  const { settings } = useSettingsStore();
  const debtEnabled = settings.modules.debt?.enabled;
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;

  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage !== 1) params.set('page', String(currentPage));
    if (pageSize !== 10) params.set('pageSize', String(pageSize));
    if (searchTerm) params.set('search', searchTerm);
    if (dateRange[0]) params.set('startDate', dateRange[0].toISOString());
    if (dateRange[1]) params.set('endDate', dateRange[1].toISOString());
    if (debtFilter !== 'all') params.set('debt', debtFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (tentativeFilter !== 'all') params.set('tentative', tentativeFilter);
    if (attachmentFilter !== 'all') params.set('attachment', attachmentFilter);
    setSearchParams(params, { replace: true });
  }, [currentPage, pageSize, searchTerm, dateRange, debtFilter, typeFilter, tentativeFilter, attachmentFilter, setSearchParams]);

  const { data, isLoading, refetch } = useReceipts({
    page: currentPage,
    pageSize,
    searchTerm,
    startDate: dateRange[0],
    endDate: dateRange[1],
    debtFilter,
    typeFilter,
    tentativeFilter,
    attachmentFilter,
    debtEnabled
  });

  const deleteReceiptMutation = useDeleteReceipt();

  const resetFilters = () => {
    setDebtFilter('all');
    setTypeFilter('all');
    setTentativeFilter('all');
    setAttachmentFilter('all');
    setDateRange([null, null]);
    setSearchTerm('');
  };

  const handleDelete = async () => {
    const idsToDelete = receiptToDelete ? [receiptToDelete] : selectedReceiptIds;
    if (idsToDelete.length === 0) return;

    try {
      await deleteReceiptMutation.mutateAsync(idsToDelete);
      setSelectedReceiptIds([]);
      setDeleteModalOpen(false);
      setReceiptToDelete(null);
    } catch (error) {
      showError(error as Error);
    }
  };

  const openDeleteModal = (id: number | null = null) => {
    setReceiptToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleMassPdfSave = async () => {
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    try {
      const placeholders = selectedReceiptIds.map(() => '?').join(',');
      const receiptsData: (Receipt & { lineItems: LineItem[], totalAmount: number })[] = await db.query(`
          SELECT r.*, s.StoreName, pm.PaymentMethodName
          FROM Receipts r
                   JOIN Stores s ON r.StoreID = s.StoreID
                   LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
          WHERE r.ReceiptID IN (${placeholders})
          ORDER BY r.ReceiptDate DESC
      `, selectedReceiptIds);

      const lineItemsData: LineItem[] = await db.query(`
          SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType
          FROM LineItems li
                   JOIN Products p ON li.ProductID = p.ProductID
                   LEFT JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
          WHERE li.ReceiptID IN (${placeholders})
      `, selectedReceiptIds);

      const fullReceipts: FullReceipt[] = receiptsData.map(receipt => {
        const items = lineItemsData.filter(li => li.ReceiptID === receipt.ReceiptID);
        const subtotal = items.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
        const discountAmount = (subtotal * (receipt.Discount || 0)) / 100;
        const total = receipt.IsNonItemised ? receipt.NonItemisedTotal : Math.max(0, subtotal - discountAmount);
        return {...receipt, lineItems: items, totalAmount: total || 0, images: []};
      });

      await generateReceiptsPdf(fullReceipts, settings.pdf, (progress: number) => setPdfProgress(progress));
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const columns: any[] = [
    {
      header: 'Indicators',
      width: '10%',
      render: (row: Receipt) => (
        <div className="flex items-center justify-center gap-3">
          {row.IsNonItemised ? (
            <Tooltip content="Total-only expense">
              <Clipboard className="h-5 w-5 text-gray-400"/>
            </Tooltip>
          ) : (
            <Tooltip content="Detailed Expense">
              <ClipboardList className="h-5 w-5 text-gray-400"/>
            </Tooltip>
          )}

          {row.Status === 'unpaid' ? (
            <Tooltip content="This is an unpaid expense, meaning it is owed to the person who paid it by you.">
              <AlertTriangle className="h-5 w-5 text-yellow-500"/>
            </Tooltip>
          ) : debtEnabled && (row.UnpaidDebtorCount || 0) > 0 ? (
            <Tooltip content={`${row.UnpaidDebtorCount} unpaid debtor(s)`}>
              <AlertCircle className="h-5 w-5 text-red"/>
            </Tooltip>
          ) : debtEnabled && (row.TotalDebtorCount || 0) > 0 ? (
            <Tooltip content="All debts settled">
              <CheckCircle className="h-5 w-5 text-green"/>
            </Tooltip>
          ) : <div className="w-5"/>}

          {row.IsTentative ? (
            <Tooltip content="Tentative Expense">
              <HelpCircle className="h-5 w-5 text-gray-400"/>
            </Tooltip>
          ) : <div className="w-5"/>}
        </div>
      )
    },
    {header: 'Date', width: '20%', render: (row: Receipt) => format(new Date(row.ReceiptDate), 'dd/MM/yyyy')},
    {header: 'Store', accessor: 'StoreName', width: '30%'},
    {header: 'Note', accessor: 'ReceiptNote', width: '25%'},
  ];

  if (paymentMethodsEnabled) {
    columns.push({header: 'Payment Method', accessor: 'PaymentMethodName', width: '15%'});
  }

  columns.push({
    header: 'Total',
    width: '15%',
    className: 'text-right',
    render: (row: Receipt) => `€${(row.Total || 0).toFixed(2)}`
  });

  columns.push({
    header: '',
    width: '5%',
    className: 'text-right',
    render: (row: Receipt) => (
      <div className="flex justify-end items-center">
          <Tooltip content="Delete Expense">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                openDeleteModal(row.ReceiptID);
              }}
            >
              <Trash className="h-4 w-4"/>
            </Button>
          </Tooltip>
      </div>
    )
  });

  const debtFilterOptions = [
    { value: 'all', label: 'Debt: All' },
    { value: 'none', label: 'No Debt' },
    { value: 'unpaid', label: 'Unpaid Debt' },
    { value: 'own_debt', label: 'Own Debt' },
    { value: 'paid', label: 'Paid Debt' },
  ];

  const typeFilterOptions = [
    { value: 'all', label: 'Type: All' },
    { value: 'detailed', label: 'Detailed' },
    { value: 'total-only', label: 'Total-only' },
  ];

  const tentativeFilterOptions = [
    { value: 'all', label: 'Status: All' },
    { value: 'finished', label: 'Finished' },
    { value: 'tentative', label: 'Tentative' },
  ];

  const attachmentFilterOptions = [
    { value: 'all', label: 'Attachments: All' },
    { value: 'none', label: 'No Attachments' },
    { value: 'yes', label: 'Has Attachments' },
  ];

  return (
    <div>
      <Header
        title="Expenses"
        actions={
          <Tooltip content="New Expense">
            <Button variant="ghost" size="icon" onClick={() => navigate('/receipts/new')}>
              <Plus className="h-5 w-5"/>
            </Button>
          </Tooltip>
        }
      />
      <PageWrapper>
        <div className="py-6">
          <div className={cn("flex items-center gap-2 h-10 mb-4", selectedReceiptIds.length === 0 && "invisible")}>
            <Button variant="danger" size="sm" onClick={() => openDeleteModal()}>
              <Trash className="h-4 w-4 mr-2"/>
              Delete ({selectedReceiptIds.length})
            </Button>
            <Tooltip content="Feature broken, WIP">
              <Button variant="secondary" size="sm" onClick={handleMassPdfSave} disabled>
                <FileDown className="h-4 w-4 mr-2"/>
                Save as PDF
              </Button>
            </Tooltip>
            {debtEnabled && (
              <Button variant="secondary" size="sm" onClick={() => setIsBulkDebtModalOpen(true)}>
                <Users className="h-4 w-4 mr-2"/>
                Bulk Debt
              </Button>
            )}
          </div>
          <DataTable
            data={data?.receipts || []}
            columns={columns}
            totalCount={data?.totalCount || 0}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onSearch={setSearchTerm}
            searchable={true}
            loading={isLoading}
            onRowClick={(row: Receipt) => navigate(`/receipts/view/${row.ReceiptID}`)}
            selectable={true}
            onSelectionChange={setSelectedReceiptIds}
            selectedIds={selectedReceiptIds}
            itemKey="ReceiptID"
            middleRowLeft={
              <div className="w-1/3">
                <DatePicker
                  selectsRange
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  onChange={(update: any) => {
                    setDateRange(update);
                    setCurrentPage(1);
                  }}
                  isClearable={true}
                  placeholderText="Filter by date range"
                />
              </div>
            }
            middleRowRight={
              <div className="flex items-center gap-2">
                <Tooltip content="Filter by debt status">
                  <div className="w-40">
                    {debtEnabled && <Select options={debtFilterOptions} value={debtFilter} onChange={e => setDebtFilter(e.target.value)} />}
                  </div>
                </Tooltip>
                <Tooltip content="Filter by expense type">
                  <div className="w-40">
                    <Select options={typeFilterOptions} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} />
                  </div>
                </Tooltip>
                <Tooltip content="Filter by tentative status">
                  <div className="w-40">
                    <Select options={tentativeFilterOptions} value={tentativeFilter} onChange={e => setTentativeFilter(e.target.value)} />
                  </div>
                </Tooltip>
                <Tooltip content="Filter by attachments">
                  <div className="w-40">
                    <Select options={attachmentFilterOptions} value={attachmentFilter} onChange={e => setAttachmentFilter(e.target.value)} />
                  </div>
                </Tooltip>
                <Tooltip content="Reset Filters">
                  <Button variant="ghost" size="icon" onClick={resetFilters}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </div>
            }
          />

          <ConfirmModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setReceiptToDelete(null);
            }}
            onConfirm={handleDelete}
            title={`Delete ${receiptToDelete ? 'Expense' : `${selectedReceiptIds.length} Expenses`}`}
            message={`Are you sure you want to permanently delete ${receiptToDelete ? 'this expense' : `${selectedReceiptIds.length} selected expenses`}? This action cannot be undone.`}
          />

          <ProgressModal
            isOpen={isGeneratingPdf}
            progress={pdfProgress}
            title="Generating PDF Report..."
          />

          {debtEnabled && (
            <BulkDebtModal
              isOpen={isBulkDebtModalOpen}
              onClose={() => setIsBulkDebtModalOpen(false)}
              receiptIds={selectedReceiptIds}
              onComplete={() => {
                refetch();
                setSelectedReceiptIds([]);
              }}
            />
          )}
        </div>
      </PageWrapper>
    </div>
  );
};

export default ReceiptsPage;
