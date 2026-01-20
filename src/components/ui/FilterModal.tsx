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
  isModified?: boolean;
}

export const FilterOption: React.FC<FilterOptionProps> = ({ title, onReset, children, className, isModified = false }) => {
  return (
    <div className={`flex flex-col gap-2 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        {onReset && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onReset} 
            disabled={!isModified}
            className="text-xs h-6 px-2 underline decoration-gray-400 underline-offset-2 disabled:no-underline disabled:text-gray-400"
          >
            Reset
          </Button>
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
      onEnter={onApply}
      footer={
        <div className="flex justify-between w-full items-center">
          <Tooltip content="Reset all filters">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onResetAll} 
              disabled={!hasActiveFilters}
              className="text-gray-500"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </Tooltip>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onApply}>
              Apply Filters ({filterCount})
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
