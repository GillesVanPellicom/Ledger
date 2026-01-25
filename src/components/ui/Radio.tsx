import React from 'react';
import { cn } from '../../utils/cn';

interface RadioProps {
  selected: boolean;
  className?: string;
}

const Radio: React.FC<RadioProps> = ({ selected, className }) => {
  return (
    <div className={cn(
      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0",
      selected 
        ? "border-accent bg-accent" 
        : "border-border bg-bg",
      className
    )}>
      {selected && <div className="w-2.5 h-2.5 bg-white rounded-full animate-in zoom-in-50 duration-200" />}
    </div>
  );
};

export default Radio;
