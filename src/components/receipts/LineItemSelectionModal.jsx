import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import Select from '../ui/Select';
import Card from '../ui/Card';
import { InformationCircleIcon } from '@heroicons/react/24/solid';

const LineItemSelectionModal = ({
  isOpen,
  onClose,
  lineItems,
  onSave,
  selectionMode, // 'debtor' or 'discount'
  debtors,
  initialSelectedKeys
}) => {
  const [selectedKeys, setSelectedKeys] = useState(new Set(initialSelectedKeys));
  const [assignments, setAssignments] = useState({}); // { [lineItemKey]: debtorId }
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkDebtorId, setBulkDebtorId] = useState('');
  const [lastSelectedKey, setLastSelectedKey] = useState(null);
  const itemKey = "key";

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredItems = useCallback(() => {
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

  const allFilteredItems = filteredItems();

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return allFilteredItems.slice(start, end);
  }, [allFilteredItems, currentPage, pageSize]);

  useEffect(() => {
    if (isOpen) {
      setSelectedKeys(new Set(initialSelectedKeys));
      const initialAssignments = {};
      lineItems.forEach(item => {
        if (item.DebtorID) {
          initialAssignments[item.key] = item.DebtorID;
        }
      });
      setAssignments(initialAssignments);
      setBulkDebtorId('');
      setLastSelectedKey(null);
      setCurrentPage(1);
    }
  }, [isOpen, initialSelectedKeys, lineItems]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleRowClick = (item, event) => {
    // Prevent text selection on shift-click
    if (event.nativeEvent.shiftKey) {
      window.getSelection().removeAllRanges();
    }
    
    const key = item[itemKey];
    const newSelectedKeys = new Set(selectedKeys);

    if (event.nativeEvent.shiftKey && lastSelectedKey) {
      const lastIndex = allFilteredItems.findIndex(i => i[itemKey] === lastSelectedKey);
      const currentIndex = allFilteredItems.findIndex(i => i[itemKey] === key);
      const [start, end] = [lastIndex, currentIndex].sort((a, b) => a - b);
      
      for (let i = start; i <= end; i++) {
        newSelectedKeys.add(allFilteredItems[i][itemKey]);
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
    if (selectionMode === 'debtor') {
      const assignmentList = Object.entries(assignments).map(([key, debtorId]) => ({ key, debtorId }));
      onSave(assignmentList);
    } else {
      onSave(Array.from(selectedKeys));
    }
    onClose();
  };

  const handleAssignmentChange = (key, debtorId) => {
    setAssignments(prev => ({ ...prev, [key]: debtorId }));
  };

  const handleBulkAssign = () => {
    if (!bulkDebtorId) return;
    const newAssignments = { ...assignments };
    for (const key of selectedKeys) {
      newAssignments[key] = bulkDebtorId;
    }
    setAssignments(newAssignments);
  };

  const title = selectionMode === 'debtor' ? 'Assign Items to Debtors' : 'Exclude Items from Discount';

  const columns = [
    { header: 'Product', render: (item) => (
      <div>
        <p className="font-medium">{item.ProductName}</p>
        <p className="text-xs text-gray-500">{item.ProductBrand || ''}</p>
      </div>
    )},
    { header: 'Size', render: (item) => item.ProductSize ? `${item.ProductSize}${item.ProductUnitType || ''}` : '-' },
    { header: 'Total Price', render: (item) => `€${(item.LineQuantity * item.LineUnitPrice).toFixed(2)}` },
  ];

  if (selectionMode === 'debtor') {
    columns.push({
      header: 'Assign to',
      render: (item) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={assignments[item.key] || ''}
            onChange={(e) => handleAssignmentChange(item.key, e.target.value)}
            options={[{ value: '', label: 'Me' }, ...debtors.map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
            className="w-full"
          />
        </div>
      )
    });
  } else {
    columns.push({ header: 'Assigned', accessor: 'DebtorName' });
  }

  const saveButtonText = selectionMode === 'debtor' ? 'Save Assignments' : 'Exclude Selected Items';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="3xl">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
          <InformationCircleIcon className="h-5 w-5 text-gray-400" />
          <span>Use Click, Ctrl+Click, and Shift+Click to select items.</span>
        </div>
        {selectionMode === 'debtor' && (
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Select
                value={bulkDebtorId}
                onChange={(e) => setBulkDebtorId(e.target.value)}
                options={[{ value: '', label: 'Assign to...' }, ...debtors.map(d => ({ value: d.DebtorID, label: d.DebtorName }))]}
                className="w-48"
              />
              <Button 
                variant="secondary" 
                onClick={handleBulkAssign} 
                disabled={!bulkDebtorId || selectedKeys.size === 0}
                className="whitespace-nowrap"
              >
                Assign to Selected
              </Button>
            </div>
          </Card>
        )}
        <div style={{ userSelect: 'none' }}>
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
          />
        </div>
        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{saveButtonText}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default LineItemSelectionModal;
