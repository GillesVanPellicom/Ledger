import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import EntityModal from '../components/debt/EntityModal';
import Tooltip from '../components/ui/Tooltip';
import { Entity } from '../types';

const EntitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const fetchEntities = useCallback(async () => {
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
      
      const results = await db.query<Entity[]>(query, params);
      setEntities(results);
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const handleAdd = () => {
    setEditingEntity(null);
    setIsModalOpen(true);
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setIsModalOpen(true);
  };

  const handleRowClick = (entity: Entity) => {
    navigate(`/entities/${entity.DebtorID}`);
  };

  const columns = [
    { header: 'Name', accessor: 'DebtorName', width: '80%' },
    { 
      header: 'Visibility', 
      width: '10%',
      className: 'text-center',
      render: (row: Entity) => (
        <Tooltip content={row.EntityIsActive ? 'Shown in lists' : 'Hidden from lists'}>
          {row.EntityIsActive ? 
          <EyeIcon className="h-5 w-5 text-green-500 inline-block" /> : 
          <EyeSlashIcon className="h-5 w-5 text-gray-400 inline-block" />}
        </Tooltip>
      )
    },
    {
      header: 'Actions',
      width: '10%',
      className: 'text-right',
      render: (row: Entity) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Entity">
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Entities</h1>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Entity
        </Button>
      </div>

      <DataTable
        data={entities}
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

      <EntityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entityToEdit={editingEntity}
        onSave={fetchEntities}
      />
    </div>
  );
};

export default EntitiesPage;
