import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, TrashIcon, DocumentArrowDownIcon, ExclamationCircleIcon, CheckCircleIcon, UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import { ConfirmModal } from '../components/ui/Modal';
import DatePicker from '../components/ui/DatePicker';
import { generateReceiptsPdf } from '../utils/pdfGenerator';
import ProgressModal from '../components/ui/ProgressModal';
import { useError } from '../context/ErrorContext';
import Tooltip from '../components/ui/Tooltip';
import { useSettings } from '../context/SettingsContext';
import BulkDebtModal from '../components/debt/BulkDebtModal';
import { cn } from '../utils/cn';

const ReceiptsPage = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState([null, null]);

  const [selectedReceiptIds, setSelectedReceiptIds] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isBulkDebtModalOpen, setIsBulkDebtModalOpen] = useState(false);
  
  const { showError } = useError();
  const { settings } = useSettings();
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
        SELECT r.ReceiptID, r.ReceiptDate, r.ReceiptNote, r.Discount, s.StoreName, pm.PaymentMethodName,
        (SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM LineItems li WHERE li.ReceiptID = r.ReceiptID) as SubTotal
        ${debtSubQueries}
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
        LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
      `;
      const params = [];
      const whereClauses = [];

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
      if (startDate) { whereClauses.push(`r.ReceiptDate >= ?`); params.push(format(startDate, 'yyyy-MM-dd')); }
      if (endDate) { whereClauses.push(`r.ReceiptDate <= ?`); params.push(format(endDate, 'yyyy-MM-dd')); }

      if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace(/SELECT r.ReceiptID, r.ReceiptDate, r.ReceiptNote, r.Discount, s.StoreName, pm.PaymentMethodName,.*?as SubTotal/s, 'SELECT r.ReceiptID')})`;
      const countResult = await db.queryOne(countQuery, params);
      setTotalCount(countResult ? countResult.count : 0);
      
      query += ` ORDER BY r.ReceiptDate DESC, r.ReceiptID DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
      
      const results = await db.query(query, params);
      setReceipts(results);
    } catch (error) {
      showError(error);
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
      await db.execute(`DELETE FROM Receipts WHERE ReceiptID IN (${placeholders})`, idsToDelete);
      fetchReceipts();
      setSelectedReceiptIds([]);
      setDeleteModalOpen(false);
      setReceiptToDelete(null);
    } catch (error) {
      showError(error);
    }
  };

  const openDeleteModal = (id = null) => {
    setReceiptToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleMassPdfSave = async () => {
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    try {
      const placeholders = selectedReceiptIds.map(() => '?').join(',');
      const receiptsData = await db.query(`
        SELECT r.*, s.StoreName, pm.PaymentMethodName
        FROM Receipts r 
        JOIN Stores s ON r.StoreID = s.StoreID
        LEFT JOIN PaymentMethods pm ON r.PaymentMethodID = pm.PaymentMethodID
        WHERE r.ReceiptID IN (${placeholders})
        ORDER BY r.ReceiptDate DESC
      `, selectedReceiptIds);

      const lineItemsData = await db.query(`
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
        const total = Math.max(0, subtotal - discountAmount);
        return { ...receipt, lineItems: items, totalAmount: total };
      });

      await generateReceiptsPdf(fullReceipts, settings.pdf, (progress) => setPdfProgress(progress));
    } catch (error) {
      showError(error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const columns = [
    { header: 'Date', width: '20%', render: (row) => format(new Date(row.ReceiptDate), 'dd/MM/yyyy') },
    { header: 'Store', accessor: 'StoreName', width: '30%' },
    { header: 'Note', accessor: 'ReceiptNote', width: '25%' },
  ];

  if (paymentMethodsEnabled) {
    columns.push({ header: 'Payment Method', accessor: 'PaymentMethodName', width: '15%' });
  }

  columns.push({ 
    header: 'Total', 
    width: '15%', 
    className: 'text-right', 
    render: (row) => {
      const subtotal = row.SubTotal || 0;
      const discountAmount = (subtotal * (row.Discount || 0)) / 100;
      const total = Math.max(0, subtotal - discountAmount);
      return `€${total.toFixed(2)}`;
    } 
  });

  columns.push({
    header: '',
    width: '10%',
    className: 'text-right',
    render: (row) => (
      <div className="flex justify-end items-center gap-2">
        {row.Status === 'unpaid' && (
          <Tooltip content="This receipt is unpaid">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
          </Tooltip>
        )}
        {debtEnabled && row.UnpaidDebtorCount > 0 && (
          <Tooltip content={`${row.UnpaidDebtorCount} people have not paid their part in this receipt yet`}>
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </Tooltip>
        )}
        {debtEnabled && row.TotalDebtorCount > 0 && row.UnpaidDebtorCount === 0 && (
          <Tooltip content="All debts settled for this receipt">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          </Tooltip>
        )}
        <Tooltip content="Delete Receipt" align="end">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); openDeleteModal(row.ReceiptID); }}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
    )
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Receipts</h1>
          {selectedReceiptIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="danger" size="sm" onClick={() => openDeleteModal()}>
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete ({selectedReceiptIds.length})
              </Button>
              <Button variant="secondary" size="sm" onClick={handleMassPdfSave}>
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
              {debtEnabled && (
                <Button variant="secondary" size="sm" onClick={() => setIsBulkDebtModalOpen(true)}>
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Bulk Debt
                </Button>
              )}
            </div>
          )}
        </div>
        <Button onClick={() => navigate('/receipts/new')}>
          <PlusIcon className="h-5 w-5 mr-2" />
          New Receipt
        </Button>
      </div>

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
        onRowClick={(row) => navigate(`/receipts/view/${row.ReceiptID}`)}
        rowClassName={(row) => cn(row.Status === 'unpaid' && 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30')}
        selectable={true}
        onSelectionChange={setSelectedReceiptIds}
        selectedIds={selectedReceiptIds}
        itemKey="ReceiptID"
      >
        <DatePicker
          selectsRange
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          onChange={(update) => { setDateRange(update); setCurrentPage(1); }}
          isClearable={true}
          placeholderText="Filter by date range"
        />
      </DataTable>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setReceiptToDelete(null); }}
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
  );
};

export default ReceiptsPage;
