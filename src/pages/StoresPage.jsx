import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import StoreModal from '../components/stores/StoreModal';
import Tooltip from '../components/ui/Tooltip';

const StoresPage = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      let query = `SELECT * FROM Stores`;
      const params = [];
      
      if (searchTerm) {
        query += ` WHERE StoreName LIKE ?`;
        params.push(`%${searchTerm}%`);
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT StoreID')})`;
      const countResult = await db.queryOne(countQuery, params);
      setTotalCount(countResult ? countResult.count : 0);
      
      query += ` ORDER BY StoreName ASC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
      
      const results = await db.query(query, params);
      setStores(results);
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleAdd = () => {
    setEditingStore(null);
    setIsModalOpen(true);
  };

  const handleEdit = (store) => {
    setEditingStore(store);
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Name', accessor: 'StoreName', width: '80%' },
    { 
      header: 'Active', 
      width: '10%',
      render: (row) => (
        row.StoreIsActive ? 
        <CheckCircleIcon className="h-5 w-5 text-green-500" /> : 
        <XCircleIcon className="h-5 w-5 text-red-500" />
      )
    },
    {
      header: 'Actions',
      width: '10%',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Store" align="end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stores</h1>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Store
        </Button>
      </div>

      <DataTable
        data={stores}
        columns={columns}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onSearch={setSearchTerm}
        searchable={true}
        loading={loading}
      />

      <StoreModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        storeToEdit={editingStore}
        onSave={fetchStores}
      />
    </div>
  );
};

export default StoresPage;
