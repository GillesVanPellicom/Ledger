import React, { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';
import { RotateCcw } from 'lucide-react';
import Tooltip from './Tooltip';

interface FilterOptionProps {
  title: string;
  onReset?: () => void;
  children: ReactNode;
  className?: string;
}

export const FilterOption: React.FC<FilterOptionProps> = ({ title, onReset, children, className }) => {
  return (
    <div className={`flex flex-col gap-2 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        {onReset && (
          <Tooltip content="Reset this filter">
            <Button variant="ghost" size="icon" onClick={onReset} className="h-6 w-6">
              <RotateCcw className="h-3 w-3" />
            </Button>
          </Tooltip>
        )}
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onResetAll: () => void;
  filterCount: number;
  children: ReactNode;
  hasActiveFilters: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onResetAll,
  filterCount,
  children,
  hasActiveFilters
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      size="sm"
      footer={
        <div className="flex justify-between w-full">
          <Button 
            variant="ghost" 
            onClick={onResetAll} 
            disabled={!hasActiveFilters}
            className="text-gray-500"
          >
            Reset All
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onApply}>
              Apply Filters {filterCount > 0 ? `(${filterCount})` : ''}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </Modal>
  );
};

export default FilterModal;
