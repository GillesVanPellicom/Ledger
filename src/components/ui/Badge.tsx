import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'blue' | 'green' | 'red' | 'yellow' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'blue', className }) => {
  const variants = {
    blue: 'bg-blue/40 text-blue border-blue',
    green: 'bg-green/40 text-green border-green',
    red: 'bg-red/40 text-red border-red',
    yellow: 'bg-yellow/40 text-yellow border-yellow',
    gray: 'bg-text-disabled/40 text-text-disabled border-text-disabled',
  };

  return (
    <span
      className={cn(
        'px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border backdrop-blur-md',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
