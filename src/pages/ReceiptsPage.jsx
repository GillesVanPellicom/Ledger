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
import ErrorModal from '../components/ui/ErrorModal';

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
  
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [error, setError] = useState(null);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

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
        whereClauses.push(`(s.StoreName LIKE ? OR r.ReceiptNote LIKE ?)`);
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }

      const [startDate, endDate] = dateRange;
      if (startDate) { whereClauses.push(`r.ReceiptDate >= ?`); params.push(format(startDate, 'yyyy-MM-dd')); }
      if (endDate) { whereClauses.push(`r.ReceiptDate <= ?`); params.push(format(endDate, 'yyyy-MM-dd')); }

      if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT r.ReceiptID, r.ReceiptDate, r.ReceiptNote, s.StoreName', 'SELECT r.ReceiptID')})`;
      const countResult = await db.queryOne(countQuery, params);
      setTotalCount(countResult ? countResult.count : 0);
      
      query += ` ORDER BY r.ReceiptDate DESC, r.ReceiptID DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
      
      const results = await db.query(query, params);
      setReceipts(results);
    } catch (error) {
      console.error("Failed to fetch receipts:", error);
      setError(error);
      setIsErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, dateRange]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handleMassDelete = async () => {
    try {
      const placeholders = selectedReceiptIds.map(() => '?').join(',');
      await db.execute(`DELETE FROM Receipts WHERE ReceiptID IN (${placeholders})`, selectedReceiptIds);
      fetchReceipts();
      setSelectedReceiptIds([]);
      setDeleteModalOpen(false);
    } catch (error) {
      console.error("Failed to delete receipts:", error);
      setError(error);
      setIsErrorModalOpen(true);
    }
  };

  const handleMassPdfSave = async () => {
    setIsGeneratingPdf(true);
    setPdfProgress(0);

    try {
      // Fetch full details for all selected receipts
      const placeholders = selectedReceiptIds.map(() => '?').join(',');
      const receiptsData = await db.query(`
        SELECT r.*, s.StoreName 
        FROM Receipts r 
        JOIN Stores s ON r.StoreID = s.StoreID 
        WHERE r.ReceiptID IN (${placeholders})
        ORDER BY r.ReceiptDate DESC
      `, selectedReceiptIds);

      // Fetch line items for each receipt
      // Optimization: Fetch all line items in one query and map them in JS
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
        return {
          ...receipt,
          lineItems: items,
          totalAmount: total
        };
      });

      await generateReceiptsPdf(fullReceipts, (progress) => {
        setPdfProgress(progress);
      });

    } catch (error) {
      console.error("Failed to generate PDF:", error);
      setError(error);
      setIsErrorModalOpen(true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const columns = [
    { header: 'Date', width: '25%', render: (row) => format(new Date(row.ReceiptDate), 'dd/MM/yyyy') },
    { header: 'Store', accessor: 'StoreName', width: '35%' },
    { header: 'Note', accessor: 'ReceiptNote', width: '40%' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Receipts</h1>
          {selectedReceiptIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
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
        onSearch={handleSearch}
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
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleMassDelete}
        title={`Delete ${selectedReceiptIds.length} Receipts`}
        message={`Are you sure you want to permanently delete ${selectedReceiptIds.length} selected receipts? This action cannot be undone.`}
      />

      <ProgressModal
        isOpen={isGeneratingPdf}
        progress={pdfProgress}
        title="Generating PDF Report..."
      />

      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        error={error}
      />
    </div>
  );
};

export default ReceiptsPage;
