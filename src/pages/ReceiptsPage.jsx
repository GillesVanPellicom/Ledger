import React, { useState, useEffect, useCallback } from 'react';
import { useDebugNavigate } from '../hooks/useDebugNavigate';
import { format } from 'date-fns';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import { ConfirmModal } from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import DatePicker from '../components/ui/DatePicker';

const ReceiptsPage = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState([null, null]);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState(null);

  const navigate = useDebugNavigate();

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
      if (startDate) {
        whereClauses.push(`r.ReceiptDate >= ?`);
        params.push(format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        whereClauses.push(`r.ReceiptDate <= ?`);
        params.push(format(endDate, 'yyyy-MM-dd'));
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT r.ReceiptID, r.ReceiptDate, r.ReceiptNote, s.StoreName', 'SELECT r.ReceiptID')})`;
      const countResult = await db.queryOne(countQuery, params);
      setTotalCount(countResult ? countResult.count : 0);
      
      query += ` ORDER BY r.ReceiptDate DESC, r.ReceiptID DESC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
      
      const results = await db.query(query, params);
      setReceipts(results);
    } catch (error) {
      console.error("Failed to fetch receipts:", error);
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

  const handleDeleteClick = (receipt) => {
    setReceiptToDelete(receipt);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!receiptToDelete) return;
    try {
      await db.execute('DELETE FROM Receipts WHERE ReceiptID = ?', [receiptToDelete.ReceiptID]);
      fetchReceipts();
      setDeleteModalOpen(false);
      setReceiptToDelete(null);
    } catch (error) {
      console.error("Failed to delete receipt:", error);
    }
  };

  const columns = [
    { header: 'Date', width: '20%', render: (row) => format(new Date(row.ReceiptDate), 'dd/MM/yyyy') },
    { header: 'Store', accessor: 'StoreName', width: '30%' },
    { header: 'Note', accessor: 'ReceiptNote', width: '40%' },
    {
      header: 'Actions',
      width: '10%',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Tooltip content="View Receipt" align="end">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/receipts/view/${row.ReceiptID}`)}>
              <EyeIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Delete Receipt" align="end">
            <Button variant="ghost" size="icon" className="text-danger hover:text-danger-hover" onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}>
              <TrashIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Receipts</h1>
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
        searchPlaceholder="Search by store or note..."
        onRowClick={(row) => navigate(`/receipts/view/${row.ReceiptID}`)}
      >
        <DatePicker
          selectsRange
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          onChange={(update) => {
            setDateRange(update);
            setCurrentPage(1);
          }}
          isClearable={true}
          placeholderText="Filter by date range"
        />
      </DataTable>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Receipt"
        message={`Are you sure you want to delete the receipt from ${receiptToDelete?.StoreName} on ${receiptToDelete ? format(new Date(receiptToDelete.ReceiptDate), 'dd/MM/yyyy') : ''}? This action cannot be undone.`}
      />
    </div>
  );
};

export default ReceiptsPage;
