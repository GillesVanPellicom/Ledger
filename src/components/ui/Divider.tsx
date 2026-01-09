import React from 'react';
import { cn } from '../../utils/cn';

interface DividerProps {
  text?: string;
  className?: string;
}

const Divider: React.FC<DividerProps> = ({ text, className }) => {
  if (!text) {
    return <div className={cn("w-full border-t border-gray-300 dark:border-gray-700", className)} />;
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
      <span className="flex-shrink mx-4 text-sm text-gray-500">{text}</span>
      <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
    </div>
  );
};

export default Divider;
