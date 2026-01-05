import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, TrashIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import { ConfirmModal } from '../components/ui/Modal';
import DatePicker from '../components/ui/DatePicker';
import { generateReceiptsPdf } from '../utils/pdfGenerator';
import ProgressModal from '../components/ui/ProgressModal';
import { useError } from '../context/ErrorContext';
import Tooltip from '../components/ui/Tooltip';

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
  
  const { showError } = useError();
  const navigate = useNavigate();

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      let query = `
        SELECT r.ReceiptID, r.ReceiptDate, r.ReceiptNote, s.StoreName 
        FROM Receipts r
        JOIN Stores s ON r.StoreID = s.StoreID
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
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT r.ReceiptID, r.ReceiptDate, r.ReceiptNote, s.StoreName', 'SELECT r.ReceiptID')})`;
      const countResult = await db.queryOne(countQuery, params.slice(0, params.length - (searchTerm ? (searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ').filter(k => k).length * 2) : 0)));
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
  }, [currentPage, pageSize, searchTerm, dateRange, showError]);

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
        SELECT r.*, s.StoreName 
        FROM Receipts r 
        JOIN Stores s ON r.StoreID = s.StoreID 
        WHERE r.ReceiptID IN (${placeholders})
        ORDER BY r.ReceiptDate DESC
      `, selectedReceiptIds);

      const lineItemsData = await db.query(`
        SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType
        FROM LineItems li
        JOIN Products p ON li.ProductID = p.ProductID
        JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
        WHERE li.ReceiptID IN (${placeholders})
      `, selectedReceiptIds);

      const fullReceipts = receiptsData.map(receipt => {
        const items = lineItemsData.filter(li => li.ReceiptID === receipt.ReceiptID);
        const total = items.reduce((sum, item) => sum + (item.LineQuantity * item.LineUnitPrice), 0);
        return { ...receipt, lineItems: items, totalAmount: total };
      });

      await generateReceiptsPdf(fullReceipts, (progress) => setPdfProgress(progress));
    } catch (error) {
      showError(error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const columns = [
    { header: 'Date', width: '25%', render: (row) => format(new Date(row.ReceiptDate), 'dd/MM/yyyy') },
    { header: 'Store', accessor: 'StoreName', width: '35%' },
    { header: 'Note', accessor: 'ReceiptNote', width: '30%' },
    {
      header: '',
      width: '10%',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end">
          <Tooltip content="Delete Receipt" align="end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); openDeleteModal(row.ReceiptID); }}
            >
              <TrashIcon className="h-4 w-4 text-danger" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

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
        selectable={true}
        onSelectionChange={setSelectedReceiptIds}
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
    </div>
  );
};

export default ReceiptsPage;
