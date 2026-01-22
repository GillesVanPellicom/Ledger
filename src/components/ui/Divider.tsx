import React from 'react';
import { cn } from '../../utils/cn';

interface DividerProps {
  text?: string;
  className?: string;
}

const Divider: React.FC<DividerProps> = ({ text, className }) => {
  if (!text) {
    return <div className={cn("w-full border-t border-border", className)} />;
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <div className="flex-grow border-t border-border"></div>
      <span className="flex-shrink mx-4 text-sm text-font-2">{text}</span>
      <div className="flex-grow border-t border-border"></div>
    </div>
  );
};

export default Divider;
