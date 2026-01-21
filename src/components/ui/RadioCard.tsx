import React from 'react';
import { cn } from '../../utils/cn';

interface RadioCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const RadioCard: React.FC<RadioCardProps> = ({
  selected,
  onClick,
  title,
  description,
  icon,
  children,
  className
}) => {
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all duration-200",
        selected 
          ? "border-accent bg-accent/5 dark:bg-accent/10 ring-1 ring-accent" 
          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn(
            "w-10 h-10 flex items-center justify-center rounded-lg transition-colors shrink-0",
            selected 
              ? "bg-accent text-white" 
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          )}>
            {icon}
          </div>
        )}
        <div>
          <p className={cn("font-medium", selected ? "text-accent" : "text-gray-900 dark:text-gray-100")}>
            {title}
          </p>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      <div className={cn(
        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
        selected 
          ? "border-accent bg-accent" 
          : "border-gray-300 dark:border-gray-600"
      )}>
        {selected && <div className="w-2 h-2 bg-white rounded-full" />}
      </div>
      {children}
    </div>
  );
};

export default RadioCard;
