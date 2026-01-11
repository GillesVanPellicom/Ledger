import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {format} from 'date-fns';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import {
  PlusIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  ClipboardIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/solid';
import {db} from '../utils/db';
import {ConfirmModal} from '../components/ui/Modal';
import DatePicker from '../components/ui/DatePicker';
import {generateReceiptsPdf} from '../utils/pdfGenerator';
import ProgressModal from '../components/ui/ProgressModal';
import {useError} from '../context/ErrorContext';
import Tooltip from '../components/ui/Tooltip';
import {useSettings} from '../context/SettingsContext';
import BulkDebtModal from '../components/debt/BulkDebtModal';
import {Receipt, LineItem} from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { useReceipts, useDeleteReceipt } from '../hooks/useReceipts';

interface FullReceipt extends Receipt {
  lineItems: LineItem[];
  totalAmount: number;
}

const ReceiptsPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const [selectedReceiptIds, setSelectedReceiptIds] = useState<number[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [receiptToDelete, setReceiptToDelete] = useState<number | null>(null);

  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isBulkDebtModalOpen, setIsBulkDebtModalOpen] = useState<boolean>(false);

  const {showError} = useError();
  const {settings} = useSettings();
  const debtEnabled = settings.modules.debt?.enabled;
  const paymentMethodsEnabled = settings.modules.paymentMethods?.enabled;
  const navigate = useNavigate();

  const { data, isLoading, refetch } = useReceipts({
    page: currentPage,
    pageSize,
    searchTerm,
    startDate: dateRange[0],
    endDate: dateRange[1],
    debtEnabled
  });

  const deleteReceiptMutation = useDeleteReceipt();

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
            <Tooltip content="Item-less Receipt">
              <ClipboardIcon className="h-5 w-5 text-gray-400"/>
            </Tooltip>
          ) : (
            <Tooltip content="Itemised Receipt">
              <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400"/>
            </Tooltip>
          )}

          {row.Status === 'unpaid' ? (
            <Tooltip content="This is an unpaid receipt, meaning it is owed to the person who paid it by you.">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500"/>
            </Tooltip>
          ) : debtEnabled && (row.UnpaidDebtorCount || 0) > 0 ? (
            <Tooltip content={`${row.UnpaidDebtorCount} unpaid debtor(s)`}>
              <ExclamationCircleIcon className="h-5 w-5 text-red"/>
            </Tooltip>
          ) : debtEnabled && (row.TotalDebtorCount || 0) > 0 ? (
            <Tooltip content="All debts settled">
              <CheckCircleIcon className="h-5 w-5 text-green"/>
            </Tooltip>
          ) : <div className="w-5"/>}

          {row.IsTentative ? (
            <Tooltip content="Tentative Receipt">
              <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400"/>
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
          <Tooltip content="Delete Receipt">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                openDeleteModal(row.ReceiptID);
              }}
            >
              <TrashIcon className="h-4 w-4"/>
            </Button>
          </Tooltip>
      </div>
    )
  });

  return (
    <div>
      <Header
        title="Receipts"
        actions={
          <Tooltip content="New Receipt">
            <Button variant="ghost" size="icon" onClick={() => navigate('/receipts/new')}>
              <PlusIcon className="h-5 w-5"/>
            </Button>
          </Tooltip>
        }
      />
      <PageWrapper>
        <div className="py-6">
          {selectedReceiptIds.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Button variant="danger" size="sm" onClick={() => openDeleteModal()}>
                <TrashIcon className="h-4 w-4 mr-2"/>
                Delete ({selectedReceiptIds.length})
              </Button>
              <Tooltip content="Feature broken, WIP">
                <Button variant="secondary" size="sm" onClick={handleMassPdfSave} disabled>
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2"/>
                  Save as PDF
                </Button>
              </Tooltip>
              {debtEnabled && (
                <Button variant="secondary" size="sm" onClick={() => setIsBulkDebtModalOpen(true)}>
                  <UserGroupIcon className="h-4 w-4 mr-2"/>
                  Bulk Debt
                </Button>
              )}
            </div>
          )}
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
              <div className="w-1/2">
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
          />

          <ConfirmModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setReceiptToDelete(null);
            }}
            onConfirm={handleDelete}
            title={`Delete ${receiptToDelete ? 'Receipt' : `${selectedReceiptIds.length} Receipts`}`}
            message={`Are you sure you want to permanently delete ${receiptToDelete ? 'this receipt' : `${selectedReceiptIds.length} selected receipts`}? This action cannot be undone.`}
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
