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
          ? "border-accent bg-accent/5 ring-1 ring-accent" 
          : "border-border hover:border-accent/50 hover:bg-field-hover",
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
              : "bg-field-disabled text-font-2"
          )}>
            {icon}
          </div>
        )}
        <div>
          <p className={cn("font-medium", selected ? "text-accent" : "text-font-1")}>
            {title}
          </p>
          {description && <p className="text-sm text-font-2">{description}</p>}
        </div>
      </div>
      <div className={cn(
        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
        selected 
          ? "border-accent bg-accent" 
          : "border-border"
      )}>
        {selected && <div className="w-2 h-2 bg-white rounded-full" />}
      </div>
      {children}
    </div>
  );
};

export default RadioCard;
