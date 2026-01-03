import React from 'react';
import { cn } from '../../utils/cn';

const Card = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-950 dark:text-gray-50 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
