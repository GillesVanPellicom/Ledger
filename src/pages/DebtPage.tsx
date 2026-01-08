import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import DebtModal from '../components/debt/DebtModal';
import Tooltip from '../components/ui/Tooltip';
import { Debtor } from '../types';

const DebtPage: React.FC = () => {
  const navigate = useNavigate();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null);

  const fetchDebtors = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      let query = `SELECT * FROM Debtors`;
      const params: any[] = [];
      
      if (searchTerm) {
        query += ` WHERE DebtorName LIKE ?`;
        params.push(`%${searchTerm}%`);
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT DebtorID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, params);
      setTotalCount(countResult ? countResult.count : 0);
      
      query += ` ORDER BY DebtorName ASC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
      
      const results = await db.query<Debtor[]>(query, params);
      setDebtors(results);
    } catch (error) {
      console.error("Failed to fetch debtors:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);

  const handleAdd = () => {
    setEditingDebtor(null);
    setIsModalOpen(true);
  };

  const handleEdit = (debtor: Debtor) => {
    setEditingDebtor(debtor);
    setIsModalOpen(true);
  };

  const handleRowClick = (debtor: Debtor) => {
    navigate(`/debt/${debtor.DebtorID}`);
  };

  const columns = [
    { header: 'Name', accessor: 'DebtorName', width: '80%' },
    { 
      header: 'Active', 
      width: '10%',
      className: 'text-center',
      render: (row: Debtor) => (
        <Tooltip content={row.DebtorIsActive ? 'Active debtors appear in selection lists.' : 'Inactive debtors are hidden from selection lists.'}>
          {row.DebtorIsActive ? 
          <CheckCircleIcon className="h-5 w-5 text-green-500 inline-block" /> : 
          <XCircleIcon className="h-5 w-5 text-red-500 inline-block" />}
        </Tooltip>
      )
    },
    {
      header: 'Actions',
      width: '10%',
      className: 'text-right',
      render: (row: Debtor) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Debtor">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEdit(row); }}
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Debtors</h1>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Debtor
        </Button>
      </div>

      <DataTable
        data={debtors}
        columns={columns}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onSearch={setSearchTerm}
        searchable={true}
        loading={loading}
        onRowClick={handleRowClick}
        itemKey="DebtorID"
      />

      <DebtModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        debtorToEdit={editingDebtor}
        onSave={fetchDebtors}
      />
    </div>
  );
};

export default DebtPage;
