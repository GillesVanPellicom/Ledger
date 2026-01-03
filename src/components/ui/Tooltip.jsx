import React from 'react';
import { cn } from '../../utils/cn';

const alignmentClasses = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

const Tooltip = ({ children, content, className, align = 'center', ...props }) => {
  return (
    <div className={cn("relative group", className)} {...props}>
      {children}
      {content && (
        <div className={cn(
          "absolute bottom-full mb-2 w-max max-w-xs px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10",
          alignmentClasses[align]
        )}>
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
