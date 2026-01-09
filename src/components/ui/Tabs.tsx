import React from 'react';
import { cn } from '../../utils/cn';

interface TabsProps {
  tabs: { id: string; label: string; disabled?: boolean }[];
  activeTab: string;
  onTabClick: (tabId: string) => void;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabClick, className }) => {
  return (
    <div className={cn(className)}>
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabClick(tab.id)}
            className={cn(
              'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm',
              tab.disabled
                ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                : activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;
