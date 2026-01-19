import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Plus, Pencil, Eye, EyeOff, Palette, User } from 'lucide-react';
import EntityModal from '../components/debt/EntityModal';
import Tooltip from '../components/ui/Tooltip';
import { Debtor, DebtorStyle } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import DataGrid from '../components/ui/DataGrid';
import { cn } from '../utils/cn';
import { useDebtCalculation } from '../hooks/useDebtCalculation';
import * as SolidIcons from 'lucide-react';
import EntityStyleModal from '../components/debt/EntityStyleModal';
import PageSpinner from '../components/ui/PageSpinner';
import Spinner from '../components/ui/Spinner';
import { useEntities, useInvalidateEntities } from '../hooks/useEntities';
import { useSettingsStore } from '../store/useSettingsStore';

const EntityItem: React.FC<{ entity: Debtor, onEdit: (entity: Debtor) => void, onStyle: (entity: Debtor) => void }> = ({ entity, onEdit, onStyle }) => {
  const { settings } = useSettingsStore();
  const { stats, loading } = useDebtCalculation(entity.DebtorID);
  
  const style = settings.debtorStyles?.[entity.DebtorID];
  const SymbolComponent = style?.type === 'icon' && style.symbol && (SolidIcons as any)[style.symbol];
  // Ensure the component is a valid Lucide icon (has displayName) to avoid crashing with internal exports
  const IconComponent = SymbolComponent && typeof SymbolComponent === 'object' && 'displayName' in SymbolComponent ? SymbolComponent : null;

  return (
    <div className={cn("flex flex-col justify-between h-full relative group", !entity.DebtorIsActive && "opacity-60")}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{entity.DebtorName}</h3>
        <div className="w-8 h-8 flex items-center justify-center">
          {IconComponent ? <IconComponent className="h-8 w-8 text-gray-400" /> :
           style?.type === 'emoji' ? <span className="text-3xl">{style.symbol}</span> :
           <User className="h-8 w-8 text-gray-300 dark:text-gray-700" />}
        </div>
      </div>
      <div className="mt-4 text-right">
        <p className="text-xs text-gray-500 dark:text-gray-400">Net Balance</p>
        {loading ? (
          <div className="flex justify-end items-center h-7">
            <Spinner className="h-5 w-5 text-gray-400" />
          </div>
        ) : (
          <p className={cn("text-2xl font-semibold", stats.netBalance >= 0 ? 'text-green' : 'text-red')}>
            € {Math.abs(stats.netBalance).toFixed(2)}
          </p>
        )}
      </div>
      <div className="absolute bottom-0 left-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip content="Edit Style">
          <button onClick={(e) => { e.stopPropagation(); onStyle(entity); }} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Palette className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </Tooltip>
        <Tooltip content="Edit">
          <button onClick={(e) => { e.stopPropagation(); onEdit(entity); }} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </Tooltip>
        {!entity.DebtorIsActive && (
          <Tooltip content="Hidden">
            <EyeOff className="h-5 w-5 text-gray-400" />
          </Tooltip>
        )}
      </div>
    </div>
  );
};

const EntitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [showHidden, setShowHidden] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);
  const [editingEntity, setEditingEntity] = useState<Debtor | null>(null);
  
  const { settings, updateSettings } = useSettingsStore();
  const invalidateEntities = useInvalidateEntities();

  const { data: entities, isLoading } = useEntities();

  const handleAdd = () => {
    setEditingEntity(null);
    setIsModalOpen(true);
  };

  const handleEdit = (entity: Debtor) => {
    setEditingEntity(entity);
    setIsModalOpen(true);
  };
  
  const handleStyle = (entity: Debtor) => {
    setEditingEntity(entity);
    setIsStyleModalOpen(true);
  };

  const handleRowClick = (entity: Debtor) => {
    navigate(`/entities/${entity.DebtorID}`);
  };
  
  const handleSave = () => {
    invalidateEntities();
    setIsModalOpen(false);
  };
  
  const handleStyleSave = async (entityId: number, newStyle: DebtorStyle) => {
    const newStyles = { ...settings.debtorStyles, [entityId]: newStyle };
    await updateSettings({ ...settings, debtorStyles: newStyles });
    setIsStyleModalOpen(false);
  };
  
  const filteredEntities = (entities || []).filter(e => showHidden || e.DebtorIsActive);
  
  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <Header 
        title="Entities"
        actions={
          <>
            <Tooltip content={showHidden ? 'Hide Inactive' : 'Show Hidden'}>
              <Button variant="ghost" size="icon" onClick={() => setShowHidden(!showHidden)}>
                {showHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </Tooltip>
            <Tooltip content="Add Entity">
              <Button variant="ghost" size="icon" onClick={handleAdd}>
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
            itemKey="DebtorID"
            onItemClick={handleRowClick}
            renderItem={(entity) => (
              <EntityItem
                entity={entity}
                onEdit={handleEdit}
                onStyle={handleStyle}
              />
            )}
            minItemWidth={280}
          />

          <EntityModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            entityToEdit={editingEntity}
            onSave={handleSave}
          />
          
          {editingEntity && (
            <EntityStyleModal
              isOpen={isStyleModalOpen}
              onClose={() => setIsStyleModalOpen(false)}
              onSave={handleStyleSave}
              entity={editingEntity}
              currentStyle={settings.debtorStyles?.[editingEntity.DebtorID]}
            />
          )}
        </div>
      </PageWrapper>
    </div>
  );
};

export default EntitiesPage;
