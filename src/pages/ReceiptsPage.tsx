import React, {useState, useEffect, useCallback} from 'react';
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

const ReceiptsPage: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

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

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;

      let debtSubQueries = '';
      if (debtEnabled) {
        debtSubQueries = `,
          r.Status,
          (
            SELECT COUNT(DISTINCT d.DebtorID)
            FROM Debtors d
            WHERE (
              (r.SplitType = 'line_item' AND d.DebtorID IN (SELECT li.DebtorID FROM LineItems li WHERE li.ReceiptID = r.ReceiptID)) OR
              (r.SplitType = 'total_split' AND d.DebtorID IN (SELECT rs.DebtorID FROM ReceiptSplits rs WHERE rs.ReceiptID = r.ReceiptID))
            )
          ) as TotalDebtorCount,
          (
            SELECT COUNT(DISTINCT d.DebtorID)
            FROM Debtors d
            LEFT JOIN ReceiptDebtorPayments rdp ON d.DebtorID = rdp.DebtorID AND rdp.ReceiptID = r.ReceiptID
            WHERE rdp.PaymentID IS NULL AND (
              (r.SplitType = 'line_item' AND d.DebtorID IN (SELECT li.DebtorID FROM LineItems li WHERE li.ReceiptID = r.ReceiptID)) OR
              (r.SplitType = 'total_split' AND d.DebtorID IN (SELECT rs.DebtorID FROM ReceiptSplits rs WHERE rs.ReceiptID = r.ReceiptID))
            )
          ) as UnpaidDebtorCount
        `;
      }

      let query = `
          SELECT r.ReceiptID,
                 r.ReceiptDate,
                 r.ReceiptNote,
                 r.Discount,
                 r.IsNonItemised,
                 r.IsTentative,
                 r.NonItemisedTotal,
                 s.StoreName,
                 pm.PaymentMethodName,
                 CASE
                     WHEN r.IsNonItemised = 1 THEN r.NonItemisedTotal
                     ELSE (
                         (SELECT SUM(li.LineQuantity * li.LineUnitPrice)
                          FROM LineItems li
                          WHERE li.ReceiptID = r.ReceiptID) -
                         IFNULL((SELECT SUM(li_discountable.LineQuantity * li_discountable.LineUnitPrice)
                                 FROM LineItems li_discountable
                                 WHERE li_discountable.ReceiptID = r.ReceiptID
                                   AND (li_discountable.IsExcludedFromDiscount = 0 OR
                                        li_discountable.IsExcludedFromDiscount IS NULL)), 0) * r.Discount / 100
                         )
                     END as Total
              ${debtSubQueries}
          FROM Receipts r
                   JOIN Stores s ON r.StoreID = s.StoreID
                   LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
      `;
      const params: any[] = [];
      const whereClauses: string[] = [];

      if (searchTerm) {
        const keywords = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k);
        keywords.forEach(keyword => {
          whereClauses.push(`(
            LOWER(s.StoreName) LIKE ? OR 
            LOWER(r.ReceiptNote) LIKE ?
          )`);
          params.push(`%${keyword}%`, `%${keyword}%`);
        });
      }

      const [startDate, endDate] = dateRange;
      if (startDate) {
        whereClauses.push(`r.ReceiptDate >= ?`);
        params.push(format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        whereClauses.push(`r.ReceiptDate <= ?`);
        params.push(format(endDate, 'yyyy-MM-dd'));
      }

      if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;

      const countQuery = `SELECT COUNT(*) as count
                          FROM (${query.replace(/SELECT r.ReceiptID,.*?as Total/s, 'SELECT r.ReceiptID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, params);
      setTotalCount(countResult ? countResult.count : 0);

      query += ` ORDER BY r.ReceiptDate DESC, r.ReceiptID DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);

      const results = await db.query<Receipt[]>(query, params);
      setReceipts(results);
    } catch (error) {
      showError(error as Error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, dateRange, showError, debtEnabled]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleDelete = async () => {
    const idsToDelete = receiptToDelete ? [receiptToDelete] : selectedReceiptIds;
    if (idsToDelete.length === 0) return;

    try {
      const placeholders = idsToDelete.map(() => '?').join(',');
      await db.execute(`DELETE
                        FROM Receipts
                        WHERE ReceiptID IN (${placeholders})`, idsToDelete);
      fetchReceipts();
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

      const fullReceipts = receiptsData.map(receipt => {
        const items = lineItemsData.filter(li => li.ReceiptID === receipt.ReceiptID);
        const subtotal = items.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
        const discountAmount = (subtotal * (receipt.Discount || 0)) / 100;
        const total = receipt.IsNonItemised ? receipt.NonItemisedTotal : Math.max(0, subtotal - discountAmount);
        return {...receipt, lineItems: items, totalAmount: total, images: []};
      });

      await generateReceiptsPdf(fullReceipts, settings.pdf, (progress: number) => setPdfProgress(progress));
    } catch (error) {
      showError(error as Error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const columns: any[] = [
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
    width: '15%',
    className: 'text-right',
    render: (row: Receipt) => (
      <div className="flex justify-end items-center gap-4">
        <div className="flex items-center justify-end w-24 gap-3">
          {row.IsTentative ? (
            <Tooltip content="Tentative Receipt">
              <QuestionMarkCircleIcon className="h-5 w-5 text-gray-400"/>
            </Tooltip>
          ) : <div className="w-5"/>}

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
              <ExclamationCircleIcon className="h-5 w-5 text-red-500"/>
            </Tooltip>
          ) : debtEnabled && (row.TotalDebtorCount || 0) > 0 ? (
            <Tooltip content="All debts settled">
              <CheckCircleIcon className="h-5 w-5 text-green-500"/>
            </Tooltip>
          ) : <div className="w-5"/>}
        </div>
        <div className="flex items-center gap-2 ml-2">

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
            data={receipts}
            columns={columns}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onSearch={setSearchTerm}
            searchable={true}
            loading={loading}
            onRowClick={(row: Receipt) => navigate(`/receipts/view/${row.ReceiptID}`)}
            selectable={true}
            onSelectionChange={setSelectedReceiptIds}
            selectedIds={selectedReceiptIds}
            itemKey="ReceiptID"
          >
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
          </DataTable>

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
                fetchReceipts();
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
