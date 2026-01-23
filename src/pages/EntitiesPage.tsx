import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { Plus, Pencil, ArrowUpCircle, ArrowDownCircle, User } from 'lucide-react';
import EntityModal from '../components/debt/EntityModal';
import Tooltip from '../components/ui/Tooltip';
import { Debtor } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { useEntities, useInvalidateReferenceData } from '../hooks/useReferenceData';
import MoneyDisplay from '../components/ui/MoneyDisplay';

const EntitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEntity, setEditingEntity] = useState<Debtor | null>(null);
  const invalidateReferenceData = useInvalidateReferenceData();

  const { data, isLoading } = useEntities({
    page: currentPage,
    pageSize,
    searchTerm
  });

  const handleAddEntity = () => {
    setEditingEntity(null);
    setIsModalOpen(true);
  };

  const handleEditEntity = (entity: Debtor) => {
    setEditingEntity(entity);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    invalidateReferenceData();
  };

  const columns = [
    { 
      header: 'Name', 
      width: '40%',
      render: (row: Debtor) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <User className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold text-font-1">{row.DebtorName}</h3>
        </div>
      )
    },
    { 
      header: 'Net Balance', 
      width: '40%',
      render: (row: Debtor) => (
        <div className="flex items-center gap-2">
          <Tooltip content={row.NetBalance >= 0 ? 'Owes you' : 'You owe'}>
            {row.NetBalance >= 0 ? 
              <ArrowUpCircle className="h-5 w-5 text-green" /> : 
              <ArrowDownCircle className="h-5 w-5 text-red" />}
          </Tooltip>
          <MoneyDisplay amount={row.NetBalance} useSignum={true} showSign={true} />
        </div>
      )
    },
    {
      header: '',
      width: '20%',
      className: 'text-right',
      render: (row: Debtor) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Entity">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditEntity(row); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div>
      <Header
        title="Entities"
        actions={
          <Tooltip content="Add Entity">
            <Button variant="ghost" size="icon" onClick={handleAddEntity}>
              <Plus className="h-5 w-5" />
            </Button>
          </Tooltip>
        }
      />
      <PageWrapper>
        <div className="py-6">
          <DataTable
            data={data?.entities || []}
            columns={columns}
            totalCount={data?.totalCount || 0}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onSearch={setSearchTerm}
            searchable={true}
            loading={isLoading}
            onRowClick={(row: Debtor) => navigate(`/entities/${row.DebtorID}`)}
          />
        </div>
      </PageWrapper>
      <EntityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entityToEdit={editingEntity}
        onSave={handleSave}
      />
    </div>
  );
};

export default EntitiesPage;
