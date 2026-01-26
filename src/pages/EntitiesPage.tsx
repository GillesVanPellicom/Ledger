import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, User, EyeOff, Eye, Filter, FilterX } from 'lucide-react';
import Button from '../components/ui/Button';
import EntityModal from '../components/debt/EntityModal';
import Tooltip from '../components/ui/Tooltip';
import { Entity } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import DataGrid from '../components/ui/DataGrid';
import Spinner from '../components/ui/Spinner';
import { useEntities, useInvalidateReferenceData } from '../hooks/useReferenceData';
import { useDebtCalculation } from '../hooks/useDebtCalculation';
import MoneyDisplay from '../components/ui/MoneyDisplay';
import { cn } from '../utils/cn';

interface EntityItemProps {
  entity: Entity;
  onEditClick: (entity: Entity) => void;
}

const EntityItem: React.FC<EntityItemProps> = ({ entity, onEditClick }) => {
    const { stats, loading } = useDebtCalculation(entity.EntityID);

    return (
        <div className={cn("flex flex-col justify-between h-full relative group", !entity.EntityIsActive && "opacity-60")}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-font-1">{entity.EntityName}</h3>
                <div className="w-8 h-8 flex items-center justify-center">
                   <User className="h-8 w-8 text-font-2" />
                </div>
            </div>
            <div className="mt-4 text-right">
                <p className="text-xs text-font-2">Net Balance</p>
                {loading ? (
                  <div className="flex justify-end items-center h-7">
                    <Spinner className="h-5 w-5 text-font-2" />
                  </div>
                ) : (
                  <MoneyDisplay 
                    amount={stats.netBalance} 
                    useSignum={true}
                    className="text-2xl font-semibold"
                  />
                )}
            </div>
            <div className="absolute bottom-0 left-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip content="Edit">
                <Button variant="secondary" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEditClick(entity); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </Tooltip>
              {!entity.EntityIsActive && (
                <Tooltip content="Hidden">
                  <EyeOff className="h-5 w-5 text-font-2" />
                </Tooltip>
              )}
            </div>
        </div>
    );
};

const EntitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [hideZeroBalance, setHideZeroBalance] = useState<boolean>(true);
  const invalidateReferenceData = useInvalidateReferenceData();

  const { data, isLoading } = useEntities({
    page: 1,
    pageSize: 1000, // Fetch all for grid view
    hideZeroBalance: hideZeroBalance
  });

  const handleAddEntity = () => {
    setEditingEntity(null);
    setIsModalOpen(true);
  };

  const handleEditEntity = (entity: Entity) => {
    setEditingEntity(entity);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    invalidateReferenceData();
    setIsModalOpen(false);
  };

  const filteredEntities = (data?.entities || []).filter(e => showHidden || e.EntityIsActive);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner className="h-8 w-8 text-accent" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Entities"
        actions={
          <>
            <Tooltip content={hideZeroBalance ? 'Show Zero Balance' : 'Hide Zero Balance'}>
              <Button variant="ghost" size="icon" onClick={() => setHideZeroBalance(!hideZeroBalance)}>
                {hideZeroBalance ? <FilterX className="h-5 w-5" /> : <Filter className="h-5 w-5" />}
              </Button>
            </Tooltip>
            <Tooltip content={showHidden ? 'Hide Inactive' : 'Show Hidden'}>
              <Button variant="ghost" size="icon" onClick={() => setShowHidden(!showHidden)}>
                {showHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </Tooltip>
            <Tooltip content="Add Entity">
              <Button variant="ghost" size="icon" onClick={handleAddEntity}>
                <Plus className="h-5 w-5" />
              </Button>
            </Tooltip>
          </>
        }
      />
      <PageWrapper>
        <div className="py-6">
          <DataGrid
            data={filteredEntities}
            itemKey="EntityID"
            onItemClick={(entity) => navigate(`/entities/${entity.EntityID}`)}
            renderItem={(entity) => (
              <EntityItem
                entity={entity}
                onEditClick={handleEditEntity}
              />
            )}
            minItemWidth={320}
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
