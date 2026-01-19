import React from 'react';
import { cn } from '../../utils/cn';

interface SwitchProps {
  label?: string;
  description?: string;
  isEnabled: boolean;
  onToggle: () => void;
  icon?: React.ElementType;
}

const Switch: React.FC<SwitchProps> = ({ label, description, isEnabled, onToggle, icon: Icon }) => {
  if (label) {
    return (
      <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <div className={cn("p-2 rounded-lg", isEnabled ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500")}><Icon className="h-6 w-6" /></div>}
            <div><p className="font-medium text-gray-900 dark:text-gray-100">{label}</p><p className="text-sm text-gray-500">{description}</p></div>
          </div>
          <button type="button" onClick={onToggle} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2", isEnabled ? "bg-accent" : "bg-gray-200 dark:bg-gray-700")}>
            <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", isEnabled ? "translate-x-5" : "translate-x-0")} />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <button type="button" onClick={onToggle} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2", isEnabled ? "bg-accent" : "bg-gray-200 dark:bg-gray-700")}>
      <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", isEnabled ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
};

export default Switch;
