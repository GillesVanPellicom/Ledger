import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon, EyeIcon, EyeSlashIcon, PaintBrushIcon, UserIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import EntityModal from '../components/debt/EntityModal';
import Tooltip from '../components/ui/Tooltip';
import { Debtor, DebtorStyle } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import DataGrid from '../components/ui/DataGrid';
import { cn } from '../utils/cn';
import { useDebtCalculation } from '../hooks/useDebtCalculation';
import { useSettings } from '../context/SettingsContext';
import * as SolidIcons from '@heroicons/react/24/solid';
import EntityStyleModal from '../components/debt/EntityStyleModal';
import PageSpinner from '../components/ui/PageSpinner';
import Spinner from '../components/ui/Spinner';

const EntityItem: React.FC<{ entity: Debtor, onEdit: (entity: Debtor) => void, onStyle: (entity: Debtor) => void }> = ({ entity, onEdit, onStyle }) => {
  const { settings } = useSettings();
  const { stats, calculate: calculateDebt, loading } = useDebtCalculation();
  const style = settings.debtorStyles?.[entity.DebtorID];
  const IconComponent = style?.type === 'icon' && style.symbol && (SolidIcons as any)[style.symbol];

  useEffect(() => {
    calculateDebt(entity.DebtorID);
  }, [entity.DebtorID, calculateDebt]);

  return (
    <div className={cn("flex flex-col justify-between h-full relative group", !entity.DebtorIsActive && "opacity-60")}>
      <div className="absolute top-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip content="Edit Style">
          <button onClick={(e) => { e.stopPropagation(); onStyle(entity); }} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <PaintBrushIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </Tooltip>
        <Tooltip content="Edit">
          <button onClick={(e) => { e.stopPropagation(); onEdit(entity); }} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <PencilIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </Tooltip>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{entity.DebtorName}</h3>
        <div className="w-8 h-8 flex items-center justify-center">
          {IconComponent ? <IconComponent className="h-8 w-8 text-gray-400" /> :
           style?.type === 'emoji' ? <span className="text-3xl">{style.symbol}</span> :
           <UserIcon className="h-8 w-8 text-gray-300 dark:text-gray-700" />}
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
      {!entity.DebtorIsActive && (
        <div className="absolute bottom-0 left-0">
          <Tooltip content="Hidden">
            <EyeSlashIcon className="h-5 w-5 text-gray-400" />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

const EntitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHidden, setShowHidden] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);
  const [editingEntity, setEditingEntity] = useState<Debtor | null>(null);
  
  const { settings, updateSettings } = useSettings();

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const results = await db.query<Debtor>('SELECT * FROM Debtors ORDER BY DebtorName ASC');
      setEntities(results);
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

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
    fetchEntities();
    setIsModalOpen(false);
  };
  
  const handleStyleSave = async (entityId: number, newStyle: DebtorStyle) => {
    const newStyles = { ...settings.debtorStyles, [entityId]: newStyle };
    await updateSettings({ ...settings, debtorStyles: newStyles });
    setIsStyleModalOpen(false);
  };
  
  const filteredEntities = entities.filter(e => showHidden || e.DebtorIsActive);
  
  if (loading) return <PageSpinner />;

  return (
    <div>
      <Header 
        title="Entities"
        actions={
          <>
            <Tooltip content={showHidden ? 'Hide Inactive' : 'Show Hidden'}>
              <Button variant="ghost" size="icon" onClick={() => setShowHidden(!showHidden)}>
                {showHidden ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </Button>
            </Tooltip>
            <Tooltip content="Add Entity">
              <Button variant="ghost" size="icon" onClick={handleAdd}>
                <PlusIcon className="h-5 w-5" />
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
            itemHeight={120}
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
