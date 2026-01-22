import React from 'react';
import { cn } from '../../utils/cn';

interface SwitchProps {
  label?: string;
  description?: string;
  isEnabled: boolean;
  onToggle: () => void;
  icon?: React.ElementType;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({ label, description, isEnabled, onToggle, icon: Icon, className }) => {
  if (label) {
    return (
      <div className={cn("p-4 border border-border rounded-xl", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <div className={cn("p-2 rounded-lg", isEnabled ? "bg-green/20 text-green" : "bg-field-disabled text-font-2")}><Icon className="h-6 w-6" /></div>}
            <div><p className="font-medium text-font-1">{label}</p><p className="text-sm text-font-2">{description}</p></div>
          </div>
          <button type="button" onClick={onToggle} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2", isEnabled ? "bg-accent" : "bg-field-disabled")}>
            <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", isEnabled ? "translate-x-5" : "translate-x-0")} />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <button type="button" onClick={onToggle} className={cn("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2", isEnabled ? "bg-accent" : "bg-field-disabled", className)}>
      <span className={cn("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out", isEnabled ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
};

export default Switch;
