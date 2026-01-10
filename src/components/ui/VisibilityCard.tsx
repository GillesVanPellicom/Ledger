import React from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';

interface VisibilityCardProps {
  isActive: boolean;
  onToggle: () => void;
  entityName?: string;
}

const VisibilityCard: React.FC<VisibilityCardProps> = ({ isActive, onToggle, entityName = 'item' }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-transparent rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', isActive ? 'bg-green-100 text-green dark:bg-green-900/30' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400')}>
          {isActive ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">Visibility</p>
          <p className="text-xs text-gray-500">{isActive ? `Shown in lists` : `Hidden from lists`}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none', isActive ? 'bg-green' : 'bg-gray-200 dark:bg-gray-700')}
      >
        <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out', isActive ? 'translate-x-5' : 'translate-x-0')} />
      </button>
    </div>
  );
};

export default VisibilityCard;
