import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import Select from '../ui/Select';
import InfoCard from '../ui/InfoCard';
import { LineItem, Debtor } from '../../types';
import { cn } from '../../utils/cn';

interface LineItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineItems: LineItem[];
  onSave: (data: any) => void;
  selectionMode: 'debtor' | 'discount';
  debtors: Debtor[];
  initialSelectedKeys: string[];
  disabled?: boolean;
}

const LineItemSelectionModal: React.FC<LineItemSelectionModalProps> = ({
  isOpen,
  onClose,
  lineItems,
  onSave,
  selectionMode,
  debtors,
  initialSelectedKeys,
  disabled = false,
}) => {
  const [selectedKeys, setSelectedKeys] = useState(new Set(initialSelectedKeys));
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [initialAssignments, setInitialAssignments] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkDebtorId, setBulkDebtorId] = useState('');
  const [lastSelectedKey, setLastSelectedKey] = useState<string | null>(null);
  const itemKey = "key";

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const allFilteredItems = useMemo(() => {
    if (!searchTerm) return lineItems;
    const lowercasedTerm = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keywords = lowercasedTerm.split(' ').filter(k => k);

    return lineItems.filter(item => {
      const itemText = [
        item.ProductName,
        item.ProductBrand,
        item.ProductSize,
        item.ProductUnitType
      ].join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return keywords.every(keyword => itemText.includes(keyword));
    });
  }, [lineItems, searchTerm]);

  const paginatedItems = useMemo(() => {
    const size = Number(pageSize) || 15;
    const start = (currentPage - 1) * size;
    const end = start + size;
    return allFilteredItems.slice(start, end);
  }, [allFilteredItems, currentPage, pageSize]);

  useEffect(() => {
    if (isOpen) {
      setSelectedKeys(new Set(initialSelectedKeys));
      const initAsgn: Record<string, string> = {};
      lineItems.forEach(item => {
        if (item.DebtorID) {
          initAsgn[item.key] = String(item.DebtorID);
        }
      });
      setAssignments(initAsgn);
      setInitialAssignments(initAsgn);
      setBulkDebtorId('');
      setLastSelectedKey(null);
      setCurrentPage(1);
    }
  }, [isOpen, initialSelectedKeys, lineItems]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const hasChanges = useMemo(() => {
    if (selectionMode === 'discount') {
      const initialKeys = new Set(initialSelectedKeys);
      if (selectedKeys.size !== initialKeys.size) return true;
      for (const key of selectedKeys) {
        if (!initialKeys.has(key)) return true;
      }
      return false;
    } else {
      const currentKeys = Object.keys(assignments);
      const initialKeys = Object.keys(initialAssignments);
      if (currentKeys.length !== initialKeys.length) return true;
      for (const key of currentKeys) {
        if (assignments[key] !== initialAssignments[key]) return true;
      }
      return false;
    }
  }, [selectionMode, selectedKeys, initialSelectedKeys, assignments, initialAssignments]);

  const handleRowClick = (item: LineItem, event: React.MouseEvent) => {
    if (disabled) return;
    if (event.nativeEvent.shiftKey) {
      window.getSelection()?.removeAllRanges();
    }
    
    const key = item[itemKey];
    const newSelectedKeys = new Set(selectedKeys);

    if (event.nativeEvent.shiftKey && lastSelectedKey) {
      const lastIndex = allFilteredItems.findIndex(i => i[itemKey] === lastSelectedKey);
      const currentIndex = allFilteredItems.findIndex(i => i[itemKey] === key);
      const [start, end] = [lastIndex, currentIndex].sort((a, b) => a - b);
      
      for (let i = start; i <= end; i++) {
        if (allFilteredItems[i]) {
          newSelectedKeys.add(allFilteredItems[i][itemKey]);
        }
      }
    } else if (event.nativeEvent.ctrlKey || event.nativeEvent.metaKey) {
      if (newSelectedKeys.has(key)) {
        newSelectedKeys.delete(key);
      } else {
        newSelectedKeys.add(key);
      }
    } else {
      if (newSelectedKeys.has(key) && newSelectedKeys.size === 1) {
        newSelectedKeys.clear();
      } else {
        newSelectedKeys.clear();
        newSelectedKeys.add(key);
      }
    }
    
    setSelectedKeys(newSelectedKeys);
    setLastSelectedKey(key);
  };

  const handleSave = () => {
    if (disabled || !hasChanges) return;
    if (selectionMode === 'debtor') {
      const assignmentList = Object.entries(assignments).map(([key, debtorId]) => ({ key, debtorId }));
      onSave(assignmentList);
    } else {
      onSave(Array.from(selectedKeys));
    }
    onClose();
  };

  const handleAssignmentChange = (key: string, debtorId: string) => {
    setAssignments(prev => {
        const newAsgn = { ...prev };
        if (debtorId === '') {
            delete newAsgn[key];
        } else {
            newAsgn[key] = debtorId;
        }
        return newAsgn;
    });
  };

  const handleBulkAssign = () => {
    if (!bulkDebtorId || disabled) return;
    const newAssignments = { ...assignments };
    for (const key of selectedKeys) {
      newAssignments[key] = bulkDebtorId;
    }
    setAssignments(newAssignments);
  };

  const title = selectionMode === 'debtor' ? 'Assign Items to Debtors' : 'Exclude Items from Discount';

  const columns: any[] = [
    { header: 'Product', render: (item: LineItem) => (
      <div>
        <p className="font-medium text-font-1">{item.ProductName}{item.ProductSize ? ` - ${item.ProductSize}${item.ProductUnitType || ''}` : ''}</p>
        <p className="text-xs text-font-2">{item.ProductBrand || ''}</p>
      </div>
    )},
    { header: 'Total Price', render: (item: LineItem) => `€${(item.LineQuantity * item.LineUnitPrice).toFixed(2)}` },
  ];

  if (selectionMode === 'debtor') {
    columns.push({
      header: 'Assign to',
      render: (item: LineItem) => (
        <div onClick={(e) => e.stopPropagation()}>
          {selectedKeys.has(item.key) ? (
            <Select
              value={assignments[item.key] || ''}
              onChange={(e) => handleAssignmentChange(item.key, e.target.value)}
              options={[{ value: '', label: 'Me' }, ...debtors.map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
              className="w-full"
              disabled={disabled}
            />
          ) : <div className="h-10" />}
        </div>
      )
    });
  } else {
    columns.push({ header: 'Assigned', accessor: 'DebtorName' });
  }

  const saveButtonText = selectionMode === 'debtor' ? 'Save Assignments' : 'Exclude Selected Items';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="viewport" onEnter={handleSave}>
      <div className="flex flex-col h-full">
        <div className="shrink-0 p-6 pb-0">
          <InfoCard title="Instructions" message="Use Click, ctrl + click, and ⇧ + click to select items." />
        </div>
        <div className="flex-1 p-6 min-h-0 overflow-y-auto" style={{ userSelect: 'none' }}>
          <DataTable
            data={paginatedItems}
            columns={columns}
            selectable={true}
            onSelectionChange={(keys) => setSelectedKeys(new Set(keys))}
            selectedIds={Array.from(selectedKeys)}
            itemKey={itemKey}
            searchable
            onSearch={setSearchTerm}
            searchPlaceholder="Search by product, brand, size..."
            onRowClick={handleRowClick}
            totalCount={allFilteredItems.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            disabled={disabled}
            middleRowLeft={
              selectionMode === 'debtor' ? (
                <div className={cn("flex items-center gap-2", selectedKeys.size === 0 && "invisible")}>
                  <Select
                    value={bulkDebtorId}
                    onChange={(e) => setBulkDebtorId(e.target.value)}
                    options={[{ value: '', label: 'Assign to...' }, ...debtors.map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
                    className="w-auto"
                    disabled={disabled}
                  />
                  <Button 
                    variant="secondary" 
                    onClick={handleBulkAssign} 
                    disabled={!bulkDebtorId || disabled}
                    className="whitespace-nowrap"
                  >
                    Apply
                  </Button>
                </div>
              ) : <div className="h-10" />
            }
          />
        </div>
        <div className="shrink-0 p-6 flex justify-end gap-4 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={disabled || !hasChanges}>{saveButtonText}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default LineItemSelectionModal;
